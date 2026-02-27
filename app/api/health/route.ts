/**
 * GET /api/health — Health check endpoint.
 * Returns service status and dependency checks (MongoDB).
 * No auth required — used by load balancers and monitoring.
 */
import { NextResponse } from "next/server";
import { getMongoClient } from "@/lib/db";

export const dynamic = "force-dynamic";

const serverStartTime = Date.now();

export async function GET() {
  const checks: Record<string, { status: string; latency_ms?: number }> = {};

  // MongoDB check
  try {
    const mongoStart = Date.now();
    const client = await getMongoClient();
    await client.db().command({ ping: 1 });
    checks.mongodb = { status: "ok", latency_ms: Date.now() - mongoStart };
  } catch {
    checks.mongodb = { status: "error" };
  }

  const allHealthy = Object.values(checks).every((c) => c.status === "ok");

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      version: process.env.npm_package_version ?? "dev",
      uptime_ms: Date.now() - serverStartTime,
      checks,
    },
    { status: allHealthy ? 200 : 503 },
  );
}
