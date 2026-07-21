import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";
import { requireApiKey } from "@/lib/api/api-key-auth";
import { addCorsHeaders, handleOptions } from "@/lib/api/cors";
import type { Class } from "@/lib/db/types";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return handleOptions(request);
}

export async function GET(request: Request) {
  const authError = requireApiKey(request);
  if (authError) return addCorsHeaders(request, authError);

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
  const countMap = new Map<string, number>(
    countsAgg.map((c: any) => [c._id.toString(), c.count]),
  );

  const result = classes.map((c) => ({
    id: c._id.toString(),
    name: c.name,
    guruKelasId: c.guruKelasId?.toString() || null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    studentCount: countMap.get(c._id.toString()) || 0,
  }));

  return addCorsHeaders(request, NextResponse.json({ data: result }));
}
