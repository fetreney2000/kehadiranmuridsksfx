/**
 * GET /api/reports — attendance reports with aggregation
 *
 * Query params:
 *  - mode: today | detail | summary | class-detail
 *  - classId: for class-detail mode
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
  const type = (searchParams.get("type") || "daily") as string;
  const classId = searchParams.get("classId");
  const mode = searchParams.get("mode") || "summary";
  const customFrom = searchParams.get("from") || undefined;
  const customTo = searchParams.get("to") || undefined;

  const range = getDateRange(type as any, customFrom, customTo);
  const effectiveClassId = auth.role === "guru_kelas" ? auth.classId : classId || null;

  const db = await getDb();
  const today = getTodayKL();

  // Get all active students in scope
  const studentFilter: Record<string, unknown> = { isActive: true };
  if (effectiveClassId) studentFilter.classId = effectiveClassId;

  const students = await db
    .collection<Student>("students")
    .find(studentFilter)
    .project({ _id: 1, name: 1, classId: 1, sex: 1 })
    .toArray();

  if (mode === "class-detail" && classId) {
    return getClassDetail(db, students, today, classId);
  }

  if (mode === "today") {
    return getTodaySummary(db, students, today, effectiveClassId);
  }

  if (mode === "detail") {
    const studentMap = new Map(students.map((s) => [s._id.toString(), s]));
    return getDetailedReport(db, range, effectiveClassId, students, studentMap);
  }

  return getSummaryReport(db, range, effectiveClassId, students);
}

async function getTodaySummary(db: any, students: any[], today: string, classId: string | null) {
  const attFilter: Record<string, unknown> = { date: today };
  if (classId) attFilter.classId = classId;

  const attendanceRecords = await db
    .collection("attendance")
    .find(attFilter)
    .project({ studentId: 1 })
    .toArray();

  const presentSet = new Set(attendanceRecords.map((a: any) => a.studentId.toString()));

  // Group by class
  const classStudents = new Map<string, any[]>();
  for (const s of students) {
    const cid = s.classId?.toString() || "unknown";
    if (!classStudents.has(cid)) classStudents.set(cid, []);
    classStudents.get(cid)!.push(s);
  }

  // Get class names
  const { ObjectId } = await import("mongodb");
  const classIds = [...classStudents.keys()];
  const classDocs = classIds.length > 0
    ? await db.collection("classes")
        .find({ _id: { $in: classIds.map((id: string) => new ObjectId(id)) } } as any)
        .project({ _id: 1, name: 1 })
        .toArray()
    : [];
  const classMap = new Map(classDocs.map((c: any) => [c._id.toString(), c.name]));

  let totalHadir = 0, totalHadirL = 0, totalHadirP = 0;
  let totalL = 0, totalP = 0;
  const perClass: any[] = [];
  const absentList: any[] = [];

  for (const [cid, stuList] of classStudents) {
    let hadir = 0, hadirL = 0, hadirP = 0;
    let countL = 0, countP = 0;
    const absentInClass: any[] = [];

    for (const s of stuList) {
      if (s.sex === "L") countL++;
      else countP++;
      const isPresent = presentSet.has(s._id.toString());
      if (isPresent) {
        hadir++;
        if (s.sex === "L") hadirL++;
        else hadirP++;
      } else {
        absentInClass.push({
          _id: s._id.toString(), name: s.name, classId: cid,
          className: classMap.get(cid) || null, sex: s.sex,
        });
      }
    }

    totalHadir += hadir;
    totalHadirL += hadirL;
    totalHadirP += hadirP;
    totalL += countL;
    totalP += countP;

    const total = stuList.length;
    perClass.push({
      classId: cid,
      className: classMap.get(cid) || cid,
      total, hadir, tidakHadir: total - hadir,
      percentage: total > 0 ? Math.round((hadir / total) * 100) : 0,
      totalL: countL, hadirL, tidakHadirL: countL - hadirL, percentageL: countL > 0 ? Math.round((hadirL / countL) * 100) : 0,
      totalP: countP, hadirP, tidakHadirP: countP - hadirP, percentageP: countP > 0 ? Math.round((hadirP / countP) * 100) : 0,
    });
    absentList.push(...absentInClass);
  }

  return NextResponse.json({
    date: today, totalStudents: students.length,
    totalHadir, totalTidakHadir: students.length - totalHadir,
    attendancePercentage: students.length > 0 ? Math.round((totalHadir / students.length) * 100) : 0,
    totalL, totalHadirL, tidakHadirL: totalL - totalHadirL, percentageL: totalL > 0 ? Math.round((totalHadirL / totalL) * 100) : 0,
    totalP, totalHadirP, tidakHadirP: totalP - totalHadirP, percentageP: totalP > 0 ? Math.round((totalHadirP / totalP) * 100) : 0,
    perClass, absentList,
  });
}

async function getClassDetail(db: any, students: any[], today: string, classId: string) {
  // Filter to only the requested class
  const classStudents = students.filter(s => s.classId?.toString() === classId);

  // Get class name
  const { ObjectId } = await import("mongodb");
  const classDoc = await db.collection("classes").findOne({ _id: new ObjectId(classId) } as any);
  const className = classDoc?.name || classId;

  // Get today's attendance for this class
  const attFilter = { date: today, classId };
  const attendanceRecords = await db.collection("attendance").find(attFilter).project({ studentId: 1 }).toArray();
  const presentSet = new Set(attendanceRecords.map((a: any) => a.studentId.toString()));

  let hadir = 0, hadirL = 0, hadirP = 0;
  let countL = 0, countP = 0;
  const absentList: any[] = [];

  for (const s of classStudents) {
    if (s.sex === "L") countL++;
    else countP++;
    const isPresent = presentSet.has(s._id.toString());
    if (isPresent) {
      hadir++;
      if (s.sex === "L") hadirL++;
      else hadirP++;
    } else {
      absentList.push({ _id: s._id.toString(), name: s.name, sex: s.sex });
    }
  }

  const total = classStudents.length;
  return NextResponse.json({
    classId, className,
    date: today,
    total, hadir, tidakHadir: total - hadir,
    percentage: total > 0 ? Math.round((hadir / total) * 100) : 0,
    totalL: countL, hadirL, tidakHadirL: countL - hadirL,
    percentageL: countL > 0 ? Math.round((hadirL / countL) * 100) : 0,
    totalP: countP, hadirP, tidakHadirP: countP - hadirP,
    percentageP: countP > 0 ? Math.round((hadirP / countP) * 100) : 0,
    absentList,
  });
}

async function getSummaryReport(db: any, range: any, classId: string | null, students: any[]) {
  const matchStage: Record<string, unknown> = {
    date: { $gte: range.from, $lte: range.to },
  };
  if (classId) matchStage.classId = classId;

  const agg = await db.collection("attendance")
    .aggregate([{ $match: matchStage }, { $group: { _id: "$date", count: { $sum: 1 } } }, { $sort: { _id: 1 } }])
    .toArray();

  return NextResponse.json({
    range, totalStudents: students.length,
    days: agg.map((d: any) => ({
      date: d._id, hadir: d.count,
      tidakHadir: Math.max(0, students.length - d.count),
      percentage: students.length > 0 ? Math.round((d.count / students.length) * 100) : 0,
    })),
    totalRecords: agg.reduce((sum: number, d: any) => sum + d.count, 0),
  });
}

async function getDetailedReport(db: any, range: any, classId: string | null, students: any[], studentMap: Map<string, any>) {
  const matchStage: Record<string, unknown> = { date: { $gte: range.from, $lte: range.to } };
  if (classId) matchStage.classId = classId;

  const records = await db.collection("attendance").find(matchStage).sort({ date: 1 }).toArray();
  const dateMap = new Map<string, Set<string>>();
  for (const r of records) {
    if (!dateMap.has(r.date)) dateMap.set(r.date, new Set());
    dateMap.get(r.date)!.add(r.studentId.toString());
  }

  const details: any[] = [];
  for (const [date, presentSet] of dateMap) {
    const present: any[] = [];
    const absent: any[] = [];
    for (const s of students) {
      if (presentSet.has(s._id.toString())) present.push({ _id: s._id.toString(), name: s.name });
      else absent.push({ _id: s._id.toString(), name: s.name });
    }
    details.push({ date, present, absent, total: students.length });
  }

  return NextResponse.json({ range, totalStudents: students.length, details });
}