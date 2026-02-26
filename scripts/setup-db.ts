/**
 * Database setup script.
 * Creates collections, indexes, and seeds platform_config defaults.
 *
 * Usage: MONGODB_URI=... npx tsx scripts/setup-db.ts [--seed] [--drop]
 *   --seed  Seed platform_config with default values (upsert, safe to re-run)
 *   --drop  Drop all collections first (DESTRUCTIVE — dev only)
 */
import { MongoClient } from "mongodb";
import { COLLECTIONS } from "../lib/constants";
import type { PlatformConfigDocument } from "../lib/types/config.types";
import { COLLECTION_INDEXES } from "./db/indexes";
import { ALL_SEED_CONFIGS } from "./db/seed-config";

const COLLECTION_NAMES = Object.values(COLLECTIONS);

async function run(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI environment variable is not set.");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const shouldSeed = args.includes("--seed");
  const shouldDrop = args.includes("--drop");

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    console.log(`Connected to database: ${db.databaseName}`);

    if (shouldDrop) {
      console.log("\n--- Dropping existing collections ---");
      await dropCollections(db);
    }

    console.log("\n--- Creating collections ---");
    await createCollections(db);

    console.log("\n--- Creating indexes ---");
    await createIndexes(db);

    if (shouldSeed) {
      console.log("\n--- Seeding platform_config ---");
      await seedPlatformConfig(db);
    }

    console.log("\nSetup complete.");
  } finally {
    await client.close();
  }
}

async function dropCollections(db: ReturnType<MongoClient["db"]>): Promise<void> {
  const existing = (await db.listCollections().toArray()).map((c) => c.name);
  for (const name of COLLECTION_NAMES) {
    if (existing.includes(name)) {
      await db.dropCollection(name);
      console.log(`  Dropped: ${name}`);
    }
  }
}

async function createCollections(db: ReturnType<MongoClient["db"]>): Promise<void> {
  const existing = (await db.listCollections().toArray()).map((c) => c.name);
  for (const name of COLLECTION_NAMES) {
    if (existing.includes(name)) {
      console.log(`  Exists:  ${name}`);
    } else {
      await db.createCollection(name);
      console.log(`  Created: ${name}`);
    }
  }
}

async function createIndexes(db: ReturnType<MongoClient["db"]>): Promise<void> {
  for (const [collectionName, indexes] of Object.entries(COLLECTION_INDEXES)) {
    const collection = db.collection(collectionName);
    for (const indexDef of indexes) {
      const name = await collection.createIndex(indexDef.key, indexDef.options);
      console.log(`  ${collectionName}: ${name}`);
    }
  }
}

async function seedPlatformConfig(db: ReturnType<MongoClient["db"]>): Promise<void> {
  const collection = db.collection<PlatformConfigDocument>(COLLECTIONS.PLATFORM_CONFIG);
  for (const config of ALL_SEED_CONFIGS) {
    const result = await collection.updateOne(
      { _id: config._id as PlatformConfigDocument["_id"] },
      { $setOnInsert: config },
      { upsert: true },
    );
    const action = result.upsertedCount > 0 ? "Inserted" : "Exists";
    console.log(`  ${action}: ${config._id}`);
  }
}

run().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
