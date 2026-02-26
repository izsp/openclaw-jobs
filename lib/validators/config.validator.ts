/**
 * Zod schemas for admin config API validation.
 * Validates config key parameter and update payloads.
 */
import { z } from "zod";
import { CONFIG_KEYS } from "@/lib/constants";

/** Validates that a config key is one of the known keys. */
export const configKeySchema = z.enum(CONFIG_KEYS);

/**
 * Validates the update payload for a config document.
 * Accepts a partial object — fields not included are left unchanged.
 * Rejects the `_id` field to prevent key mutation.
 */
export const configUpdateSchema = z
  .record(z.string(), z.unknown())
  .refine((obj) => !("_id" in obj), {
    message: "Cannot update the _id field",
  });
