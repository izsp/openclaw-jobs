/**
 * Process platform tasks by calling the Anthropic Claude API.
 * Builds a message array from the task input and prepends a system prompt.
 * Task type determines which prompt is used — no special-casing needed.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { AgentConfig, PlatformTask } from "./types.js";
import { getSystemPrompt } from "./system-prompts.js";
import * as logger from "./logger.js";

type MessageParam = Anthropic.MessageParam;

let client: Anthropic | null = null;

function getClient(apiKey: string): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey });
  }
  return client;
}

/**
 * Process a single task by sending it to Claude and returning the response content.
 * Returns the markdown string output, or an error message if the API call fails.
 */
export async function processTask(
  task: PlatformTask,
  config: AgentConfig,
): Promise<string> {
  const systemPrompt = getSystemPrompt(task.type);
  const messages = buildMessages(task);

  logger.info(
    `Processing task ${task.id} (type=${task.type}, ` +
      `messages=${messages.length}, model=${config.claudeModel})`,
  );

  try {
    const anthropic = getClient(config.anthropicApiKey);
    const response = await anthropic.messages.create({
      model: config.claudeModel,
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    });

    return extractTextContent(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Claude API error for task ${task.id}: ${message}`);
    return `Error processing task: ${message}`;
  }
}

function buildMessages(task: PlatformTask): MessageParam[] {
  return task.input.messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
}

function extractTextContent(response: Anthropic.Message): string {
  const textBlocks = response.content.filter(
    (block) => block.type === "text",
  );
  return textBlocks.map((block) => block.text).join("\n\n");
}
