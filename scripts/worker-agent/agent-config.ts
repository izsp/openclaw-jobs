/**
 * Parse agent configuration from environment variables.
 * All required vars are validated at startup; missing ones cause immediate exit.
 */

import type { AgentConfig } from "./types.js";

const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_POLL_WAIT_SECONDS = 15;
const DEFAULT_MAX_FAILURES = 10;

/**
 * Read and validate agent configuration from process.env.
 * Throws if required variables (PLATFORM_URL, ANTHROPIC_API_KEY) are missing.
 */
export function loadAgentConfig(): AgentConfig {
  const platformUrl = requireEnv("PLATFORM_URL");
  const anthropicApiKey = requireEnv("ANTHROPIC_API_KEY");

  const workerToken = process.env.WORKER_TOKEN ?? null;
  const claudeModel = process.env.CLAUDE_MODEL ?? DEFAULT_CLAUDE_MODEL;

  const pollWaitSeconds = parseIntEnv(
    "POLL_WAIT",
    DEFAULT_POLL_WAIT_SECONDS,
  );
  const maxConsecutiveFailures = parseIntEnv(
    "MAX_FAILURES",
    DEFAULT_MAX_FAILURES,
  );
  const acceptTypes = parseAcceptTypes(process.env.ACCEPT_TYPES);

  return {
    platformUrl: platformUrl.replace(/\/+$/, ""),
    anthropicApiKey,
    workerToken,
    claudeModel,
    pollWaitSeconds,
    maxConsecutiveFailures,
    acceptTypes,
  };
}

/** Parses comma-separated ACCEPT_TYPES into an array. Empty = accept all. */
function parseAcceptTypes(raw: string | undefined): string[] {
  if (!raw || raw.trim() === "") return [];
  return raw.split(",").map((t) => t.trim()).filter(Boolean);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

function parseIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}
