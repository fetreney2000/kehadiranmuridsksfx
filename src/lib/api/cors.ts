/**
 * CORS helpers for the public API (/api/v1/*).
 * Allows cross-origin requests from any origin (configurable via ALLOWED_ORIGINS).
 */

import { NextResponse } from "next/server";

const DEFAULT_ORIGIN = "*";

function getAllowedOrigin(request: Request): string {
  const origins = process.env.ALLOWED_ORIGINS || DEFAULT_ORIGIN;
  if (origins === "*") return "*";
  const allowed = origins.split(",").map((o) => o.trim());
  const origin = request.headers.get("origin") || "";
  return allowed.includes(origin) ? origin : "null";
}

const CORS_HEADERS = {
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept",
  "Access-Control-Max-Age": "86400",
};

export function addCorsHeaders(
  request: Request,
  response: NextResponse,
): NextResponse {
  const origin = getAllowedOrigin(request);
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Vary", "Origin");
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export function handleOptions(request: Request): NextResponse {
  const origin = getAllowedOrigin(request);
  return NextResponse.json(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      Vary: "Origin",
      ...CORS_HEADERS,
    },
  });
}
