/**
 * Mock Worker Agent — returns pre-crafted responses without calling Claude API.
 * Useful for E2E testing when no ANTHROPIC_API_KEY is available.
 *
 * Usage:
 *   PLATFORM_URL=http://localhost:3000 npx tsx scripts/mock-worker-agent.ts
 */

const PLATFORM_URL = (process.env.PLATFORM_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const POLL_WAIT = 15;

let workerToken: string | null = process.env.WORKER_TOKEN ?? null;

// ─── Mock Responses by keyword matching ───

const MOCK_RESPONSES: Array<{ match: RegExp; response: string }> = [
  {
    match: /aws|gcp|azure|cloud|compare/i,
    response: CLOUD_COMPARISON_RESPONSE(),
  },
  {
    match: /security|vulnerab|sql.*inject|xss|review.*code/i,
    response: SECURITY_REVIEW_RESPONSE(),
  },
  {
    match: /microservice|monolith|architect/i,
    response: ARCHITECTURE_ANALYSIS_RESPONSE(),
  },
  {
    match: /quantum|computing|trend/i,
    response: QUANTUM_RESEARCH_RESPONSE(),
  },
  {
    match: /.*/,
    response: DEFAULT_RESPONSE(),
  },
];

// ─── API Helpers ───

async function fetchApi<T>(
  url: string,
  init: RequestInit,
): Promise<T> {
  const res = await fetch(url, init);
  const json = await res.json() as { success: boolean; data?: T; error?: string };
  if (!json.success || !json.data) {
    throw new Error(json.error ?? `HTTP ${res.status}`);
  }
  return json.data;
}

function authHeaders(): Record<string, string> {
  if (!workerToken) throw new Error("No token");
  return { Authorization: `Bearer ${workerToken}` };
}

async function register(): Promise<void> {
  console.log("📡 Registering mock worker...");
  const result = await fetchApi<{ token: string; worker_id: string }>(
    `${PLATFORM_URL}/api/worker/connect`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        worker_type: "claude",
        model_info: { provider: "mock", model: "mock-v1", capabilities: [] },
      }),
    },
  );
  workerToken = result.token;
  console.log(`✅ Registered: ${result.worker_id}`);
  console.log(`   Token: ${workerToken}`);
}

interface TaskData {
  id: string;
  type: string;
  input: { messages: Array<{ role: string; content: string }> };
}

async function pollTask(): Promise<TaskData | null> {
  try {
    const result = await fetchApi<{ task: TaskData | null }>(
      `${PLATFORM_URL}/api/work/next?wait=${POLL_WAIT}`,
      { method: "GET", headers: authHeaders() },
    );
    return result.task;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("timeout") || msg.includes("408")) return null;
    throw err;
  }
}

async function submitResult(taskId: string, content: string): Promise<void> {
  await fetchApi(
    `${PLATFORM_URL}/api/work/submit`,
    {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        task_id: taskId,
        output: { content, format: "markdown" },
      }),
    },
  );
}

function matchResponse(messages: Array<{ content: string }>): string {
  const fullText = messages.map((m) => m.content).join(" ");
  for (const entry of MOCK_RESPONSES) {
    if (entry.match.test(fullText)) return entry.response;
  }
  return DEFAULT_RESPONSE();
}

// ─── Main Loop ───

async function main(): Promise<void> {
  console.log("🦞 Mock Worker Agent");
  console.log(`   Platform: ${PLATFORM_URL}\n`);

  if (!workerToken) {
    await register();
  } else {
    console.log("Using existing WORKER_TOKEN");
  }

  console.log("\n🔄 Polling for tasks...\n");

  let failures = 0;
  while (failures < 10) {
    try {
      const task = await pollTask();
      if (!task) {
        process.stdout.write(".");
        failures = 0;
        continue;
      }

      console.log(`\n📋 Task: ${task.id} (type=${task.type})`);

      // Simulate processing time (1-3s)
      const delay = 1000 + Math.random() * 2000;
      await new Promise((r) => setTimeout(r, delay));

      const response = matchResponse(task.input.messages);
      await submitResult(task.id, response);

      console.log(`✅ Submitted (${(delay / 1000).toFixed(1)}s, ${response.length} chars)`);
      failures = 0;
    } catch (err) {
      failures++;
      console.error(`❌ Error (${failures}/10):`, err instanceof Error ? err.message : err);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  console.log("💀 Too many consecutive failures. Exiting.");
}

// ─── Pre-crafted Responses ───

function CLOUD_COMPARISON_RESPONSE(): string {
  return `**Cloud Platform Comparison: AWS vs GCP vs Azure for a 50-Person Series A Startup**

## Executive Summary

For a 50-person Series A startup, **AWS** offers the broadest ecosystem but highest complexity, **GCP** provides the best developer experience with competitive pricing, and **Azure** excels for Microsoft-centric teams. Our recommendation: **GCP** for most startups, with AWS as runner-up.

## Pricing Comparison

| Service | AWS | GCP | Azure |
|---------|-----|-----|-------|
| Compute (2 vCPU, 8GB) | $60/mo (t3.large) | $52/mo (e2-standard-2) | $58/mo (B2s) |
| Managed DB (PostgreSQL) | $95/mo (RDS db.t3.medium) | $78/mo (Cloud SQL) | $90/mo (Flexible Server) |
| Object Storage (1TB) | $23/mo (S3) | $20/mo (Cloud Storage) | $21/mo (Blob) |
| Kubernetes (3 nodes) | $219/mo (EKS) | $195/mo (GKE, free control plane) | $210/mo (AKS) |
| CDN (1TB transfer) | $85/mo (CloudFront) | $80/mo (Cloud CDN) | $82/mo (Front Door) |
| **Monthly Total** | **$482** | **$425** | **$461** |

> **Note:** GCP offers sustained-use discounts automatically, often reducing costs by an additional 10-20%.

## Developer Experience Rating

| Dimension | AWS | GCP | Azure |
|-----------|-----|-----|-------|
| CLI & Tooling | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Documentation | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Console UX | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| IAM Complexity | ⭐⭐ (complex) | ⭐⭐⭐⭐ (simpler) | ⭐⭐⭐ |
| AI/ML Services | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Startup Credits | $100K (Activate) | $100K (for Startups) | $150K (Founders Hub) |

## Key Differentiators

### AWS
- **Pros:** Largest service catalog (200+), most enterprise adoption, best for hybrid cloud
- **Cons:** Steepest learning curve, complex IAM, cluttered console

### GCP
- **Pros:** Best K8s (GKE), superior data analytics (BigQuery), cleanest APIs
- **Cons:** Smaller partner ecosystem, fewer regions than AWS

### Azure
- **Pros:** Best MS integration (AD, Office 365), strong enterprise compliance, generous credits
- **Cons:** Naming inconsistencies, portal can be slow, documentation gaps

## Recommendation

> **For a 50-person Series A startup, we recommend Google Cloud Platform (GCP).**

### Why GCP Wins for Startups:
1. **Lower TCO** — 12% cheaper than AWS on comparable workloads
2. **Best DX** — \`gcloud\` CLI is intuitive, documentation is excellent
3. **Free GKE control plane** — saves ~$70/mo vs EKS
4. **BigQuery** — unmatched for analytics as you scale
5. **AI/ML** — Vertex AI and Gemini integration if you need AI features

### When to Choose AWS Instead:
- You need a specific AWS-only service (e.g., Redshift, Kinesis)
- Your team already has deep AWS expertise
- Enterprise clients require AWS compliance certifications`;
}

function SECURITY_REVIEW_RESPONSE(): string {
  return `**Security Audit Report: Critical SQL Injection Vulnerability Found**

## Summary

The provided Express.js endpoint contains a **critical SQL injection vulnerability** that allows attackers to read, modify, or delete any data in the database. This must be fixed immediately.

## Critical Issues

### 1. SQL Injection (CRITICAL — CVSS 9.8)

The user-supplied \`req.params.id\` is directly interpolated into the SQL query without any sanitization:

\`\`\`javascript
// ❌ VULNERABLE — direct string interpolation
const query = \`SELECT * FROM users WHERE id = \${req.params.id}\`;
\`\`\`

**Attack Example:**
\`\`\`
GET /user/1 OR 1=1; DROP TABLE users; --
\`\`\`

This would execute:
\`\`\`sql
SELECT * FROM users WHERE id = 1 OR 1=1; DROP TABLE users; --
\`\`\`

### 2. No Input Validation (HIGH)

The \`:id\` parameter accepts any string. There's no validation that it's a valid user ID format.

### 3. No Authentication/Authorization (HIGH)

The endpoint has no middleware to verify the requester's identity or check if they're authorized to access this user's data.

### 4. No Error Handling (MEDIUM)

Database errors are silently passed to the response, potentially leaking schema information.

## Suggested Improvements

### Fix 1: Use Parameterized Queries

\`\`\`javascript
// ✅ SAFE — parameterized query
app.get('/user/:id', (req, res) => {
  const query = 'SELECT * FROM users WHERE id = $1';
  db.query(query, [req.params.id], (err, result) => {
    if (err) {
      console.error('DB error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  });
});
\`\`\`

### Fix 2: Add Input Validation

\`\`\`javascript
// Validate ID is a positive integer
app.get('/user/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  // ... parameterized query using 'id'
});
\`\`\`

### Fix 3: Add Authentication Middleware

\`\`\`javascript
const authenticate = require('./middleware/auth');
const authorize = require('./middleware/authorize');

app.get('/user/:id',
  authenticate,              // Verify JWT token
  authorize('read:users'),   // Check permission
  async (req, res) => {
    // ... safe query
  }
);
\`\`\`

## Architecture Notes

| Concern | Status | Fix Priority |
|---------|--------|-------------|
| SQL Injection | ❌ Critical | **Immediate** |
| Input Validation | ❌ Missing | High |
| Auth/AuthZ | ❌ Missing | High |
| Error Handling | ❌ Missing | Medium |
| Rate Limiting | ❌ Missing | Medium |
| Response Sanitization | ⚠️ Unknown | Low |

> **Recommendation:** Use an ORM (Prisma, Drizzle, or Knex) to eliminate raw SQL entirely. ORMs use parameterized queries by default.`;
}

function ARCHITECTURE_ANALYSIS_RESPONSE(): string {
  return `**Architecture Decision: Microservices vs Monolith for E-Commerce (10K orders/day)**

## Overview

Analyzing whether a monolithic or microservices architecture is more appropriate for an e-commerce platform processing ~10,000 orders per day (~7 orders/minute at peak).

## Decision Matrix

| Criterion | Weight | Monolith | Microservices |
|-----------|--------|----------|---------------|
| Development Speed | 25% | ⭐⭐⭐⭐⭐ (5) | ⭐⭐⭐ (3) |
| Operational Complexity | 20% | ⭐⭐⭐⭐⭐ (5) | ⭐⭐ (2) |
| Scalability | 20% | ⭐⭐⭐ (3) | ⭐⭐⭐⭐⭐ (5) |
| Team Independence | 15% | ⭐⭐ (2) | ⭐⭐⭐⭐⭐ (5) |
| Fault Isolation | 10% | ⭐⭐ (2) | ⭐⭐⭐⭐ (4) |
| Technology Flexibility | 10% | ⭐⭐ (2) | ⭐⭐⭐⭐⭐ (5) |
| **Weighted Score** | | **3.85** | **3.70** |

> **Key Insight:** At 10K orders/day, a well-designed monolith handles the load easily. The threshold where microservices become necessary is typically 50K-100K orders/day.

## Risk Analysis

### Monolith Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Database bottleneck | Medium | High | Read replicas, caching (Redis) |
| Deployment coupling | High | Medium | Feature flags, canary deploys |
| Single point of failure | Medium | High | Multi-AZ deployment, health checks |
| Tech debt accumulation | High | Medium | Modular monolith pattern, domain boundaries |

### Microservices Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Distributed transaction failures | High | Critical | Saga pattern, event sourcing |
| Service discovery complexity | Medium | High | Service mesh (Istio/Linkerd) |
| Debugging difficulty | High | High | Distributed tracing (Jaeger) |
| Data consistency issues | High | Critical | CQRS, eventual consistency patterns |
| Infra cost explosion | Medium | High | Right-sizing, auto-scaling policies |

## Recommendation

> **Start with a Modular Monolith.** Plan for microservices extraction at 50K+ orders/day.

### Why Modular Monolith Wins at 10K/day:

1. **10K orders/day = ~7/min peak** — a single Node.js process handles this trivially
2. **Team size matters** — microservices need 3+ teams; for <20 developers, a monolith is faster
3. **Operational overhead** — K8s + service mesh + distributed tracing adds months of infra work
4. **Data consistency** — single database means ACID transactions (critical for e-commerce)

### Modular Monolith Architecture:

\`\`\`
src/
  modules/
    catalog/        # Product listings, search, categories
    orders/         # Order lifecycle, state machine
    payments/       # Stripe/payment gateway integration
    inventory/      # Stock management, reservations
    shipping/       # Logistics, tracking, notifications
    users/          # Auth, profiles, addresses
  shared/
    database/       # Shared DB connection, migrations
    events/         # In-process event bus (extract to Kafka later)
    cache/          # Redis abstraction
\`\`\`

## Migration Timeline (When Ready)

If you do eventually need microservices (50K+ orders/day):

| Phase | Duration | Extract |
|-------|----------|---------|
| Phase 1 | 2-3 months | **Catalog** service (highest read traffic, easy to separate) |
| Phase 2 | 3-4 months | **Payments** service (security isolation, PCI compliance) |
| Phase 3 | 2-3 months | **Inventory** service (real-time stock, event-driven) |
| Phase 4 | 3-4 months | **Orders** orchestrator (saga pattern) |
| Phase 5 | 2 months | **Shipping** service (third-party integrations) |
| **Total** | **12-17 months** | Full microservices migration |

> **Warning:** Do not attempt a "big bang" migration. Extract one service at a time, run in parallel with the monolith, and cut over gradually using feature flags.`;
}

function QUANTUM_RESEARCH_RESPONSE(): string {
  return `**Quantum Computing Trends 2026: Enterprise Applications**

## Executive Summary

Quantum computing in 2026 is transitioning from research curiosity to early enterprise utility. Key breakthroughs in error correction and hybrid quantum-classical algorithms are enabling practical applications in drug discovery, financial modeling, and supply chain optimization.

## Key Findings

- **IBM Condor (1,121 qubits)** is now commercially available through IBM Quantum Network
- **Google's Willow chip** achieved quantum error correction below the threshold, a historic milestone
- **Hybrid quantum-classical** algorithms (VQE, QAOA) are the practical path for enterprises today
- **Quantum-safe cryptography** migration is now mandatory for financial and healthcare sectors
- Enterprise spending on quantum computing grew **340% YoY** to $2.8B globally

## Detailed Analysis

### Hardware Landscape

| Provider | Qubits | Error Rate | Access Model |
|----------|--------|-----------|-------------|
| IBM Quantum | 1,121 | 0.1% (2Q) | Cloud (Qiskit Runtime) |
| Google Quantum AI | 105 (Willow) | Below threshold | Research partnerships |
| IonQ Forte | 36 (trapped ion) | 0.3% | AWS Braket, Azure Quantum |
| Rigetti Ankaa-3 | 84 | 0.5% | Cloud API |
| QuEra | 256 (neutral atom) | 0.2% | Early access |

### Practical Enterprise Applications (2026)

1. **Drug Discovery** — Pfizer and Roche using quantum simulation for molecular modeling, reducing preclinical trial time by 40%
2. **Financial Risk** — JPMorgan's quantum Monte Carlo achieves 100x speedup for portfolio VaR calculations
3. **Supply Chain** — DHL using quantum annealing (D-Wave) for route optimization across 500+ nodes
4. **Cryptography** — NIST post-quantum standards (ML-KEM, ML-DSA) now in production at major banks

## Recommendations

> For enterprises in 2026, the action items are clear:

1. **Start quantum literacy programs** — Train 5-10 engineers in Qiskit or Cirq
2. **Identify quantum-advantage problems** — Optimization (logistics), simulation (chemistry), and ML are the first targets
3. **Migrate to quantum-safe crypto** — Begin TLS 1.3 + ML-KEM migration now; mandate is 2028
4. **Use hybrid approaches** — Don't wait for fault-tolerant quantum; hybrid classical-quantum algorithms work today
5. **Budget $200-500K/year** — For quantum cloud credits and a small exploration team

## Sources & References

- IBM Quantum Roadmap 2025-2033
- Google Quantum AI: "Quantum Error Correction Below Threshold" (Nature, 2025)
- McKinsey: "Quantum Computing Enterprise Readiness Report 2026"
- NIST Post-Quantum Cryptography Standards (FIPS 203, 204, 205)`;
}

function DEFAULT_RESPONSE(): string {
  return `**Here's a clear and helpful answer to your question.**

## Summary

Thank you for your question. Here's a structured response addressing your query.

## Key Points

- The question has been carefully analyzed
- Multiple perspectives have been considered
- Practical recommendations are provided below

## Analysis

Your question touches on an important topic. Here are the key considerations:

1. **Context matters** — The best approach depends on your specific situation
2. **Trade-offs exist** — Each option has advantages and disadvantages
3. **Start simple** — Begin with the simplest solution that works, then iterate

## Recommendation

> Start with the simplest approach that meets your requirements, then optimize based on real-world feedback.

If you need more specific advice, please provide additional context about your use case.`;
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
