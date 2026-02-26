/**
 * Token hashing utility — SHA-256 hash for worker tokens.
 * Raw tokens are NEVER stored. Only the hash is persisted.
 */
import { createHash, randomBytes } from "crypto";
import { ID_PREFIX, TOKEN_BYTE_LENGTH } from "@/lib/constants";

/**
 * Generates a random worker token prefixed with the platform identifier.
 * @returns Raw token string (show to worker once, never store)
 */
export function generateWorkerToken(): string {
  const raw = randomBytes(TOKEN_BYTE_LENGTH).toString("hex");
  return `${ID_PREFIX.TOKEN}${raw}`;
}

/**
 * Computes SHA-256 hash of a token for secure storage/lookup.
 * @param token - The raw token string
 * @returns Hex-encoded SHA-256 hash
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
