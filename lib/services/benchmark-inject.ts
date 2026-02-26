/**
 * Benchmark task injection — periodically injects tasks with known-good answers.
 * Used for: new worker calibration, quality baseline, detecting degradation.
 * Called by a Cloudflare Cron Trigger (e.g. every 5 minutes).
 */
import { nanoid } from "nanoid";
import { COLLECTIONS, ID_PREFIX } from "@/lib/constants";
import type { TaskDocument, TaskInternal } from "@/lib/types";
import { getDb } from "@/lib/db";

/** A benchmark template with known input and expected output. */
export interface BenchmarkTemplate {
  type: string;
  input: { messages: Array<{ role: string; content: string }>; context: Record<string, unknown> };
  expected_output: Record<string, unknown>;
  constraints: { timeout_seconds: number; min_output_length: number };
  price_cents: number;
}

/** Hardcoded benchmark templates. In production, these come from an admin API. */
const BENCHMARK_TEMPLATES: BenchmarkTemplate[] = [
  {
    type: "chat",
    input: {
      messages: [{ role: "user", content: "What is 2 + 2? Answer with just the number." }],
      context: {},
    },
    expected_output: { answer: "4" },
    constraints: { timeout_seconds: 30, min_output_length: 1 },
    price_cents: 2,
  },
  {
    type: "translate",
    input: {
      messages: [{ role: "user", content: "Translate 'hello world' to Spanish." }],
      context: {},
    },
    expected_output: { answer: "hola mundo" },
    constraints: { timeout_seconds: 30, min_output_length: 1 },
    price_cents: 3,
  },
  {
    type: "code",
    input: {
      messages: [{ role: "user", content: "Write a function that returns true if a number is even." }],
      context: {},
    },
    expected_output: { contains: "% 2" },
    constraints: { timeout_seconds: 60, min_output_length: 10 },
    price_cents: 5,
  },
];

/**
 * Injects a random benchmark task into the task queue.
 * The task looks identical to a real task but has _internal.qa_type = "benchmark".
 *
 * @returns The injected task ID, or null if injection was skipped
 */
export async function injectBenchmarkTask(): Promise<string | null> {
  const template =
    BENCHMARK_TEMPLATES[Math.floor(Math.random() * BENCHMARK_TEMPLATES.length)];

  const taskId = `${ID_PREFIX.TASK}${nanoid()}`;
  const now = new Date();
  const deadline = new Date(
    now.getTime() + template.constraints.timeout_seconds * 1000,
  );

  const internal: TaskInternal = {
    is_qa: true,
    qa_type: "benchmark",
    original_task_id: null,
    expected_output: template.expected_output,
    qa_result: null,
    funded_by: "platform",
  };

  const task: TaskDocument = {
    _id: taskId,
    buyer_id: "platform",
    type: template.type,
    input: template.input,
    input_preview: null,
    sensitive: false,
    constraints: template.constraints,
    price_cents: template.price_cents,
    status: "pending",
    worker_id: null,
    assigned_at: null,
    deadline,
    output: null,
    completed_at: null,
    purge_at: null,
    created_at: now,
    _internal: internal,
  };

  const db = await getDb();
  await db.collection<TaskDocument>(COLLECTIONS.TASK).insertOne(task);

  return taskId;
}
