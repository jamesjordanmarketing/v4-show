# Frontier RAG Module - Execution Prompt E06: API Routes

**Version:** 1.0
**Date:** February 10, 2026
**Section:** E06 - API Routes
**Prerequisites:** E01-E05 complete (database, types, providers, all 3 services)
**Status:** Ready for Execution

---

## Overview

This prompt creates all 10 API route handlers across 7 route files. These routes form the HTTP interface between the React frontend and the backend services.

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

- **Specification:** `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\008-rag-frontier-rag-detailed-spec_v1-section-6.md`
- **SAOL Guide:** `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops\QUICK_START.md`

---

========================


# EXECUTION PROMPT E06: API Routes - All 10 Route Handlers

## Your Mission

You are creating the complete REST API layer for a Frontier RAG module in an existing Next.js 14 App Router application. You will create 7 new route files containing 10 route handlers.

**Route Map:**

| File | Methods | Route |
|------|---------|-------|
| `src/app/api/rag/documents/route.ts` | POST, GET | `/api/rag/documents` |
| `src/app/api/rag/documents/[id]/route.ts` | GET, DELETE | `/api/rag/documents/[id]` |
| `src/app/api/rag/documents/[id]/process/route.ts` | POST | `/api/rag/documents/[id]/process` |
| `src/app/api/rag/documents/[id]/questions/route.ts` | GET, POST | `/api/rag/documents/[id]/questions` |
| `src/app/api/rag/documents/[id]/verify/route.ts` | POST | `/api/rag/documents/[id]/verify` |
| `src/app/api/rag/query/route.ts` | POST | `/api/rag/query` |
| `src/app/api/rag/quality/route.ts` | GET | `/api/rag/quality` |

**Do NOT modify any existing files. Only create new files.**

---

## Step 0: Read the Specification and Codebase

Read these files completely before writing any code:

1. **The specification** (contains ALL route implementations):
   `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\008-rag-frontier-rag-detailed-spec_v1-section-6.md`

2. **Existing route patterns** (follow these conventions for auth, validation, response format):
   `C:\Users\james\Master\BrightHub\brun\v4-show\src\app\api\pipeline\conversations\[id]\turn\route.ts`
   `C:\Users\james\Master\BrightHub\brun\v4-show\src\app\api\documents\upload\route.ts`

3. **Auth helper** (every route starts with this):
   `C:\Users\james\Master\BrightHub\brun\v4-show\src\lib\supabase-server.ts`
   Focus on: `requireAuth()`, `createServerSupabaseClient()`

---

## Step 1: Verify Prerequisites

Check that all 3 service files exist:
- `src/lib/services/rag/rag-ingestion-service.ts`
- `src/lib/services/rag/rag-expert-qa-service.ts`
- `src/lib/services/rag/rag-retrieval-service.ts`

If any are missing, STOP and inform the user to run the prerequisite prompts first.

---

## Step 2: Create the Route Directory Structure

Create these directories:
```
src/app/api/rag/
src/app/api/rag/documents/
src/app/api/rag/documents/[id]/
src/app/api/rag/documents/[id]/process/
src/app/api/rag/documents/[id]/questions/
src/app/api/rag/documents/[id]/verify/
src/app/api/rag/query/
src/app/api/rag/quality/
```

---

## Step 3: Create All 7 Route Files

Create each route file exactly as specified. The specification contains the complete "assembled" code for each file at the end of the section.

**Critical patterns to follow in EVERY route:**

1. **Auth first:** Every handler starts with:
   ```typescript
   const { user, response } = await requireAuth(request)
   if (response) return response
   ```

2. **Zod validation** for POST routes:
   ```typescript
   const validation = Schema.safeParse(body)
   if (!validation.success) {
     return NextResponse.json({ error: 'Validation error', details: validation.error.flatten().fieldErrors }, { status: 400 })
   }
   ```

3. **Ownership validation** on all queries:
   ```typescript
   .eq('user_id', user.id)
   ```

4. **Consistent response format:**
   ```typescript
   // Success
   return NextResponse.json({ success: true, data: {...} })
   // Error
   return NextResponse.json({ error: 'message', details: 'technical details' }, { status: 400|404|500 })
   ```

5. **Dynamic rendering:**
   ```typescript
   export const dynamic = 'force-dynamic'
   ```

---

## Step 4: Verify TypeScript Build

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/src" && npm run build
```

**Expected:** Build succeeds with exit code 0.

### Common Build Errors:

- **Dynamic route param type** -- Next.js 14 App Router uses `{ params }: { params: { id: string } }` for dynamic segments
- **Missing Zod import** -- Each route file with POST handlers needs `import { z } from 'zod'`
- **Service function signatures** -- Verify the functions imported from service files match their actual exports

---

## Step 5: Verify File Structure

```
src/app/api/rag/documents/route.ts              (POST + GET)
src/app/api/rag/documents/[id]/route.ts          (GET + DELETE)
src/app/api/rag/documents/[id]/process/route.ts  (POST)
src/app/api/rag/documents/[id]/questions/route.ts (GET + POST)
src/app/api/rag/documents/[id]/verify/route.ts   (POST)
src/app/api/rag/query/route.ts                   (POST)
src/app/api/rag/quality/route.ts                 (GET)
```

All 7 files, 10 handlers total.

---

## Success Criteria

- [ ] All 7 route files created in the correct directory structure
- [ ] Every handler uses `requireAuth()` as its first operation
- [ ] POST routes validate input with Zod schemas
- [ ] All database queries filter by `user_id` (ownership enforcement)
- [ ] Response format is consistent (`{ success, data }` or `{ error, details }`)
- [ ] `npm run build` succeeds with zero TypeScript errors
- [ ] Dynamic route params use the correct Next.js 14 App Router signature

---

## If Something Goes Wrong

### Route Not Found (404) When Testing
- Verify the file is named `route.ts` (not `index.ts` or `page.ts`)
- Verify the directory structure matches Next.js 14 App Router conventions
- Dynamic segments must be in brackets: `[id]` not `:id`

### Auth Import Errors
- `requireAuth` is exported from `@/lib/supabase-server`
- Some routes may also need `createServerSupabaseClient` for DB operations with RLS

### Service Import Errors
- Service files are at `@/lib/services/rag/rag-ingestion-service` (etc.)
- Named imports must match the exact export names from E03-E05

### Zod Schema Issues
- Install zod if missing: `npm install zod` (should already be in package.json)
- Use `.safeParse()` not `.parse()` to avoid throwing

---

## What's Next

**E07** will create the React hooks and Zustand store that consume these API routes.

---

**End of E06 Prompt**


+++++++++++++++++
