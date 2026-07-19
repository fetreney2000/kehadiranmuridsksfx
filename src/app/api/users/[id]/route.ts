/**
 * PATCH /api/users/[id] — update user (pentadbir only)
 * DELETE /api/users/[id] — deactivate user (pentadbir only)
 */

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";
import { requireRole } from "@/lib/api/auth-helpers";
import type { User } from "@/lib/db/types";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { z } from "zod";

const updateUserSchema = z.object({
  fullName: z.string().min(1).optional(),
  role: z.enum(["pentadbir", "guru_kelas", "guru_biasa"]).optional(),
  classId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole("pentadbir");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak sah" }, { status: 400 });
  }

  const db = await getDb();
  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (parsed.data.fullName !== undefined) updateData.fullName = parsed.data.fullName;
  if (parsed.data.role !== undefined) {
    updateData.role = parsed.data.role;
    // If role changed away from guru_kelas, clear classId
    if (parsed.data.role !== "guru_kelas") {
      updateData.classId = null;
    }
  }
  if (parsed.data.classId !== undefined) {
    updateData.classId = parsed.data.classId;
  }
  if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;
  if (parsed.data.password) {
    updateData.passwordHash = await bcrypt.hash(parsed.data.password, 12);
  }

  await db.collection("users").updateOne(
    { _id: new ObjectId(id) } as any,
    { $set: updateData }
  );

  return NextResponse.json({ success: true });
}