/**
 * Sets invite codes for buyer registration.
 *
 * Usage: MONGODB_URI=... npx tsx scripts/set-invite-codes.ts CODE1 CODE2 ...
 *
 * Pass no codes to disable (open registration):
 *   MONGODB_URI=... npx tsx scripts/set-invite-codes.ts
 */
import { MongoClient } from "mongodb";

async function run(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI environment variable is not set.");
    process.exit(1);
  }

  const codes = process.argv.slice(2).filter(Boolean);

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();

    const result = await db.collection<{ _id: string }>("platform_config").updateOne(
      { _id: "signup" },
      { $set: { invite_codes: codes, updated_at: new Date() } },
      { upsert: true },
    );

    if (codes.length === 0) {
      console.log("Invite codes cleared — registration is now open.");
    } else {
      console.log(`Set ${codes.length} invite code(s): ${codes.join(", ")}`);
    }
    console.log(`Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
