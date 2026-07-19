/**
 * Centralised role-based permission helpers.
 * Single source of truth — used by both API routes and UI components.
 */

import type { Role, SessionPayload } from "@/lib/db/types";

//------------------------------------------------------------------------------
// What each role can do (defined once, shared everywhere)
//------------------------------------------------------------------------------

export const PERMISSIONS = {
  manageUsers: ["pentadbir"] as Role[],
  manageClasses: ["pentadbir"] as Role[],
  manageAllStudents: ["pentadbir"] as Role[],
  manageOwnClassStudents: ["pentadbir", "guru_kelas"] as Role[],
  takeAttendance: ["pentadbir", "guru_kelas"] as Role[],
  generateQR: ["pentadbir", "guru_kelas"] as Role[],
  viewAttendance: ["pentadbir", "guru_kelas", "guru_biasa"] as Role[],
  viewReports: ["pentadbir", "guru_kelas", "guru_biasa"] as Role[],
  viewDashboard: ["pentadbir", "guru_kelas", "guru_biasa"] as Role[],
  manageSettings: ["pentadbir"] as Role[],
} as const;

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

export function hasRole(
  session: SessionPayload | null,
  ...roles: Role[]
): boolean {
  if (!session) return false;
  return roles.includes(session.role);
}

export function canManageClass(
  session: SessionPayload | null,
  classId: string | null | undefined
): boolean {
  if (!session || !classId) return false;
  if (session.role === "pentadbir") return true;
  if (session.role === "guru_kelas") return session.classId === classId;
  return false;
}

export function canManageStudent(
  session: SessionPayload | null,
  studentClassId: string | null | undefined
): boolean {
  if (!session) return false;
  if (session.role === "pentadbir") return true;
  if (session.role === "guru_kelas" && studentClassId) {
    return session.classId === studentClassId;
  }
  return false;
}

/**
 * Returns the class IDs a session is authorised to view.
 * - pentadbir: null means "all classes"
 * - guru_kelas: returns their single classId
 * - guru_biasa: null means "all classes" (they can view all, just not write)
 */
export function getViewableClassIds(
  session: SessionPayload | null
): string[] | null {
  if (!session) return [];
  if (session.role === "guru_kelas") {
    return session.classId ? [session.classId] : [];
  }
  // pentadbir and guru_biasa can view all
  return null;
}

/** Get the list of roles the current session can assign to new users */
export function getAssignableRoles(session: SessionPayload | null): Role[] {
  if (!session) return [];
  if (session.role === "pentadbir") return ["pentadbir", "guru_kelas", "guru_biasa"];
  return [];
}

/** Navigation items visible to a given role */
export interface NavItem {
  href: string;
  labelKey: keyof typeof import("@/lib/strings/ms").MS.nav;
  icon: string; // lucide icon name
}

export function getNavItems(role: Role | null): NavItem[] {
  if (!role) return [];
  const items: NavItem[] = [];

  items.push({ href: "/dashboard", labelKey: "dashboard", icon: "LayoutDashboard" });
  items.push({ href: "/laporan", labelKey: "reports", icon: "FileText" });

  if (role === "pentadbir" || role === "guru_kelas") {
    items.push({ href: "/kehadiran", labelKey: "attendance", icon: "CheckSquare" });
  }

  if (role === "pentadbir") {
    items.push({ href: "/pengguna", labelKey: "users", icon: "Users" });
    items.push({ href: "/kelas", labelKey: "classes", icon: "GraduationCap" });
    items.push({ href: "/murid", labelKey: "students", icon: "UserRound" });
    items.push({ href: "/qr", labelKey: "qrCodes", icon: "QrCode" });
  }

  if (role === "guru_kelas") {
    items.push({ href: "/murid", labelKey: "students", icon: "UserRound" });
    items.push({ href: "/qr", labelKey: "qrCodes", icon: "QrCode" });
  }

  items.push({ href: "/profil", labelKey: "profile", icon: "UserCircle" });

  return items;
}