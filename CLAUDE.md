# CLAUDE.md — Property Manager MCP: Single Source of Truth

> **AI Guardrail:** If a feature request, schema change, or UI requirement is ambiguous or lacks explicit detail, **do not guess**. Stop and ask for clarification before writing code. Always update the **Current Status Board** when a task is completed.

---

## 1. System Overview & Objectives

**App Name:** Property Manager MCP
**Target Users:** Two co-owners (you + a friend) managing a shared portfolio of rental properties from their phones.

**Core Vision:**
A lightweight, mobile-first property management system built as a Progressive Web App (PWA) on the frontend and a custom Model Context Protocol (MCP) server on the backend. The app allows both users to track properties, tenants, monthly rent collection, repair expenses, and utility payments — from anywhere, on any device, without needing a browser URL bar.

**Why MCP?**
The backend exposes all business logic as discrete, type-safe MCP tools. This means the same server can be invoked directly from Claude Desktop *and* called via HTTP from the React frontend, giving a dual interface with zero code duplication.

---

## 2. Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│                                                                 │
│   ┌──────────────────────────┐    ┌────────────────────────┐   │
│   │  React PWA (Vite + TS)   │    │   Claude Desktop App   │   │
│   │  Hosted on Vercel/Netlify│    │  points at hosted MCP  │   │
│   │  manifest.json + SW      │    │  server URL (Render)   │   │
│   └────────────┬─────────────┘    └──────────┬─────────────┘   │
│                │ HTTPS fetch()               │ HTTPS/MCP        │
└────────────────┼─────────────────────────────┼─────────────────┘
                 ▼                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND LAYER                            │
│                                                                 │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │              Node.js + Express + TypeScript              │  │
│   │                   Hosted on Render/Railway               │  │
│   │                                                          │  │
│   │   ┌────────────────────────────────────────────────┐    │  │
│   │   │            MCP Server (SDK ^1.0.0)             │    │  │
│   │   │  Tools: properties, repairs, rent, utilities   │    │  │
│   │   │  Input validation: Zod schemas                 │    │  │
│   │   └────────────────────────────────────────────────┘    │  │
│   │                          │                               │  │
│   │   Express HTTP routes wrap MCP tools for REST access     │  │
│   └──────────────────────────┼───────────────────────────────┘  │
│                              │ Prisma ORM                        │
└──────────────────────────────┼─────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATABASE LAYER                            │
│                                                                 │
│              ┌──────────────────────────────┐                  │
│              │   Turso (libSQL/SQLite)      │                  │
│              │   free tier, cloud-hosted    │                  │
│              │   @prisma/adapter-libsql     │                  │
│              └──────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
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

**Current State (Phase 1 partial):** The MCP server is operational and storing data in a local `properties.json` file. Express HTTP layer and Prisma/Turso are not yet wired in. No local DB — Turso cloud DB will be used from day one, even during development.

---

## 3. Tech Stack Reference Sheet

| Layer | Technology | Version / Notes |
|---|---|---|
| **Frontend Framework** | React | with TypeScript |
| **Frontend Build Tool** | Vite | PWA plugin for manifest + SW |
| **Frontend Language** | TypeScript | strict mode |
| **PWA** | `vite-plugin-pwa` | manifest.json + Service Worker |
| **Frontend Hosting** | Vercel or Netlify | HTTPS required for A2HS |
| **Backend Runtime** | Node.js | ES2022 target |
| **Backend Framework** | Express | HTTP layer wrapping MCP tools |
| **Backend Language** | TypeScript | strict, Node16 module resolution |
| **MCP Protocol** | `@modelcontextprotocol/sdk` | ^1.0.0 |
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
- [ ] Provision Turso database (free tier) — get `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`
- [ ] Initialize Prisma with `@prisma/adapter-libsql` — write `prisma/schema.prisma` (Property, Tenant, RepairExpense, RentRecord, UtilitiesRecord)
- [ ] Run initial `npx prisma migrate dev --name init` — creates migration file and applies it directly to Turso (no local DB)
- [ ] Migrate data layer: replace `src/services/storage.ts` JSON reads/writes with Prisma client calls
- [ ] Delete `data/properties.json` and `src/services/storage.ts` once Prisma migration is complete
- [ ] Add Express HTTP server layer (`apps/server/src/server.ts`) wrapping MCP tools as REST endpoints
- [ ] Install Vitest + Supertest; add root `vitest.config.ts` and `test` script to root `package.json`
- [ ] Write integration tests for Express routes using Supertest (`apps/server/src/__tests__/`)
- [ ] All backend tests pass (`npm test`) before merging to `main`
- [ ] Write and run seed script (`prisma/seed.ts`) to re-import existing test data (Portland, Seattle, Kent, Test properties)

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

### Phase 2 — Mobile-First React Frontend & API Wiring

**Goal:** A responsive PWA shell with working views that read/write data through the Express API.

- [ ] Scaffold frontend with `npm create vite@latest` into `apps/client/` (React + TypeScript template)
- [ ] Install React Testing Library + `@testing-library/jest-dom`; extend root `vitest.config.ts` to cover `apps/client/`
- [ ] Configure Tailwind CSS (or equivalent) for mobile-first responsive layout
- [ ] Build **Properties List view** — card-based layout, shows address, tenant, rent amount
- [ ] Build **Property Detail view** — shows all metadata, lease dates, mortgage, tenants
- [ ] Build **Add / Edit Property form** — calls `POST /api/properties`
- [ ] Build **Rent Records view** — month-by-month grid, mark paid/unpaid, collection rate summary
- [ ] Build **Repair Expenses view** — list with totals by year, add new entry form
- [ ] Build **Utilities view** — monthly grid per utility type, mark paid
- [ ] Wire all frontend fetches to Express API endpoints (no direct MCP calls from browser)
- [ ] Add loading states, optimistic UI updates, and basic error handling toasts
- [ ] Write component tests for key views (Properties List, Rent Records, forms) using React Testing Library
- [ ] All frontend tests pass (`npm test`) before merging to `main`
- [ ] Environment variable setup: `VITE_API_BASE_URL` pointing to deployed Render/Railway backend (no local Express server — hosted-only)

---

### Phase 3 — PWA & Local Tunnel Testing

**Goal:** The app installs to the home screen and my friend can test it on her mobile device over the internet.

- [ ] Install and configure `vite-plugin-pwa`
- [ ] Write `manifest.json` (name, short_name, icons, `display: "standalone"`, `start_url`, theme color)
- [ ] Register Service Worker (cache-first strategy for static assets, network-first for API calls)
- [ ] Install Playwright; configure `playwright.config.ts` at repo root with mobile viewport presets (iPhone, Pixel)
- [ ] Write E2E tests: full happy-path flow (add property → add rent record → mark paid)
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
- [ ] Deploy Express + MCP backend to Render — set env vars: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `PORT`, `ALLOWED_ORIGINS`
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

## 5. Current Status Board

> Update this section every time a task moves state. Format: `[ ]` To Do · `[/]` In Progress · `[x]` Done.

### Phase 1 — Local Monorepo & Database Setup

| Status | Task |
|---|---|
| [x] | Project scoping and architecture definition |
| [x] | TypeScript project initialization |
| [x] | MCP server boilerplate (`src/index.ts`) |
| [x] | Core domain types (`src/types.ts`) |
| [x] | Zod input schemas (`src/schemas/index.ts`) |
| [x] | JSON persistence layer (`src/services/storage.ts`) |
| [x] | Property tools (list, get, add, update, search, delete) |
| [x] | Repair tools (add, delete, list, list_by_year) |
| [x] | Rent tools (add, update, list_by_year, list_all) |
| [x] | `utilities_add_record` tool |
| [x] | Complete utilities tools (update, list_by_year, list_all) |
| [x] | Reorganize into monorepo (`apps/server/`, `apps/client/`, workspaces root) |
| [x] | `git init`, initial commit on `main` |
| [x] | Provision Turso DB — get `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` |
| [x] | Prisma schema (`prisma/schema.prisma`) with `@prisma/adapter-libsql` |
| [x] | `prisma migrate dev` against Turso cloud DB |
| [ ] | Migrate data layer: replace `storage.ts` JSON layer with Prisma client |
| [ ] | Delete `data/properties.json` and `src/services/storage.ts` |
| [ ] | Express HTTP server layer wrapping MCP tools |
| [ ] | Vitest + Supertest installed; root `vitest.config.ts` created |
| [ ] | Integration tests for Express routes passing |
| [ ] | Seed script with existing test data |

### Phase 2 — Mobile-First React Frontend & API Wiring

| Status | Task |
|---|---|
| [ ] | Vite + React + TypeScript scaffold in `apps/client/` |
| [ ] | React Testing Library + `@testing-library/jest-dom` installed |
| [ ] | Mobile-first CSS setup (Tailwind or equivalent) |
| [ ] | Properties List view |
| [ ] | Property Detail view |
| [ ] | Add / Edit Property form |
| [ ] | Rent Records view (monthly grid, mark paid) |
| [ ] | Repair Expenses view |
| [ ] | Utilities view |
| [ ] | Frontend wired to Express API endpoints |
| [ ] | Loading states and error handling |
| [ ] | Component tests for key views passing |

### Phase 3 — PWA & Local Tunnel Testing

| Status | Task |
|---|---|
| [ ] | `vite-plugin-pwa` installed and configured |
| [ ] | `manifest.json` authored |
| [ ] | Service Worker registered (cache + network strategies) |
| [ ] | Playwright installed; `playwright.config.ts` with mobile viewports |
| [ ] | E2E happy-path tests passing |
| [ ] | PWA manifest + Service Worker tests passing |
| [ ] | A2HS verified on Android Chrome |
| [ ] | A2HS verified on iOS Safari |
| [ ] | Standalone mode confirmed (no browser chrome) |
| [ ] | Offline fallback page |
| [ ] | ngrok or preview deployment URL shared with friend for device testing |
| [ ] | Mobile layout bugs resolved after device testing |

### Phase 4 — Production Deployment & Multi-User Access

| Status | Task |
|---|---|
| [ ] | GitHub repo created, local `main` pushed (`git remote add origin`) |
| [ ] | GitHub repo connected to Render (auto-deploy on push to `main`) |
| [ ] | Backend env vars set in Render (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `PORT`, `ALLOWED_ORIGINS`) |
| [ ] | Render start command set to `npx prisma migrate deploy && node dist/index.js` |
| [ ] | GitHub repo connected to Vercel (auto-deploy on push to `main`) |
| [ ] | `VITE_API_BASE_URL` set in Vercel env vars |
| [ ] | PWA installation verified on live HTTPS domain |
| [ ] | Basic access control (API key or HTTP Basic Auth) |
| [ ] | Claude Desktop `claude_desktop_config.json` pointed at hosted Render URL |
| [ ] | Full production smoke test (add → update → view on mobile) |

### Phase 5 — Continuous Maintenance

| Status | Task |
|---|---|
| [ ] | Workflows documented and understood by both users |
| [ ] | Both users confirmed able to trigger a redeploy (Render + Vercel/Netlify dashboards) |
| [ ] | Claude Desktop config updated to hosted URL and tested |

---

## 6. Key Decisions & Open Questions

| Topic | Decision / Status |
|---|---|
| **DB choice** | **Turso** (libSQL/SQLite). Render PostgreSQL free tier expires after 90 days; Turso free tier is persistent and more than sufficient at our scale. |
| **Monorepo vs. two repos** | **Monorepo** with npm workspaces. `apps/server/` + `apps/client/` under one repo. |
| **Local vs. hosted DB** | **Hosted-only.** Turso cloud DB used from day one — no local SQLite, no JSON file fallback. |
| **Auth strategy** | Shared API key in env var (simplest) vs. per-user credentials. Only two users — simplicity preferred. |
| **Utilities tools** | **Done.** All four utilities tools active and consistent (year/month default to current when omitted). |
| **Claude Desktop** | **Hosted URL.** `claude_desktop_config.json` will point at the Render/Railway URL — no local server needed. |
| **Migration strategy** | `prisma migrate dev` locally (creates + applies to Turso). Render start command runs `prisma migrate deploy` on every deploy as a safety net (no-op if nothing pending). |
| **Currency** | All amounts stored as `number` with a `currency` string. No multi-currency conversion needed for now. |
