import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";
import { requireApiKey } from "@/lib/api/api-key-auth";
import { addCorsHeaders, handleOptions } from "@/lib/api/cors";
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
  const today = getTodayKL();

  const db = await getDb();

  // Get all active students
  const studentFilter: Record<string, unknown> = { isActive: true };
  if (classId) studentFilter.classId = classId;

  const students = await db
    .collection("students")
    .find(studentFilter)
    .project({ _id: 1, name: 1, classId: 1, sex: 1 })
    .toArray();

  // Get today's attendance records
  const attFilter: Record<string, unknown> = { date: today };
  if (classId) attFilter.classId = classId;

  const attendanceRecords = await db
    .collection("attendance")
    .find(attFilter)
    .project({ studentId: 1 })
    .toArray();

  const presentSet = new Set(attendanceRecords.map((a: any) => a.studentId.toString()));

  // Group students by class
  const classStudents = new Map<string, any[]>();
  for (const s of students) {
    const cid = s.classId?.toString() || "unknown";
    if (!classStudents.has(cid)) classStudents.set(cid, []);
    classStudents.get(cid)!.push(s);
  }

  // Resolve class names
  const { ObjectId } = await import("mongodb");
  const classIds = [...classStudents.keys()].filter((id) => id !== "unknown");
  const classDocs =
    classIds.length > 0
      ? await db
          .collection("classes")
          .find({ _id: { $in: classIds.map((id: string) => new ObjectId(id)) } } as any)
          .project({ _id: 1, name: 1 })
          .toArray()
      : [];
  const classMap = new Map(classDocs.map((c: any) => [c._id.toString(), c.name]));

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
          id: s._id.toString(),
          name: s.name,
          sex: s.sex,
        });
      }
    }

    const total = stuList.length;
    totalHadir += hadir;
    totalTidakHadir += total - hadir;

    perClass.push({
      classId: cid,
      className: classMap.get(cid) || cid,
      total,
      hadir,
      tidakHadir: total - hadir,
      percentage: total > 0 ? Math.round((hadir / total) * 100) : 0,
    });
    absentList.push(...absentInClass);
  }

  return addCorsHeaders(
    request,
    NextResponse.json({
      date: today,
      totalStudents: students.length,
      totalHadir,
      totalTidakHadir,
      attendancePercentage:
        students.length > 0 ? Math.round((totalHadir / students.length) * 100) : 0,
      perClass,
      absentList,
    }),
  );
}
