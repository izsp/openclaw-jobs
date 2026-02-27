/**
 * GET /api/debug/env — Debug endpoint to check env var availability.
 * Returns which env vars are set (not their values).
 * TODO: Remove before production launch.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ENV_KEYS = [
  "MONGODB_URI",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "AUTH_SECRET",
  "AUTH_TRUST_HOST",
  "COGNITO_CLIENT_ID",
  "COGNITO_CLIENT_SECRET",
  "COGNITO_ISSUER",
  "STRIPE_SECRET_KEY",
  "NODE_ENV",
];

export async function GET() {
  const status: Record<string, string> = {};
  for (const key of ENV_KEYS) {
    const val = process.env[key];
    if (!val) {
      status[key] = "NOT SET";
    } else if (val.length > 8) {
      status[key] = `SET (${val.length} chars, starts: ${val.slice(0, 4)}...)`;
    } else {
      status[key] = `SET (${val})`;
    }
  }

  return NextResponse.json({
    env: status,
    runtime: typeof globalThis.EdgeRuntime !== "undefined" ? "edge" : "node",
    timestamp: new Date().toISOString(),
  });
}
