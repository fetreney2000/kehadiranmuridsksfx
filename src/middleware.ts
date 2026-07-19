/**
 * Next.js middleware for route protection.
 * Redirects unauthenticated users to login; enforces role access.
 * Uses jose directly (edge-compatible, no Node.js crypto).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import type { SessionPayload } from "@/lib/db/types";

const AUTH_SECRET = process.env.AUTH_SECRET || "fallback-insecure";
const secret = new TextEncoder().encode(AUTH_SECRET);
const COOKIE_NAME = "km-token";

// Pages that require no authentication
const PUBLIC_PATHS = ["/login"];

// Static assets and API routes that should bypass middleware
const BYPASS_PREFIXES = [
  "/_next",
  "/favicon.ico",
  "/icons",
  "/manifest.json",
  "/sw.js",
  "/api/auth",
];

async function getSessionFromRequest(
  request: NextRequest
): Promise<SessionPayload | null> {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bypass static assets and auth API
  if (BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const session = await getSessionFromRequest(request);

  // Redirect unauthenticated users to login
  if (!session) {
    if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
      return NextResponse.next();
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from login
  if (pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Role-based route protection
  // /pengguna — pentadbir only
  if (pathname.startsWith("/pengguna") && session.role !== "pentadbir") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // /kelas — pentadbir only
  if (pathname.startsWith("/kelas") && session.role !== "pentadbir") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // /kehadiran — pentadbir, guru_kelas
  if (
    pathname.startsWith("/kehadiran") &&
    !["pentadbir", "guru_kelas"].includes(session.role)
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // /murid — pentadbir, guru_kelas
  if (
    pathname.startsWith("/murid") &&
    !["pentadbir", "guru_kelas"].includes(session.role)
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // /qr — pentadbir, guru_kelas
  if (
    pathname.startsWith("/qr") &&
    !["pentadbir", "guru_kelas"].includes(session.role)
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and images
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json).*)",
  ],
};