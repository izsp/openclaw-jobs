import type { TRANSACTION_TYPES } from "@/lib/constants";

/** Transaction type literal derived from constants. */
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

/** MongoDB document shape for the `balance` collection. */
export interface BalanceDocument {
  /** Same as user_id — one balance per user. */
  _id: string;
  /** Current available balance in 🦐 (cents). */
  amount_cents: number;
  /** Frozen earnings (24h hold before withdrawal). */
  frozen_cents: number;
  /** Lifetime total deposits. */
  total_deposited: number;
  /** Lifetime total earned from tasks. */
  total_earned: number;
  /** Lifetime total withdrawn. */
  total_withdrawn: number;
}

/** MongoDB document shape for the `frozen_earning` collection. */
export interface FrozenEarningDocument {
  _id: string;
  /** Worker who earned this amount. */
  worker_id: string;
  /** Task that generated this earning. */
  task_id: string;
  /** Frozen amount in cents. */
  amount_cents: number;
  /** When the earning was frozen. */
  frozen_at: Date;
  /** When the earning becomes available (frozen_at + freeze_window). */
  maturity_at: Date;
}

/** MongoDB document shape for the `transaction` collection. */
export interface TransactionDocument {
  _id: string;
  user_id: string;
  type: TransactionType;
  /** Positive for credits, negative for debits. */
  amount_cents: number;
  /** User's balance after this transaction. */
  balance_after: number;
  /** Related task_id or withdrawal_id. */
  ref_id: string | null;
  created_at: Date;
}
