import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";
import { requireApiKey } from "@/lib/api/api-key-auth";
import { addCorsHeaders, handleOptions } from "@/lib/api/cors";
import type { Student, Class } from "@/lib/db/types";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return handleOptions(request);
}

export async function GET(request: Request) {
  const authError = requireApiKey(request);
  if (authError) return addCorsHeaders(request, authError);

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId");
  const active = searchParams.get("active");
  const limit = Math.min(Number(searchParams.get("limit")) || 200, 1000);
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);

  const db = await getDb();
  const filter: Record<string, unknown> = {};

  if (classId) filter.classId = classId;
  if (active === "true") filter.isActive = true;
  else if (active === "false") filter.isActive = false;

  const skip = (page - 1) * limit;
  const total = await db.collection("students").countDocuments(filter);
  const students = await db
    .collection<Student>("students")
    .find(filter)
    .sort({ name: 1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  // Resolve class names
  const classIds = [
    ...new Set(students.map((s) => s.classId?.toString()).filter(Boolean)),
  ];
  const classDocs =
    classIds.length > 0
      ? await db
          .collection<Class>("classes")
          .find({ _id: { $in: classIds } } as any)
          .project({ _id: 1, name: 1 })
          .toArray()
      : [];
  const classMap = new Map(classDocs.map((c) => [c._id.toString(), c.name]));

  const result = students.map((s) => ({
    id: s._id.toString(),
    name: s.name,
    sex: s.sex,
    classId: s.classId?.toString() || null,
    className: classMap.get(s.classId?.toString() || "") || null,
    qrCode: s.qrCode,
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));

  return addCorsHeaders(
    request,
    NextResponse.json({
      data: result,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }),
  );
}
