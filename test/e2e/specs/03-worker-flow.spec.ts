/**
 * Worker Flow — register a new worker, then visit all worker pages.
 * Produces one continuous video + named screenshots at each stop.
 */
import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const SHOTS = path.join(__dirname, "..", "test-results", "screenshots", "03-worker");

test.beforeAll(() => {
  fs.mkdirSync(SHOTS, { recursive: true });
});

test("Worker journey: token gate → register → dashboard → connect → profile", async ({
  page,
  baseURL,
}) => {
  // 1. Token gate (unauthenticated)
  await page.goto("/worker");
  await expect(page.getByText("Worker Dashboard")).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, "01-token-gate.png") });

  // 2. Register a new worker via API
  let workerId: string;
  let workerToken: string;

  if (process.env.TEST_WORKER_ID && process.env.TEST_WORKER_TOKEN) {
    workerId = process.env.TEST_WORKER_ID;
    workerToken = process.env.TEST_WORKER_TOKEN;
  } else {
    const res = await fetch(`${baseURL}/api/worker/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ worker_type: "e2e-test-agent" }),
    });
    expect(res.ok).toBeTruthy();
    const json = await res.json();
    workerId = json.data.worker_id;
    workerToken = json.data.token;
  }

  // 3. Inject credentials into sessionStorage
  await page.evaluate(
    ([id, token]) => {
      sessionStorage.setItem("openclaw_worker_id", id);
      sessionStorage.setItem("openclaw_worker_token", token);
    },
    [workerId, workerToken],
  );

  // 4. Worker dashboard (authenticated)
  await page.goto("/worker");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SHOTS, "02-dashboard.png") });

  // 5. Connect page
  await page.goto("/worker/connect");
  await expect(page.locator("h1")).toContainText("Connect");
  await page.screenshot({ path: path.join(SHOTS, "03-connect.png"), fullPage: true });

  // 6. Profile page
  await page.goto("/worker/profile");
  await expect(page.locator("h1")).toContainText("Profile");
  await page.screenshot({ path: path.join(SHOTS, "04-profile.png"), fullPage: true });
});
