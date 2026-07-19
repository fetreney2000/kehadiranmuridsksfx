/**
 * Seed script: creates an initial pentadbir account + sample classes + students.
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 *
 * Requires: MONGODB_URI in .env.local
 */

import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

// Load env from .env.local
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, "..", ".env.local") });

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI not set in .env.local");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  console.log("✅ Connected to MongoDB");

  // Clean existing data (optional — comment out to preserve)
  console.log("⚠️  Dropping existing collections...");
  await db.dropCollection("users").catch(() => {});
  await db.dropCollection("classes").catch(() => {});
  await db.dropCollection("students").catch(() => {});
  await db.dropCollection("attendance").catch(() => {});

  // Create indexes
  await db.collection("users").createIndex({ username: 1 }, { unique: true });
  await db.collection("students").createIndex({ classId: 1 });
  await db.collection("students").createIndex({ qrCode: 1 }, { unique: true });
  await db.collection("attendance").createIndex({ classId: 1, date: 1 });
  await db.collection("attendance").createIndex({ studentId: 1, date: 1 }, { unique: true });
  console.log("✅ Indexes created");

  // ---- Users ----
  const adminHash = await bcrypt.hash("admin123", 12);
  const guruHash = await bcrypt.hash("guru123", 12);

  const adminResult = await db.collection("users").insertOne({
    username: "admin",
    passwordHash: adminHash,
    role: "pentadbir",
    fullName: "Pentadbir Sekolah",
    classId: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log("✅ Pentadbir: admin / admin123");

  const guru1Result = await db.collection("users").insertOne({
    username: "guru1",
    passwordHash: guruHash,
    role: "guru_kelas",
    fullName: "Cikgu Aminah",
    classId: null, // will be set after class creation
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log("✅ Guru Kelas: guru1 / guru123");

  const guru2Result = await db.collection("users").insertOne({
    username: "guru2",
    passwordHash: guruHash,
    role: "guru_kelas",
    fullName: "Cikgu Hafiz",
    classId: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const guruBiasaResult = await db.collection("users").insertOne({
    username: "guru3",
    passwordHash: guruHash,
    role: "guru_biasa",
    fullName: "Cikgu Mei Ling",
    classId: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log("✅ Guru Biasa: guru3 / guru123");

  // ---- Classes ----
  const class1Result = await db.collection("classes").insertOne({
    name: "5 Bestari",
    guruKelasId: guru1Result.insertedId.toString(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const class2Result = await db.collection("classes").insertOne({
    name: "5 Cemerlang",
    guruKelasId: guru2Result.insertedId.toString(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Update guru kelas with their classId
  await db.collection("users").updateOne(
    { _id: guru1Result.insertedId },
    { $set: { classId: class1Result.insertedId.toString() } }
  );
  await db.collection("users").updateOne(
    { _id: guru2Result.insertedId },
    { $set: { classId: class2Result.insertedId.toString() } }
  );

  console.log("✅ Kelas: 5 Bestari, 5 Cemerlang");

  // ---- Students ----
  const students5Bestari = [
    { name: "Ahmad Faiz bin Abdullah", sex: "L" },
    { name: "Siti Nurhaliza binti Ramli", sex: "P" },
    { name: "Muhammad Danish bin Hafiz", sex: "L" },
    { name: "Nurul Alya binti Zulkifli", sex: "P" },
    { name: "Haziq Mirza bin Idris", sex: "L" },
    { name: "Aina Sofea binti Yusof", sex: "P" },
    { name: "Irfan Hakimi bin Shahrul", sex: "L" },
    { name: "Damia Qaisara binti Azman", sex: "P" },
    { name: "Hariz Iskandar bin Rizal", sex: "L" },
    { name: "Balqis Humaira binti Fikri", sex: "P" },
    { name: "Adam Mikhail bin Roslan", sex: "L" },
    { name: "Zara Aleesya binti Khalid", sex: "P" },
    { name: "Rayyan Ashraf bin Nasir", sex: "L" },
    { name: "Maisarah Husna binti Hilmi", sex: "P" },
    { name: "Danial Haikal bin Syafiq", sex: "L" },
  ];

  const students5Cemerlang = [
    { name: "Khairul Amin bin Osman", sex: "L" },
    { name: "Nadia Batrisyia binti Redzuan", sex: "P" },
    { name: "Izzat Haziq bin Fauzi", sex: "L" },
    { name: "Shafiqah Amani binti Kamal", sex: "P" },
    { name: "Amirul Asyraf bin Zainal", sex: "L" },
    { name: "Fatin Najihah binti Azhar", sex: "P" },
    { name: "Aqil Zhafran bin Ismail", sex: "L" },
    { name: "Hanis Syuhada binti Norazman", sex: "P" },
    { name: "Luqman Hakim bin Ghazali", sex: "L" },
    { name: "Sofea Adriana binti Saiful", sex: "P" },
  ];

  const now = new Date();
  for (const s of students5Bestari) {
    await db.collection("students").insertOne({
      name: s.name,
      sex: s.sex,
      classId: class1Result.insertedId.toString(),
      qrCode: uuidv4(),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  for (const s of students5Cemerlang) {
    await db.collection("students").insertOne({
      name: s.name,
      sex: s.sex,
      classId: class2Result.insertedId.toString(),
      qrCode: uuidv4(),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  console.log(`✅ Murid: ${students5Bestari.length} in 5 Bestari, ${students5Cemerlang.length} in 5 Cemerlang`);
  console.log("\n🎉 Seed complete! You can now log in with:");
  console.log("   Pentadbir: admin / admin123");
  console.log("   Guru Kelas: guru1 / guru123");
  console.log("   Guru Biasa: guru3 / guru123");

  await client.close();
}

seed().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});