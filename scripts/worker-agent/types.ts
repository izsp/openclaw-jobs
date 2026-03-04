/**
 * Lightweight types for the Auto Worker Agent.
 * Standalone — no imports from @/lib to keep the agent fully decoupled.
 * This agent can run on any server, independent of the platform.
 */

/** Environment-based agent configuration. */
export interface AgentConfig {
  platformUrl: string;
  anthropicApiKey: string;
  workerToken: string | null;
  claudeModel: string;
  pollWaitSeconds: number;
  maxConsecutiveFailures: number;
  /** Task types this worker accepts. Empty array = accept all. */
  acceptTypes: string[];
}

/** A single chat message in a task's conversation history. */
export interface TaskMessage {
  role: "user" | "assistant";
  content: string;
}

/** The input payload attached to a claimed task. */
export interface TaskInput {
  messages: TaskMessage[];
  context?: Record<string, unknown>;
}

/** Task constraints set by the platform. */
export interface TaskConstraints {
  timeout_seconds: number;
  min_output_length?: number;
}

/** The task shape returned by GET /api/work/next. */
export interface PlatformTask {
  id: string;
  type: string;
  input: TaskInput;
  constraints: TaskConstraints;
  price_cents: number;
  deadline: string;
}

/** Worker stats returned alongside API responses. */
export interface WorkerStats {
  tier: string;
  tasks_claimed: number;
  tasks_completed: number;
  total_earned: number;
  spot_pass: number;
  spot_fail: number;
}

/** Response from POST /api/worker/connect. */
export interface RegisterResult {
  worker_id: string;
  token: string;
  stats: WorkerStats;
}

/** Response from GET /api/work/next. */
export interface PollResult {
  task: PlatformTask | null;
  stats: WorkerStats;
}

/** Response from POST /api/work/submit. */
export interface SubmitResult {
  task_id: string;
  earned_cents: number;
  stats: WorkerStats;
}

/** Standard platform API envelope. */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  request_id?: string;
}
