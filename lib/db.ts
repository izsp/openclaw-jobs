/**
 * MongoDB connection management for Cloudflare Workers.
 *
 * WHY fresh connections in Workers: Cloudflare Workers' hang detector tracks I/O
 * from the current request. When a MongoClient is cached in globalThis across
 * requests, its TCP sockets become untracked by the runtime's I/O scheduler. On
 * the next request, reusing the stale socket triggers hang detection ("code had
 * hung and would never generate a response").
 *
 * Solution: In Workers, create a fresh MongoClient for each getDb() call.
 * Connection cost is ~100-400ms warm (DNS cached). The 5s connect timeout ensures
 * cold-start DNS failures resolve quickly so retries succeed.
 *
 * In development, we cache via globalThis to avoid connection leaks during HMR.
 */
import { MongoClient, type Db } from "mongodb";

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }
  return uri;
}

/** Detect Cloudflare Workers environment. */
function isWorkersRuntime(): boolean {
  return (
    typeof navigator !== "undefined" &&
    navigator.userAgent === "Cloudflare-Workers"
  );
}

/** Connection options tuned for Workers cold starts. */
const WORKERS_OPTIONS = {
  maxPoolSize: 1,
  minPoolSize: 0,
  // WHY 5s: On Workers cold start, the first DNS SRV lookup may timeout while
  // Cloudflare's resolver caches it. A 5s timeout lets the first attempt fail
  // quickly so the retry succeeds with cached DNS. Total worst case: ~6s.
  connectTimeoutMS: 5_000,
  socketTimeoutMS: 10_000,
  serverSelectionTimeoutMS: 5_000,
} as const;

/** Connection options for development (more generous). */
const DEV_OPTIONS = {
  maxPoolSize: 5,
  minPoolSize: 0,
  connectTimeoutMS: 15_000,
  socketTimeoutMS: 15_000,
  serverSelectionTimeoutMS: 15_000,
} as const;

// ─── Development mode: cached client via globalThis ───

const globalForMongo = globalThis as unknown as {
  _mongoClient?: MongoClient;
  _mongoClientPromise?: Promise<MongoClient>;
};

async function getDevClient(): Promise<MongoClient> {
  if (globalForMongo._mongoClient) {
    return globalForMongo._mongoClient;
  }
  if (!globalForMongo._mongoClientPromise) {
    const client = new MongoClient(getMongoUri(), DEV_OPTIONS);
    globalForMongo._mongoClientPromise = client.connect().then(() => {
      globalForMongo._mongoClient = client;
      return client;
    });
    globalForMongo._mongoClientPromise.catch(() => {
      globalForMongo._mongoClientPromise = undefined;
    });
  }
  return globalForMongo._mongoClientPromise;
}

// ─── Workers mode: fresh client per call ───

/** Max connection retries (handles DNS cold-start failures). */
const MAX_RETRIES = 3;

async function getWorkersClient(): Promise<MongoClient> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const client = new MongoClient(getMongoUri(), WORKERS_OPTIONS);
      await client.connect();
      return client;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        console.warn(
          `[db] Workers connect attempt ${attempt}/${MAX_RETRIES} failed:`,
          err instanceof Error ? err.message : err,
        );
      }
    }
  }
  throw lastError;
}

// ─── Public API ───

/**
 * Returns a connected MongoClient instance.
 * - In Workers: fresh client (caller should close when done, or let GC handle it)
 * - In dev: cached client via globalThis
 */
export async function getMongoClient(): Promise<MongoClient> {
  if (isWorkersRuntime()) {
    return getWorkersClient();
  }
  return getDevClient();
}

/**
 * Returns the default database instance.
 * In Workers, each call creates a fresh connection (~100-400ms warm).
 * For multiple operations, prefer `withDb()` to share one connection.
 */
export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db();
}

/**
 * Executes a callback with a database connection, ensuring cleanup in Workers.
 * This is the preferred way to access MongoDB when making multiple queries in
 * a single handler, as it shares one connection for all operations.
 *
 * @example
 * const result = await withDb(async (db) => {
 *   const config = await db.collection("platform_config").findOne({ _id: "rate_limits" });
 *   const balance = await db.collection("balances").findOne({ _id: userId });
 *   return { config, balance };
 * });
 */
export async function withDb<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  if (isWorkersRuntime()) {
    const client = await getWorkersClient();
    try {
      return await fn(client.db());
    } finally {
      await client.close().catch(() => {});
    }
  }
  const client = await getDevClient();
  return fn(client.db());
}
