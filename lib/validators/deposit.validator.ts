/**
 * Zod schemas for deposit/payment API input validation.
 */
import { z } from "zod";

/** POST /api/deposit — create Stripe Checkout session. */
export const createDepositSchema = z.object({
  amount_cents: z
    .number()
    .int()
    .refine((v) => [500, 1000, 2000, 5000].includes(v), {
      message: "Amount must be 500, 1000, 2000, or 5000 cents",
    }),
});
