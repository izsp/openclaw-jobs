/**
 * Configuration loader with in-memory caching.
 * Reads from platform_config collection with a configurable TTL (default 60s).
 * All business logic should use getConfig() to read economic parameters.
 */
import { COLLECTIONS } from "@/lib/constants";
import type { ConfigKey, ConfigMap, PlatformConfigDocument } from "@/lib/types";
import { getDb } from "@/lib/db";

/** Default cache TTL in milliseconds. */
const CACHE_TTL_MS = 60_000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/** In-memory config cache, keyed by config document _id. */
const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Returns a typed config document by key.
 * Uses an in-memory cache with 60s TTL to avoid hitting MongoDB on every request.
 *
 * @param key - One of: "pricing", "tiers", "commissions", "signup", "qa", "rate_limits"
 * @returns The typed config document, or null if not found
 * @throws Error if the database read fails
 */
export async function getConfig<K extends ConfigKey>(
  key: K,
): Promise<ConfigMap[K] | null> {
  const cached = cache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.value as ConfigMap[K];
  }

  try {
    const db = await getDb();
    const doc = await db
      .collection<PlatformConfigDocument>(COLLECTIONS.PLATFORM_CONFIG)
      .findOne({ _id: key as PlatformConfigDocument["_id"] });

    if (!doc) {
      return null;
    }

    const typed = doc as ConfigMap[K];
    cache.set(key, { value: typed, expiresAt: Date.now() + CACHE_TTL_MS });
    return typed;
  } catch (err) {
    // WHY: On serverless (Cloudflare Workers), MongoDB may be temporarily
    // unreachable. Return null so callers fall back to hardcoded defaults
    // instead of crashing the entire request.
    console.error(`[config] Failed to load "${key}":`, err);
    return null;
  }
}

/**
 * Updates a config document and invalidates the cache for that key.
 * Used by the admin API to apply runtime config changes.
 *
 * @param key - Config key to update
 * @param update - Partial update to apply (merged with existing document)
 * @returns true if the document was updated, false if not found
 */
export async function updateConfig<K extends ConfigKey>(
  key: K,
  update: Partial<ConfigMap[K]>,
): Promise<boolean> {
  const db = await getDb();
  // WHY: Using a loose document type for update because MongoDB's
  // MatchKeysAndValues cannot resolve Partial<ConfigMap[K]> against
  // the PlatformConfigDocument union type.
  const collection = db.collection<{ _id: string }>(COLLECTIONS.PLATFORM_CONFIG);
  const result = await collection.updateOne(
    { _id: key },
    { $set: { ...update, updated_at: new Date() } },
  );

  // Invalidate cache regardless of result
  cache.delete(key);

  return result.matchedCount > 0;
}

/**
 * Invalidates all cached config entries.
 * Useful for testing or forced reload.
 */
export function invalidateConfigCache(): void {
  cache.clear();
}

/**
 * Returns the current size of the config cache.
 * Exposed for testing only.
 */
export function getConfigCacheSize(): number {
  return cache.size;
}
