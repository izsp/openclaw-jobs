/**
 * GET /api/work/protocol — Redirects to /skill.md (new canonical location).
 */
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = new URL("/skill.md", request.url);
  return NextResponse.redirect(url, 301);
}
