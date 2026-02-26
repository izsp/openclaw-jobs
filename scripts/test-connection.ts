/**
 * Quick script to verify MongoDB Atlas connection.
 * Run with: npx tsx scripts/test-connection.ts
 */
import { MongoClient } from "mongodb";

async function testConnection(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set. Run with: MONGODB_URI=... npx tsx scripts/test-connection.ts");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const result = await client.db().command({ ping: 1 });
    console.log("MongoDB connection successful:", result);

    const dbName = client.db().databaseName;
    console.log("Database name:", dbName);

    const collections = await client.db().listCollections().toArray();
    console.log("Existing collections:", collections.map((c) => c.name));
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

testConnection();
