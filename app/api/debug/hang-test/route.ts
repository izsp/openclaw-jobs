/**
 * GET /api/debug/hang-test — Isolate the hang trigger.
 * Tests different combinations of auth + async to find what hangs.
 * Use ?step=1..5 to test individual steps.
 * TODO: Remove before production launch.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const step = url.searchParams.get("step") ?? "0";
  const result: Record<string, unknown> = { step, url: request.url.slice(0, 50) };
  const start = Date.now();

  try {
    if (step === "0") {
      // Step 0: Absolutely minimal — just return
      result.msg = "no-op";
    } else if (step === "1") {
      // Step 1: getToken only
      const { getToken } = await import("next-auth/jwt");
      const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
      const secureCookie = request.url.startsWith("https://");
      const token = await getToken({ req: request, secret, secureCookie });
      result.token = token ? "ok" : "null";
      result.userId = token?.userId ?? null;
    } else if (step === "2") {
      // Step 2: MongoDB via CACHED getDb (standard path)
      const { getDb } = await import("@/lib/db");
      const db = await getDb();
      result.db = "connected (cached)";
      const count = await db.collection("users").countDocuments();
      result.user_count = count;
    } else if (step === "3") {
      // Step 3: getToken THEN MongoDB (serial)
      const { getToken } = await import("next-auth/jwt");
      const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
      const secureCookie = request.url.startsWith("https://");
      const token = await getToken({ req: request, secret, secureCookie });
      result.token = token ? "ok" : "null";

      const { getDb } = await import("@/lib/db");
      const db = await getDb();
      result.db = "connected";
      const count = await db.collection("users").countDocuments();
      result.user_count = count;
    } else if (step === "6") {
      // Step 6: MongoDB via FRESH client (bypass cache)
      const { MongoClient } = await import("mongodb");
      const uri = process.env.MONGODB_URI ?? "";
      result.uri_set = uri.length > 0;
      const client = new MongoClient(uri, {
        maxPoolSize: 1,
        minPoolSize: 0,
        connectTimeoutMS: 15000,
        socketTimeoutMS: 15000,
        serverSelectionTimeoutMS: 15000,
      });
      await client.connect();
      result.db = "connected (fresh)";
      const db = client.db();
      const count = await db.collection("users").countDocuments();
      result.user_count = count;
      await client.close();
      result.closed = true;
    } else if (step === "7") {
      // Step 7: getDb but close after use — test connection reuse issue
      const { getDb, getMongoClient } = await import("@/lib/db");
      const db = await getDb();
      result.db = "connected";
      const count = await db.collection("users").countDocuments();
      result.user_count = count;
      // Force-close the client so next request gets fresh connection
      const client = await getMongoClient();
      await client.close();
      result.force_closed = true;
    } else if (step === "4") {
      // Step 4: setTimeout (2s) — test if async timers work
      await new Promise((resolve) => setTimeout(resolve, 2000));
      result.msg = "timer-ok";
    } else if (step === "5") {
      // Step 5: getToken THEN setTimeout — does auth break timers?
      const { getToken } = await import("next-auth/jwt");
      const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
      const secureCookie = request.url.startsWith("https://");
      const token = await getToken({ req: request, secret, secureCookie });
      result.token = token ? "ok" : "null";

      await new Promise((resolve) => setTimeout(resolve, 1000));
      result.msg = "timer-after-auth-ok";
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
    result.stack = err instanceof Error ? err.stack?.split("\n").slice(0, 3) : undefined;
  }

  result.duration_ms = Date.now() - start;
  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
