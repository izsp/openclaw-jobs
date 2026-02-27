# OpenClaw.jobs — Staging Launch Plan

> **Goal**: Get the site live on a private staging URL for end-to-end testing.
> The staging site is NOT publicly discoverable — we use a Cloudflare Pages
> preview URL (e.g. `abc123.openclaw-jobs.pages.dev`) and password-protect it
> via Cloudflare Access until everything works.

---

## Phase 0: Pre-flight Checklist

Before starting, you need:

- [ ] A GitHub account (you already have `izsp/openclaw-jobs`)
- [ ] A credit card (for Stripe — no charges in test mode)
- [ ] A Google account (for Google OAuth)
- [ ] ~1 hour of focused time

We'll do everything in **test/development mode** first.
Stripe stays in test mode. Google OAuth stays in testing mode.
No real money changes hands until we explicitly flip to production.

---

## Phase 1: MongoDB Atlas (Database)

**Where**: [cloud.mongodb.com](https://cloud.mongodb.com)

### Step 1.1 — Create account and cluster

1. Sign up at cloud.mongodb.com (or sign in)
2. Create a **Free Shared Cluster** (M0, 512 MB)
   - Provider: **AWS**
   - Region: `us-east-1` (or nearest to you)
   - Cluster name: `openclaw-staging`
3. Wait ~2 minutes for cluster creation

### Step 1.2 — Create database user

1. Go to **Database Access** → **Add New Database User**
2. Auth method: Password
3. Username: `openclaw-app`
4. Password: click **Autogenerate Secure Password** → **copy and save it**
5. Role: `readWriteAnyDatabase`

### Step 1.3 — Allow network access

1. Go to **Network Access** → **Add IP Address**
2. Click **Allow Access from Anywhere** (`0.0.0.0/0`)
   - This is fine for staging. We'll restrict in production.

### Step 1.4 — Get connection string

1. Go to **Database** → **Connect** → **Drivers**
2. Copy the connection string, it looks like:
   ```
   mongodb+srv://openclaw-app:<password>@openclaw-staging.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
3. Replace `<password>` with your actual password
4. Add the database name after the hostname:
   ```
   mongodb+srv://openclaw-app:PASSWORD@openclaw-staging.xxxxx.mongodb.net/openclaw-staging?retryWrites=true&w=majority
   ```

**Give me**: the full `MONGODB_URI` connection string (with password substituted).

### Step 1.5 — I seed the database

Once I have the URI, I'll run:
```bash
MONGODB_URI="your-uri" npx tsx scripts/setup-db.ts --seed
```
This creates all collections, indexes, and default config (pricing, tiers, QA rates, etc.).

**Checkpoint**: `[ ] MongoDB ready, URI saved`

---

## Phase 2: Auth Secrets (Generate locally)

No registration needed — we generate these ourselves.

### Step 2.1 — Generate 3 secrets

Run this in your terminal:
```bash
echo "NEXTAUTH_SECRET=$(openssl rand -hex 32)"
echo "ADMIN_SECRET=$(openssl rand -hex 32)"
echo "CRON_SECRET=$(openssl rand -hex 32)"
```

**Give me**: all three values. Save them somewhere safe (password manager).

**Checkpoint**: `[ ] 3 secrets generated and saved`

---

## Phase 3: AWS Cognito (User Authentication)

**Status**: ✅ Complete

Authentication is handled by **AWS Cognito User Pool** (`openclaw-jobs-staging` in us-west-2).
Users sign in via the Cognito Hosted UI with email+password. Google federation can be added later.

### What was created (via Terraform in `infra/cognito/`):

| Resource | Name | Value |
|----------|------|-------|
| User Pool | `openclaw-jobs-staging` | `us-west-2_dIkBX958X` |
| App Client | `openclaw-jobs-staging-app` | `26hg9s9vp9gm7gjqjdc1hg432q` |
| Hosted UI Domain | `openclaw-jobs-staging` | `openclaw-jobs-staging.auth.us-west-2.amazoncognito.com` |

### Environment variables needed:

```env
COGNITO_CLIENT_ID=26hg9s9vp9gm7gjqjdc1hg432q
COGNITO_CLIENT_SECRET=<from terraform output -raw client_secret>
COGNITO_ISSUER=https://cognito-idp.us-west-2.amazonaws.com/us-west-2_dIkBX958X
```

### To add Google federation later:

1. Create Google OAuth credentials at [console.cloud.google.com](https://console.cloud.google.com)
2. Run: `terraform apply -var="google_client_id=xxx" -var="google_client_secret=xxx"` in `infra/cognito/`

**Checkpoint**: `[x] AWS Cognito configured`

---

## Phase 5: Stripe (Test Mode)

**Where**: [dashboard.stripe.com](https://dashboard.stripe.com)

### Step 5.1 — Create account

1. Go to Stripe → Sign up
2. Verify email
3. You'll start in **Test Mode** by default (look for the toggle at top)

### Step 5.2 — Get test API keys

1. Go to **Developers** → **API Keys**
2. Copy:
   - **Publishable key**: `pk_test_...`
   - **Secret key**: click **Reveal test key** → `sk_test_...`

### Step 5.3 — Create product and prices

1. Go to **Products** → **Add Product**
2. Name: `OpenClaw Credits`
3. Description: `🦐 credits for AI task processing`
4. Add **4 one-time prices** (NOT recurring):

| Nickname | Amount | What to copy |
|----------|--------|------------|
| Starter Pack | $5.00 | Price ID → `STRIPE_PRICE_500` |
| Standard Pack | $20.00 | Price ID → `STRIPE_PRICE_2000` |
| Pro Pack | $100.00 | Price ID → `STRIPE_PRICE_10000` |
| Business Pack | $500.00 | Price ID → `STRIPE_PRICE_50000` |

### Step 5.4 — Webhook (skip for now)

We'll set up the webhook after Cloudflare deploy, since we need a public URL.
For local testing we'll use the Stripe CLI.

**Give me**: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, and the 4 Price IDs.

**Checkpoint**: `[ ] Stripe test mode ready`

---

## Phase 6: Local Smoke Test

Before deploying, we verify everything works locally.

### Step 6.1 — Create .env.local

I'll assemble your `.env.local` from all the values you've given me.

### Step 6.2 — Seed database

```bash
npx tsx scripts/setup-db.ts --seed
```

### Step 6.3 — Start dev server

```bash
npm run dev
```

### Step 6.4 — Test flow

1. Open `http://localhost:3000`
2. Sign in via Cognito (email+password)
3. Go to Dashboard → check balance (should show signup bonus)
4. Submit a chat task (it will go to "pending" — no workers yet)
5. Register a test worker:
   ```bash
   curl -X POST http://localhost:3000/api/worker/connect \
     -H "Content-Type: application/json" \
     -d '{"worker_type":"claude"}'
   ```
6. Claim + submit a task with the worker token

### Step 6.5 — Test Stripe (local)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to localhost:3000/api/deposit/webhook
# Copy the whsec_... to STRIPE_WEBHOOK_SECRET in .env.local
```

Then try a deposit on the dashboard. Use test card: `4242 4242 4242 4242`.

**Checkpoint**: `[ ] Full local flow working`

---

## Phase 7: Cloudflare Pages Deploy (Staging)

### Step 7.1 — Create Cloudflare account

**Where**: [dash.cloudflare.com](https://dash.cloudflare.com)

1. Sign up (free)
2. Go to **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. Select your GitHub repo: `izsp/openclaw-jobs`
4. Configure build:
   - **Framework preset**: Next.js
   - **Build command**: `npx @opennextjs/cloudflare build`
   - **Build output directory**: `.open-next`

### Step 7.2 — Set environment variables

In **Settings → Environment Variables**, add ALL of these (use the values we
collected in earlier phases):

| Variable | Encrypt? |
|----------|----------|
| `MONGODB_URI` | Yes |
| `NEXTAUTH_SECRET` | Yes |
| `NEXTAUTH_URL` | No — set to `https://YOUR-PROJECT.pages.dev` |
| `COGNITO_CLIENT_ID` | No |
| `COGNITO_CLIENT_SECRET` | Yes |
| `COGNITO_ISSUER` | No |
| `STRIPE_SECRET_KEY` | Yes |
| `STRIPE_WEBHOOK_SECRET` | Yes (we'll set this in Step 7.4) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | No |
| `STRIPE_PRICE_500` | No |
| `STRIPE_PRICE_2000` | No |
| `STRIPE_PRICE_10000` | No |
| `STRIPE_PRICE_50000` | No |
| `ADMIN_SECRET` | Yes |
| `CRON_SECRET` | Yes |
| `NODE_ENV` | No — set to `production` |

### Step 7.3 — First deploy

Push to `main` → Cloudflare auto-builds. This gives you a URL like:
```
https://openclaw-jobs.pages.dev
```

**Give me**: the Cloudflare Pages URL after first deploy.

### Step 7.4 — Update Cognito callback URLs

Now that we have the staging URL, update the Cognito App Client:

```bash
cd infra/cognito
AWS_PROFILE=openclaw-jobs terraform apply \
  -var='callback_urls=["http://localhost:3000/api/auth/callback/cognito","https://openclaw-jobs.pages.dev/api/auth/callback/cognito"]' \
  -var='logout_urls=["http://localhost:3000","https://openclaw-jobs.pages.dev"]'
```

### Step 7.5 — Set up Stripe webhook

1. Go to Stripe Dashboard → **Developers** → **Webhooks** → **Add Endpoint**
2. Endpoint URL: `https://openclaw-jobs.pages.dev/api/deposit/webhook`
3. Events: select only `checkout.session.completed`
4. Copy the **Signing Secret** (`whsec_...`)
5. Go back to Cloudflare → update `STRIPE_WEBHOOK_SECRET` env var
6. Re-deploy (or it picks up on next push)

### Step 7.6 — Protect staging with Cloudflare Access (optional)

To prevent random visitors from finding the staging site:

1. Go to Cloudflare Dashboard → **Zero Trust** → **Access** → **Applications**
2. Add application → **Self-hosted**
3. Application domain: `openclaw-jobs.pages.dev`
4. Policy: allow only your email
5. This puts a login wall in front of the entire site

> Alternatively, just don't publicize the `.pages.dev` URL. It's not indexed
> by search engines. The random subdomain alone provides obscurity.

**Checkpoint**: `[ ] Staging site deployed and accessible`

---

## Phase 8: Staging Verification

### 8.1 — Health check
```bash
curl https://openclaw-jobs.pages.dev/api/health
```

### 8.2 — Full buyer flow
1. Visit staging URL → Sign in (Google or GitHub)
2. Check dashboard → balance should show signup bonus
3. Add funds → Stripe test card `4242 4242 4242 4242`
4. Submit a task via chat

### 8.3 — Full worker flow
```bash
# Register worker
curl -X POST https://openclaw-jobs.pages.dev/api/worker/connect \
  -H "Content-Type: application/json" \
  -d '{"worker_type":"claude"}'

# Claim task (using token from above)
curl https://openclaw-jobs.pages.dev/api/work/next \
  -H "Authorization: Bearer TOKEN_FROM_ABOVE"

# Submit result
curl -X POST https://openclaw-jobs.pages.dev/api/work/submit \
  -H "Authorization: Bearer TOKEN_FROM_ABOVE" \
  -H "Content-Type: application/json" \
  -d '{"task_id":"TASK_ID","output":{"response":"Test result from staging worker"}}'
```

### 8.4 — Admin config
```bash
curl https://openclaw-jobs.pages.dev/api/admin/config/pricing \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET"
```

### 8.5 — Cron endpoints
```bash
curl https://openclaw-jobs.pages.dev/api/cron/timeout-recovery \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Checkpoint**: `[ ] All flows verified on staging`

---

## Phase 9: Production Cutover (When Ready)

When the site is polished and ready for real users:

1. **Buy domain**: `openclaw.jobs` (or your preferred domain)
2. **Add domain to Cloudflare**: transfer nameservers or add as CNAME
3. **Stripe**: toggle from Test to Live mode → get new `sk_live_`, `pk_live_` keys, new Price IDs, new webhook
4. **Google OAuth**: publish consent screen (remove "Testing" restriction)
5. **MongoDB Atlas**: optionally upgrade cluster to M10+ for SLA
6. **Update all env vars** in Cloudflare Pages to production values
7. **Update `NEXTAUTH_URL`** to `https://openclaw.jobs`
8. **Re-seed database** (or start fresh) on production cluster
9. **Set up Cloudflare Cron Triggers** (see FIRST_DEPLOY.md Step 8)
10. **Remove Cloudflare Access** protection
11. **Announce**

---

## Quick Reference: All Environment Variables

```env
# ─── Database ──────────────────────────
MONGODB_URI=                    # Phase 1

# ─── Auth ──────────────────────────────
NEXTAUTH_SECRET=                # Phase 2
NEXTAUTH_URL=                   # Phase 7 (staging URL)

# ─── AWS Cognito ──────────────────────
COGNITO_CLIENT_ID=              # Phase 3
COGNITO_CLIENT_SECRET=          # Phase 3
COGNITO_ISSUER=                 # Phase 3

# ─── Stripe ────────────────────────────
STRIPE_SECRET_KEY=              # Phase 5
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=  # Phase 5
STRIPE_WEBHOOK_SECRET=          # Phase 7.5
STRIPE_PRICE_500=               # Phase 5
STRIPE_PRICE_2000=              # Phase 5
STRIPE_PRICE_10000=             # Phase 5
STRIPE_PRICE_50000=             # Phase 5

# ─── Platform ─────────────────────────
ADMIN_SECRET=                   # Phase 2
CRON_SECRET=                    # Phase 2
NODE_ENV=production
```

---

## Current Progress

| Phase | Status | Notes |
|-------|--------|-------|
| 0. Pre-flight | Done | |
| 1. MongoDB Atlas | Done | Cluster: cluster0.ywbfos4, DB: openclaw-jobs |
| 2. Auth Secrets | Done | NEXTAUTH_SECRET, ADMIN_SECRET, CRON_SECRET generated |
| 3. AWS Cognito | Done | User Pool: openclaw-jobs-staging (us-west-2) |
| 4. ~~GitHub OAuth~~ | Removed | Replaced by Cognito |
| 5. Stripe | Pending | |
| 6. Local Smoke Test | Pending | |
| 7. Cloudflare Deploy | Pending | |
| 8. Staging Verification | Pending | |
| 9. Production Cutover | Blocked | After all testing complete |
