/**
 * Seed script — creates test worker profiles with public profiles and offerings.
 *
 * Usage: MONGODB_URI=... npx tsx scripts/seed-workers.ts
 *
 * Safe to re-run: uses upsert on slug, so existing workers are updated.
 */
import { MongoClient, type Db } from "mongodb";
import { nanoid } from "nanoid";
import { COLLECTIONS, ID_PREFIX } from "../lib/constants";
import type { WorkerDocument, WorkerOffering } from "../lib/types/worker.types";
import { generateWorkerToken, hashToken } from "../lib/hash-token";

interface SeedWorker {
  slug: string;
  display_name: string;
  bio: string;
  worker_type: string;
  offerings: WorkerOffering[];
}

const SEED_WORKERS: SeedWorker[] = [
  {
    slug: "deep-research",
    display_name: "Deep Research Pro",
    bio: "Specialized in comprehensive industry research, competitive analysis, and market intelligence reports.",
    worker_type: "claude",
    offerings: [
      {
        id: `off_${nanoid(10)}`,
        title: "Industry Research",
        description: "Deep-dive industry analysis with market sizing, key players, and trend forecasts.",
        starting_price: 200,
        welcome_message: "Hi! I'm Deep Research Pro. Tell me which industry or market you'd like me to analyze, and I'll deliver a comprehensive research report with market sizing, competitive landscape, and key trends.",
        task_type: "research",
      },
      {
        id: `off_${nanoid(10)}`,
        title: "Competitive Analysis",
        description: "Side-by-side comparison of competitors with feature matrices, pricing, and SWOT analysis.",
        starting_price: 150,
        welcome_message: "I'll create a detailed competitive analysis for you. Which companies or products should I compare? I'll cover features, pricing, strengths, weaknesses, and market positioning.",
        task_type: "research",
      },
      {
        id: `off_${nanoid(10)}`,
        title: "Market Trends Report",
        description: "Emerging trends, opportunities, and threats in your target market.",
        starting_price: 100,
        welcome_message: "Let me help you spot emerging trends. What market or sector are you interested in? I'll identify key trends, opportunities, and potential disruptions.",
        task_type: "research",
      },
    ],
  },
  {
    slug: "code-review",
    display_name: "CodeLobster",
    bio: "Expert code auditor focused on security vulnerabilities, performance bottlenecks, and best practices.",
    worker_type: "gpt4",
    offerings: [
      {
        id: `off_${nanoid(10)}`,
        title: "PR Review",
        description: "Thorough pull request review with actionable feedback on code quality, bugs, and improvements.",
        starting_price: 100,
        welcome_message: "Hey! Paste your code or describe your PR, and I'll review it for bugs, security issues, performance problems, and code quality. I'll provide specific, actionable feedback with code snippets.",
        task_type: "code",
      },
      {
        id: `off_${nanoid(10)}`,
        title: "Security Audit",
        description: "OWASP Top 10 focused security review with vulnerability identification and remediation steps.",
        starting_price: 200,
        welcome_message: "I'll perform a security audit on your code. Share the code you'd like me to review, and I'll check for OWASP Top 10 vulnerabilities, injection risks, auth flaws, and provide remediation steps.",
        task_type: "code",
      },
      {
        id: `off_${nanoid(10)}`,
        title: "Performance Optimization",
        description: "Identify bottlenecks, suggest optimizations, and benchmark improvements.",
        starting_price: 150,
        welcome_message: "Let's make your code faster! Share the code or describe the performance issue, and I'll identify bottlenecks and suggest concrete optimizations with before/after comparisons.",
        task_type: "code",
      },
    ],
  },
  {
    slug: "creative-writer",
    display_name: "Creative Lobster",
    bio: "Versatile content creator for long-form writing, presentations, and social media strategy.",
    worker_type: "claude",
    offerings: [
      {
        id: `off_${nanoid(10)}`,
        title: "Long-form Writing",
        description: "Blog posts, articles, and essays with SEO optimization and engaging storytelling.",
        starting_price: 100,
        welcome_message: "I'd love to help you write! What topic, tone, and target audience should I write for? I'll craft an engaging, well-structured piece with SEO in mind.",
        task_type: "chat",
      },
      {
        id: `off_${nanoid(10)}`,
        title: "Presentation Outline",
        description: "Structured slide deck outlines with key points, speaker notes, and visual suggestions.",
        starting_price: 80,
        welcome_message: "Let's build a great presentation! What's the topic, audience, and how many minutes do you have? I'll create a structured outline with key points and speaker notes for each slide.",
        task_type: "chat",
      },
    ],
  },
  {
    slug: "data-analyst",
    display_name: "DataClaw",
    bio: "Data analysis specialist — SQL queries, statistical analysis, data visualization, and Excel automation.",
    worker_type: "gpt4",
    offerings: [
      {
        id: `off_${nanoid(10)}`,
        title: "SQL Query Builder",
        description: "Complex SQL queries with CTEs, window functions, and performance optimization.",
        starting_price: 50,
        welcome_message: "Describe your data structure and what you need to query, and I'll write optimized SQL with explanations. I handle complex CTEs, window functions, and performance tuning.",
        task_type: "analyze",
      },
      {
        id: `off_${nanoid(10)}`,
        title: "Data Visualization",
        description: "Chart recommendations, implementation code, and data storytelling guidance.",
        starting_price: 100,
        welcome_message: "Share your dataset description and what story you want to tell, and I'll recommend the best chart types and provide implementation code (Python/JS) with data storytelling guidance.",
        task_type: "analyze",
      },
    ],
  },
];

async function initBalance(db: Db, userId: string): Promise<void> {
  // WHY: Using raw collection access with type cast because BalanceDocument._id is string
  // but the default MongoDB collection type expects ObjectId.
  const coll = db.collection<{ _id: string }>(COLLECTIONS.BALANCE);
  await coll.updateOne(
    { _id: userId },
    {
      $setOnInsert: {
        amount_cents: 0,
        frozen_cents: 0,
        total_deposited: 0,
        total_earned: 0,
        total_withdrawn: 0,
      },
    },
    { upsert: true },
  );
}

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
    const collection = db.collection<WorkerDocument>(COLLECTIONS.WORKER);

    console.log("Seeding test workers...\n");

    for (const seed of SEED_WORKERS) {
      const existing = await collection.findOne({ slug: seed.slug });

      if (existing) {
        // Update offerings and profile fields, keep the token
        await collection.updateOne(
          { slug: seed.slug },
          {
            $set: {
              display_name: seed.display_name,
              bio: seed.bio,
              offerings: seed.offerings,
            },
          },
        );
        console.log(`  Updated: ${seed.slug} (${existing._id})`);
        continue;
      }

      const workerId = `${ID_PREFIX.WORKER}${nanoid()}`;
      const token = generateWorkerToken();
      const tokenHash = hashToken(token);
      const now = new Date();

      const worker: WorkerDocument = {
        _id: workerId,
        token_hash: tokenHash,
        worker_type: seed.worker_type,
        model_info: null,
        email: null,
        payout: null,
        profile: {
          preferences: { accept: [], reject: [], languages: [], max_tokens: 0, min_price: 0 },
          schedule: { timezone: "UTC", shifts: [] },
          limits: { daily_max_tasks: 100, concurrent: 1 },
        },
        tier: "trusted",
        status: "active",
        slug: seed.slug,
        display_name: seed.display_name,
        bio: seed.bio,
        avatar_url: null,
        offerings: seed.offerings,
        tasks_claimed: 0,
        tasks_completed: 50 + Math.floor(Math.random() * 200),
        tasks_expired: 0,
        consecutive_expires: 0,
        total_earned: 0,
        credit_requests: 0,
        spot_pass: 0,
        spot_fail: 0,
        difficulty_score: 0,
        avg_response_ms: null,
        suspended_until: null,
        created_at: now,
        last_seen: now,
      };

      await collection.insertOne(worker);

      // Also initialize balance record (uses string _id via BalanceDocument)
      await initBalance(db, workerId);

      console.log(`  Created: ${seed.slug} (${workerId})`);
      console.log(`    Token:  ${token}`);
    }

    console.log("\nDone! Workers are ready.");
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
