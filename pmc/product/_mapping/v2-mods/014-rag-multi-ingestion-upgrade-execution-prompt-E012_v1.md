# E012: Test Diagnostics Enhancement and API Endpoints

**Version:** 1.0  
**Date:** February 17, 2026  
**Section:** E012 — Test Diagnostics + API Endpoints (3 of 4)  
**Prerequisites:** E010 (migration, types, error fixes) and E011 (service layer runId threading) must be complete  
**Builds Upon:** E011 added `runId` to `queryRAG`, `searchSimilarEmbeddings`, `generateAndStoreBatchEmbeddings`, and embedding run lifecycle in `processDocument`  
**Next Prompt:** E013 (UI overhaul + integration testing)

---

## Overview

This prompt creates the test diagnostics enhancements and all API endpoints needed by the UI:

1. **Change 6** — Enhance `test-diagnostics.ts`: improved preflight with run data, `runId` on `runSingleTest`, new `getEmbeddingRuns` function
2. **Change 7** — Create embedding runs API endpoint (`GET /api/rag/test/golden-set/runs`)
3. **Change 8** — Create test reports API endpoints (`POST/GET /api/rag/test/golden-set/reports`)
4. **Change 9** — Create markdown report API endpoint (`POST /api/rag/test/golden-set/report`)
5. **Change 10** — Update golden-set test API route to accept `runId`

**What This Prompt Creates/Modifies:**
- Modified: `src/lib/rag/testing/test-diagnostics.ts` (enhanced preflight + new functions)
- Created: `src/app/api/rag/test/golden-set/runs/route.ts` (embedding runs endpoint)
- Created: `src/app/api/rag/test/golden-set/reports/route.ts` (report save/list endpoints)
- Created: `src/app/api/rag/test/golden-set/report/route.ts` (markdown report generation)
- Modified: `src/app/api/rag/test/golden-set/route.ts` (accept `runId`)

**What This Prompt Does NOT Create:**
- UI changes (E013)

---

## Prompt 3 of 4: Test Diagnostics and API Endpoints

========================


## Context & Instructions

You are implementing Part 3 of 4 of the E09 Golden-Set Test Tool specification. This prompt enhances test diagnostics and creates all API endpoints that the UI (E013) will consume.

**Target Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src`

### Prerequisites (E010 + E011 Completed)

The following changes are already in place:

**From E010:**
- `rag_embedding_runs` table exists (11 columns)
- `rag_test_reports` table exists (17 columns)
- `rag_embeddings.run_id` column exists (UUID, nullable)
- `match_rag_embeddings_kb` accepts `filter_run_id uuid DEFAULT NULL`
- `search_rag_text` uses `ORDER BY 5 DESC` (fixed)
- `TestRunSummary` has `embeddingRunId?: string` field in `golden-set-definitions.ts`

**From E011:**
- `generateAndStoreEmbedding(params)` — accepts optional `runId`, writes `run_id` to DB
- `generateAndStoreBatchEmbeddings(params)` — accepts optional `runId`, passes to all records
- `searchSimilarEmbeddings(params)` — accepts optional `runId`, passes `filter_run_id` to RPC
- `processDocument()` — creates `rag_embedding_runs` record, passes `runId` to batch embeddings, updates status
- `retrieveContext(params)` — accepts optional `runId`, passes to both `searchSimilarEmbeddings` calls
- `queryRAG(params)` — accepts optional `runId`, passes to `retrieveContext`

### Critical Rules

1. **DO NOT add npm dependencies.**
2. **Application code uses `createServerSupabaseAdminClient()`** — NOT SAOL.
3. **Use `requireAuth` for all API endpoints** — imported from `@/lib/supabase-server`.
4. **All new API routes must export `maxDuration`** where needed (default 10 for simple routes, 120 for test execution).
5. **DO NOT modify golden-set questions or expected answers.**

### Key Files (Read These First)

Before making changes, read and understand:

- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\testing\test-diagnostics.ts` (277 lines) — contains `runPreflightChecks`, `runSingleTest`
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\testing\golden-set-definitions.ts` (229 lines) — contains types and `CANONICAL_DOCUMENT_ID`
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\rag\test\golden-set\route.ts` — current golden-set test API
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\supabase-server.ts` — contains `requireAuth`, `createServerSupabaseAdminClient`

### Existing API Route Structure

The current golden-set route is at:
```
src/app/api/rag/test/golden-set/route.ts     ← EXISTS (modify)
```

New routes to create:
```
src/app/api/rag/test/golden-set/runs/route.ts     ← CREATE
src/app/api/rag/test/golden-set/reports/route.ts   ← CREATE
src/app/api/rag/test/golden-set/report/route.ts    ← CREATE
```

### Import Patterns (Follow These)

All API routes in this codebase use this pattern:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';
```

The `requireAuth` function returns `{ user, response }`. If `response` is non-null, return it immediately (401 unauthorized).

---

## Task 1: Enhance Test Diagnostics

### [MODIFY] `src/lib/rag/testing/test-diagnostics.ts`

#### 1a. Enhance "Check 2: Embeddings exist" block (lines 67–96)

The current Check 2 queries embeddings filtered by `document_id` and does a simple count by tier. Enhance it to also show creation time range, run counts, and untagged counts.

**Replace the entire "Check 2" try/catch block (lines 67–96) with:**

```typescript
// Check 2: Embeddings exist for this document
try {
    const supabase = createServerSupabaseAdminClient();
    const { data: embeddings, error } = await supabase
        .from('rag_embeddings')
        .select('id, tier, created_at, run_id')
        .eq('document_id', documentId)
        .order('created_at', { ascending: true });

    if (error) {
        checks.push({
            name: 'Embeddings Exist',
            passed: false,
            detail: `Query error: ${error.message}`,
            severity: 'critical',
        });
    } else {
        const count = embeddings?.length || 0;
        const tier1 = embeddings?.filter((e: any) => e.tier === 1).length || 0;
        const tier2 = embeddings?.filter((e: any) => e.tier === 2).length || 0;
        const tier3 = embeddings?.filter((e: any) => e.tier === 3).length || 0;

        // Determine embedding creation time range
        let timeRange = '';
        if (count > 0) {
            const oldest = embeddings![0]?.created_at;
            const newest = embeddings![embeddings!.length - 1]?.created_at;
            const oldestDate = oldest ? new Date(oldest) : null;
            const newestDate = newest ? new Date(newest) : null;

            if (oldestDate && newestDate) {
                const spanMs = newestDate.getTime() - oldestDate.getTime();
                const spanHours = Math.round(spanMs / (1000 * 60 * 60));

                if (spanHours < 1) {
                    timeRange = ` | single run ~${oldestDate.toISOString().slice(0, 16)}Z`;
                } else {
                    timeRange = ` | span: ${oldestDate.toISOString().slice(0, 16)}Z → ${newestDate.toISOString().slice(0, 16)}Z (${spanHours}h — may include multiple runs)`;
                }
            }

            // Count distinct run_ids
            const runIds = new Set(embeddings!.map((e: any) => e.run_id).filter(Boolean));
            const untaggedCount = embeddings!.filter((e: any) => !e.run_id).length;
            if (runIds.size > 0 || untaggedCount > 0) {
                const parts: string[] = [];
                if (runIds.size > 0) parts.push(`${runIds.size} tagged run(s)`);
                if (untaggedCount > 0) parts.push(`${untaggedCount} untagged (legacy)`);
                timeRange += ` | ${parts.join(', ')}`;
            }
        }

        checks.push({
            name: 'Embeddings Exist',
            passed: count > 0,
            detail: count > 0
                ? `${count} embeddings (tier1: ${tier1}, tier2: ${tier2}, tier3: ${tier3})${timeRange}`
                : 'No embeddings found for this document',
            severity: count > 0 ? 'info' : 'critical',
        });
    }
} catch (err) {
    checks.push({
        name: 'Embeddings Exist',
        passed: false,
        detail: `Error: ${err instanceof Error ? err.message : 'unknown'}`,
        severity: 'critical',
    });
}
```

#### 1b. Add `runId` parameter to `runSingleTest`

**Current signature (line 191):**

```typescript
export async function runSingleTest(
    item: GoldenSetItem,
    userId: string,
    documentId: string,
): Promise<TestResult>
```

**Change to:**

```typescript
export async function runSingleTest(
    item: GoldenSetItem,
    userId: string,
    documentId: string,
    runId?: string,
): Promise<TestResult>
```

**And update the `queryRAG` call inside `runSingleTest` (around line 209):**

**Current:**
```typescript
const result = await queryRAG({
    queryText: item.question,
    documentId,
    userId,
    mode: 'rag_only',
});
```

**Change to:**
```typescript
const result = await queryRAG({
    queryText: item.question,
    documentId,
    userId,
    mode: 'rag_only',
    runId,
});
```

#### 1c. Add `getEmbeddingRuns` function

At the bottom of `test-diagnostics.ts`, add a new exported function and its interface:

```typescript
// ---- Embedding Run Listing ----

export interface EmbeddingRunInfo {
    id: string;
    documentId: string;
    embeddingCount: number;
    embeddingModel: string;
    status: string;
    pipelineVersion: string;
    startedAt: string;
    completedAt: string | null;
    metadata: Record<string, unknown>;
}

export async function getEmbeddingRuns(documentId: string): Promise<EmbeddingRunInfo[]> {
    try {
        const supabase = createServerSupabaseAdminClient();
        const { data, error } = await supabase
            .from('rag_embedding_runs')
            .select('*')
            .eq('document_id', documentId)
            .order('created_at', { ascending: false });

        if (error || !data) {
            console.warn('[Test Diagnostics] Failed to fetch embedding runs:', error);
            return [];
        }

        return data.map((row: any) => ({
            id: row.id,
            documentId: row.document_id,
            embeddingCount: row.embedding_count,
            embeddingModel: row.embedding_model,
            status: row.status,
            pipelineVersion: row.pipeline_version,
            startedAt: row.started_at,
            completedAt: row.completed_at,
            metadata: row.metadata || {},
        }));
    } catch (err) {
        console.warn('[Test Diagnostics] Error fetching embedding runs:', err);
        return [];
    }
}
```

---

## Task 2: Create Embedding Runs API Endpoint

### [CREATE] `src/app/api/rag/test/golden-set/runs/route.ts`

Create this file with the following content:

```typescript
/**
 * Embedding Runs API — List available embedding runs for the canonical document
 *
 * GET — Returns all embedding runs for the canonical document
 *       plus a count of untagged (legacy) embeddings.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { getEmbeddingRuns } from '@/lib/rag/testing/test-diagnostics';
import { CANONICAL_DOCUMENT_ID } from '@/lib/rag/testing/golden-set-definitions';

export async function GET(request: NextRequest) {
    const { user, response: authResponse } = await requireAuth(request);
    if (authResponse) return authResponse;

    try {
        const runs = await getEmbeddingRuns(CANONICAL_DOCUMENT_ID);

        // Count untagged (legacy) embeddings
        const supabase = createServerSupabaseAdminClient();
        const { count: untaggedCount } = await supabase
            .from('rag_embeddings')
            .select('id', { count: 'exact', head: true })
            .eq('document_id', CANONICAL_DOCUMENT_ID)
            .is('run_id', null);

        return NextResponse.json({
            success: true,
            data: {
                runs,
                untaggedCount: untaggedCount ?? 0,
                documentId: CANONICAL_DOCUMENT_ID,
            },
        });
    } catch (err) {
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : 'Failed to fetch runs' },
            { status: 500 }
        );
    }
}
```

---

## Task 3: Create Test Reports API Endpoints

### [CREATE] `src/app/api/rag/test/golden-set/reports/route.ts`

Create this file with the following content:

```typescript
/**
 * Test Reports API — Save and list golden-set test reports
 *
 * POST — Save a completed test report
 * GET  — List historical reports for the canonical document
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { CANONICAL_DOCUMENT_ID } from '@/lib/rag/testing/golden-set-definitions';
import type { TestRunSummary } from '@/lib/rag/testing/golden-set-definitions';

export const maxDuration = 10;

export async function POST(request: NextRequest) {
    const { user, response: authResponse } = await requireAuth(request);
    if (authResponse) return authResponse;

    try {
        const body = await request.json();
        const summary: TestRunSummary = body.summary;
        const embeddingRunId: string | null = body.embeddingRunId || null;
        const notes: string | null = body.notes || null;

        if (!summary || !summary.runId) {
            return NextResponse.json(
                { success: false, error: 'Missing summary or runId' },
                { status: 400 }
            );
        }

        const supabase = createServerSupabaseAdminClient();

        const { data, error } = await supabase
            .from('rag_test_reports')
            .insert({
                user_id: user!.id,
                test_run_id: summary.runId,
                document_id: CANONICAL_DOCUMENT_ID,
                embedding_run_id: embeddingRunId,
                pass_rate: summary.passRate,
                meets_target: summary.meetsTarget,
                total_passed: summary.totalPassed,
                total_failed: summary.totalFailed,
                total_errored: summary.totalErrored,
                avg_response_time_ms: summary.avgResponseTimeMs,
                avg_self_eval_score: summary.avgSelfEvalScore,
                total_duration_ms: summary.totalDurationMs,
                breakdown: summary.breakdown,
                preflight: summary.preflight,
                results: summary.results,
                notes,
            })
            .select('id, created_at')
            .single();

        if (error) {
            console.error('[Test Reports] Error saving report:', error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: { reportId: data.id, savedAt: data.created_at },
        });
    } catch (err) {
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : 'Failed to save report' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    const { user, response: authResponse } = await requireAuth(request);
    if (authResponse) return authResponse;

    try {
        const supabase = createServerSupabaseAdminClient();

        // Return summary fields only (not the full results JSONB — that's big)
        const { data, error } = await supabase
            .from('rag_test_reports')
            .select(`
                id,
                test_run_id,
                document_id,
                embedding_run_id,
                pass_rate,
                meets_target,
                total_passed,
                total_failed,
                total_errored,
                avg_response_time_ms,
                avg_self_eval_score,
                total_duration_ms,
                notes,
                created_at
            `)
            .eq('document_id', CANONICAL_DOCUMENT_ID)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: data || [],
        });
    } catch (err) {
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : 'Failed to fetch reports' },
            { status: 500 }
        );
    }
}
```

---

## Task 4: Create Markdown Report Generation API

### [CREATE] `src/app/api/rag/test/golden-set/report/route.ts`

Create this file with the following content:

```typescript
/**
 * Golden-Set Test Report — Markdown Generator
 *
 * POST — Accepts TestRunSummary JSON, returns plain-text Markdown report
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import type { TestRunSummary, TestResult } from '@/lib/rag/testing/golden-set-definitions';

export const maxDuration = 10;

export async function POST(request: NextRequest) {
    const { user, response: authResponse } = await requireAuth(request);
    if (authResponse) return authResponse;

    try {
        const summary: TestRunSummary = await request.json();
        const markdown = generateMarkdownReport(summary);

        return new NextResponse(markdown, {
            status: 200,
            headers: {
                'Content-Type': 'text/markdown; charset=utf-8',
                'Content-Disposition': `attachment; filename="golden-set-report-${summary.runId.slice(0, 8)}.md"`,
            },
        });
    } catch (err) {
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : 'Report generation failed' },
            { status: 500 }
        );
    }
}

function generateMarkdownReport(summary: TestRunSummary): string {
    const lines: string[] = [];

    lines.push('# RAG Golden-Set Regression Test Report');
    lines.push('');
    lines.push(`**Run ID:** ${summary.runId}`);
    lines.push(`**Started:** ${summary.startedAt}`);
    lines.push(`**Completed:** ${summary.completedAt}`);
    lines.push(`**Duration:** ${Math.round(summary.totalDurationMs / 1000)}s`);
    lines.push(`**Result:** ${summary.meetsTarget ? 'PASS' : 'FAIL'} (target: >=85%)`);
    if (summary.embeddingRunId) {
        lines.push(`**Embedding Run:** ${summary.embeddingRunId}`);
    }
    lines.push('');

    lines.push('## Summary');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Pass Rate | ${summary.passRate}% |`);
    lines.push(`| Passed | ${summary.totalPassed} |`);
    lines.push(`| Failed | ${summary.totalFailed} |`);
    lines.push(`| Errored | ${summary.totalErrored} |`);
    lines.push(`| Avg Response Time | ${Math.round(summary.avgResponseTimeMs / 1000)}s |`);
    lines.push(`| Avg Self-Eval Score | ${Math.round(summary.avgSelfEvalScore * 100)}% |`);
    lines.push('');

    lines.push('## Difficulty Breakdown');
    lines.push('');
    lines.push('| Difficulty | Passed | Total | Rate |');
    lines.push('|------------|--------|-------|------|');
    for (const [level, data] of Object.entries(summary.breakdown)) {
        const rate = data.total > 0 ? Math.round((data.passed / data.total) * 100) : 0;
        lines.push(`| ${level} | ${data.passed} | ${data.total} | ${rate}% |`);
    }
    lines.push('');

    lines.push('## Preflight Checks');
    lines.push('');
    lines.push(`**Overall:** ${summary.preflight.passed ? 'PASSED' : 'FAILED'}`);
    lines.push('');
    for (const check of summary.preflight.checks) {
        const icon = check.passed ? '[PASS]' : check.severity === 'warning' ? '[WARN]' : '[FAIL]';
        lines.push(`- ${icon} **${check.name}** — ${check.detail}`);
    }
    lines.push('');

    lines.push('## Individual Results');
    lines.push('');

    const passed = summary.results.filter(r => r.passed);
    const failed = summary.results.filter(r => !r.passed && !r.error);
    const errored = summary.results.filter(r => r.error !== null);

    if (errored.length > 0) {
        lines.push(`### Errored (${errored.length})`);
        lines.push('');
        for (const r of errored) lines.push(...formatResult(r));
    }

    if (failed.length > 0) {
        lines.push(`### Failed (${failed.length})`);
        lines.push('');
        for (const r of failed) lines.push(...formatResult(r));
    }

    if (passed.length > 0) {
        lines.push(`### Passed (${passed.length})`);
        lines.push('');
        for (const r of passed) lines.push(...formatResult(r));
    }

    return lines.join('\n');
}

function formatResult(r: TestResult): string[] {
    const lines: string[] = [];
    const status = r.error ? 'ERROR' : r.passed ? 'PASS' : 'FAIL';

    lines.push(`#### ${r.item.id}: ${status} [${r.item.difficulty}]`);
    lines.push('');
    lines.push(`**Question:** ${r.item.question}`);
    lines.push(`**Expected substring:** \`${r.item.expectedAnswer}\``);
    lines.push(`**Self-eval:** ${r.selfEvalScore !== null ? `${Math.round(r.selfEvalScore * 100)}%` : 'N/A'}`);
    lines.push(`**Response time:** ${Math.round(r.responseTimeMs / 1000)}s`);
    lines.push(`**Category:** ${r.item.category}`);
    lines.push('');

    if (r.error) {
        lines.push(`**Error:** ${r.error}`);
        lines.push('');
    }

    if (r.responseText) {
        lines.push('**Response (first 500 chars):**');
        lines.push('');
        lines.push('```');
        lines.push(r.responseText);
        lines.push('```');
        lines.push('');
    }

    lines.push('**Diagnostics:**');
    lines.push(`- HyDE generated: ${r.diagnostics.hydeGenerated ? 'yes' : 'no'}`);
    lines.push(`- Sections retrieved: ${r.diagnostics.sectionsRetrieved}`);
    lines.push(`- Facts retrieved: ${r.diagnostics.factsRetrieved}`);
    if (r.diagnostics.errorPhase) lines.push(`- Error phase: ${r.diagnostics.errorPhase}`);
    if (r.diagnostics.errorStack) lines.push(`- Error stack: ${r.diagnostics.errorStack}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    return lines;
}
```

---

## Task 5: Update Golden-Set Test API Route

### [MODIFY] `src/app/api/rag/test/golden-set/route.ts`

#### 5a. Accept `runId` from POST body

**Current code (around line 41):**

```typescript
const body = await request.json();
const batch: number = body.batch ?? 0;
```

**Change to:**

```typescript
const body = await request.json();
const batch: number = body.batch ?? 0;
const runId: string | undefined = body.runId || undefined;
```

#### 5b. Pass `runId` to `runSingleTest`

**Current call (around line 70–71):**

```typescript
const result = await runSingleTest(item, user!.id, CANONICAL_DOCUMENT_ID);
```

**Change to:**

```typescript
const result = await runSingleTest(item, user!.id, CANONICAL_DOCUMENT_ID, runId);
```

---

## API Endpoint Summary

After E012, the following API endpoints are available:

| Method | Path | Purpose | Source |
|--------|------|---------|--------|
| POST | `/api/rag/test/golden-set` | Run test batch (accepts `runId`) | Modified |
| GET | `/api/rag/test/golden-set/runs` | List embedding runs | **New** |
| POST | `/api/rag/test/golden-set/reports` | Save test report | **New** |
| GET | `/api/rag/test/golden-set/reports` | List historical reports | **New** |
| POST | `/api/rag/test/golden-set/report` | Generate markdown report | **New** |

---

## Verification Checklist

After completing all 5 tasks, verify:

1. **TypeScript compilation passes:**
   ```bash
   cd "c:/Users/james/Master/BrightHub/BRun/v4-show/src" && npx tsc --noEmit
   ```

2. **Files modified (2):**
   - `src/lib/rag/testing/test-diagnostics.ts` — enhanced Check 2, `runSingleTest` has `runId`, new `getEmbeddingRuns` function
   - `src/app/api/rag/test/golden-set/route.ts` — accepts `runId` from body, passes to `runSingleTest`

3. **Files created (3):**
   - `src/app/api/rag/test/golden-set/runs/route.ts` — GET endpoint for embedding runs
   - `src/app/api/rag/test/golden-set/reports/route.ts` — POST/GET endpoint for reports
   - `src/app/api/rag/test/golden-set/report/route.ts` — POST endpoint for markdown generation

4. **Import verification:** All new files import from:
   - `@/lib/supabase-server` for `requireAuth` and `createServerSupabaseAdminClient`
   - `@/lib/rag/testing/golden-set-definitions` for `CANONICAL_DOCUMENT_ID` and types
   - `@/lib/rag/testing/test-diagnostics` for `getEmbeddingRuns` (runs endpoint only)

5. **Backward compatibility:**
   - Existing golden-set test API (`POST /api/rag/test/golden-set`) still works when `runId` is not provided
   - `runSingleTest` still works when called without `runId`

**After this prompt completes, proceed to E013 for UI changes and integration testing.**


+++++++++++++++++



---

## Files Changed Summary (E012)

| File | Action | Description |
|------|--------|-------------|
| `src/lib/rag/testing/test-diagnostics.ts` | Modify | Enhanced preflight Check 2, `runId` on `runSingleTest`, new `getEmbeddingRuns` |
| `src/app/api/rag/test/golden-set/route.ts` | Modify | Accept `runId`, pass to `runSingleTest` |
| `src/app/api/rag/test/golden-set/runs/route.ts` | **Create** | GET endpoint for embedding runs |
| `src/app/api/rag/test/golden-set/reports/route.ts` | **Create** | POST/GET endpoints for test reports |
| `src/app/api/rag/test/golden-set/report/route.ts` | **Create** | POST endpoint for markdown report generation |

---

## Success Criteria

- [ ] Preflight Check 2 shows creation time range, run counts, untagged count
- [ ] `runSingleTest` accepts optional `runId` and passes to `queryRAG`
- [ ] `getEmbeddingRuns` returns array of `EmbeddingRunInfo` from `rag_embedding_runs` table
- [ ] `GET /api/rag/test/golden-set/runs` returns runs + untaggedCount
- [ ] `POST /api/rag/test/golden-set/reports` saves report to `rag_test_reports`
- [ ] `GET /api/rag/test/golden-set/reports` lists historical reports (summary only, no full results JSONB)
- [ ] `POST /api/rag/test/golden-set/report` returns markdown text with Content-Disposition header
- [ ] `POST /api/rag/test/golden-set` accepts `runId` and passes through the pipeline
- [ ] TypeScript compiles without errors
