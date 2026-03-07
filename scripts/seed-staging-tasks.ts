/**
 * Seeds realistic pending tasks on staging for end-to-end worker testing.
 * Creates a test buyer with balance + 6 diverse pending tasks.
 *
 * Usage: MONGODB_URI=<uri> npx tsx scripts/seed-staging-tasks.ts
 * Or:    source .env.local && npx tsx scripts/seed-staging-tasks.ts
 */
import { MongoClient } from "mongodb";
import { nanoid } from "nanoid";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI env var is required");
  process.exit(1);
}

const BUYER_ID = "usr_e2e_buyer";

const TASKS = [
  {
    type: "chat",
    price_cents: 2,
    timeout: 120,
    messages: [
      {
        role: "user",
        content:
          "What are the key differences between TCP and UDP? " +
          "Give a concise comparison table and explain when to use each.",
      },
    ],
  },
  {
    type: "code",
    price_cents: 5,
    timeout: 300,
    messages: [
      {
        role: "user",
        content:
          "Write a TypeScript function `debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T` " +
          "that delays invoking `fn` until after `ms` milliseconds of inactivity. " +
          "Include JSDoc and a usage example.",
      },
    ],
  },
  {
    type: "research",
    price_cents: 10,
    timeout: 600,
    messages: [
      {
        role: "user",
        content:
          "Summarize the current state of WebAssembly (Wasm) adoption in 2025-2026. " +
          "Cover: browser support, server-side usage (WASI), popular languages targeting Wasm, " +
          "and 3 notable real-world production use cases. Keep it under 800 words.",
      },
    ],
  },
  {
    type: "analyze",
    price_cents: 5,
    timeout: 300,
    messages: [
      {
        role: "user",
        content:
          "Analyze this MongoDB query pattern and suggest optimizations:\n\n" +
          "```javascript\n" +
          "db.orders.find({\n" +
          '  status: "active",\n' +
          "  created_at: { $gte: ISODate('2025-01-01') },\n" +
          '  "customer.region": "US"\n' +
          "}).sort({ total_amount: -1 }).limit(50)\n" +
          "```\n\n" +
          "Include: recommended indexes, explain plan analysis, and potential pitfalls.",
      },
    ],
  },
  {
    type: "chat",
    price_cents: 2,
    timeout: 120,
    messages: [
      {
        role: "user",
        content:
          "Explain the CAP theorem in distributed systems. " +
          "Use a real-world analogy (like a restaurant or bank) to make it intuitive. " +
          "Then give one example system for each of CP, AP, and CA.",
      },
    ],
  },
  {
    type: "code",
    price_cents: 5,
    timeout: 300,
    messages: [
      {
        role: "user",
        content:
          "Write a Python function that implements binary search on a sorted list. " +
          "Handle edge cases (empty list, single element, target not found). " +
          "Include type hints, docstring, and 5 test cases using assert statements.",
      },
    ],
  },
];

async function seed() {
  const client = new MongoClient(MONGODB_URI!);
  await client.connect();
  const db = client.db();
  console.log("Connected to MongoDB\n");

  const now = new Date();

  // 1. Ensure test buyer exists with balance
  await db.collection("user").updateOne(
    { _id: BUYER_ID },
    {
      $setOnInsert: {
        email: "e2e-buyer@openclaw.test",
        auth_provider: "cognito",
        auth_id: "cog_e2e_buyer",
        role: "buyer",
        created_at: now,
      },
    },
    { upsert: true },
  );

  await db.collection("balance").updateOne(
    { _id: BUYER_ID },
    {
      $setOnInsert: {
        amount_cents: 10000,
        frozen_cents: 0,
        total_deposited: 10000,
        total_earned: 0,
        total_withdrawn: 0,
      },
    },
    { upsert: true },
  );
  console.log("Buyer ready: usr_e2e_buyer (100.00 USD balance)");

  // 2. Clean old seeded tasks
  const deleted = await db
    .collection("task")
    .deleteMany({ buyer_id: BUYER_ID, status: "pending" });
  if (deleted.deletedCount > 0) {
    console.log(`Cleaned ${deleted.deletedCount} old pending tasks`);
  }

  // 3. Insert pending tasks
  const docs = TASKS.map((t) => {
    const taskId = `task_${nanoid()}`;
    // WHY: Use 24h deadline so tasks don't expire before a worker connects.
    const deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return {
      _id: taskId,
      buyer_id: BUYER_ID,
      type: t.type,
      input: { messages: t.messages, context: {} },
      input_preview: { summary: t.messages[0]!.content.slice(0, 80) },
      sensitive: false,
      constraints: { timeout_seconds: t.timeout, min_output_length: 0 },
      price_cents: t.price_cents,
      status: "pending",
      assigned_worker_id: null,
      worker_id: null,
      assigned_at: null,
      deadline,
      output: null,
      completed_at: null,
      purge_at: null,
      created_at: now,
      _internal: {
        is_qa: false,
        qa_type: null,
        original_task_id: null,
        expected_output: null,
        qa_result: null,
        funded_by: "buyer",
      },
    };
  });

  await db.collection("task").insertMany(docs);
  console.log(`\nInserted ${docs.length} pending tasks:\n`);

  for (const d of docs) {
    const preview = d.input.messages[0]!.content.slice(0, 60);
    console.log(
      `  ${d.type.padEnd(10)} ${d.price_cents}c  ${d._id}  "${preview}..."`,
    );
  }

  // 4. Summary
  const pendingCount = await db
    .collection("task")
    .countDocuments({ status: "pending" });
  console.log(`\nTotal pending tasks in DB: ${pendingCount}`);

  await client.close();
  console.log("\nDone!");
}

seed().catch(console.error);
