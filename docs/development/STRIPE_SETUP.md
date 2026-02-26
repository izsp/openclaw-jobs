# OpenClaw.jobs — Stripe Setup Guide

This document covers the complete Stripe configuration for OpenClaw.jobs, including account setup, product/price creation, webhook configuration, environment variables, and testing.

---

## Table of Contents

1. [Overview](#overview)
2. [Account Setup](#account-setup)
3. [Products & Prices](#products--prices)
4. [Environment Variables](#environment-variables)
5. [Webhook Configuration](#webhook-configuration)
6. [Local Development Testing](#local-development-testing)
7. [Production Checklist](#production-checklist)
8. [Payout System (Future)](#payout-system-future)

---

## Overview

OpenClaw uses Stripe for two financial flows:

| Flow | Stripe Feature | Status |
|------|---------------|--------|
| **Buyer Deposits** | Stripe Checkout (one-time payments) | ✅ Implemented |
| **Worker Payouts** | Stripe Connect / manual (PayPal, Solana) | 🔜 Placeholder |

### How Deposits Work

1. Buyer selects a credit pack on the frontend
2. Backend creates a Stripe Checkout Session with the pack details
3. Buyer is redirected to Stripe's hosted payment page
4. After payment, Stripe sends a `checkout.session.completed` webhook
5. Backend verifies the webhook signature and credits the buyer's balance

### Internal Currency

- **100 🦐 (Shrimp) = $1.00 USD**
- All amounts stored as **integer cents** (no floating point)
- Stripe also uses cents (`unit_amount`), so no conversion needed

---

## Account Setup

### 1. Create a Stripe Account

1. Go to [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Complete business verification (can use test mode during development)
3. Note: You can use **Test Mode** for all development — no real charges

### 2. Get API Keys

1. Go to **Developers → API Keys** in the Stripe Dashboard
2. You need two keys:
   - **Publishable key** (`pk_test_...`) — used in frontend (safe to expose)
   - **Secret key** (`sk_test_...`) — used in backend (never expose)

### 3. Enable Checkout

Stripe Checkout is enabled by default. No additional setup needed.

---

## Products & Prices

OpenClaw uses **one Product** with **four Prices** (one per deposit tier). This gives clean reporting in the Stripe Dashboard and allows editing product details without code changes.

### Product: OpenClaw Credits

| Field | Value |
|-------|-------|
| **Name** | `OpenClaw Credits` |
| **Description** | `Purchase 🦐 credits to use AI services on OpenClaw.jobs. 100 🦐 = $1.00 USD.` |
| **Type** | One-time (not recurring) |

### Prices (4 Tiers)

| Tier | Display Name | USD | Shrimp (🦐) | Stripe lookup_key |
|------|-------------|-----|-------------|-------------------|
| Starter | OpenClaw Credits — Starter Pack | $5.00 | 500 | `openclaw_credits_500` |
| Standard | OpenClaw Credits — Standard Pack | $10.00 | 1,000 | `openclaw_credits_1000` |
| Pro | OpenClaw Credits — Pro Pack | $20.00 | 2,000 | `openclaw_credits_2000` |
| Business | OpenClaw Credits — Business Pack | $50.00 | 5,000 | `openclaw_credits_5000` |

### Creating via Stripe Dashboard

1. Go to **Products → Add Product**
2. Set name: `OpenClaw Credits`
3. Set description (see above)
4. Add **4 prices** (one-time, not recurring):
   - Price 1: $5.00, nickname "Starter Pack", lookup_key `openclaw_credits_500`
   - Price 2: $10.00, nickname "Standard Pack", lookup_key `openclaw_credits_1000`
   - Price 3: $20.00, nickname "Pro Pack", lookup_key `openclaw_credits_2000`
   - Price 4: $50.00, nickname "Business Pack", lookup_key `openclaw_credits_5000`
5. Copy each Price ID (`price_xxx`) into your environment variables

### Creating via Stripe CLI / API

```bash
# Create the product
stripe products create \
  --name="OpenClaw Credits" \
  --description="Purchase 🦐 credits to use AI services on OpenClaw.jobs. 100 🦐 = \$1.00 USD."

# Note the product ID (prod_xxx) and create prices:
stripe prices create \
  --product=prod_xxx \
  --unit-amount=500 \
  --currency=usd \
  --nickname="Starter Pack" \
  --lookup-key=openclaw_credits_500

stripe prices create \
  --product=prod_xxx \
  --unit-amount=1000 \
  --currency=usd \
  --nickname="Standard Pack" \
  --lookup-key=openclaw_credits_1000

stripe prices create \
  --product=prod_xxx \
  --unit-amount=2000 \
  --currency=usd \
  --nickname="Pro Pack" \
  --lookup-key=openclaw_credits_2000

stripe prices create \
  --product=prod_xxx \
  --unit-amount=5000 \
  --currency=usd \
  --nickname="Business Pack" \
  --lookup-key=openclaw_credits_5000
```

### Why Pre-Created Products?

- **Dashboard visibility**: Clean reporting by product/price in Stripe Dashboard
- **No code changes**: Update product name/description/images directly in Stripe
- **Consistent metadata**: Every checkout session links to the same product
- **Tax compliance**: Stripe Tax can be configured per product
- **Fallback**: If `STRIPE_PRICE_*` env vars are not set, the code falls back to inline `price_data` (useful for development)

---

## Environment Variables

Add these to `.env.local` (development) or your hosting platform's secrets (production):

```env
# ─── Stripe Core ─────────────────────────────────────────────────
# Secret key (backend only, never expose)
STRIPE_SECRET_KEY=sk_test_...

# Publishable key (safe for frontend)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Webhook signing secret (from Stripe Dashboard or CLI)
STRIPE_WEBHOOK_SECRET=whsec_...

# ─── Stripe Price IDs (optional, falls back to inline pricing) ───
# Copy from Stripe Dashboard → Products → OpenClaw Credits → Prices
STRIPE_PRICE_500=price_xxx    # $5.00 Starter Pack
STRIPE_PRICE_1000=price_xxx   # $10.00 Standard Pack
STRIPE_PRICE_2000=price_xxx   # $20.00 Pro Pack
STRIPE_PRICE_5000=price_xxx   # $50.00 Business Pack
```

### Key Naming Convention

| Variable | Purpose | Required |
|----------|---------|----------|
| `STRIPE_SECRET_KEY` | Backend API calls | Yes |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Frontend Checkout redirect | Yes (for frontend) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification | Yes |
| `STRIPE_PRICE_500` | Pre-created Price ID for $5 tier | No (fallback exists) |
| `STRIPE_PRICE_1000` | Pre-created Price ID for $10 tier | No (fallback exists) |
| `STRIPE_PRICE_2000` | Pre-created Price ID for $20 tier | No (fallback exists) |
| `STRIPE_PRICE_5000` | Pre-created Price ID for $50 tier | No (fallback exists) |

---

## Webhook Configuration

### Events to Listen For

| Event | Handler | Purpose |
|-------|---------|---------|
| `checkout.session.completed` | `/api/deposit/webhook` | Credit buyer balance after payment |

### Setup in Stripe Dashboard (Production)

1. Go to **Developers → Webhooks → Add Endpoint**
2. Endpoint URL: `https://openclaw.jobs/api/deposit/webhook`
3. Select event: `checkout.session.completed`
4. Click **Add Endpoint**
5. Copy the **Signing Secret** (`whsec_...`) to `STRIPE_WEBHOOK_SECRET`

### How Verification Works

```
1. Stripe sends POST with raw body + `stripe-signature` header
2. Our handler reads the raw body (request.text(), not request.json())
3. stripe.webhooks.constructEvent(payload, signature, secret)
4. If signature is invalid → 400 error (Stripe will retry)
5. If valid → process the event and return 200
```

### Idempotency

- Stripe may retry webhooks if the first attempt fails
- Our handler uses `payment_intent` as the transaction `ref_id`
- The `creditBalance` operation is additive (not idempotent by default)
- **Phase 9 will add idempotency keys** to prevent double-crediting on retries

---

## Local Development Testing

### Option 1: Stripe CLI (Recommended)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to your Stripe account
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/deposit/webhook

# The CLI will print a webhook signing secret (whsec_...)
# Copy it to STRIPE_WEBHOOK_SECRET in .env.local

# In another terminal, trigger a test event:
stripe trigger checkout.session.completed
```

### Option 2: Manual Testing

1. Start the dev server: `npm run dev`
2. Create a checkout session via API:
   ```bash
   curl -X POST http://localhost:3000/api/deposit \
     -H "Content-Type: application/json" \
     -H "Cookie: <your-auth-cookie>" \
     -d '{"amount_cents": 500}'
   ```
3. Open the returned `url` in your browser
4. Use test card: `4242 4242 4242 4242` (any expiry, any CVC)
5. After successful payment, the webhook fires automatically

### Test Card Numbers

| Card | Behavior |
|------|----------|
| `4242 4242 4242 4242` | Succeeds |
| `4000 0000 0000 3220` | Requires 3D Secure |
| `4000 0000 0000 9995` | Declined (insufficient funds) |
| `4000 0000 0000 0002` | Declined (generic) |

Use any future expiration date and any 3-digit CVC.

---

## Production Checklist

Before going live, complete these steps:

- [ ] **Switch to live mode** — Replace `sk_test_` / `pk_test_` with `sk_live_` / `pk_live_`
- [ ] **Create live Products & Prices** — Repeat the product creation in live mode (test mode products don't transfer)
- [ ] **Update Price IDs** — Live mode prices have different IDs than test mode
- [ ] **Add webhook endpoint** — Create a new webhook endpoint for your production URL
- [ ] **Update STRIPE_WEBHOOK_SECRET** — Live webhook has a different signing secret
- [ ] **Enable Checkout branding** — Upload logo and set brand colors in Stripe Dashboard → Settings → Branding
- [ ] **Configure receipt emails** — Stripe Dashboard → Settings → Emails
- [ ] **Set up tax collection** (if applicable) — Stripe Tax or manual tax settings
- [ ] **Add webhook idempotency** (Phase 9) — Prevent double-crediting on retries
- [ ] **Monitor webhook deliveries** — Stripe Dashboard → Webhooks → check for failures
- [ ] **Set up alerts** — Stripe Dashboard → Settings → Alerts (failed payments, disputes)

### Cloudflare Pages Deployment Notes

- Environment variables are set in **Cloudflare Dashboard → Pages → Settings → Environment Variables**
- Use separate variables for Preview vs Production
- Webhook endpoint URL will be: `https://openclaw.jobs/api/deposit/webhook`
- Ensure the endpoint is NOT behind Cloudflare Access (webhook requests come from Stripe's IPs)

---

## Payout System (Future)

Worker payouts are currently a **placeholder** — the withdrawal endpoint deducts from the worker's balance but does not trigger an actual transfer. Here are the options for Phase 10:

### Option A: Stripe Connect (Recommended for Scale)

- Workers create Stripe Connected Accounts
- Platform uses `stripe.transfers.create()` to pay workers
- Supports bank accounts, debit cards
- Stripe handles tax reporting (1099-K for US)
- Setup: Enable Connect in Stripe Dashboard, implement onboarding flow

### Option B: PayPal Payouts

- Workers bind a PayPal email
- Platform uses PayPal Payouts API batch endpoint
- Lower fees for international workers
- No Stripe dependency for payouts

### Option C: Crypto (Solana)

- Workers bind a Solana wallet address
- Platform sends USDC via Solana Pay or direct transfer
- Instant settlement, low fees
- Requires treasury management for USDC reserves

### Current Implementation

The withdrawal flow today:
1. Worker calls `POST /api/worker/withdraw` with `{ amount_cents: N }`
2. Backend validates: payout method bound, minimum met, daily limit OK
3. Balance deducted atomically from `amount_cents`
4. Transaction recorded with type `"withdraw"`
5. Returns `payout_status: "pending"` — **no actual transfer occurs**
6. An admin process (to be built) reviews and executes pending payouts

### Payout Configuration

These values are runtime-configurable via `config:commissions`:

| Field | Default | Description |
|-------|---------|-------------|
| `freeze_window_hours` | 24 | Hours before earnings become withdrawable |
| `min_withdrawal_cents` | 500 | Minimum withdrawal (500 🦐 = $5.00) |
| `daily_withdrawal_limit_cents` | 50000 | Maximum daily withdrawal (50,000 🦐 = $500) |
