import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";
import { requireRole } from "@/lib/api/auth-helpers";
import type { Class } from "@/lib/db/types";
import { ObjectId } from "mongodb";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  guruKelasId: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole("pentadbir");
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Data tidak sah" }, { status: 400 });
    }

    const db = await getDb();
    const now = new Date();

    // Enforce 1 guru per kelas: if assigning a new guru, remove them from any other class
    if (parsed.data.guruKelasId) {
      await db.collection<Class>("classes").updateMany(
        { guruKelasId: parsed.data.guruKelasId, _id: { $ne: new ObjectId(id) } } as any,
        { $set: { guruKelasId: null, updatedAt: now } }
      );
    }

    const updateData: Record<string, unknown> = { updatedAt: now };
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.guruKelasId !== undefined) updateData.guruKelasId = parsed.data.guruKelasId;

    await db
      .collection<Class>("classes")
      .updateOne({ _id: new ObjectId(id) } as any, { $set: updateData });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/classes error:", error);
    return NextResponse.json({ error: "Ralat pelayan. Sila cuba lagi." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole("pentadbir");
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const db = await getDb();

    const studentCount = await db.collection("students").countDocuments({
      classId: id,
      isActive: true,
    });
    if (studentCount > 0) {
      return NextResponse.json(
        { error: "Kelas ini mengandungi murid. Sila pindahkan atau hapuskan murid terlebih dahulu." },
        { status: 400 }
      );
    }

    await db.collection<Class>("classes").deleteOne({ _id: new ObjectId(id) } as any);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/classes error:", error);
    return NextResponse.json({ error: "Ralat pelayan. Sila cuba lagi." }, { status: 500 });
  }
}