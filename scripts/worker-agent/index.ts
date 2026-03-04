/**
 * OpenClaw.jobs Worker Agent — entry point.
 *
 * A fully independent worker process that communicates with the platform
 * via HTTP. Can run on any server, separate from the platform.
 *
 * Registers with the platform (or reuses a saved token), optionally sets
 * task type preferences, then enters the poll-process-submit loop.
 *
 * Usage:
 *   PLATFORM_URL=http://localhost:3000 \
 *   ANTHROPIC_API_KEY=sk-ant-xxx \
 *   npx tsx scripts/worker-agent/index.ts
 *
 * Accept only specific task types:
 *   ACCEPT_TYPES=review \
 *   PLATFORM_URL=http://localhost:3000 \
 *   ANTHROPIC_API_KEY=sk-ant-xxx \
 *   npx tsx scripts/worker-agent/index.ts
 */

import { loadAgentConfig } from "./agent-config.js";
import { PlatformClient } from "./platform-client.js";
import { processTask } from "./claude-processor.js";
import { startAgentLoop } from "./agent-loop.js";
import * as logger from "./logger.js";

async function main(): Promise<void> {
  const config = loadAgentConfig();
  const client = new PlatformClient(config);

  printBanner(config);

  if (config.workerToken) {
    logger.info("Using existing worker token from WORKER_TOKEN env var");
  } else {
    await registerNewWorker(client, config.claudeModel);
  }

  if (config.acceptTypes.length > 0) {
    await syncPreferences(client, config.acceptTypes);
  }

  await startAgentLoop(client, processTask, config);
}

/** Syncs ACCEPT_TYPES to the platform as worker preferences. */
async function syncPreferences(
  client: PlatformClient,
  acceptTypes: string[],
): Promise<void> {
  logger.info(`Setting task type preferences: ${acceptTypes.join(", ")}`);
  await client.updatePreferences({ accept: acceptTypes, reject: [] });
}

async function registerNewWorker(
  client: PlatformClient,
  model: string,
): Promise<void> {
  logger.info("No WORKER_TOKEN found — registering new worker...");
  const result = await client.register(model);

  logger.info(`Registered as worker: ${result.worker_id}`);
  logger.info(`Tier: ${result.stats.tier}`);
  logger.info("");
  logger.info("========================================");
  logger.info("  SAVE THIS TOKEN — it will not be shown again:");
  logger.info(`  WORKER_TOKEN=${result.token}`);
  logger.info("========================================");
  logger.info("");
}

function printBanner(config: {
  platformUrl: string;
  claudeModel: string;
  pollWaitSeconds: number;
  maxConsecutiveFailures: number;
  acceptTypes: string[];
  workerToken: string | null;
}): void {
  const types = config.acceptTypes.length > 0
    ? config.acceptTypes.join(", ")
    : "(all)";
  logger.info("=== OpenClaw.jobs Worker Agent ===");
  logger.info(`Platform:     ${config.platformUrl}`);
  logger.info(`Model:        ${config.claudeModel}`);
  logger.info(`Poll wait:    ${config.pollWaitSeconds}s`);
  logger.info(`Max failures: ${config.maxConsecutiveFailures}`);
  logger.info(`Accept types: ${types}`);
  logger.info(`Token:        ${config.workerToken ? "(provided)" : "(will register)"}`);
  logger.info("==================================");
}

main().catch((err) => {
  logger.error("Fatal error", err);
  process.exit(1);
});
