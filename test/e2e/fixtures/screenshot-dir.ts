/**
 * Shared screenshot directory for all E2E specs.
 *
 * Every test run gets a single timestamped directory under test/e2e/runs/.
 * All screenshots from all specs land in the same `screenshots/` folder,
 * prefixed by spec name to avoid collisions.
 *
 * Structure:
 *   test/e2e/runs/YYYY-MM-DD_HH-mm/
 *     screenshots/
 *       05-rich-01-analysis-inline.png
 *       05-rich-02-viewer-open.png
 *       06-attach-01-inline-card.png
 *       07-depth-01-default-deep.png
 *       ...
 *     videos/
 *     html-report/
 *     summary.md
 */
import * as fs from "fs";
import * as path from "path";

const E2E_DIR = path.resolve(__dirname, "..");
const RUNS_DIR = path.join(E2E_DIR, "runs");

/** Generate YYYY-MM-DD_HH-mm timestamp. */
function formatTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return [
    now.getFullYear(),
    "-",
    pad(now.getMonth() + 1),
    "-",
    pad(now.getDate()),
    "_",
    pad(now.getHours()),
    "-",
    pad(now.getMinutes()),
  ].join("");
}

// WHY: Module-level singleton ensures all specs in the same Playwright run
// (single worker, configured in playwright.config.ts) share the same dir.
let cachedRunDir: string | null = null;

/** Returns the timestamped run directory, creating it on first call. */
function getRunDir(): string {
  if (cachedRunDir) return cachedRunDir;
  const timestamp = formatTimestamp();
  cachedRunDir = path.join(RUNS_DIR, timestamp);
  return cachedRunDir;
}

/**
 * Returns the screenshots directory for the current run.
 * Creates it on first call.
 */
export function getScreenshotDir(): string {
  const dir = path.join(getRunDir(), "screenshots");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Builds a full screenshot path with spec prefix and sequence number.
 *
 * @param specPrefix - e.g. "05-rich", "06-attach", "07-depth"
 * @param name - e.g. "01-analysis-inline", "02-viewer-open"
 * @returns Absolute path like `.../runs/2026-03-06_13-05/screenshots/07-depth-01-default-deep.png`
 */
export function shotPath(specPrefix: string, name: string): string {
  return path.join(getScreenshotDir(), `${specPrefix}-${name}.png`);
}
