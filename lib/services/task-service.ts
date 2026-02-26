/**
 * Task service — handles task creation, status retrieval, and credits.
 */
import { nanoid } from "nanoid";
import { COLLECTIONS, ID_PREFIX } from "@/lib/constants";
import type {
  TaskDocument,
  TaskInput,
  TaskConstraints,
  TaskInternal,
  TaskStatus,
} from "@/lib/types";
import { getDb } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { NotFoundError, ConflictError } from "@/lib/errors";
import { estimateTaskPrice } from "./price-service";
import { deductBalance, creditBalance } from "./balance-service";

interface CreateTaskParams {
  buyerId: string;
  type: string;
  input: TaskInput;
  sensitive: boolean;
  constraints: TaskConstraints;
  inputPreview: Record<string, unknown> | null;
}

interface CreateTaskResult {
  taskId: string;
  priceCents: number;
  balanceAfter: number;
  deadline: Date;
}

/**
 * Creates a new task, deducts from buyer's balance, and optionally
 * injects a shadow QA task.
 *
 * @throws BalanceError if buyer has insufficient funds
 */
export async function createTask(
  params: CreateTaskParams,
): Promise<CreateTaskResult> {
  const { buyerId, type, input, sensitive, constraints, inputPreview } = params;

  const messageCount = input.messages.length;
  const priceCents = await estimateTaskPrice(type, messageCount);

  const taskId = `${ID_PREFIX.TASK}${nanoid()}`;
  const now = new Date();
  const deadline = new Date(now.getTime() + constraints.timeout_seconds * 1000);

  // Deduct balance first (atomic, prevents negative)
  const balanceAfter = await deductBalance(
    buyerId,
    priceCents,
    taskId,
    "task_pay",
  );

  const task: TaskDocument = {
    _id: taskId,
    buyer_id: buyerId,
    type,
    input,
    input_preview: inputPreview,
    sensitive,
    constraints,
    price_cents: priceCents,
    status: "pending",
    worker_id: null,
    assigned_at: null,
    deadline,
    output: null,
    completed_at: null,
    purge_at: null,
    created_at: now,
    _internal: {
      is_qa: false,
      qa_type: null,
      original_task_id: null,
      expected_output: null,
      qa_result: null,
      funded_by: "buyer",
    },
  };

  const db = await getDb();
  await db.collection<TaskDocument>(COLLECTIONS.TASK).insertOne(task);

  // Probabilistically inject shadow QA task
  await maybeInjectShadow(task);

  return { taskId, priceCents, balanceAfter, deadline };
}

/**
 * Retrieves a task by ID for the buyer.
 * Strips _internal fields before returning.
 *
 * @throws NotFoundError if task doesn't exist
 */
export async function getTaskForBuyer(
  taskId: string,
  buyerId: string,
): Promise<Omit<TaskDocument, "_internal">> {
  const db = await getDb();
  const task = await db
    .collection<TaskDocument>(COLLECTIONS.TASK)
    .findOne({ _id: taskId, buyer_id: buyerId });

  if (!task) {
    throw new NotFoundError("Task");
  }

  // Strip _internal — NEVER expose to buyers
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _internal, ...safeTask } = task;
  return safeTask;
}

/**
 * Credits a buyer for a completed task (thumbs-down, auto-approve).
 *
 * @throws NotFoundError if task doesn't exist
 * @throws ConflictError if task isn't completed or already credited
 */
export async function creditTask(
  taskId: string,
  buyerId: string,
): Promise<number> {
  const db = await getDb();
  const collection = db.collection<TaskDocument>(COLLECTIONS.TASK);

  // Atomically mark as credited — only if currently "completed"
  const task = await collection.findOneAndUpdate(
    {
      _id: taskId,
      buyer_id: buyerId,
      status: "completed" as TaskStatus,
    },
    { $set: { status: "credited" as TaskStatus } },
    { returnDocument: "before" },
  );

  if (!task) {
    // Check if it exists at all to give better error
    const exists = await collection.findOne({ _id: taskId, buyer_id: buyerId });
    if (!exists) {
      throw new NotFoundError("Task");
    }
    throw new ConflictError(
      `Task cannot be credited (current status: ${exists.status})`,
    );
  }

  // Credit buyer with the full task price
  const balanceAfter = await creditBalance(
    buyerId,
    task.price_cents,
    taskId,
    "credit",
  );

  return balanceAfter;
}

/**
 * Injects a shadow QA task with probability from config.
 * Shadow tasks are identical copies funded by the platform.
 */
async function maybeInjectShadow(originalTask: TaskDocument): Promise<void> {
  const qaConfig = await getConfig("qa");
  if (!qaConfig) return;

  const shouldInject = Math.random() < qaConfig.shadow_execution_rate;
  if (!shouldInject) return;

  const shadowId = `${ID_PREFIX.TASK}${nanoid()}`;
  const shadowInternal: TaskInternal = {
    is_qa: true,
    qa_type: "shadow",
    original_task_id: originalTask._id,
    expected_output: null,
    qa_result: null,
    funded_by: "platform",
  };

  const shadowTask: TaskDocument = {
    ...originalTask,
    _id: shadowId,
    _internal: shadowInternal,
    created_at: new Date(),
  };

  const db = await getDb();
  await db.collection<TaskDocument>(COLLECTIONS.TASK).insertOne(shadowTask);
}
