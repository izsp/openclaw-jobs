/**
 * Takes screenshots of all admin panel pages for UI review.
 * Usage: npx playwright test scripts/admin-screenshots.ts
 * Or: npx tsx scripts/admin-screenshots.ts
 */
import { chromium } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const BASE = "http://localhost:3000";
const ADMIN_SECRET = "fbbbcb20b76671d62c5736bf39b95076d3338ecedc924e25f147b35225a062fb";
const OUT_DIR = path.join(process.cwd(), "docs/admin-screenshots");

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 1. Login page
  console.log("1. Capturing login page...");
  await page.goto(`${BASE}/admin`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT_DIR, "01-login.png"), fullPage: true });

  // 2. Login with admin secret
  console.log("2. Logging in...");
  const passwordInput = page.locator('input[type="password"]');
  if (await passwordInput.count() > 0) {
    await passwordInput.fill(ADMIN_SECRET);
    await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign"), button:has-text("Enter")').first().click();
    await page.waitForTimeout(3000);
  }
  await page.screenshot({ path: path.join(OUT_DIR, "02-after-login.png"), fullPage: true });

  // Check if we're on dashboard
  const currentUrl = page.url();
  console.log(`   Current URL: ${currentUrl}`);

  // 3. Dashboard
  console.log("3. Dashboard...");
  await page.goto(`${BASE}/admin/dashboard`);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT_DIR, "03-dashboard.png"), fullPage: true });

  // 4. Users list
  console.log("4. Users...");
  await page.goto(`${BASE}/admin/users`);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT_DIR, "04-users.png"), fullPage: true });

  // 5. User detail
  console.log("5. User detail...");
  // Click first user row if exists
  const userRow = page.locator('table tbody tr, [data-testid="user-row"]').first();
  if (await userRow.count() > 0) {
    await userRow.click();
    await page.waitForTimeout(3000);
  } else {
    await page.goto(`${BASE}/admin/users/usr_alice`);
    await page.waitForTimeout(3000);
  }
  await page.screenshot({ path: path.join(OUT_DIR, "05-user-detail.png"), fullPage: true });

  // 6. Workers list
  console.log("6. Workers...");
  await page.goto(`${BASE}/admin/workers`);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT_DIR, "06-workers.png"), fullPage: true });

  // 7. Worker detail
  console.log("7. Worker detail...");
  const workerRow = page.locator('table tbody tr, [data-testid="worker-row"]').first();
  if (await workerRow.count() > 0) {
    await workerRow.click();
    await page.waitForTimeout(3000);
  } else {
    await page.goto(`${BASE}/admin/workers/w_gpt4_bot`);
    await page.waitForTimeout(3000);
  }
  await page.screenshot({ path: path.join(OUT_DIR, "07-worker-detail.png"), fullPage: true });

  // 8. Tasks list
  console.log("8. Tasks...");
  await page.goto(`${BASE}/admin/tasks`);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT_DIR, "08-tasks.png"), fullPage: true });

  // 9. Task detail
  console.log("9. Task detail...");
  const taskRow = page.locator('table tbody tr').first();
  if (await taskRow.count() > 0) {
    await taskRow.click();
    await page.waitForTimeout(3000);
  }
  await page.screenshot({ path: path.join(OUT_DIR, "09-task-detail.png"), fullPage: true });

  // 10. Finance
  console.log("10. Finance...");
  await page.goto(`${BASE}/admin/finance`);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT_DIR, "10-finance.png"), fullPage: true });

  // 11. Config
  console.log("11. Config...");
  await page.goto(`${BASE}/admin/config`);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT_DIR, "11-config.png"), fullPage: true });

  // 12. QA
  console.log("12. QA...");
  await page.goto(`${BASE}/admin/qa`);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT_DIR, "12-qa.png"), fullPage: true });

  // 13. Audit
  console.log("13. Audit...");
  await page.goto(`${BASE}/admin/audit`);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT_DIR, "13-audit.png"), fullPage: true });

  await browser.close();
  console.log(`\nDone! Screenshots saved to ${OUT_DIR}`);
}

main().catch(console.error);
