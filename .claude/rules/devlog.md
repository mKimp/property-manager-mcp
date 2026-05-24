# Dev Log Rules

When you mark any Phase checklist item as `[x]` in CLAUDE.md, you must also append an entry to `DEVLOG.md` in this format:

```
### <short title of the task>
**Phase:** <phase number>  
**Date:** <today's date>  
**Problem:** <what was difficult, confusing, or went wrong>  
**Fix:** <how it was resolved>  

---
```

If there was no problem (the task was straightforward), still write the entry but set **Problem:** to "None — straightforward implementation."

**File management rule:** Before appending, count the number of `---` dividers in `DEVLOG.md`. If there are already 20 or more entries, instead:
1. Move the current contents of `DEVLOG.md` into `docs/devlog/phase-<N>.md` (where N is the phase that filled it up)
2. Reset `DEVLOG.md` to an empty file with just the header `# Dev Log`
3. Then append the new entry to the fresh `DEVLOG.md`
