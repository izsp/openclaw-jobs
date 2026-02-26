/**
 * Worker stats builder — computes stats and tier progress for API responses.
 */
import type { WorkerDocument, WorkerTier, WorkerStats, TierLevel } from "@/lib/types";
import { getConfig } from "@/lib/config";

/**
 * Builds the WorkerStats object returned in /work/next and /work/submit.
 * Includes tier progress toward the next tier.
 *
 * @param worker - Current worker document
 * @param justCompleted - Whether a task was just completed in this request
 */
export async function buildWorkerStats(
  worker: WorkerDocument,
  justCompleted: boolean,
): Promise<WorkerStats> {
  const completed = worker.tasks_completed + (justCompleted ? 1 : 0);
  const total = completed + worker.tasks_expired;
  const completionRate = total > 0 ? completed / total : 0;
  const creditRate = completed > 0 ? worker.credit_requests / completed : 0;

  const tiersConfig = await getConfig("tiers");
  const nextTierInfo = calculateNextTier(
    worker.tier,
    completed,
    completionRate,
    creditRate,
    tiersConfig?.levels,
  );

  return {
    tasks_completed: completed,
    completion_rate: Math.round(completionRate * 100) / 100,
    credit_request_rate: Math.round(creditRate * 100) / 100,
    tier: worker.tier,
    tier_changed: false,
    next_tier: nextTierInfo.nextTier,
    next_tier_requires: nextTierInfo.requires,
    earnings_today: 0,
    total_earned: worker.total_earned,
  };
}

/**
 * Calculates progress toward the next tier.
 */
function calculateNextTier(
  currentTier: WorkerTier,
  tasksCompleted: number,
  completionRate: number,
  creditRate: number,
  levels?: Record<WorkerTier, TierLevel>,
): { nextTier: WorkerTier | null; requires: Record<string, unknown> | null } {
  const tierOrder: WorkerTier[] = ["new", "proven", "trusted", "elite"];
  const currentIndex = tierOrder.indexOf(currentTier);

  if (currentIndex >= tierOrder.length - 1 || !levels) {
    return { nextTier: null, requires: null };
  }

  const nextTier = tierOrder[currentIndex + 1];
  const nextLevel = levels[nextTier];

  return {
    nextTier,
    requires: {
      min_tasks: nextLevel.min_tasks,
      min_completion_rate: nextLevel.min_completion,
      max_credit_rate: nextLevel.max_credit_rate,
      tasks_remaining: Math.max(0, nextLevel.min_tasks - tasksCompleted),
      completion_rate_met: completionRate >= nextLevel.min_completion,
      credit_rate_met: creditRate <= nextLevel.max_credit_rate,
    },
  };
}
