/**
 * Admin Flow — authenticate, then visit all admin panel pages.
 * Produces one continuous video + named screenshots at each stop.
 */
import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const SHOTS = path.join(__dirname, "..", "test-results", "screenshots", "04-admin");

test.beforeAll(() => {
  fs.mkdirSync(SHOTS, { recursive: true });
});

test("Admin journey: login → dashboard → users → workers → tasks → finance → config → qa → audit", async ({
  page,
}) => {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    test.skip();
    return;
  }

  // 1. Admin login gate (before auth)
  await page.goto("/admin");
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, "01-login-gate.png") });

  // 2. Inject admin token
  await page.evaluate((s) => {
    sessionStorage.setItem("admin_token", s);
  }, secret);

  // 3. Dashboard
  await page.goto("/admin/dashboard");
  await expect(page.locator("h1")).toContainText("Dashboard");
  await expect(page.getByText("Total Users")).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SHOTS, "02-dashboard.png") });

  // 4. Users list
  await page.goto("/admin/users");
  await expect(page.locator("h1")).toContainText("Users");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SHOTS, "03-users.png") });

  // 5. Click first user row if available
  const userRow = page.locator("table tbody tr").first();
  if (await userRow.isVisible()) {
    await userRow.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SHOTS, "04-user-detail.png"), fullPage: true });
  }

  // 6. Workers list
  await page.goto("/admin/workers");
  await expect(page.locator("h1")).toContainText("Workers");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SHOTS, "05-workers.png") });

  // 7. Click first worker row if available
  const workerRow = page.locator("table tbody tr").first();
  if (await workerRow.isVisible()) {
    await workerRow.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SHOTS, "06-worker-detail.png"), fullPage: true });
  }

  // 8. Tasks list
  await page.goto("/admin/tasks");
  await expect(page.locator("h1")).toContainText("Tasks");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SHOTS, "07-tasks.png") });

  // 9. Finance
  await page.goto("/admin/finance");
  await expect(page.locator("h1")).toContainText("Finance");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SHOTS, "08-finance.png") });

  // 10. Config
  await page.goto("/admin/config");
  await expect(page.locator("h1")).toContainText("Platform Config");
  await page.screenshot({ path: path.join(SHOTS, "09-config.png") });

  // 11. Click a config key to expand editor
  await page.getByText("pricing", { exact: true }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(SHOTS, "10-config-pricing.png"), fullPage: true });

  // 12. QA
  await page.goto("/admin/qa");
  await expect(page.locator("h1")).toContainText("QA");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SHOTS, "11-qa.png") });

  // 13. Audit
  await page.goto("/admin/audit");
  await expect(page.locator("h1")).toContainText("Audit");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SHOTS, "12-audit.png"), fullPage: true });
});
