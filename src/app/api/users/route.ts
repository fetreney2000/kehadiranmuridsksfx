/**
 * GET /api/users — list all users (pentadbir only)
 * POST /api/users — create new user (pentadbir only)
 */

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";
import { requireRole } from "@/lib/api/auth-helpers";
import type { User, SafeUser } from "@/lib/db/types";
import bcrypt from "bcryptjs";
import { z } from "zod";

const createUserSchema = z.object({
  username: z.string().min(3).max(30),
  password: z.string().min(6),
  fullName: z.string().min(1),
  role: z.enum(["pentadbir", "guru_kelas", "guru_biasa"]),
  classId: z.string().nullable().optional(),
});

export async function GET() {
  const auth = await requireRole("pentadbir");
  if (auth instanceof NextResponse) return auth;

  const db = await getDb();
  const users = await db
    .collection<User>("users")
    .find({})
    .sort({ fullName: 1 })
    .toArray();

  const safeUsers: SafeUser[] = users.map((u) => ({
    _id: u._id.toString(),
    username: u.username,
    role: u.role,
    fullName: u.fullName,
    classId: u.classId?.toString() || null,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
  }));

  return NextResponse.json(safeUsers);
}

export async function POST(request: Request) {
  const auth = await requireRole("pentadbir");
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak sah", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { username, password, fullName, role, classId } = parsed.data;
  const db = await getDb();

  // Check duplicate username
  const existing = await db
    .collection<User>("users")
    .findOne({ username: username.toLowerCase().trim() });
  if (existing) {
    return NextResponse.json(
      { error: "Nama pengguna telah digunakan." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();

  const result = await db.collection<User>("users").insertOne({
    username: username.toLowerCase().trim(),
    passwordHash,
    fullName,
    role,
    classId: role === "guru_kelas" ? classId : null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  } as User);

  return NextResponse.json(
    {
      _id: result.insertedId.toString(),
      username: username.toLowerCase().trim(),
      fullName,
      role,
      classId: role === "guru_kelas" ? classId : null,
      isActive: true,
      createdAt: now.toISOString(),
    },
    { status: 201 }
  );
}