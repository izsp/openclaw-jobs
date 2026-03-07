/**
 * Attachment Feature — screenshot tests for the multimodal file delivery UI.
 * Injects a test conversation with attachments into localStorage and captures
 * screenshots of the attachment list, download buttons, preview toggle,
 * full-screen mode, and the download menu with attachment entries.
 *
 * Requires: TEST_EMAIL + TEST_PASSWORD env vars for authentication.
 */
import { test, expect } from "@playwright/test";
import { buildTestConversations } from "../fixtures/rich-deliverable-samples";
import { shotPath } from "../fixtures/screenshot-dir";

const S = (name: string) => shotPath("06-attach", name);

/** Injects test conversations into localStorage for a given userId. */
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

test("Attachment feature: inline card shows attachment list and download options", async ({ page }) => {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;
  if (!email || !password) {
    test.skip();
    return;
  }

  test.setTimeout(120_000);

  // ── Step 1: Login and inject test data ──
  await login(page);
  const userId = await getUserId(page);
  await injectTestData(page, userId);

  // ── Step 2: Navigate to the attachment conversation ──
  await page.goto("/chat?id=test-conv-attachments");
  await page.waitForTimeout(2000);

  // 2a. Inline card overview — should show result content
  await page.screenshot({
    path: S("01-attachment-inline-card"),
    fullPage: false,
  });

  // 2b. Scroll down to see the attachment list section
  const resultCard = page.locator(".overflow-y-auto").first();
  if (await resultCard.isVisible()) {
    await resultCard.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await page.waitForTimeout(500);
    await page.screenshot({
      path: S("02-attachment-list-visible"),
    });
  }

  // 2c. Verify attachment list is rendered
  const attachmentSection = page.getByText("Attachments (4)");
  await expect(attachmentSection).toBeVisible();
  await page.screenshot({
    path: S("03-attachment-section-header"),
  });

  // 2d. Verify individual attachment items
  await expect(page.getByText("homepage-mockup-v3.png")).toBeVisible();
  await expect(page.getByText("brand-guidelines-2026.pdf")).toBeVisible();
  await expect(page.getByText("icon-set-24-svg.zip")).toBeVisible();
  await expect(page.getByText("hero-animation-preview.mp4")).toBeVisible();

  // 2e. Verify file sizes are displayed
  await expect(page.getByText("2.3 MB")).toBeVisible();
  await expect(page.getByText("1.2 MB")).toBeVisible();

  // 2f. Verify "Preview" button is shown for image attachment
  const previewBtn = page.getByText("Preview", { exact: true });
  await expect(previewBtn.first()).toBeVisible();

  // 2g. Verify "Download" links exist for each attachment
  const downloadLinks = page.getByText("Download", { exact: true });
  expect(await downloadLinks.count()).toBeGreaterThanOrEqual(4);

  // ── Step 3: Check download menu includes attachment entries ──
  const downloadMenuBtn = page.getByText("Download \u25BE");
  if (await downloadMenuBtn.first().isVisible()) {
    await downloadMenuBtn.first().click();
    await page.waitForTimeout(300);

    // The dropdown should include attachment filenames
    await page.screenshot({
      path: S("04-download-menu-with-attachments"),
    });

    // Close menu by clicking elsewhere
    await page.click("body", { position: { x: 10, y: 10 } });
    await page.waitForTimeout(300);
  }
});

test("Attachment feature: full-screen viewer shows attachments", async ({ page }) => {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;
  if (!email || !password) {
    test.skip();
    return;
  }

  test.setTimeout(90_000);

  await login(page);
  const userId = await getUserId(page);
  await injectTestData(page, userId);
  await page.goto("/chat?id=test-conv-attachments");
  await page.waitForTimeout(2000);

  // ── Open full-screen viewer ──
  const expandBtn = page.getByText("Expand", { exact: true });
  if (await expandBtn.isVisible()) {
    await expandBtn.click();
    await page.waitForTimeout(1000);

    // 1. Full-screen top with content
    await page.screenshot({
      path: S("05-fullscreen-top"),
    });

    // 2. Scroll to bottom to see attachment list in full-screen
    const scrollContainer = page.locator("#result-viewer-scroll");
    if (await scrollContainer.isVisible()) {
      await scrollContainer.evaluate((el) => el.scrollTo(0, el.scrollHeight));
      await page.waitForTimeout(500);

      await page.screenshot({
        path: S("06-fullscreen-attachments"),
      });

      // Verify attachment filenames are rendered in full-screen view
      // WHY .first(): element appears in both inline card (behind modal) and the full-screen viewer
      const attachmentFile = page.locator("#result-viewer-scroll").getByText("homepage-mockup-v3.png");
      await expect(attachmentFile).toBeAttached();
    }

    // 3. Check that bottom action bar includes attachment download options
    await page.screenshot({
      path: S("07-fullscreen-action-bar"),
    });

    // Close
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }
});

test("Attachment feature: image preview toggle", async ({ page }) => {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;
  if (!email || !password) {
    test.skip();
    return;
  }

  test.setTimeout(60_000);

  await login(page);
  const userId = await getUserId(page);
  await injectTestData(page, userId);
  await page.goto("/chat?id=test-conv-attachments");
  await page.waitForTimeout(2000);

  // Scroll to attachment list
  const resultCard = page.locator(".overflow-y-auto").first();
  if (await resultCard.isVisible()) {
    await resultCard.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await page.waitForTimeout(500);
  }

  // Click "Preview" on the image attachment
  const previewBtn = page.getByText("Preview", { exact: true }).first();
  if (await previewBtn.isVisible()) {
    await previewBtn.click();
    await page.waitForTimeout(500);

    // Preview is toggled on — button should now say "Hide"
    await expect(page.getByText("Hide", { exact: true }).first()).toBeVisible();

    await page.screenshot({
      path: S("08-image-preview-open"),
    });

    // Toggle off
    await page.getByText("Hide", { exact: true }).first().click();
    await page.waitForTimeout(300);

    await page.screenshot({
      path: S("09-image-preview-closed"),
    });
  }
});
