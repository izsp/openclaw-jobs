/**
 * Structured JSON logger for API request tracking.
 * Outputs machine-parseable logs for monitoring and debugging.
 * In production, these are captured by Cloudflare's log system.
 */

type LogLevel = "info" | "warn" | "error";

interface LogFields {
  request_id?: string;
  method?: string;
  path?: string;
  status?: number;
  duration_ms?: number;
  ip?: string;
  user_id?: string;
  error_code?: string;
}

interface LogEntry extends LogFields {
  level: LogLevel;
  message: string;
}

/** Whether to output structured JSON logs (production) vs readable (dev). */
const IS_PRODUCTION = process.env.NODE_ENV === "production";

function emit(entry: LogEntry): void {
  const timestamp = new Date().toISOString();
  const full = { timestamp, ...entry };

  if (IS_PRODUCTION) {
    // Structured JSON for log aggregation
    const output = JSON.stringify(full);
    if (entry.level === "error") {
      console.error(output);
    } else if (entry.level === "warn") {
      console.warn(output);
    } else {
      console.log(output);
    }
  } else {
    // Human-readable for local development
    const prefix = `[${entry.level.toUpperCase()}]`;
    const id = entry.request_id ? ` [${entry.request_id}]` : "";
    const method = entry.method ?? "";
    const path = entry.path ?? "";
    const status = entry.status ? ` → ${entry.status}` : "";
    const dur = entry.duration_ms !== undefined ? ` (${entry.duration_ms}ms)` : "";
    console.log(`${prefix}${id} ${method} ${path}${status}${dur} ${entry.message}`);
  }
}

/** Log an API request completion. */
export function logRequest(message: string, fields?: LogFields): void {
  const status = fields?.status ?? 200;
  const level: LogLevel =
    status >= 500 ? "error" :
    status >= 400 ? "warn" : "info";
  emit({ level, message, ...fields });
}

/** Log a warning. */
export function logWarn(message: string, fields?: LogFields): void {
  emit({ level: "warn", message, ...fields });
}

/** Log an error. */
export function logError(message: string, fields?: LogFields): void {
  emit({ level: "error", message, ...fields });
}
