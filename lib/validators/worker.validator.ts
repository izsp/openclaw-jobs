/**
 * Zod schemas for worker API input validation.
 */
import { z } from "zod";

/** POST /api/worker/connect — register a new worker. */
export const connectWorkerSchema = z.object({
  worker_type: z.string().min(1).max(50),
  model_info: z
    .object({
      provider: z.string().min(1).max(50),
      model: z.string().min(1).max(100),
      capabilities: z.array(z.string().max(50)).max(20),
    })
    .nullable()
    .default(null),
});

/** PATCH /api/worker/profile — update worker preferences. */
export const updateProfileSchema = z.object({
  preferences: z
    .object({
      accept: z.array(z.string().max(50)).max(50).optional(),
      reject: z.array(z.string().max(50)).max(50).optional(),
      languages: z.array(z.string().max(10)).max(20).optional(),
      max_tokens: z.number().int().positive().max(100_000).optional(),
      min_price: z.number().int().nonnegative().max(10_000).optional(),
    })
    .optional(),
  schedule: z
    .object({
      timezone: z.string().max(50).optional(),
      shifts: z
        .array(
          z.object({
            name: z.string().max(50),
            hours: z.tuple([z.number().min(0).max(23), z.number().min(0).max(23)]),
            interval: z.number().int().positive().max(3600),
          }),
        )
        .max(10)
        .optional(),
    })
    .optional(),
  limits: z
    .object({
      daily_max_tasks: z.number().int().positive().max(10_000).optional(),
      concurrent: z.number().int().positive().max(50).optional(),
    })
    .optional(),
});

/** POST /api/work/submit — submit task result. */
export const submitTaskSchema = z.object({
  task_id: z.string().startsWith("task_"),
  output: z.object({
    content: z.string().min(1),
    format: z.enum(["text", "json", "html", "markdown", "code"]),
  }),
});

/** POST /api/worker/bind-email */
export const bindEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6).optional(),
});

/** POST /api/worker/bind-payout */
export const bindPayoutSchema = z.object({
  method: z.enum(["paypal", "solana"]),
  address: z.string().min(1).max(256),
});
