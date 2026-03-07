/**
 * Depth Selector — screenshot tests for the task depth control UI.
 * Captures screenshots of the depth pills, deep mode expanded options,
 * and switching between Quick/Standard/Deep modes.
 *
 * Requires: TEST_EMAIL + TEST_PASSWORD env vars for authentication.
 */
import { test, expect } from "@playwright/test";
import { shotPath } from "../fixtures/screenshot-dir";

const S = (name: string) => shotPath("07-depth", name);

/** Helper: login with credentials. */
async function login(page: import("@playwright/test").Page) {
  const email = process.env.TEST_EMAIL!;
  const password = process.env.TEST_PASSWORD!;
  await page.goto("/login");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 });
  await page.waitForTimeout(1000);
}

test("Depth selector: default state, mode switching, and deep options", async ({ page }) => {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;
  if (!email || !password) {
    test.skip();
    return;
  }

  test.setTimeout(90_000);

  await login(page);
  await page.goto("/chat");
  await page.waitForTimeout(2000);

  // ── 1. Default state: Deep mode selected ──
  const depthSection = page.locator("text=Depth").first();
  await expect(depthSection).toBeVisible();

  const deepBtn = page.getByRole("button", { name: /Deep/ });
  await expect(deepBtn).toBeVisible();

  await page.screenshot({
    path: S("01-default-deep-mode"),
    fullPage: false,
  });

  // ── 2. Verify Deep is highlighted (orange styling) ──
  const deepBtnClasses = await deepBtn.getAttribute("class");
  expect(deepBtnClasses).toContain("orange");

  // ── 3. Click "+ options" to expand deep mode settings ──
  const optionsToggle = page.getByText("+ options");
  await expect(optionsToggle).toBeVisible();
  await optionsToggle.click();
  await page.waitForTimeout(300);

  await page.screenshot({
    path: S("02-deep-options-expanded"),
    fullPage: false,
  });

  // ── 4. Verify format, length, and instructions controls ──
  await expect(page.getByText("Format", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("Length", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("Instructions", { exact: false }).first()).toBeVisible();

  // ── 5. Change format to "Report" ──
  const formatSelect = page.locator("select").first();
  await formatSelect.selectOption("report");
  await page.waitForTimeout(200);

  await page.screenshot({
    path: S("03-format-report-selected"),
    fullPage: false,
  });

  // ── 6. Change length to "Comprehensive" ──
  const lengthSelect = page.locator("select").nth(1);
  await lengthSelect.selectOption("comprehensive");
  await page.waitForTimeout(200);

  await page.screenshot({
    path: S("04-length-comprehensive"),
    fullPage: false,
  });

  // ── 7. Type custom instructions ──
  const instructionsInput = page.getByPlaceholder(/Include data sources/);
  await instructionsInput.fill("Use formal academic tone, cite sources");
  await page.waitForTimeout(200);

  await page.screenshot({
    path: S("05-custom-instructions"),
    fullPage: false,
  });

  // ── 8. Collapse options ──
  const hideOptions = page.getByText("- options");
  await hideOptions.click();
  await page.waitForTimeout(300);

  await page.screenshot({
    path: S("06-options-collapsed"),
    fullPage: false,
  });

  // ── 9. Switch to Quick mode ──
  const quickBtn = page.getByRole("button", { name: /Quick/ });
  await quickBtn.click();
  await page.waitForTimeout(300);

  // "+ options" should disappear in Quick mode
  await expect(page.getByText("+ options")).not.toBeVisible();

  await page.screenshot({
    path: S("07-quick-mode"),
    fullPage: false,
  });

  // ── 10. Switch to Standard mode ──
  const standardBtn = page.getByRole("button", { name: /Standard/ });
  await standardBtn.click();
  await page.waitForTimeout(300);

  await page.screenshot({
    path: S("08-standard-mode"),
    fullPage: false,
  });

  // ── 11. Switch back to Deep, verify options toggle reappears ──
  await deepBtn.click();
  await page.waitForTimeout(300);
  await expect(page.getByText("+ options")).toBeVisible();

  await page.screenshot({
    path: S("09-back-to-deep"),
    fullPage: false,
  });

  // ── 12. Full input area with depth selector + textarea + send button ──
  const inputArea = page.locator(".border-t.border-zinc-800.p-3");
  if (await inputArea.isVisible()) {
    await inputArea.screenshot({
      path: S("10-full-input-area"),
    });
  }
});
