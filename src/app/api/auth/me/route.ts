import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(null, { status: 401 });
  }
  return NextResponse.json({
    userId: session.userId,
    username: session.username,
    fullName: session.fullName,
    role: session.role,
    classId: session.classId,
  });
}