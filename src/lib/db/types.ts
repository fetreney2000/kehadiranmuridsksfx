/**
 * MongoDB collection document types for the attendance system.
 *
 * ATTENDANCE STRATEGY:
 * We only write attendance records for students marked "hadir" (present).
 * Absent students = class roster minus those with a "hadir" record for that date.
 * This minimises writes to the free M0 tier.
 *
 * DUAL ROLE SYSTEM:
 * Each user has a `roles` array (e.g. ["pentadbir", "guru_kelas"]).
 * The `role` field is the primary/session role — the first element.
 * Permission checks use the `roles` array for broad access, and the
 * session `role` for UI/display purposes. A user with multiple roles
 * gets the combined privileges of all their roles.
 */

export type Role = "pentadbir" | "guru_kelas" | "guru_biasa";

export type Sex = "L" | "P";

export type AttendanceStatus = "hadir" | "tidak_hadir";

export type AttendanceMethod = "qr" | "toggle";

export interface User {
  _id: string;
  username: string;
  passwordHash: string;
  role: Role;        // primary role (first in roles array)
  roles: Role[];     // all assigned roles (minimum 1)
  fullName: string;
  classId: string | null; // class assignment if guru_kelas is among roles
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Class {
  _id: string;
  name: string;
  guruKelasId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Student {
  _id: string;
  name: string;
  sex: Sex;
  classId: string;
  qrCode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Attendance {
  _id: string;
  studentId: string;
  classId: string;
  date: string;
  status: AttendanceStatus;
  method: AttendanceMethod;
  recordedBy: string;
  recordedAt: Date;
}

/** Session payload stored in the JWT cookie */
export interface SessionPayload {
  userId: string;
  username: string;
  fullName: string;
  role: Role;        // primary/session role
  roles: Role[];     // all assigned roles
  classId: string | null;
}

/** Safe user object returned to the client (no password hash) */
export interface SafeUser {
  _id: string;
  username: string;
  role: Role;
  roles: Role[];
  fullName: string;
  classId: string | null;
  isActive: boolean;
  createdAt: string;
}