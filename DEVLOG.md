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
