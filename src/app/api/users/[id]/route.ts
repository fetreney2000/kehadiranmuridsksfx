import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";
import { requireRole } from "@/lib/api/auth-helpers";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { z } from "zod";

const updateUserSchema = z.object({
  username: z.string().min(3).max(30).optional(),
  fullName: z.string().min(1).optional(),
  roles: z.array(z.enum(["pentadbir", "guru_kelas", "guru_biasa"])).min(1).optional(),
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
    return NextResponse.json({ error: "Data tidak sah", details: parsed.error.flatten() }, { status: 400 });
  }

  const db = await getDb();
  const target = await db.collection("users").findOne({ _id: new ObjectId(id) } as any);
  if (!target) {
    return NextResponse.json({ error: "Pengguna tidak dijumpai" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (parsed.data.username !== undefined) {
    const existing = await db.collection("users").findOne({ username: parsed.data.username.toLowerCase().trim(), _id: { $ne: new ObjectId(id) } } as any);
    if (existing) {
      return NextResponse.json({ error: "Nama pengguna telah digunakan." }, { status: 409 });
    }
    updateData.username = parsed.data.username.toLowerCase().trim();
  }
  if (parsed.data.fullName !== undefined) updateData.fullName = parsed.data.fullName;
  if (parsed.data.roles !== undefined) {
    updateData.roles = parsed.data.roles;
    updateData.role = parsed.data.roles[0]; // primary role = first
    if (!parsed.data.roles.includes("guru_kelas")) {
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