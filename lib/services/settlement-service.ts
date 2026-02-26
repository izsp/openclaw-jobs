/**
 * Settlement service — financial settlement after task completion.
 * Handles commission calculation, worker credit, and QA spot-check injection.
 */
import { nanoid } from "nanoid";
import { COLLECTIONS, ID_PREFIX } from "@/lib/constants";
import type {
  TaskDocument,
  TaskInternal,
  WorkerDocument,
} from "@/lib/types";
import { getDb } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { freezeEarning } from "./balance-service";

const DEFAULT_FREEZE_HOURS = 24;

/**
 * Calculates commission and freezes worker earnings after task completion.
 * Earnings go to frozen_cents and mature after the configurable freeze window.
 * Commission rate is tier-specific, pulled from config.
 *
 * @returns Amount earned by worker in cents (before freeze)
 */
export async function settleTaskPayment(
  worker: WorkerDocument,
  task: TaskDocument,
): Promise<number> {
  const tiersConfig = await getConfig("tiers");
  const tierLevel = tiersConfig?.levels[worker.tier];
  const commissionRate = tierLevel?.commission ?? 0.25;

  const earnedCents = Math.floor(task.price_cents * (1 - commissionRate));

  if (earnedCents > 0) {
    const commissionsConfig = await getConfig("commissions");
    const freezeHours = commissionsConfig?.freeze_window_hours ?? DEFAULT_FREEZE_HOURS;
    const maturityAt = new Date(Date.now() + freezeHours * 60 * 60 * 1000);

    // WHY: Earnings freeze in frozen_cents for the configured window
    // before becoming available for withdrawal.
    await freezeEarning(worker._id, earnedCents, task._id, maturityAt);
  }

  return earnedCents;
}

/**
 * Injects a spot-check QA task with probability based on worker tier.
 * Spot-check duplicates the task input for independent re-execution.
 * The spot-check task appears identical to a regular task for workers.
 */
export async function maybeInjectSpotCheck(
  originalTask: TaskDocument,
  worker: WorkerDocument,
): Promise<void> {
  const qaConfig = await getConfig("qa");
  if (!qaConfig) return;

  const rate = qaConfig.spot_check_rates[worker.tier] ?? 0;
  if (Math.random() >= rate) return;

  const spotCheckId = `${ID_PREFIX.TASK}${nanoid()}`;
  const spotCheckInternal: TaskInternal = {
    is_qa: true,
    qa_type: "spot_check",
    original_task_id: originalTask._id,
    expected_output: null,
    qa_result: null,
    funded_by: "platform",
  };

  const spotCheckTask: TaskDocument = {
    ...originalTask,
    _id: spotCheckId,
    status: "pending",
    worker_id: null,
    assigned_at: null,
    output: null,
    completed_at: null,
    _internal: spotCheckInternal,
    created_at: new Date(),
  };

  const db = await getDb();
  await db
    .collection<TaskDocument>(COLLECTIONS.TASK)
    .insertOne(spotCheckTask);
}
