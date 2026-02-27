/**
 * Zod schemas for task-related API input validation.
 */
import { z } from "zod";

/** Safe JSON primitive — rejects objects/arrays to prevent NoSQL operator injection. */
const safeJsonPrimitive = z.union([z.string(), z.number(), z.boolean(), z.null()]);

/** Valid task types: built-in or skill:* prefix. */
const taskTypeSchema = z
  .string()
  .min(1)
  .regex(
    /^(chat|translate|code|analyze|research|skill:[a-z0-9_-]+)$/,
    "Invalid task type",
  );

/** Chat message in task input. */
const messageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(32_000),
});

/** Task input payload. */
const taskInputSchema = z.object({
  messages: z.array(messageSchema).min(1).max(100),
  context: z.record(z.string(), safeJsonPrimitive).default({}),
});

/** Task execution constraints. */
const constraintsSchema = z.object({
  timeout_seconds: z.number().int().min(10).max(600).default(60),
  min_output_length: z.number().int().min(0).default(0),
});

/** POST /api/task — submit a new task. */
export const createTaskSchema = z.object({
  type: taskTypeSchema,
  input: taskInputSchema,
  sensitive: z.boolean().default(false),
  constraints: constraintsSchema.default({ timeout_seconds: 60, min_output_length: 0 }),
  input_preview: z.record(z.string(), safeJsonPrimitive).nullable().default(null),
});

/** Path param for task endpoints. */
export const taskIdParamSchema = z.string().startsWith("task_");

/** POST /api/task/[id]/credit — request credit. */
export const creditTaskSchema = z.object({
  reason: z.string().max(500).optional(),
});
