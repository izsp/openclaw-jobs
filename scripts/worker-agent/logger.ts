/**
 * Simple timestamped console logger with levels.
 * Outputs [TIMESTAMP] [LEVEL] message format.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LEVEL_LABELS: Record<LogLevel, string> = {
  debug: "DEBUG",
  info: " INFO",
  warn: " WARN",
  error: "ERROR",
};

let currentLevel: LogLevel = "info";

/** Set the minimum log level. Messages below this level are suppressed. */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

function formatTimestamp(): string {
  return new Date().toISOString().replace("T", " ").replace("Z", "");
}

function log(level: LogLevel, message: string, meta?: unknown): void {
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[currentLevel]) return;

  const timestamp = formatTimestamp();
  const label = LEVEL_LABELS[level];
  const prefix = `[${timestamp}] [${label}]`;

  if (meta !== undefined) {
    console.log(prefix, message, meta);
  } else {
    console.log(prefix, message);
  }
}

/** Log a debug message. */
export function debug(message: string, meta?: unknown): void {
  log("debug", message, meta);
}

/** Log an informational message. */
export function info(message: string, meta?: unknown): void {
  log("info", message, meta);
}

/** Log a warning message. */
export function warn(message: string, meta?: unknown): void {
  log("warn", message, meta);
}

/** Log an error message. */
export function error(message: string, meta?: unknown): void {
  log("error", message, meta);
}
