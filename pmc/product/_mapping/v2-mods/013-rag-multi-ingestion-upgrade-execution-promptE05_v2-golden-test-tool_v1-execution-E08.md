# E08: Golden-Set Test Tool — Embedding Selection, Markdown Export & Error Fixes

**Version:** 1.0  
**Date:** February 17, 2026  
**Status:** Ready for execution  
**Predecessor:** E07 (client-side batching fix)  
**Target Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src`

---

## Problem Statement

Three issues surfaced during the first live test run of the golden-set regression tool (E06+E07):

### Issue 1 — Embedding Run Selection

The test tool hardcodes a single `CANONICAL_DOCUMENT_ID` and passes it to `queryRAG()` which filters embeddings by `document_id` only. There is **no way to select which embedding run** to evaluate. If the document was re-embedded multiple times (e.g., old pipeline vs. new multi-pass pipeline), all embeddings — old and new — are searched indiscriminately. The test operator cannot isolate which ingestion run produced the results.

**Current code path:**
```
page.tsx → route.ts → queryRAG({ documentId }) → searchSimilarEmbeddings({ documentId })
                                                 → searchTextContent({ documentId })
                                                 → match_rag_embeddings_kb(filter_document_id)
```

None of these accept a `run_id`, `batch_id`, or timestamp filter.

### Issue 2 — No Copy-Paste / Export Capability

The test report renders in React components with no copy-text functionality (an app-wide limitation). The user needs to copy/paste test results, annotate them, and share them. There is currently no way to get a plain-text or downloadable version of the report.

### Issue 3 — Vercel Log Errors

Every single query in the test run produces **three recurring errors** in the Vercel logs:

| # | Error | Severity | Source |
|---|-------|----------|--------|
| A | `[RAG Embedding] Error in text search: invalid UNION/INTERSECT/EXCEPT ORDER BY clause` | ERROR | `search_rag_text` RPC (PostgreSQL) |
| B | `[parseJsonResponse] Direct parse failed: Unexpected token '`'` | INFO | `claude-llm-provider.ts` |
| C | `[RAG Retrieval] Reranking: Could not parse ranking, using original order` | WARNING | `rag-retrieval-service.ts` |

---

## Root Cause Analysis

### Error A — `search_rag_text` UNION ORDER BY Bug

**File:** `scripts/migrations/002-multi-doc-search.js` (line 91–131)

The `search_rag_text` PostgreSQL function uses:

```sql
  (SELECT ... FROM rag_facts ...)
  UNION ALL
  (SELECT ... FROM rag_sections ...)
  ORDER BY rank DESC
  LIMIT match_count;
```

PostgreSQL does not allow `ORDER BY alias` on a `UNION ALL` query. The `rank` alias is defined inside each sub-select and is not visible to the outer `ORDER BY`. The correct PostgreSQL syntax is `ORDER BY 5 DESC` (referencing the 5th column positionally) or wrapping the entire UNION in a subquery.

**Impact:** Every single RAG query's BM25 text search leg fails silently. The hybrid retrieval falls back to vector-only search, reducing result quality.

### Error B — `parseJsonResponse` Direct Parse Failure

**File:** `src/lib/rag/providers/claude-llm-provider.ts` (line 37)

Claude returns responses wrapped in `` ```json ... ``` `` markdown fences. The `parseJsonResponse` function tries `JSON.parse()` directly first (which fails on the backtick-fenced text), logs the failure, then falls back to brace/bracket boundary extraction (which succeeds). 

**Impact:** This is a **cosmetic log noise issue** — the fallback parser works correctly. The `console.log` at the `info` level creates misleading error messages in Vercel logs. The fix is to downgrade the log to `debug` level or suppress it entirely when the fallback succeeds.

### Error C — Reranking Parse Failure

**File:** `src/lib/rag/services/rag-retrieval-service.ts` (lines 306–318)

The reranking prompt asks Claude to return a JSON array of indices (e.g., `[3, 0, 5, 1]`). But because the `generateResponse` call also expects JSON and Claude wraps its response in `` ```json ... ``` ``, the response text arriving at the reranking regex has already been through `parseJsonResponse` which extracts the inner JSON. 

However, the actual issue is that `generateResponse` is called with a system prompt asking for a JSON array, but Claude Haiku sometimes returns explanatory text alongside the array, or wraps it in an object. The regex `/\[[\d,\s]+\]/` is too narrow — it fails on arrays with any extra whitespace patterns or when the response includes non-JSON text around the array.

**Impact:** Reranking silently falls back to original similarity order, reducing result quality.

---

## Proposed Changes

### Overview

| # | Change | File(s) | Type |
|---|--------|---------|------|
| 1 | Add embedding-run preflight info to show which embeddings are being tested | `test-diagnostics.ts`, `golden-set-definitions.ts` | Modify |
| 2 | Add markdown report generation API endpoint | `src/app/api/rag/test/golden-set/report/route.ts` | Create |
| 3 | Add markdown report download link to page UI | `page.tsx` | Modify |
| 4 | Fix `search_rag_text` UNION ORDER BY bug | `scripts/migrations/003-fix-text-search-order.js` | Create |
| 5 | Suppress misleading `parseJsonResponse` log noise | `claude-llm-provider.ts` | Modify |
| 6 | Improve reranking parse robustness | `rag-retrieval-service.ts` | Modify |

---

## Change 1: Embedding Run Visibility in Preflight

### Problem
The user cannot tell which embedding data is being evaluated. The `CANONICAL_DOCUMENT_ID` is hardcoded, but even for that document, there may be multiple embedding generations (old pipeline, new multi-pass pipeline, etc.).

### Decision: Show Embedding Metadata in Preflight (NOT Add a Run Selector)

Adding a full "embedding run selector" would require:
- A new `embedding_runs` table or tagging mechanism across all embeddings
- Changes to `queryRAG`, `searchSimilarEmbeddings`, and the RPC function
- Scope far beyond a test tool fix

Instead, we add **diagnostic visibility**: the preflight check already queries `rag_embeddings` for the document. We enhance it to show:
- Total embedding count by tier
- The `created_at` timestamp range (oldest → newest embedding)
- Whether embeddings appear to be from a single run or multiple runs (by checking if created_at timestamps span > 1 hour)

This tells the operator: "You are testing against embeddings created between X and Y. If that doesn't look right, re-embed first."

### [MODIFY] `src/lib/rag/testing/golden-set-definitions.ts`

Add a new field to `PreflightCheck` to carry structured metadata:

**No changes needed** — the existing `detail` string field in `PreflightCheck` is sufficient to carry the timestamp range info. We just need to change the detail text in `test-diagnostics.ts`.

### [MODIFY] `src/lib/rag/testing/test-diagnostics.ts`

**Location:** The "Check 2: Embeddings exist" block (currently lines 72–99)

**Current code:**
```typescript
const { data: embeddings, error } = await supabase
    .from('rag_embeddings')
    .select('id, tier')
    .eq('document_id', documentId);
```

**Change to:**
```typescript
const { data: embeddings, error } = await supabase
    .from('rag_embeddings')
    .select('id, tier, created_at')
    .eq('document_id', documentId)
    .order('created_at', { ascending: true });
```

Then update the detail string to include timestamp range:

```typescript
if (count > 0) {
    const tier1 = embeddings.filter((e: any) => e.tier === 1).length;
    const tier2 = embeddings.filter((e: any) => e.tier === 2).length;
    const tier3 = embeddings.filter((e: any) => e.tier === 3).length;

    // Determine embedding creation time range
    const oldest = embeddings[0]?.created_at;
    const newest = embeddings[embeddings.length - 1]?.created_at;
    const oldestDate = oldest ? new Date(oldest) : null;
    const newestDate = newest ? new Date(newest) : null;

    let timeRange = '';
    if (oldestDate && newestDate) {
        const spanMs = newestDate.getTime() - oldestDate.getTime();
        const spanHours = Math.round(spanMs / (1000 * 60 * 60));

        if (spanHours < 1) {
            timeRange = ` | single run ~${oldestDate.toISOString().slice(0, 16)}Z`;
        } else {
            timeRange = ` | span: ${oldestDate.toISOString().slice(0, 16)}Z → ${newestDate.toISOString().slice(0, 16)}Z (${spanHours}h — may include multiple runs)`;
        }
    }

    checks.push({
        name: 'Embeddings Exist',
        passed: count > 0,
        detail: `${count} embeddings (tier1: ${tier1}, tier2: ${tier2}, tier3: ${tier3})${timeRange}`,
        severity: count > 0 ? 'info' : 'critical',
    });
}
```

This gives the operator immediate visibility: `"147 embeddings (tier1: 12, tier2: 45, tier3: 90) | single run ~2026-02-17T08:30Z"` or `"... | span: 2026-01-15T... → 2026-02-17T... (792h — may include multiple runs)"`.

### Answering the User's Question

**Q: How does the test tool select which RAG run it should be evaluating?**

A: It doesn't select a "run" — it evaluates ALL embeddings for `CANONICAL_DOCUMENT_ID` (`ceff906e-...`). The `queryRAG()` function passes `documentId` to `searchSimilarEmbeddings()` which calls the `match_rag_embeddings_kb` RPC, filtering only by `document_id`. If old, low-quality embeddings exist alongside new ones, they are all searched.

**Q: Can we select which RAG embedding run we want to evaluate?**

A: Not without significant pipeline changes. The recommended approach for now is:
1. Before running the test, delete old embeddings for the document (via the RAG admin UI or a script)
2. Re-embed the document with the current pipeline
3. Run the test — now you are testing only the current embeddings
4. The enhanced preflight (this change) will confirm the embedding timestamps

A full "run selector" can be added later by tagging embeddings with a `batch_id` or `run_id` at ingestion time. That is deferred to a future spec.

---

## Change 2: Markdown Report Generation API

### [CREATE] `src/app/api/rag/test/golden-set/report/route.ts`

A new POST endpoint that accepts a `TestRunSummary` JSON payload and returns a plain Markdown text response. This is a pure formatting function — no database access.

```typescript
/**
 * Golden-Set Test Report — Markdown Generator
 *
 * POST — Accepts TestRunSummary JSON, returns plain-text Markdown report
 *
 * The client sends the full summary after the test completes.
 * The server generates a clean, copy-pasteable Markdown report.
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

    // Header
    lines.push('# RAG Golden-Set Regression Test Report');
    lines.push('');
    lines.push(`**Run ID:** ${summary.runId}`);
    lines.push(`**Started:** ${summary.startedAt}`);
    lines.push(`**Completed:** ${summary.completedAt}`);
    lines.push(`**Duration:** ${Math.round(summary.totalDurationMs / 1000)}s`);
    lines.push(`**Result:** ${summary.meetsTarget ? 'PASS' : 'FAIL'} (target: ≥85%)`);
    lines.push('');

    // Summary Table
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

    // Difficulty Breakdown
    lines.push('## Difficulty Breakdown');
    lines.push('');
    lines.push('| Difficulty | Passed | Total | Rate |');
    lines.push('|------------|--------|-------|------|');
    for (const [level, data] of Object.entries(summary.breakdown)) {
        const rate = data.total > 0 ? Math.round((data.passed / data.total) * 100) : 0;
        lines.push(`| ${level} | ${data.passed} | ${data.total} | ${rate}% |`);
    }
    lines.push('');

    // Preflight Checks
    lines.push('## Preflight Checks');
    lines.push('');
    lines.push(`**Overall:** ${summary.preflight.passed ? 'PASSED' : 'FAILED'}`);
    lines.push('');
    for (const check of summary.preflight.checks) {
        const icon = check.passed ? '[PASS]' : check.severity === 'warning' ? '[WARN]' : '[FAIL]';
        lines.push(`- ${icon} **${check.name}** — ${check.detail}`);
    }
    lines.push('');

    // Individual Results
    lines.push('## Individual Results');
    lines.push('');

    // Group by status
    const passed = summary.results.filter(r => r.passed);
    const failed = summary.results.filter(r => !r.passed && !r.error);
    const errored = summary.results.filter(r => r.error !== null);

    if (errored.length > 0) {
        lines.push(`### Errored (${errored.length})`);
        lines.push('');
        for (const r of errored) {
            lines.push(...formatResult(r));
        }
    }

    if (failed.length > 0) {
        lines.push(`### Failed (${failed.length})`);
        lines.push('');
        for (const r of failed) {
            lines.push(...formatResult(r));
        }
    }

    if (passed.length > 0) {
        lines.push(`### Passed (${passed.length})`);
        lines.push('');
        for (const r of passed) {
            lines.push(...formatResult(r));
        }
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

    // Diagnostics
    lines.push('**Diagnostics:**');
    lines.push(`- HyDE generated: ${r.diagnostics.hydeGenerated ? 'yes' : 'no'}`);
    lines.push(`- Sections retrieved: ${r.diagnostics.sectionsRetrieved}`);
    lines.push(`- Facts retrieved: ${r.diagnostics.factsRetrieved}`);
    if (r.diagnostics.errorPhase) {
        lines.push(`- Error phase: ${r.diagnostics.errorPhase}`);
    }
    if (r.diagnostics.errorStack) {
        lines.push(`- Error stack: ${r.diagnostics.errorStack}`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');

    return lines;
}
```

---

## Change 3: Markdown Report Link in Page UI

### [MODIFY] `src/app/(dashboard)/rag/test/page.tsx`

Add a "Download Report" button in the `SummaryCard` component that:
1. POSTs the current summary to `/api/rag/test/golden-set/report`
2. Triggers a browser download of the returned `.md` file

#### 3a. Add download function inside the page component

Inside `GoldenSetTestPage()`, after the `runTest` function definition, add:

```typescript
const downloadReport = async () => {
    if (!summary) return;

    try {
        const res = await fetch('/api/rag/test/golden-set/report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(summary),
        });

        if (!res.ok) {
            setError('Failed to generate report');
            return;
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `golden-set-report-${summary.runId.slice(0, 8)}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Report download failed');
    }
};
```

#### 3b. Add import for `Download` icon

At the top imports, add `Download` to the lucide-react import:

```typescript
import {
    Play,
    Loader2,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    ChevronDown,
    ChevronRight,
    ArrowLeft,
    Bug,
    Zap,
    Download,  // ← ADD
} from 'lucide-react';
```

#### 3c. Pass `downloadReport` to `SummaryCard`

Change the SummaryCard rendering:

```tsx
{summary && summary.results.length > 0 && (
    <SummaryCard summary={summary} onDownloadReport={downloadReport} />
)}
```

#### 3d. Update `SummaryCard` component signature and add button

```tsx
function SummaryCard({ summary, onDownloadReport }: { summary: TestRunSummary; onDownloadReport: () => void }) {
```

Add a Download Report button at the bottom of SummaryCard's `CardContent`, after the duration/runId text:

```tsx
<div className="flex items-center justify-between mt-3">
    <p className="text-xs text-muted-foreground">
        Duration: {Math.round(summary.totalDurationMs / 1000)}s | Run ID: {summary.runId.slice(0, 8)}...
    </p>
    <Button variant="outline" size="sm" onClick={onDownloadReport}>
        <Download className="h-3 w-3 mr-1" />
        Download Report (.md)
    </Button>
</div>
```

Replace the existing standalone `<p>` tag with this new `<div>` wrapper.

---

## Change 4: Fix `search_rag_text` UNION ORDER BY Bug

### Root Cause

The `search_rag_text` PostgreSQL function in `scripts/migrations/002-multi-doc-search.js` (line 128) uses `ORDER BY rank DESC` on a `UNION ALL` query. In PostgreSQL, `ORDER BY` on a `UNION ALL` can only use **column positions** (e.g., `ORDER BY 5 DESC`) or an **outer subquery wrapper**, not aliases defined inside sub-selects.

### [CREATE] `scripts/migrations/003-fix-text-search-order.js`

A migration script that replaces the `search_rag_text` function with the corrected `ORDER BY 5 DESC`.

**This migration MUST use SAOL** per project rules.

```javascript
/**
 * Migration 003: Fix search_rag_text ORDER BY clause
 *
 * Problem: ORDER BY rank DESC on a UNION ALL is invalid in PostgreSQL
 *          because 'rank' is an alias defined inside each sub-select.
 * Fix:     Change to ORDER BY 5 DESC (5th column = rank positionally).
 *
 * Uses SAOL (agentExecuteDDL) as required by project standards.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const saol = require('../supa-agent-ops');

const MIGRATION_SQL = `
  -- ================================================
  -- Fix: search_rag_text ORDER BY clause
  -- ================================================
  -- PostgreSQL does not allow ORDER BY <alias> on a UNION ALL.
  -- Change ORDER BY rank DESC → ORDER BY 5 DESC (5th column is rank).

  CREATE OR REPLACE FUNCTION search_rag_text(
    search_query text,
    filter_knowledge_base_id uuid DEFAULT NULL,
    filter_document_id uuid DEFAULT NULL,
    match_count int DEFAULT 10
  )
  RETURNS TABLE (
    source_type text,
    source_id uuid,
    document_id uuid,
    content text,
    rank float
  )
  LANGUAGE plpgsql
  AS $$
  BEGIN
    RETURN QUERY
    (
      SELECT 'fact'::text, f.id, f.document_id, f.content,
             ts_rank(f.content_tsv, plainto_tsquery('english', search_query))::float
      FROM rag_facts f
      WHERE f.content_tsv @@ plainto_tsquery('english', search_query)
        AND (filter_document_id IS NULL OR f.document_id = filter_document_id)
        AND (filter_knowledge_base_id IS NULL OR f.document_id IN (
          SELECT d.id FROM rag_documents d WHERE d.knowledge_base_id = filter_knowledge_base_id
        ))
    )
    UNION ALL
    (
      SELECT 'section'::text, s.id, s.document_id, s.title || ': ' || left(s.original_text, 500),
             ts_rank(s.text_tsv, plainto_tsquery('english', search_query))::float
      FROM rag_sections s
      WHERE s.text_tsv @@ plainto_tsquery('english', search_query)
        AND (filter_document_id IS NULL OR s.document_id = filter_document_id)
        AND (filter_knowledge_base_id IS NULL OR s.document_id IN (
          SELECT d.id FROM rag_documents d WHERE d.knowledge_base_id = filter_knowledge_base_id
        ))
    )
    ORDER BY 5 DESC
    LIMIT match_count;
  END;
  $$;
`;

(async () => {
    console.log('Migration 003: Fix search_rag_text ORDER BY clause');
    console.log('===================================================');

    // Dry run first
    const dryRun = await saol.agentExecuteDDL({
        sql: MIGRATION_SQL,
        dryRun: true,
        transaction: true,
        transport: 'pg'
    });

    console.log('Dry-run:', dryRun.success ? '✓ PASS' : '✗ FAIL');
    if (!dryRun.success) {
        console.error('Dry-run failed:', dryRun.summary);
        process.exit(1);
    }

    // Execute
    const result = await saol.agentExecuteDDL({
        sql: MIGRATION_SQL,
        transaction: true,
        transport: 'pg'
    });

    console.log('Execute:', result.success ? '✓ PASS' : '✗ FAIL');
    console.log('Summary:', result.summary);

    if (!result.success) {
        console.error('Migration failed:', result.error || result.summary);
        process.exit(1);
    }

    console.log('\n✓ search_rag_text ORDER BY clause fixed successfully');
})();
```

### Execution

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && node scripts/migrations/003-fix-text-search-order.js
```

---

## Change 5: Suppress Misleading `parseJsonResponse` Log Noise

### [MODIFY] `src/lib/rag/providers/claude-llm-provider.ts`

**Location:** The first `catch` block in `parseJsonResponse` (approximately line 47)

**Current code (approx lines 44–49):**
```typescript
try {
    return JSON.parse(cleaned) as T;
} catch (firstError) {
    // Log the first attempt failure for debugging
    console.log(`[parseJsonResponse] Direct parse failed (${context || 'unknown context'}):`,
      firstError instanceof Error ? firstError.message : String(firstError));
}
```

**Change to:**
```typescript
try {
    return JSON.parse(cleaned) as T;
} catch {
    // Direct parse failed — expected when Claude wraps JSON in ```json fences.
    // Fallback to brace/bracket boundary extraction below.
    // No logging here to avoid noise; failure is logged if the fallback also fails.
}
```

**Rationale:** This is a `console.log` (not even `console.error`), but Vercel logs it at `info` level which makes it look like an error in the Vercel dashboard. Since the fallback parser handles the markdown fence case correctly ~100% of the time, logging the initial failure is pure noise. The comprehensive error logging in the second `catch` block (line 85+) already handles the case where BOTH parse attempts fail.

---

## Change 6: Improve Reranking Parse Robustness

### [MODIFY] `src/lib/rag/services/rag-retrieval-service.ts`

**Location:** `rerankWithClaude` function (approximately lines 289–340)

Two sub-changes:

#### 6a. More robust JSON array extraction

**Current code (approx line 315):**
```typescript
const responseText = response.responseText || '';
const jsonMatch = responseText.match(/\[[\d,\s]+\]/);
if (!jsonMatch) {
    console.warn('[RAG Retrieval] Reranking: Could not parse ranking, using original order');
    return params.candidates.slice(0, params.topK).map(c => ({ id: c.id, relevanceScore: c.similarity }));
}
const rankedIndices: number[] = JSON.parse(jsonMatch[0]);
```

**Change to:**
```typescript
const responseText = response.responseText || '';

// Try multiple extraction strategies for the ranked indices array
let rankedIndices: number[] | null = null;

// Strategy 1: Direct regex match for integer array (handles [3, 0, 5, 1])
const jsonMatch = responseText.match(/\[[\d,\s\n]+\]/);
if (jsonMatch) {
    try {
        rankedIndices = JSON.parse(jsonMatch[0]);
    } catch { /* try next strategy */ }
}

// Strategy 2: Extract JSON from markdown fences (handles ```json [3, 0, 5] ```)
if (!rankedIndices) {
    const fenceMatch = responseText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
    if (fenceMatch) {
        try {
            rankedIndices = JSON.parse(fenceMatch[1]);
        } catch { /* try next strategy */ }
    }
}

// Strategy 3: Find any JSON array in the response
if (!rankedIndices) {
    const bracketStart = responseText.indexOf('[');
    const bracketEnd = responseText.lastIndexOf(']');
    if (bracketStart >= 0 && bracketEnd > bracketStart) {
        try {
            rankedIndices = JSON.parse(responseText.substring(bracketStart, bracketEnd + 1));
        } catch { /* give up */ }
    }
}

if (!rankedIndices || !Array.isArray(rankedIndices)) {
    console.warn('[RAG Retrieval] Reranking: Could not parse ranking, using original order');
    return params.candidates.slice(0, params.topK).map(c => ({ id: c.id, relevanceScore: c.similarity }));
}
```

#### 6b. Validate parsed indices

After the extraction, add validation to filter out any non-integer values:

```typescript
// Filter to valid integer indices only
rankedIndices = rankedIndices
    .filter(idx => Number.isInteger(idx) && idx >= 0 && idx < params.candidates.length);

if (rankedIndices.length === 0) {
    console.warn('[RAG Retrieval] Reranking: Parsed indices were all invalid, using original order');
    return params.candidates.slice(0, params.topK).map(c => ({ id: c.id, relevanceScore: c.similarity }));
}
```

---

## Files Changed Summary

| # | File | Action | Lines (est.) |
|---|------|--------|-------------|
| 1 | `src/lib/rag/testing/test-diagnostics.ts` | Modify | ~20 (enhanced embedding preflight detail) |
| 2 | `src/app/api/rag/test/golden-set/report/route.ts` | **Create** | ~180 (markdown report endpoint) |
| 3 | `src/app/(dashboard)/rag/test/page.tsx` | Modify | ~25 (download button + function) |
| 4 | `scripts/migrations/003-fix-text-search-order.js` | **Create** | ~80 (SAOL migration script) |
| 5 | `src/lib/rag/providers/claude-llm-provider.ts` | Modify | ~5 (suppress log noise) |
| 6 | `src/lib/rag/services/rag-retrieval-service.ts` | Modify | ~30 (robust reranking parse) |

**New files:** 2  
**Modified files:** 4  
**No new npm dependencies. No new database tables.**

---

## Constraints

- **DO NOT change `golden-set-definitions.ts` types** — the interfaces are stable and shared by multiple files
- **DO NOT change `queryRAG` parameters** — that is production code; embedding run selection is deferred
- **DO NOT create new database tables** — the migration only replaces an existing RPC function
- **ALL database operations in migration scripts MUST use SAOL** (the `agentExecuteDDL` pattern from `supa-agent-ops`)
- **Application code uses `createServerSupabaseAdminClient()`** — SAOL is a CLI-only tool, NOT used in deployed application code
- **DO NOT add npm dependencies**

---

## Execution Order

1. **Change 5** first — suppress log noise (smallest, safest change)
2. **Change 6** — improve reranking parse (small, contained change to `rag-retrieval-service.ts`)
3. **Change 4** — run migration to fix `search_rag_text` (database change, run script manually)
4. **Change 1** — enhance preflight embedding metadata (small change to `test-diagnostics.ts`)
5. **Change 2** — create markdown report API endpoint (new file, no dependencies on other changes)
6. **Change 3** — add download button to page UI (depends on Change 2 endpoint existing)

---

## Verification Plan

### TypeScript Compilation
```bash
cd src && npx tsc --noEmit
```

### Migration Verification
After running `003-fix-text-search-order.js`:
```bash
# Verify no more text search errors by checking the function exists
cd supa-agent-ops && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
    const r = await saol.agentQuery({
        table: 'rag_facts',
        select: 'id',
        limit: 1
    });
    console.log('DB connection:', r.success ? 'OK' : 'FAIL');
})();
"
```

### Vercel Log Verification (Post-Deploy)
After deploying with changes 4, 5, 6:
- Run the golden-set test via `/rag/test`
- Check Vercel logs — should see:
  - **NO** more `[RAG Embedding] Error in text search: invalid UNION/INTERSECT/EXCEPT ORDER BY clause`
  - **NO** more `[parseJsonResponse] Direct parse failed` at INFO level
  - **Significantly fewer** `[RAG Retrieval] Reranking: Could not parse ranking` warnings
  - Better self-eval scores (text search now contributing to hybrid retrieval)

### Markdown Report Test
1. Run the golden-set test via `/rag/test`
2. After results appear, click "Download Report (.md)"
3. Verify the downloaded file opens as clean Markdown
4. Verify it contains: summary table, difficulty breakdown, preflight checks, all 20 individual results
5. Verify copy-paste from the .md file works normally

### Preflight Enhancement Test
1. Run the test and check the "Embeddings Exist" preflight line
2. Should now show timestamp range: `"147 embeddings (tier1: 12, tier2: 45, tier3: 90) | single run ~2026-02-17T08:30Z"`
3. If multiple runs exist, should show span with warning

---

## Future Considerations (NOT in this spec)

- **Embedding Run Selector:** Tag embeddings with `run_id` at ingestion time, add a dropdown to the test UI to select which run to evaluate. Requires schema change + `queryRAG` parameter additions.
- **Historical Report Storage:** Save test reports to the database for trend analysis across multiple test runs.

