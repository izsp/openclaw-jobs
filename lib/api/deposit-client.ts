/**
 * Frontend API client for deposit (Stripe Checkout) operations.
 */
import { fetchApi } from "./fetch-api";

export interface CheckoutResult {
  session_id: string;
  url: string;
}

/** Creates a Stripe Checkout session and returns the redirect URL. */
export async function createCheckout(amountCents: number): Promise<CheckoutResult> {
  return fetchApi<CheckoutResult>("/api/deposit", {
    method: "POST",
    body: JSON.stringify({ amount_cents: amountCents }),
  });
}
