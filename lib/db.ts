/**
 * MongoDB connection management.
 *
 * Uses a cached MongoClient via globalThis to maintain a persistent connection
 * pool across requests. This is the standard Node.js pattern — the pool handles
 * connection reuse automatically (~2-20ms per query).
 *
 * In development, the globalThis cache also prevents connection leaks during HMR.
 */
import { MongoClient, type Db } from "mongodb";

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }
  return uri;
}

/** Connection pool settings. */
const CONNECTION_OPTIONS = {
  maxPoolSize: 10,
  minPoolSize: 1,
  connectTimeoutMS: 10_000,
  socketTimeoutMS: 30_000,
  serverSelectionTimeoutMS: 10_000,
} as const;

// ─── Cached client via globalThis ───

const globalForMongo = globalThis as unknown as {
  _mongoClient?: MongoClient;
  _mongoClientPromise?: Promise<MongoClient>;
};

async function getCachedClient(): Promise<MongoClient> {
  if (globalForMongo._mongoClient) {
    return globalForMongo._mongoClient;
  }
  if (!globalForMongo._mongoClientPromise) {
    const client = new MongoClient(getMongoUri(), CONNECTION_OPTIONS);
    globalForMongo._mongoClientPromise = client.connect().then(() => {
      globalForMongo._mongoClient = client;
      return client;
    });
    // WHY: If connect() fails (e.g. DNS timeout), clear the cached promise
    // so the next call retries instead of returning the rejected promise forever.
    globalForMongo._mongoClientPromise.catch(() => {
      globalForMongo._mongoClientPromise = undefined;
    });
  }
  return globalForMongo._mongoClientPromise;
}

// ─── Public API ───

/**
 * Returns a connected MongoClient instance from the connection pool.
 * The client is cached — multiple calls return the same instance.
 */
export async function getMongoClient(): Promise<MongoClient> {
  return getCachedClient();
}

/**
 * Returns the default database instance.
 * Uses the cached connection pool for fast queries (~2-20ms).
 */
export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db();
}

/**
 * Executes a callback with a database connection.
 * Shares the cached connection pool — no per-call overhead.
 *
 * @example
 * const result = await withDb(async (db) => {
 *   const config = await db.collection("platform_config").findOne({ _id: "rate_limits" });
 *   const balance = await db.collection("balances").findOne({ _id: userId });
 *   return { config, balance };
 * });
 */
export async function withDb<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  const client = await getMongoClient();
  return fn(client.db());
}
