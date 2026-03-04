/**
 * HTTP client for communicating with the OpenClaw.jobs platform API.
 * Uses native fetch — no external HTTP dependencies.
 */

import type {
  AgentConfig,
  ApiResponse,
  RegisterResult,
  PollResult,
  SubmitResult,
} from "./types.js";
import * as logger from "./logger.js";

export class PlatformClient {
  private readonly baseUrl: string;
  private token: string | null;

  constructor(config: AgentConfig) {
    this.baseUrl = config.platformUrl;
    this.token = config.workerToken;
  }

  /** Returns the current worker token, or null if not registered. */
  getToken(): string | null {
    return this.token;
  }

  /** Set the worker token (after registration). */
  setToken(token: string): void {
    this.token = token;
  }

  /**
   * Register a new worker via POST /api/worker/connect.
   * Returns the registration result including a one-time token.
   */
  async register(
    model: string,
  ): Promise<RegisterResult> {
    const url = `${this.baseUrl}/api/worker/connect`;
    const body = {
      worker_type: "claude",
      model_info: { provider: "anthropic", model, capabilities: [] },
    };

    const response = await this.fetchJson<RegisterResult>(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    this.token = response.token;
    return response;
  }

  /**
   * Long-poll for the next available task via GET /api/work/next.
   * Returns the poll result (task may be null if none available).
   */
  async pollNextTask(waitSeconds: number): Promise<PollResult> {
    const url = `${this.baseUrl}/api/work/next?wait=${waitSeconds}`;
    return this.fetchJson<PollResult>(url, {
      method: "GET",
      headers: this.authHeaders(),
    });
  }

  /**
   * Submit a completed task result via POST /api/work/submit.
   * Returns the submission result including earned amount.
   */
  async submitResult(
    taskId: string,
    content: string,
  ): Promise<SubmitResult> {
    const url = `${this.baseUrl}/api/work/submit`;
    const body = {
      task_id: taskId,
      output: { content, format: "markdown" },
    };

    return this.fetchJson<SubmitResult>(url, {
      method: "POST",
      headers: {
        ...this.authHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  /**
   * Update worker preferences via PATCH /api/worker/profile.
   * Used to sync ACCEPT_TYPES to the platform.
   */
  async updatePreferences(
    preferences: { accept: string[]; reject: string[] },
  ): Promise<void> {
    const url = `${this.baseUrl}/api/worker/profile`;
    await this.fetchJson<Record<string, unknown>>(url, {
      method: "PATCH",
      headers: {
        ...this.authHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ preferences }),
    });
    logger.info(`Updated worker preferences: accept=${preferences.accept.join(",")}`);
  }

  private authHeaders(): Record<string, string> {
    if (!this.token) {
      throw new Error("No worker token — register first");
    }
    return { Authorization: `Bearer ${this.token}` };
  }

  private async fetchJson<T>(
    url: string,
    init: RequestInit,
  ): Promise<T> {
    const response = await fetch(url, init);
    const json = (await response.json()) as ApiResponse<T>;

    if (!json.success || !json.data) {
      const errorMessage = json.error ?? `HTTP ${response.status}`;
      logger.error(`API error: ${errorMessage}`, {
        url,
        status: response.status,
        code: json.code,
      });
      throw new Error(`Platform API error: ${errorMessage}`);
    }

    return json.data;
  }
}
