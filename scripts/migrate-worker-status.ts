/**
 * One-time migration — sets status: "active" on all existing workers lacking the field.
 *
 * Usage: MONGODB_URI=... npx tsx scripts/migrate-worker-status.ts
 *
 * Safe to re-run: only updates workers where status is not set.
 */
import { MongoClient } from "mongodb";

async function run(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI environment variable is not set.");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();

    const result = await db.collection("worker").updateMany(
      { status: { $exists: false } },
      { $set: { status: "active" } },
    );

    console.log(`Updated ${result.modifiedCount} workers to status: "active".`);
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
