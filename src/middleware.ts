import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import type { SessionPayload } from "@/lib/db/types";

const AUTH_SECRET = process.env.AUTH_SECRET || "fallback-insecure";
const secret = new TextEncoder().encode(AUTH_SECRET);
const COOKIE_NAME = "km-token";

const PUBLIC_PATHS = ["/login"];
const BYPASS_PREFIXES = ["/_next", "/favicon.ico", "/icons", "/manifest.json", "/sw.js", "/api/auth", "/api/v1"];

async function getSessionFromRequest(request: NextRequest): Promise<SessionPayload | null> {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch { return null; }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const session = await getSessionFromRequest(request);
  if (!session) {
    if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/login")) return NextResponse.redirect(new URL("/dashboard", request.url));

  // Use roles array (dual-role support)
  const roles: string[] = session.roles || [session.role];

  // /pengguna — pentadbir only
  if (pathname.startsWith("/pengguna") && !roles.includes("pentadbir")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  // /kelas — pentadbir only
  if (pathname.startsWith("/kelas") && !pathname.startsWith("/kelas-saya") && !roles.includes("pentadbir")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  // /kelas-saya — guru_kelas only
  if (pathname.startsWith("/kelas-saya") && !roles.includes("guru_kelas")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  // /kehadiran — pentadbir or guru_kelas
  if (pathname.startsWith("/kehadiran") && !(roles.includes("pentadbir") || roles.includes("guru_kelas"))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  // /murid — pentadbir or guru_kelas
  if (pathname.startsWith("/murid") && !(roles.includes("pentadbir") || roles.includes("guru_kelas"))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  // /qr — pentadbir or guru_kelas
  if (pathname.startsWith("/qr") && !(roles.includes("pentadbir") || roles.includes("guru_kelas"))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json).*)"],
};