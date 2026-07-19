import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";
import { requireAuth, requireRole } from "@/lib/api/auth-helpers";
import type { Class, User } from "@/lib/db/types";
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

  const guruIds = classes.map(c => c.guruKelasId).filter(Boolean);
  const { ObjectId } = await import("mongodb");
  const gurus = guruIds.length > 0
    ? await db.collection<User>("users")
        .find({ _id: { $in: guruIds.map(id => new ObjectId(id!)) } } as any)
        .project({ _id: 1, fullName: 1 })
        .toArray()
    : [];

  const guruMap = new Map(gurus.map(g => [g._id.toString(), g.fullName]));

  const result = classes.map((c) => ({
    _id: c._id.toString(),
    name: c.name,
    guruKelasId: c.guruKelasId?.toString() || null,
    guruKelasName: c.guruKelasId ? (guruMap.get(c.guruKelasId.toString()) || null) : null,
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
  const { ObjectId } = await import("mongodb");

  // Enforce 1 guru per kelas: if assigning a guru, remove them from any other class
  if (guruKelasId) {
    await db.collection<Class>("classes").updateMany(
      { guruKelasId: guruKelasId } as any,
      { $set: { guruKelasId: null, updatedAt: now } }
    );
  }

  let guruKelasName: string | null = null;
  if (guruKelasId) {
    const guru = await db.collection<User>("users").findOne({ _id: new ObjectId(guruKelasId) } as any);
    guruKelasName = guru?.fullName || null;
  }

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
      guruKelasName,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      studentCount: 0,
    },
    { status: 201 }
  );
}