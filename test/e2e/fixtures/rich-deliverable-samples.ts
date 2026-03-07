/**
 * Realistic sample data for testing the rich deliverable platform.
 * Each sample represents a different task type with meaningful artifact content.
 */

/** Competitive analysis report — headings, tables, code (SQL), and structured data. */
export const COMPETITIVE_ANALYSIS_RESULT = `## Executive Summary

This report analyzes the top 5 AI coding assistant tools available in 2026. Based on feature comparison, pricing analysis, and user satisfaction data, **Cursor** leads in IDE integration while **GitHub Copilot** dominates in market share.

## Feature Comparison

| Tool | Language Support | IDE Integration | Code Review | Chat | Price/mo |
|------|-----------------|----------------|-------------|------|----------|
| GitHub Copilot | 30+ languages | VS Code, JetBrains, Neovim | Yes | Yes | $19 |
| Cursor | 25+ languages | Native IDE | Yes | Yes | $20 |
| Codeium | 20+ languages | VS Code, JetBrains | No | Yes | $12 |
| Amazon CodeWhisperer | 15+ languages | VS Code, JetBrains | Yes | No | $19 |
| Tabnine | 20+ languages | All major IDEs | No | Yes | $15 |

## Market Share Analysis

| Tool | Market Share (%) | YoY Growth (%) | Enterprise Adoption |
|------|----------------:|---------------:|---------------------|
| GitHub Copilot | 42.3 | +15.2 | High |
| Cursor | 18.7 | +89.4 | Medium |
| Codeium | 12.1 | +34.6 | Low |
| Amazon CodeWhisperer | 11.5 | +8.3 | High |
| Tabnine | 8.2 | -5.1 | Medium |

## Key Findings

### 1. Pricing Convergence
All major tools have converged around the $15-20/month range for individual plans. Enterprise pricing varies significantly, with GitHub Copilot Business at $39/user/month and Cursor Teams at $40/user/month.

### 2. Feature Differentiation
The primary differentiators are now:
- **Context window size** — Cursor leads with 200K tokens
- **Codebase awareness** — Cursor and Copilot both index full repos
- **Multi-file editing** — Cursor's Composer vs Copilot's multi-file suggestions

### 3. User Satisfaction Metrics

\`\`\`json
{
  "survey_date": "2026-02",
  "sample_size": 12500,
  "satisfaction_scores": {
    "cursor": { "overall": 4.6, "accuracy": 4.5, "speed": 4.7, "value": 4.2 },
    "copilot": { "overall": 4.3, "accuracy": 4.4, "speed": 4.5, "value": 4.0 },
    "codeium": { "overall": 4.1, "accuracy": 3.9, "speed": 4.3, "value": 4.5 },
    "codewhisperer": { "overall": 3.8, "accuracy": 4.0, "speed": 3.9, "value": 3.5 },
    "tabnine": { "overall": 3.7, "accuracy": 3.6, "speed": 4.1, "value": 3.8 }
  }
}
\`\`\`

## SQL Query for Churn Analysis

To track tool switching behavior, use this query on the analytics database:

\`\`\`sql
-- Monthly tool switching rate by company size
SELECT
    company_size_tier,
    DATE_TRUNC('month', switch_date) AS month,
    COUNT(DISTINCT user_id) AS switchers,
    COUNT(DISTINCT user_id)::float / LAG(COUNT(DISTINCT user_id)) OVER (
        PARTITION BY company_size_tier ORDER BY DATE_TRUNC('month', switch_date)
    ) - 1 AS switch_rate_change
FROM tool_switches
WHERE switch_date >= '2025-01-01'
GROUP BY company_size_tier, DATE_TRUNC('month', switch_date)
ORDER BY company_size_tier, month;
\`\`\`

## Recommendation

For a 50-person startup, we recommend **Cursor Teams** ($40/user/month):
- Best-in-class context window for large codebases
- Native multi-file editing reduces context-switching
- Growing enterprise adoption signals long-term viability
- 89% YoY growth indicates strong product momentum
`;

/** Code review result — multiple code files with security findings. */
export const CODE_REVIEW_RESULT = `## Security Review Summary

Found **3 critical**, **2 high**, and **4 medium** severity issues in the submitted pull request. Immediate action required on SQL injection and authentication bypass vulnerabilities.

### Critical: SQL Injection in User Search

\`\`\`python
# filename: api/users/search.py
# BEFORE (vulnerable)
@app.get("/api/users/search")
async def search_users(query: str, db: Session = Depends(get_db)):
    # CRITICAL: Direct string interpolation allows SQL injection
    results = db.execute(
        f"SELECT * FROM users WHERE name LIKE '%{query}%'"
    )
    return {"users": results.fetchall()}

# AFTER (fixed)
@app.get("/api/users/search")
async def search_users(query: str, db: Session = Depends(get_db)):
    results = db.execute(
        text("SELECT * FROM users WHERE name LIKE :pattern"),
        {"pattern": f"%{query}%"}
    )
    return {"users": results.fetchall()}
\`\`\`

### Critical: Authentication Bypass

\`\`\`typescript
// filename: middleware/auth.ts
// BEFORE (vulnerable) — JWT verification skipped for certain paths
export function verifyAuth(req: Request): AuthResult {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    // BUG: Returns success with admin role when no token provided!
    return { authenticated: true, role: "admin" };
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    return { authenticated: true, role: payload.role };
  } catch {
    return { authenticated: false, role: null };
  }
}

// AFTER (fixed)
export function verifyAuth(req: Request): AuthResult {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return { authenticated: false, role: null };
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    return { authenticated: true, role: payload.role };
  } catch {
    return { authenticated: false, role: null };
  }
}
\`\`\`

### High: Sensitive Data Exposure in Logs

\`\`\`go
// filename: handlers/payment.go
func HandlePayment(w http.ResponseWriter, r *http.Request) {
    var req PaymentRequest
    json.NewDecoder(r.Body).Decode(&req)

    // HIGH: Logging full credit card number!
    log.Printf("Processing payment: card=%s amount=%d",
        req.CardNumber, req.Amount)

    // FIX: Mask card number, log only last 4 digits
    masked := "****-****-****-" + req.CardNumber[len(req.CardNumber)-4:]
    log.Printf("Processing payment: card=%s amount=%d",
        masked, req.Amount)
}
\`\`\`

### Severity Summary

| Category | Critical | High | Medium | Low |
|----------|:--------:|:----:|:------:|:---:|
| Injection | 1 | 0 | 1 | 0 |
| Authentication | 1 | 0 | 0 | 0 |
| Data Exposure | 0 | 2 | 1 | 0 |
| Configuration | 1 | 0 | 2 | 0 |
| **Total** | **3** | **2** | **4** | **0** |

> **Action Required**: The SQL injection and auth bypass must be fixed before merging. All critical issues should block the release pipeline.
`;

/** Data analysis result — tables, charts description, and HTML visualization. */
export const DATA_ANALYSIS_RESULT = `## Monthly Revenue Dashboard — Q1 2026

### Revenue by Product Line

| Month | SaaS | API | Enterprise | Support | Total |
|-------|-----:|----:|----------:|--------:|------:|
| Jan | $142,300 | $38,500 | $215,000 | $12,800 | $408,600 |
| Feb | $156,800 | $41,200 | $215,000 | $13,100 | $426,100 |
| Mar | $168,400 | $45,900 | $230,000 | $14,200 | $458,500 |

### Key Metrics

| Metric | Jan | Feb | Mar | Trend |
|--------|----:|----:|----:|:-----:|
| MRR | $408,600 | $426,100 | $458,500 | +12.2% |
| Churn Rate | 3.2% | 2.8% | 2.5% | Improving |
| ARPU | $89.50 | $91.20 | $94.80 | +5.9% |
| NPS Score | 42 | 45 | 48 | +6 pts |
| Active Users | 4,567 | 4,672 | 4,836 | +5.9% |

### Revenue Trend Visualization

\`\`\`html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: system-ui, sans-serif; background: #18181b; color: #e4e4e7; padding: 20px; margin: 0; }
    .chart { display: flex; align-items: flex-end; gap: 16px; height: 200px; padding: 20px; }
    .bar-group { display: flex; flex-direction: column; align-items: center; flex: 1; }
    .bar { width: 60px; background: linear-gradient(to top, #f97316, #fb923c); border-radius: 4px 4px 0 0; transition: height 0.5s; position: relative; }
    .bar:hover { background: linear-gradient(to top, #ea580c, #f97316); }
    .bar .value { position: absolute; top: -24px; left: 50%; transform: translateX(-50%); font-size: 12px; color: #a1a1aa; white-space: nowrap; }
    .label { margin-top: 8px; font-size: 13px; color: #a1a1aa; }
    h3 { text-align: center; color: #f97316; margin-bottom: 4px; }
    .subtitle { text-align: center; color: #71717a; font-size: 13px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <h3>Monthly Revenue Growth</h3>
  <p class="subtitle">Q1 2026 — All Product Lines Combined</p>
  <div class="chart">
    <div class="bar-group">
      <div class="bar" style="height: 160px"><span class="value">$408.6K</span></div>
      <span class="label">Jan</span>
    </div>
    <div class="bar-group">
      <div class="bar" style="height: 175px"><span class="value">$426.1K</span></div>
      <span class="label">Feb</span>
    </div>
    <div class="bar-group">
      <div class="bar" style="height: 200px"><span class="value">$458.5K</span></div>
      <span class="label">Mar</span>
    </div>
  </div>
</body>
</html>
\`\`\`

### Churn Analysis by Cohort

\`\`\`json
{
  "analysis_period": "Q1 2026",
  "cohorts": {
    "2025-Q1": { "initial": 1200, "remaining": 892, "retention": 0.743 },
    "2025-Q2": { "initial": 1450, "remaining": 1145, "retention": 0.790 },
    "2025-Q3": { "initial": 1680, "remaining": 1394, "retention": 0.830 },
    "2025-Q4": { "initial": 1890, "remaining": 1680, "retention": 0.889 }
  },
  "insight": "Newer cohorts show significantly better retention, indicating product improvements in H2 2025 are working."
}
\`\`\`

### Recommendations

1. **Double down on API revenue** — 19% growth rate, highest margin product
2. **Investigate SaaS churn** — still losing 2.5%/month, target < 2%
3. **Enterprise upsell** — Q2 renewal for 3 large accounts, prep case studies
`;

/** Result with attachments — tests multimodal file delivery UI. */
export const ATTACHMENT_RESULT = `## Design Deliverables

Here are the final design assets for the landing page redesign project.

### What's Included

1. **Homepage mockup** (Figma export) — Full desktop layout at 1440px width
2. **Brand guidelines PDF** — Colors, typography, spacing system
3. **Icon set** — 24 custom SVG icons in a ZIP archive
4. **Hero animation** — MP4 preview of the animated hero section

### Design Decisions

- Used a **dark theme** with orange accent (#F97316) to match the existing brand
- Hero section features a subtle particle animation for visual interest
- Card-based layout for feature sections, max 3 per row
- Mobile-first responsive breakpoints: 640px, 768px, 1024px, 1280px

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Primary | #F97316 | CTAs, links, accents |
| Background | #18181B | Page background |
| Surface | #27272A | Cards, panels |
| Text Primary | #E4E4E7 | Body text |
| Text Secondary | #A1A1AA | Labels, captions |

### Next Steps

Please review the attached files and provide feedback by Friday. I can iterate on the mockups within 24 hours of receiving comments.
`;

/** Attachment metadata for the design deliverables conversation. */
export const ATTACHMENT_ITEMS = [
  {
    s3_key: "tasks/task_test_attach/abc001.png",
    filename: "homepage-mockup-v3.png",
    content_type: "image/png",
    size_bytes: 2_458_624,
  },
  {
    s3_key: "tasks/task_test_attach/abc002.pdf",
    filename: "brand-guidelines-2026.pdf",
    content_type: "application/pdf",
    size_bytes: 1_245_184,
  },
  {
    s3_key: "tasks/task_test_attach/abc003.zip",
    filename: "icon-set-24-svg.zip",
    content_type: "application/zip",
    size_bytes: 856_320,
  },
  {
    s3_key: "tasks/task_test_attach/abc004.mp4",
    filename: "hero-animation-preview.mp4",
    content_type: "video/mp4",
    size_bytes: 8_912_896,
  },
];

/** Simple short result — tests graceful degradation with minimal artifacts. */
export const SIMPLE_CHAT_RESULT = `The capital of France is **Paris**. It has been the capital since the 10th century and is home to approximately 2.1 million people within the city limits, with over 12 million in the greater metropolitan area.

Paris is also known as the "City of Light" (La Ville Lumière) and hosts iconic landmarks including the Eiffel Tower, the Louvre Museum, and Notre-Dame Cathedral.
`;

/** Build test conversations for injection into localStorage. */
export function buildTestConversations(userId: string) {
  const now = Date.now();

  return [
    {
      id: "test-conv-analysis",
      task_id: "task_test_analysis",
      task_status: "completed",
      price_cents: 350,
      last_worker_id: null,
      messages: [
        {
          id: "msg-1a",
          role: "user" as const,
          content: "Write a competitive analysis of the top 5 AI coding assistants. Include pricing, market share, features, and a recommendation for a 50-person startup.",
          timestamp: now - 120_000,
        },
        {
          id: "msg-1b",
          role: "assistant" as const,
          content: COMPETITIVE_ANALYSIS_RESULT,
          timestamp: now - 60_000,
          result_meta: {
            task_id: "task_test_analysis",
            task_type: "analysis",
            price_cents: 350,
            completed_at: new Date(now - 60_000).toISOString(),
            worker_display_name: "Deep Research Pro",
            worker_avatar_url: null,
            word_count: 520,
            duration_seconds: 45.3,
            format: "markdown",
          },
        },
      ],
      created_at: now - 120_000,
      updated_at: now - 60_000,
    },
    {
      id: "test-conv-code-review",
      task_id: "task_test_code",
      task_status: "completed",
      price_cents: 500,
      last_worker_id: null,
      messages: [
        {
          id: "msg-2a",
          role: "user" as const,
          content: "Review my pull request for security vulnerabilities. Focus on SQL injection, authentication issues, and data exposure risks.",
          timestamp: now - 300_000,
        },
        {
          id: "msg-2b",
          role: "assistant" as const,
          content: CODE_REVIEW_RESULT,
          timestamp: now - 240_000,
          result_meta: {
            task_id: "task_test_code",
            task_type: "code",
            price_cents: 500,
            completed_at: new Date(now - 240_000).toISOString(),
            worker_display_name: "SecurityBot v3",
            worker_avatar_url: null,
            word_count: 380,
            duration_seconds: 32.7,
            format: "markdown",
          },
        },
      ],
      created_at: now - 300_000,
      updated_at: now - 240_000,
    },
    {
      id: "test-conv-data",
      task_id: "task_test_data",
      task_status: "completed",
      price_cents: 450,
      last_worker_id: null,
      messages: [
        {
          id: "msg-3a",
          role: "user" as const,
          content: "Analyze our Q1 2026 revenue data across all product lines. Create a dashboard summary with key metrics, trends, and actionable recommendations.",
          timestamp: now - 500_000,
        },
        {
          id: "msg-3b",
          role: "assistant" as const,
          content: DATA_ANALYSIS_RESULT,
          timestamp: now - 440_000,
          result_meta: {
            task_id: "task_test_data",
            task_type: "analysis",
            price_cents: 450,
            completed_at: new Date(now - 440_000).toISOString(),
            worker_display_name: "DataCruncher AI",
            worker_avatar_url: null,
            word_count: 310,
            duration_seconds: 28.1,
            format: "markdown",
          },
        },
      ],
      created_at: now - 500_000,
      updated_at: now - 440_000,
    },
    {
      id: "test-conv-attachments",
      task_id: "task_test_attach",
      task_status: "completed",
      price_cents: 800,
      last_worker_id: null,
      messages: [
        {
          id: "msg-5a",
          role: "user" as const,
          content: "Create the final design deliverables for the landing page redesign. Include mockups, brand guidelines, icon set, and the hero animation preview.",
          timestamp: now - 180_000,
        },
        {
          id: "msg-5b",
          role: "assistant" as const,
          content: ATTACHMENT_RESULT,
          timestamp: now - 90_000,
          result_meta: {
            task_id: "task_test_attach",
            task_type: "design",
            price_cents: 800,
            completed_at: new Date(now - 90_000).toISOString(),
            worker_display_name: "DesignStudio AI",
            worker_avatar_url: null,
            word_count: 180,
            duration_seconds: 62.4,
            format: "markdown",
            attachments: ATTACHMENT_ITEMS,
          },
        },
      ],
      created_at: now - 180_000,
      updated_at: now - 90_000,
    },
    {
      id: "test-conv-simple",
      task_id: "task_test_simple",
      task_status: "completed",
      price_cents: 2,
      last_worker_id: null,
      messages: [
        {
          id: "msg-4a",
          role: "user" as const,
          content: "What is the capital of France?",
          timestamp: now - 600_000,
        },
        {
          id: "msg-4b",
          role: "assistant" as const,
          content: SIMPLE_CHAT_RESULT,
          timestamp: now - 595_000,
          result_meta: {
            task_id: "task_test_simple",
            task_type: "chat",
            price_cents: 2,
            completed_at: new Date(now - 595_000).toISOString(),
            worker_display_name: "QuickAnswer Bot",
            worker_avatar_url: null,
            word_count: 52,
            duration_seconds: 3.2,
            format: "markdown",
          },
        },
      ],
      created_at: now - 600_000,
      updated_at: now - 595_000,
    },
  ];
}
