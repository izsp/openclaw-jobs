/**
 * Mobile responsive screenshot tests.
 * Tests chat UI across multiple phone models in portrait + landscape.
 * Covers: empty state, long content, multi-turn, working state, sidebar, depth selector.
 */
import { test } from "@playwright/test";
import { buildTestConversations } from "../fixtures/rich-deliverable-samples";
import { MULTI_TURN_CONVERSATION, WORKING_CONVERSATION } from "../fixtures/mobile-samples";
import { shotPath } from "../fixtures/screenshot-dir";

const S = (name: string) => shotPath("08-mobile", name);

/** Device viewport definitions. */
const DEVICES = {
  "iphone14-portrait":  { width: 390,  height: 844 },
  "iphone14-landscape": { width: 844,  height: 390 },
  "pixel7-portrait":    { width: 412,  height: 915 },
  "pixel7-landscape":   { width: 915,  height: 412 },
  "ipadmini-portrait":  { width: 744,  height: 1133 },
} as const;

type DeviceName = keyof typeof DEVICES;

async function getUserId(page: import("@playwright/test").Page): Promise<string> {
  const resp = await page.request.get("/api/auth/session");
  const session = await resp.json();
  return session?.user?.id ?? "test-user";
}

async function injectAllData(page: import("@playwright/test").Page, userId: string) {
  const rich = buildTestConversations(userId);
  const all = [...rich, MULTI_TURN_CONVERSATION, WORKING_CONVERSATION];
  await page.evaluate(
    ({ key, data }) => localStorage.setItem(key, JSON.stringify(data)),
    { key: `openclaw_chats_${userId}`, data: all },
  );
}

async function setViewport(page: import("@playwright/test").Page, device: DeviceName) {
  await page.setViewportSize(DEVICES[device]);
}

async function shot(page: import("@playwright/test").Page, device: string, label: string) {
  await page.screenshot({ path: S(`${device}-${label}`) });
}

test("Mobile responsive: all devices and scenarios", async ({ page }) => {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;
  if (!email || !password) { test.skip(); return; }
  test.setTimeout(180_000);

  // Login at desktop size first
  await page.goto("/login");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 });
  await page.waitForTimeout(1000);

  const userId = await getUserId(page);
  await injectAllData(page, userId);

  const devices: DeviceName[] = [
    "iphone14-portrait", "iphone14-landscape",
    "pixel7-portrait", "pixel7-landscape",
    "ipadmini-portrait",
  ];

  for (const device of devices) {
    await setViewport(page, device);

    // 1. Analysis result — long content with tables, code blocks
    await page.goto("/chat?id=test-conv-analysis");
    await page.waitForTimeout(1500);
    await shot(page, device, "01-analysis-top");

    // Scroll down to see more content
    await page.evaluate(() => {
      const el = document.querySelector(".overflow-y-auto");
      if (el) el.scrollTo(0, el.scrollHeight * 0.5);
    });
    await page.waitForTimeout(500);
    await shot(page, device, "02-analysis-scrolled");

    // 2. Code review — multi-language code blocks
    await page.goto("/chat?id=test-conv-code-review");
    await page.waitForTimeout(1500);
    await shot(page, device, "03-code-review");

    // 3. Simple short answer
    await page.goto("/chat?id=test-conv-simple");
    await page.waitForTimeout(1500);
    await shot(page, device, "04-simple-short");

    // 4. Multi-turn conversation — 3 rounds of Q&A with Chinese text
    await page.goto("/chat?id=test-conv-multiturn");
    await page.waitForTimeout(1500);
    await shot(page, device, "05-multiturn-top");

    // Scroll to bottom
    await page.evaluate(() => {
      const el = document.querySelector(".overflow-y-auto");
      if (el) el.scrollTo(0, el.scrollHeight);
    });
    await page.waitForTimeout(500);
    await shot(page, device, "06-multiturn-bottom");

    // 5. Working state — task in progress
    await page.goto("/chat?id=test-conv-working");
    await page.waitForTimeout(1500);
    await shot(page, device, "07-working-state");

    // 6. Sidebar open
    const hamburger = page.locator('button[aria-label="Toggle sidebar"]');
    if (await hamburger.isVisible()) {
      await hamburger.click();
      await page.waitForTimeout(500);
      await shot(page, device, "08-sidebar-open");
      // Close sidebar by clicking the backdrop (right edge of screen)
      const vp = DEVICES[device];
      await page.mouse.click(vp.width - 10, vp.height / 2);
      await page.waitForTimeout(300);
    }

    // 7. Depth selector expanded
    await page.goto("/chat?id=test-conv-simple");
    await page.waitForTimeout(1500);
    const optionsBtn = page.getByText("+ options");
    if (await optionsBtn.isVisible()) {
      await optionsBtn.click();
      await page.waitForTimeout(300);
      await shot(page, device, "09-depth-expanded");
    }

    // 8. Expand full-screen viewer on mobile
    await page.goto("/chat?id=test-conv-analysis");
    await page.waitForTimeout(1500);
    const expandBtn = page.getByText("Expand", { exact: true });
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
      await page.waitForTimeout(1000);
      await shot(page, device, "10-fullscreen-viewer");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }
  }
});
