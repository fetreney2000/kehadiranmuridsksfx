import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";
import { requireAuth } from "@/lib/api/auth-helpers";
import { canManageStudent } from "@/lib/auth/permissions";
import type { Student } from "@/lib/db/types";
import { ObjectId } from "mongodb";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  sex: z.enum(["L", "P"]).optional(),
  classId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak sah" }, { status: 400 });
  }

  const db = await getDb();

  // Get student to check ownership
  const student = await db
    .collection<Student>("students")
    .findOne({ _id: new ObjectId(id) } as any);

  if (!student) {
    return NextResponse.json({ error: "Murid tidak dijumpai" }, { status: 404 });
  }

  // Check if user can manage this student's class
  const targetClassId = parsed.data.classId || student.classId?.toString();
  if (!canManageStudent(auth, targetClassId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.sex !== undefined) updateData.sex = parsed.data.sex;
  if (parsed.data.classId !== undefined) updateData.classId = parsed.data.classId;
  if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;

  await db
    .collection<Student>("students")
    .updateOne({ _id: new ObjectId(id) } as any, { $set: updateData });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const db = await getDb();

  const student = await db
    .collection<Student>("students")
    .findOne({ _id: new ObjectId(id) } as any);

  if (!student) {
    return NextResponse.json({ error: "Murid tidak dijumpai" }, { status: 404 });
  }

  if (!canManageStudent(auth, student.classId?.toString())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Soft delete: mark inactive
  await db.collection<Student>("students").updateOne(
    { _id: new ObjectId(id) } as any,
    { $set: { isActive: false, updatedAt: new Date() } }
  );

  return NextResponse.json({ success: true });
}