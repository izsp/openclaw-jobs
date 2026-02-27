/**
 * MongoDB connection singleton.
 * Uses globalThis to survive HMR in development.
 * In serverless (Cloudflare Workers), each isolate gets its own connection.
 */
import { MongoClient, type Db } from "mongodb";

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

/**
 * Returns a connected MongoClient instance.
 * Uses globalThis to cache across HMR reloads in development.
 * Connection options: 10-connection pool, 5s connect timeout, 10s socket timeout.
 *
 * @throws Error if MONGODB_URI is not set
 */
export async function getMongoClient(): Promise<MongoClient> {
  if (globalForMongo._mongoClient) {
    return globalForMongo._mongoClient;
  }

  // Prevent concurrent connection attempts
  if (!globalForMongo._mongoClientPromise) {
    const client = new MongoClient(getMongoUri(), {
      maxPoolSize: 10,
      // WHY: minPoolSize=0 for serverless — connections can't persist across requests
      minPoolSize: 0,
      // WHY: 15s timeouts for Cloudflare Workers — cold starts involve DNS SRV
      // lookup + TCP + TLS handshake which can exceed 5s from edge locations
      connectTimeoutMS: 15_000,
      socketTimeoutMS: 15_000,
      serverSelectionTimeoutMS: 15_000,
    });
    globalForMongo._mongoClientPromise = client.connect().then(() => {
      globalForMongo._mongoClient = client;
      return client;
    });
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
