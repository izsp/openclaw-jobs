/**
 * UI/UX Screenshot Audit Script v2
 *
 * Captures every user-facing page in desktop + mobile viewports.
 * Supports both unauthenticated and authenticated states.
 *
 * Usage:
 *   npx tsx scripts/screenshot-audit.ts [base-url] [output-dir]
 *
 * Examples:
 *   npx tsx scripts/screenshot-audit.ts https://staging.openclaw.jobs
 *   npx tsx scripts/screenshot-audit.ts http://localhost:3000 docs/uiux-audit/screenshots-local
 *
 * Authentication:
 *   Set AUDIT_EMAIL and AUDIT_PASSWORD env vars to capture authenticated pages.
 *   If not set, only unauthenticated pages are captured.
 */

import { chromium, type Page } from "playwright";
import * as path from "path";
import * as fs from "fs";

// ─── Configuration ───

const BASE_URL = process.argv[2] ?? "https://staging.openclaw.jobs";
const OUTPUT_DIR = process.argv[3] ?? "docs/uiux-audit/screenshots-latest";
const AUDIT_EMAIL = process.env.AUDIT_EMAIL;
const AUDIT_PASSWORD = process.env.AUDIT_PASSWORD;

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

// ─── Types ───

interface ScreenshotSpec {
  name: string;
  url: string;
  setup?: (page: Page) => Promise<void>;
  waitFor?: string;
  fullPage?: boolean;
  /** Only take desktop screenshot (skip mobile) */
  desktopOnly?: boolean;
}

// ─── Helpers ───

async function takeScreenshot(
  page: Page,
  spec: ScreenshotSpec,
  viewport: { width: number; height: number },
  suffix: string,
  outputDir: string,
) {
  await page.setViewportSize(viewport);

  const label = `${spec.name} (${suffix})`;
  process.stdout.write(`  📸 ${label}...`);

  try {
    await page.goto(`${BASE_URL}${spec.url}`, {
      waitUntil: "networkidle",
      timeout: 15000,
    }).catch(() => {
      return page.goto(`${BASE_URL}${spec.url}`, {
        waitUntil: "domcontentloaded",
      });
    });

    if (spec.setup) {
      await spec.setup(page);
    }

    if (spec.waitFor) {
      await page.waitForSelector(spec.waitFor, { timeout: 5000 }).catch(() => {});
    }

    await page.waitForTimeout(800);

    const filename = `${spec.name}${suffix === "mobile" ? "-mobile" : ""}.png`;
    await page.screenshot({
      path: path.join(outputDir, filename),
      fullPage: spec.fullPage ?? false,
    });

    console.log(" ✅");
  } catch (err) {
    console.log(` ❌ ${err instanceof Error ? err.message : err}`);
  }
}

async function captureSpec(
  page: Page,
  spec: ScreenshotSpec,
  outputDir: string,
) {
  await takeScreenshot(page, spec, DESKTOP, "desktop", outputDir);
  if (!spec.desktopOnly) {
    await takeScreenshot(page, spec, MOBILE, "mobile", outputDir);
  }
}

// ─── Page Specs ───

const UNAUTH_PAGES: ScreenshotSpec[] = [
  {
    name: "01-landing",
    url: "/",
    fullPage: true,
  },
  {
    name: "02-login",
    url: "/login",
  },
  {
    name: "03-register",
    url: "/register",
  },
  {
    name: "04-forgot-password",
    url: "/forgot-password",
  },
  {
    name: "05-404",
    url: "/this-page-does-not-exist",
  },
  {
    name: "06-worker-gate-signin",
    url: "/worker",
  },
  {
    name: "07-worker-gate-register",
    url: "/worker",
    setup: async (page) => {
      const registerBtn = page.locator("button", { hasText: "Register" });
      if (await registerBtn.isVisible()) {
        await registerBtn.click();
        await page.waitForTimeout(300);
      }
    },
  },
];

const AUTH_PAGES: ScreenshotSpec[] = [
  {
    name: "08-landing-auth",
    url: "/",
    fullPage: true,
  },
  {
    name: "09-chat-empty",
    url: "/chat",
  },
  {
    name: "10-dashboard",
    url: "/dashboard",
  },
  {
    name: "11-worker-dashboard",
    url: "/worker",
  },
];

// ─── Main ───

async function main() {
  const outputDir = path.resolve(OUTPUT_DIR);
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`\n🦞 OpenClaw UI/UX Screenshot Audit v2`);
  console.log(`   Target:  ${BASE_URL}`);
  console.log(`   Output:  ${outputDir}`);
  console.log(`   Auth:    ${AUDIT_EMAIL ? `${AUDIT_EMAIL}` : "skipped (set AUDIT_EMAIL + AUDIT_PASSWORD)"}\n`);

  // Verify server is reachable
  try {
    await fetch(BASE_URL);
  } catch {
    console.error(`❌ Cannot reach ${BASE_URL}`);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });

  try {
    // ── Phase 1: Unauthenticated ──
    console.log("Phase 1: Unauthenticated pages");
    const unauthCtx = await browser.newContext({ viewport: DESKTOP });
    const unauthPage = await unauthCtx.newPage();

    for (const spec of UNAUTH_PAGES) {
      await captureSpec(unauthPage, spec, outputDir);
    }

    await unauthCtx.close();

    // ── Phase 2: Authenticated (if credentials provided) ──
    if (AUDIT_EMAIL && AUDIT_PASSWORD) {
      console.log("\nPhase 2: Authenticating...");
      const authCtx = await browser.newContext({ viewport: DESKTOP });
      const authPage = await authCtx.newPage();

      await authPage.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });

      // Fill the custom credentials login form
      await authPage.fill('input[type="email"]', AUDIT_EMAIL);
      await authPage.fill('input[type="password"]', AUDIT_PASSWORD);
      await authPage.click('button[type="submit"]');

      // Wait for redirect after login
      await authPage.waitForURL((url) => !url.pathname.includes("/login"), {
        timeout: 15000,
      }).catch(() => {
        console.log("   ⚠️  Login may have failed. Continuing anyway...");
      });

      console.log(`   Current URL: ${authPage.url()}`);

      console.log("\nPhase 3: Authenticated pages");
      for (const spec of AUTH_PAGES) {
        await captureSpec(authPage, spec, outputDir);
      }

      await authCtx.close();
    } else {
      console.log("\nSkipping authenticated pages (no credentials).");
    }

    // ── Summary ──
    const files = fs.readdirSync(outputDir).filter((f) => f.endsWith(".png"));
    console.log(`\n✅ Done! ${files.length} screenshots saved.\n`);
    files.sort().forEach((f) => {
      const size = fs.statSync(path.join(outputDir, f)).size;
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
