/**
 * QA comparison engine — compares QA task outputs against originals.
 * Scores similarity across multiple dimensions and applies verdicts.
 * Called after a QA task (shadow/spot-check/benchmark) is completed.
 */
import { COLLECTIONS } from "@/lib/constants";
import type {
  TaskDocument,
  QaResult,
  QaVerdict,
  WorkerDocument,
} from "@/lib/types";
import { getDb } from "@/lib/db";
import { getConfig } from "@/lib/config";

/**
 * Compares a QA task's output against the reference (original or expected).
 * Updates the QA task's _internal.qa_result with the comparison result.
 * Applies penalties/rewards to the worker based on the verdict.
 *
 * @param qaTask - The completed QA task
 */
export async function compareQaResult(qaTask: TaskDocument): Promise<void> {
  if (!qaTask._internal.is_qa || !qaTask.output) return;

  const qaConfig = await getConfig("qa");
  if (!qaConfig) return;

  const referenceOutput = await getReferenceOutput(qaTask);
  if (!referenceOutput) return;

  const similarity = computeSimilarity(
    qaTask.output.content,
    referenceOutput,
  );

  const dimensions = {
    content_overlap: similarity,
    length_ratio: computeLengthRatio(qaTask.output.content, referenceOutput),
    format_match: qaTask.output.format === "text" ? 1 : 0.8,
  };

  const avgScore =
    Object.values(dimensions).reduce((a, b) => a + b, 0) /
    Object.values(dimensions).length;

  const verdict = scoreToVerdict(avgScore, qaConfig.similarity_thresholds);

  const qaResult: QaResult = { similarity: avgScore, dimensions, verdict };

  // Store the result on the QA task
  const db = await getDb();
  await db.collection<TaskDocument>(COLLECTIONS.TASK).updateOne(
    { _id: qaTask._id },
    { $set: { "_internal.qa_result": qaResult } },
  );

  // Apply consequences to the worker who completed the original task
  if (qaTask.worker_id) {
    await applyQaVerdict(qaTask.worker_id, verdict);
  }
}

/**
 * Gets the reference output to compare against.
 * For shadow/spot-check: the original task's output.
 * For benchmark: the expected_output from _internal.
 */
async function getReferenceOutput(
  qaTask: TaskDocument,
): Promise<string | null> {
  if (qaTask._internal.qa_type === "benchmark") {
    const expected = qaTask._internal.expected_output;
    return expected ? JSON.stringify(expected) : null;
  }

  // Shadow or spot-check — look up original task's output
  const originalId = qaTask._internal.original_task_id;
  if (!originalId) return null;

  const db = await getDb();
  const original = await db
    .collection<TaskDocument>(COLLECTIONS.TASK)
    .findOne({ _id: originalId });

  return original?.output?.content ?? null;
}

/**
 * Computes a basic text similarity score (0-1).
 * Uses word overlap (Jaccard similarity) as a simple baseline.
 * Production would use embeddings or more sophisticated NLP.
 */
export function computeSimilarity(textA: string, textB: string): number {
  const wordsA = new Set(textA.toLowerCase().split(/\s+/).filter(Boolean));
  const wordsB = new Set(textB.toLowerCase().split(/\s+/).filter(Boolean));

  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }

  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? intersection / union : 0;
}

/** Computes length ratio between two texts (0-1, closer = better). */
function computeLengthRatio(textA: string, textB: string): number {
  const lenA = textA.length;
  const lenB = textB.length;
  if (lenA === 0 && lenB === 0) return 1;
  if (lenA === 0 || lenB === 0) return 0;
  return Math.min(lenA, lenB) / Math.max(lenA, lenB);
}

/** Maps a score to a QA verdict based on configurable thresholds. */
function scoreToVerdict(
  score: number,
  thresholds: { pass: number; flag: number },
): QaVerdict {
  if (score >= thresholds.pass) return "pass";
  if (score >= thresholds.flag) return "flag";
  return "fail";
}

/**
 * Applies QA verdict consequences to a worker.
 * Updates spot_pass/spot_fail counters.
 */
async function applyQaVerdict(
  workerId: string,
  verdict: QaVerdict,
): Promise<void> {
  const db = await getDb();

  if (verdict === "pass") {
    await db.collection<WorkerDocument>(COLLECTIONS.WORKER).updateOne(
      { _id: workerId },
      { $inc: { spot_pass: 1 } },
    );
  } else if (verdict === "fail") {
    await db.collection<WorkerDocument>(COLLECTIONS.WORKER).updateOne(
      { _id: workerId },
      { $inc: { spot_fail: 1 } },
    );
  }
  // "flag" — no automatic action, flagged for human review
}
