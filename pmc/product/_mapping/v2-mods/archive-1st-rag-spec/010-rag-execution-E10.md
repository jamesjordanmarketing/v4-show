# Frontier RAG Module - Execution Prompt E10: Chunks Module Replacement & System Integration

**Version:** 1.0
**Date:** February 10, 2026
**Section:** E10 - Chunks Module Replacement & System Integration
**Prerequisites:** E01-E09 complete (entire RAG module built)
**Status:** Ready for Execution

---

## Overview

This prompt completes the RAG module build by deleting the old chunks module, updating navigation routing, and running a comprehensive integration verification checklist. This is the final prompt -- after this, the module should be fully functional.

## Critical Instructions

### SAOL for Database Operations

Use SAOL for all database operations:

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'rag_documents',limit:1});console.log(JSON.stringify(r,null,2));})();"
```

### Environment

**Codebase:** `C:\Users\james\Master\BrightHub\brun\v4-show\src`
**SAOL Path:** `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops`

---

## Reference Documents

- **Specification:** `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\008-rag-frontier-rag-detailed-spec_v1-section-10.md`
- **SAOL Guide:** `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops\QUICK_START.md`

---

========================


# EXECUTION PROMPT E10: Cleanup & Integration - Delete Chunks, Update Navigation, Final Verification

## Your Mission

You are completing the Frontier RAG module build. Your three tasks:
1. **Delete the old chunks module** (pages, routes, components) that the RAG module replaces
2. **Update navigation routing** so the app defaults to the RAG dashboard
3. **Run a comprehensive integration verification** to confirm everything works end-to-end

**CRITICAL SAFETY RULE: Do NOT delete anything that is NOT part of the chunks module.** The following must remain untouched:
- All `/pipeline/` pages and routes
- All `/conversations/` pages and routes
- All `/datasets/` pages and routes
- All `/models/` pages and routes
- All `/training/` pages and routes
- All `/batch-jobs/` pages and routes
- All `/training-files/` pages and routes
- All `/costs/` pages and routes
- All `/bulk-generator/` pages and routes
- Everything under `src/lib/services/` (except adding RAG services)
- Everything under `src/hooks/` (except adding RAG hooks)
- Everything under `src/stores/` (except adding RAG store)

---

## Step 0: Read the Specification and Codebase

Read these files completely before making any changes:

1. **The specification** (lists exactly what to delete and what to update):
   `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\008-rag-frontier-rag-detailed-spec_v1-section-10.md`

2. **Current next.config.js** (you will modify the redirect):
   `C:\Users\james\Master\BrightHub\brun\v4-show\src\next.config.js`

3. **Current dashboard page** (to understand what's being replaced):
   `C:\Users\james\Master\BrightHub\brun\v4-show\src\app\(dashboard)\dashboard\page.tsx`

---

## Step 1: Identify Files to Delete

Before deleting anything, list the files that should be removed. The specification identifies these:

### Pages to Delete
- `src/app/(dashboard)/dashboard/page.tsx` -- Old chunks landing page (replaced by `/rag`)
- `src/app/(dashboard)/upload/page.tsx` -- Old upload page (replaced by `/rag/upload`)

### API Routes to Delete
- `src/app/api/chunks/` -- Entire directory (all chunk-related API routes)

### Pages to Verify Don't Exist (no action needed if absent)
- `src/app/(workflow)/workflow/[documentId]/stage1/` -- May not exist
- `src/app/chunks/` -- May not exist
- `src/app/test-chunks/` -- May not exist (test page)

**Before deleting, verify each file exists.** Do NOT delete files that don't exist. Do NOT delete files not listed above.

---

## Step 2: Delete Chunks Module Files

Delete only the files identified in Step 1. For each file:
1. Verify it exists
2. Confirm it's a chunks-related file (read it briefly to verify)
3. Delete it

**Do NOT delete the `src/app/(dashboard)/` directory itself or its `layout.tsx`.**

---

## Step 3: Update Root Redirect

**File:** `src/next.config.js`

**FIND THIS:**
```javascript
destination: '/dashboard',
```

**REPLACE WITH:**
```javascript
destination: '/rag',
```

This changes the root URL (`/`) redirect from the old chunks dashboard to the new RAG dashboard.

**IMPORTANT:** Only change the redirect destination. Do not modify any other part of `next.config.js` (webpack config, serverComponentsExternalPackages, etc.).

---

## Step 4: Verify TypeScript Build

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/src" && npm run build
```

**Expected:** Build succeeds with exit code 0.

If the build fails after deleting files, it means other files import from the deleted modules. Check:
- Are there imports from `@/app/(dashboard)/dashboard/` anywhere?
- Are there imports from `@/app/api/chunks/` anywhere?
- Fix any broken imports by removing them (the chunks module is being abandoned)

---

## Step 5: Integration Verification Checklist

### 5a. Database Verification

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const tables=['rag_knowledge_bases','rag_documents','rag_sections','rag_facts','rag_expert_questions','rag_embeddings','rag_queries','rag_quality_scores'];let ok=true;for(const t of tables){const r=await saol.agentIntrospectSchema({table:t,includeColumns:false,transport:'pg'});if(!r.tables[0]?.exists){console.log('MISSING:',t);ok=false;}}console.log(ok?'All 8 tables: OK':'FAIL: Missing tables');})();"
```

### 5b. File Structure Verification

Verify these files/directories exist:
```
src/types/rag.ts
src/lib/providers/llm-provider.ts
src/lib/providers/claude-llm-provider.ts
src/lib/providers/embedding-provider.ts
src/lib/providers/openai-embedding-provider.ts
src/lib/providers/index.ts
src/lib/services/rag/rag-ingestion-service.ts
src/lib/services/rag/rag-expert-qa-service.ts
src/lib/services/rag/rag-retrieval-service.ts
src/lib/services/rag/rag-quality-service.ts
src/app/api/rag/documents/route.ts
src/app/api/rag/documents/[id]/route.ts
src/app/api/rag/documents/[id]/process/route.ts
src/app/api/rag/documents/[id]/questions/route.ts
src/app/api/rag/documents/[id]/verify/route.ts
src/app/api/rag/query/route.ts
src/app/api/rag/quality/route.ts
src/hooks/use-rag-documents.ts
src/hooks/use-expert-qa.ts
src/hooks/use-rag-chat.ts
src/hooks/use-rag-quality.ts
src/stores/rag-store.ts
src/app/(dashboard)/rag/page.tsx
src/app/(dashboard)/rag/upload/page.tsx
src/app/(dashboard)/rag/documents/[id]/questions/page.tsx
src/app/(dashboard)/rag/chat/page.tsx
src/app/(dashboard)/rag/quality/page.tsx
src/components/rag/  (directory with 10+ components)
```

### 5c. Deleted Files Verification

Verify these no longer exist:
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/upload/page.tsx`
- `src/app/api/chunks/` (entire directory)

### 5d. Environment Variable Verification

Check `.env.local` has:
- `NEXT_PUBLIC_SUPABASE_URL` (existing)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (existing)
- `SUPABASE_SERVICE_ROLE_KEY` (existing)
- `ANTHROPIC_API_KEY` (existing)
- `DATABASE_URL` (added in E01)
- `OPENAI_API_KEY` (added in E01)

### 5e. Visual Verification

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/src" && npm run dev
```

Open `http://localhost:3000/` -- should redirect to `/rag`
- [ ] RAG Dashboard loads
- [ ] Sidebar navigation works (Dashboard, Upload, Chat, Quality)
- [ ] Upload page shows dropzone
- [ ] Chat page shows mode selector
- [ ] Quality page renders (may be empty with no data yet)
- [ ] Other existing pages still work (`/pipeline/*`, `/conversations/*`, etc.)

---

## Success Criteria

- [ ] Old chunks pages deleted (`dashboard/page.tsx`, `upload/page.tsx`)
- [ ] Old chunks API routes deleted (`api/chunks/`)
- [ ] Root redirect updated from `/dashboard` to `/rag`
- [ ] `npm run build` succeeds with zero TypeScript errors
- [ ] All 8 RAG database tables exist with RLS enabled
- [ ] All RAG files exist (types, providers, services, routes, hooks, store, pages, components)
- [ ] Browser: `/` redirects to `/rag`
- [ ] Browser: RAG dashboard page loads correctly
- [ ] Browser: Existing non-RAG pages still function
- [ ] No orphaned imports or broken references from deleted files

---

## If Something Goes Wrong

### Build Fails After Deleting Files
- Search for imports referencing deleted files:
  ```bash
  grep -r "dashboard/page" src/ --include="*.ts" --include="*.tsx"
  grep -r "api/chunks" src/ --include="*.ts" --include="*.tsx"
  ```
- Remove or update any imports that reference deleted files

### Root Redirect Not Working
- Verify `next.config.js` has the correct redirect rule
- Clear Next.js cache: delete `.next/` directory and rebuild
- Check that the `/rag` page exists at `src/app/(dashboard)/rag/page.tsx`

### Existing Pages Break After Cleanup
- If any existing page was accidentally deleted, restore it from git:
  ```bash
  git checkout -- src/app/(dashboard)/[broken-page]/page.tsx
  ```
- The only files that should be deleted are the ones explicitly listed in Step 1

### SAOL Connection Issues
- If SAOL verification commands fail, try the REST transport:
  ```bash
  cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'rag_documents',limit:1,transport:'rest'});console.log('REST transport:', r.data ? 'OK' : 'FAIL');})();"
  ```

---

## Final Notes

This completes the Frontier RAG Module build. The full user flow is now:

1. User visits `/rag` (dashboard)
2. Clicks "Upload Document" -> `/rag/upload`
3. Uploads PDF/DOCX/TXT/MD -> document appears on dashboard
4. Clicks "Process" -> ingestion pipeline runs (text extraction, LLM reading, embedding)
5. If fast_mode=false, redirected to Expert Q&A -> `/rag/documents/[id]/questions`
6. Answers expert questions -> knowledge refined -> document marked "ready"
7. Navigates to Chat -> `/rag/chat`
8. Selects mode (RAG Only / LoRA Only / RAG + LoRA)
9. Asks questions -> retrieval pipeline runs -> grounded response with citations
10. Each response is evaluated by Claude-as-Judge (5 metrics)
11. Quality Dashboard -> `/rag/quality` shows scores and mode comparison

---

**End of E10 Prompt**


+++++++++++++++++
