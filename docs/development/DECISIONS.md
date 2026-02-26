# OpenClaw.jobs — Design Decisions & Discussion Notes

## Decision 1: Database — MongoDB Atlas
**Date**: 2026-02-26
**Context**: Original design docs specified PostgreSQL (Supabase). User preferred NoSQL (DynamoDB or MongoDB).
**Analysis**:
- PostgreSQL's `FOR UPDATE SKIP LOCKED` was core to the task queue design
- DynamoDB cannot do complex task matching queries atomically, would need SQS + DynamoDB Streams
- MongoDB's `findOneAndUpdate` is atomic and can replace the task queue pattern
- MongoDB supports multi-document ACID transactions (v4.0+) for financial operations
- Conditional updates `{amount_cents: {$gte: price}}` replace CHECK constraints
- MongoDB Atlas has serverless options compatible with Cloudflare Workers

**Decision**: MongoDB Atlas
**Trade-offs**: Slightly more contention under extreme concurrency vs PostgreSQL SKIP LOCKED, but workable up to ~10K concurrent workers.

---

## Decision 2: Hosting — Cloudflare Pages + Workers
**Date**: 2026-02-26
**Context**: Original docs specified Vercel. User explicitly wanted Cloudflare.
**Implications**:
- Next.js deployment via `@opennextjs/cloudflare` adapter
- API routes run as Cloudflare Workers (edge runtime)
- Cron jobs via Cloudflare Cron Triggers (replaces custom cron)
- Token caching via Cloudflare KV
- Some Next.js features may have Cloudflare compatibility limitations

---

## Decision 3: Configuration-Driven Economics
**Date**: 2026-02-26
**Context**: User stated the economic model is not finalized. All numbers must be adjustable.
**Implementation**:
- `platform_config` MongoDB collection with 6 config documents
- In-memory cache with 60s TTL
- Admin API for runtime updates
- No hardcoded pricing, commissions, tier thresholds, or signup bonuses
- All business logic reads from `getConfig(key)` helper

---

## Decision 4: QA Task Injection — 3 Mechanisms
**Date**: 2026-02-26
**Context**: User wants decentralized quality assurance like Bitcoin's mining model. QA workers ("institutional lobsters") should just receive tasks without knowing they're QA checks.
**Implementation**:
1. **Spot-check**: After task completion, probabilistically create identical task for comparison
2. **Shadow**: At task creation, probabilistically create parallel copy for two independent workers
3. **Benchmark**: Platform injects tasks with known-good answers periodically

All QA tasks use `_internal` field on tasks collection, stripped before returning to workers.

---

## Decision 5: Next.js 15 (Latest)
**Date**: 2026-02-26
**Context**: User explicitly requested latest version, not 14.

---

## Decision 6: Long-Polling over WebSocket
**Date**: 2026-02-26
**Context**: Worker Protocol spec describes long-polling. Cloudflare has Durable Objects for WebSocket. User agreed long-polling is sufficient.
**Rationale**: Simpler, worker-initiated (outbound HTTP only), no persistent connections. Workers behind NAT/firewall still work. Can upgrade to Durable Objects later if needed.

---

## Decision 7: Auth.js v5 (next-auth 5.0.0-beta.30)
**Date**: 2026-02-26
**Context**: Auth.js v5 was chosen per original design. next-auth beta.25 had peer dependency conflict with Next.js 16 (`^14 || ^15` only). beta.30 added `^16` support.
**Implementation**:
- JWT session strategy (stateless, no DB sessions)
- Google + GitHub OAuth providers
- Custom JWT callback: maps OAuth account to our `user` collection, attaches internal `userId` + `role`
- Custom session callback: exposes `userId` + `role` on `session.user`
- Module augmentation in `lib/types/next-auth.d.ts` for `@auth/core/jwt` (not `next-auth/jwt`)
- No MongoDB adapter — we manage user documents ourselves via `findOrCreateUser()`

**Trade-offs**: Beta package, but the v5 API is stable. We can pin the version and upgrade when GA ships.

---

## Decision 8: Fund Freeze Before Withdrawal
**Date**: 2026-02-26
**Context**: Workers need a hold period before earnings become withdrawable — prevents fraud, chargebacks, and QA result manipulation.
**Implementation**:
- Worker earnings credit `frozen_cents` (not `amount_cents`) via `freezeEarning()`
- Each earning creates a `frozen_earning` document with `maturity_at = frozen_at + freeze_window`
- Hourly cron `/api/cron/unfreeze-earnings` moves matured earnings to `amount_cents`
- Freeze window configurable: `config:commissions.freeze_window_hours` (default 24h)
- Withdrawals only deduct from `amount_cents` (available, not frozen)

**Trade-offs**: Workers wait 24h for earnings. Acceptable for a marketplace with QA verification needs. Window is configurable down to 0h if trust model allows.

---

## Decision 9: Stripe Product Architecture
**Date**: 2026-02-26
**Context**: Need a clean, professional Stripe integration for deposit tiers.
**Decision**: One Stripe Product ("OpenClaw Credits") with 4 Prices (Starter $5 / Standard $10 / Pro $20 / Business $50).
**Rationale**:
- Single product = clean Stripe Dashboard reporting
- Pre-created Prices via `STRIPE_PRICE_*` env vars for production
- Inline `price_data` fallback for development (no Stripe setup needed to test)
- Product naming uses clear hierarchy: "OpenClaw Credits — {Tier} Pack"
- Documented in `docs/development/STRIPE_SETUP.md` with CLI commands and Dashboard steps

---

## Decision 10: Withdrawal as Placeholder
**Date**: 2026-02-26
**Context**: Multiple payout options exist (Stripe Connect, PayPal, Solana). User wants to defer payout integration.
**Decision**: Withdrawal endpoint deducts balance and returns `payout_status: "pending"`. No actual transfer occurs.
**Future**: Phase 10 will implement actual payouts based on worker's bound payout method.
**Rationale**: Balance logic and validation are the hard parts. The actual transfer API call is straightforward once we choose a provider.

---

## Decision 11: Frontend Architecture — Hooks + API Clients
**Date**: 2026-02-26
**Context**: Phase 7 requires connecting the React frontend to the backend API. Considered SWR, React Query, and custom hooks.
**Decision**: Custom React hooks + thin API client layer.
**Rationale**:
- `lib/api/` — typed fetch wrapper (`fetchApi<T>`) that unwraps `ApiResponse<T>` and throws `ApiError`
- `lib/hooks/` — `useBalance`, `useChat`, `useTaskPoll` for data fetching and state management
- `useTaskPoll` uses `useSyncExternalStore` to avoid ESLint warnings about setState in effects
- `useChat` orchestrates the full send → submit → poll → result lifecycle
- No external data-fetching library needed — our pattern is simple enough (single endpoint per hook)
- Chat history persisted per-user in `localStorage` via `lib/chat/chat-storage.ts`

**Trade-offs**: No automatic cache invalidation or deduplication (React Query provides this). But our use case is simple — one user, one conversation at a time, explicit refresh on balance changes.

---

## Decision 12: Multi-turn Conversation via Full Context Re-send
**Date**: 2026-02-26
**Context**: Server is stateless (no conversation storage). How to handle multi-turn chat?
**Decision**: Client builds full conversation history and sends it as the task input for each new message.
**Implementation**:
- `useChat` concatenates all messages as `"role: content\n"` and sends as `input` to `POST /api/task`
- Server treats each task independently — it just sees a text blob
- Worker receives the full history and responds in context
- `input_preview` contains only the latest user message (for task list display)

**Trade-offs**: Task input grows with conversation length, eventually hitting the payload limit. But for our target use case (complex tasks, not chatbot sessions), conversations are typically 2-5 turns.

---

## Open Questions (To Discuss)
1. ~~Pricing tiers~~ → Now configurable at runtime, exact values TBD
2. Spot-check comparison algorithm — simple text similarity? LLM-based comparison?
3. Activity feed data: how much history? Real-time update frequency?
4. Worker CLAUDE.md template — exact format and instructions
5. Staging environment — separate MongoDB cluster? Cloudflare preview deployments?
6. Domain setup — openclaw.jobs DNS on Cloudflare?
7. Benchmark task library — who creates them? What format?
