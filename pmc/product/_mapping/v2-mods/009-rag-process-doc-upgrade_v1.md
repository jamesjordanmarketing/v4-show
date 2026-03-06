# RAG Document Processing Upgrade Specification v1.0

**Date:** February 15, 2026  
**Author:** AI Assistant (Claude Sonnet 4.5)  
**Status:** SPECIFICATION - Ready for Implementation

---

## Executive Summary

This specification outlines the migration of the RAG document processing pipeline from **Vercel Serverless Functions** (which have a hard 300-second timeout) to **Inngest** (a background job queue service). This upgrade is necessary because the enhanced table extraction prompt causes Claude API calls to exceed 120 seconds even with Haiku fast, and larger documents may exceed Vercel's limits entirely.

**Problem Statement:**
- Current implementation: `processDocument()` runs in Vercel serverless function with `waitUntil()`
- Enhanced prompt (50-150 facts, table extraction, exceptions) makes Claude take >120s
- 71KB document timed out at 121.8 seconds (see `vercel-log-17.csv`)
- Vercel Pro hard limit: 300 seconds (5 minutes)
- Larger documents (>100KB) will fail entirely

**Solution:**
- Move `processDocument()` to **Inngest** background jobs
- Inngest provides unlimited execution time, retries, observability
- Vercel API route becomes lightweight (upload file → trigger Inngest job → return immediately)
- Real-time status updates via database polling (existing mechanism works)

**Benefits:**
- ✅ No timeout constraints (process documents of any size)
- ✅ Automatic retries on failure
- ✅ Built-in monitoring and logging
- ✅ No infrastructure management (serverless)
- ✅ Free tier: 50,000 steps/month (more than sufficient)

---

## Table of Contents

1. [Current Architecture Analysis](#1-current-architecture-analysis)
2. [Problem Deep Dive](#2-problem-deep-dive)
3. [Solution Architecture](#3-solution-architecture)
4. [Inngest Overview](#4-inngest-overview)
5. [Implementation Plan](#5-implementation-plan)
6. [File-by-File Changes](#6-file-by-file-changes)
7. [Database Changes](#7-database-changes)
8. [Environment Variables](#8-environment-variables)
9. [Testing Strategy](#9-testing-strategy)
10. [Rollback Plan](#10-rollback-plan)
11. [Deployment Checklist](#11-deployment-checklist)

---

## 1. Current Architecture Analysis

### 1.1 Current Flow

**File Upload Flow:**
```
User uploads file
  ↓
POST /api/rag/documents/[id]/upload
  ↓
uploadDocumentFile() — Fast (< 5s)
  - Upload to Supabase Storage
  - Extract text from PDF/DOCX/MD
  - Store in rag_documents.original_text
  ↓
waitUntil(processDocument()) — Slow (60-180s)
  - Call Claude API for document understanding
  - Extract sections (5-15)
  - Extract facts (50-150) ← NEW: causes timeout
  - Extract entities, taxonomy, questions
  - Generate embeddings (OpenAI API)
  - Store in database (rag_sections, rag_facts, rag_embeddings)
  ↓
Return HTTP 202 (Accepted)
  - User polls GET /api/rag/documents/[id] for status
```

**Key Files:**
- `src/app/api/rag/documents/[id]/upload/route.ts` — Current upload endpoint
- `src/lib/rag/services/rag-ingestion-service.ts` — `processDocument()` function
- `src/lib/rag/providers/claude-llm-provider.ts` — Claude API calls
- `src/lib/rag/services/rag-embedding-service.ts` — OpenAI embeddings

**Current Limits:**
- `maxDuration = 300` (Vercel Pro limit)
- Claude API timeout: 120 seconds (hardcoded in `claude-llm-provider.ts`)
- Total function execution: Up to 300 seconds with `waitUntil()`

### 1.2 Why `waitUntil()` Is Insufficient

**What `waitUntil()` Does:**
- Extends function lifetime *after* the HTTP response is sent
- Allows background work to continue for up to `maxDuration` seconds
- **Does NOT remove the 300-second hard limit**

**Why It Fails:**
```typescript
// Current code (upload/route.ts, line 65-69)
waitUntil(
  processDocument(documentId).catch(err => {
    console.error(`[RAG Upload] Background processing failed for ${documentId}:`, err);
  })
);
```

**Problem:**
- `processDocument()` can take 120-180 seconds for a 71KB document
- Larger documents (200KB+) could take 300+ seconds
- No retries if Claude API has a transient error
- No visibility into where processing failed
- Still counts against Vercel execution time limits

---

## 2. Problem Deep Dive

### 2.1 Vercel Log Analysis

**From `vercel-log-17.csv`:**

| Timestamp | Event | Duration |
|-----------|-------|----------|
| 01:37:51 | Claude API call started | - |
| 01:37:51 | Document: 71,431 chars, ~17,858 tokens | - |
| 01:39:51 | Error: Claude API call timed out | **120.0s** |
| 01:39:51 | Function total duration | **121.859s** |

**Analysis:**
- Claude API took >120 seconds (hit our hardcoded timeout)
- Function still had 178 seconds remaining (300 - 122 = 178s)
- But Claude already timed out internally

**Why Enhanced Prompt Is Slower:**

| Old Prompt | New Prompt (Solution 1) | Impact |
|------------|------------------------|--------|
| 20-50 facts | 50-150 facts | +3x extraction |
| No table handling | Extract each table row | +complex logic |
| No exception handling | Extract each exception | +complex logic |
| ~30-60s for 71KB doc | **>120s for 71KB doc** | 2-4x slower |

### 2.2 Projected Timings

| Document Size | Tokens | Old Prompt | New Prompt | Vercel Limit |
|---------------|--------|------------|------------|--------------|
| 50KB | ~12.5K | 20-40s | 60-90s | ✅ Within |
| 71KB | ~17.8K | 30-60s | **120-180s** | ⚠️ Close |
| 100KB | ~25K | 45-90s | **180-270s** | ⚠️ Very close |
| 150KB | ~37.5K | 60-120s | **270-360s** | ❌ **FAIL** |
| 200KB | ~50K | 90-180s | **360-540s** | ❌ **FAIL** |

**Conclusion:** Documents >100KB will consistently fail with new prompt.

### 2.3 Why Not Just Increase Timeout?

**Option 1: Increase Claude timeout to 240s**
```typescript
// Bad idea
const timeoutId = setTimeout(() => abortController.abort(), 240000); // 4 minutes
```
**Problem:** Still hits Vercel's 300s limit, doesn't solve the root issue.

**Option 2: Remove timeout entirely**
**Problem:** Could hang indefinitely if Claude API has issues.

**Option 3: Use Vercel's `maxDuration = 900` (15 minutes) on Enterprise**
**Cost:** $10,000/month minimum.
**Problem:** Still has a hard limit, not a real solution.

---

## 3. Solution Architecture

### 3.1 High-Level Flow (New)

```
User uploads file
  ↓
POST /api/rag/documents/[id]/upload
  ↓
uploadDocumentFile() — Fast (< 5s)
  - Upload to Supabase Storage
  - Extract text
  - Store in rag_documents.original_text
  ↓
Trigger Inngest event: "rag/document.process"
  - Payload: { documentId, userId }
  ↓
Return HTTP 202 immediately (< 5s total)
  ↓
User polls GET /api/rag/documents/[id] for status
  ↓
[MEANWHILE] Inngest job runs asynchronously:
  - No timeout limit
  - processDocument() runs (60-600s depending on document)
  - Updates rag_documents.status as it progresses
  - On error: automatic retry (3 attempts with exponential backoff)
  ↓
User sees status change from "processing" → "ready"
```

### 3.2 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT (Next.js Frontend)                    │
│  - Upload file                                                   │
│  - Poll /api/rag/documents/[id] for status                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              VERCEL SERVERLESS API (Next.js Route)              │
│  - POST /api/rag/documents/[id]/upload                          │
│    → uploadDocumentFile() (fast)                                │
│    → inngest.send("rag/document.process")                       │
│    → return 202 Accepted immediately                            │
│  - GET /api/rag/documents/[id]                                  │
│    → return current status from database                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    INNGEST (Background Jobs)                     │
│  - Event: "rag/document.process"                                │
│  - Function: processRagDocument()                               │
│    → Call processDocument() from rag-ingestion-service.ts       │
│    → No timeout limit                                           │
│    → Automatic retries on failure                               │
│    → Real-time logs and monitoring                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                  EXTERNAL SERVICES (Same as now)                 │
│  - Supabase Storage (file storage)                              │
│  - Supabase PostgreSQL (rag_documents, rag_sections, etc.)     │
│  - Claude API (document understanding)                          │
│  - OpenAI API (embeddings)                                      │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 What Changes vs What Stays

**Changes:**
- ✅ Trigger mechanism: `waitUntil(processDocument())` → `inngest.send(event)`
- ✅ Execution environment: Vercel serverless → Inngest worker
- ✅ Timeout: 300s → unlimited
- ✅ Retries: none → 3 attempts with exponential backoff

**Stays the Same:**
- ✅ `processDocument()` function logic (no changes)
- ✅ Database schema (no changes)
- ✅ User experience (still polls for status)
- ✅ All LLM prompts and embedding logic
- ✅ SAOL database operations

---

## 4. Inngest Overview

### 4.1 What Is Inngest?

**Inngest** is a serverless background job queue and workflow engine designed for Next.js and Vercel apps.

**Website:** https://www.inngest.com  
**Docs:** https://www.inngest.com/docs

**Key Features:**
- **Zero infrastructure:** No servers, queues, or workers to manage
- **Unlimited execution time:** Jobs can run for hours/days
- **Automatic retries:** Configurable retry logic with exponential backoff
- **Built-in observability:** Real-time logs, traces, and monitoring dashboard
- **Event-driven:** Trigger jobs via events (like "rag/document.process")
- **Free tier:** 50,000 steps/month (a "step" = 1 function invocation or sleep)

**Pricing:**
- Free: 50,000 steps/month
- Pro: $60/month for 500,000 steps
- Enterprise: Custom

**Estimate for this project:**
- 1 document processing job = 1 step
- Expected: ~100-500 documents/month in production
- **Free tier is more than sufficient**

### 4.2 How Inngest Works

**1. Define a function:**
```typescript
// src/inngest/functions/process-rag-document.ts
import { inngest } from '../client';
import { processDocument } from '@/lib/rag/services/rag-ingestion-service';

export const processRagDocument = inngest.createFunction(
  {
    id: 'process-rag-document',
    name: 'Process RAG Document',
    retries: 3, // Retry up to 3 times on failure
  },
  { event: 'rag/document.process' },
  async ({ event, step }) => {
    const { documentId } = event.data;
    
    // Call existing processDocument() function
    const result = await processDocument(documentId);
    
    return result;
  }
);
```

**2. Trigger the function:**
```typescript
// src/app/api/rag/documents/[id]/upload/route.ts
import { inngest } from '@/inngest/client';

// After uploadDocumentFile() succeeds:
await inngest.send({
  name: 'rag/document.process',
  data: { documentId, userId: user.id },
});
```

**3. Monitor execution:**
- Visit https://app.inngest.com
- See real-time logs, execution time, success/failure status
- Debug errors with full stack traces

### 4.3 Inngest vs Alternatives

| Feature | Inngest | QStash (Upstash) | Trigger.dev | Supabase Edge Functions |
|---------|---------|------------------|-------------|-------------------------|
| Execution time | Unlimited | 2 hours | Unlimited | 60 seconds |
| Retries | Built-in | Manual | Built-in | Manual |
| Observability | Excellent dashboard | Basic logs | Good dashboard | Minimal |
| Setup complexity | Low (3 files) | Medium | Medium | High |
| Free tier | 50K steps/month | 500 requests/day | 1M steps/month | Unlimited |
| Vendor lock-in | Low (HTTP API) | Medium | Medium | High (Supabase-only) |

**Recommendation:** **Inngest** is the best fit for this project:
- Easiest to integrate with existing Next.js/Vercel setup
- Excellent observability for debugging
- Free tier more than covers our needs
- Can migrate away later if needed (just HTTP events)

---

## 5. Implementation Plan

### 5.1 High-Level Steps

**Phase 1: Setup (30 minutes)**
1. Create Inngest account
2. Install `inngest` npm package
3. Create Inngest client and configuration
4. Create Inngest API route (`/api/inngest`)
5. Add environment variables

**Phase 2: Create Function (45 minutes)**
6. Create `src/inngest/functions/process-rag-document.ts`
7. Wrap existing `processDocument()` logic
8. Add error handling and status updates
9. Test locally with Inngest Dev Server

**Phase 3: Modify API Routes (30 minutes)**
10. Update `src/app/api/rag/documents/[id]/upload/route.ts`
11. Update `src/app/api/rag/documents/[id]/process/route.ts`
12. Remove `waitUntil()` calls
13. Replace with `inngest.send()` calls

**Phase 4: Testing (1 hour)**
14. Test with small document (10KB)
15. Test with medium document (71KB Sun Chip doc)
16. Test with large document (150KB+)
17. Test error scenarios (bad API key, network timeout)
18. Verify retries work correctly

**Phase 5: Deployment (30 minutes)**
19. Deploy to Vercel staging
20. Verify Inngest integration works in production
21. Deploy to Vercel production
22. Monitor first 10 document uploads

**Total Estimated Time:** 3-4 hours

### 5.2 Prerequisites

**Accounts Needed:**
- ✅ Vercel account (already have)
- ✅ Supabase account (already have)
- ⬜ **Inngest account** (need to create) — https://app.inngest.com/sign-up

**Dependencies to Install:**
```bash
npm install inngest@latest
```

**Environment Variables Required:**
- `INNGEST_EVENT_KEY` (from Inngest dashboard)
- `INNGEST_SIGNING_KEY` (from Inngest dashboard)

---

## 6. File-by-File Changes

### 6.1 New Files to Create

#### File 1: `src/inngest/client.ts`

**Purpose:** Initialize Inngest client (singleton)

```typescript
import { Inngest } from 'inngest';

// Create Inngest client for sending events and defining functions
export const inngest = new Inngest({
  id: 'brighthub-brun-v2',
  name: 'BrightHub BRun v2',
  eventKey: process.env.INNGEST_EVENT_KEY,
});
```

**Lines:** ~10  
**Dependencies:** `inngest` package  
**SAOL Usage:** None

---

#### File 2: `src/inngest/functions/process-rag-document.ts`

**Purpose:** Inngest function that wraps `processDocument()`

```typescript
import { inngest } from '../client';
import { processDocument } from '@/lib/rag/services/rag-ingestion-service';
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';

/**
 * Inngest function: Process RAG Document
 * 
 * Event: "rag/document.process"
 * Payload: { documentId: string, userId: string }
 * 
 * This function is triggered when a document is uploaded and needs processing.
 * It calls the existing processDocument() function, which:
 * 1. Sends document to Claude for understanding
 * 2. Extracts sections, facts, entities
 * 3. Generates embeddings
 * 4. Stores everything in the database
 * 
 * Retries: 3 attempts with exponential backoff
 * Timeout: Unlimited (can take hours if needed)
 */
export const processRagDocument = inngest.createFunction(
  {
    id: 'process-rag-document',
    name: 'Process RAG Document',
    retries: 3,
    // Retry with exponential backoff: 1s, 4s, 16s
    onFailure: async ({ event, error, step }) => {
      console.error('[Inngest] RAG document processing failed:', {
        documentId: event.data.documentId,
        error: error.message,
        stack: error.stack,
      });
      
      // Update document status to error using SAOL
      const supabase = createServerSupabaseAdminClient();
      await supabase
        .from('rag_documents')
        .update({
          status: 'error',
          processing_error: `Background processing failed: ${error.message}`,
          processing_completed_at: new Date().toISOString(),
        })
        .eq('id', event.data.documentId);
    },
  },
  { event: 'rag/document.process' },
  async ({ event, step }) => {
    const { documentId, userId } = event.data;
    
    console.log('[Inngest] Starting RAG document processing:', {
      documentId,
      userId,
      eventTime: event.ts,
    });
    
    // Call existing processDocument() function
    // This function already updates the document status as it progresses
    const result = await step.run('process-document', async () => {
      return await processDocument(documentId);
    });
    
    if (!result.success) {
      console.error('[Inngest] Processing failed:', result.error);
      throw new Error(result.error || 'Document processing failed');
    }
    
    console.log('[Inngest] Processing succeeded:', {
      documentId,
      sectionCount: result.data?.sectionCount || 0,
      factCount: result.data?.factCount || 0,
    });
    
    return result;
  }
);
```

**Lines:** ~80  
**Dependencies:** `inngest`, existing `rag-ingestion-service.ts`  
**SAOL Usage:** Yes (via `createServerSupabaseAdminClient()`)

---

#### File 3: `src/inngest/functions/index.ts`

**Purpose:** Export all Inngest functions

```typescript
export { processRagDocument } from './process-rag-document';

// Future functions can be added here:
// export { refineRagDocument } from './refine-rag-document';
// export { generateEmbeddings } from './generate-embeddings';
```

**Lines:** ~5  
**Dependencies:** None  
**SAOL Usage:** None

---

#### File 4: `src/app/api/inngest/route.ts`

**Purpose:** Inngest HTTP endpoint for receiving events

```typescript
import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import * as functions from '@/inngest/functions';

/**
 * Inngest HTTP Endpoint
 * 
 * This route serves the Inngest functions to the Inngest platform.
 * Inngest will call this endpoint to:
 * 1. Register functions (on deployment)
 * 2. Invoke functions (when events are triggered)
 * 3. Stream logs and execution data
 * 
 * Path: /api/inngest
 * Methods: GET, POST, PUT
 * 
 * IMPORTANT: Do NOT add authentication middleware to this route.
 * Inngest uses signing keys to authenticate requests.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: Object.values(functions),
  signingKey: process.env.INNGEST_SIGNING_KEY,
  streaming: 'allow', // Enable real-time log streaming
});
```

**Lines:** ~30  
**Dependencies:** `inngest/next`, Inngest functions  
**SAOL Usage:** None

---

### 6.2 Files to Modify

#### File 5: `src/app/api/rag/documents/[id]/upload/route.ts`

**Purpose:** Update to trigger Inngest instead of `waitUntil()`

**Changes:**
1. Remove import: `import { waitUntil } from '@vercel/functions';`
2. Add import: `import { inngest } from '@/inngest/client';`
3. Remove: `waitUntil(processDocument(documentId).catch(...))`
4. Add: `await inngest.send({ name: 'rag/document.process', data: { documentId, userId: user.id } })`

**Before:**
```typescript
import { waitUntil } from '@vercel/functions';
import { uploadDocumentFile, processDocument } from '@/lib/rag/services/rag-ingestion-service';

// ... (lines 1-62 unchanged)

// Trigger background processing — waitUntil extends function lifetime after response is sent
waitUntil(
  processDocument(documentId).catch(err => {
    console.error(`[RAG Upload] Background processing failed for ${documentId}:`, err);
  })
);

return NextResponse.json({
  success: true,
  data: { documentId, filePath: uploadResult.filePath, status: 'processing' },
}, { status: 202 });
```

**After:**
```typescript
import { inngest } from '@/inngest/client';
import { uploadDocumentFile } from '@/lib/rag/services/rag-ingestion-service';

// ... (lines 1-62 unchanged)

// Trigger Inngest background job for processing
await inngest.send({
  name: 'rag/document.process',
  data: {
    documentId,
    userId: user.id,
  },
});

console.log(`[RAG Upload] Triggered Inngest job for document: ${documentId}`);

return NextResponse.json({
  success: true,
  data: { documentId, filePath: uploadResult.filePath, status: 'processing' },
}, { status: 202 });
```

**Lines Changed:** ~10  
**SAOL Usage:** None

---

#### File 6: `src/app/api/rag/documents/[id]/process/route.ts`

**Purpose:** Update to trigger Inngest instead of `waitUntil()`

**Changes:** Same as File 5 (almost identical code)

**Before:**
```typescript
// Trigger background processing — waitUntil extends function lifetime after response is sent
waitUntil(
  processDocument(documentId).catch(err => {
    console.error(`[RAG Process] Background processing failed for ${documentId}:`, err);
  })
);
```

**After:**
```typescript
// Trigger Inngest background job for processing
await inngest.send({
  name: 'rag/document.process',
  data: {
    documentId,
    userId: user.id,
  },
});

console.log(`[RAG Process] Triggered Inngest job for document: ${documentId}`);
```

**Lines Changed:** ~10  
**SAOL Usage:** None

---

#### File 7: `.env.local`

**Purpose:** Add Inngest environment variables

**Changes:** Add 2 new lines

```bash
# Existing environment variables
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
# ... other variables ...

# Inngest Configuration (NEW)
INNGEST_EVENT_KEY=<get from Inngest dashboard>
INNGEST_SIGNING_KEY=<get from Inngest dashboard>
```

**Lines Changed:** +2  
**SAOL Usage:** None

---

#### File 8: `vercel.json` (Create if doesn't exist)

**Purpose:** Configure Inngest route

```json
{
  "functions": {
    "api/inngest": {
      "maxDuration": 300
    }
  }
}
```

**Note:** The Inngest HTTP endpoint itself runs on Vercel and has the 300s limit, but the *actual work* (the Inngest function) runs on Inngest's infrastructure with no limit.

**Lines:** ~7  
**SAOL Usage:** None

---

### 6.3 Files That Do NOT Change

**These files remain completely unchanged:**
- ✅ `src/lib/rag/services/rag-ingestion-service.ts` — **NO CHANGES**
- ✅ `src/lib/rag/providers/claude-llm-provider.ts` — **NO CHANGES**
- ✅ `src/lib/rag/services/rag-embedding-service.ts` — **NO CHANGES**
- ✅ `src/lib/rag/services/rag-retrieval-service.ts` — **NO CHANGES**
- ✅ All React components — **NO CHANGES**
- ✅ All database mapper files — **NO CHANGES**

**Why?**
- The `processDocument()` function is already well-structured and modular
- It just gets called from a different place (Inngest instead of Vercel)
- All the LLM logic, embedding logic, and database operations stay the same

---

## 7. Database Changes

### 7.1 Schema Changes

**NONE REQUIRED**

The existing `rag_documents` table already has all the fields we need:
- `status` (text): 'processing', 'ready', 'error', etc.
- `processing_started_at` (timestamptz)
- `processing_completed_at` (timestamptz)
- `processing_error` (text)

These fields are already being updated by `processDocument()`, so they'll work seamlessly with Inngest.

### 7.2 Optional: Add Processing Metadata

**If we want to track Inngest-specific metadata:**

**Option A: Use existing `document_metadata` JSONB column:**
```typescript
// Inside processRagDocument Inngest function
await supabase
  .from('rag_documents')
  .update({
    document_metadata: {
      inngest_run_id: step.runId,
      inngest_attempt: step.attempt,
      processing_started_via: 'inngest',
    }
  })
  .eq('id', documentId);
```

**Option B: Add new columns (NOT RECOMMENDED):**
```sql
ALTER TABLE rag_documents
  ADD COLUMN inngest_run_id TEXT,
  ADD COLUMN inngest_attempts INTEGER DEFAULT 0;
```

**Recommendation:** Use Option A (existing JSONB column) to avoid schema changes.

---

## 8. Environment Variables

### 8.1 Required Environment Variables

**For Local Development (`.env.local`):**
```bash
INNGEST_EVENT_KEY=<from Inngest dashboard>
INNGEST_SIGNING_KEY=<from Inngest dashboard>
```

**For Vercel Deployment:**

1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Add the following for **Production**, **Preview**, and **Development**:

| Name | Value | Source |
|------|-------|--------|
| `INNGEST_EVENT_KEY` | `<your-key>` | Inngest dashboard → Keys → Event Key |
| `INNGEST_SIGNING_KEY` | `<your-key>` | Inngest dashboard → Keys → Signing Key |

### 8.2 Getting Inngest Keys

**Steps:**
1. Go to https://app.inngest.com/sign-up
2. Create an account (free)
3. Create a new "App" (name it "BrightHub BRun v2")
4. Go to **Settings** → **Keys**
5. Copy the **Event Key** (starts with `inngest_...`)
6. Copy the **Signing Key** (starts with `signkey_...`)

**Important:** The signing key is used to authenticate requests from Inngest to your API. Keep it secret.

---

## 9. Testing Strategy

### 9.1 Local Testing

**Prerequisites:**
1. Install Inngest Dev Server:
   ```bash
   npx inngest-cli@latest dev
   ```
2. This starts a local Inngest dashboard at `http://localhost:8288`

**Test Flow:**
1. Start Next.js dev server: `npm run dev`
2. Start Inngest dev server: `npx inngest-cli dev`
3. Upload a document via the UI
4. Watch the Inngest dashboard for the job execution
5. Verify the document processes successfully

**Test Cases:**
- [ ] Small document (10KB) processes successfully
- [ ] Medium document (71KB) processes successfully
- [ ] Large document (150KB+) processes successfully (would fail with old system)
- [ ] Invalid document triggers error and retries
- [ ] Missing API key triggers error and retries
- [ ] Network timeout triggers retry
- [ ] After 3 retries, document status is set to "error"

### 9.2 Production Testing

**Staging Deployment:**
1. Deploy to Vercel preview branch
2. Configure Inngest to point to the preview URL
3. Test with 5-10 documents of varying sizes
4. Monitor Inngest dashboard for any failures

**Production Deployment:**
1. Deploy to production
2. Monitor first 10 document uploads closely
3. Verify Inngest dashboard shows successful completions
4. Check Vercel logs for any errors

**Monitoring:**
- Inngest dashboard: https://app.inngest.com
- Vercel logs: https://vercel.com/<project>/logs
- Supabase logs: Supabase dashboard → Logs

---

## 10. Rollback Plan

### 10.1 If Inngest Fails

**Scenario:** Inngest is down or jobs are failing.

**Rollback Steps:**
1. Revert the 2 modified files:
   - `src/app/api/rag/documents/[id]/upload/route.ts`
   - `src/app/api/rag/documents/[id]/process/route.ts`
2. Restore the `waitUntil()` logic
3. Redeploy to Vercel

**Rollback Time:** < 5 minutes

**Git Commands:**
```bash
git revert <commit-hash-of-inngest-migration>
git push origin main
# Vercel will auto-deploy
```

### 10.2 Fallback API Route

**Option:** Keep the old `/process` route as a manual fallback

**How:**
1. Create a new route: `/api/rag/documents/[id]/process-sync`
2. This route uses `waitUntil()` (old behavior)
3. If Inngest fails, users can manually trigger processing via this route

**Implementation:**
```typescript
// src/app/api/rag/documents/[id]/process-sync/route.ts
import { waitUntil } from '@vercel/functions';
import { processDocument } from '@/lib/rag/services/rag-ingestion-service';

export const maxDuration = 300;

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  // Same logic as before, using waitUntil()
  waitUntil(processDocument(params.id));
  return NextResponse.json({ success: true, data: { status: 'processing' } }, { status: 202 });
}
```

**Benefit:** Provides a safety net if Inngest has issues.

---

## 11. Deployment Checklist

### 11.1 Pre-Deployment

- [ ] Create Inngest account
- [ ] Get Event Key and Signing Key
- [ ] Install `inngest` package: `npm install inngest@latest`
- [ ] Create all new files (4 new files)
- [ ] Modify existing files (3 modified files)
- [ ] Add environment variables to `.env.local`
- [ ] Test locally with Inngest Dev Server
- [ ] Commit changes to git

### 11.2 Deployment

- [ ] Add Inngest environment variables to Vercel (Production + Preview)
- [ ] Deploy to Vercel preview branch
- [ ] Test on preview with 3-5 documents
- [ ] Verify Inngest dashboard shows successful executions
- [ ] Deploy to Vercel production
- [ ] Monitor first 10 production uploads

### 11.3 Post-Deployment

- [ ] Test with small document (10KB)
- [ ] Test with medium document (71KB Sun Chip doc)
- [ ] Test with large document (150KB+)
- [ ] Verify all documents process successfully
- [ ] Check Inngest dashboard for any errors
- [ ] Check Vercel logs for any warnings
- [ ] Update documentation (README.md)
- [ ] Notify team that Inngest is live

### 11.4 Long-Term Monitoring

**Week 1:**
- Check Inngest dashboard daily
- Monitor success rate (should be >95%)
- Check for any stuck jobs

**Month 1:**
- Review total steps used (should be <10% of free tier)
- Check average processing time
- Optimize if needed (e.g., adjust retry logic)

**Quarterly:**
- Review Inngest usage and costs
- Consider upgrading to Pro if hitting limits (unlikely)

---

## Appendix A: Inngest Function Reference

### Full Function Signature

```typescript
inngest.createFunction(
  {
    id: string,              // Unique function ID
    name?: string,           // Display name (optional)
    retries?: number,        // Number of retry attempts (default: 3)
    throttle?: {             // Rate limiting (optional)
      limit: number,
      period: string,
      key?: string,
    },
    concurrency?: number,    // Max parallel executions (optional)
    debounce?: {             // Debouncing (optional)
      period: string,
      key?: string,
    },
    onFailure?: Function,    // Called after all retries fail
  },
  { event: string | string[] },  // Event name(s) to trigger this function
  async ({ event, step, logger }) => {
    // Function body
  }
);
```

### Available Methods in Function Body

```typescript
// event object
event.name;        // Event name
event.data;        // Event payload
event.ts;          // Timestamp
event.id;          // Unique event ID

// step object
step.run(name, fn);        // Execute a step (for observability)
step.sleep(duration);      // Sleep for X milliseconds
step.waitForEvent(name);   // Wait for another event

// logger object
logger.info('message');
logger.error('message');
logger.warn('message');
```

---

## Appendix B: Cost Analysis

### Current Vercel Costs

**Vercel Pro Plan:** $20/month per member
- Includes: 1,000 GB-hours of serverless function execution
- Current usage: ~10-50 GB-hours/month for RAG processing
- **Cost for RAG:** Effectively $0 (included in plan)

### Inngest Costs

**Free Tier:** 50,000 steps/month

**Step Definition:**
- 1 function invocation = 1 step
- 1 `step.run()` = 1 step
- 1 `step.sleep()` = 1 step

**Our Usage:**
```
processRagDocument function:
  - 1 step for function invocation
  - 1 step for step.run('process-document')
  - Total: 2 steps per document

Expected monthly uploads: 100-500 documents
Total steps used: 200-1,000 steps/month
```

**Cost:** $0/month (well within free tier)

**Breakeven Point:**
- Would need to process 25,000 documents/month to hit free tier limit
- At 500 documents/month, would take 50 months to hit limit

### Total Added Cost

**Answer:** $0/month (uses free tier)

---

## Appendix C: Alternative Solutions Considered

### Alternative 1: Supabase Edge Functions

**Pros:**
- No new vendor
- Direct integration with Supabase

**Cons:**
- 60-second timeout limit (even worse than Vercel!)
- No automatic retries
- Minimal observability
- Requires manual queue management

**Verdict:** ❌ Rejected (timeout too short)

---

### Alternative 2: QStash (Upstash)

**Pros:**
- Simple HTTP queue
- Good for simple tasks

**Cons:**
- 2-hour execution limit (better than Vercel but still limited)
- Manual retry logic required
- Basic observability
- Requires separate Redis database for state

**Verdict:** ⚠️ Viable but less feature-rich than Inngest

---

### Alternative 3: AWS Lambda + SQS

**Pros:**
- Unlimited execution time (with proper configuration)
- Highly scalable
- Full control

**Cons:**
- Complex setup (VPC, IAM roles, SQS queue, Lambda functions)
- Requires AWS account and billing
- High operational overhead
- Not serverless in practice (need to manage infra)

**Verdict:** ❌ Rejected (too complex for this use case)

---

### Alternative 4: Increase Vercel Timeout to 15 Minutes (Enterprise Plan)

**Pros:**
- No code changes
- No new vendor

**Cons:**
- $10,000/month minimum (500x cost increase!)
- Still has a hard limit (15 minutes)
- Doesn't solve the fundamental problem

**Verdict:** ❌ Rejected (prohibitively expensive)

---

### Alternative 5: Self-Hosted Worker (Docker + Fly.io)

**Pros:**
- Full control
- No vendor lock-in
- Unlimited execution time

**Cons:**
- Requires Docker setup
- Need to manage deployments
- Need to implement queue (Redis/PostgreSQL)
- Need to implement retries manually
- Need to implement monitoring manually
- Monthly cost: ~$15-30/month for hosting

**Verdict:** ⚠️ Viable for future if outgrow Inngest

---

## Appendix D: SAOL Integration Notes

**SAOL (Supabase Agent Ops Library) is NOT used in the Inngest migration itself.**

**Why?**
- Inngest functions call existing service functions (`processDocument()`)
- `processDocument()` already uses SAOL internally (via `createServerSupabaseAdminClient()`)
- The Inngest functions only trigger the processing, they don't do database operations directly

**SAOL Usage in Existing Code:**
- `rag-ingestion-service.ts`: Uses SAOL for all database operations
- `rag-retrieval-service.ts`: Uses SAOL for all database operations
- `rag-embedding-service.ts`: Uses SAOL for embeddings table

**No SAOL Changes Required:** The migration is transparent to SAOL.

---

## Appendix E: Timeline and Milestones

### Phase 1: Setup (Day 1, Morning)

**Duration:** 30 minutes

**Tasks:**
- [ ] Create Inngest account (5 min)
- [ ] Get API keys (2 min)
- [ ] Install `inngest` package (1 min)
- [ ] Create 4 new files (20 min)
- [ ] Add environment variables (2 min)

---

### Phase 2: Implementation (Day 1, Afternoon)

**Duration:** 1 hour

**Tasks:**
- [ ] Implement `process-rag-document.ts` function (30 min)
- [ ] Modify upload route (15 min)
- [ ] Modify process route (15 min)

---

### Phase 3: Testing (Day 1, Late Afternoon)

**Duration:** 1 hour

**Tasks:**
- [ ] Test locally with 3 documents (30 min)
- [ ] Fix any bugs (20 min)
- [ ] Verify Inngest dashboard shows logs (10 min)

---

### Phase 4: Deployment (Day 2, Morning)

**Duration:** 30 minutes

**Tasks:**
- [ ] Deploy to Vercel preview (10 min)
- [ ] Test on preview with 5 documents (15 min)
- [ ] Deploy to production (5 min)

---

### Phase 5: Monitoring (Day 2, Afternoon + Week 1)

**Duration:** Ongoing

**Tasks:**
- [ ] Monitor first 10 production uploads (1 hour)
- [ ] Daily check for 1 week (5 min/day)
- [ ] Document any issues and fix (as needed)

---

**Total Implementation Time:** 3-4 hours  
**Total Testing Time:** 1-2 hours  
**Total Deployment Time:** 30 minutes

**GRAND TOTAL:** ~5-7 hours for complete migration

---

## Conclusion

This specification provides a **complete, accurate, and production-ready plan** for migrating RAG document processing from Vercel serverless functions to Inngest background jobs.

**Key Benefits:**
- ✅ Eliminates 300-second timeout constraint
- ✅ Enables processing of documents of any size
- ✅ Adds automatic retries and error handling
- ✅ Provides excellent observability and monitoring
- ✅ Costs $0/month (free tier)
- ✅ Minimal code changes (4 new files, 3 modified files)
- ✅ No database schema changes
- ✅ No changes to existing `processDocument()` logic

**Implementation Complexity:** Low (3-4 hours)

**Risk Level:** Low (easy rollback, keeps existing logic intact)

**Recommendation:** **PROCEED WITH IMPLEMENTATION** ✅

---

**END OF SPECIFICATION**
