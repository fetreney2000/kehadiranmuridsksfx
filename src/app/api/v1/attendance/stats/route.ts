import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";
import { requireApiKey } from "@/lib/api/api-key-auth";
import { addCorsHeaders, handleOptions } from "@/lib/api/cors";
import { getDateRange } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return handleOptions(request);
}

export async function GET(request: Request) {
  const authError = requireApiKey(request);
  if (authError) return addCorsHeaders(request, authError);

  const { searchParams } = new URL(request.url);
  const type = (searchParams.get("type") || "daily") as string;
  const classId = searchParams.get("classId");
  const customFrom = searchParams.get("from") || undefined;
  const customTo = searchParams.get("to") || undefined;
  const range = getDateRange(type as any, customFrom, customTo);

  const db = await getDb();

  // Get active students in scope
  const studentFilter: Record<string, unknown> = { isActive: true };
  if (classId) studentFilter.classId = classId;
  const totalStudents = await db.collection("students").countDocuments(studentFilter);

  // Aggregate attendance over the range
  const matchStage: Record<string, unknown> = {
    date: { $gte: range.from, $lte: range.to },
  };
  if (classId) matchStage.classId = classId;

  const agg = await db
    .collection("attendance")
    .aggregate([
      { $match: matchStage },
      { $group: { _id: "$date", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  return addCorsHeaders(
    request,
    NextResponse.json({
      range,
      totalStudents,
      days: agg.map((d: any) => ({
        date: d._id,
        hadir: d.count,
        tidakHadir: Math.max(0, totalStudents - d.count),
        percentage:
          totalStudents > 0 ? Math.round((d.count / totalStudents) * 100) : 0,
      })),
      totalRecords: agg.reduce((sum: number, d: any) => sum + d.count, 0),
    }),
  );
}
