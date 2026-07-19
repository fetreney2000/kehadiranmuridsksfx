import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db/mongodb";
import { createSession } from "@/lib/auth/session";
import type { User, SessionPayload } from "@/lib/db/types";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1, "Nama pengguna wajib diisi"),
  password: z.string().min(1, "Kata laluan wajib diisi"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Nama pengguna atau kata laluan salah." }, { status: 400 });
    }

    const { username, password } = parsed.data;
    const db = await getDb();
    const user = await db.collection<User>("users").findOne({ username: username.toLowerCase().trim() });

    if (!user) {
      return NextResponse.json({ error: "Nama pengguna atau kata laluan salah." }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: "Akaun ini telah dinyahaktifkan. Hubungi pentadbir." }, { status: 403 });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return NextResponse.json({ error: "Nama pengguna atau kata laluan salah." }, { status: 401 });
    }

    // Support dual roles: use roles array if present, otherwise single role
    const roles = user.roles && user.roles.length > 0 ? user.roles : [user.role];
    const primaryRole = roles[0];

    const sessionPayload: SessionPayload = {
      userId: user._id.toString(),
      username: user.username,
      fullName: user.fullName,
      role: primaryRole,
      roles,
      classId: user.classId?.toString() || null,
    };

    await createSession(sessionPayload);

    return NextResponse.json({
      success: true,
      user: {
        _id: sessionPayload.userId,
        username: sessionPayload.username,
        fullName: sessionPayload.fullName,
        role: sessionPayload.role,
        roles: sessionPayload.roles,
        classId: sessionPayload.classId,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Ralat pelayan. Sila cuba lagi." }, { status: 500 });
  }
}