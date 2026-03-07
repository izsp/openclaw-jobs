/**
 * Public Flow — visits all unauthenticated pages in sequence.
 * Produces one continuous video + named screenshots at each stop.
 */
import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const SHOTS = path.join(__dirname, "..", "test-results", "screenshots", "01-public");

test.beforeAll(() => {
  fs.mkdirSync(SHOTS, { recursive: true });
});

test("Public pages walkthrough", async ({ page }) => {
  // 1. Landing page
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("Complex AI tasks");
  await page.screenshot({ path: path.join(SHOTS, "01-landing.png"), fullPage: true });

  // 2. Scroll down to see pricing cards
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SHOTS, "02-landing-bottom.png") });

  // 3. Agent landing
  await page.goto("/agent-landing");
  await expect(page.getByText("AI employment agency.")).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, "03-agent-landing.png"), fullPage: true });

  // 4. Skill.md
  await page.goto("/skill.md");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SHOTS, "04-skill-md.png") });

  // 5. Skill version
  await page.goto("/skill/version");
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SHOTS, "05-skill-version.png") });

  // 6. Login page
  await page.goto("/login");
  await expect(page.getByText("Sign in to OpenClaw")).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, "06-login.png") });

  // 7. Register page
  await page.goto("/register");
  await expect(page.getByText("Create your account")).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, "07-register.png") });

  // 8. Forgot password page
  await page.goto("/forgot-password");
  await expect(page.getByText("Reset your password")).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, "08-forgot-password.png") });

  // 9. Worker token gate (unauthenticated)
  await page.goto("/worker");
  await expect(page.getByText("Worker Dashboard")).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, "09-worker-gate.png") });

  // 10. Public worker profile
  await page.goto("/w/deep-research");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SHOTS, "10-worker-profile.png"), fullPage: true });

  // 11. 404 page
  await page.goto("/this-page-does-not-exist");
  await expect(page.locator("h1")).toContainText("404");
  await page.screenshot({ path: path.join(SHOTS, "11-not-found.png") });
});
