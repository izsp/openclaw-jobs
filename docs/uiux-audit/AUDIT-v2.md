# UI/UX Product Audit v2 — OpenClaw.jobs
Date: 2026-03-03 | Screenshots: `docs/uiux-audit/screenshots-v2/` + `screenshots-round4/`

---

## 核心问题：产品定位模糊

当前站点试图同时做三件事——marketing site、buyer product、worker portal——但没有一件做到位。整体感觉像"一个有 chat 框的 landing page"，而不是"一个你会付钱使用的 AI 工具"。

以下按**影响程度**排序。

---

## 1. Landing Page（首页）— 信息过载，无聚焦

**截图**: `01-landing.png`

### 问题
- **Hero 标语太泛**: "Complex AI tasks, done right" — 哪种 AI tasks？怎么 done right？和 ChatGPT 有什么区别？用户 3 秒内无法 get 到 value proposition。
- **中间的 chat 框是个锁住的空壳**: 未登录用户看到一个大灰框 + 🔒 + "Sign in to get started"。这不是 demo，也不是功能，只是占位。这浪费了页面最宝贵的区域。
- **4 个 pricing 卡片没用**: "Code Review from 5🦐"、"Analysis from 20🦐" — 第一次来的人不知道 🦐 是什么，也不知道 5🦐 贵不贵。这些卡片既不帮助决策，也不 build trust。
- **"How it works" 三步**: "Sign in & deposit" → "Submit a task" → "Get verified results" — 太通用，任何 SaaS 都可以用这段文案。没有传达 OpenClaw 的独特性。
- **"Become a Lobster" worker CTA 和 buyer 混在一起**: 在同一个页面上既对 buyer 说 "submit tasks"，又对 worker 说 "connect your AI agent"。两个完全不同的 audience，一个页面里塞不下。
- **Footer 空洞**: 只有 "For Workers / Dashboard / Sign in" — 没有 about、没有 FAQ、没有 trust signals。

### 建议
- **Hero 重写**: 明确说"你提交任务，由真人操控的 AI agent 团队完成，质量有保障"。关键词：**AI agent workforce**（不是你自己用 AI，而是有人帮你用 AI）。
- **去掉 chat 框**: 首页不需要 chat。未登录用户应该看到：value prop → 示例结果（show, don't tell）→ CTA "Get Started"。
- **pricing 改成 use case showcase**: 不展示价格，展示**真实的任务结果**截图或 demo（research report、code review output、data analysis chart）。
- **Worker CTA 移到独立 section 或 footer**: 不要在 buyer 主页上大篇幅讲 worker 的事。一行 "Earn money with your AI subscription → Learn more" 就够了。

---

## 2. Chat Empty State — 定位错误

**截图**: `screenshots-round4/07-chat-empty.png`

### 问题
- **"What complex task can we help with?"** — 这个 framing 有问题。用户不会把自己的需求想成 "complex task"。他们想的是 "我需要一份研究报告" 或 "帮我 review 这段代码"。
- **4 个例子都太 generic**:
  - "Deep Research" → "Research the current state of quantum computing startups..." — 过于具体又不是用户真正会问的
  - "Code Review" → "Review this React component..." — 让人困惑：我要粘贴代码进去？
  - "Data Analysis" → "Analyze this CSV data..." — 怎么传 CSV？chat 里粘贴？
  - "Multi-step" → 和 Deep Research 差不多，不是独立品类
- **分类维度错了**: "Deep Research / Code Review / Data Analysis / Multi-step" 不是用户的心智模型。用户想的是 **outcome**（我要什么结果），不是 **task type**（这是什么类型的任务）。

### 建议
- 改成面向 outcome 的示例：
  - "Write a competitive analysis report on [topic]"
  - "Review my pull request and list all issues"
  - "Summarize this 50-page document into key takeaways"
  - "Build me a SQL query to find monthly churn rate"
- 或者更激进：**去掉分类，只留 3 个按使用场景的 one-liner 示例**，点击直接填入 input。
- 标题改成更 approachable 的："What can we do for you?" 或 "Describe what you need"。

---

## 3. Worker Registration — "选模型"概念有问题

**截图**: `07-worker-gate-register.png`

### 问题
- **Claude / GPT-4 / Gemini / Other 四选一**: 这个分类在产品层面没有意义。
  - 产品的核心是 "sell results, not model access" — 那为什么要让 worker 选模型？
  - 一个 worker 可能用 Claude 做 research、用 GPT-4 做 coding — 强制选一个不合理
  - "Other" 是什么？自建模型？Llama？这个选项让人困惑
  - 选了之后有什么影响？buyer 不知道、worker 也不确定 — 这是无意义的摩擦
- **"Register New Worker" 不是 human-friendly 的操作**: 整个 flow 像在配置一个 API client，不像在加入一个 earning platform
- **注册完给 Worker ID + Bearer Token**: 这对技术人员还行，但完全没有引导 "下一步做什么"
- **"Sign in with your credentials" 也不清晰**: Worker ID + Bearer token 不是常见的 sign-in 形式

### 建议
- **短期**: 去掉模型选择。注册时只要一个 "Register" 按钮，worker_type 默认 "general" 或留空。如果以后需要模型信息，在 dashboard 里让 worker 自己填 profile。
- **中期**: 重新设计注册 flow。展示：(1) 你能赚多少 (2) 任务长什么样 (3) 怎么连接。然后再注册。
- **长期**: 考虑 worker 注册是否应该是 web 流程，还是应该全部通过 API/CLI 完成（毕竟 worker 是跑 agent 的人）。

---

## 4. Chat 结果展示 — 表格渲染坏了

**截图**: `screenshots-round4/08-chat-with-conversation.png`

### 问题
- Markdown 表格渲染成了 `| Company | Funding | Approach | Timeline | |---------|---------|----------|----------| | IonQ | $634M...` 这样的纯文本管道格式。卖的是 "premium AI results"，结果展示比免费的 ChatGPT 还差。
- 这是**最致命的问题之一**: 如果结果看起来不好看，用户不会付钱。

### 建议
- 确认 `react-markdown` 的 table 插件（`remark-gfm`）是否正确引入。如果引入了但没渲染，检查 CSS。
- 表格需要 styled：dark background、header row 加粗、合理 padding。

---

## 5. Dashboard — 功能正确但无 insight

**截图**: `screenshots-round4/10-dashboard.png`

### 问题
- **Balance card 只显示数字**: "50 🦐 = $0.50 USD" 然后是 Deposited/Earned/Withdrawn 全是 0🦐。对新用户没有任何引导。
- **"Recent Tasks" 列表**: 只显示 task preview + message count + date。没有 status badge 的视觉层级，看不出哪些完成了、哪些在处理中。
- **"New Task" 按钮在右上角**: 这是 primary action，但视觉上和 header 的 nav items 混在一起。

### 建议
- 新用户的 dashboard 应该有 onboarding card: "You have $0.50 credit. Submit your first task →"
- Task 列表加状态 badge（Done=green, Pending=yellow, Failed=red）和费用显示

---

## 6. Auth 页面 — 干净但孤立

**截图**: `02-login.png`, `03-register.png`, `04-forgot-password.png`

### 评价
- 视觉上是做得最好的部分。干净、主题一致、mobile 适配好。
- 但这些页面是"孤岛" — 没有 header，没有方式回到 landing（除了底部小字 "Back to home"）。
- 从 landing 点 "Sign in" → 到 login 页 → 丢失所有导航上下文。

### 建议
- 考虑让 login/register 在 landing page 上以 modal 形式呈现，减少跳转。或者至少在 auth 页面顶部保留简化 header。

---

## 7. 404 Page — OK

**截图**: `05-404.png`
- "This page wandered off into the deep sea" — 有品牌调性，做得可以。

---

## 全局问题

### G1. 两套 emoji 问题
- 🦞 (lobster) 用作品牌 mascot
- 🦐 (shrimp) 用作货币
- 但在很多地方两个 emoji 混用，不一致。例如 landing page pricing cards 的 🦐 渲染有时候不清晰。

### G2. 没有 Google 登录按钮
- Cognito 已经配了 Google federation，但自定义 login 页面只有 email+password。应该加 "Sign in with Google" 按钮。

### G3. 语言全英文
- 目标用户是谁？如果是全球用户，英文 OK。但 copy 质量不够好，很多地方像是开发者写的，不像 marketing copy。

### G4. 没有 favicon / meta tags
- 浏览器 tab 显示默认 Next.js icon。对 staging 可以，但 production 前必须替换。

---

## 优先级排序（推荐实施顺序）

| Priority | Issue | Impact | Effort |
|----------|-------|--------|--------|
| **P0** | 表格 markdown 渲染修复 | 产品核心体验 | 小 |
| **P0** | Chat empty state 重写（文案 + 例子） | 第一印象 | 小 |
| **P1** | Worker 注册去掉模型选择 | 减少无意义摩擦 | 小 |
| **P1** | 加 Google 登录按钮 | 降低注册门槛 | 中 |
| **P2** | Landing page 重写（hero + 去掉空 chat 框） | conversion | 大 |
| **P2** | Dashboard onboarding card | 新用户体验 | 中 |
| **P3** | Auth 页面加 header / 改 modal | 导航连贯性 | 中 |
| **P3** | Worker 注册 flow 重设计 | worker 体验 | 大 |
| **P3** | Footer 充实内容 | trust / SEO | 小 |

---

## 总结

产品在技术上很完整（10 个 phase 全部完成，207 tests passing），但 **presentation layer 不配得上 backend 的质量**。核心问题是：

1. **Landing page 不能在 5 秒内让用户明白"这是什么、为什么用你"**
2. **Chat 的结果展示（markdown rendering broken table）直接损害了 "premium results" 的 value prop**
3. **Chat empty state 的分类和文案没有站在用户角度思考**
4. **Worker 注册的 "选模型" 既违反产品理念又增加不必要的认知负担**

好消息是：这些都是 UI 层的问题，底层架构不需要改。修复起来是 days 级别，不是 weeks。
