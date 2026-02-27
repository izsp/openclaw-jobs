# OpenClaw.jobs

## Project Overview
A distributed AI agent marketplace — the "Internet Café model for AI."
- Buyers get premium AI results at pay-per-use prices ($0.02-$5.00/task)
- Sellers ("Lobsters") monetize idle AI subscriptions autonomously
- Platform takes configurable commission, stores only financial data (stateless for conversations)
- Core principle: **sell results, not model access**

## Documentation

### Original Design (read-only reference)
- `docs/initial-design/OpenClaw_Jobs_Product_Design_Document.docx` — Full product vision
- `docs/initial-design/OpenClaw_Jobs_Product_Execution_Plan_v2.docx` — Execution roadmap
- `docs/initial-design/OpenClaw_Jobs_Worker_Protocol_Spec_v1.docx` — Worker protocol technical spec

### Development Docs (living documents, update as you build)
- `docs/development/ARCHITECTURE.md` — System architecture, MongoDB schema, API design, QA system
- `docs/development/BUILD_PLAN.md` — Detailed 10-phase build plan with code examples
- `docs/development/PROGRESS.md` — Phase-by-phase checklist, update after completing each task
- `docs/development/DECISIONS.md` — Key decisions log with context and rationale

## Tech Stack
- **Frontend**: Next.js 15 (App Router) + Tailwind CSS
- **Hosting**: Cloudflare Pages (@opennextjs/cloudflare)
- **API**: Next.js Route Handlers (edge runtime → Cloudflare Workers)
- **Database**: MongoDB Atlas
- **Auth**: Auth.js v5 + AWS Cognito (email+password + Google federated login)
- **Identity**: AWS Cognito User Pool (us-west-2, profile: `openclaw-jobs`)
- **Payments**: Stripe Checkout + Webhooks
- **Caching**: Cloudflare KV
- **Cron**: Cloudflare Cron Triggers

## Key Architecture Rules
1. **Configuration-driven economics** — All pricing, commissions, tier thresholds, QA rates live in `platform_config` MongoDB collection. Never hardcode economic parameters. Use `getConfig(key)` from `/lib/config.ts`.
2. **QA tasks are invisible** — Tasks have `_internal` field for QA metadata. ALWAYS strip `_internal` before returning tasks to workers via `/api/work/next`.
3. **Stateless server** — No conversation storage on server. Browser localStorage holds chat history. Server is a financial ledger + task dispatcher.
4. **Atomic financial operations** — All balance changes use MongoDB transactions or conditional updates. Balance can never go negative.
5. **Worker-initiated connections** — All worker communication is outbound HTTP (long-polling). Platform never connects to workers.

## Project Structure
```
/app                          # Next.js App Router
  /page.tsx                   # Landing page + chat UI
  /dashboard/                 # Buyer dashboard
  /worker/                    # Worker dashboard
  /api/
    /auth/                    # Auth endpoints
    /task/                    # Buyer task endpoints
    /work/                    # Worker task claim/submit
    /worker/                  # Worker registration/profile
    /deposit/                 # Stripe endpoints
    /balance/                 # Balance endpoints
    /admin/config/[key]/      # Admin config CRUD
    /admin/qa/                # Admin QA management
/lib
  /db.ts                      # MongoDB connection singleton
  /config.ts                  # Config loader (60s cache TTL)
  /task-dispatch.ts           # Task queue (findOneAndUpdate)
  /settlement.ts              # Financial transaction logic
  /qa.ts                      # QA injection engine
  /auth.ts                    # Auth.js configuration
  /types.ts                   # TypeScript interfaces
/components
  /chat/                      # Chat interface components
  /layout/                    # Layout components
  /dashboard/                 # Dashboard components
```

## AWS Infrastructure
- **AWS Profile**: `openclaw-jobs` (region: us-west-2). Always use `AWS_PROFILE=openclaw-jobs` for all AWS CLI and Terraform commands.
- **Cognito User Pool**: `openclaw-jobs-staging` in us-west-2. Manages all user authentication (email+password + Google federated login).
- **Terraform**: Infrastructure-as-code lives in `infra/cognito/`. Run `terraform apply` from that directory with `AWS_PROFILE=openclaw-jobs`.
- **Naming convention**: All AWS resources use `openclaw-jobs-` prefix followed by environment (`staging`/`production`) and optional resource type suffix.
- **Auth flow**: User clicks "Sign in" → Cognito Hosted UI (email+password or Google) → OIDC callback → Auth.js JWT → our DB user lookup via `findOrCreateUser("cognito", sub, email)`.

## Conventions
- Use TypeScript strict mode
- All API responses follow `{ success: boolean, data?: any, error?: string }` pattern
- MongoDB collection names are lowercase singular: `user`, `balance`, `transaction`, `task`, `worker`, `audit_log`, `platform_config`
- Internal currency: 🦐 (Shrimp), 100 🦐 = $1.00 USD, all amounts stored as integer cents
- Worker tokens: random string, stored as SHA-256 hash only
- Task IDs: `task_` + nanoid. Worker IDs: `w_` + nanoid

---

## Development Rules (STRICT — Read Before Writing Any Code)

This is a large, long-lived production project. These rules exist to prevent entropy. Follow them without exception. Slow and correct beats fast and messy.

### Rule 1: Single Responsibility — One File, One Job
- Every file does ONE thing. If you have to use "and" to describe it, split it.
- **Max 200 lines per file.** If a file approaches this, refactor into smaller modules.
- **Max 50 lines per function.** A function that needs more is doing too much.
- No "utils.ts" or "helpers.ts" catch-all files. Name files by what they do: `hash-token.ts`, `calculate-price.ts`, `validate-task-input.ts`.
- Every `/lib` file exports a focused, well-named public API. Internal helpers stay private (not exported).

### Rule 2: Types First — Define Before You Build
- Define TypeScript interfaces/types BEFORE writing any implementation.
- All types live in `/lib/types/` organized by domain: `task.types.ts`, `worker.types.ts`, `balance.types.ts`, `config.types.ts`.
- **No `any` type.** Ever. Use `unknown` + type guards if the type is truly unknown.
- **No type assertions (`as`)** unless absolutely unavoidable — and then add a comment explaining why.
- MongoDB documents must have corresponding TypeScript interfaces. All collection operations are fully typed.
- API request/response payloads must have explicit types. No implicit shapes.

### Rule 3: Error Handling — Explicit, Consistent, Logged
- Every API route handler must have a top-level try/catch.
- Every error returns a structured response: `{ success: false, error: "human_readable_message", code: "MACHINE_CODE" }`.
- Use a custom error class hierarchy: `AppError` → `ValidationError`, `AuthError`, `BalanceError`, `NotFoundError`, etc. Defined in `/lib/errors.ts`.
- **Never swallow errors silently.** Every catch block either handles the error meaningfully or re-throws.
- All errors that reach the top-level handler are logged with context (endpoint, user_id, request_id).
- Every API request gets a unique `request_id` (nanoid) for tracing across logs.

### Rule 4: Database Operations — Safety Above All
- **Every balance mutation** must use a MongoDB transaction or atomic conditional update. No exceptions.
- **Never read-then-write** for balance operations. Always use `findOneAndUpdate` with conditions in the query.
- All MongoDB operations must handle failure cases explicitly: what if the document doesn't exist? What if the condition fails?
- **No raw MongoDB driver calls in route handlers.** All database operations go through typed service functions in `/lib/services/`. Route handlers call services, services call the database.
- Index every query pattern. Before adding a new query, add the corresponding index. Document indexes in schema files.

### Rule 5: API Route Handlers — Thin Controllers
- Route handlers are thin: validate input → call service → return response. Max 30 lines.
- All business logic lives in `/lib/services/`. Route handlers NEVER contain business logic.
- Input validation happens in a dedicated validation step using Zod schemas defined in `/lib/validators/`.
- Every route handler follows this exact pattern:
  ```
  1. Parse & validate input (Zod)
  2. Authenticate/authorize
  3. Call service function
  4. Return typed response
  5. Catch errors → return error response
  ```

### Rule 6: Testing — Write Tests Before Moving On
- **Do not move to the next phase until the current phase has tests.**
- Every service function must have unit tests.
- Every API endpoint must have at least one integration test (happy path + primary error case).
- Financial operations (balance changes, settlements) must have concurrency tests.
- Tests live alongside source in `__tests__/` directories or in a top-level `/tests` directory mirroring the source structure.
- Test file naming: `[module].test.ts` for unit, `[endpoint].integration.test.ts` for API tests.
- Use descriptive test names: `"should reject withdrawal when frozen balance exceeds available"`, not `"test withdraw"`.

### Rule 7: No Magic Numbers — Everything Is Named
- **Zero hardcoded values** in business logic. All constants go to:
  - `platform_config` collection → for runtime-adjustable values (pricing, rates, thresholds)
  - `/lib/constants.ts` → for truly fixed values (HTTP status codes, token prefixes, collection names)
- When reading a config value, always provide a sensible default: `getConfig('pricing')?.chat?.base_cents ?? 2`
- Constants file is organized by domain with clear section comments.

### Rule 8: Naming Is Documentation
- **Files**: kebab-case, descriptive. `task-dispatch.ts`, not `td.ts` or `dispatch.ts`.
- **Functions**: verb-first, descriptive. `claimNextTask()`, not `getTask()`. `settleTaskPayment()`, not `settle()`.
- **Variables**: full words. `workerProfile`, not `wp`. `taskPrice`, not `tp`.
- **Types/Interfaces**: PascalCase, noun-based. `TaskDocument`, `WorkerProfile`, `BalanceUpdate`.
- **API routes**: RESTful, lowercase. `/api/work/next`, `/api/task/[id]/credit`.
- **MongoDB fields**: snake_case to match the original design docs. `created_at`, `worker_id`, `price_cents`.
- If a name doesn't make sense on its own without context, rename it.

### Rule 9: Git Discipline
- **One logical change per commit.** "Add task submission endpoint" — not "Add task and worker endpoints and fix bug".
- Commit messages: imperative, under 72 chars. `Add task claim endpoint with tier-based dispatch`
- **Never commit broken code.** Every commit must pass lint + existing tests.
- **Never commit secrets, credentials, or .env files.**
- Update `docs/development/PROGRESS.md` when completing a checklist item.

### Rule 10: Dependency Discipline
- **Justify every new dependency.** Before adding a package, ask: can this be done in <50 lines of code without it?
- Prefer standard library / built-in APIs over external packages.
- Pin exact versions in package.json (no `^` or `~`).
- When adding a dependency, add a comment in package.json or a note in DECISIONS.md explaining why.
- Audit dependencies for size — no multi-MB packages for simple tasks.

### Rule 11: Security by Default
- **Validate all input** at the API boundary using Zod schemas. Never trust client data.
- **Sanitize all output** — strip `_internal` from tasks, strip `token_hash` from workers.
- Rate limit every public endpoint. Values from `config:rate_limits`.
- All tokens stored as SHA-256 hashes. Raw tokens exist only in transit.
- Never log sensitive data (tokens, passwords, payment info, task content).
- All financial amounts are integers (cents). Never use floating-point for money.

### Rule 12: Documentation — Update As You Go
- After completing any task, update `docs/development/PROGRESS.md`.
- After making any architectural decision, log it in `docs/development/DECISIONS.md`.
- After adding/changing any API endpoint, update `docs/development/ARCHITECTURE.md`.
- Every exported function must have a JSDoc comment describing: what it does, what it returns, and when it throws.
- Complex business logic gets a `// WHY:` comment explaining the reasoning, not just what the code does.

### Rule 13: Code Review Checklist (Self-Check Before Committing)
Before considering any piece of work "done", verify:
- [ ] Types are complete — no `any`, no untyped parameters
- [ ] Error cases are handled — what happens when things fail?
- [ ] Input is validated — Zod schema exists for every API input
- [ ] Sensitive data is stripped — `_internal`, `token_hash`, etc. never leak
- [ ] Financial ops are atomic — transactions or conditional updates
- [ ] Config values come from `getConfig()` — nothing hardcoded
- [ ] Tests exist and pass
- [ ] File is under 200 lines
- [ ] Function is under 50 lines
- [ ] Names are descriptive and self-documenting
- [ ] PROGRESS.md is updated

### Rule 14: Directory Structure — Expand, Don't Flatten
As the project grows, organize by domain, not by technical role:
```
/lib
  /services/              # Business logic (one file per domain)
    task-service.ts       # createTask, getTask, creditTask
    worker-service.ts     # registerWorker, claimTask, submitResult
    balance-service.ts    # deposit, withdraw, settlePayment
    qa-service.ts         # injectSpotCheck, compareTasks
    config-service.ts     # getConfig, updateConfig
  /validators/            # Zod schemas (one file per domain)
    task.validator.ts
    worker.validator.ts
    balance.validator.ts
  /types/                 # TypeScript interfaces (one file per domain)
    task.types.ts
    worker.types.ts
    balance.types.ts
    config.types.ts
    api.types.ts          # Shared API response types
  /errors.ts              # Error class hierarchy
  /constants.ts           # Fixed constants (collection names, prefixes)
  /db.ts                  # MongoDB connection singleton
  /config.ts              # Config loader with cache
  /auth.ts                # Auth.js configuration
```
Never create a file without knowing exactly which directory it belongs in. If it doesn't fit anywhere, the directory structure needs to evolve — not the file.
