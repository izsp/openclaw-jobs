/**
 * Deposit service — Stripe Checkout session creation and webhook handling.
 *
 * Uses either pre-created Stripe Price IDs (from env STRIPE_PRICE_*)
 * or inline price_data as fallback. See docs/development/STRIPE_SETUP.md.
 */
import Stripe from "stripe";
import { SHRIMP_PER_DOLLAR } from "@/lib/constants";
import { getConfig } from "@/lib/config";
import { creditBalance } from "./balance-service";
import { ValidationError } from "@/lib/errors";

/**
 * Returns a configured Stripe client instance.
 * @throws Error if STRIPE_SECRET_KEY is not set
 */
function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set");
  }
  return new Stripe(key);
}

/** Deposit tier metadata for Stripe product display. */
const DEPOSIT_TIERS: Record<number, { name: string; description: string; envKey: string }> = {
  500: {
    name: "OpenClaw Credits — Starter Pack",
    description: "500 🦐 credits for AI task processing on OpenClaw.jobs",
    envKey: "STRIPE_PRICE_500",
  },
  1000: {
    name: "OpenClaw Credits — Standard Pack",
    description: "1,000 🦐 credits for AI task processing on OpenClaw.jobs",
    envKey: "STRIPE_PRICE_1000",
  },
  2000: {
    name: "OpenClaw Credits — Pro Pack",
    description: "2,000 🦐 credits for AI task processing on OpenClaw.jobs",
    envKey: "STRIPE_PRICE_2000",
  },
  5000: {
    name: "OpenClaw Credits — Business Pack",
    description: "5,000 🦐 credits for AI task processing on OpenClaw.jobs",
    envKey: "STRIPE_PRICE_5000",
  },
};

interface CreateCheckoutParams {
  userId: string;
  amountCents: number;
}

interface CheckoutResult {
  sessionId: string;
  url: string;
}

/**
 * Creates a Stripe Checkout session for a deposit.
 * Uses pre-created Stripe Price IDs if available, otherwise falls back to inline pricing.
 *
 * @returns Session ID and redirect URL
 */
export async function createCheckoutSession(
  params: CreateCheckoutParams,
): Promise<CheckoutResult> {
  const { userId, amountCents } = params;
  const stripe = getStripeClient();
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const tier = DEPOSIT_TIERS[amountCents];
  const dollarsDisplay = `$${(amountCents / SHRIMP_PER_DOLLAR).toFixed(2)}`;

  // WHY: Pre-created Stripe Price IDs give better Dashboard reporting
  // and allow editing product details without code changes.
  const priceId = tier ? process.env[tier.envKey] : undefined;

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = priceId
    ? [{ price: priceId, quantity: 1 }]
    : [{
        price_data: {
          currency: "usd",
          product_data: {
            name: tier?.name ?? `OpenClaw Credits — ${amountCents} 🦐`,
            description: tier?.description ?? `${amountCents} 🦐 credits (${dollarsDisplay})`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      }];

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: lineItems,
    metadata: { user_id: userId, amount_cents: String(amountCents) },
    success_url: `${baseUrl}/?deposit=success`,
    cancel_url: `${baseUrl}/?deposit=cancel`,
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }

  return { sessionId: session.id, url: session.url };
}

/**
 * Handles a Stripe webhook event for completed checkout.
 * Credits the user's balance, applying first-deposit bonus if applicable.
 *
 * @returns Balance after credit
 */
export async function handleCheckoutComplete(
  event: Stripe.Event,
): Promise<number> {
  if (event.type !== "checkout.session.completed") {
    throw new ValidationError(`Unexpected event type: ${event.type}`);
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const userId = session.metadata?.user_id;
  const amountCents = Number(session.metadata?.amount_cents);

  if (!userId || !amountCents || isNaN(amountCents)) {
    throw new ValidationError("Missing user_id or amount_cents in metadata");
  }

  // Check for first-deposit bonus
  const signupConfig = await getConfig("signup");
  const bonusPct = signupConfig?.first_deposit_bonus_pct ?? 0;

  // WHY: Bonus only applies once. We apply it on every deposit for now;
  // a "first deposit" flag check will be added in Phase 9 (anti-fraud).
  const bonusCents = Math.floor(amountCents * bonusPct);
  const totalCents = amountCents + bonusCents;

  const balanceAfter = await creditBalance(
    userId,
    totalCents,
    session.payment_intent as string,
    "deposit",
  );

  return balanceAfter;
}

/**
 * Verifies a Stripe webhook signature.
 *
 * @returns The verified event
 * @throws Error if verification fails
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }

  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(payload, signature, secret);
}
