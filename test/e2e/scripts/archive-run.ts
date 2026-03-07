/**
 * Archives the latest Playwright test run into a clean timestamped directory.
 *
 * Output structure:
 *   runs/YYYY-MM-DD_HH-mm/
 *     screenshots/          — all screenshots organized by flow
 *       01-public/
 *       02-buyer/
 *       03-worker/
 *       04-admin/
 *     videos/               — one MP4 per flow (converted from WebM)
 *       01-public-flow.mp4
 *       02-buyer-flow.mp4
 *       ...
 *     html-report/
 *     summary.md
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const E2E_DIR = path.resolve(__dirname, "..");
const RESULTS_DIR = path.join(E2E_DIR, "test-results");
const REPORT_DIR = path.join(E2E_DIR, "html-report");
const RUNS_DIR = path.join(E2E_DIR, "runs");
const RESULTS_JSON = path.join(RESULTS_DIR, "results.json");

function getTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
}

function copyDirSync(src: string, dest: string): void {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/** Map flow spec dirname to a clean video base name */
function flowVideoBase(specDir: string): string {
  if (specDir.includes("public")) return "01-public-flow";
  if (specDir.includes("buyer") || specDir.includes("Buyer")) return "02-buyer-flow";
  if (specDir.includes("worker") || specDir.includes("Worker")) return "03-worker-flow";
  if (specDir.includes("admin") || specDir.includes("Admin")) return "04-admin-flow";
  return specDir.replace(/[^a-zA-Z0-9-]/g, "_");
}

/** Check if ffmpeg is available */
function hasFfmpeg(): boolean {
  try {
    execSync("which ffmpeg", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** Convert WebM to MP4 using ffmpeg */
function convertToMp4(webmPath: string, mp4Path: string): boolean {
  try {
    execSync(`ffmpeg -i "${webmPath}" -y -loglevel error "${mp4Path}"`);
    return true;
  } catch {
    return false;
  }
}

function collectVideos(resultsDir: string, destDir: string): string[] {
  const videos: string[] = [];
  if (!fs.existsSync(resultsDir)) return videos;

  fs.mkdirSync(destDir, { recursive: true });
  const canConvert = hasFfmpeg();

  for (const entry of fs.readdirSync(resultsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const webmPath = path.join(resultsDir, entry.name, "video.webm");
    if (!fs.existsSync(webmPath)) continue;

    const base = flowVideoBase(entry.name);

    if (canConvert) {
      const mp4Name = `${base}.mp4`;
      if (convertToMp4(webmPath, path.join(destDir, mp4Name))) {
        videos.push(mp4Name);
        continue;
      }
    }
    // Fallback: copy WebM as-is
    const webmName = `${base}.webm`;
    fs.copyFileSync(webmPath, path.join(destDir, webmName));
    videos.push(webmName);
  }
  return videos.sort();
}

function collectScreenshots(resultsDir: string, destDir: string): string[] {
  const screenshotsDir = path.join(resultsDir, "screenshots");
  const files: string[] = [];
  if (!fs.existsSync(screenshotsDir)) return files;

  copyDirSync(screenshotsDir, destDir);

  // List all copied files
  function walk(dir: string, prefix: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), rel);
      } else if (entry.name.endsWith(".png")) {
        files.push(rel);
      }
    }
  }
  walk(destDir, "");
  return files.sort();
}

interface TestResult {
  status: string;
  title: string;
  duration: number;
}

function parseResults(): TestResult[] {
  if (!fs.existsSync(RESULTS_JSON)) return [];
  const data = JSON.parse(fs.readFileSync(RESULTS_JSON, "utf-8"));
  const results: TestResult[] = [];

  function walkSuite(suite: Record<string, unknown>): void {
    const specs = (suite.specs ?? []) as Array<Record<string, unknown>>;
    for (const spec of specs) {
      const tests = (spec.tests ?? []) as Array<Record<string, unknown>>;
      for (const t of tests) {
        const testResults = (t.results ?? []) as Array<Record<string, unknown>>;
        for (const r of testResults) {
          results.push({
            title: `${suite.title} > ${spec.title}`,
            status: r.status as string,
            duration: r.duration as number,
          });
        }
      }
    }
    const childSuites = (suite.suites ?? []) as Array<Record<string, unknown>>;
    for (const child of childSuites) {
      walkSuite(child);
    }
  }

  for (const suite of (data.suites ?? []) as Array<Record<string, unknown>>) {
    walkSuite(suite);
  }
  return results;
}

function generateSummary(
  results: TestResult[],
  screenshots: string[],
  videos: string[],
): string {
  const passed = results.filter((r) => r.status === "passed");
  const failed = results.filter((r) => r.status === "failed");
  const skipped = results.filter((r) => r.status === "skipped");
  const totalMs = results.reduce((sum, r) => sum + r.duration, 0);

  const lines: string[] = [
    `# E2E Test Run — ${getTimestamp()}`,
    "",
    "## Summary",
    "",
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Flows | ${results.length} |`,
    `| Passed | ${passed.length} |`,
    `| Failed | ${failed.length} |`,
    `| Skipped | ${skipped.length} |`,
    `| Duration | ${(totalMs / 1000).toFixed(1)}s |`,
    "",
  ];

  if (failed.length > 0) {
    lines.push("## Failed Flows", "");
    for (const f of failed) {
      lines.push(`- **${f.title}** — ${(f.duration / 1000).toFixed(1)}s`);
    }
    lines.push("");
  }

  if (videos.length > 0) {
    lines.push("## Videos", "");
    for (const v of videos) {
      lines.push(`- [${v}](videos/${v})`);
    }
    lines.push("");
  }

  if (screenshots.length > 0) {
    lines.push("## Screenshots", "");
    let currentDir = "";
    for (const s of screenshots) {
      const dir = path.dirname(s);
      if (dir !== currentDir) {
        currentDir = dir;
        lines.push(`\n### ${dir}`, "");
      }
      lines.push(`- [${path.basename(s)}](screenshots/${s})`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function main(): void {
  const timestamp = getTimestamp();
  const archiveDir = path.join(RUNS_DIR, timestamp);

  console.log(`\n📦 Archiving test run → ${path.relative(process.cwd(), archiveDir)}`);
  fs.mkdirSync(archiveDir, { recursive: true });

  // 1. Collect screenshots
  const screenshotsDir = path.join(archiveDir, "screenshots");
  const screenshots = collectScreenshots(RESULTS_DIR, screenshotsDir);
  console.log(`   📸 ${screenshots.length} screenshots`);

  // 2. Collect videos
  const videosDir = path.join(archiveDir, "videos");
  const videos = collectVideos(RESULTS_DIR, videosDir);
  console.log(`   🎬 ${videos.length} videos`);

  // 3. Copy HTML report
  if (fs.existsSync(REPORT_DIR)) {
    copyDirSync(REPORT_DIR, path.join(archiveDir, "html-report"));
    console.log("   📊 HTML report");
  }

  // 4. Generate summary
  const results = parseResults();
  const summary = generateSummary(results, screenshots, videos);
  fs.writeFileSync(path.join(archiveDir, "summary.md"), summary, "utf-8");
  console.log("   📝 summary.md");

  console.log(`\n✅ Archived to ${timestamp}/\n`);
}

main();
