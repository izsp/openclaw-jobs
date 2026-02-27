/**
 * Price estimation service.
 * Calculates task price based on runtime config.
 */
import { getConfig } from "@/lib/config";
import { ValidationError } from "@/lib/errors";
import type { TaskPricing } from "@/lib/types";

/**
 * Estimates the price in cents for a given task type.
 * Reads pricing from platform_config at runtime.
 *
 * @param taskType - e.g. "chat", "code", "research", "skill:summarize"
 * @param messageCount - Number of messages (for multi-turn pricing)
 * @returns Price in cents (🦐)
 */
export async function estimateTaskPrice(
  taskType: string,
  messageCount: number,
): Promise<number> {
  const config = await getConfig("pricing");
  if (!config) {
    throw new ValidationError("Pricing config not found — run setup-db seed");
  }

  // Skill tasks use the base type for pricing lookup
  const lookupKey = taskType.startsWith("skill:")
    ? "code"
    : taskType;

  const pricing = config[lookupKey] as TaskPricing | undefined;
  if (!pricing) {
    return 5;
  }

  // Multi-turn pricing: find the tier matching the message count
  if (pricing.multi_turn && messageCount > 0) {
    for (const tier of pricing.multi_turn) {
      if (messageCount <= tier.up_to_message) {
        return tier.price_cents;
      }
    }
    // If message count exceeds all tiers, use the last tier's price
    const lastTier = pricing.multi_turn[pricing.multi_turn.length - 1];
    if (lastTier) {
      return lastTier.price_cents;
    }
  }

  return pricing.base_cents;
}
