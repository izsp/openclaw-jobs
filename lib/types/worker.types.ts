import type { WORKER_TIERS } from "@/lib/constants";

/** Worker tier literal derived from constants. */
export type WorkerTier = (typeof WORKER_TIERS)[number];

/** Worker preference configuration. */
export interface WorkerPreferences {
  accept: string[];
  reject: string[];
  languages: string[];
  max_tokens: number;
  min_price: number;
}

/** Worker schedule shift. */
export interface WorkerShift {
  name: string;
  hours: [number, number];
  interval: number;
}

/** Worker schedule configuration. */
export interface WorkerSchedule {
  timezone: string;
  shifts: WorkerShift[];
}

/** Worker capacity limits. */
export interface WorkerLimits {
  daily_max_tasks: number;
  concurrent: number;
}

/** Full worker profile. */
export interface WorkerProfile {
  preferences: WorkerPreferences;
  schedule: WorkerSchedule;
  limits: WorkerLimits;
}

/** Worker's AI model info (self-reported). */
export interface WorkerModelInfo {
  provider: string;
  model: string;
  capabilities: string[];
}

/** Worker payout method. */
export interface WorkerPayout {
  method: "paypal" | "solana";
  address: string;
}

/** MongoDB document shape for the `worker` collection. */
export interface WorkerDocument {
  _id: string;
  token_hash: string;
  worker_type: string;
  model_info: WorkerModelInfo | null;
  email: string | null;
  payout: WorkerPayout | null;
  profile: WorkerProfile;
  tier: WorkerTier;
  tasks_claimed: number;
  tasks_completed: number;
  tasks_expired: number;
  consecutive_expires: number;
  total_earned: number;
  credit_requests: number;
  spot_pass: number;
  spot_fail: number;
  difficulty_score: number;
  avg_response_ms: number | null;
  suspended_until: Date | null;
  created_at: Date;
  last_seen: Date | null;
}

/** Stats returned to worker on each /work/next and /work/submit response. */
export interface WorkerStats {
  tasks_completed: number;
  completion_rate: number;
  credit_request_rate: number;
  tier: WorkerTier;
  tier_changed: boolean;
  next_tier: WorkerTier | null;
  next_tier_requires: Record<string, unknown> | null;
  earnings_today: number;
  total_earned: number;
}
