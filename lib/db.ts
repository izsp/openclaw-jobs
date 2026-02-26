import { MongoClient, type Db } from "mongodb";

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }
  return uri;
}

/**
 * Global MongoClient singleton.
 * In serverless environments (Cloudflare Workers), each request may
 * create a new instance. In long-lived dev servers, this reuses the
 * connection across hot reloads via globalThis caching.
 */
let cachedClient: MongoClient | null = null;

/**
 * Returns a connected MongoClient instance.
 * Uses a module-level cache to avoid reconnecting on every request
 * during development (HMR).
 *
 * @throws Error if MONGODB_URI is not set
 */
export async function getMongoClient(): Promise<MongoClient> {
  if (cachedClient) {
    return cachedClient;
  }

  const client = new MongoClient(getMongoUri());
  await client.connect();
  cachedClient = client;

  return client;
}

/**
 * Returns the default database instance.
 * Database name is derived from the connection URI.
 */
export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db();
}
