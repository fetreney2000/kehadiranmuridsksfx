import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";
import { requireApiKey } from "@/lib/api/api-key-auth";
import { addCorsHeaders, handleOptions } from "@/lib/api/cors";
import type { Attendance, Student, Class } from "@/lib/db/types";

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
  const limit = Math.min(Number(searchParams.get("limit")) || 100, 1000);
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);

  const db = await getDb();
  const filter: Record<string, unknown> = {};

  if (classId) filter.classId = classId;
  if (studentId) filter.studentId = studentId;
  if (date) {
    filter.date = date;
  } else if (from && to) {
    filter.date = { $gte: from, $lte: to };
  }

  const skip = (page - 1) * limit;
  const total = await db.collection("attendance").countDocuments(filter);
  const records = await db
    .collection<Attendance>("attendance")
    .find(filter)
    .sort({ date: -1, recordedAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  // Resolve student names and class names in batch
  const studentIds = [...new Set(records.map((r) => r.studentId))];
  const classIds = [...new Set(records.map((r) => r.classId))];

  const [studentDocs, classDocs] = await Promise.all([
    studentIds.length > 0
      ? db
          .collection<Student>("students")
          .find({ _id: { $in: studentIds } } as any)
          .project({ _id: 1, name: 1 })
          .toArray()
      : [],
    classIds.length > 0
      ? db
          .collection<Class>("classes")
          .find({ _id: { $in: classIds } } as any)
          .project({ _id: 1, name: 1 })
          .toArray()
      : [],
  ]);

  const studentNameMap = new Map(studentDocs.map((s) => [s._id.toString(), s.name]));
  const classNameMap = new Map(classDocs.map((c) => [c._id.toString(), c.name]));

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
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }),
  );
}
