# Staging 部署调试记录

**最后更新**: 2026-03-01
**部署地址**: https://openclaw-jobs.zzsspp99.workers.dev
**运行平台**: Cloudflare Workers (via @opennextjs/cloudflare)

---

## 核心问题

**Buyer Dashboard `/api/balance` 在浏览器中始终返回 500**，但用 curl 测试相同的 endpoint（带同一 session cookie）返回 200。

### 用户反馈流程
1. 用户登录（email+password via Cognito）→ 成功
2. 重定向到 /dashboard → 页面正常渲染
3. Dashboard 客户端代码调用 `GET /api/balance` → **500 Internal Server Error**
4. 浏览器 Network tab 显示 response `content-type: text/html`（4678 bytes）
5. 这不是我们的 JSON 错误响应 — 是 OpenNext 或 Cloudflare 的 HTML 错误页面

---

## 已确认的事实

### 服务端代码正常（通过 curl 验证）
```bash
# 简单 curl — 200 ✅
curl -H "Cookie: __Secure-authjs.session-token=..." \
  https://openclaw-jobs.zzsspp99.workers.dev/api/balance
# → {"success":true,"data":{"amount_cents":50,...}}

# 浏览器相同 headers — 200 ✅
curl -H "Cookie: __Secure-authjs.session-token=..." \
  -H "Content-Type: application/json" \
  -H "Sec-Fetch-Mode: cors" \
  -H "Sec-Fetch-Site: same-origin" \
  -H "Referer: .../dashboard" \
  https://openclaw-jobs.zzsspp99.workers.dev/api/balance
# → 也是 200 ✅
```

### 完整 OAuth 流程正常（通过 curl 验证）
1. 获取 CSRF token → ✅
2. POST /api/auth/signin/cognito → 302 到 Cognito ✅
3. 提交 Cognito 凭据 → 获取 auth code ✅
4. 回调 /api/auth/callback/cognito → 302 + set-cookie ✅
5. 用新 cookie 调用 /api/balance → 200 ✅

### Debug endpoint 在浏览器中正常
- `GET /api/debug/auth-check` 在浏览器中返回 JSON
- `auth()` 返回完整 session
- `getToken()` 返回 null（但不影响，因为我们用 auth()）

---

## 已发现和修复的问题

### 1. Worker 挂起 — 静态 import next-auth（已修复）
**问题**: OpenNext 将所有路由打包为单个 `worker.js`。顶层 `import NextAuth from "next-auth"` 在模块初始化阶段执行，导致 Worker 挂起。
**修复**: 所有 next-auth 相关 import 使用 `await import()` 动态加载，封装在 `getInstance()` 懒加载单例中。

### 2. Auth.js handler 缺少 context（已修复）
**问题**: Next.js App Router catch-all 路由传递 `(req, { params })` 给 handler。Wrapper 只传 `req` 丢掉 `context`，导致 `error=Configuration`。
**修复**: 用 `(...args: unknown[])` 透传所有参数。

### 3. MongoDB 连接失败后 Promise 永久缓存（已修复）
**问题**: `client.connect()` 失败后，rejected promise 留在全局缓存中，后续所有请求永远失败。
**修复**: 添加 `connectWithRetry()` + 失败时清除缓存。

### 4. MongoDB sparse 索引不排除 null（已修复）
**问题**: `sparse: true` 只排除字段缺失的文档，不排除 `field: null`。
**修复**: 用 `partialFilterExpression: { field: { $type: "string" } }`。

### 5. Worker 注册缺少 balance 初始化（已修复）
**问题**: `registerWorker()` 创建 worker 后没有调用 `initializeBalance()`，Dashboard 的 `getBalance()` 会抛 NotFoundError。
**修复**: 注册后立即 `initializeBalance(workerId, 0)` + `getBalance()` 加自动初始化兜底。

### 6. HTTP 204 不能有 body（已修复）
**问题**: `NextResponse.json(data, { status: 204 })` 在 Cloudflare Workers 抛错（严格 HTTP 规范）。
**修复**: 改为 `{ status: 200 }`。

### 7. getToken() 尝试 — 失败并回退
**尝试**: 用 `getToken({ req: request, secret })` 替代 `auth()` 来读取 session。
**发现**:
- `getToken()` 默认 `secureCookie=false`，寻找 `authjs.session-token`，但实际 cookie 是 `__Secure-authjs.session-token`
- 修复 secureCookie 后，`import("next-auth/jwt")` 本身导致 Worker 返回 HTML 500（import 失败）
- **回退**: 恢复使用 `auth()`，因为 debug endpoint 证明 `auth()` 在 Workers 上可以工作

---

## 当前未解决：浏览器 vs Curl 差异

### 问题表现
| 测试方式 | 结果 | Content-Type |
|---------|------|-------------|
| curl（简单） | 200 ✅ | application/json |
| curl（浏览器 headers） | 200 ✅ | application/json |
| 浏览器 fetch | 500 ❌ | text/html (4678 bytes) |

### 差异分析
浏览器请求和 curl 请求的主要区别：

| Header | 浏览器 | Curl |
|--------|-------|------|
| Content-Type | application/json（由 fetchApi 设置） | 无 |
| Sec-Fetch-Mode | cors | 无 |
| Sec-Fetch-Site | same-origin | 无 |
| Referer | .../dashboard | 无 |
| Accept-Encoding | gzip, deflate, br, zstd | 无 |

**但**：用 curl 模拟完全相同的 headers 仍然返回 200。所以 headers 不是原因。

### 可能的根因

#### 假设 1：session cookie 失效
浏览器的 session cookie 可能已经过期或无效（来自之前的 getToken 部署导致的失败登录）。但用户可以看到 dashboard 页面，说明 session 应该是有效的。

#### 假设 2：Cloudflare CDN 缓存了旧的 500 响应
之前 getToken 部署时返回了 HTML 500。Cloudflare CDN 可能缓存了这个响应。但 API 请求带 Cookie 通常不会被缓存。

#### 假设 3：OpenNext 处理浏览器请求的方式不同
OpenNext 可能在路由层有不同的处理逻辑，基于请求 headers 决定是返回 JSON 还是渲染 HTML 错误页面。

#### 假设 4：auth() 在特定请求上下文中失败
`auth()` 内部用 Next.js `cookies()` API。在 OpenNext/Workers 上，这个 API 的行为可能在不同的请求上下文中不一致。Debug endpoint 工作是因为它直接调用 `auth()` 在简单的请求上下文中，但 balance endpoint 经过 `enforceRateLimit` 等中间步骤后上下文可能不同。

#### 假设 5：客户端 fetchApi 问题
`fetchApi()` 设置了 `Content-Type: application/json` 在 GET 请求上（不寻常但不应导致服务端错误）。如果服务端返回非 JSON，`response.json()` 会抛出客户端错误。

---

## 代码流程

### 客户端调用链
```
app/dashboard/page.tsx
  → useSession() 检查认证
  → useBalance(isAuthenticated)
    → lib/hooks/use-balance.ts
      → getBalance() from lib/api/balance-client.ts
        → fetchApi<BalanceData>("/api/balance")
          → lib/api/fetch-api.ts
            → fetch("/api/balance", { headers: { "Content-Type": "application/json" } })
```

### 服务端处理链
```
app/api/balance/route.ts → GET(request)
  1. generateRequestId()
  2. enforceRateLimit(request, "balance_check")  ← 可能的问题点？
  3. requireAuth(request)
     → import("@/lib/auth")
     → auth()
     → session.user.id
  4. getBalance(userId)
     → getDb()
     → findOne({ _id: userId })
     → auto-initialize if not found
  5. NextResponse.json(successResponse(...))
```

### 关键文件
- `lib/api-handler.ts` — requireAuth()（当前用 auth()）
- `lib/auth.ts` — Auth.js v5 配置 + 懒加载单例
- `app/api/balance/route.ts` — Balance 路由
- `lib/api/fetch-api.ts` — 客户端 fetch wrapper
- `lib/services/balance-service.ts` — getBalance 业务逻辑
- `lib/enforce-rate-limit.ts` — IP 级别限流

---

## 调试计划

### 步骤 1：添加详细日志到 balance 路由
在 `GET /api/balance` 的每个步骤添加 `console.log`，精确定位哪一步失败：
```typescript
console.log("[balance] START", request.method, request.url);
console.log("[balance] step 1: rate limit done");
console.log("[balance] step 2: auth done, userId=", userId);
console.log("[balance] step 3: getBalance done");
console.log("[balance] step 4: response sent");
// catch: console.error("[balance] ERROR:", error);
```

### 步骤 2：部署 + wrangler tail
部署带日志的版本，运行 `wrangler tail` 捕获实时 Worker 日志，然后让用户在浏览器中测试。

### 步骤 3：对比分析
对比浏览器请求和 curl 请求在 Worker 日志中的差异，找出具体哪一步失败以及错误信息。

### 步骤 4：根据发现修复
可能的修复方向：
- 如果是 auth() 失败 → 可能需要换回 getToken() 但修复 import 问题
- 如果是 rate limiter 失败 → 检查 IP 提取逻辑
- 如果是 OpenNext 层失败 → 可能需要自定义错误处理
- 如果是缓存问题 → 添加 `Cache-Control: no-store` headers

### 步骤 5：本地复现（备选）
在本地用 `npm run dev` 启动，通过浏览器测试相同流程，看是否能复现。如果本地正常，问题就确定在 OpenNext/Cloudflare Workers 环境。

---

## 部署信息
- **最新部署**: 2026-03-01T06:29:40.316Z
- **部署命令**: `CLOUDFLARE_API_TOKEN=$(cat ~/.cloudflare-api-token) CLOUDFLARE_ACCOUNT_ID=63247fd3f282530c80d8e4bca74902eb npx wrangler deploy`
- **构建命令**: `npx @opennextjs/cloudflare build`
- **日志查看**: `wrangler tail`
- **Secrets**: MONGODB_URI, AUTH_SECRET, COGNITO_CLIENT_SECRET 通过 `wrangler secret put` 设置
