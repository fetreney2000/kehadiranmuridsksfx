/**
 * API key authentication for external apps (/api/v1/*).
 * Keys are stored in the API_KEYS environment variable (comma-separated).
 * Clients send: Authorization: Bearer <api-key>
 */

import { NextResponse } from "next/server";

const WWW_AUTHENTICATE = 'Bearer realm="kehadiranmurid", charset="UTF-8"';

function getValidKeys(): Set<string> {
  const raw = process.env.API_KEYS || "";
  return new Set(
    raw
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean),
  );
}

export function requireApiKey(
  request: Request,
): NextResponse | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json(
      { error: "Unauthorized. Provide an API key via Authorization: Bearer <key>" },
      { status: 401, headers: { "WWW-Authenticate": WWW_AUTHENTICATE } },
    );
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return NextResponse.json(
      { error: "Invalid authorization format. Use: Authorization: Bearer <key>" },
      { status: 401, headers: { "WWW-Authenticate": WWW_AUTHENTICATE } },
    );
  }

  const validKeys = getValidKeys();
  if (!validKeys.has(token)) {
    return NextResponse.json(
      { error: "Forbidden. Invalid API key." },
      { status: 403 },
    );
  }

  return null; // auth OK
}
