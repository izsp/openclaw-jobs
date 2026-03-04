/**
 * E2E Use Case Test — captures screenshots of 5 realistic use cases.
 *
 * Prerequisites:
 *   1. `npm run dev` running on localhost:3000
 *   2. Worker agent running (PLATFORM_URL + ANTHROPIC_API_KEY)
 *   3. Test account with balance (TEST_EMAIL + TEST_PASSWORD)
 *
 * Usage:
 *   TEST_EMAIL=xxx TEST_PASSWORD=xxx npx tsx scripts/e2e-usecase-test.ts
 */

import { chromium, type Page } from "playwright";
import * as path from "path";
import * as fs from "fs";

const BASE_URL = process.argv[2] ?? "http://localhost:3000";
const OUTPUT_DIR = path.resolve("docs/e2e-test-results");
const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

const VIEWPORT = { width: 1440, height: 900 };
const TASK_TIMEOUT = 180_000; // 3 min per task (Claude can be slow)

// ─── Use Case Definitions ───

const USE_CASES = [
  {
    id: "uc1",
    name: "Competitive Analysis Report",
    input:
      "Compare AWS, GCP, and Azure for a 50-person Series A startup. " +
      "Include a pricing comparison table, developer experience rating, " +
      "and a final recommendation. Be thorough.",
  },
  {
    id: "uc2",
    name: "Code Security Review",
    input:
      'Review this code for security vulnerabilities and suggest fixes:\n```javascript\napp.get(\'/user/:id\', (req, res) => {\n  const query = `SELECT * FROM users WHERE id = ${req.params.id}`;\n  db.query(query, (err, result) => res.json(result));\n});\n```',
  },
  {
    id: "uc4",
    name: "Architecture Analysis",
    input:
      "Analyze the pros and cons of microservices vs monolith architecture " +
      "for an e-commerce platform processing 10K orders/day. Include a " +
      "decision matrix table, risk analysis, and migration timeline if " +
      "we choose microservices.",
  },
];

// ─── Helpers ───

async function screenshot(page: Page, name: string): Promise<void> {
  const filePath = path.join(OUTPUT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  const size = fs.statSync(filePath).size;
  console.log(`  📸 ${name}.png (${(size / 1024).toFixed(0)} KB)`);
}

async function screenshotFullPage(page: Page, name: string): Promise<void> {
  const filePath = path.join(OUTPUT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  const size = fs.statSync(filePath).size;
  console.log(`  📸 ${name}.png [full] (${(size / 1024).toFixed(0)} KB)`);
}

async function login(page: Page): Promise<void> {
  console.log("\n🔐 Logging in...");
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.fill('#email', TEST_EMAIL!);
  await page.fill('#password', TEST_PASSWORD!);
  await page.click('button[type="submit"]');

  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 15_000,
  });
  console.log(`   ✅ Logged in — redirected to ${page.url()}`);
}

async function navigateToChat(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/chat`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
}

async function sendMessage(page: Page, text: string): Promise<void> {
  const textarea = page.locator(
    'textarea[placeholder*="Describe your task"]',
  );
  await textarea.fill(text);
  await page.waitForTimeout(300);
  await page.click('button[type="submit"]:has-text("Send")');
}

async function waitForResult(page: Page): Promise<void> {
  // Wait for result card to appear (border-zinc-700/50 bg-zinc-800/80)
  await page.waitForSelector(
    'div.border.border-zinc-700\\/50.bg-zinc-800\\/80',
    { timeout: TASK_TIMEOUT },
  );
  // Extra wait for markdown rendering + shiki
  await page.waitForTimeout(2000);
}

async function scrollToBottom(page: Page): Promise<void> {
  // Scroll the messages area to the bottom
  await page.evaluate(() => {
    const scrollArea = document.querySelector(".overflow-y-auto");
    if (scrollArea) {
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  });
  await page.waitForTimeout(500);
}

// ─── Use Case Runners ───

async function runUC1(page: Page): Promise<void> {
  console.log("\n━━━ UC1: Competitive Analysis Report ━━━");

  await navigateToChat(page);
  await screenshot(page, "uc1-01-empty-chat");

  await sendMessage(page, USE_CASES[0].input);

  // Capture waiting state
  try {
    await page.waitForSelector('span.animate-pulse', { timeout: 10_000 });
    await page.waitForTimeout(500);
    await screenshot(page, "uc1-02-waiting");
  } catch {
    console.log("  ⚠️  Could not capture waiting state (task may be fast)");
  }

  await waitForResult(page);
  await screenshot(page, "uc1-03-result-full");

  // Scroll to bottom to show action bar
  await scrollToBottom(page);
  await screenshot(page, "uc1-04-result-scroll");
}

async function runUC2(page: Page): Promise<void> {
  console.log("\n━━━ UC2: Code Security Review ━━━");

  await navigateToChat(page);
  await sendMessage(page, USE_CASES[1].input);

  // Capture the input with code block
  await page.waitForTimeout(1000);
  await screenshot(page, "uc2-01-code-input");

  await waitForResult(page);
  await scrollToBottom(page);
  await screenshot(page, "uc2-02-result-code");
}

async function runUC3(page: Page): Promise<void> {
  console.log("\n━━━ UC3: Worker Profile → Directed Task ━━━");

  // Visit a worker profile page (deep-research is seeded)
  await page.goto(`${BASE_URL}/w/deep-research`, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(1000);
  await screenshotFullPage(page, "uc3-01-worker-profile");

  // Click the offering's "Start chat" link (not the header "Start chatting")
  const startChatLink = page.locator('a:text-is("Start chat")').first();
  if (await startChatLink.isVisible()) {
    await startChatLink.click();
    await page.waitForURL(/\/chat/, { timeout: 10_000 });
    console.log(`  📍 Directed chat URL: ${page.url()}`);
    // Wait for offering to load — hook fetches /api/w/deep-research
    await page.waitForTimeout(3000);
    await screenshot(page, "uc3-02-directed-chat");

    // Note: directed tasks need the specific worker to be online.
    // Mock worker registers as a NEW worker, so directed tasks won't
    // be picked up. Skip the directed task submission.
    console.log("  ℹ️  Skipping directed task (mock worker can't claim assigned tasks)");
  } else {
    console.log("  ⚠️  No offerings found for deep-research worker");
  }
}

async function runUC4(page: Page): Promise<void> {
  console.log("\n━━━ UC4: Architecture Analysis ━━━");

  await navigateToChat(page);
  await sendMessage(page, USE_CASES[2].input);
  await waitForResult(page);
  await screenshot(page, "uc4-01-analysis-result");

  // Scroll down to see tables and more content
  await scrollToBottom(page);
  await screenshot(page, "uc4-02-analysis-scroll");
}

async function runUC5(page: Page): Promise<void> {
  console.log("\n━━━ UC5: Credit / Refund Flow ━━━");

  // The previous UC should have a result card with "Request Credit" button.
  // Navigate to the most recent chat that has a result.
  await navigateToChat(page);

  // Click the example task to create a quick task for crediting
  await sendMessage(page, "What is 2 + 2? Answer briefly.");

  try {
    await waitForResult(page);
    await scrollToBottom(page);
    await screenshot(page, "uc5-01-before-credit");

    // Click "Request Credit"
    const creditBtn = page.locator('button:has-text("Request Credit")').last();
    if (await creditBtn.isVisible()) {
      await creditBtn.click();
      await page.waitForTimeout(2000);
      await screenshot(page, "uc5-02-after-credit");
    } else {
      console.log("  ⚠️  Credit button not visible");
    }
  } catch {
    console.log("  ⚠️  UC5 task timed out");
  }
}

// ─── Main ───

async function main(): Promise<void> {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    console.error(
      "❌ Missing TEST_EMAIL or TEST_PASSWORD env vars.\n" +
        "Usage: TEST_EMAIL=x TEST_PASSWORD=y npx tsx scripts/e2e-usecase-test.ts",
    );
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log("🦞 OpenClaw E2E Use Case Test");
  console.log(`   Target:  ${BASE_URL}`);
  console.log(`   Output:  ${OUTPUT_DIR}`);
  console.log(`   Account: ${TEST_EMAIL}`);

  // Verify server is reachable
  try {
    await fetch(BASE_URL);
  } catch {
    console.error(`❌ Cannot reach ${BASE_URL} — is npm run dev running?`);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({ viewport: VIEWPORT });
    const page = await context.newPage();

    await login(page);

    // Run all use cases sequentially
    const startTime = Date.now();

    await runUC1(page);
    await runUC2(page);
    await runUC3(page);
    await runUC4(page);
    await runUC5(page);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    await context.close();

    // Summary
    const files = fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith(".png"));
    console.log(`\n✅ Done! ${files.length} screenshots in ${elapsed}s\n`);
    files.sort().forEach((f) => {
      const size = fs.statSync(path.join(OUTPUT_DIR, f)).size;
      console.log(`   ${f} (${(size / 1024).toFixed(0)} KB)`);
    });
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
