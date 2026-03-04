/**
 * Core agent loop: poll for tasks, process with Claude, submit results.
 * Tracks consecutive failures and exits gracefully on shutdown signals.
 */

import type { AgentConfig, PlatformTask } from "./types.js";
import type { PlatformClient } from "./platform-client.js";
import * as logger from "./logger.js";

type TaskProcessor = (
  task: PlatformTask,
  config: AgentConfig,
) => Promise<string>;

let shutdownRequested = false;
let processingTask = false;

/**
 * Start the infinite poll-process-submit loop.
 * Exits when consecutive failures exceed config.maxConsecutiveFailures
 * or when a shutdown signal is received.
 */
export async function startAgentLoop(
  client: PlatformClient,
  processor: TaskProcessor,
  config: AgentConfig,
): Promise<void> {
  registerShutdownHandlers();

  let consecutiveFailures = 0;

  logger.info("Agent loop started — waiting for tasks...");

  while (!shutdownRequested) {
    try {
      const pollResult = await client.pollNextTask(config.pollWaitSeconds);

      if (!pollResult.task) {
        consecutiveFailures = 0;
        continue;
      }

      consecutiveFailures = 0;
      await handleTask(client, processor, config, pollResult.task);
    } catch (err) {
      consecutiveFailures++;
      const message = err instanceof Error ? err.message : String(err);
      logger.error(
        `Loop error (failure ${consecutiveFailures}/${config.maxConsecutiveFailures}): ${message}`,
      );

      if (consecutiveFailures >= config.maxConsecutiveFailures) {
        logger.error("Max consecutive failures reached — shutting down");
        break;
      }

      await sleep(backoffMs(consecutiveFailures));
    }
  }

  logger.info("Agent loop exited");
}

async function handleTask(
  client: PlatformClient,
  processor: TaskProcessor,
  config: AgentConfig,
  task: PlatformTask,
): Promise<void> {
  logger.info(
    `Claimed task ${task.id} (type=${task.type}, price=${task.price_cents} cents)`,
  );

  processingTask = true;
  try {
    const content = await processor(task, config);
    const result = await client.submitResult(task.id, content);
    logger.info(
      `Submitted task ${task.id} — earned ${result.earned_cents} cents`,
    );
  } finally {
    processingTask = false;
  }
}

function registerShutdownHandlers(): void {
  const handler = () => {
    if (shutdownRequested) {
      logger.warn("Force shutdown — exiting immediately");
      process.exit(1);
    }
    shutdownRequested = true;
    if (processingTask) {
      logger.info("Shutdown requested — finishing current task...");
    } else {
      logger.info("Shutdown requested — exiting");
      process.exit(0);
    }
  };

  process.on("SIGINT", handler);
  process.on("SIGTERM", handler);
}

/** Exponential backoff: 1s, 2s, 4s, ... capped at 30s. */
function backoffMs(failures: number): number {
  const MAX_BACKOFF_MS = 30_000;
  return Math.min(1000 * Math.pow(2, failures - 1), MAX_BACKOFF_MS);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
