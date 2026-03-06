# QA Bug Report: Training Set "Processing" Hang

**Date:** 2026-03-03
**Reported by:** User QA testing on `https://v4-show.vercel.app/`
**Workbase:** `/workbase/232bea74-b987-4629-afbc-a21180fe6e84`
**Affected page:** `/workbase/232bea74-b987-4629-afbc-a21180fe6e84/fine-tuning/conversations`

---

## Bug Summary

When adding a third batch of conversations (rows 50–75) to an existing Training Set, the Training Set status stays at `processing` indefinitely (10+ minutes observed) instead of transitioning to `ready`. The first two batches of 25 conversations each completed successfully.

---

## Answers to the Two Questions

### Q1: How do we fix it so I can continue adding conversations to the same Training Set?

**Short answer:** You cannot safely add more conversations to that Training Set while it is stuck in `processing`. The PATCH API route does not block on status (it will accept the request), but adding more conversations while the background rebuild is hung would create a race condition — two Inngest jobs would be rebuilding from potentially inconsistent state simultaneously. The right sequence is:

1. Clear/reset the stuck Training Set first (see Immediate Remediation below).
2. Verify the root cause is resolved (see Code Fix section).
3. Then add the third batch of 25.

### Q2: What do we need to do to clear the one on Processing? Is it blocking the ability to create a new Training Set? Is it blocking adding to that same Training Set?

**Does it block creating a new Training Set?**
No. Creating a new Training Set is an independent operation. You can create a brand new Training Set with the 50–75 conversations right now.

**Does it block adding to that same Training Set?**
Technically no — the PATCH route accepts the request regardless of status. But it is not safe to add while the previous rebuild is unresolved (risk of duplicate or corrupted data in the rebuilt JSONL).

**How to clear it:** See the Immediate Remediation section below.

---

## Root Cause Analysis

The bug has **one primary cause** and **one compounding cause**.

### Primary Cause: `rebuildTrainingSet` Inngest Step Hangs on Large Batches

**File:** `src/inngest/functions/rebuild-training-set.ts`

When the user adds conversations to an existing Training Set, the PATCH route fires the `training/set.updated` Inngest event with the **full merged list** of all conversation IDs (50 + 25 = 75). The `rebuildTrainingSet` function handles this event by calling `service.createTrainingFile()` — which rebuilds the entire file from scratch using all 75 IDs.

Inside `createTrainingFile()` → `fetchEnrichedConversations()`, the code downloads all 75 enriched JSON files from Supabase Storage **in parallel** using `Promise.all`:

```typescript
// src/lib/services/training-file-service.ts (line 521)
const enrichedConversations = await Promise.all(
  conversations.map(async (conv) => {
    const jsonContent = await this.downloadEnrichedJSONFile(conv.enriched_file_path);
    return { metadata: conv, json: jsonContent };
  })
);
```

**The problem:** If any one of the 75 downloads hangs (no response from Supabase Storage — network stall, not a hard error), `Promise.all` never resolves. This causes the Inngest step itself to hang. The step never throws an error, so the `catch` block inside the step never runs, and the Training Set status is never updated to `failed`. The Training Set stays in `processing` forever.

Inngest's step timeout (varies by plan; typically 2 minutes) will eventually kill the step, but this timeout happens at the **Inngest infrastructure level**, not within the JavaScript `try/catch`. This means the catch block that updates status to `failed` does not run. With 2 retries and exponential backoff, the total hang window is 6–10 minutes before all retries are exhausted — and even after retries are exhausted, the status remains `processing` because the infrastructure-level timeout bypasses the catch block.

### Compounding Cause: Full Rebuild Instead of Incremental Merge

`rebuildTrainingSet` calls `service.createTrainingFile()` which **builds from scratch using all 75 conversations** every time, even though the first 50 were already downloaded, processed, and saved to Storage in previous successful builds. This is architecturally wrong: the incremental path should download only the 25 new conversations and merge them with the already-uploaded JSON.

The `TrainingFileService` already has an `addConversationsToTrainingFile()` method that does exactly this (downloads existing JSON, fetches only new conversations, merges), but `rebuildTrainingSet` does not use it.

**Why the first two batches worked:** 25 conversations is a small enough batch that `Promise.all` resolved quickly without hanging. 75 concurrent downloads is a significantly larger surface area for network stalls.

---

## Immediate Remediation (Clear the Stuck State)

### Step 1: Check Inngest Dashboard for the Failed Run

1. Go to `https://app.inngest.com` → your app → **Runs**
2. Filter by function `rebuild-training-set`
3. Find the run that corresponds to the stuck Training Set
4. Check its status — it will either be `Running`, `Failed`, or in a retry queue
5. If it shows `Running` for 10+ minutes, click **Cancel** on the run

### Step 2: Manually Reset the Training Set Status in Supabase

The Training Set record is stuck in `processing` in the `training_sets` table. Reset it via the Supabase dashboard:

1. Go to `https://supabase.com` → your project → **Table Editor** → `training_sets`
2. Find the row where `status = 'processing'` for workbase `232bea74-b987-4629-afbc-a21180fe6e84`
3. Update the row:
   - Set `status` = `ready` (if the first two batches were processed correctly, the existing JSONL is valid for 50 conversations)
   - OR set `status` = `failed` (to signal a clean retry is needed)

**Recommended:** Set to `ready` if the `jsonl_path` column already has a valid path (meaning the first two successful batches produced a working JSONL). The Training Set with 50 conversations is usable for launching a fine-tuning job. You can then add the third batch again once the code fix below is deployed.

**SQL (run in Supabase SQL Editor):**
```sql
-- First, verify which row is stuck
SELECT id, name, status, conversation_count, jsonl_path, updated_at
FROM training_sets
WHERE workbase_id = '232bea74-b987-4629-afbc-a21180fe6e84'
  AND status = 'processing';

-- If jsonl_path is populated (a previous build succeeded), reset to 'ready'
UPDATE training_sets
SET status = 'ready', updated_at = NOW()
WHERE workbase_id = '232bea74-b987-4629-afbc-a21180fe6e84'
  AND status = 'processing'
  AND jsonl_path IS NOT NULL;

-- If jsonl_path is NULL (was never successfully built), reset to 'failed'
UPDATE training_sets
SET status = 'failed', updated_at = NOW()
WHERE workbase_id = '232bea74-b987-4629-afbc-a21180fe6e84'
  AND status = 'processing'
  AND jsonl_path IS NULL;
```

### Step 3: Verify the Reset

After running the SQL, refresh the conversations page at:
`https://v4-show.vercel.app/workbase/232bea74-b987-4629-afbc-a21180fe6e84/fine-tuning/conversations`

Select any conversations and open the "Build Training Set" dropdown — the Training Set should now show `ready` or `failed` status instead of `processing`.

---

## Code Fix Specification

This section defines the code changes needed to permanently fix the bug.

### Fix 1 (Critical): Refactor `rebuildTrainingSet` to Use Incremental Merge

**File:** `src/inngest/functions/rebuild-training-set.ts`

**Problem:** Step 2 calls `service.createTrainingFile()` with all conversation IDs, which downloads ALL files from scratch.

**Fix:** Switch to `service.addConversationsToTrainingFile()` which:
1. Downloads the EXISTING JSON file already in Storage (only 1 download instead of 75)
2. Fetches and downloads only the NEW conversations' enriched JSON files
3. Merges them using the existing `mergeConversationsIntoFullJSON` logic
4. Uploads the merged result back to the same storage path

This reduces the parallel storage download count from N (all conversations) to K (only new conversations). For the 3rd batch of 25, this means 25 downloads instead of 75.

**Additional protection needed:** Wrap all `Promise.all` calls in `downloadEnrichedJSONFile` with a per-request timeout so a single hanging storage download cannot block the entire batch. Use `Promise.race` with a 30-second timeout per file.

**Revised architecture for `rebuildTrainingSet`:**

```typescript
// Step 2 — Replace createTrainingFile (full rebuild) with addConversationsToTrainingFile (incremental)
const trainingFile = await step.run('rebuild-training-file-v4', async () => {
  const supabase = createServerSupabaseAdminClient();
  const service = createTrainingFileService(supabase);

  // Get the existing training_files record linked to this training set
  const { data: ts } = await supabase
    .from('training_sets')
    .select('id, name, dataset_id, training_file_id')  // training_file_id must be added to schema
    .eq('id', trainingSetId)
    .single();

  try {
    if (ts?.training_file_id) {
      // Incremental path: only download new conversations and merge
      // Determine which IDs are truly new vs already in the training_files record
      const { data: existingAssocs } = await supabase
        .from('training_file_conversations')
        .select('conversation_id')
        .eq('training_file_id', ts.training_file_id);
      const existingIds = new Set((existingAssocs || []).map((r: any) => r.conversation_id));
      const newConversationIds = conversationIds.filter((id: string) => !existingIds.has(id));

      if (newConversationIds.length === 0) {
        // Nothing actually new — training file is already up to date
        return { id: ts.training_file_id, alreadyCurrent: true };
      }

      const result = await service.addConversationsToTrainingFile({
        training_file_id: ts.training_file_id,
        conversation_ids: newConversationIds,
        added_by: userId,
      });
      return {
        id: result.id,
        jsonlPath: result.jsonl_file_path,
        totalTrainingPairs: result.total_training_pairs,
        conversationCount: result.conversation_count,
      };
    } else {
      // First build (no existing training_file_id) — full build is correct here
      const result = await service.createTrainingFile({
        name: trainingSet.name,
        description: `Built by workbase training set ${trainingSetId}`,
        conversation_ids: conversationIds,
        created_by: userId,
      });
      return {
        id: result.id,
        jsonlPath: result.jsonl_file_path,
        totalTrainingPairs: result.total_training_pairs,
        conversationCount: result.conversation_count,
      };
    }
  } catch (err: any) {
    const supabase2 = createServerSupabaseAdminClient();
    await supabase2
      .from('training_sets')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', trainingSetId);
    throw new Error(`Training file rebuild failed: ${err.message}`);
  }
});
```

**Schema change required:** Add `training_file_id UUID REFERENCES training_files(id)` column to `training_sets` table. Set this when the first successful build completes (in both `buildTrainingSet` and `rebuildTrainingSet` Step 4 updates).

### Fix 2 (Critical): Add Per-Download Timeout in `fetchEnrichedConversations`

**File:** `src/lib/services/training-file-service.ts`

**Problem:** `Promise.all` over storage downloads can hang if any single download stalls.

**Fix:** Wrap each download with a timeout using `Promise.race`:

```typescript
private async downloadWithTimeout(filePath: string, timeoutMs: number = 30000): Promise<any> {
  const downloadPromise = this.downloadEnrichedJSONFile(filePath);
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Storage download timed out after ${timeoutMs}ms: ${filePath}`)), timeoutMs)
  );
  return Promise.race([downloadPromise, timeoutPromise]);
}

private async fetchEnrichedConversations(conversation_ids: string[]): Promise<any[]> {
  const { data: conversations, error } = await this.supabase
    .from('conversations')
    .select(`conversation_id, enriched_file_path, ...`)
    .in('conversation_id', conversation_ids);
  
  if (error) throw error;
  
  // Process in batches of 10 to avoid overwhelming Supabase Storage
  const batchSize = 10;
  const results: any[] = [];
  for (let i = 0; i < conversations.length; i += batchSize) {
    const batch = conversations.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (conv) => {
        const jsonContent = await this.downloadWithTimeout(conv.enriched_file_path);
        return { metadata: conv, json: jsonContent };
      })
    );
    results.push(...batchResults);
  }
  return results;
}
```

**Why batching helps:** Rather than 75 concurrent downloads (all at once), process in batches of 10. Each batch of 10 completes before the next starts. This prevents resource exhaustion and gives cleaner timeout boundaries.

### Fix 3 (Important): Add a "Reset Stuck Training Set" API Endpoint

**New file:** `src/app/api/workbases/[id]/training-sets/[tsId]/reset/route.ts`

This endpoint allows the frontend (and admin) to manually reset a stuck Training Set back to a workable state without needing Supabase dashboard access.

```typescript
// POST /api/workbases/[id]/training-sets/[tsId]/reset
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; tsId: string } }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const supabase = createServerSupabaseAdminClient();

  // Verify ownership
  const { data: ts } = await supabase
    .from('training_sets')
    .select('id, status, jsonl_path')
    .eq('id', params.tsId)
    .eq('workbase_id', params.id)
    .eq('user_id', user.id)
    .single();

  if (!ts) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Only allow reset if stuck in processing
  if (ts.status !== 'processing') {
    return NextResponse.json({ error: 'Training set is not in processing state' }, { status: 400 });
  }

  // Reset: if a previous JSONL exists, go back to 'ready'; otherwise 'failed'
  const newStatus = ts.jsonl_path ? 'ready' : 'failed';

  const { error } = await supabase
    .from('training_sets')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', params.tsId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, status: newStatus });
}
```

### Fix 4 (UX): Add "Stuck" Detection and Reset UI

**File:** `src/components/conversations/ConversationTable.tsx`

In the dropdown that lists existing Training Sets, if a Training Set has `status = 'processing'` and was last updated more than 5 minutes ago, show a "⚠ Stuck — Reset" option instead of the normal "Add to" option.

```tsx
{trainingFiles.map((file: any) => {
  const isStuck = file.status === 'processing' &&
    Date.now() - new Date(file.updatedAt || file.updated_at || 0).getTime() > 5 * 60 * 1000;

  if (isStuck) {
    return (
      <DropdownMenuItem
        key={file.id}
        onClick={() => handleResetStuckTrainingSet(file.id)}
      >
        <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
        <div className="flex-1">
          <div className="font-medium">{file.name}</div>
          <div className="text-xs text-yellow-600">⚠ Stuck — click to reset</div>
        </div>
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuItem key={file.id} onClick={() => handleAddToExistingFile(file.id)} ...>
      {/* existing content */}
    </DropdownMenuItem>
  );
})}
```

---

## Files to Change Summary

| File | Change Type | Priority |
|------|-------------|----------|
| `src/inngest/functions/rebuild-training-set.ts` | Refactor Step 2 to use incremental merge | Critical |
| `src/lib/services/training-file-service.ts` | Add per-download timeout + batching to `fetchEnrichedConversations` | Critical |
| `src/app/api/workbases/[id]/training-sets/[tsId]/reset/route.ts` | New endpoint for manual reset | Important |
| `src/components/conversations/ConversationTable.tsx` | Add stuck-detection and reset UI | Important |
| DB migration | Add `training_file_id` column to `training_sets` table | Needed for Fix 1 |

---

## Testing the Fix

After the code changes are deployed to Vercel:

1. Navigate to `https://v4-show.vercel.app/workbase/232bea74-b987-4629-afbc-a21180fe6e84/fine-tuning/conversations`
2. Select 25 conversations → Build New Training Set → name it "QA Batch Test"
3. Wait for it to transition from `processing` → `ready` (should take 30–90 seconds)
4. Select the next 25 conversations → Build Training Set dropdown → click the existing "QA Batch Test" set
5. Wait for it to transition again (should be faster now with incremental merge — only 25 downloads instead of 50)
6. Repeat for a third batch of 25 — confirm it transitions to `ready` instead of hanging

---

## Why the First Two Batches Worked

The first two batches worked because:
- **Batch 1 (0–25):** Creates the Training Set for the first time. `buildTrainingSet` runs `createTrainingFile` for 25 conversations — 25 parallel downloads is well within Supabase Storage's per-connection limits and completes in ~5–15 seconds.
- **Batch 2 (25–50):** `rebuildTrainingSet` runs `createTrainingFile` for 50 conversations — 50 parallel downloads, still fast enough to complete before the Inngest step timeout.
- **Batch 3 (50–75):** `rebuildTrainingSet` runs `createTrainingFile` for 75 conversations — 75 parallel downloads likely stalls: either Supabase Storage rate-limits the connection, or the cumulative processing time (download 75 files + aggregate + upload) exceeds the Inngest step execution timeout. The step hangs or is killed by Inngest's timeout infrastructure without the catch block running.

---

## Related Files (Read Before Implementing)

- `src/inngest/functions/rebuild-training-set.ts` — The primary bug location
- `src/inngest/functions/build-training-set.ts` — Reference for the "first build" pattern
- `src/lib/services/training-file-service.ts` — Contains `addConversationsToTrainingFile` (incremental merge) and `createTrainingFile` (full rebuild)
- `src/app/api/workbases/[id]/training-sets/[tsId]/route.ts` — The PATCH route that fires `training/set.updated`
- `src/components/conversations/ConversationTable.tsx` — The UI that triggers the add operation

## ReSync Inngest
Don't forget to resynch Inngest.