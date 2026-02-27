/**
 * MongoDB connection singleton with retry logic.
 * Uses globalThis to survive HMR in development.
 * In serverless (Cloudflare Workers), each isolate gets its own connection.
 *
 * WHY retry: Cloudflare Workers cold starts involve DNS SRV lookup + TCP + TLS
 * handshake from edge locations. First attempt can timeout, but retry usually
 * succeeds because DNS is cached. Without retry-on-failure, a rejected promise
 * stays cached forever and all subsequent requests fail.
 */
import { MongoClient, type Db } from "mongodb";

/** Max connection attempts before giving up. */
const MAX_RETRIES = 2;

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }
  return uri;
}

// WHY: globalThis survives Next.js HMR reloads in development.
// Module-level `let` is re-initialized on each reload, causing connection leaks.
const globalForMongo = globalThis as unknown as {
  _mongoClient?: MongoClient;
  _mongoClientPromise?: Promise<MongoClient>;
};

function createClient(): MongoClient {
  return new MongoClient(getMongoUri(), {
    // WHY: maxPoolSize=1 for Cloudflare Workers — each isolate handles one
    // request at a time, so a larger pool wastes resources and may cause issues.
    maxPoolSize: 1,
    minPoolSize: 0,
    // WHY: 15s timeouts for Cloudflare Workers — cold starts involve DNS SRV
    // lookup + TCP + TLS handshake which can exceed 5s from edge locations.
    connectTimeoutMS: 15_000,
    socketTimeoutMS: 15_000,
    serverSelectionTimeoutMS: 15_000,
  });
}

/**
 * Attempts to connect to MongoDB with retry.
 * On failure, resets the cached promise so the next call retries.
 */
async function connectWithRetry(): Promise<MongoClient> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const client = createClient();
      await client.connect();
      globalForMongo._mongoClient = client;
      return client;
    } catch (err) {
      lastError = err;
      console.error(
        `[db] MongoDB connect attempt ${attempt}/${MAX_RETRIES} failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
  // All retries exhausted — clear cached promise so future calls retry
  globalForMongo._mongoClientPromise = undefined;
  throw lastError;
}

/**
 * Returns a connected MongoClient instance.
 * Uses globalThis to cache across HMR reloads in development.
 * Retries once on cold-start connection failure.
 *
 * @throws Error if MONGODB_URI is not set or connection fails after retries
 */
export async function getMongoClient(): Promise<MongoClient> {
  if (globalForMongo._mongoClient) {
    return globalForMongo._mongoClient;
  }

  // Prevent concurrent connection attempts
  if (!globalForMongo._mongoClientPromise) {
    globalForMongo._mongoClientPromise = connectWithRetry();
  }

  return globalForMongo._mongoClientPromise;
}

/**
 * Returns the default database instance.
 * Database name is derived from the connection URI.
 */
export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db();
}
