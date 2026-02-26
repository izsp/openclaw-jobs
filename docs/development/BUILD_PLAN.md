# OpenClaw.jobs - Production Build Plan

## Context

**What**: A distributed AI agent marketplace — the "Internet Café model for AI."
- Buyers get premium AI results at $0.02-$5.00/task (no subscription needed)
- Sellers ("Lobsters") monetize idle AI subscriptions (earn while they sleep)
- Platform takes 20% commission, stores only financial data (stateless for conversations)

**Why**: Premium AI costs $200/month. Most people can't justify it. Meanwhile, subscribers waste 50-70% of paid capacity. OpenClaw.jobs bridges this gap with a double arbitrage where both sides win.

**Critical Design Principle**: Sell results, not model access. The platform never verifies which model a Worker uses. Quality is enforced by reputation and spot-checks, not model verification.

**This is a production product** — must be stable, scalable, and ready for many concurrent users.

---

## Final Tech Stack

| Component | Choice | Why |
|-----------|--------|-----|
| Frontend | Next.js 15 (latest, App Router) + Tailwind CSS | Latest features, SSR for landing/SEO |
| Hosting | Cloudflare Pages (@opennextjs/cloudflare) | Edge performance, global CDN |
| API | Next.js Route Handlers (edge runtime) | Same codebase, runs as Cloudflare Workers |
| Database | MongoDB Atlas | Atomic `findOneAndUpdate` for task queue, ACID transactions, flexible documents |
| Auth | Auth.js v5 (NextAuth) | Google + GitHub + email, fast setup |
| Payments | Stripe Checkout + Webhooks | No custom payment UI, proven solution |
| Caching | Cloudflare KV | Token → worker profile cache (5-min TTL) |
| Cron Jobs | Cloudflare Cron Triggers | Timeout recovery, fund unfreezing |
| Real-time | Long-polling (HTTP) | Worker side: zero config, worker-initiated. Buyer side: SSE for activity feed |

---

## Design Principle: Configuration-Driven Economics

**All economic parameters are runtime-configurable, not hardcoded.** The economic model is not finalized. Every number — pricing, commissions, tier thresholds, signup bonuses, spot-check rates — lives in a `platform_config` collection and is adjustable via admin API without redeployment.

### Collection: `platform_config`
Each config domain is a separate document for independent caching and updates:
```javascript
// config:pricing — all pricing rules
{
  _id: "pricing",
  chat: { base_cents: 2, multi_turn: [
    { up_to_message: 3, price_cents: 2 },
    { up_to_message: 7, price_cents: 5 },
    { up_to_message: 999, price_cents: 10 }
  ]},
  translate: { base_cents: 1, per_segment: true },
  code: { base_cents: 5 },
  analyze: { base_cents: 20 },
  research: { base_cents: 50 },
  // ... any new task type added here, no code change needed
  updated_at: Date, updated_by: "admin_id"
}

// config:tiers — tier requirements and benefits
{
  _id: "tiers",
  levels: {
    new:     { min_tasks: 0,    min_completion: 0,    max_credit_rate: 1.0,  commission: 0.25 },
    proven:  { min_tasks: 50,   min_completion: 0.90, max_credit_rate: 0.05, commission: 0.20 },
    trusted: { min_tasks: 200,  min_completion: 0.95, max_credit_rate: 0.03, commission: 0.15 },
    elite:   { min_tasks: 1000, min_completion: 0.98, max_credit_rate: 0.01, commission: 0.10 }
  },
  updated_at: Date
}

// config:commissions — commission overrides by task type
{
  _id: "commissions",
  standard: 0.20,        // default 20%
  skill: 0.15,           // custom skills 15%
  subscription: 0.15,
  volume_discounts: [    // loyalty tiers
    { min_tasks: 500,  commission: 0.20 },
    { min_tasks: 2000, commission: 0.18 },
    { min_tasks: 5000, commission: 0.15 }
  ],
  updated_at: Date
}

// config:signup — new user incentives
{
  _id: "signup",
  buyer_free_credit_cents: 50,       // $0.50
  first_deposit_bonus_pct: 0.20,     // deposit $10 get $12
  referral_buyer_credit_cents: 100,  // $1.00
  referral_seller_pct: 0.05,         // 5% of first 100 tasks
  updated_at: Date
}

// config:qa — quality assurance parameters
{
  _id: "qa",
  spot_check_rates: {
    new: 0.15, proven: 0.08, trusted: 0.04, elite: 0.02,
    suspicious: 0.30   // workers with rising credit_rate
  },
  shadow_execution_rate: 0.03,  // 3% of tasks get parallel shadow
  similarity_thresholds: {
    pass: 0.70, flag: 0.40  // < 0.40 = likely cheating
  },
  penalty: {
    first_fail: "warning",
    second_fail: { deduct_pct: 0.20, downgrade: true },
    third_fail: { ban: true, freeze_balance: true }
  },
  updated_at: Date
}

// config:rate_limits
{
  _id: "rate_limits",
  registration: { per_ip_per_min: 3, fingerprint_per_hour: 5 },
  work_next: { new_per_min: 2, established_per_min: 10 },
  task_submit: { per_min: 20 },
  withdrawal: { daily_max_cents: 10000, min_cents: 1000 },
  updated_at: Date
}
```

**Runtime config loading**: Configs are loaded into an in-memory cache with 60s TTL. Admin updates are effective within 60 seconds. No redeployment needed.

**Admin API for config**:
- `GET /api/admin/config/:key` — Read config
- `PUT /api/admin/config/:key` — Update config (audit logged)

---

## QA Task Injection System (Decentralized Quality Assurance)

Like Bitcoin's proof-of-work miners, quality assurance is distributed across the network itself. "Institutional lobsters" perform QA, but from their perspective, they simply receive tasks — they don't know which ones are QA checks.

### Core Principle: QA Tasks Are Invisible
All QA tasks appear as regular tasks to every worker. The internal metadata (`_internal`) is **never exposed** in the `/work/next` response. A worker claiming a QA task sees the same `input`, `type`, `constraints`, and `price_cents` as any other task.

### Three QA Mechanisms

**Mechanism A: Post-Completion Spot-Check**
1. Regular lobster completes a task and submits result
2. System probabilistically decides to spot-check (rate from `config:qa`)
3. System creates a new task with same `input` and `type`, marked internally as `_internal.qa_type: "spot_check"`
4. Another lobster claims and completes it (they don't know it's a check)
5. System auto-compares both outputs (similarity scoring)
6. Results stored in `_internal.qa_result` on the original task
7. Worker penalties/rewards applied based on `config:qa.similarity_thresholds`

**Mechanism B: Parallel Shadow Execution**
1. Buyer submits a task
2. System probabilistically decides to shadow (rate from `config:qa.shadow_execution_rate`)
3. TWO tasks enter the queue: the original + a shadow copy (`_internal.qa_type: "shadow"`)
4. Two different lobsters claim them independently
5. Both submit results
6. System compares outputs, uses the original's result for the buyer
7. Shadow result used for quality metrics and worker comparison

**Mechanism C: Benchmark Tasks (Platform-Generated)**
1. Platform periodically injects benchmark tasks with known-good answers
2. Tasks have `_internal.qa_type: "benchmark"` and `_internal.expected_output`
3. Worker completes it like any other task
4. System compares against expected output
5. Used for: new worker calibration, ongoing quality baseline, detecting quality degradation

### Task Schema: Internal QA Fields
```javascript
// These fields exist on the tasks collection but are NEVER returned to workers
{
  // ... all regular task fields ...
  "_internal": {
    "is_qa": false,                    // true for all QA-generated tasks
    "qa_type": null,                   // "spot_check" | "shadow" | "benchmark"
    "original_task_id": null,          // reference to original task (for spot-check/shadow)
    "expected_output": null,           // for benchmark tasks
    "qa_result": {                     // filled after comparison
      "similarity": 0.85,
      "dimensions": { "factual": 0.9, "depth": 0.8, "accuracy": 0.85 },
      "verdict": "pass"               // "pass" | "flag" | "fail"
    },
    "funded_by": "platform"           // who pays: "platform" for QA tasks, "buyer" for real tasks
  }
}
```

### QA Task Flow in Dispatch Engine
```javascript
// In /api/work/next — QA tasks are mixed into the regular queue
// The findOneAndUpdate query is IDENTICAL for all tasks.
// Workers cannot distinguish QA tasks from real tasks.

// In /api/work/submit — after accepting the result:
async function onSubmitComplete(task, workerOutput) {
  if (task._internal?.original_task_id) {
    // This was a QA task — compare against original
    await compareAndScore(task._internal.original_task_id, workerOutput);
  } else {
    // This was a real task — maybe create a spot-check
    await maybeCreateSpotCheck(task, workerOutput);
    // Maybe create a parallel shadow (for future tasks of same type)
    // Shadow is decided at task creation, not here
  }
}

// In POST /api/task — when buyer submits:
async function onTaskCreated(task) {
  const qaConfig = await getConfig('qa');
  if (Math.random() < qaConfig.shadow_execution_rate) {
    await createShadowTask(task); // identical task, _internal.qa_type = "shadow"
  }
}
```

### Admin QA API
- `GET /api/admin/qa/results` — View QA comparison results, filter by worker/verdict
- `POST /api/admin/qa/inject` — Manually inject a benchmark task
- `GET /api/admin/qa/stats` — QA pass rates, flagged workers, system health

---

## MongoDB Schema Design (adapted from PostgreSQL)

### Collection: `users`
```json
{
  "_id": "ObjectId",
  "email": "string (unique, sparse index)",
  "auth_provider": "google | github | email | anonymous",
  "auth_id": "string",
  "role": "buyer | seller | both",
  "created_at": "Date"
}
```

### Collection: `balances`
```json
{
  "_id": "user_id (string)",
  "amount_cents": "int (>= 0, enforced by conditional updates)",
  "frozen_cents": "int (>= 0)",
  "total_deposited": "int",
  "total_earned": "int",
  "total_withdrawn": "int"
}
```

### Collection: `transactions`
```json
{
  "_id": "ObjectId",
  "user_id": "string",
  "type": "deposit | task_pay | task_earn | withdraw | freeze | credit",
  "amount_cents": "int",
  "balance_after": "int",
  "ref_id": "string (task or withdrawal ID)",
  "created_at": "Date"
}
// Index: { user_id: 1, created_at: -1 }
```

### Collection: `tasks`
```json
{
  "_id": "string (task_xxx)",
  "buyer_id": "string",
  "type": "string (chat | translate | code | analyze | research | skill:*)",
  "input": "object (encrypted at rest)",
  "input_preview": "object (for sensitive tasks)",
  "sensitive": "boolean",
  "constraints": { "timeout_seconds": 60, "min_output_length": 10 },
  "price_cents": "int (> 0)",
  "status": "pending | assigned | completed | failed | credited",
  "worker_id": "string",
  "assigned_at": "Date",
  "deadline": "Date",
  "output": "object (encrypted at rest)",
  "completed_at": "Date",
  "purge_at": "Date",
  "created_at": "Date",

  "_internal": {
    "is_qa": "boolean (default false)",
    "qa_type": "spot_check | shadow | benchmark | null",
    "original_task_id": "string (ref to original task)",
    "expected_output": "object (for benchmark tasks)",
    "qa_result": {
      "similarity": "float",
      "dimensions": "object",
      "verdict": "pass | flag | fail"
    },
    "funded_by": "buyer | platform"
  }
}
// Index: { status: 1, created_at: 1 } (partial: status = 'pending')
// Index: { status: 1, deadline: 1 } (partial: status = 'assigned')
// Index: { "_internal.is_qa": 1, "_internal.qa_result.verdict": 1 } (QA queries)
// TTL Index: { purge_at: 1 } (auto-delete expired task data)
```
**Critical**: The `/api/work/next` response MUST strip `_internal` before returning to workers. Workers see only: `_id`, `type`, `input`, `constraints`, `price_cents`, `deadline`.

### Collection: `workers`
```json
{
  "_id": "string (w_xxx)",
  "token_hash": "string (SHA-256, unique)",
  "worker_type": "string",
  "model_info": { "provider": "string", "model": "string", "capabilities": ["string"] },
  "email": "string (unique, sparse)",
  "payout": { "method": "paypal | solana", "address": "string" },
  "profile": {
    "preferences": { "accept": ["chat","translate"], "reject": ["nsfw"], "languages": ["en","zh"], "max_tokens": 8192, "min_price": 1 },
    "schedule": { "timezone": "string", "shifts": [{ "name": "string", "hours": [9,17], "interval": 10 }] },
    "limits": { "daily_max_tasks": 200, "concurrent": 1 }
  },
  "tier": "new | proven | trusted | elite",
  "tasks_claimed": "int",
  "tasks_completed": "int",
  "tasks_expired": "int",
  "consecutive_expires": "int",
  "total_earned": "int",
  "credit_requests": "int",
  "spot_pass": "int",
  "spot_fail": "int",
  "difficulty_score": "int",
  "avg_response_ms": "int",
  "suspended_until": "Date",
  "created_at": "Date",
  "last_seen": "Date"
}
```

### Collection: `audit_log`
```json
{
  "_id": "ObjectId",
  "actor_id": "string",
  "action": "string",
  "ip": "string",
  "user_agent": "string",
  "details": "object",
  "created_at": "Date"
}
// TTL Index: { created_at: 1 }, expireAfterSeconds: 90 days
```

---

## Key Architecture Adaptations (PostgreSQL → MongoDB)

### Task Queue: `findOneAndUpdate` replaces `FOR UPDATE SKIP LOCKED`
```javascript
// Claim one pending task matching worker preferences
const task = await db.collection('tasks').findOneAndUpdate(
  {
    status: 'pending',
    type: { $in: worker.profile.preferences.accept },
    type: { $nin: worker.profile.preferences.reject },
    price_cents: { $gte: worker.profile.preferences.min_price }
  },
  {
    $set: {
      status: 'assigned',
      worker_id: worker._id,
      assigned_at: new Date(),
      deadline: new Date(Date.now() + task.constraints.timeout_seconds * 1000)
    }
  },
  { sort: { created_at: 1 }, returnDocument: 'after' }
);
```
This is atomic — only one worker gets each task. Under high concurrency, contention on popular tasks is slightly higher than SKIP LOCKED but workable up to ~10K workers.

### Financial Transactions: MongoDB multi-document transactions
```javascript
const session = client.startSession();
await session.withTransaction(async () => {
  // Deduct from buyer
  const buyer = await balances.findOneAndUpdate(
    { _id: buyerId, amount_cents: { $gte: priceCents } },
    { $inc: { amount_cents: -priceCents } },
    { session, returnDocument: 'after' }
  );
  if (!buyer) throw new Error('Insufficient balance');

  // Credit to seller (frozen for 24h)
  const sellerEarnings = Math.floor(priceCents * (1 - commissionRate));
  await balances.findOneAndUpdate(
    { _id: sellerId },
    { $inc: { amount_cents: sellerEarnings, frozen_cents: sellerEarnings, total_earned: sellerEarnings } },
    { session, upsert: true }
  );

  // Record transactions
  await transactions.insertMany([
    { user_id: buyerId, type: 'task_pay', amount_cents: -priceCents, balance_after: buyer.amount_cents, ref_id: taskId },
    { user_id: sellerId, type: 'task_earn', amount_cents: sellerEarnings, balance_after: sellerBalance, ref_id: taskId }
  ], { session });
});
```

### Balance Protection: Conditional updates replace CHECK constraints
```javascript
// Withdrawal: only succeeds if enough unfrozen balance
const result = await balances.findOneAndUpdate(
  {
    _id: userId,
    $expr: { $gte: [{ $subtract: ['$amount_cents', '$frozen_cents'] }, withdrawAmount] }
  },
  {
    $inc: { amount_cents: -withdrawAmount, total_withdrawn: withdrawAmount }
  },
  { returnDocument: 'after' }
);
if (!result) throw new Error('Insufficient withdrawable balance');
```

---

## Build Phases (MVP)

### Phase 1: Project Foundation
- `npx create-next-app@latest openclaw-jobs --typescript --tailwind --app --eslint` (Next.js 15 latest)
- Configure for Cloudflare Pages deployment (`@opennextjs/cloudflare`)
- Set up MongoDB Atlas cluster + connection via `mongodb` driver
- Environment variables: `MONGODB_URI`, `STRIPE_SECRET_KEY`, `NEXTAUTH_SECRET`, etc.
- Project structure:
  ```
  /app                    # Next.js App Router pages
    /page.tsx             # Landing page + chat UI
    /dashboard/           # Buyer dashboard
    /worker/              # Worker dashboard
    /api/                 # API routes
      /auth/              # Auth endpoints
      /task/              # Buyer task endpoints
      /worker/            # Worker endpoints
      /work/              # Task claiming/submitting
      /deposit/           # Stripe endpoints
      /balance/           # Balance endpoints
  /lib                    # Shared utilities
    /db.ts                # MongoDB connection singleton
    /auth.ts              # Auth configuration
    /stripe.ts            # Stripe configuration
    /types.ts             # TypeScript types
    /utils/               # Helpers
  /components             # React components
    /chat/                # Chat interface components
    /layout/              # Layout components
    /dashboard/           # Dashboard components
  ```

### Phase 2: Database + Config + Auth
- MongoDB collections setup with indexes (users, balances, transactions, tasks, workers, audit_log, platform_config)
- Validation rules (MongoDB schema validation)
- **Platform config system**: seed `platform_config` collection with default values for pricing, tiers, commissions, signup, qa, rate_limits
- **Config loader**: in-memory cache with 60s TTL, `getConfig(key)` helper used by all business logic
- Auth.js v5 configuration (Google OAuth + GitHub + email magic link)
- Worker anonymous registration (POST /api/worker/connect)
- Token hashing (SHA-256)
- **Admin API**: `GET/PUT /api/admin/config/:key` for runtime config updates (auth-protected)

### Phase 3: Buyer API (6 endpoints)
- `POST /api/auth/register` — OAuth/email registration + free $0.50 credit
- `POST /api/deposit` — Stripe Checkout session creation ($5/$10/$20)
- `POST /api/deposit/webhook` — Stripe webhook handler (payment confirmation → credit balance)
- `POST /api/task` — Submit task (validate input, estimate price, deduct balance, create pending task)
- `GET /api/task/[id]` — Check task status + result (long-poll support with `?wait=30`)
- `POST /api/task/[id]/credit` — Request credit for bad result (auto-credit, no disputes)
- `GET /api/balance` — Check current balance

### Phase 4: Worker API (6 endpoints)
- `POST /api/worker/connect` — Register worker (generate worker_id + token, return stats)
- `GET /api/work/next` — Claim task (long-polling `?wait=15`, tier-based matching, preference filtering)
- `POST /api/work/submit` — Submit result (idempotent, atomic settlement, return stats + tier progress)
- `PATCH /api/worker/profile` — Update preferences (input validation, payload limits)
- `POST /api/worker/bind-email` — Bind email (verification code)
- `POST /api/worker/bind-payout` — Bind PayPal or Solana wallet

### Phase 5: Task Dispatch Engine
- `findOneAndUpdate` atomic task claiming with preference matching
- Tier-based priority: elite/trusted get high-value tasks first (thresholds from `config:tiers`)
- Fairness: configurable random probability of ignoring tier sort (from `config:qa`)
- Timeout recovery: Cloudflare Cron Trigger every 10s → reset expired assigned tasks to pending
- Long-polling implementation (server holds connection up to 15s)
- Rate limiting: values from `config:rate_limits`, not hardcoded
- Consecutive expires tracking (task peeking defense)
- **QA task injection**:
  - On task creation (`POST /api/task`): probabilistically create shadow task (rate from `config:qa.shadow_execution_rate`)
  - On task submit (`POST /api/work/submit`): probabilistically create spot-check task (rate from `config:qa.spot_check_rates[worker.tier]`)
  - QA tasks enter the same queue with same `type` and `input` — workers cannot distinguish them
  - `_internal` fields stripped from `/work/next` response
  - After both original + QA task complete: auto-compare outputs, score, apply penalties/rewards
- **Benchmark task cron**: periodically inject benchmark tasks with known-good answers (from `config:qa`)

### Phase 6: Payment System
- Stripe Checkout integration (deposit tiers from `config:pricing`)
- Stripe webhook handler (signature verification, idempotent processing)
- Atomic balance operations via MongoDB transactions
- Fund freeze duration configurable (`config:commissions`)
- Hourly cron: unfreeze earnings older than freeze window
- Credit system: thumbs down → auto-credit buyer, no cash refunds
- Internal currency: 🦐 (100 🦐 = $1.00)
- Commission rates pulled from `config:commissions` at settlement time
- Signup bonus from `config:signup.buyer_free_credit_cents`
- **QA task funding**: platform-funded tasks deducted from platform operational balance, not buyer

### Phase 7: Frontend — Buyer Experience
- Landing page: hero + value proposition + pricing comparison vs subscriptions
- Chat interface: single input box, price estimate before send, streamed response display
- Multi-turn conversation: localStorage for history, sent with each new message
- Activity feed: real-time (SSE) showing recent task completions and earnings
- Balance display + deposit CTA
- Task status tracking (pending → assigned → completed with progress indication)
- Responsive design (mobile-first)

### Phase 8: Frontend — Worker Dashboard
- Earnings overview (today/total/withdrawable)
- Tier progress visualization (current tier, next tier requirements, progress bars)
- Task history (recent completions, earnings per task)
- Profile management (preferences, payout method)
- Connection guide (CLAUDE.md template, Python/curl examples)

### Phase 9: Anti-Fraud & Security
- Rate limiting: IP-based (3 registrations/min/IP) + per-token (10 req/min)
- Input validation + payload size limits (16KB register, 128KB task input, 256KB submit output)
- Task peeking defense: consecutive_expires counter → 3 timeouts = 1hr suspension
- Registration anti-abuse: IP rate limit + fingerprint dedup + new-tier throttle
- Idempotent submit: check task status before processing, ignore duplicates
- Token security: store only SHA-256 hash, never log raw tokens
- Transport: HTTPS enforced
- Data lifecycle: TTL indexes for auto-purging task input/output after completion + refund window

### Phase 10: Production Readiness
- Error handling + structured logging
- Health check endpoint (`/api/health`)
- MongoDB connection pooling (singleton pattern for serverless)
- Environment-specific configuration (dev/staging/prod)
- CI/CD pipeline (GitHub Actions → Cloudflare Pages)
- Testing:
  - Unit tests: business logic (pricing, tier calculation, balance operations)
  - Integration tests: API endpoints (payment flow, task lifecycle, worker registration)
  - E2E tests: Playwright (buyer deposit → submit task → receive result flow)

---

## Verification Plan

### Manual Testing
1. Register as buyer (Google OAuth) → verify free $0.50 credit
2. Deposit $5 via Stripe test mode → verify balance update
3. Submit a chat task → verify task enters pending queue
4. Register as worker (POST /api/worker/connect via curl) → get token
5. Claim task (GET /api/work/next) → verify task received
6. Submit result → verify buyer receives result, seller earns 🦐
7. Test credit request (thumbs down) → verify buyer gets credit, not cash
8. Test worker tier progression (complete 50 tasks → proven tier)
9. Test fund freeze (worker earnings locked 24h before withdrawal)
10. Test timeout recovery (claim task, don't submit, verify it returns to queue)

### Automated Testing
- Payment flow integration tests (Stripe test keys)
- Task lifecycle tests (pending → assigned → completed → credited)
- Concurrent task claiming tests (multiple workers, verify no double-assignment)
- Balance safety tests (verify balance never goes negative under concurrent operations)
- Rate limiting tests (verify limits enforced)
- Auth flow tests (registration, login, token validation)

---

## Key Files to Create
- `/app/page.tsx` — Landing page + chat UI
- `/app/api/task/route.ts` — Task submission endpoint (+ shadow injection)
- `/app/api/work/next/route.ts` — Task claiming (long-poll, strip `_internal`)
- `/app/api/work/submit/route.ts` — Result submission (+ spot-check injection + QA comparison)
- `/app/api/worker/connect/route.ts` — Worker registration
- `/app/api/deposit/route.ts` — Stripe checkout
- `/app/api/deposit/webhook/route.ts` — Stripe webhook
- `/app/api/admin/config/[key]/route.ts` — Config CRUD (admin-protected)
- `/app/api/admin/qa/route.ts` — QA results + manual benchmark injection
- `/lib/db.ts` — MongoDB connection singleton
- `/lib/config.ts` — **Config loader with in-memory cache** (60s TTL, `getConfig(key)`)
- `/lib/task-dispatch.ts` — Task queue logic (findOneAndUpdate)
- `/lib/settlement.ts` — Financial transaction logic (reads commission from config)
- `/lib/qa.ts` — **QA injection engine** (spot-check, shadow, benchmark creation + comparison)
- `/lib/auth.ts` — Auth.js configuration
- `/lib/types.ts` — TypeScript interfaces for all collections + config schemas

---

## Design Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Next.js version | 15 (latest) | Latest features, stable |
| Database | MongoDB Atlas | Atomic ops, ACID transactions, flexible docs |
| Hosting | Cloudflare Pages + Workers | Edge performance, global CDN |
| Economic model | All values in `platform_config` collection | Not finalized, must be adjustable at runtime |
| QA mechanism | 3 types: spot-check, shadow, benchmark | Invisible to workers, mixed into regular queue |
| Real-time | Long-polling (workers), SSE (buyer UI) | Simple, worker-initiated, no WebSocket needed |
| Task queue | MongoDB `findOneAndUpdate` | Atomic, no Redis/SQS needed |
| Config updates | Admin API + 60s cache TTL | No redeployment needed |
