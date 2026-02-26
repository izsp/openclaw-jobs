# UI/UX Audit Report — OpenClaw.jobs
Date: 2026-02-27 | Phase: Pre-Phase-9

## Executive Summary

The current UI is a functional prototype. Every page works, data flows correctly, and the dark theme is consistent. However, the **user experience is shallow** — it feels like a developer scaffold rather than a product people would pay to use. The biggest issues are:

1. The landing page confuses marketing with product
2. The chat interface is undersized and lacks formatting for complex outputs
3. There's zero onboarding — new users hit empty states everywhere
4. Buyer and worker experiences are isolated with no cross-navigation
5. The 404 page breaks the entire visual identity

---

## Screenshots Reference

All screenshots saved in `docs/uiux-audit/screenshots/`:

| File | Page | Viewport |
|------|------|----------|
| 01-landing-unauth.png | Landing (logged out) | Desktop 1440px |
| 01-landing-unauth-mobile.png | Landing (logged out) | Mobile 390px |
| 02-login.png | Login page | Desktop |
| 02-login-mobile.png | Login page | Mobile |
| 04-chat-interface.png | Landing (same as unauth — couldn't capture auth in headless) | Desktop |
| 05-dashboard.png | Dashboard (redirects to login when unauth) | Desktop |
| 06-worker-tokengate.png | Worker token gate | Desktop |
| 06-worker-tokengate-mobile.png | Worker token gate | Mobile |
| 07-worker-register-tab.png | Worker register tab | Desktop |
| 09-404.png | 404 page | Desktop |
| 10-dashboard-unauth.png | Dashboard redirect (unauth) | Desktop |

---

## Findings by Severity

### CRITICAL — Must fix before next phase

#### C1. 404 page is white, breaks dark theme
- Default Next.js 404: white bg, black text, no nav
- Jarring transition from the rest of the site
- **Fix**: Custom `app/not-found.tsx` with dark theme + back link

#### C2. Chat interface is too small for complex tasks
- Fixed `h-[480px]` — complex results (code, research) get crammed
- Single-line `<input>` — impossible to write multi-paragraph prompts
- No markdown rendering — code blocks, lists, bold all render as plain text
- **Fix**: Make chat full-height (flex-grow), swap input for auto-growing textarea, add markdown rendering (react-markdown or similar lightweight solution)

#### C3. No navigation between buyer and worker sides
- No link from landing/dashboard to `/worker`
- No link from `/worker` back to main site (except logo)
- The "Become a Lobster" section has no CTA button
- **Fix**: Add "For Workers" link in header, add "Get Started" CTA in lobster section, add proper nav in worker page

#### C4. Landing page tries to be both marketing site and product
- Hero + chat + pricing + how-it-works + worker CTA = too much on one page
- The chat box in the middle is neither a great marketing demo nor a great product interface
- On mobile, this stacks into a very long scroll
- **Fix**: Redesign landing as a focused conversion page. After sign-in, redirect to a dedicated `/chat` page that maximizes the chat experience

### MAJOR — Significant UX degradation

#### M1. Zero onboarding for new users
- **Buyer**: Signs in → empty chat → empty dashboard → 0🦐 balance → "No conversations yet"
- **Worker**: Registers → credential wall → dashboard with all zeros
- No guided first steps, no sample tasks, no "what to do next"
- **Fix**: Add first-time user states: welcome message in chat, guided deposit prompt, sample task suggestions

#### M2. Chat input is a single-line input field
- `<input type="text">` — can't write paragraphs, can't paste code blocks
- Placeholder "Ask anything — chat, code, translate, research..." contradicts the complex-task positioning
- **Fix**: Replace with `<textarea>` that auto-grows, add Shift+Enter for newlines, Enter to submit

#### M3. No markdown rendering in chat messages
- `ChatMessage` just renders `{content}` as plain text
- AI responses often include code blocks, headers, lists, tables
- For a tool selling premium AI results, this is unacceptable
- **Fix**: Use a lightweight markdown renderer. Keep it minimal: code blocks, bold, lists, links

#### M4. Worker registration is too minimal
- Just a dropdown (Claude/GPT-4/Gemini/Other) + button
- No explanation of what happens, how earnings work, what tasks look like
- **Fix**: Add brief explanation, show expected earnings, describe the flow

#### M5. Header balance pill shows raw number without context
- Shows "250🦐" — no dollar conversion, feels meaningless to new users
- **Fix**: Show dollar equivalent: "$2.50" with 🦐 on hover/tooltip

#### M6. Pricing cards on landing are misleading
- Shows fixed prices (5🦐, 20🦐, etc.) but actual prices are config-driven
- "Custom 500🦐" implies max, but tasks can be priced higher
- **Fix**: Show price ranges: "from 5🦐" or remove and show actual task pricing when submitting

### MODERATE — Polish issues

#### P1. Mobile layout needs work
- Pricing cards: 3+2 grid on mobile is awkward
- Chat panel: fixed 480px doesn't adapt to screen size
- Worker dashboard: cards stack but spacing is inconsistent

#### P2. No loading skeletons
- Only `BalanceCardSkeleton` exists
- Everything else shows "Loading..." or "Loading dashboard..."
- **Fix**: Add skeleton components for chat panel, worker dashboard, conversation list

#### P3. Worker page naming inconsistency
- Nav: "Worker" | Title: "Lobster Dashboard" | URL: `/worker`
- Pick one: if the marketing term is "Lobster," use it consistently, or keep "Worker" for the technical dashboard

#### P4. Footer is bare
- Just "OpenClaw.jobs — Distributed AI agent marketplace"
- No links to worker page, docs, terms, etc.
- **Fix**: Add useful links: For Workers, For Buyers, API Docs, Terms

#### P5. Native `<select>` in worker register breaks visual consistency
- The AI model dropdown uses browser-native select styling
- Looks jarring against the custom dark theme
- **Fix**: Custom styled select or radio card group

#### P6. No conversation management in chat
- No "New Chat" button
- No way to see history from the chat page
- Have to navigate to `/dashboard` to see past conversations
- **Fix**: Add sidebar or dropdown for conversation history, "New Chat" button

#### P7. No toast/notification system
- Success/error feedback is inline text that's easy to miss
- Credential copy feedback is a tiny "Copied" text
- **Fix**: Add simple toast system for transient notifications

---

## Flow Analysis

### Buyer Journey (Current)

```
Landing page → Sign in button → /login → OAuth → Redirect to / →
Chat panel → Type message → Submit → Wait → See result (plain text) →
??? (no clear next step)
```

**Problems:**
- After sign-in, user lands back on the marketing page but now with a chat box
- No onboarding, no balance prompt, no guided first task
- Result is plain text — doesn't look "premium"
- No way to go back to a previous conversation without going to dashboard

### Buyer Journey (Proposed)

```
Landing page → Sign in → Welcome modal (explains balance + first task) →
/chat (full-screen chat) → Suggested task templates → Submit →
Rich result (markdown) → Rate/credit → Next task or dashboard
```

### Worker Journey (Current)

```
/worker → Token gate → Register → See credentials once → Enter dashboard →
All zeros → ??? (how to connect AI agent?)
```

**Problems:**
- No explanation of what to do after registering
- Connection guide is at the bottom of the dashboard, below empty cards
- New worker sees a dashboard full of zeros — discouraging

### Worker Journey (Proposed)

```
/worker → Token gate with explanation → Register → Credentials (with emphasis) →
Dashboard: Connection guide FIRST for new workers →
After first task: show earnings + tier progress
```

---

## Improvement Plan

### Round 1: Critical Foundation (do first)
| # | Task | Files |
|---|------|-------|
| 1 | Custom 404 page (dark theme) | `app/not-found.tsx` |
| 2 | Chat textarea (multi-line input) | `components/chat/chat-input.tsx` |
| 3 | Markdown rendering in messages | `components/chat/chat-message.tsx` |
| 4 | Cross-navigation (buyer ↔ worker) | `components/layout/header.tsx`, `app/page.tsx`, `app/worker/page.tsx` |
| 5 | "Become a Lobster" → link to /worker | `app/page.tsx` |

### Round 2: Chat Experience Overhaul
| # | Task | Files |
|---|------|-------|
| 6 | Full-height chat (not fixed 480px) | `components/chat/chat-panel.tsx`, `app/page.tsx` |
| 7 | Task type selector + templates | `components/chat/chat-input.tsx` (new) |
| 8 | Conversation sidebar/history | `components/chat/chat-panel.tsx` |
| 9 | Separate /chat route for auth'd users | `app/chat/page.tsx` (new) |

### Round 3: Onboarding + Empty States
| # | Task | Files |
|---|------|-------|
| 10 | Buyer welcome + first deposit prompt | `components/chat/chat-panel.tsx` |
| 11 | Worker new-user flow (guide first) | `components/worker/dashboard-content.tsx` |
| 12 | Dashboard empty states with CTAs | `components/dashboard/conversation-list.tsx` |
| 13 | Loading skeletons for all sections | multiple components |

### Round 4: Polish
| # | Task | Files |
|---|------|-------|
| 14 | Better mobile responsiveness | multiple |
| 15 | Footer with links | `app/page.tsx`, new footer component |
| 16 | Consistent naming (Worker vs Lobster) | multiple |
| 17 | Custom styled selects | token-gate, profile-section |
| 18 | Toast notification system | new utility |
