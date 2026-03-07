/**
 * GET /skill/version — Returns the current worker protocol version.
 * Agents should periodically check this to know when to re-fetch /skill.md.
 */
import { NextResponse } from "next/server";
import { WORKER_PROTOCOL_VERSION } from "@/lib/constants";

export async function GET() {
  return NextResponse.json({
    version: WORKER_PROTOCOL_VERSION,
    updated_at: "2026-03-05",
  });
}
