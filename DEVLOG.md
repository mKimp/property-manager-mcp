# Dev Log

---

### Migrate data layer to Prisma / Turso
**Phase:** 1  
**Date:** 2026-05-23  
**Problem:** The old `storage.ts` used synchronous JSON file reads/writes. Switching to Prisma made all DB functions async, which required updating every `getAllProperties()` / `getPropertyById()` / `saveProperty()` / `deleteProperty()` call in all four tool files to use `await`. Also needed to handle the mismatch between the nested TypeScript types (`Property.address`, `Property.mortgage`, `UtilitiesRecord.utilities`) and Prisma's flat column layout, plus reconstruct the full nested shape on every read.  
**Fix:** Created `apps/server/src/services/db.ts` with a lazy-initialized Prisma client (using `PrismaLibSql` adapter), bidirectional converter functions, and a `saveProperty` that runs a full sync transaction (upsert property + delete-then-recreate all related rows). Updated all tool files to `await` every DB call. Build confirmed clean.  

---

### Delete JSON storage layer
**Phase:** 1  
**Date:** 2026-05-23  
**Problem:** None — straightforward cleanup once the Prisma migration was verified working.  
**Fix:** Deleted `apps/server/src/services/storage.ts` and `data/properties.json`. Copied existing test property data to `prisma/seed-data.json` so it's available when the seed script is written. Confirmed TypeScript build still passes.  

---

### Add Express HTTP server layer
**Phase:** 1  
**Date:** 2026-05-23  
**Problem:** Express 5's TypeScript types annotate named route params as `string | string[]` (to support wildcard params like `*id`), causing TS2345 errors on every `req.params.x` usage. A plain cast like `req.params.id as string` is noisy across ~17 call sites.  
**Fix:** Added a one-line helper `const p = (v: string | string[]) => Array.isArray(v) ? v[0] : v` and wrapped every `req.params` access with it.  

---

### Vitest + Supertest integration tests
**Phase:** 1  
**Date:** 2026-05-23  
**Problem:** Tests need to exercise Express routes without hitting the real Turso DB, but the DB layer is a module-level import. Needed to mock `db.ts` entirely so the Prisma client is never initialized during test runs.  
**Fix:** Used `vi.mock('../services/db.js')` to replace all four DB functions with Vitest mocks. Wrote 41 tests across all four entity types (properties, repairs, rent, utilities) covering happy paths, 404s, 400s (validation), 409s (duplicates), and dry-run delete. All 41 pass.  

---

### Seed script for test property data
**Phase:** 1  
**Date:** 2026-05-24  
**Problem:** The PrismaLibSql adapter in Prisma 7 requires `{ url, authToken }` passed directly to `new PrismaLibSql(...)` (matching the pattern in `db.ts`), not a pre-created `@libsql/client` instance. Also, initializing the client at module level (before `dotenv/config` finishes) caused a silent URL-undefined error on first DB use. The `finally(() => prisma.$disconnect())` referenced `prisma` outside the function scope after the variable was moved inside `seed()`.  
**Fix:** Moved all Prisma client initialization inside `seed()` so dotenv has fully populated env vars first. Matched the `new PrismaLibSql({ url, authToken })` pattern from `db.ts`. Moved `$disconnect()` to `await prisma.$disconnect()` inside the function. All 4 properties (Portland, Seattle, Kent, Test) seeded successfully.  

---

### Architecture decision: redesign Phase 2 UI as a chat interface
**Phase:** 2 (planning)  
**Date:** 2026-05-24  
**Problem:** The original Phase 2 plan was a traditional mobile app — card views, forms, nav menus. This means building and maintaining a lot of UI for a two-person internal tool. Every new field or tool would require a new form input. It also ignores the core strength of having an MCP backend: the tools are already well-defined, typed, and validated.  
**Fix:** Redesigned the frontend as a **chat-only interface** (no forms, no nav views). Users type natural language ("add utilities for Kent House this month"). The backend receives the message, sends it to Claude API with all 18 MCP tools as tool definitions, Claude interprets the intent and calls the right tool, the backend executes it against Turso, and Claude streams a plain-English confirmation back. The MCP tool schemas are reused as-is — no duplication. The frontend becomes a simple chat shell with no domain knowledge.  

---

### Architecture decision: mock-first build order for Phase 2
**Phase:** 2 (planning)  
**Date:** 2026-05-24  
**Problem:** Building the chat frontend directly against the real Claude API means spending tokens on every UI iteration — every "does the bubble render?" test, every layout tweak, every reload. It also creates a hard dependency on having `ANTHROPIC_API_KEY` configured before any frontend work can start.  
**Fix:** Split Phase 2 into three tracks: **2a** builds a mock `POST /api/chat` endpoint that returns hardcoded SSE-streamed text (same wire format as the real thing — `data: <chunk>\n\n` … `data: [DONE]\n\n`). **2b** builds 100% of the React PWA against the mock. **2c** swaps in the real Claude API — the frontend never changes because the wire format is identical. Zero tokens spent during UI development.  

---

### Mock POST /api/chat SSE endpoint (Phase 2a)
**Phase:** 2a  
**Date:** 2026-05-24  
**Problem:** SSE data fields can't contain raw newlines — a `\n` in the payload would be misinterpreted as the SSE field terminator, breaking the stream. Sending markdown (tables, bullet lists) word-by-word would silently mangle line breaks that `react-markdown` needs to render correctly.  
**Fix:** JSON-wrap every chunk: `data: {"t":"<fragment>"}\n\n`. Newlines and any other special characters are safely escaped inside the JSON string. The frontend does `JSON.parse(data).t` to extract the text. The `[DONE]` sentinel is sent as a raw string (not JSON) so it's trivially detectable. Also fixed the global Express error handler to honour the `status`/`statusCode` field that body-parser sets on `SyntaxError` — without this, invalid JSON bodies returned 500 instead of 400. `STREAM_DELAY_MS` is `0` in `NODE_ENV=test` so the 16-test suite runs in ~30 ms. 57/57 tests pass.  

---

### Architecture decision: 3 cost pillars to keep Claude API bill under $2/month
**Phase:** 2 (planning)  
**Date:** 2026-05-24  
**Problem:** The Claude API charges per token. Without any guardrails, costs can creep up even for a two-person app — especially because every API call sends the system prompt and all 18 tool definitions, and a chat UI naturally accumulates conversation history that grows with each turn.  
**Fix:** Three architectural choices baked into Phase 2c:

**Pillar 1 — Auto-clear chat context (frontend).**  
Each API call sends the full conversation history. A long session = more tokens per call. But Claude doesn't need history to know what properties you own — it can always call `property_list_all` or `property_get`. So the frontend reads `lastActivityAt` from `localStorage` on app load; if > 2 hours have passed, it resets `messages` to `[]`. The user gets a fresh session, Claude re-orients via tool calls, and the token count per call stays small. Note: `localStorage` works on all mobile browsers and is especially stable when the app is installed as a PWA (standalone mode has its own isolated storage context that survives backgrounding and restarts).

**Pillar 2 — Prompt caching (backend).**  
The system prompt and the 18 tool definitions are identical on every single API call — they never change. Anthropic's prompt caching feature re-reads cached content at ~90% discount ($0.30/M instead of $3.00/M for input tokens). Implemented by adding `cache_control: { type: "ephemeral" }` to the system prompt block and the tools array when calling the SDK. The cache TTL is 5 minutes, so within an active session every subsequent call gets the discount. This is the single biggest cost lever.

**Pillar 3 — Use Claude Haiku instead of Sonnet (backend).**  
Model choice: `claude-haiku-4-5` (`claude-haiku-4-5-20251001`) instead of `claude-sonnet-4-6`. Haiku costs ~$1/$5 per million input/output tokens vs. Sonnet's ~$3/$15. For the kinds of commands this app handles ("mark rent paid", "add repair expense", "list utilities for Kent House"), Haiku is fully capable — these are short, structured intents that map cleanly to a single tool call. Sonnet would be overkill. If a query ever stumps Haiku, we can escalate to Sonnet on retry, but that's not anticipated.

**Combined effect:** With all three pillars, estimated monthly cost for two users doing ~20 interactions/day is well under $1.  

---

### Chat PWA frontend (Phase 2b)
**Phase:** 2b  
**Date:** 2026-05-24  
**Problem:** Two issues surfaced during implementation. (1) The root `vitest.config.ts` was configured for Node environment only — running TSX/React tests there would fail because jsdom isn't loaded and React JSX isn't transformed. A single monolithic config can't serve both environments cleanly. (2) jsdom doesn't implement `scrollIntoView`, so the `useEffect` auto-scroll in `ChatThread` threw `TypeError: bottomRef.current?.scrollIntoView is not a function` during tests.  
**Fix:** (1) Split test execution: root `vitest.config.ts` now targets only `apps/server/**` (Node/Supertest). The client's `vite.config.ts` contains its own `test` block (`environment: jsdom`, `setupFiles: ./src/test/setup.ts`), and the root `npm test` script chains both with `&&`. (2) Added `Element.prototype.scrollIntoView = () => {}` to `src/test/setup.ts` — polyfills the missing method for all tests in the jsdom environment. Final: 57 server tests + 17 client tests = 74 total, all green. Production build confirmed (`vite build` — 313 kB JS, service worker generated by vite-plugin-pwa).  

---

### Phase 2c — Wire real Claude API into POST /api/chat
**Phase:** 2c  
**Date:** 2026-05-26  
**Problem:** Vitest 4.1.7 cannot reliably mock `@anthropic-ai/sdk` (a CJS package) with `vi.mock("@anthropic-ai/sdk", () => ({ default: vi.fn() }))`. The mock factory arrow function ends up being used directly as the constructor instead of the hoisted `vi.fn()`, causing `"() => ({...}) is not a constructor"`. A second issue: `apiMessages` was passed by reference to the stream call; the mock captured the reference, then the server mutated the array after the call (pushing the assistant reply), so the test assertion saw 4 items instead of 3.  
**Fix:** Extracted the Anthropic client into `apps/server/src/chat/client.ts` — tests mock that thin TypeScript module directly, avoiding the CJS package entirely in Vitest. Fixed the by-reference mutation by spreading `[...apiMessages]` at each `stream()` call site so each call receives an immutable snapshot. Mocking strategy changed from `vi.mock("@anthropic-ai/sdk")` to `vi.mock("../chat/client.js")` with a hoisted `mockGetClient` that returns a fake `{ messages: { stream: streamMockFn } }` object.  

---

### Claude Haiku hallucinating rent data instead of calling tools
**Phase:** 2c (post-merge debugging)  
**Date:** 2026-05-26  
**Problem:** After the first successful response, every subsequent query — regardless of intent — returned the exact same Kent House rent table. Even a completely fresh request ("show me repairs for Kent House" with no history) produced the rent table without any tool calls firing. Two compounding bugs:

1. **Haiku skipping tool calls.** Claude Haiku sometimes bypasses tool use and generates a plausible-sounding response from context. The original system prompt had no explicit rule against this, so Haiku "remembered" the rent data it had returned once and started reproducing it verbatim.
2. **Snowballing conversation history.** Once the first wrong response was in the history, each subsequent turn contained one more (user, wrong-assistant) pair all showing rent data. Haiku pattern-matched on its own bad responses and kept repeating them. By turn 5 the history contained four identical Kent House rent tables, making it nearly impossible for the model to break the loop.
3. **`.env` not found in workspace mode.** When debugging, restarting the server via `npm run dev --workspace=apps/server` failed with "ANTHROPIC_API_KEY not set." `npm workspace` changes `process.cwd()` to `apps/server/` before running `tsx`, but the `.env` file lives at the monorepo root, so `dotenv/config` couldn't find it.

**Fix:**
1. Rewrote `apps/server/src/chat/systemPrompt.ts` to add a **CRITICAL RULE** block: "Never generate, recall, or repeat property data from memory — always call a tool." Added an explicit **tool routing map** (repairs/maintenance → `repair_list`; rent/payment → `rent_list_*`; utilities → `utilities_list_*`) and a numbered **workflow** (property_search → fetch records → respond) so Haiku has unambiguous instructions.
2. Copied root `.env` to `apps/server/.env` and added `apps/server/.env` to `.gitignore`. The workspace-local copy is always in sync since it's derived from root `.env`, and the gitignore entry prevents the API key from being committed.
3. User must clear browser `localStorage` (`chatMessages` key) after a poisoned session before the new prompt takes effect.

---

### Phase 4 — Production Deployment (Render + Vercel)
**Phase:** 4  
**Date:** 2026-05-28  
**Problem:** CORS preflight responses were missing `Access-Control-Allow-Origin` because `ALLOWED_ORIGINS` was not set on Render, so the server defaulted to localhost-only. curl tests passed (curl ignores CORS) but the browser blocked all `/api/chat` requests from the Vercel frontend.  
**Fix:** Set `ALLOWED_ORIGINS=https://property-manager-mcp-client.vercel.app` in the Render dashboard env vars. Backend live at `https://property-manager-api-ylae.onrender.com`, frontend live at `https://property-manager-mcp-client.vercel.app`. Chat, streaming, and Turso DB all verified working in production.  

---

### Shared API key auth for /api/* routes
**Phase:** 4  
**Date:** 2026-05-28  
**Problem:** The Render backend URL was fully public — anyone who found `https://property-manager-api-ylae.onrender.com` could read and write all property data with no credentials at all. The Vercel frontend JS bundle also had `VITE_API_KEY` baked in, meaning anyone who opened the Vercel URL got the key automatically and could hit the API freely.  
**Fix:** Added `X-API-Key` middleware in `server.ts` that checks all `/api/*` requests against `process.env.API_KEY`. If the env var is not set, the middleware warns and passes through (dev/test mode — no test changes needed). Frontend reads `VITE_API_KEY` (baked into the bundle by Vite at build time) and sends it as `X-API-Key` on every fetch. Set `API_KEY` on Render and `VITE_API_KEY` on Vercel to the same random 32-byte hex value. Random people hitting the Render URL directly now get 401.  

---

### Vercel Edge Middleware — HTTP Basic Auth
**Phase:** 4  
**Date:** 2026-05-28  
**Problem:** The API key in `VITE_API_KEY` is baked into the JS bundle, so anyone who opens the Vercel URL can find it in DevTools → Sources and use it directly against the API. The frontend itself had no gate — anyone with the URL could load the app.  
**Fix:** Added `apps/client/middleware.ts` using Vercel Edge Middleware (`@vercel/edge`). It runs at the CDN edge before any file is served. If `BASIC_AUTH_USER` and `BASIC_AUTH_PASSWORD` env vars are set on Vercel, it requires HTTP Basic Auth (browser shows native username/password dialog). Correct credentials → `next()` passes through. Wrong/missing credentials → 401 + `WWW-Authenticate` header triggers the browser dialog again. If the env vars are not set, the middleware passes through (local dev). This means the JS bundle — and the API key inside it — never reaches an unauthenticated visitor.  

---

### Mobile PWA layout — safe areas, notch, home indicator, tables
**Phase:** 4  
**Date:** 2026-05-28  
**Problem:** Several issues when the app was installed to the home screen on iPhone: (1) The header content was partially hidden behind the notch/status bar because `viewport-fit=cover` and `env(safe-area-inset-top)` were missing. (2) The chat input was hidden behind the home indicator at the bottom of the screen. (3) The `<title>` was "client" (Vite's default) instead of "Property Manager". (4) The Apple PWA meta tags were missing, so the status bar wasn't styled correctly in standalone mode. (5) Wide markdown tables (e.g. property listings) overflowed the message bubble on narrow screens.  
**Fix:** Added `viewport-fit=cover` and Apple PWA meta tags (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style: black-translucent`, `apple-mobile-web-app-title`) to `index.html`. Fixed title. Added `.safe-top` / `.safe-bottom` CSS helpers using `max(0.75rem, env(safe-area-inset-*))` — applied to the header and chat input respectively. Wrapped all markdown `<table>` elements in a custom `<div class="table-wrap">` (via react-markdown's `components` prop) with `overflow-x: auto` so tables scroll horizontally instead of overflowing. Widened assistant message bubbles to `max-w-[92%] flex-1`. Bumped input font to `text-base` and minimum tap targets to 44–46px.  

---

### Phase 3 — Playwright E2E + PWA Tests
**Phase:** 3  
**Date:** 2026-05-26  
**Problem:** Two issues surfaced. (1) `getByText('Property Manager')` in `pwa.spec.ts` matched both the `<h1>` in the app header *and* the `<h2>` in the empty-state component, triggering Playwright's strict-mode violation ("resolved to 2 elements"). (2) `context.setOffline(true)` + `page.reload()` causes a WebKit internal error in Playwright headless — a known limitation of the frozen WebKit build on macOS arm64.  
**Fix:** (1) Narrowed the locator to `page.locator('header h1')` so it only targets the header element. (2) Added `test.skip(browserName === 'webkit', '...')` on the offline cache test with an explanatory comment pointing to real-device testing via ngrok. Final result: 54 passed, 1 intentionally skipped across 5 projects (chat-desktop, chat-iphone-13, chat-pixel-5, pwa-desktop, pwa-iphone-13). Mobile layout tests (touch targets, viewport fill, horizontal overflow, font sizes) all pass on both iPhone 13 and Pixel 5 viewports.  

---
