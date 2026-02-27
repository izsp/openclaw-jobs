/**
 * UI/UX Screenshot Audit Script
 *
 * Captures screenshots of every page in both desktop and mobile viewports,
 * with both unauthenticated and authenticated states. Injects meaningful
 * mock data (conversations, balance) so screenshots show real-looking content.
 *
 * Usage:
 *   npx tsx scripts/screenshot-audit.ts [output-dir]
 *
 * Defaults to docs/uiux-audit/screenshots-latest/
 * Requires: playwright, dev server running on localhost:3000
 *
 * The script:
 *   1. Captures unauthenticated pages (landing, login, 404, worker gate)
 *   2. Logs in via dev credentials
 *   3. Injects mock chat conversations + balance data into localStorage
 *   4. Captures authenticated pages (landing, /chat, /dashboard, worker dashboard)
 *   5. Captures both desktop (1440x900) and mobile (390x844) viewports
 */

import { chromium, type Page } from "playwright";
import * as path from "path";
import * as fs from "fs";

// ─── Configuration ───

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const DEV_EMAIL = "demo@openclaw.jobs";
const OUTPUT_DIR = process.argv[2] ?? "docs/uiux-audit/screenshots-latest";

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

// ─── Mock Data ───

const MOCK_USER_ID = DEV_EMAIL; // Dev login uses email as ID

const MOCK_CONVERSATIONS = [
  {
    id: "conv-001",
    task_id: "task_abc123",
    task_status: "completed",
    price_cents: 50,
    messages: [
      { id: "m1", role: "user", content: "Research the current state of quantum computing startups. Compare the top 5 by funding, approach, and timeline to useful results.", timestamp: Date.now() - 3600000 },
      { id: "m2", role: "assistant", content: "# Quantum Computing Startups — 2026 Overview\n\n## Top 5 by Funding\n\n| Company | Funding | Approach | Timeline |\n|---------|---------|----------|----------|\n| **IonQ** | $634M | Trapped ions | 2026-2028 |\n| **PsiQuantum** | $665M | Photonic | 2027-2029 |\n| **Rigetti** | $291M | Superconducting | 2025-2027 |\n| **Xanadu** | $245M | Photonic (Borealis) | 2026-2028 |\n| **QuEra** | $72M | Neutral atoms | 2027-2029 |\n\n## Key Takeaways\n\n1. **Trapped ion** approach (IonQ) leads in near-term commercial viability\n2. **Photonic** approaches (PsiQuantum, Xanadu) promise room-temperature operation\n3. Most companies target **1000+ logical qubit** systems by 2028\n4. Enterprise partnerships accelerating — IBM, Google, AWS all offering cloud quantum\n\n> *Sources: Crunchbase, company press releases, Nature Physics review articles*", timestamp: Date.now() - 3500000 },
    ],
    created_at: Date.now() - 3600000,
    updated_at: Date.now() - 3500000,
  },
  {
    id: "conv-002",
    task_id: "task_def456",
    task_status: "completed",
    price_cents: 20,
    messages: [
      { id: "m3", role: "user", content: "Review this React hook for performance issues:\n```tsx\nfunction useDebounce(value, delay) {\n  const [debounced, setDebounced] = useState(value);\n  useEffect(() => {\n    const timer = setTimeout(() => setDebounced(value), delay);\n    return () => clearTimeout(timer);\n  }, [value, delay]);\n  return debounced;\n}\n```", timestamp: Date.now() - 7200000 },
      { id: "m4", role: "assistant", content: "## Code Review: `useDebounce` Hook\n\n**Overall**: Clean implementation, but a few improvements needed.\n\n### Issues Found\n\n1. **Missing TypeScript generics** — `value` is untyped\n2. **Stale closure risk** — the `delay` parameter in deps can cause unnecessary re-renders\n3. **No initial skip** — first render unnecessarily creates a timeout\n\n### Recommended Fix\n\n```tsx\nfunction useDebounce<T>(value: T, delay: number): T {\n  const [debounced, setDebounced] = useState(value);\n  const isFirst = useRef(true);\n  \n  useEffect(() => {\n    if (isFirst.current) {\n      isFirst.current = false;\n      return;\n    }\n    const timer = setTimeout(() => setDebounced(value), delay);\n    return () => clearTimeout(timer);\n  }, [value, delay]);\n  \n  return debounced;\n}\n```\n\n**Severity**: Low — functional but could be more type-safe and efficient.", timestamp: Date.now() - 7100000 },
    ],
    created_at: Date.now() - 7200000,
    updated_at: Date.now() - 7100000,
  },
  {
    id: "conv-003",
    task_id: "task_ghi789",
    task_status: "pending",
    price_cents: 100,
    messages: [
      { id: "m5", role: "user", content: "Create a competitive analysis of the top 5 project management tools. Include pricing, features, target audience, and a recommendation for a 50-person startup.", timestamp: Date.now() - 600000 },
    ],
    created_at: Date.now() - 600000,
    updated_at: Date.now() - 600000,
  },
];

// ─── Helpers ───

interface ScreenshotSpec {
  name: string;
  url: string;
  /** Actions to perform before taking screenshot */
  setup?: (page: Page) => Promise<void>;
  /** Wait condition before screenshot */
  waitFor?: string;
  /** Full page screenshot */
  fullPage?: boolean;
}

async function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

async function takeScreenshot(
  page: Page,
  spec: ScreenshotSpec,
  viewport: { width: number; height: number },
  suffix: string,
  outputDir: string,
) {
  await page.setViewportSize(viewport);

  console.log(`  📸 ${spec.name} (${suffix})`);

  await page.goto(`${BASE_URL}${spec.url}`, { waitUntil: "networkidle", timeout: 15000 }).catch(() => {
    // networkidle can timeout on pages with long-polling; fallback to domcontentloaded
    return page.goto(`${BASE_URL}${spec.url}`, { waitUntil: "domcontentloaded" });
  });

  // Additional setup actions (e.g., clicking tabs, filling forms)
  if (spec.setup) {
    await spec.setup(page);
  }

  // Wait for specific selector if needed
  if (spec.waitFor) {
    await page.waitForSelector(spec.waitFor, { timeout: 5000 }).catch(() => {});
  }

  // Extra settle time for animations and dynamic content
  await page.waitForTimeout(500);

  const filename = `${spec.name}${suffix === "mobile" ? "-mobile" : ""}.png`;
  await page.screenshot({
    path: path.join(outputDir, filename),
    fullPage: spec.fullPage ?? false,
  });
}

async function injectMockData(page: Page, userId: string) {
  // Inject localStorage data for chat conversations directly on the current page.
  // WHY: The app reads from localStorage key `openclaw_chats_{userId}`.
  // Using page.evaluate ensures data is available before the next navigation.
  const storageKey = `openclaw_chats_${userId}`;
  const data = JSON.stringify(MOCK_CONVERSATIONS);
  await page.evaluate(
    ({ key, val }: { key: string; val: string }) => { localStorage.setItem(key, val); },
    { key: storageKey, val: data },
  );
}

// ─── Screenshot Specs ───

const UNAUTH_PAGES: ScreenshotSpec[] = [
  { name: "01-landing-unauth", url: "/" },
  { name: "02-login", url: "/login" },
  { name: "03-404", url: "/this-page-does-not-exist" },
  {
    name: "04-worker-gate-signin",
    url: "/worker",
    waitFor: "text=Worker Dashboard",
  },
  {
    name: "05-worker-gate-register",
    url: "/worker",
    setup: async (page) => {
      // Click the "Register" tab button
      const registerBtn = page.locator("button", { hasText: "Register" });
      await registerBtn.click();
      await page.waitForTimeout(300);
    },
  },
];

// Auth pages are split: before and after mock data injection
const AUTH_PAGES_BEFORE_MOCK: ScreenshotSpec[] = [
  { name: "06-landing-auth", url: "/" },
  {
    name: "07-chat-empty",
    url: "/chat",
    waitFor: "text=What complex task",
  },
];

const AUTH_PAGES_AFTER_MOCK: ScreenshotSpec[] = [
  {
    name: "08-chat-with-conversation",
    url: "/chat?id=conv-001",
    waitFor: ".rounded-2xl", // wait for message bubbles
  },
  {
    name: "09-chat-sidebar",
    url: "/chat",
    waitFor: "text=New Chat",
  },
  {
    name: "10-dashboard",
    url: "/dashboard",
  },
  {
    name: "11-landing-full",
    url: "/",
    fullPage: true,
  },
];

// ─── Main ───

async function main() {
  const outputDir = path.resolve(OUTPUT_DIR);
  await ensureDir(outputDir);

  console.log(`\n🦞 OpenClaw UI/UX Screenshot Audit`);
  console.log(`   Output: ${outputDir}`);
  console.log(`   Server: ${BASE_URL}\n`);

  // Check if server is running
  try {
    await fetch(BASE_URL);
  } catch {
    console.error("❌ Dev server not running. Start it with: npm run dev");
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });

  try {
    // ── Phase 1: Unauthenticated screenshots ──
    console.log("Phase 1: Unauthenticated pages");
    const unauthCtx = await browser.newContext({ viewport: DESKTOP });
    const unauthPage = await unauthCtx.newPage();

    for (const spec of UNAUTH_PAGES) {
      await takeScreenshot(unauthPage, spec, DESKTOP, "desktop", outputDir);
      await takeScreenshot(unauthPage, spec, MOBILE, "mobile", outputDir);
    }

    await unauthCtx.close();

    // ── Phase 2: Authenticate via dev login ──
    console.log("\nPhase 2: Authenticating via dev login...");
    const authCtx = await browser.newContext({ viewport: DESKTOP });
    const authPage = await authCtx.newPage();

    // Navigate to login page
    await authPage.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });

    // Fill dev login form and submit
    const emailInput = authPage.locator('input[type="email"]');
    await emailInput.fill(DEV_EMAIL);
    await authPage.click("text=Dev Login");

    // Wait for redirect to /chat
    await authPage.waitForURL("**/chat**", { timeout: 10000 }).catch(() => {
      console.log("   ⚠️  Login redirect didn't reach /chat, trying to continue...");
    });

    console.log(`   ✅ Logged in as ${DEV_EMAIL}`);
    console.log(`   Current URL: ${authPage.url()}`);

    // Get the actual user ID from the next-auth session.
    // WHY: The localStorage key is `openclaw_chats_{userId}` where userId is
    // a MongoDB ObjectId assigned during login, not the email.
    const actualUserId = await authPage.evaluate(async () => {
      const res = await fetch("/api/auth/session");
      const session = await res.json();
      return session?.user?.id ?? null;
    });
    console.log(`   User ID: ${actualUserId ?? "unknown (using email fallback)"}`);
    console.log(`   Injecting mock conversations...`);
    await injectMockData(authPage, actualUserId ?? MOCK_USER_ID);

    // ── Phase 3: Authenticated screenshots (before mock data) ──
    console.log("\nPhase 3: Authenticated pages (empty states)");

    for (const spec of AUTH_PAGES_BEFORE_MOCK) {
      await takeScreenshot(authPage, spec, DESKTOP, "desktop", outputDir);
      await takeScreenshot(authPage, spec, MOBILE, "mobile", outputDir);
    }

    // ── Phase 4: Authenticated screenshots (with mock data) ──
    console.log("\nPhase 4: Authenticated pages (with data)");

    for (const spec of AUTH_PAGES_AFTER_MOCK) {
      await takeScreenshot(authPage, spec, DESKTOP, "desktop", outputDir);
      await takeScreenshot(authPage, spec, MOBILE, "mobile", outputDir);
    }

    await authCtx.close();

    // ── Summary ──
    const files = fs.readdirSync(outputDir).filter(f => f.endsWith(".png"));
    console.log(`\n✅ Done! ${files.length} screenshots saved to ${outputDir}`);
    console.log("\nFiles:");
    files.sort().forEach(f => console.log(`   ${f}`));

  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
