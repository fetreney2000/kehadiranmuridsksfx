import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, "..", ".env.local") });

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error("MONGODB_URI not set"); process.exit(1); }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  console.log("Connected to MongoDB");

  await db.dropCollection("users").catch(() => {});
  await db.dropCollection("classes").catch(() => {});
  await db.dropCollection("students").catch(() => {});
  await db.dropCollection("attendance").catch(() => {});

  await db.collection("users").createIndex({ username: 1 }, { unique: true });
  await db.collection("students").createIndex({ classId: 1 });
  await db.collection("students").createIndex({ qrCode: 1 }, { unique: true });
  await db.collection("attendance").createIndex({ classId: 1, date: 1 });
  await db.collection("attendance").createIndex({ studentId: 1, date: 1 }, { unique: true });

  const adminHash = await bcrypt.hash("admin123", 12);
  const guruHash = await bcrypt.hash("guru123", 12);
  const now = new Date();

  // Pentadbir with dual role: pentadbir + guru_kelas
  const adminResult = await db.collection("users").insertOne({
    username: "admin", passwordHash: adminHash,
    role: "pentadbir", roles: ["pentadbir", "guru_kelas"],
    fullName: "Pentadbir Sekolah", classId: null, isActive: true, createdAt: now, updatedAt: now,
  });
  console.log("Pentadbir: admin / admin123 (pentadbir + guru_kelas)");

  const guru1Result = await db.collection("users").insertOne({
    username: "guru1", passwordHash: guruHash,
    role: "guru_kelas", roles: ["guru_kelas"],
    fullName: "Cikgu Aminah", classId: null, isActive: true, createdAt: now, updatedAt: now,
  });
  console.log("Guru Kelas: guru1 / guru123");

  const guru2Result = await db.collection("users").insertOne({
    username: "guru2", passwordHash: guruHash,
    role: "guru_kelas", roles: ["guru_kelas"],
    fullName: "Cikgu Hafiz", classId: null, isActive: true, createdAt: now, updatedAt: now,
  });

  await db.collection("users").insertOne({
    username: "guru3", passwordHash: guruHash,
    role: "guru_biasa", roles: ["guru_biasa"],
    fullName: "Cikgu Mei Ling", classId: null, isActive: true, createdAt: now, updatedAt: now,
  });
  console.log("Guru Biasa: guru3 / guru123");

  const class1Result = await db.collection("classes").insertOne({
    name: "5 Bestari", guruKelasId: guru1Result.insertedId.toString(), createdAt: now, updatedAt: now,
  });
  const class2Result = await db.collection("classes").insertOne({
    name: "5 Cemerlang", guruKelasId: guru2Result.insertedId.toString(), createdAt: now, updatedAt: now,
  });

  await db.collection("users").updateOne({ _id: guru1Result.insertedId }, { $set: { classId: class1Result.insertedId.toString() } });
  await db.collection("users").updateOne({ _id: guru2Result.insertedId }, { $set: { classId: class2Result.insertedId.toString() } });
  // Admin also gets class assignment (they have guru_kelas role)
  await db.collection("users").updateOne({ _id: adminResult.insertedId }, { $set: { classId: class1Result.insertedId.toString() } });

  console.log("Kelas: 5 Bestari, 5 Cemerlang");

  const students5Bestari = [
    "Ahmad Faiz bin Abdullah", "Siti Nurhaliza binti Ramli", "Muhammad Danish bin Hafiz",
    "Nurul Alya binti Zulkifli", "Haziq Mirza bin Idris", "Aina Sofea binti Yusof",
    "Irfan Hakimi bin Shahrul", "Damia Qaisara binti Azman", "Hariz Iskandar bin Rizal",
    "Balqis Humaira binti Fikri", "Adam Mikhail bin Roslan", "Zara Aleesya binti Khalid",
    "Rayyan Ashraf bin Nasir", "Maisarah Husna binti Hilmi", "Danial Haikal bin Syafiq",
  ];
  const students5Cemerlang = [
    "Khairul Amin bin Osman", "Nadia Batrisyia binti Redzuan", "Izzat Haziq bin Fauzi",
    "Shafiqah Amani binti Kamal", "Amirul Asyraf bin Zainal", "Fatin Najihah binti Azhar",
    "Aqil Zhafran bin Ismail", "Hanis Syuhada binti Norazman", "Luqman Hakim bin Ghazali",
    "Sofea Adriana binti Saiful",
  ];

  for (const name of students5Bestari) {
    await db.collection("students").insertOne({
      name, sex: Math.random() > 0.5 ? "L" : "P",
      classId: class1Result.insertedId.toString(), qrCode: uuidv4(),
      isActive: true, createdAt: now, updatedAt: now,
    });
  }
  for (const name of students5Cemerlang) {
    await db.collection("students").insertOne({
      name, sex: Math.random() > 0.5 ? "L" : "P",
      classId: class2Result.insertedId.toString(), qrCode: uuidv4(),
      isActive: true, createdAt: now, updatedAt: now,
    });
  }

  console.log(`Murid: ${students5Bestari.length} in 5 Bestari, ${students5Cemerlang.length} in 5 Cemerlang`);
  console.log("\nSeed complete! Login with:");
  console.log("  Pentadbir (dual-role): admin / admin123");
  console.log("  Guru Kelas: guru1 / guru123");
  console.log("  Guru Biasa: guru3 / guru123");

  await client.close();
}

seed().catch(e => { console.error("Seed failed:", e); process.exit(1); });