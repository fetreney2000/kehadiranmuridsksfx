import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";
import { requireAuth, requireRole } from "@/lib/api/auth-helpers";
import type { Class, User } from "@/lib/db/types";
import { ObjectId } from "mongodb";
import { z } from "zod";

const createClassSchema = z.object({
  name: z.string().min(1),
  guruKelasId: z.string().nullable().optional(),
});

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const db = await getDb();
    const classes = await db
      .collection<Class>("classes")
      .find({})
      .sort({ name: 1 })
      .toArray();

    // Student counts per class
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

    // Collect valid guruKelasId strings
    const guruIdsRaw = classes
      .map(c => c.guruKelasId?.toString())
      .filter((id): id is string => !!id && id.length === 24 && /^[a-f\d]{24}$/i.test(id));

    const guruMap = new Map<string, string>();

    if (guruIdsRaw.length > 0) {
      try {
        const objectIds = guruIdsRaw.map(id => new ObjectId(id));
        const gurus = await db
          .collection<User>("users")
          .find({ _id: { $in: objectIds } } as any)
          .project({ _id: 1, fullName: 1 })
          .toArray();
        for (const g of gurus) {
          guruMap.set(g._id.toString(), g.fullName);
        }
      } catch (e) {
        // If guru lookup fails, continue without names
        console.error("Guru lookup failed:", e);
      }
    }

    const result = classes.map((c) => {
      const gid = c.guruKelasId?.toString() || null;
      return {
        _id: c._id.toString(),
        name: c.name,
        guruKelasId: gid,
        guruKelasName: gid ? (guruMap.get(gid) || null) : null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        studentCount: countMap.get(c._id.toString()) || 0,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/classes error:", error);
    return NextResponse.json(
      { error: "Ralat pelayan. Sila cuba lagi." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireRole("pentadbir");
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const parsed = createClassSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Data tidak sah" }, { status: 400 });
    }

    const { name, guruKelasId } = parsed.data;
    const db = await getDb();
    const now = new Date();

    // Enforce 1 guru per kelas
    if (guruKelasId) {
      await db.collection<Class>("classes").updateMany(
        { guruKelasId } as any,
        { $set: { guruKelasId: null, updatedAt: now } }
      );
    }

    let guruKelasName: string | null = null;
    if (guruKelasId) {
      try {
        const guru = await db
          .collection<User>("users")
          .findOne({ _id: new ObjectId(guruKelasId) } as any);
        guruKelasName = guru?.fullName || null;
      } catch {
        // invalid ObjectId, ignore
      }
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
  } catch (error) {
    console.error("POST /api/classes error:", error);
    return NextResponse.json(
      { error: "Ralat pelayan. Sila cuba lagi." },
      { status: 500 }
    );
  }
}