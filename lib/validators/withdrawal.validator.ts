/**
 * Zod schemas for withdrawal API input validation.
 */
import { z } from "zod";

/** POST /api/worker/withdraw — request a withdrawal. */
export const requestWithdrawalSchema = z.object({
  amount_cents: z
    .number()
    .int()
    .positive("Withdrawal amount must be positive"),
});
