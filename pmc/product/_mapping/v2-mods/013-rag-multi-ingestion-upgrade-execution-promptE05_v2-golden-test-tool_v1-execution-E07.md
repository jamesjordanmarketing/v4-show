# E07: Golden-Set Test — Client-Side Batching Fix

**Date:** February 17, 2026  
**Status:** Ready for execution  
**Predecessor:** E06 (golden-set test tool — base implementation)

---

## Problem

The E06 golden-set test tool hits the **Vercel 300-second function timeout**. Each RAG query takes ~10-25s, so 20 sequential queries in a single serverless invocation requires ~300-500s total — exceeding even the Pro plan's `maxDuration = 300`.

The Vercel log confirms:
```
Vercel Runtime Timeout Error: Task timed out after 300 seconds
Function duration: 300,031ms
```

The browser receives a non-JSON error (`"An error o..."`) which crashes the client-side JSON parser, producing the error message: `Unexpected token 'A', "An error o"... is not valid JSON`.

---

## Decision: Client-Side Batching (NOT Inngest)

### Why NOT Inngest
- Inngest adds a new background job, polling mechanism, and state management complexity
- Requires a new Inngest function definition, event triggers, and status-checking endpoint
- Results would need to be stored in the database, adding a new table or storage mechanism
- Overkill for a developer test tool — Inngest is for production workloads

### Why Client-Side Batching
- **Zero new dependencies** — only modifies 2 existing files
- **Live progress** — the UI updates after each batch completes (every 4-5 questions)
- **Each batch safely within timeout** — 4 queries × 25s worst case = 100s, well under 300s
- **Simple recovery** — if one batch fails, results from prior batches are preserved
- **Same total API cost** — just split across 5 HTTP calls instead of 1

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│  Browser (page.tsx)                              │
│                                                  │
│  Click "Run Test"                                │
│    ├── POST /api/.../golden-set  {batch: 0}      │  ← Queries 1-4 + preflight
│    │   ← results[0..3] + preflight               │
│    │   → Update UI: progress 20%, show results   │
│    │                                             │
│    ├── POST /api/.../golden-set  {batch: 1}      │  ← Queries 5-8
│    │   ← results[4..7]                           │
│    │   → Update UI: progress 40%                 │
│    │                                             │
│    ├── POST /api/.../golden-set  {batch: 2}      │  ← Queries 9-12
│    ├── POST /api/.../golden-set  {batch: 3}      │  ← Queries 13-16
│    └── POST /api/.../golden-set  {batch: 4}      │  ← Queries 17-20
│        ← final results                           │
│        → Compute summary, show final report      │
└──────────────────────────────────────────────────┘
```

---

## Proposed Changes

### [MODIFY] `route.ts`

**File:** `src/app/api/rag/test/golden-set/route.ts`

The POST handler currently runs all 20 queries. Change it to accept a `batch` parameter (0-4) and run only 4 queries per call.

#### New POST Request Body

```typescript
interface BatchRequest {
    batch: number;  // 0-4 (which group of 4 questions to run)
}
```

#### New POST Response Body

```typescript
interface BatchResponse {
    success: boolean;
    data: {
        batch: number;
        totalBatches: number;
        preflight?: PreflightResult;      // Only included in batch 0
        results: TestResult[];             // 4 results per batch
        batchDurationMs: number;
    };
    error?: string;
}
```

#### Logic Changes

1. Parse `batch` from request body (default to `0` if missing for backward compatibility)
2. **Batch 0 only:** Run `runPreflightChecks()`. If preflight fails, return immediately
3. Slice `GOLDEN_SET` into groups of 4: `items = GOLDEN_SET.slice(batch * 4, batch * 4 + 4)`
4. Run only those 4 queries sequentially (keep the 500ms delay)
5. Return the batch results — no summary computation on the server
6. Reduce `maxDuration` from 300 to 120 (4 queries × 25s = 100s max, 120s gives headroom)

#### Pseudocode

```typescript
export async function POST(request: NextRequest) {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const body = await request.json();
    const batch = body.batch ?? 0;
    const BATCH_SIZE = 4;
    const totalBatches = Math.ceil(GOLDEN_SET.length / BATCH_SIZE);

    if (batch < 0 || batch >= totalBatches) {
        return NextResponse.json({ success: false, error: 'Invalid batch index' }, { status: 400 });
    }

    try {
        // Preflight only on batch 0
        let preflight: PreflightResult | undefined;
        if (batch === 0) {
            preflight = await runPreflightChecks(CANONICAL_DOCUMENT_ID);
            if (!preflight.passed) {
                return NextResponse.json({
                    success: true,
                    data: { batch: 0, totalBatches, preflight, results: [], batchDurationMs: 0 }
                });
            }
        }

        // Slice the items for this batch
        const items = GOLDEN_SET.slice(batch * BATCH_SIZE, (batch + 1) * BATCH_SIZE);
        const batchStart = Date.now();
        const results: TestResult[] = [];

        for (const item of items) {
            const result = await runSingleTest(item, user!.id, CANONICAL_DOCUMENT_ID);
            results.push(result);
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        return NextResponse.json({
            success: true,
            data: {
                batch,
                totalBatches,
                ...(preflight ? { preflight } : {}),
                results,
                batchDurationMs: Date.now() - batchStart,
            }
        });
    } catch (err) {
        console.error(`[Golden-Set Test] Batch ${batch} error:`, err);
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : 'Batch failed' },
            { status: 500 }
        );
    }
}
```

---

### [MODIFY] `page.tsx`

**File:** `src/app/(dashboard)/rag/test/page.tsx`

The `runTest()` function currently makes 1 fetch call. Change it to loop through 5 batches, accumulating results and showing live progress.

#### Key Changes to `runTest()`

```typescript
const runTest = async () => {
    setIsRunning(true);
    setSummary(null);
    setError(null);
    setExpandedItems(new Set());

    const runId = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    const startTime = Date.now();
    const allResults: TestResult[] = [];
    let preflight: PreflightResult | null = null;
    const TOTAL_BATCHES = 5;

    try {
        for (let batch = 0; batch < TOTAL_BATCHES; batch++) {
            setBatchProgress({ current: batch, total: TOTAL_BATCHES });

            const res = await fetch('/api/rag/test/golden-set', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ batch }),
            });

            const json = await res.json();

            if (!res.ok || !json.success) {
                setError(json.error || `Batch ${batch} failed: HTTP ${res.status}`);
                // Keep results from earlier batches
                break;
            }

            // Capture preflight from batch 0
            if (batch === 0 && json.data.preflight) {
                preflight = json.data.preflight;
                if (!preflight.passed) {
                    // Show preflight failure and stop
                    break;
                }
            }

            allResults.push(...json.data.results);
        }

        // Compute summary client-side from accumulated results
        if (allResults.length > 0) {
            const summary = computeSummary(runId, startedAt, startTime, preflight, allResults);
            setSummary(summary);
        }
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Network error');
    } finally {
        setIsRunning(false);
        setBatchProgress(null);
    }
};
```

#### New State Variable

```typescript
const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
```

#### New Helper: `computeSummary()`

Move the summary computation from `route.ts` to a client-side function in `page.tsx`:

```typescript
function computeSummary(
    runId: string,
    startedAt: string,
    startTime: number,
    preflight: PreflightResult | null,
    results: TestResult[]
): TestRunSummary {
    const totalPassed = results.filter(r => r.passed).length;
    const totalErrored = results.filter(r => r.error !== null).length;
    const totalFailed = results.length - totalPassed;
    const passRate = Math.round((totalPassed / results.length) * 100);

    const easyResults = results.filter(r => r.item.difficulty === 'easy');
    const mediumResults = results.filter(r => r.item.difficulty === 'medium');
    const hardResults = results.filter(r => r.item.difficulty === 'hard');

    const avgResponseTimeMs = Math.round(
        results.reduce((sum, r) => sum + r.responseTimeMs, 0) / results.length
    );

    const scoresWithValues = results.filter(r => r.selfEvalScore !== null);
    const avgSelfEvalScore = scoresWithValues.length > 0
        ? scoresWithValues.reduce((sum, r) => sum + (r.selfEvalScore || 0), 0) / scoresWithValues.length
        : 0;

    return {
        runId,
        startedAt,
        completedAt: new Date().toISOString(),
        totalDurationMs: Date.now() - startTime,
        preflight: preflight || { passed: true, checks: [] },
        totalPassed,
        totalFailed,
        totalErrored,
        passRate,
        meetsTarget: passRate >= 85,
        breakdown: {
            easy: { passed: easyResults.filter(r => r.passed).length, total: easyResults.length },
            medium: { passed: mediumResults.filter(r => r.passed).length, total: mediumResults.length },
            hard: { passed: hardResults.filter(r => r.passed).length, total: hardResults.length },
        },
        avgResponseTimeMs,
        avgSelfEvalScore,
        results,
    };
}
```

#### UI Progress Update

Replace the indeterminate spinner in the "Running" card with a determinate progress bar:

```tsx
{isRunning && batchProgress && (
    <Card>
        <CardContent className="pt-6">
            <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <span className="text-sm">
                    Running batch {batchProgress.current + 1} of {batchProgress.total}...
                    ({batchProgress.current * 4} of 20 queries complete)
                </span>
            </div>
            <Progress
                value={((batchProgress.current) / batchProgress.total) * 100}
                className="mt-3"
            />
        </CardContent>
    </Card>
)}
```

---

## Files Changed

| File | Action | Lines Changed (est.) |
|------|--------|---------------------|
| `src/app/api/rag/test/golden-set/route.ts` | Modify | ~80 (rewrite POST handler) |
| `src/app/(dashboard)/rag/test/page.tsx` | Modify | ~50 (new `runTest` loop + `computeSummary` + progress bar) |

**No new files. No new dependencies. No database changes.**

---

## Verification Plan

### TypeScript Compilation
```bash
cd src && npx tsc --noEmit
```

### Health Check Endpoint
```
GET /api/rag/test/golden-set → { available: true, testCount: 20, ... }
```
(Unchanged from E06)

### Batch Endpoint Test
```
POST /api/rag/test/golden-set  body: { batch: 0 }
→ { success: true, data: { batch: 0, totalBatches: 5, preflight: {...}, results: [...4 items], batchDurationMs: ... } }
```
Each batch should complete in **~40-100 seconds** (well under 120s timeout).

### Full Run via UI
Navigate to `/rag/test` on Vercel, click **Run Test**, confirm:
- Progress bar counts from 1/5 to 5/5
- Each batch completes without timeout
- Final summary shows all 20 results
- No `"An error o..."` JSON parse errors

---

## Constraints

- **Do NOT change `golden-set-definitions.ts`** — types and data are correct
- **Do NOT change `test-diagnostics.ts`** — helper functions are correct
- **Do NOT add any npm dependencies**
- **Do NOT create new files** — only modify the 2 files listed above
