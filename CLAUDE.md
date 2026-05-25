# CLAUDE.md — Property Manager MCP: Single Source of Truth

> **AI Guardrail:** If a feature request, schema change, or UI requirement is ambiguous or lacks explicit detail, **do not guess**. Stop and ask for clarification before writing code. Always update the **Phase checklist in Section 4** when a task is completed.

---

## 1. System Overview & Objectives

**App Name:** Property Manager MCP
**Target Users:** Two co-owners (you + a friend) managing a shared portfolio of rental properties from their phones.

**Core Vision:**
A lightweight, mobile-first property management system built as a Progressive Web App (PWA) on the frontend and a custom Model Context Protocol (MCP) server on the backend. The UI is a **chat interface** — users type natural language commands ("add utilities for Kent House this month") and the backend routes those to Claude, which interprets the intent and calls the right MCP tool. No forms, no nav menus — just a conversation.

**Why MCP + Claude API?**
The backend exposes all business logic as discrete, type-safe MCP tools. This means the same server can be invoked directly from Claude Desktop *and* used as tool definitions for the Claude API chat endpoint, giving a dual interface with zero code duplication. Claude acts as the natural language layer that translates user intent into the correct tool call.

---

## 2. Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│                                                                 │
│   ┌──────────────────────────┐    ┌────────────────────────┐   │
│   │  React PWA (Vite + TS)   │    │   Claude Desktop App   │   │
│   │  Chat UI — no forms      │    │  points at hosted MCP  │   │
│   │  manifest.json + SW      │    │  server URL (Render)   │   │
│   └────────────┬─────────────┘    └──────────┬─────────────┘   │
│                │ POST /api/chat              │ HTTPS/MCP        │
│                │ (SSE stream)                │                  │
└────────────────┼─────────────────────────────┼─────────────────┘
                 ▼                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND LAYER                            │
│                                                                 │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │              Node.js + Express + TypeScript              │  │
│   │                   Hosted on Render/Railway               │  │
│   │                                                          │  │
│   │   ┌─────────────────┐   ┌──────────────────────────┐    │  │
│   │   │  MCP Server     │   │  POST /api/chat           │    │  │
│   │   │  (SDK ^1.0.0)   │   │  1. recv user message    │    │  │
│   │   │  Tools: props,  │   │  2. call Claude API w/   │    │  │
│   │   │  repairs, rent, │   │     MCP tools as defs    │    │  │
│   │   │  utilities      │   │  3. exec tool calls here │    │  │
│   │   └─────────────────┘   │  4. stream reply via SSE │    │  │
│   │         (shared)        └──────────────────────────┘    │  │
│   │              ↕ tool logic reused by both                 │  │
│   │   REST routes: GET/POST /api/properties, /repairs, …     │  │
│   └──────────────────────────┼───────────────────────────────┘  │
│                              │ Prisma ORM                        │
└──────────────────────────────┼─────────────────────────────────┘
                 ▼             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  EXTERNAL SERVICES LAYER                        │
│                                                                 │
│   ┌────────────────────────┐   ┌──────────────────────────┐    │
│   │  Turso (libSQL/SQLite) │   │  Anthropic API           │    │
│   │  free tier, cloud      │   │  claude-sonnet-4-6       │    │
│   │  @prisma/adapter-libsql│   │  tool_use + streaming    │    │
│   └────────────────────────┘   └──────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

**Chat flow (single request):**
```
User: "mark Kent House rent as paid for May"
  ↓
POST /api/chat  { messages: [...] }
  ↓
Claude API (claude-sonnet-4-6, tool_use, streaming)
  → decides to call: rent_update_record({ propertyId: "b1c2...", year: 2026, month: 5, paid: true })
  ↓
Backend executes tool → Prisma → Turso
  ↓
Claude formats response (streamed via SSE):
  "Done! Kent House rent for May 2026 is marked as paid. ✓"
  ↓
Frontend renders streamed text in chat thread
```

**Monorepo layout (decided):**
```
property-manager-mcp/
├── apps/
│   ├── server/   ← existing MCP + Express backend (move existing src/ here)
│   └── client/   ← new React PWA frontend (Phase 2)
├── prisma/       ← shared schema, migrations
├── package.json  ← npm workspaces root
└── CLAUDE.md
```

**Current State (Phase 1 complete):** The MCP server is operational with full Prisma/Turso storage, Express REST routes, Vitest integration tests, and a seed script. Phase 2 (chat UI + Claude API) is next.

---

## 3. Tech Stack Reference Sheet

| Layer | Technology | Version / Notes |
|---|---|---|
| **Frontend Framework** | React | with TypeScript |
| **Frontend Build Tool** | Vite | PWA plugin for manifest + SW |
| **Frontend Language** | TypeScript | strict mode |
| **Frontend UI** | Chat interface | No forms — natural language input, streaming response |
| **PWA** | `vite-plugin-pwa` | manifest.json + Service Worker |
| **Frontend Hosting** | Vercel or Netlify | HTTPS required for A2HS |
| **Backend Runtime** | Node.js | ES2022 target |
| **Backend Framework** | Express | REST routes + `/api/chat` SSE endpoint |
| **Backend Language** | TypeScript | strict, Node16 module resolution |
| **MCP Protocol** | `@modelcontextprotocol/sdk` | ^1.0.0 |
| **AI / Chat** | `@anthropic-ai/sdk` | claude-sonnet-4-6, tool_use + streaming |
| **Input Validation** | Zod | ^3.22.4 |
| **ORM** | Prisma | `@prisma/adapter-libsql` for Turso |
| **Database** | Turso (libSQL/SQLite) | free tier, persistent, cloud-hosted from day one |
| **Backend Hosting** | Render or Railway | persistent service, env vars |
| **Local Tunneling** | ngrok | Phase 3 mobile testing |
| **ID Generation** | `uuid` | ^9.0.0 |
| **Test Runner** | Vitest | Native TS support, Vite pipeline — Phase 1 |
| **Backend API Tests** | Supertest | Integration tests for Express routes — Phase 1 |
| **Frontend UI Tests** | React Testing Library + `@testing-library/jest-dom` | Component tests — Phase 2 |
| **E2E & PWA Tests** | Playwright | Cross-browser, mobile viewport, offline caching — Phase 3 |

---

## 4. Phased Roadmap & Milestone Tracker

### Phase 1 — Local Monorepo & Database Setup

**Goal:** A working MCP server with a proper relational database backing it, runnable locally.

- [x] Initialize TypeScript project (`tsconfig.json`, `package.json`)
- [x] Set up MCP server boilerplate (`src/index.ts`)
- [x] Define core domain types (`src/types.ts`): Property, Tenant, RepairExpense, RentRecord, UtilitiesRecord
- [x] Implement Zod input schemas (`src/schemas/index.ts`)
- [x] Build JSON file persistence layer (`src/services/storage.ts`)
- [x] Implement Property tools: `property_list_all`, `property_get`, `property_add`, `property_update`, `property_search`, `property_delete`
- [x] Implement Repair tools: `repair_add`, `repair_delete`, `repair_list`, `repair_list_by_year`
- [x] Implement Rent tools: `rent_add_record`, `rent_update_record`, `rent_list_by_year`, `rent_list_all`
- [x] Implement `utilities_add_record` tool
- [x] Complete Utilities tools: `utilities_update_record`, `utilities_list_by_year`, `utilities_list_all`
- [x] Reorganize into monorepo: move existing `src/` into `apps/server/`, set up npm workspaces root `package.json`
- [x] `git init` in monorepo root, make initial commit of current state (`main` branch)
- [x] Provision Turso database (free tier) — get `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`
- [x] Initialize Prisma with `@prisma/adapter-libsql` — write `prisma/schema.prisma` (Property, Tenant, RepairExpense, RentRecord, UtilitiesRecord)
- [x] Run initial `npx prisma migrate dev --name init` — creates migration file and applies it directly to Turso (no local DB)
- [x] Migrate data layer: replace `src/services/storage.ts` JSON reads/writes with Prisma client calls
- [x] Delete `data/properties.json` and `src/services/storage.ts` once Prisma migration is complete
- [x] Add Express HTTP server layer (`apps/server/src/server.ts`) wrapping MCP tools as REST endpoints
- [x] Install Vitest + Supertest; add root `vitest.config.ts` and `test` script to root `package.json`
- [x] Write integration tests for Express routes using Supertest (`apps/server/src/__tests__/`)
- [x] All backend tests pass (`npm test`) before merging to `main`
- [x] Write and run seed script (`prisma/seed.ts`) to re-import existing test data (Portland, Seattle, Kent, Test properties)

> **Branching rule (applies to all remaining Phase 1 work and every phase after):**
> Every task gets its own branch. Merge to `main` only when it works.
> ```
> git checkout -b feat/describe-task   # start a new branch
> # do the work
> git add <files>
> git commit -m "describe the change"
> git checkout main && git merge feat/describe-task
> git branch -d feat/describe-task
> ```

> **Schema change workflow (ongoing after initial setup):**
> 1. Branch: `git checkout -b feat/describe-schema-change`
> 2. Edit `prisma/schema.prisma`
> 3. `npx prisma migrate dev --name describe-your-change` — creates migration file + applies to Turso immediately
> 4. `git add prisma/ && git commit` — commit schema + generated migration file together with your code changes
> 5. Merge to `main` and push — Render auto-deploys; migration is already applied so `prisma migrate deploy` is a no-op

---

### Phase 2 — Chat UI (Mock Backend → Real Claude API)

**Goal:** A chat PWA where users type natural language commands. Build and polish 100% of the UI against a mocked backend first — zero API tokens spent. Swap in the real Claude API only once the UI is complete.

> **Mock-first rule:** `ANTHROPIC_API_KEY` is not needed for Phase 2a or 2b. The mock endpoint speaks the exact same SSE wire format as the real one, so the frontend never needs to change when the real API is wired in during 2c.

#### 2a — Backend: mock `/api/chat` endpoint

- [ ] Add `POST /api/chat` route to `apps/server/src/server.ts` in **mock mode**:
  - Accepts `{ messages: Array<{role, content}> }` (full conversation history)
  - Returns `Content-Type: text/event-stream`; simulates streaming by writing chunks with `setInterval` or sequential `res.write` calls
  - Each chunk: `data: <text fragment>\n\n`; stream ends with `data: [DONE]\n\n`
  - Hardcoded responses that exercise the full UI: a plain text reply, a multi-line markdown reply (table, bullet list), and a slow-drip long reply
  - Optional: simple keyword matching on the last user message to return a vaguely relevant mock (e.g. "kent" → mentions Kent House rent)
- [ ] Write Vitest tests for the mock chat route: SSE headers set correctly, `[DONE]` terminator present, malformed body returns 400
- [ ] All backend tests pass (`npm test`) before moving to frontend

#### 2b — Frontend: Chat PWA (against mock)

- [ ] Scaffold frontend: `npm create vite@latest apps/client -- --template react-ts`
- [ ] Install React Testing Library + `@testing-library/jest-dom`; extend root `vitest.config.ts` to cover `apps/client/src`
- [ ] Configure Tailwind CSS for mobile-first layout (dark or light — match Claude.ai aesthetic)
- [ ] Build core chat components:
  - `<ChatThread>` — scrollable message list; user messages right-aligned, assistant messages left-aligned with a subtle avatar
  - `<MessageBubble>` — renders markdown in assistant replies (use `react-markdown`)
  - `<TypingIndicator>` — three animated dots shown while awaiting the first SSE chunk
  - `<ChatInput>` — textarea + send button; Enter sends, Shift+Enter newline; disabled while streaming
- [ ] Wire `<ChatInput>` to `POST /api/chat` using the **Fetch SSE pattern** (`fetch` + `ReadableStream`) — append streamed chunks to the assistant message in real time
- [ ] Conversation state: keep full `messages` array in React state; append each user/assistant turn; send entire history on every request
- [ ] Error handling: if the stream errors or the server returns non-200, show an inline retry prompt in the chat thread
- [ ] Write component tests: `<ChatThread>` renders messages correctly, `<ChatInput>` fires submit, `<MessageBubble>` renders markdown
- [ ] Install and configure `vite-plugin-pwa`: `manifest.json` (name, short_name, icons, `display: "standalone"`, `start_url: "/"`, theme color), Service Worker (cache-first for static assets, network-first for `/api/`)
- [ ] All frontend tests pass (`npm test`) before merging to `main`
- [ ] Environment variable: `VITE_API_BASE_URL` in `.env` (local) and Vercel env vars (prod) pointing at the Render backend

#### 2c — Wire in real Claude API (swap mock → live)

*Do this only after the UI is complete and passing tests.*

- [ ] Install `@anthropic-ai/sdk` in `apps/server/`; add `ANTHROPIC_API_KEY` to `.env`, `.env.example`, and Render env vars
- [ ] Write system prompt (`apps/server/src/chat/systemPrompt.ts`) — assistant role and property portfolio context
- [ ] Build tool registry (`apps/server/src/chat/tools.ts`) — convert existing Zod MCP schemas into Anthropic `Tool` input_schema objects (all 18 MCP tools: property_list_all, property_get, property_add, property_update, property_search, property_delete, repair_add, repair_delete, repair_list, repair_list_by_year, rent_add_record, rent_update_record, rent_list_by_year, rent_list_all, utilities_add_record, utilities_update_record, utilities_list_by_year, utilities_list_all)
- [ ] Build tool executor (`apps/server/src/chat/executor.ts`) — receives a `tool_use` block from Claude, routes to the correct tool function, returns a `tool_result` block
- [ ] Replace mock handler in `POST /api/chat` with the real implementation:
  - Calls Claude API (`claude-sonnet-4-6`) with `stream: true`, system prompt, tool registry, and message history
  - Agentic loop: while Claude emits `tool_use` blocks → execute tool → append `tool_result` → continue streaming
  - Streams Claude's final text via same SSE format (`data: <chunk>\n\n` … `data: [DONE]\n\n`) — **no frontend changes needed**
- [ ] Update Vitest tests for the real chat route (mock `@anthropic-ai/sdk`): happy path, single tool call round-trip, unknown tool error, malformed body 400
- [ ] All tests pass (`npm test`) before merging to `main`

---

### Phase 3 — PWA & Local Tunnel Testing

**Goal:** The app installs to the home screen and both users can test it on their mobile devices over the internet.

- [ ] Install Playwright; configure `playwright.config.ts` at repo root with mobile viewport presets (iPhone, Pixel)
- [ ] Write E2E tests against the mock backend: full chat happy-path (send message → stream renders → history preserved)
- [ ] Write PWA tests: verify `manifest.json` is served, Service Worker registers, offline fallback page loads
- [ ] Verify "Add to Home Screen" prompt appears on Android Chrome and iOS Safari
- [ ] Verify app opens in standalone mode (no browser URL bar) after installation
- [ ] All Playwright tests pass (`npx playwright test`) before merging to `main`
- [ ] Use ngrok (or preview deployment) to share live HTTPS URL with friend for device testing before final prod deploy
- [ ] Fix any mobile layout bugs found during device testing (tap targets, font sizes, scroll behavior)

---

### Phase 4 — Production Deployment & Multi-User Access

**Goal:** Both users can access the live app over HTTPS from anywhere. DB is already live (set up in Phase 1); this phase is purely about deploying services.

- [ ] Create GitHub repo and push local `main` branch (`git remote add origin <url> && git push -u origin main`)
- [ ] Connect GitHub repo to Render (New Web Service → connect repo → select `main` branch) — every push to `main` will trigger an automatic redeploy
- [ ] Deploy Express + MCP backend to Render — set env vars: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `ANTHROPIC_API_KEY`, `PORT`, `ALLOWED_ORIGINS`
- [ ] Set Render **start command** to `npx prisma migrate deploy && node dist/index.js` — ensures any pending migrations run automatically before every deploy
- [ ] Verify Prisma connects to Turso and all MCP tools respond correctly via the hosted URL
- [ ] Connect same GitHub repo to Vercel (Import Project → select repo → select `main` branch) — every push to `main` will trigger an automatic frontend redeploy
- [ ] Set `VITE_API_BASE_URL` to live Render backend URL in Vercel env vars (Settings → Environment Variables)
- [ ] Verify HTTPS is active on frontend (required for PWA installation)
- [ ] Test "Add to Home Screen" on live HTTPS domain (both Android + iOS)
- [ ] Add basic access control — shared API key in request headers or HTTP Basic Auth — so data isn't publicly readable
- [ ] Store all credentials in environment variables (never hardcoded)
- [ ] Point Claude Desktop at hosted MCP server: update `claude_desktop_config.json` to use the Render URL instead of a local path
- [ ] Smoke test full flow on production: add property → add rent record → mark paid → view on mobile

> **Ongoing deploy workflow (code-only changes, no schema change):**
> ```
> git add <files>
> git commit -m "describe the change"
> git push origin main
> # → Render redeploys backend automatically (prisma migrate deploy is a no-op)
> # → Vercel/Netlify redeploys frontend automatically
> ```

---

### Phase 5 — Continuous Maintenance & Ongoing Development

**Goal:** A repeatable, low-friction workflow for making any change — code, schema, or config — after the app is live.

#### Every change starts with a branch
```
git checkout -b feat/describe-task    # or fix/ for bug fixes

# do the work, then verify before merging
npm test                              # Vitest — unit + integration (backend & frontend)
npx playwright test                   # E2E + PWA (Phase 3 onwards)

git add <files>
git commit -m "describe the change"
git checkout main
git merge feat/describe-task
git branch -d feat/describe-task
git push origin main
# → Render redeploys backend automatically
# → Vercel/Netlify redeploys frontend automatically
```

> **Rule: never merge to `main` if `npm test` fails.**

#### Schema change (add column, new model in prisma/schema.prisma)
```
git checkout -b feat/describe-schema-change
# 1. Edit prisma/schema.prisma
# 2. Create migration file and apply it to Turso immediately
npx prisma migrate dev --name describe-your-change
# 3. Commit schema + generated migration file together with code changes
git add prisma/ <other files>
git commit -m "describe the change"
git checkout main && git merge feat/describe-schema-change
git branch -d feat/describe-schema-change
git push origin main
# → Render runs `prisma migrate deploy` on boot — already applied, so no-op
```

#### Environment variable change (new secret, updated token)
```
# Update the value in Render / Vercel / Netlify dashboard
# Trigger a manual redeploy from the dashboard if the service needs a restart
# Never commit secrets to git
```

#### Updating Claude Desktop to point at hosted server
If the Render URL ever changes, update `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "property-manager": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://<your-render-url>/mcp"]
    }
  }
}
```
Then restart Claude Desktop.

---

## 5. Key Decisions & Open Questions

| Topic | Decision / Status |
|---|---|
| **DB choice** | **Turso** (libSQL/SQLite). Render PostgreSQL free tier expires after 90 days; Turso free tier is persistent and more than sufficient at our scale. |
| **Monorepo vs. two repos** | **Monorepo** with npm workspaces. `apps/server/` + `apps/client/` under one repo. |
| **Local vs. hosted DB** | **Hosted-only.** Turso cloud DB used from day one — no local SQLite, no JSON file fallback. |
| **Frontend UI paradigm** | **Chat-only** (no forms, no nav views). Users type natural language; Claude interprets and calls MCP tools. |
| **Build order** | **Mock-first.** Phase 2a/2b build the full UI against a hardcoded SSE mock. Phase 2c swaps in the real Claude API with zero frontend changes. |
| **Claude model for chat** | **claude-sonnet-4-6** — fast, supports tool_use + streaming, cost-effective for two users. |
| **Chat streaming** | **SSE (Server-Sent Events)** from `POST /api/chat`. Each text delta is `data: <chunk>\n\n`; stream ends with `data: [DONE]\n\n`. Mock and real endpoints share the same wire format. |
| **Tool execution location** | **Backend only.** Claude API returns `tool_use` blocks; the Express server executes them against Prisma/Turso, never the frontend. |
| **Anthropic API key** | Backend env var only (`ANTHROPIC_API_KEY`). Not needed until Phase 2c. Never exposed to the client. |
| **Auth strategy** | Shared API key in env var (simplest) vs. per-user credentials. Only two users — simplicity preferred. |
| **Utilities tools** | **Done.** All four utilities tools active and consistent (year/month default to current when omitted). |
| **Claude Desktop** | **Hosted URL.** `claude_desktop_config.json` will point at the Render/Railway URL — no local server needed. |
| **Migration strategy** | `prisma migrate dev` locally (creates + applies to Turso). Render start command runs `prisma migrate deploy` on every deploy as a safety net (no-op if nothing pending). |
| **Currency** | All amounts stored as `number` with a `currency` string. No multi-currency conversion needed for now. |
