# Spec 30 — E01: Backend — DB Schema + Inngest Error Storage + API Endpoints

**Version:** 1.0  
**Date:** 2026-03-04  
**Section:** E01 — Backend Foundation  
**Prerequisites:** None — this is the first prompt  
**Builds Upon:** Existing codebase  

---

## Overview

This prompt implements the backend foundation changes for Training Set Build Visibility + Partial Processing Fix. It adds structured error storage to the database, updates Inngest functions to write those errors, and creates/updates API endpoints.

**What This Prompt Creates/Modifies:**
1. Database schema change — add `last_build_error` and `failed_conversation_ids` columns to `training_sets`
2. `rebuild-training-set.ts` — structured error catch block + clear errors on success
3. `build-training-set.ts` — same structured error catch block + clear errors on success
4. `training-sets/route.ts` GET handler — add new fields to response mapping
5. **New** `bypass/route.ts` — POST endpoint to bypass failed conversations and trigger rebuild

**What This Prompt Does NOT Create:**
- Training Sets monitoring page (E02)
- UI changes to conversations page or ConversationTable (E02, E03)
- Cross-page selection or sorting features (E03)

---

========================


# E01 Execution Prompt — Backend: DB Schema + Inngest Error Storage + API Endpoints

## Agent Instructions

**Before starting any work, you MUST:**

1. **Read this entire prompt** — it contains pre-verified facts and exact code
2. **Verify file locations** by reading each file listed before editing
3. **Execute the instructions as written** — do not re-investigate what has been verified

---

## Platform Context

**Bright Run LoRA Training Data Platform** — Next.js 14 (App Router) deployed on Vercel.

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router), TypeScript |
| Database | Supabase Pro (PostgreSQL) |
| Background Jobs | Inngest |
| UI | shadcn/UI + Tailwind CSS |
| State | TanStack Query v5 |
| Deployment | Vercel |

### Codebase Root
`C:\Users\james\Master\BrightHub\BRun\v4-show`

### Relevant Codebase Structure
```
src/
├── app/
│   ├── api/
│   │   ├── conversations/route.ts
│   │   └── workbases/[id]/training-sets/
│   │       ├── route.ts                    ← MODIFY (Task 4)
│   │       └── [tsId]/
│   │           ├── route.ts                ← existing PATCH/DELETE handler
│   │           ├── reset/route.ts          ← existing POST reset handler
│   │           └── bypass/route.ts         ← NEW (Task 5)
│   └── (dashboard)/workbase/[id]/fine-tuning/
│       └── conversations/page.tsx
├── inngest/
│   ├── client.ts                           ← exports `inngest` client
│   └── functions/
│       ├── build-training-set.ts           ← MODIFY (Task 3)
│       └── rebuild-training-set.ts         ← MODIFY (Task 2)
├── lib/
│   ├── supabase-server.ts                  ← exports requireAuth, createServerSupabaseAdminClient
│   └── services/
│       └── training-file-service.ts        ← validateConversationsForTraining()
└── stores/
    └── conversation-store.ts
```

---

## SAOL — Mandatory for Database Schema Changes

**You MUST use the Supabase Agent Ops Library (SAOL) for ALL database operations.**

Full guide: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\supabase-agent-ops-library-use-instructions.md`

```bash
# Run from supa-agent-ops directory
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops"
```

**SAOL DDL Pattern:**
```javascript
require('dotenv').config({ path: '../.env.local' });
const saol = require('.');

(async () => {
  // Step 1: Dry-run
  const dryRun = await saol.agentExecuteDDL({
    sql: 'ALTER TABLE ... ;',
    dryRun: true,
    transaction: true,
    transport: 'pg'
  });
  console.log('Validation:', dryRun.success ? '✓ PASS' : '✗ FAIL', dryRun.summary || '');

  // Step 2: Execute
  if (dryRun.success) {
    const result = await saol.agentExecuteDDL({
      sql: 'ALTER TABLE ... ;',
      transaction: true,
      transport: 'pg'
    });
    console.log('Executed:', result.success ? '✓' : '✗', result.summary || '');
  }
})();
```

**Rules:**
1. Service Role Key required — loaded from `.env.local`
2. Dry-run first (`dryRun: true`), then execute (`dryRun: false` or omit)
3. Transport: `'pg'` always for DDL
4. Transaction: `true` always for schema changes
5. Do NOT use SAOL in the application codebase — it is CLI-only for development

---

## Operating Principles

- Read ALL files listed before writing any code
- Use exact file paths from this prompt
- Do not rename or restructure existing files
- All Inngest pipeline functions must continue to work as-is
- Design token rules: use `bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`. **No** `zinc-*`, `slate-*`, or hardcoded `gray-*`

---

## Key Database Tables

- `training_sets` — `id`, `workbase_id`, `user_id`, `name`, `conversation_ids TEXT[]`, `conversation_count`, `training_pair_count`, `status` (`processing`/`ready`/`failed`), `jsonl_path`, `dataset_id`, `is_active`, `created_at`, `updated_at`
- `conversations` — `conversation_id` (business key), `id` (PK), `enrichment_status`, `enriched_file_path`, `workbase_id`
- `datasets` — linked from `training_sets.dataset_id`

---

## Task 1: Database Schema Migration

**Add two columns to the `training_sets` table:**
- `last_build_error TEXT DEFAULT NULL` — stores the full error message from the most recent failed build
- `failed_conversation_ids TEXT[] DEFAULT '{}'` — stores the array of `conversation_id` values that failed validation

**Run via SAOL:**

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
  const sql = \`
    ALTER TABLE training_sets
      ADD COLUMN IF NOT EXISTS last_build_error TEXT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS failed_conversation_ids TEXT[] DEFAULT '{}';
  \`;
  
  // Dry-run
  const dry = await saol.agentExecuteDDL({ sql, dryRun: true, transaction: true, transport: 'pg' });
  console.log('Dry-run:', dry.success ? 'PASS' : 'FAIL', dry.summary || '');
  
  if (dry.success) {
    const result = await saol.agentExecuteDDL({ sql, transaction: true, transport: 'pg' });
    console.log('Execute:', result.success ? 'PASS' : 'FAIL', result.summary || '');
  }
})();
"
```

**Verify the columns were created:**

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
  const r = await saol.agentIntrospectSchema({ table: 'training_sets', transport: 'pg' });
  if (r.success) {
    const cols = r.tables[0].columns.map(c => c.name);
    console.log('Has last_build_error:', cols.includes('last_build_error'));
    console.log('Has failed_conversation_ids:', cols.includes('failed_conversation_ids'));
  } else {
    console.log('Introspection failed:', r);
  }
})();
"
```

---

## Task 2: Modify `rebuild-training-set.ts` — Structured Error Storage

**File:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\rebuild-training-set.ts`  
**Lines:** 196 total

Read this file in full before editing.

### 2a. Replace the catch block (currently at ~lines 131–138)

The current catch block:
```typescript
      } catch (err: any) {
        const supabase2 = createServerSupabaseAdminClient();
        await supabase2
          .from('training_sets')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', trainingSetId);
        throw new Error(`Training file rebuild failed: ${err.message}`);
      }
```

**Replace with:**
```typescript
      } catch (err: any) {
        const supabase2 = createServerSupabaseAdminClient();

        // Parse failed conversation IDs from the validation error message.
        // Format: "Conversation <uuid>: enrichment_status..." from validateConversationsForTraining()
        const failedIds: string[] = [];
        const convIdRegex = /Conversation ([0-9a-f-]{36}):/g;
        let match;
        while ((match = convIdRegex.exec(err.message)) !== null) {
          if (!failedIds.includes(match[1])) failedIds.push(match[1]);
        }

        await supabase2
          .from('training_sets')
          .update({
            status: 'failed',
            last_build_error: err.message,
            failed_conversation_ids: failedIds,
            updated_at: new Date().toISOString(),
          })
          .eq('id', trainingSetId);

        throw new Error(`Training file rebuild failed: ${err.message}`);
      }
```

### 2b. Update the success path — clear error fields

In the `update-training-set-ready` step (~lines 188–197), the current update is:
```typescript
      const { error } = await supabase
        .from('training_sets')
        .update({
          status: 'ready',
          jsonl_path: trainingFile.jsonlPath,
          training_pair_count: trainingFile.totalTrainingPairs,
          dataset_id: dataset.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', trainingSetId);
```

**Replace with (add two cleared fields):**
```typescript
      const { error } = await supabase
        .from('training_sets')
        .update({
          status: 'ready',
          jsonl_path: trainingFile.jsonlPath,
          training_pair_count: trainingFile.totalTrainingPairs,
          dataset_id: dataset.id,
          last_build_error: null,
          failed_conversation_ids: [],
          updated_at: new Date().toISOString(),
        })
        .eq('id', trainingSetId);
```

---

## Task 3: Modify `build-training-set.ts` — Structured Error Storage

**File:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\build-training-set.ts`  
**Lines:** 136 total (shorter than rebuild — no incremental path)

Read this file in full before editing.

### 3a. Replace the catch block (currently at ~lines 73–79)

The current catch block:
```typescript
      } catch (err: any) {
        const supabase2 = createServerSupabaseAdminClient();
        await supabase2
          .from('training_sets')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', trainingSetId);
        throw new Error(`Training file creation failed: ${err.message}`);
      }
```

**Replace with:**
```typescript
      } catch (err: any) {
        const supabase2 = createServerSupabaseAdminClient();

        // Parse failed conversation IDs from the validation error message.
        const failedIds: string[] = [];
        const convIdRegex = /Conversation ([0-9a-f-]{36}):/g;
        let match;
        while ((match = convIdRegex.exec(err.message)) !== null) {
          if (!failedIds.includes(match[1])) failedIds.push(match[1]);
        }

        await supabase2
          .from('training_sets')
          .update({
            status: 'failed',
            last_build_error: err.message,
            failed_conversation_ids: failedIds,
            updated_at: new Date().toISOString(),
          })
          .eq('id', trainingSetId);

        throw new Error(`Training file creation failed: ${err.message}`);
      }
```

### 3b. Update the success path — clear error fields

In the `update-training-set-ready` step (~lines 133–145), the current update is:
```typescript
      const { error } = await supabase
        .from('training_sets')
        .update({
          status: 'ready',
          jsonl_path: trainingFile.jsonlPath,
          training_pair_count: trainingFile.totalTrainingPairs,
          dataset_id: dataset.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', trainingSetId);
```

**Replace with (add two cleared fields):**
```typescript
      const { error } = await supabase
        .from('training_sets')
        .update({
          status: 'ready',
          jsonl_path: trainingFile.jsonlPath,
          training_pair_count: trainingFile.totalTrainingPairs,
          dataset_id: dataset.id,
          last_build_error: null,
          failed_conversation_ids: [],
          updated_at: new Date().toISOString(),
        })
        .eq('id', trainingSetId);
```

---

## Task 4: Update GET Training Sets API — Include New Fields

**File:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\workbases\[id]\training-sets\route.ts`  
**Lines:** 136 total

Read this file in full before editing.

Find the `.map()` in the GET handler (~lines 37–50). The current mapping is:
```typescript
  const mapped = (data || []).map((row: any) => ({
    id: row.id,
    workbaseId: row.workbase_id,
    userId: row.user_id,
    name: row.name,
    conversationIds: row.conversation_ids || [],
    conversationCount: row.conversation_count,
    trainingPairCount: row.training_pair_count || 0,
    status: row.status,
    jsonlPath: row.jsonl_path,
    datasetId: row.dataset_id || null,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
```

**Replace with (add `lastBuildError` and `failedConversationIds`):**
```typescript
  const mapped = (data || []).map((row: any) => ({
    id: row.id,
    workbaseId: row.workbase_id,
    userId: row.user_id,
    name: row.name,
    conversationIds: row.conversation_ids || [],
    conversationCount: row.conversation_count,
    trainingPairCount: row.training_pair_count || 0,
    status: row.status,
    jsonlPath: row.jsonl_path,
    datasetId: row.dataset_id || null,
    isActive: row.is_active,
    lastBuildError: row.last_build_error || null,
    failedConversationIds: row.failed_conversation_ids || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
```

---

## Task 5: Create Bypass API Endpoint

**New file:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\workbases\[id]\training-sets\[tsId]\bypass\route.ts`

**Route:** `POST /api/workbases/[id]/training-sets/[tsId]/bypass`

**Purpose:** Remove specified conversation IDs from a failed training set, reset to `processing`, and fire `training/set.updated` to trigger an async rebuild without the invalid conversations.

**Request body:**
```json
{
  "conversationIdsToSkip": ["uuid1", "uuid2"]
}
```

**Create the file with this content:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { inngest } from '@/inngest/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; tsId: string } }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const body = await request.json();
  const { conversationIdsToSkip } = body;

  if (!conversationIdsToSkip || !Array.isArray(conversationIdsToSkip) || conversationIdsToSkip.length === 0) {
    return NextResponse.json(
      { success: false, error: 'conversationIdsToSkip array is required and must be non-empty' },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseAdminClient();

  // Verify workbase ownership
  const { data: wb } = await supabase
    .from('workbases')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (!wb) {
    return NextResponse.json({ success: false, error: 'Workbase not found' }, { status: 404 });
  }

  // Fetch the training set
  const { data: ts, error: tsErr } = await supabase
    .from('training_sets')
    .select('id, conversation_ids, status, name')
    .eq('id', params.tsId)
    .eq('workbase_id', params.id)
    .eq('user_id', user.id)
    .single();

  if (tsErr || !ts) {
    return NextResponse.json({ success: false, error: 'Training set not found' }, { status: 404 });
  }

  if (ts.status !== 'failed') {
    return NextResponse.json(
      { success: false, error: `Bypass only allowed on failed training sets (current status: ${ts.status})` },
      { status: 400 }
    );
  }

  // Remove the skipped IDs
  const skipSet = new Set(conversationIdsToSkip);
  const cleanedIds: string[] = (ts.conversation_ids || []).filter(
    (id: string) => !skipSet.has(id)
  );

  if (cleanedIds.length === 0) {
    return NextResponse.json(
      { success: false, error: 'No conversations remain after bypass — all were in the skip list' },
      { status: 400 }
    );
  }

  // Update training set: remove skipped IDs, reset status, clear error fields
  const { data: updated, error: updateErr } = await supabase
    .from('training_sets')
    .update({
      conversation_ids: cleanedIds,
      conversation_count: cleanedIds.length,
      status: 'processing',
      last_build_error: null,
      failed_conversation_ids: [],
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.tsId)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
  }

  // Trigger async rebuild
  await inngest.send({
    name: 'training/set.updated',
    data: {
      trainingSetId: params.tsId,
      workbaseId: params.id,
      conversationIds: cleanedIds,
      userId: user.id,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: updated.id,
      name: updated.name,
      skippedCount: conversationIdsToSkip.length,
      remainingCount: cleanedIds.length,
      status: updated.status,
    },
  });
}
```

---

## Task 6: Validate TypeScript Compilation

After completing all changes, run:

```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show" && npx tsc --noEmit 2>&1 | head -60
```

Fix any TypeScript errors before proceeding.

---

## Verification Checklist

- [ ] `training_sets` table has `last_build_error TEXT` column (verified via SAOL introspection)
- [ ] `training_sets` table has `failed_conversation_ids TEXT[]` column (verified via SAOL introspection)
- [ ] `rebuild-training-set.ts` catch block parses failed conversation IDs and writes them to DB
- [ ] `rebuild-training-set.ts` success path clears `last_build_error` and `failed_conversation_ids`
- [ ] `build-training-set.ts` catch block parses failed conversation IDs and writes them to DB
- [ ] `build-training-set.ts` success path clears `last_build_error` and `failed_conversation_ids`
- [ ] GET `/api/workbases/[id]/training-sets` response includes `lastBuildError` and `failedConversationIds`
- [ ] POST `/api/workbases/[id]/training-sets/[tsId]/bypass` endpoint exists and works
- [ ] TypeScript compiles without errors

---

## Build Artifacts for E02

E02 will use these artifacts from this prompt:
- **DB columns:** `training_sets.last_build_error` and `training_sets.failed_conversation_ids` — now available in the API response
- **GET response fields:** `lastBuildError` and `failedConversationIds` — consumed by the new Training Sets monitoring page
- **Bypass endpoint:** `POST /api/workbases/[id]/training-sets/[tsId]/bypass` — called by the Bypass & Rebuild button on the monitoring page

---

**END OF E01 PROMPT**

+++++++++++++++++



