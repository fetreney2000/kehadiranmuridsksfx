/**
 * MongoDB collection document types for the attendance system.
 *
 * ATTENDANCE STRATEGY:
 * We only write attendance records for students marked "hadir" (present).
 * Absent students = class roster minus those with a "hadir" record for that date.
 * This minimises writes to the free M0 tier.
 */

export type Role = "pentadbir" | "guru_kelas" | "guru_biasa";

export type Sex = "L" | "P";

export type AttendanceStatus = "hadir" | "tidak_hadir";

export type AttendanceMethod = "qr" | "toggle";

export interface User {
  _id: string;
  username: string;
  passwordHash: string;
  role: Role;
  fullName: string;
  classId: string | null; // only for guru_kelas
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Class {
  _id: string;
  name: string;
  guruKelasId: string | null; // ref to users
  createdAt: Date;
  updatedAt: Date;
}

export interface Student {
  _id: string;
  name: string;
  sex: Sex;
  classId: string; // ref to classes
  qrCode: string; // unique UUID — the payload encoded in the QR
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Attendance {
  _id: string;
  studentId: string; // ref to students
  classId: string; // denormalised for fast aggregation
  date: string; // YYYY-MM-DD in Asia/Kuala_Lumpur
  status: AttendanceStatus;
  method: AttendanceMethod;
  recordedBy: string; // userId
  recordedAt: Date;
}

/** Session payload stored in the JWT cookie */
export interface SessionPayload {
  userId: string;
  username: string;
  fullName: string;
  role: Role;
  classId: string | null;
}

/** Safe user object returned to the client (no password hash) */
export interface SafeUser {
  _id: string;
  username: string;
  role: Role;
  fullName: string;
  classId: string | null;
  isActive: boolean;
  createdAt: string;
}