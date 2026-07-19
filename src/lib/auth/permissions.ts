/**
 * Centralised role-based permission helpers.
 * Dual-role system — checks `roles` array (not just primary role).
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
// Helpers — check ALL roles in the roles array
//------------------------------------------------------------------------------

/** Check if session has ANY of the given roles */
export function hasRole(
  session: SessionPayload | null,
  ...roles: Role[]
): boolean {
  if (!session) return false;
  const userRoles = session.roles || [session.role]; // fallback for old sessions
  return roles.some(r => userRoles.includes(r));
}

export function canManageClass(
  session: SessionPayload | null,
  classId: string | null | undefined
): boolean {
  if (!session || !classId) return false;
  const userRoles = session.roles || [session.role];
  if (userRoles.includes("pentadbir")) return true;
  if (userRoles.includes("guru_kelas")) return session.classId === classId;
  return false;
}

export function canManageStudent(
  session: SessionPayload | null,
  studentClassId: string | null | undefined
): boolean {
  if (!session) return false;
  const userRoles = session.roles || [session.role];
  if (userRoles.includes("pentadbir")) return true;
  if (userRoles.includes("guru_kelas") && studentClassId) {
    return session.classId === studentClassId;
  }
  return false;
}

export function getViewableClassIds(
  session: SessionPayload | null
): string[] | null {
  if (!session) return [];
  const userRoles = session.roles || [session.role];
  if (userRoles.includes("guru_kelas") && !userRoles.includes("pentadbir")) {
    return session.classId ? [session.classId] : [];
  }
  return null; // all classes
}

export function getAssignableRoles(session: SessionPayload | null): Role[] {
  if (!session) return [];
  const userRoles = session.roles || [session.role];
  if (userRoles.includes("pentadbir")) return ["pentadbir", "guru_kelas", "guru_biasa"];
  return [];
}

/** Navigation items visible to a given set of roles */
export interface NavItem {
  href: string;
  labelKey: keyof typeof import("@/lib/strings/ms").MS.nav;
  icon: string;
}

export function getNavItems(roles: Role[] | null): NavItem[] {
  if (!roles || roles.length === 0) return [];
  const items: NavItem[] = [];

  items.push({ href: "/dashboard", labelKey: "dashboard", icon: "LayoutDashboard" });
  items.push({ href: "/laporan", labelKey: "reports", icon: "FileText" });

  const canTakeAttendance =
    roles.includes("pentadbir") || roles.includes("guru_kelas");
  if (canTakeAttendance) {
    items.push({ href: "/kehadiran", labelKey: "attendance", icon: "CheckSquare" });
  }

  if (roles.includes("pentadbir")) {
    items.push({ href: "/pengguna", labelKey: "users", icon: "Users" });
    items.push({ href: "/kelas", labelKey: "classes", icon: "GraduationCap" });
    items.push({ href: "/murid", labelKey: "students", icon: "UserRound" });
    items.push({ href: "/qr", labelKey: "qrCodes", icon: "QrCode" });
  }

  if (roles.includes("guru_kelas")) {
    items.push({ href: "/kelas-saya", labelKey: "kelasSaya", icon: "GraduationCap" });
    if (!roles.includes("pentadbir")) {
      items.push({ href: "/murid", labelKey: "students", icon: "UserRound" });
      items.push({ href: "/qr", labelKey: "qrCodes", icon: "QrCode" });
    }
  }

  items.push({ href: "/profil", labelKey: "profile", icon: "UserCircle" });
  return items;
}