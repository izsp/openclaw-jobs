/**
 * Zod schemas for worker public profile and offerings validation.
 */
import { z } from "zod";

/** URL-friendly slug: lowercase alphanumeric + hyphens, 3-30 chars. */
export const slugSchema = z
  .string()
  .min(3)
  .max(30)
  .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "Slug must be lowercase alphanumeric with hyphens");

/** Valid task types for offerings. */
const offeringTaskType = z
  .string()
  .min(1)
  .regex(
    /^(chat|translate|code|analyze|research|skill:[a-z0-9_-]+)$/,
    "Invalid task type",
  );

/** A single worker offering (task template). */
export const offeringSchema = z.object({
  id: z.string().min(1).max(30),
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  starting_price: z.number().int().min(1).max(100_000),
  welcome_message: z.string().min(1).max(1000),
  task_type: offeringTaskType,
});

/** PATCH /api/worker/profile — public profile fields update. */
export const updatePublicProfileSchema = z.object({
  display_name: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().url().max(500).optional(),
  slug: slugSchema.optional(),
  offerings: z.array(offeringSchema).max(10).optional(),
});
