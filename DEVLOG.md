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
