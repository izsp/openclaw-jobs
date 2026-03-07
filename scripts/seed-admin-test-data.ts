/**
 * Seeds test data for admin panel UI review.
 * Creates users, balances, tasks, transactions, workers, and audit log entries.
 *
 * Usage: npx tsx scripts/seed-admin-test-data.ts
 */
/**
 * Usage: MONGODB_URI=<uri> npx tsx scripts/seed-admin-test-data.ts
 * Or: source .env.local && npx tsx scripts/seed-admin-test-data.ts
 */
import { MongoClient } from "mongodb";
import { nanoid } from "nanoid";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI env var is required");
  process.exit(1);
}

async function seed() {
  const client = new MongoClient(MONGODB_URI as string);
  await client.connect();
  const db = client.db();
  console.log("Connected to MongoDB");

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000);

  // --- Users ---
  const users = [
    { _id: "usr_alice", email: "alice@example.com", auth_provider: "cognito", auth_id: "cog_alice", role: "buyer", created_at: daysAgo(30) },
    { _id: "usr_bob", email: "bob@techcorp.com", auth_provider: "cognito", auth_id: "cog_bob", role: "buyer", created_at: daysAgo(25) },
    { _id: "usr_carol", email: "carol@startup.io", auth_provider: "cognito", auth_id: "cog_carol", role: "both", created_at: daysAgo(20) },
    { _id: "usr_dave", email: "dave@research.org", auth_provider: "cognito", auth_id: "cog_dave", role: "buyer", created_at: daysAgo(15) },
    { _id: "usr_eve", email: "eve@design.co", auth_provider: "cognito", auth_id: "cog_eve", role: "buyer", created_at: daysAgo(10) },
    { _id: "usr_frank", email: "frank@dev.net", auth_provider: "cognito", auth_id: "cog_frank", role: "seller", created_at: daysAgo(5) },
  ];
  await db.collection("user").deleteMany({ _id: { $in: users.map(u => u._id) } });
  await db.collection("user").insertMany(users);
  console.log(`Inserted ${users.length} users`);

  // --- Balances ---
  const balances = [
    { _id: "usr_alice", amount_cents: 4500, frozen_cents: 0, total_deposited: 10000, total_earned: 0, total_withdrawn: 0 },
    { _id: "usr_bob", amount_cents: 12300, frozen_cents: 0, total_deposited: 20000, total_earned: 0, total_withdrawn: 0 },
    { _id: "usr_carol", amount_cents: 800, frozen_cents: 200, total_deposited: 5000, total_earned: 1200, total_withdrawn: 500 },
    { _id: "usr_dave", amount_cents: 0, frozen_cents: 0, total_deposited: 1000, total_earned: 0, total_withdrawn: 0 },
    { _id: "usr_eve", amount_cents: 7600, frozen_cents: 0, total_deposited: 8000, total_earned: 0, total_withdrawn: 0 },
    { _id: "usr_frank", amount_cents: 3200, frozen_cents: 500, total_deposited: 0, total_earned: 5000, total_withdrawn: 1300 },
  ];
  await db.collection("balance").deleteMany({ _id: { $in: balances.map(b => b._id) } });
  await db.collection("balance").insertMany(balances);
  console.log(`Inserted ${balances.length} balances`);

  // --- Workers ---
  const workers = [
    {
      _id: "w_gpt4_bot", token_hash: "hash_test_1", worker_type: "automated",
      model_info: { provider: "openai", model: "gpt-4o", capabilities: ["chat", "code", "analyze"] },
      email: "bot1@workers.ai", payout: { method: "paypal", address: "bot1@pay.com" },
      profile: { preferences: { accept: ["chat", "code"], reject: [], languages: ["en", "zh"], max_tokens: 4096, min_price: 2 }, schedule: { timezone: "UTC", shifts: [{ name: "main", hours: [0, 24], interval: 30 }] }, limits: { daily_max_tasks: 100, concurrent: 3 } },
      tier: "trusted", status: "active", slug: "gpt4-helper", display_name: "GPT-4o Helper",
      bio: "Fast and reliable GPT-4o powered assistant", avatar_url: null,
      offerings: [{ id: "off_1", title: "Code Review", description: "Review your code", starting_price: 5, welcome_message: "Send me your code!", task_type: "code" }],
      tasks_claimed: 156, tasks_completed: 148, tasks_expired: 3, consecutive_expires: 0,
      total_earned: 12400, credit_requests: 2, spot_pass: 12, spot_fail: 1,
      difficulty_score: 0.7, avg_response_ms: 3200, suspended_until: null, created_at: daysAgo(28), last_seen: hoursAgo(1),
    },
    {
      _id: "w_claude_pro", token_hash: "hash_test_2", worker_type: "automated",
      model_info: { provider: "anthropic", model: "claude-sonnet-4-20250514", capabilities: ["chat", "code", "analyze", "research"] },
      email: "bot2@workers.ai", payout: { method: "solana", address: "5xK...abc" },
      profile: { preferences: { accept: ["chat", "research", "analyze"], reject: [], languages: ["en"], max_tokens: 8192, min_price: 3 }, schedule: { timezone: "America/New_York", shifts: [{ name: "day", hours: [8, 22], interval: 30 }] }, limits: { daily_max_tasks: 80, concurrent: 2 } },
      tier: "elite", status: "active", slug: "claude-research", display_name: "Claude Research Pro",
      bio: "Deep research and analysis powered by Claude", avatar_url: null,
      offerings: [{ id: "off_2", title: "Research Report", description: "In-depth research", starting_price: 10, welcome_message: "What topic?", task_type: "research" }],
      tasks_claimed: 234, tasks_completed: 230, tasks_expired: 1, consecutive_expires: 0,
      total_earned: 28500, credit_requests: 3, spot_pass: 18, spot_fail: 0,
      difficulty_score: 0.85, avg_response_ms: 5100, suspended_until: null, created_at: daysAgo(25), last_seen: hoursAgo(3),
    },
    {
      _id: "w_newbie", token_hash: "hash_test_3", worker_type: "automated",
      model_info: { provider: "openai", model: "gpt-3.5-turbo", capabilities: ["chat"] },
      email: null, payout: null,
      profile: { preferences: { accept: ["chat"], reject: [], languages: ["en"], max_tokens: 2048, min_price: 1 }, schedule: { timezone: "UTC", shifts: [{ name: "all", hours: [0, 24], interval: 60 }] }, limits: { daily_max_tasks: 50, concurrent: 1 } },
      tier: "new", status: "probation", slug: null, display_name: null,
      bio: null, avatar_url: null, offerings: [],
      tasks_claimed: 5, tasks_completed: 3, tasks_expired: 2, consecutive_expires: 2,
      total_earned: 150, credit_requests: 1, spot_pass: 0, spot_fail: 1,
      difficulty_score: 0.3, avg_response_ms: 8500, suspended_until: null, created_at: daysAgo(3), last_seen: hoursAgo(12),
    },
    {
      _id: "w_suspended", token_hash: "hash_test_4", worker_type: "automated",
      model_info: { provider: "openai", model: "gpt-4", capabilities: ["chat", "translate"] },
      email: "bad@workers.ai", payout: null,
      profile: { preferences: { accept: ["chat", "translate"], reject: [], languages: ["en", "es"], max_tokens: 4096, min_price: 2 }, schedule: { timezone: "UTC", shifts: [{ name: "all", hours: [0, 24], interval: 30 }] }, limits: { daily_max_tasks: 50, concurrent: 1 } },
      tier: "proven", status: "suspended", slug: "translate-bot", display_name: "TranslateBot",
      bio: "Translation service", avatar_url: null, offerings: [],
      tasks_claimed: 45, tasks_completed: 30, tasks_expired: 10, consecutive_expires: 5,
      total_earned: 2100, credit_requests: 8, spot_pass: 3, spot_fail: 4,
      difficulty_score: 0.4, avg_response_ms: 6000, suspended_until: new Date(now.getTime() + 7 * 86400000), created_at: daysAgo(20), last_seen: daysAgo(2),
    },
  ];
  const workerIds = workers.map(w => w._id);
  await db.collection("worker").deleteMany({ _id: { $in: workerIds } });
  await db.collection("worker").insertMany(workers);
  console.log(`Inserted ${workers.length} workers`);

  // --- Tasks ---
  const taskStatuses = ["pending", "assigned", "completed", "failed", "credited"];
  const taskTypes = ["chat", "code", "research", "analyze", "translate"];
  const tasks = [];
  for (let i = 0; i < 35; i++) {
    const status = taskStatuses[i % 5] as string;
    const type = taskTypes[i % 5] as string;
    const buyerId = users[i % users.length]!._id;
    const workerId = status === "pending" ? null : workers[i % workers.length]!._id;
    const isQa = i % 7 === 0;
    const qaVerdict = isQa ? (["pass", "fail", "flag"][i % 3]) : null;

    tasks.push({
      _id: `task_test_${nanoid(8)}`,
      buyer_id: buyerId,
      type,
      input: { messages: [{ role: "user", content: `Test task #${i + 1}: ${type} request from ${buyerId}` }], context: {} },
      input_preview: { summary: `${type} task #${i + 1}` },
      sensitive: false,
      constraints: { timeout_seconds: 60, min_output_length: 0 },
      price_cents: [2, 5, 10, 20, 50][i % 5]!,
      status,
      assigned_worker_id: null,
      worker_id: workerId,
      assigned_at: status !== "pending" ? hoursAgo(i + 1) : null,
      deadline: status === "assigned" ? new Date(now.getTime() + 3600000) : null,
      output: ["completed", "credited"].includes(status) ? { content: `Result for task #${i + 1}`, format: "text" } : null,
      completed_at: ["completed", "credited"].includes(status) ? hoursAgo(i) : null,
      purge_at: null,
      created_at: hoursAgo(i * 2 + 1),
      _internal: {
        is_qa: isQa,
        qa_type: isQa ? (["spot_check", "shadow", "benchmark"][i % 3]) : null,
        original_task_id: isQa ? `task_orig_${i}` : null,
        expected_output: null,
        qa_result: isQa ? { similarity: 0.85, dimensions: { accuracy: 0.9, completeness: 0.8 }, verdict: qaVerdict } : null,
        funded_by: isQa ? "platform" : "buyer",
      },
    });
  }
  await db.collection("task").deleteMany({ _id: { $regex: /^task_test_/ } });
  await db.collection("task").insertMany(tasks);
  console.log(`Inserted ${tasks.length} tasks`);

  // --- Transactions ---
  const txs = [];
  const txTypes = ["deposit", "task_pay", "task_earn", "credit", "admin_credit", "admin_debit"];
  for (let i = 0; i < 40; i++) {
    const userId = users[i % users.length]!._id;
    const type = txTypes[i % txTypes.length]!;
    const amount = type === "deposit" ? [1000, 2000, 5000][i % 3]!
      : type === "task_pay" ? -[2, 5, 10][i % 3]!
      : type === "task_earn" ? [1, 4, 8][i % 3]!
      : type === "admin_debit" ? -100
      : [2, 5, 10][i % 3]!;

    txs.push({
      _id: nanoid(),
      user_id: userId,
      type,
      amount_cents: amount,
      balance_after: Math.max(0, 5000 + amount),
      ref_id: type.startsWith("task") ? `task_test_${i}` : null,
      created_at: hoursAgo(i * 3),
    });
  }
  await db.collection("transaction").insertMany(txs);
  console.log(`Inserted ${txs.length} transactions`);

  // --- Audit Log ---
  const auditEntries = [
    { _id: nanoid(), type: "admin", action: "balance_credit", actor: "admin", target_id: "usr_alice", details: { amount_cents: 500, reason: "Compensation for failed task" }, created_at: hoursAgo(2) },
    { _id: nanoid(), type: "admin", action: "worker_update", actor: "admin", target_id: "w_gpt4_bot", details: { tier: "trusted", old_tier: "proven" }, created_at: hoursAgo(5) },
    { _id: nanoid(), type: "admin", action: "task_retry", actor: "admin", target_id: "task_test_1", details: null, created_at: hoursAgo(8) },
    { _id: nanoid(), type: "admin", action: "task_credit", actor: "admin", target_id: "task_test_2", details: { buyer_id: "usr_bob", amount_cents: 10 }, created_at: hoursAgo(12) },
    { _id: nanoid(), type: "qa", action: "spot_check_fail", actor: "system", target_id: "w_suspended", details: { similarity: 0.35, verdict: "fail" }, created_at: hoursAgo(24) },
    { _id: nanoid(), type: "qa", action: "spot_check_pass", actor: "system", target_id: "w_claude_pro", details: { similarity: 0.92, verdict: "pass" }, created_at: hoursAgo(36) },
    { _id: nanoid(), type: "admin", action: "balance_debit", actor: "admin", target_id: "usr_dave", details: { amount_cents: -100, reason: "Abuse penalty" }, created_at: hoursAgo(48) },
    { _id: nanoid(), type: "system", action: "worker_suspended", actor: "system", target_id: "w_suspended", details: { reason: "3 consecutive spot check failures" }, created_at: daysAgo(2) },
  ];
  await db.collection("audit_log").insertMany(auditEntries);
  console.log(`Inserted ${auditEntries.length} audit log entries`);

  // --- Platform Config (ensure exists) ---
  const configs = [
    { _id: "pricing", chat: { base_cents: 2 }, code: { base_cents: 5 }, research: { base_cents: 10 }, analyze: { base_cents: 5 }, translate: { base_cents: 3 }, updated_at: now },
    { _id: "tiers", levels: { new: { min_tasks: 0, min_completion: 0, max_credit_rate: 0.5, commission: 0.30 }, proven: { min_tasks: 20, min_completion: 0.85, max_credit_rate: 0.3, commission: 0.25 }, trusted: { min_tasks: 100, min_completion: 0.90, max_credit_rate: 0.2, commission: 0.20 }, elite: { min_tasks: 500, min_completion: 0.95, max_credit_rate: 0.1, commission: 0.15 } }, updated_at: now },
    { _id: "commissions", standard: 0.25, skill: 0.20, subscription: 0.10, volume_discounts: [{ min_tasks: 100, commission: 0.22 }, { min_tasks: 500, commission: 0.18 }], freeze_window_hours: 24, min_withdrawal_cents: 500, daily_withdrawal_limit_cents: 50000, updated_at: now },
    { _id: "signup", buyer_free_credit_cents: 50, first_deposit_bonus_pct: 10, referral_buyer_credit_cents: 100, referral_seller_pct: 5, invite_codes: ["BETA2026"], updated_at: now },
    { _id: "qa", spot_check_rates: { new: 0.5, proven: 0.2, trusted: 0.1, elite: 0.05, suspicious: 0.8 }, shadow_execution_rate: 0.1, similarity_thresholds: { pass: 0.75, flag: 0.5 }, penalty: { first_fail: "warning", second_fail: { deduct_pct: 10, downgrade: true }, third_fail: { ban: true, freeze_balance: true } }, updated_at: now },
    { _id: "rate_limits", registration: { per_ip_per_min: 3 }, work_next: { per_min: 10 }, task_submit: { per_min: 5 }, withdrawal: { per_min: 1, daily_max_cents: 50000, min_cents: 500 }, updated_at: now },
    { _id: "review", enabled: true, updated_at: now },
  ];
  for (const cfg of configs) {
    await db.collection("platform_config").replaceOne({ _id: cfg._id }, cfg, { upsert: true });
  }
  console.log(`Upserted ${configs.length} platform configs`);

  await client.close();
  console.log("\nDone! Admin test data seeded successfully.");
}

seed().catch(console.error);
