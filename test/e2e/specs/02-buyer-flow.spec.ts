/**
 * Buyer Flow — login via Cognito, then visit all buyer pages.
 * Produces one continuous video + named screenshots at each stop.
 */
import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const SHOTS = path.join(__dirname, "..", "test-results", "screenshots", "02-buyer");

test.beforeAll(() => {
  fs.mkdirSync(SHOTS, { recursive: true });
});

test("Buyer journey: login → dashboard → tasks → billing → chat", async ({ page }) => {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;
  if (!email || !password) {
    test.skip();
    return;
  }

  // 1. Login page
  await page.goto("/login");
  await page.screenshot({ path: path.join(SHOTS, "01-login-page.png") });

  // 2. Fill credentials and submit
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.screenshot({ path: path.join(SHOTS, "02-login-filled.png") });
  await page.click('button[type="submit"]');

  // 3. Wait for redirect after login
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 15_000,
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SHOTS, "03-after-login.png") });

  // 4. Dashboard overview
  await page.goto("/dashboard");
  await expect(page.locator("h1")).toContainText("Overview");
  await expect(page.getByText("Available Balance")).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, "04-dashboard.png") });

  // 5. Tasks page
  await page.goto("/dashboard/tasks");
  await expect(page.locator("h1")).toContainText("Tasks");
  await page.screenshot({ path: path.join(SHOTS, "05-tasks.png") });

  // 6. Billing page
  await page.goto("/dashboard/billing");
  await expect(page.locator("h1")).toContainText("Billing");
  await expect(page.getByText("Add Funds")).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, "06-billing.png") });

  // 7. Billing with deposit success toast
  await page.goto("/dashboard/billing?deposit=success");
  await expect(page.getByText("Deposit successful")).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, "07-billing-deposit-success.png") });

  // 8. Settings page
  await page.goto("/dashboard/settings");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SHOTS, "08-settings.png") });

  // 9. Chat page
  await page.goto("/chat");
  await page.waitForTimeout(1000);
  await expect(page.getByText("OpenClaw")).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, "09-chat.png") });
});
