import { defineConfig, devices } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// Load .env.test if it exists (credentials for buyer/worker/admin)
const envFile = path.join(__dirname, ".env.test");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx);
    const val = trimmed.slice(eqIdx + 1);
    if (!process.env[key]) process.env[key] = val;
  }
}

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./specs",
  outputDir: "./test-results",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  use: {
    baseURL: BASE_URL,
    screenshot: "off",
    video: "on",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  reporter: [
    ["list"],
    ["html", { outputFolder: "./html-report", open: "never" }],
    ["json", { outputFile: "./test-results/results.json" }],
  ],
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
