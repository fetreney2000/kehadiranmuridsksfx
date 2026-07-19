/**
 * GET /api/attendance — query attendance records
 * POST /api/attendance — mark students as hadir (bulk write supported)
 *
 * ATTENDANCE STRATEGY: Only write records for students marked 'hadir'.
 * Students without a record for a given date are considered 'tidak_hadir'.
 */

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";
import { requireAuth } from "@/lib/api/auth-helpers";
import { canManageStudent } from "@/lib/auth/permissions";
import type { Attendance } from "@/lib/db/types";
import { getTodayKL } from "@/lib/utils/date";
import { z } from "zod";
import { ObjectId } from "mongodb";

const markSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // defaults to today
  students: z.array(z.object({
    studentId: z.string().min(1),
    classId: z.string().min(1),
  })),
  method: z.enum(["qr", "toggle"]),
});

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId");
  const date = searchParams.get("date") || getTodayKL();
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const db = await getDb();

  const filter: Record<string, unknown> = {};

  if (from && to) {
    filter.date = { $gte: from, $lte: to };
  } else {
    filter.date = date;
  }

  // guru_kelas sees only their own class
  if (auth.role === "guru_kelas") {
    filter.classId = auth.classId;
  } else if (classId) {
    filter.classId = classId;
  }

  const records = await db
    .collection<Attendance>("attendance")
    .find(filter)
    .sort({ recordedAt: -1 })
    .toArray();

  return NextResponse.json(
    records.map((r) => ({
      _id: r._id.toString(),
      studentId: r.studentId,
      classId: r.classId,
      date: r.date,
      status: r.status,
      method: r.method,
      recordedBy: r.recordedBy,
      recordedAt: r.recordedAt.toISOString(),
    }))
  );
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  // Only pentadbir and guru_kelas can mark attendance
  if (!["pentadbir", "guru_kelas"].includes(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = markSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak sah", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const date = parsed.data.date || getTodayKL();
  const { students, method } = parsed.data;

  // Verify all students belong to the teacher's class
  if (auth.role === "guru_kelas") {
    const unauthorized = students.some((s) => !canManageStudent(auth, s.classId));
    if (unauthorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const db = await getDb();
  const now = new Date();

  // Build bulk write operations
  const operations = students.map((s) => ({
    updateOne: {
      filter: {
        studentId: s.studentId,
        date: date,
      },
      update: {
        $setOnInsert: {
          studentId: s.studentId,
          classId: s.classId,
          date: date,
          status: "hadir" as const,
          method: method,
          recordedBy: auth.userId,
          recordedAt: now,
        },
      },
      upsert: true,
    },
  }));

  if (operations.length > 0) {
    await db.collection("attendance").bulkWrite(operations as any, {
      ordered: false,
    });
  }

  return NextResponse.json({
    success: true,
    count: students.length,
    date,
  });
}