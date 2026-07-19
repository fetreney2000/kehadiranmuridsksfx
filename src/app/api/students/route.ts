/**
 * GET /api/students — list students (filterable by classId)
 * POST /api/students — create student (pentadbir or guru_kelas for own class)
 *
 * GET response now includes `className` resolved from the classes collection
 * so the frontend never needs to display raw classId.
 */

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";
import { requireAuth } from "@/lib/api/auth-helpers";
import { canManageStudent } from "@/lib/auth/permissions";
import type { Student, Class } from "@/lib/db/types";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const createStudentSchema = z.object({
  name: z.string().min(1),
  sex: z.enum(["L", "P"]),
  classId: z.string().min(1),
});

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId");
  const active = searchParams.get("active");

  const db = await getDb();
  const filter: Record<string, unknown> = {};

  // guru_kelas sees only their own class
  if (auth.role === "guru_kelas") {
    filter.classId = auth.classId;
  } else if (classId) {
    filter.classId = classId;
  }

  if (active === "true") filter.isActive = true;
  else if (active === "false") filter.isActive = false;

  const students = await db
    .collection<Student>("students")
    .find(filter)
    .sort({ name: 1 })
    .toArray();

  // Resolve class names in a single query — one round-trip, not N queries
  const classIds = [
    ...new Set(
      students
        .map((s) => s.classId?.toString())
        .filter((id): id is string => !!id)
    ),
  ];

  const classDocs =
    classIds.length > 0
      ? await db
          .collection<Class>("classes")
          .find({
            _id: {
              $in: classIds.map((id) => id),
            },
          } as any)
          .project({ _id: 1, name: 1 })
          .toArray()
      : [];

  const classMap = new Map(
    classDocs.map((c) => [c._id.toString(), c.name])
  );

  const result = students.map((s) => ({
    _id: s._id.toString(),
    name: s.name,
    sex: s.sex,
    classId: s.classId?.toString() || null,
    className: classMap.get(s.classId?.toString() || "") || null,
    qrCode: s.qrCode,
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const parsed = createStudentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak sah" }, { status: 400 });
  }

  // Check permission: must be pentadbir or guru_kelas for their own class
  if (!canManageStudent(auth, parsed.data.classId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, sex, classId } = parsed.data;
  const db = await getDb();
  const now = new Date();
  const qrCode = uuidv4();

  // Resolve class name for the response
  const classDoc = await db
    .collection<Class>("classes")
    .findOne({ _id: classId as any } as any);

  const result = await db.collection<Student>("students").insertOne({
    name,
    sex,
    classId,
    qrCode,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  } as Student);

  return NextResponse.json(
    {
      _id: result.insertedId.toString(),
      name,
      sex,
      classId,
      className: classDoc?.name || null,
      qrCode,
      isActive: true,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    { status: 201 }
  );
}