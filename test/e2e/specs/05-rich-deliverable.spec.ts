/**
 * Rich Deliverable Platform — screenshot tests for artifact viewers.
 * Injects realistic test data into localStorage and captures screenshots
 * of inline cards, artifact badges, enhanced viewers, and full-screen mode.
 *
 * Requires: TEST_EMAIL + TEST_PASSWORD env vars for authentication.
 */
import { test, expect } from "@playwright/test";
import { buildTestConversations } from "../fixtures/rich-deliverable-samples";
import { shotPath } from "../fixtures/screenshot-dir";

const S = (name: string) => shotPath("05-rich", name);

/**
 * Injects test conversations into localStorage for a given userId.
 * Must be called after page.goto() so we have a valid origin context.
 */
async function injectTestData(page: import("@playwright/test").Page, userId: string) {
  const conversations = buildTestConversations(userId);
  await page.evaluate(
    ({ key, data }) => {
      localStorage.setItem(key, JSON.stringify(data));
    },
    { key: `openclaw_chats_${userId}`, data: conversations },
  );
}

/** Extracts the authenticated user's ID from the session. */
async function getUserId(page: import("@playwright/test").Page): Promise<string> {
  const resp = await page.request.get("/api/auth/session");
  const session = await resp.json();
  return session?.user?.id ?? "test-user";
}

test("Rich deliverable: inline cards, viewers, and full-screen mode", async ({ page }) => {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;
  if (!email || !password) {
    test.skip();
    return;
  }

  test.setTimeout(120_000);

  // ── Step 1: Login ──
  await page.goto("/login");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 });
  await page.waitForTimeout(1000);

  // ── Step 2: Get userId and inject test data ──
  const userId = await getUserId(page);
  await injectTestData(page, userId);

  // ── Step 3: Navigate to chat with the analysis conversation ──
  await page.goto("/chat?id=test-conv-analysis");
  await page.waitForTimeout(2000);

  // 3a. Competitive analysis — inline card with artifact badges (tables, JSON, code)
  await page.screenshot({
    path: S("01-analysis-inline-card"),
    fullPage: false,
  });

  // 3b. Scroll down within the result card to see tables
  const resultCard = page.locator(".overflow-y-auto").first();
  if (await resultCard.isVisible()) {
    await resultCard.evaluate((el) => el.scrollTo(0, 300));
    await page.waitForTimeout(500);
    await page.screenshot({
      path: S("02-analysis-scrolled-tables"),
    });
  }

  // 3c. Click "Expand" to open full-screen viewer
  const expandBtn = page.getByText("Expand", { exact: true });
  if (await expandBtn.isVisible()) {
    await expandBtn.click();
    await page.waitForTimeout(1000);

    // Full-screen viewer with sidebar
    await page.screenshot({
      path: S("03-analysis-fullscreen-top"),
    });

    // Scroll down in full-screen to see tables and JSON
    const scrollContainer = page.locator("#result-viewer-scroll");
    if (await scrollContainer.isVisible()) {
      await scrollContainer.evaluate((el) => el.scrollTo(0, 600));
      await page.waitForTimeout(500);
      await page.screenshot({
        path: S("04-analysis-fullscreen-tables"),
      });

      // Scroll further to JSON viewer
      await scrollContainer.evaluate((el) => el.scrollTo(0, 1200));
      await page.waitForTimeout(500);
      await page.screenshot({
        path: S("05-analysis-fullscreen-json"),
      });

      // Scroll to SQL code block
      await scrollContainer.evaluate((el) => el.scrollTo(0, el.scrollHeight));
      await page.waitForTimeout(500);
      await page.screenshot({
        path: S("06-analysis-fullscreen-code"),
      });
    }

    // Click "Download ▾" button in bottom actions
    const dlBtn = page.locator(".fixed.inset-0").getByText(/Download/);
    if (await dlBtn.first().isVisible()) {
      await page.screenshot({
        path: S("07-analysis-fullscreen-actions"),
      });
    }

    // Close full-screen (Escape)
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }

  // ── Step 4: Code review conversation ──
  await page.goto("/chat?id=test-conv-code-review");
  await page.waitForTimeout(2000);

  // 4a. Code review inline card — multi-language code blocks
  await page.screenshot({
    path: S("08-code-review-inline"),
  });

  // 4b. Expand to full-screen
  const expandBtn2 = page.getByText("Expand", { exact: true });
  if (await expandBtn2.isVisible()) {
    await expandBtn2.click();
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: S("09-code-review-fullscreen"),
    });

    // Scroll to see code blocks
    const scroll2 = page.locator("#result-viewer-scroll");
    if (await scroll2.isVisible()) {
      await scroll2.evaluate((el) => el.scrollTo(0, 500));
      await page.waitForTimeout(500);
      await page.screenshot({
        path: S("10-code-review-python-block"),
      });

      await scroll2.evaluate((el) => el.scrollTo(0, 1200));
      await page.waitForTimeout(500);
      await page.screenshot({
        path: S("11-code-review-typescript-block"),
      });

      await scroll2.evaluate((el) => el.scrollTo(0, el.scrollHeight));
      await page.waitForTimeout(500);
      await page.screenshot({
        path: S("12-code-review-severity-table"),
      });
    }

    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }

  // ── Step 5: Data analysis conversation — HTML preview + tables ──
  await page.goto("/chat?id=test-conv-data");
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: S("13-data-analysis-inline"),
  });

  const expandBtn3 = page.getByText("Expand", { exact: true });
  if (await expandBtn3.isVisible()) {
    await expandBtn3.click();
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: S("14-data-analysis-fullscreen"),
    });

    // Scroll to HTML chart preview
    const scroll3 = page.locator("#result-viewer-scroll");
    if (await scroll3.isVisible()) {
      await scroll3.evaluate((el) => el.scrollTo(0, 600));
      await page.waitForTimeout(1000); // Extra wait for iframe to render
      await page.screenshot({
        path: S("15-data-analysis-html-chart"),
      });

      // Scroll to JSON cohort data
      await scroll3.evaluate((el) => el.scrollTo(0, el.scrollHeight));
      await page.waitForTimeout(500);
      await page.screenshot({
        path: S("16-data-analysis-cohort-json"),
      });
    }

    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }

  // ── Step 6: Simple chat — graceful degradation, no artifact badges ──
  await page.goto("/chat?id=test-conv-simple");
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: S("17-simple-chat-no-artifacts"),
  });

  // ── Step 7: Sidebar shows all test conversations ──
  // Click sidebar toggle on mobile or just screenshot the full layout
  await page.goto("/chat?id=test-conv-analysis");
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: S("18-sidebar-with-conversations"),
    fullPage: true,
  });

  // ── Step 8: Download menu interaction ──
  const downloadBtn = page.getByText("Download ▾");
  if (await downloadBtn.first().isVisible()) {
    await downloadBtn.first().click();
    await page.waitForTimeout(300);
    await page.screenshot({
      path: S("19-download-menu-open"),
    });
  }
});

test("Rich deliverable: table sorting interaction", async ({ page }) => {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;
  if (!email || !password) {
    test.skip();
    return;
  }

  test.setTimeout(60_000);

  // Login
  await page.goto("/login");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 });
  await page.waitForTimeout(1000);

  // Inject data and navigate
  const userId = await getUserId(page);
  await injectTestData(page, userId);
  await page.goto("/chat?id=test-conv-analysis");
  await page.waitForTimeout(2000);

  // Open full-screen to get to the sortable table
  const expandBtn = page.getByText("Expand", { exact: true });
  if (await expandBtn.isVisible()) {
    await expandBtn.click();
    await page.waitForTimeout(1000);

    // Scroll to the market share table
    const scroll = page.locator("#result-viewer-scroll");
    await scroll.evaluate((el) => el.scrollTo(0, 500));
    await page.waitForTimeout(500);

    // Screenshot before sorting
    await page.screenshot({
      path: S("20-table-before-sort"),
    });

    // Click "Market Share (%)" header to sort
    // WHY force: true — full-screen modal content div can intercept pointer events
    const sortHeader = page.getByText("Market Share (%)");
    if (await sortHeader.first().isVisible()) {
      await sortHeader.first().click({ force: true });
      await page.waitForTimeout(300);
      await page.screenshot({
        path: S("21-table-sorted-asc"),
      });

      // Click again for descending
      await sortHeader.first().click({ force: true });
      await page.waitForTimeout(300);
      await page.screenshot({
        path: S("22-table-sorted-desc"),
      });
    }

    await page.keyboard.press("Escape");
  }
});

test("Rich deliverable: JSON viewer toggle interaction", async ({ page }) => {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;
  if (!email || !password) {
    test.skip();
    return;
  }

  test.setTimeout(60_000);

  // Login
  await page.goto("/login");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 });
  await page.waitForTimeout(1000);

  // Inject and navigate
  const userId = await getUserId(page);
  await injectTestData(page, userId);
  await page.goto("/chat?id=test-conv-analysis");
  await page.waitForTimeout(2000);

  // Open full-screen and scroll to JSON viewer
  const expandBtn = page.getByText("Expand", { exact: true });
  if (await expandBtn.isVisible()) {
    await expandBtn.click();
    await page.waitForTimeout(1000);

    // Scroll the JSON viewer into view within the modal's scroll container
    // WHY: scope to #result-viewer-scroll to target the full-screen modal, not inline card behind it
    await page.evaluate(() => {
      const container = document.getElementById("result-viewer-scroll");
      const json = container?.querySelector('[data-testid="json-viewer"]');
      if (container && json) {
        const top = (json as HTMLElement).offsetTop - container.offsetTop - 20;
        container.scrollTo({ top, behavior: "instant" });
      }
    });
    await page.waitForTimeout(500);

    // JSON tree view (default)
    await page.screenshot({
      path: S("23-json-tree-view"),
    });

    // Click "Raw" tab inside the JSON viewer (scoped to modal's scroll container)
    const toggled = await page.evaluate(() => {
      const container = document.getElementById("result-viewer-scroll");
      const viewer = container?.querySelector('[data-testid="json-viewer"]');
      if (!viewer) return false;
      const buttons = viewer.querySelectorAll("button");
      for (const btn of buttons) {
        if (btn.textContent?.trim() === "Raw") {
          btn.click();
          return true;
        }
      }
      return false;
    });
    if (toggled) {
      await page.waitForTimeout(500);
      await page.screenshot({
        path: S("24-json-raw-view"),
      });
    }

    await page.keyboard.press("Escape");
  }
});

test("Rich deliverable: HTML preview/source toggle", async ({ page }) => {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;
  if (!email || !password) {
    test.skip();
    return;
  }

  test.setTimeout(60_000);

  // Login
  await page.goto("/login");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 });
  await page.waitForTimeout(1000);

  // Inject and navigate to data analysis result (has HTML chart)
  const userId = await getUserId(page);
  await injectTestData(page, userId);
  await page.goto("/chat?id=test-conv-data");
  await page.waitForTimeout(2000);

  const expandBtn = page.getByText("Expand", { exact: true });
  if (await expandBtn.isVisible()) {
    await expandBtn.click();
    await page.waitForTimeout(1000);

    // Scroll the HTML preview into view within the modal's scroll container
    // WHY: scope to #result-viewer-scroll to target the full-screen modal, not inline card behind it
    await page.evaluate(() => {
      const container = document.getElementById("result-viewer-scroll");
      const html = container?.querySelector('[data-testid="html-preview"]');
      if (container && html) {
        const top = (html as HTMLElement).offsetTop - container.offsetTop - 20;
        container.scrollTo({ top, behavior: "instant" });
      }
    });
    await page.waitForTimeout(1500); // Wait for iframe

    // Preview mode (default)
    await page.screenshot({
      path: S("25-html-preview-mode"),
    });

    // Click "Source" tab inside the HTML viewer (scoped to modal's scroll container)
    const sourceToggled = await page.evaluate(() => {
      const container = document.getElementById("result-viewer-scroll");
      const viewer = container?.querySelector('[data-testid="html-preview"]');
      if (!viewer) return false;
      const buttons = viewer.querySelectorAll("button");
      for (const btn of buttons) {
        if (btn.textContent?.trim() === "Source") {
          btn.click();
          return true;
        }
      }
      return false;
    });
    if (sourceToggled) {
      await page.waitForTimeout(800);
      await page.screenshot({
        path: S("26-html-source-mode"),
      });
    }

    await page.keyboard.press("Escape");
  }
});
