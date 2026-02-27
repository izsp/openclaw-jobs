/**
 * Zod schemas for deposit/payment API input validation.
 */
import { z } from "zod";

/** POST /api/deposit — create Stripe Checkout session. */
export const createDepositSchema = z.object({
  amount_cents: z
    .number()
    .int()
    .refine((v) => [500, 2000, 10000, 50000].includes(v), {
      message: "Amount must be 500, 2000, 10000, or 50000 cents",
    }),
});
