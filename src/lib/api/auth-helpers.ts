/**
 * Shared auth helpers for API routes.
 * Verifies session and optionally enforces role.
 */

import { getSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/permissions";
import { NextResponse } from "next/server";
import type { SessionPayload, Role } from "@/lib/db/types";

export async function requireAuth(): Promise<SessionPayload | NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session;
}

export async function requireRole(
  ...roles: Role[]
): Promise<SessionPayload | NextResponse> {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  if (!hasRole(auth, ...roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return auth;
}