/**
 * Default seed data for the platform_config collection.
 * These values match the types defined in lib/types/config.types.ts.
 */
import type {
  PricingConfig,
  TiersConfig,
  CommissionsConfig,
  SignupConfig,
  QaConfig,
  RateLimitsConfig,
} from "../../lib/types/config.types";

export const DEFAULT_PRICING: PricingConfig = {
  _id: "pricing",
  chat: { base_cents: 2, multi_turn: [
    { up_to_message: 3, price_cents: 2 },
    { up_to_message: 7, price_cents: 5 },
    { up_to_message: 999, price_cents: 10 },
  ]},
  translate: { base_cents: 1, per_segment: true },
  code: { base_cents: 5 },
  analyze: { base_cents: 20 },
  research: { base_cents: 50 },
  updated_at: new Date(),
  updated_by: "system_seed",
};

export const DEFAULT_TIERS: TiersConfig = {
  _id: "tiers",
  levels: {
    new:     { min_tasks: 0,    min_completion: 0,    max_credit_rate: 1.0,  commission: 0.25 },
    proven:  { min_tasks: 50,   min_completion: 0.90, max_credit_rate: 0.05, commission: 0.20 },
    trusted: { min_tasks: 200,  min_completion: 0.95, max_credit_rate: 0.03, commission: 0.15 },
    elite:   { min_tasks: 1000, min_completion: 0.98, max_credit_rate: 0.01, commission: 0.10 },
  },
  updated_at: new Date(),
};

export const DEFAULT_COMMISSIONS: CommissionsConfig = {
  _id: "commissions",
  standard: 0.20,
  skill: 0.15,
  subscription: 0.15,
  volume_discounts: [
    { min_tasks: 500,  commission: 0.20 },
    { min_tasks: 2000, commission: 0.18 },
    { min_tasks: 5000, commission: 0.15 },
  ],
  freeze_window_hours: 24,
  min_withdrawal_cents: 500,
  daily_withdrawal_limit_cents: 50000,
  updated_at: new Date(),
};

export const DEFAULT_SIGNUP: SignupConfig = {
  _id: "signup",
  buyer_free_credit_cents: 50,
  first_deposit_bonus_pct: 0.20,
  referral_buyer_credit_cents: 100,
  referral_seller_pct: 0.05,
  updated_at: new Date(),
};

export const DEFAULT_QA: QaConfig = {
  _id: "qa",
  spot_check_rates: {
    new: 0.15,
    proven: 0.08,
    trusted: 0.04,
    elite: 0.02,
    suspicious: 0.30,
  },
  shadow_execution_rate: 0.03,
  similarity_thresholds: {
    pass: 0.70,
    flag: 0.40,
  },
  penalty: {
    first_fail: "warning",
    second_fail: { deduct_pct: 0.20, downgrade: true },
    third_fail: { ban: true, freeze_balance: true },
  },
  updated_at: new Date(),
};

export const DEFAULT_RATE_LIMITS: RateLimitsConfig = {
  _id: "rate_limits",
  registration: { per_ip_per_min: 3, fingerprint_per_hour: 5 },
  work_next: { new_per_min: 2, established_per_min: 10 },
  task_submit: { per_min: 20 },
  withdrawal: { daily_max_cents: 10000, min_cents: 1000 },
  updated_at: new Date(),
};

export const ALL_SEED_CONFIGS = [
  DEFAULT_PRICING,
  DEFAULT_TIERS,
  DEFAULT_COMMISSIONS,
  DEFAULT_SIGNUP,
  DEFAULT_QA,
  DEFAULT_RATE_LIMITS,
];
