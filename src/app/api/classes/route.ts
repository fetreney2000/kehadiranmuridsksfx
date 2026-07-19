/**
 * GET /api/classes — list all classes
 * POST /api/classes — create new class (pentadbir only)
 */

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";
import { requireAuth, requireRole } from "@/lib/api/auth-helpers";
import type { Class } from "@/lib/db/types";
import { z } from "zod";

const createClassSchema = z.object({
  name: z.string().min(1),
  guruKelasId: z.string().nullable().optional(),
});

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const db = await getDb();
  const classes = await db
    .collection<Class>("classes")
    .find({})
    .sort({ name: 1 })
    .toArray();

  // Get student counts per class
  const countsAgg = await db
    .collection("students")
    .aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$classId", count: { $sum: 1 } } },
    ])
    .toArray();

  const countMap = new Map<string, number>();
  for (const c of countsAgg) {
    countMap.set(c._id.toString(), c.count);
  }

  const result = classes.map((c) => ({
    _id: c._id.toString(),
    name: c.name,
    guruKelasId: c.guruKelasId?.toString() || null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    studentCount: countMap.get(c._id.toString()) || 0,
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const auth = await requireRole("pentadbir");
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const parsed = createClassSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak sah" }, { status: 400 });
  }

  const { name, guruKelasId } = parsed.data;
  const db = await getDb();
  const now = new Date();

  const result = await db.collection<Class>("classes").insertOne({
    name,
    guruKelasId: guruKelasId || null,
    createdAt: now,
    updatedAt: now,
  } as Class);

  return NextResponse.json(
    {
      _id: result.insertedId.toString(),
      name,
      guruKelasId: guruKelasId || null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      studentCount: 0,
    },
    { status: 201 }
  );
}