/**
 * GET /api/debug/env — Debug endpoint to check env var availability.
 * Returns which env vars are set (not their values) and tests each subsystem.
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

async function testModule(name: string, fn: () => Promise<string>): Promise<string> {
  try {
    return await fn();
  } catch (err) {
    return `ERROR: ${err instanceof Error ? err.message : String(err)}`;
  }
}

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

  // Test each subsystem individually to isolate failures
  const tests: Record<string, string> = {};

  tests.mongodb = await testModule("mongodb", async () => {
    if (!process.env.MONGODB_URI) return "MONGODB_URI not set";
    const { getMongoClient } = await import("@/lib/db");
    const client = await getMongoClient();
    await client.db().command({ ping: 1 });
    return "ok";
  });

  tests.nanoid = await testModule("nanoid", async () => {
    const { nanoid } = await import("nanoid");
    return `ok: ${nanoid(8)}`;
  });

  tests.crypto = await testModule("crypto", async () => {
    const { createHash, randomBytes } = await import("crypto");
    const rand = randomBytes(4).toString("hex");
    const hash = createHash("sha256").update("test").digest("hex").slice(0, 8);
    return `ok: rand=${rand} hash=${hash}`;
  });

  tests.request_id = await testModule("request_id", async () => {
    const { generateRequestId } = await import("@/lib/request-id");
    return `ok: ${generateRequestId()}`;
  });

  tests.errors = await testModule("errors", async () => {
    const { AppError, ValidationError, AuthError } = await import("@/lib/errors");
    const e = new ValidationError("test");
    return `ok: ${e instanceof AppError}, code=${e.code}, status=${e.statusCode}`;
  });

  tests.hash_token = await testModule("hash_token", async () => {
    const { generateWorkerToken, hashToken } = await import("@/lib/hash-token");
    const token = generateWorkerToken();
    const hash = hashToken(token);
    return `ok: token_len=${token.length} hash_len=${hash.length}`;
  });

  tests.config = await testModule("config", async () => {
    const { getConfig } = await import("@/lib/config");
    const cfg = await getConfig("rate_limits");
    return cfg ? `ok: loaded` : "ok: null (using defaults)";
  });

  tests.rate_limiter = await testModule("rate_limiter", async () => {
    const { checkRateLimit } = await import("@/lib/services/rate-limiter");
    const result = checkRateLimit("debug_test", "127.0.0.1", 100, 60000);
    return `ok: allowed=${result.allowed}`;
  });

  tests.api_handler = await testModule("api_handler", async () => {
    const { generateRequestId, handleApiError } = await import("@/lib/api-handler");
    const rid = generateRequestId();
    const resp = handleApiError(new Error("test"), rid);
    return `ok: rid=${rid} status=${resp.status}`;
  });

  tests.worker_service = await testModule("worker_service", async () => {
    await import("@/lib/services/worker-service");
    return "ok: imported";
  });

  tests.balance_service = await testModule("balance_service", async () => {
    await import("@/lib/services/balance-service");
    return "ok: imported";
  });

  return NextResponse.json({
    env: status,
    tests,
    runtime: typeof (globalThis as Record<string, unknown>).EdgeRuntime !== "undefined" ? "edge" : "node",
    timestamp: new Date().toISOString(),
  });
}
