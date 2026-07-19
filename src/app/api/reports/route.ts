/**
 * GET /api/reports — attendance reports with aggregation
 *
 * Query params:
 *  - type: daily | weekly | monthly | yearly | custom
 *  - from, to: for custom range (YYYY-MM-DD)
 *  - classId: optional, filter by class
 *  - mode: summary | detail | today
 */

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";
import { requireAuth } from "@/lib/api/auth-helpers";
import type { Student, Attendance } from "@/lib/db/types";
import { getTodayKL, getDateRange } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const type = (searchParams.get("type") || "daily") as
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "custom";
  const classId = searchParams.get("classId");
  const mode = searchParams.get("mode") || "summary";
  const customFrom = searchParams.get("from") || undefined;
  const customTo = searchParams.get("to") || undefined;

  const range = getDateRange(type, customFrom, customTo);

  // guru_kelas only sees their own class
  const effectiveClassId =
    auth.role === "guru_kelas" ? auth.classId : classId || null;

  const db = await getDb();

  // Get all active students in scope
  const studentFilter: Record<string, unknown> = { isActive: true };
  if (effectiveClassId) {
    studentFilter.classId = effectiveClassId;
  }
  const students = await db
    .collection<Student>("students")
    .find(studentFilter)
    .project({ _id: 1, name: 1, classId: 1, sex: 1 })
    .toArray();

  const studentMap = new Map(students.map((s) => [s._id.toString(), s]));

  if (mode === "today") {
    // Today's summary: total hadir, total tidak hadir, absent list per class
    const today = getTodayKL();
    return getTodaySummary(db, students, today, effectiveClassId);
  }

  if (mode === "detail") {
    // Detailed attendance per-date with per-student breakdown
    return getDetailedReport(db, range, effectiveClassId, students, studentMap);
  }

  // Default: summary aggregation
  return getSummaryReport(db, range, effectiveClassId, students);
}

async function getTodaySummary(
  db: Awaited<ReturnType<typeof getDb>>,
  students: any[],
  today: string,
  classId: string | null
) {
  // Get all attendance records for today in scope
  const attFilter: Record<string, unknown> = { date: today };
  if (classId) attFilter.classId = classId;

  const attendanceRecords = await db
    .collection("attendance")
    .find(attFilter)
    .project({ studentId: 1, classId: 1, method: 1, recordedAt: 1 })
    .toArray();

  const presentSet = new Set(
    attendanceRecords.map((a) => a.studentId.toString())
  );

  // Group students by class
  const classStudents = new Map<string, any[]>();
  for (const s of students) {
    const cid = s.classId?.toString() || "unknown";
    if (!classStudents.has(cid)) classStudents.set(cid, []);
    classStudents.get(cid)!.push(s);
  }

  // Get class names
  const classIds = [...classStudents.keys()];
  const classDocs = await db
    .collection("classes")
    .find({ _id: { $in: classIds.map((id) => id) } } as any)
    .project({ _id: 1, name: 1 })
    .toArray();

  const classMap = new Map(classDocs.map((c) => [c._id.toString(), c.name]));

  let totalHadir = 0;
  let totalTidakHadir = 0;
  const perClass: any[] = [];
  const absentList: any[] = [];

  for (const [cid, stuList] of classStudents) {
    let hadir = 0;
    const absentInClass: any[] = [];
    for (const s of stuList) {
      if (presentSet.has(s._id.toString())) {
        hadir++;
      } else {
        absentInClass.push({
          _id: s._id.toString(),
          name: s.name,
          classId: cid,
          className: classMap.get(cid) || null,
          sex: s.sex,
        });
      }
    }
    const tidakHadir = stuList.length - hadir;
    totalHadir += hadir;
    totalTidakHadir += tidakHadir;
    perClass.push({
      classId: cid,
      className: classMap.get(cid) || cid,
      total: stuList.length,
      hadir,
      tidakHadir,
      percentage: stuList.length > 0 ? Math.round((hadir / stuList.length) * 100) : 0,
    });
    absentList.push(...absentInClass);
  }

  return NextResponse.json({
    date: today,
    totalStudents: students.length,
    totalHadir,
    totalTidakHadir,
    attendancePercentage:
      students.length > 0
        ? Math.round((totalHadir / students.length) * 100)
        : 0,
    perClass,
    absentList,
  });
}

async function getSummaryReport(
  db: Awaited<ReturnType<typeof getDb>>,
  range: { from: string; to: string },
  classId: string | null,
  students: any[]
) {
  // Aggregate per-date attendance counts
  const matchStage: Record<string, unknown> = {
    date: { $gte: range.from, $lte: range.to },
  };
  if (classId) matchStage.classId = classId;

  const agg = await db
    .collection("attendance")
    .aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$date",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  const totalStudents = students.length;

  // If single day, use totalStudents; if range, we approximate
  const dailyData = agg.map((d) => ({
    date: d._id,
    hadir: d.count,
    tidakHadir: Math.max(0, totalStudents - d.count),
    percentage:
      totalStudents > 0 ? Math.round((d.count / totalStudents) * 100) : 0,
  }));

  return NextResponse.json({
    range,
    totalStudents,
    days: dailyData,
    totalRecords: agg.reduce((sum, d) => sum + d.count, 0),
  });
}

async function getDetailedReport(
  db: Awaited<ReturnType<typeof getDb>>,
  range: { from: string; to: string },
  classId: string | null,
  students: any[],
  studentMap: Map<string, any>
) {
  const matchStage: Record<string, unknown> = {
    date: { $gte: range.from, $lte: range.to },
  };
  if (classId) matchStage.classId = classId;

  const attendanceRecords = await db
    .collection("attendance")
    .find(matchStage)
    .sort({ date: 1, studentId: 1 })
    .toArray();

  // Group by date -> set of present student IDs
  const dateMap = new Map<string, Set<string>>();
  for (const r of attendanceRecords) {
    if (!dateMap.has(r.date)) dateMap.set(r.date, new Set());
    dateMap.get(r.date)!.add(r.studentId.toString());
  }

  // Build per-date detail
  const details: any[] = [];
  for (const [date, presentSet] of dateMap) {
    const present: any[] = [];
    const absent: any[] = [];
    for (const s of students) {
      if (presentSet.has(s._id.toString())) {
        present.push({ _id: s._id.toString(), name: s.name });
      } else {
        absent.push({ _id: s._id.toString(), name: s.name });
      }
    }
    details.push({ date, present, absent, total: students.length });
  }

  return NextResponse.json({
    range,
    totalStudents: students.length,
    details,
  });
}