/**
 * Withdrawal service — handles worker cash-out requests.
 * Validates withdrawal amount against available (non-frozen) balance and config limits.
 * Actual payout (Stripe Connect / PayPal / Solana) is a placeholder for Phase 10.
 */
import { COLLECTIONS } from "@/lib/constants";
import type { BalanceDocument, TransactionDocument } from "@/lib/types";
import { getDb } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { BalanceError, ValidationError } from "@/lib/errors";
import { nanoid } from "nanoid";

const DEFAULT_MIN_WITHDRAWAL = 500;
const DEFAULT_DAILY_LIMIT = 50000;

interface WithdrawalResult {
  /** Amount withdrawn in cents. */
  amount_cents: number;
  /** Available balance after withdrawal. */
  balance_after: number;
  /** Payout status (always "pending" until Stripe Connect integration). */
  payout_status: "pending";
}

/**
 * Processes a worker withdrawal request.
 * Checks available balance, minimum, and daily limit before deducting.
 *
 * @param workerId - Worker requesting the withdrawal
 * @param amountCents - Amount to withdraw in cents
 * @returns Withdrawal result with updated balance
 * @throws BalanceError if insufficient available balance
 * @throws ValidationError if below minimum or exceeds daily limit
 */
export async function requestWithdrawal(
  workerId: string,
  amountCents: number,
): Promise<WithdrawalResult> {
  const commissionsConfig = await getConfig("commissions");
  const minCents = commissionsConfig?.min_withdrawal_cents ?? DEFAULT_MIN_WITHDRAWAL;
  const dailyLimit = commissionsConfig?.daily_withdrawal_limit_cents ?? DEFAULT_DAILY_LIMIT;

  if (amountCents < minCents) {
    throw new ValidationError(`Minimum withdrawal is ${minCents} cents`);
  }

  const todayUsed = await getTodayWithdrawalTotal(workerId);
  if (todayUsed + amountCents > dailyLimit) {
    throw new ValidationError(
      `Daily withdrawal limit is ${dailyLimit} cents (${todayUsed} already withdrawn today)`,
    );
  }

  const db = await getDb();

  // WHY: Conditional update ensures amount_cents >= amountCents (only available, not frozen).
  const result = await db
    .collection<BalanceDocument>(COLLECTIONS.BALANCE)
    .findOneAndUpdate(
      { _id: workerId, amount_cents: { $gte: amountCents } },
      { $inc: { amount_cents: -amountCents, total_withdrawn: amountCents } },
      { returnDocument: "after" },
    );

  if (!result) {
    throw new BalanceError("Insufficient available balance for withdrawal");
  }

  const tx: TransactionDocument = {
    _id: nanoid(),
    user_id: workerId,
    type: "withdraw",
    amount_cents: -amountCents,
    balance_after: result.amount_cents,
    ref_id: null,
    created_at: new Date(),
  };
  await db.collection<TransactionDocument>(COLLECTIONS.TRANSACTION).insertOne(tx);

  // TODO: Phase 10 — trigger actual payout via Stripe Connect, PayPal, or Solana
  // based on worker's bound payout method. For now, mark as "pending".

  return {
    amount_cents: amountCents,
    balance_after: result.amount_cents,
    payout_status: "pending",
  };
}

/**
 * Sums up all withdrawals for a worker in the current UTC day.
 */
async function getTodayWithdrawalTotal(workerId: string): Promise<number> {
  const db = await getDb();
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const withdrawals = await db
    .collection<TransactionDocument>(COLLECTIONS.TRANSACTION)
    .find({
      user_id: workerId,
      type: "withdraw",
      created_at: { $gte: startOfDay },
    })
    .toArray();

  return withdrawals.reduce((sum, tx) => sum + Math.abs(tx.amount_cents), 0);
}
