import type { CONFIG_KEYS } from "@/lib/constants";
import type { WorkerTier } from "@/lib/types/worker.types";

/** Valid config key literal derived from constants. */
export type ConfigKey = (typeof CONFIG_KEYS)[number];

/** Multi-turn pricing tier. */
export interface MultiTurnTier {
  up_to_message: number;
  price_cents: number;
}

/** Task type pricing definition. */
export interface TaskPricing {
  base_cents: number;
  multi_turn?: MultiTurnTier[];
  per_segment?: boolean;
}

/** Pricing config document. */
export interface PricingConfig {
  _id: "pricing";
  [taskType: string]: TaskPricing | string | Date | undefined;
  updated_at?: Date;
  updated_by?: string;
}

/** Requirements and benefits for a single tier. */
export interface TierLevel {
  min_tasks: number;
  min_completion: number;
  max_credit_rate: number;
  commission: number;
}

/** Tiers config document. */
export interface TiersConfig {
  _id: "tiers";
  levels: Record<WorkerTier, TierLevel>;
  updated_at?: Date;
}

/** Volume discount bracket. */
export interface VolumeDiscount {
  min_tasks: number;
  commission: number;
}

/** Commissions config document. */
export interface CommissionsConfig {
  _id: "commissions";
  standard: number;
  skill: number;
  subscription: number;
  volume_discounts: VolumeDiscount[];
  /** Hours before worker earnings become withdrawable. Default 24. */
  freeze_window_hours: number;
  /** Minimum withdrawal amount in cents. */
  min_withdrawal_cents: number;
  /** Maximum daily withdrawal amount in cents. */
  daily_withdrawal_limit_cents: number;
  updated_at?: Date;
}

/** Signup incentives config document. */
export interface SignupConfig {
  _id: "signup";
  buyer_free_credit_cents: number;
  first_deposit_bonus_pct: number;
  referral_buyer_credit_cents: number;
  referral_seller_pct: number;
  updated_at?: Date;
}

/** Spot-check rates by tier. */
export type SpotCheckRates = Record<WorkerTier | "suspicious", number>;

/** Similarity comparison thresholds. */
export interface SimilarityThresholds {
  pass: number;
  flag: number;
}

/** Penalty configuration for spot-check failures. */
export interface PenaltyConfig {
  first_fail: string;
  second_fail: { deduct_pct: number; downgrade: boolean };
  third_fail: { ban: boolean; freeze_balance: boolean };
}

/** QA config document. */
export interface QaConfig {
  _id: "qa";
  spot_check_rates: SpotCheckRates;
  shadow_execution_rate: number;
  similarity_thresholds: SimilarityThresholds;
  penalty: PenaltyConfig;
  updated_at?: Date;
}

/** Rate limit settings for a specific operation. */
export interface RateLimitRule {
  per_ip_per_min?: number;
  fingerprint_per_hour?: number;
  new_per_min?: number;
  established_per_min?: number;
  per_min?: number;
  daily_max_cents?: number;
  min_cents?: number;
}

/** Rate limits config document. */
export interface RateLimitsConfig {
  _id: "rate_limits";
  registration: RateLimitRule;
  work_next: RateLimitRule;
  task_submit: RateLimitRule;
  withdrawal: RateLimitRule;
  updated_at?: Date;
}

/** Union of all config document types. */
export type PlatformConfigDocument =
  | PricingConfig
  | TiersConfig
  | CommissionsConfig
  | SignupConfig
  | QaConfig
  | RateLimitsConfig;

/** Map from config key to its typed document. */
export interface ConfigMap {
  pricing: PricingConfig;
  tiers: TiersConfig;
  commissions: CommissionsConfig;
  signup: SignupConfig;
  qa: QaConfig;
  rate_limits: RateLimitsConfig;
}
