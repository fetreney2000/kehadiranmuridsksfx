import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";
import { requireApiKey } from "@/lib/api/api-key-auth";
import { addCorsHeaders, handleOptions } from "@/lib/api/cors";
import type { Attendance, Student, Class } from "@/lib/db/types";
import { getTodayKL } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return handleOptions(request);
}

export async function GET(request: Request) {
  const authError = requireApiKey(request);
  if (authError) return addCorsHeaders(request, authError);

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId");
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const studentId = searchParams.get("studentId");
  const includeAbsent = searchParams.get("includeAbsent") === "true";
  const limit = Math.min(Number(searchParams.get("limit")) || 100, 1000);
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);

  const db = await getDb();
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = {};

  if (classId) filter.classId = classId;
  if (studentId) filter.studentId = studentId;
  if (date) {
    filter.date = date;
  } else if (from && to) {
    filter.date = { $gte: from, $lte: to };
  }

  // Resolve class names upfront — needed for both present and absent records
  const classFilter: Record<string, unknown> = {};
  if (classId) classFilter._id = classId;
  const allClassDocs = await db
    .collection<Class>("classes")
    .find(classFilter as any)
    .project({ _id: 1, name: 1 })
    .toArray();
  const classNameMap = new Map(allClassDocs.map((c) => [c._id.toString(), c.name]));

  if (includeAbsent) {
    // Determine the date(s) to cover
    const dates: string[] = [];
    if (date) {
      dates.push(date);
    } else if (from && to) {
      const { getDatesInRange } = await import("@/lib/utils/date");
      dates.push(...getDatesInRange(from, to));
    } else {
      dates.push(getTodayKL());
    }

    // Get all active students in scope
    const studentFilter: Record<string, unknown> = { isActive: true };
    if (classId) studentFilter.classId = classId;
    const allStudents = await db
      .collection<Student>("students")
      .find(studentFilter)
      .project({ _id: 1, name: 1, classId: 1, sex: 1 })
      .toArray();

    // Get attendance records for all requested dates
    const attFilter: Record<string, unknown> = { date: { $in: dates } };
    if (classId) attFilter.classId = classId;
    if (studentId) attFilter.studentId = studentId;
    const presentRecords = await db
      .collection<Attendance>("attendance")
      .find(attFilter)
      .toArray();

    // Build a set of (date, studentId) tuples that are present
    const presentKeys = new Set(
      presentRecords.map((r) => `${r.date}|${r.studentId}`),
    );

    const result: any[] = [];

    for (const d of dates) {
      const studentsInScope = studentId
        ? allStudents.filter((s) => s._id.toString() === studentId)
        : allStudents;

      for (const s of studentsInScope) {
        const isPresent = presentKeys.has(`${d}|${s._id.toString()}`);
        const matchingRecord = presentRecords.find(
          (r) => r.date === d && r.studentId === s._id.toString(),
        );

        result.push({
          id: matchingRecord ? matchingRecord._id.toString() : null,
          studentId: s._id.toString(),
          studentName: s.name,
          classId: s.classId?.toString() || null,
          className: classNameMap.get(s.classId?.toString() || "") || null,
          date: d,
          status: isPresent ? ("hadir" as const) : ("tidak_hadir" as const),
          method: matchingRecord?.method || null,
          recordedBy: matchingRecord?.recordedBy || null,
          recordedAt: matchingRecord?.recordedAt?.toISOString() || null,
        });
      }
    }

    const total = result.length;

    return addCorsHeaders(
      request,
      NextResponse.json({
        data: result.slice(skip, skip + limit),
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      }),
    );
  }

  // Standard mode — only present records
  const total = await db.collection("attendance").countDocuments(filter);
  const records = await db
    .collection<Attendance>("attendance")
    .find(filter)
    .sort({ date: -1, recordedAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  const studentIds = [...new Set(records.map((r) => r.studentId))];
  const studentDocs = studentIds.length > 0
    ? await db
        .collection<Student>("students")
        .find({ _id: { $in: studentIds } } as any)
        .project({ _id: 1, name: 1 })
        .toArray()
    : [];
  const studentNameMap = new Map(studentDocs.map((s) => [s._id.toString(), s.name]));

  const result = records.map((r) => ({
    id: r._id.toString(),
    studentId: r.studentId,
    studentName: studentNameMap.get(r.studentId) || null,
    classId: r.classId,
    className: classNameMap.get(r.classId) || null,
    date: r.date,
    status: r.status,
    method: r.method,
    recordedBy: r.recordedBy,
    recordedAt: r.recordedAt.toISOString(),
  }));

  return addCorsHeaders(
    request,
    NextResponse.json({
      data: result,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }),
  );
}
