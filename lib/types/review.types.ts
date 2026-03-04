/** Review verdict output from supervisor bot evaluation. */
export interface ReviewVerdict {
  quality_score: number;
  relevance: "high" | "medium" | "low";
  accuracy: "high" | "medium" | "low" | "uncertain";
  presentation: "good" | "acceptable" | "poor";
  verdict: "approve" | "flag" | "reject";
  reasoning: string;
  issues: string[];
}

/** Review configuration stored in platform_config collection. */
export interface ReviewConfig {
  _id: "review";
  /** Probability a completed task triggers a review (0.1 = 10%). */
  review_rate: number;
  /** Minimum task price in cents to trigger a review. */
  min_price_for_review: number;
  /** Supervisor's share of the platform commission (0.20 = 20%). */
  supervisor_commission_rate: number;
  /** Score below which buyer gets auto-credited. */
  auto_credit_threshold: number;
  /** Score below which worker gets penalized. */
  penalty_threshold: number;
  updated_at?: Date;
}
