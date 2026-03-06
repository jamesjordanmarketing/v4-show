# E013: Test Page UI Overhaul + Integration Testing

**Version:** 1.0  
**Date:** February 17, 2026  
**Section:** E013 — UI Overhaul + Integration Testing (4 of 4)  
**Prerequisites:** E010 (migration, types, error fixes), E011 (service layer runId), E012 (test diagnostics + API endpoints) must all be complete  
**Builds Upon:** E012 created all API endpoints: `/runs` (GET), `/reports` (POST/GET), `/report` (POST), updated `/golden-set` (POST with runId)  
**Final Prompt:** This is the last prompt in the E09 implementation sequence

---

## Overview

This prompt implements the final piece — the test page UI changes and performs full integration verification:

1. **Change 11** — Update test page UI with:
   - Embedding Run Selector dropdown
   - Download Report button (markdown)
   - Save Report button (to database)
   - History Panel (list past saved reports)
   - Updated `SummaryCard` component with action buttons

2. **Integration Testing** — Comprehensive verification plan

**What This Prompt Modifies:**
- `src/app/(dashboard)/rag/test/page.tsx` (~120 lines of changes across imports, state, functions, JSX)

**What This Prompt Does NOT Create:**
- No new files — all API endpoints and service changes are already done

---

## Prompt 4 of 4: Test Page UI Overhaul + Integration Testing

========================


## Context & Instructions

You are implementing Part 4 of 4 (final) of the E09 Golden-Set Test Tool specification. This prompt updates the test page UI to consume the API endpoints created in E012.

**Target Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src`

### Prerequisites (E010 + E011 + E012 Completed)

All backend work is complete. The following API endpoints are available:

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/rag/test/golden-set` | Run test batch — now accepts `{ batch, runId }` |
| GET | `/api/rag/test/golden-set/runs` | Returns `{ success, data: { runs: EmbeddingRunInfo[], untaggedCount, documentId } }` |
| POST | `/api/rag/test/golden-set/reports` | Saves report — body: `{ summary: TestRunSummary, embeddingRunId?, notes? }` — returns `{ success, data: { reportId, savedAt } }` |
| GET | `/api/rag/test/golden-set/reports` | Returns `{ success, data: HistoricalReport[] }` (summary fields only, no full results JSONB) |
| POST | `/api/rag/test/golden-set/report` | Returns markdown file (Content-Type: text/markdown, Content-Disposition: attachment) |

**EmbeddingRunInfo shape:**
```typescript
{
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
```

**HistoricalReport shape (from GET /reports):**
```typescript
{
    id: string;
    test_run_id: string;
    document_id: string;
    embedding_run_id: string | null;
    pass_rate: number;
    meets_target: boolean;
    total_passed: number;
    total_failed: number;
    total_errored: number;
    avg_response_time_ms: number;
    avg_self_eval_score: number;
    total_duration_ms: number;
    notes: string | null;
    created_at: string;
}
```

### Critical Rules

1. **DO NOT add npm dependencies.**
2. **Follow existing UI patterns** — the page uses Shadcn/UI components (`Button`, `Card`, `CardHeader`, `CardTitle`, `CardContent`, `Badge`, `Progress`) and Lucide icons.
3. **The page is a Client Component** (`'use client'` directive on line 1).
4. **DO NOT modify the `computeSummary` function** (lines 30–74) — it is correct.
5. **DO NOT modify the `PreflightPanel` component** — it works correctly with the enhanced preflight data from E012.

### Key File (Read This First)

Read the entire file before making changes:
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\rag\test\page.tsx` (519 lines)

**Current structure of page.tsx:**
- Line 1: `'use client'`
- Lines 1–26: Imports (React, UI components, Lucide icons, router, types)
- Lines 30–74: `computeSummary` helper function
- Lines 76–164: `GoldenSetTestPage` component (state, `runTest` function)
- Lines 170–335: Main JSX (header, running indicator, error display, preflight panel, summary card, tabs, results)
- Lines 340–370: `PreflightPanel` sub-component
- Lines 372–413: `SummaryCard` sub-component
- Lines 415–420: `StatBlock` sub-component
- Lines 423–430: `DifficultyBlock` sub-component
- Line 519: End of file

---

## Task 1: Update Imports

### [MODIFY] `src/app/(dashboard)/rag/test/page.tsx`

#### 1a. Add `useEffect` to React import

**Current (line 2):**
```typescript
import { useState } from 'react';
```

**Change to:**
```typescript
import { useState, useEffect } from 'react';
```

#### 1b. Add new Lucide icons

**Current icons import (lines 8–18 approximately):**
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
} from 'lucide-react';
```

**Change to:**
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
    Download,
    Save,
    History,
} from 'lucide-react';
```

---

## Task 2: Add State Variables

#### Inside the `GoldenSetTestPage` component, after the existing state declarations (lines 80–85), add:

```typescript
const [selectedRunId, setSelectedRunId] = useState<string | undefined>(undefined);
const [embeddingRuns, setEmbeddingRuns] = useState<any[]>([]);
const [untaggedCount, setUntaggedCount] = useState<number>(0);
const [historicalReports, setHistoricalReports] = useState<any[]>([]);
const [showHistory, setShowHistory] = useState(false);
const [isSaving, setIsSaving] = useState(false);
const [saveMessage, setSaveMessage] = useState<string | null>(null);
```

---

## Task 3: Add useEffect to Fetch Data on Mount

#### After the state declarations and before the `runTest` function, add:

```typescript
// Fetch embedding runs and historical reports on mount
useEffect(() => {
    fetch('/api/rag/test/golden-set/runs')
        .then(res => res.json())
        .then(json => {
            if (json.success) {
                setEmbeddingRuns(json.data.runs || []);
                setUntaggedCount(json.data.untaggedCount || 0);
            }
        })
        .catch(() => {});

    fetch('/api/rag/test/golden-set/reports')
        .then(res => res.json())
        .then(json => {
            if (json.success) {
                setHistoricalReports(json.data || []);
            }
        })
        .catch(() => {});
}, []);
```

---

## Task 4: Update `runTest` to Pass `runId`

#### Inside the `runTest` function, find the fetch call that posts to `/api/rag/test/golden-set`:

**Current:**
```typescript
const res = await fetch('/api/rag/test/golden-set', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ batch }),
});
```

**Change to:**
```typescript
const res = await fetch('/api/rag/test/golden-set', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ batch, runId: selectedRunId }),
});
```

---

## Task 5: Add `downloadReport` and `saveReport` Functions

#### After the `runTest` function, add these two new functions:

```typescript
const downloadReport = async () => {
    if (!summary) return;
    try {
        const res = await fetch('/api/rag/test/golden-set/report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(summary),
        });
        if (!res.ok) { setError('Failed to generate report'); return; }
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

const saveReport = async () => {
    if (!summary) return;
    setIsSaving(true);
    setSaveMessage(null);
    try {
        const res = await fetch('/api/rag/test/golden-set/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                summary,
                embeddingRunId: selectedRunId || null,
            }),
        });
        const json = await res.json();
        if (json.success) {
            setSaveMessage('Report saved successfully');
            // Refresh history
            const histRes = await fetch('/api/rag/test/golden-set/reports');
            const histJson = await histRes.json();
            if (histJson.success) setHistoricalReports(histJson.data || []);
        } else {
            setSaveMessage(`Failed to save: ${json.error}`);
        }
    } catch (err) {
        setSaveMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
        setIsSaving(false);
    }
};
```

---

## Task 6: Add Embedding Run Selector to Header

#### In the header section of the JSX, find the area that contains the "Back to RAG Frontier" button and the "Run Golden-Set Test" button. Between them, insert the embedding run selector dropdown:

```tsx
{/* Embedding Run Selector */}
<select
    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
    value={selectedRunId || ''}
    onChange={(e) => setSelectedRunId(e.target.value || undefined)}
    disabled={isRunning}
>
    <option value="">All embeddings (no filter)</option>
    {embeddingRuns.map((run: any) => (
        <option key={run.id} value={run.id}>
            {new Date(run.startedAt).toLocaleDateString()} {new Date(run.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {run.embeddingCount} embeddings ({run.pipelineVersion})
        </option>
    ))}
    {untaggedCount > 0 && (
        <option value="__untagged__" disabled>
            {untaggedCount} untagged (legacy) — cannot filter
        </option>
    )}
</select>
```

**Placement:** Insert this as a new element in the header flex row, between the "Back to RAG" button and the "Run Test" button. The exact location is inside the `<div className="flex items-center gap-3">` or similar flex container in the header.

---

## Task 7: Add History Toggle and Panel

#### After the preflight panel section and before the summary card, add the history toggle button and collapsible history panel:

```tsx
{/* History Toggle */}
<div className="flex justify-end">
    <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowHistory(!showHistory)}
    >
        <History className="h-4 w-4 mr-1" />
        History ({historicalReports.length})
    </Button>
</div>

{/* History Panel */}
{showHistory && historicalReports.length > 0 && (
    <Card>
        <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" />
                Test History
            </CardTitle>
        </CardHeader>
        <CardContent>
            <div className="space-y-2">
                {historicalReports.map((report: any) => (
                    <div
                        key={report.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm"
                    >
                        <div className="flex items-center gap-3">
                            {report.meets_target ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <div>
                                <div className="font-medium">
                                    {new Date(report.created_at).toLocaleDateString()}{' '}
                                    {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {report.total_passed}/{report.total_passed + report.total_failed} passed
                                    {report.notes && ` — ${report.notes}`}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge variant={report.meets_target ? 'default' : 'destructive'}>
                                {report.pass_rate}%
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                                {Math.round(report.total_duration_ms / 1000)}s
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </CardContent>
    </Card>
)}
```

---

## Task 8: Update `SummaryCard` Component

#### 8a. Update `SummaryCard` signature

**Current (around line 372):**

```typescript
function SummaryCard({ summary }: { summary: TestRunSummary }) {
```

**Change to:**

```typescript
function SummaryCard({ summary, onDownloadReport, onSaveReport, isSaving, saveMessage }: {
    summary: TestRunSummary;
    onDownloadReport: () => void;
    onSaveReport: () => void;
    isSaving: boolean;
    saveMessage: string | null;
}) {
```

#### 8b. Add download and save buttons to `SummaryCard`

Find the duration/runId display area in `SummaryCard` (around line 404, looks like a `<p>` tag with "Duration:" and "Run ID:"). Replace that `<p>` tag with:

```tsx
<div className="flex items-center justify-between mt-3">
    <p className="text-xs text-muted-foreground">
        Duration: {Math.round(summary.totalDurationMs / 1000)}s | Run ID: {summary.runId.slice(0, 8)}...
    </p>
    <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onDownloadReport}>
            <Download className="h-3 w-3 mr-1" />
            Download .md
        </Button>
        <Button variant="outline" size="sm" onClick={onSaveReport} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
            Save Report
        </Button>
    </div>
</div>
{saveMessage && (
    <p className={`text-xs mt-1 ${saveMessage.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
        {saveMessage}
    </p>
)}
```

#### 8c. Update `SummaryCard` rendering call

Find where `SummaryCard` is rendered in the main JSX:

**Current:**
```tsx
{summary && summary.results.length > 0 && (
    <SummaryCard summary={summary} />
)}
```

**Change to:**
```tsx
{summary && summary.results.length > 0 && (
    <SummaryCard
        summary={summary}
        onDownloadReport={downloadReport}
        onSaveReport={saveReport}
        isSaving={isSaving}
        saveMessage={saveMessage}
    />
)}
```

---

## Integration Testing Plan

After completing all UI changes, verify the full E09 implementation:

### 1. TypeScript Compilation

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/src" && npx tsc --noEmit
```

### 2. Vercel Deploy

Push to main branch. Verify auto-deployment succeeds:
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && git add -A && git commit -m "E09: Golden-set test tool — embedding run selector, historical reports, markdown export, error fixes" && git push
```

### 3. Embedding Run Selector Test

1. Visit `/rag/test` in the browser
2. The embedding run selector dropdown should appear in the header
3. If any document has been processed since E011, the run should appear with: date, time, embedding count, pipeline version
4. Legacy untagged embeddings should show as a disabled option
5. Select a run (or "All embeddings") and run the test
6. Verify queries use the selected run's embeddings (check Vercel logs for `filter_run_id`)

### 4. Report Download Test

1. Run the golden-set test
2. Click "Download .md" button in the SummaryCard
3. Verify the browser downloads a `.md` file
4. Open the file and verify: summary table, difficulty breakdown, preflight checks, 20 individual results

### 5. Report Save Test

1. Run the golden-set test
2. Click "Save Report" button
3. Verify "Report saved successfully" message appears (green text)
4. Click "History" toggle button
5. Verify the saved report appears with: date/time, pass/fail icon, pass rate badge, duration

### 6. History Panel Test

1. Save multiple reports (run test multiple times if needed)
2. Click "History" toggle
3. Verify reports are listed in reverse chronological order (newest first)
4. Verify each entry shows: CheckCircle2/XCircle icon, date, pass count, Badge with pass_rate%, duration

### 7. Backward Compatibility Test

1. Navigate to `/rag` (RAG Frontier main page)
2. Use the RAG chat to ask a question against an existing knowledge base
3. Verify the chat works normally (no `runId` filter applied — searches all embeddings)
4. Verify Vercel logs:
   - NO `[parseJsonResponse] Direct parse failed` at INFO level
   - NO `invalid UNION/INTERSECT/EXCEPT ORDER BY clause` errors from `search_rag_text`
   - Fewer `[RAG Retrieval] Reranking: Could not parse ranking` warnings

### 8. Migration Verification (if not already done in E010)

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
    const runs = await saol.agentIntrospectSchema({table:'rag_embedding_runs',includeColumns:true,transport:'pg'});
    console.log('rag_embedding_runs:', runs.tables?.[0]?.columns?.length, 'columns');

    const embed = await saol.agentIntrospectSchema({table:'rag_embeddings',includeColumns:true,transport:'pg'});
    const embedCols = embed.tables?.[0]?.columns?.map(c=>c.name) || [];
    console.log('rag_embeddings.run_id:', embedCols.includes('run_id') ? 'YES' : 'NO');

    const reports = await saol.agentIntrospectSchema({table:'rag_test_reports',includeColumns:true,transport:'pg'});
    console.log('rag_test_reports:', reports.tables?.[0]?.columns?.length, 'columns');
})();
"
```

---

## Complete E09 File Change Summary (All 4 Prompts)

### Files Modified (8)

| File | Prompt | Changes |
|------|--------|---------|
| `src/lib/rag/providers/claude-llm-provider.ts` | E010 | Suppress parseJsonResponse log noise |
| `src/lib/rag/services/rag-retrieval-service.ts` | E010+E011 | Reranking robustness + runId in retrieveContext/queryRAG |
| `src/lib/rag/services/rag-embedding-service.ts` | E011 | runId in 3 function signatures + RPC call |
| `src/lib/rag/services/rag-ingestion-service.ts` | E011 | Embedding run lifecycle (create → pass → update) |
| `src/lib/rag/testing/golden-set-definitions.ts` | E010 | embeddingRunId? on TestRunSummary |
| `src/lib/rag/testing/test-diagnostics.ts` | E012 | Enhanced preflight + runSingleTest runId + getEmbeddingRuns |
| `src/app/api/rag/test/golden-set/route.ts` | E012 | Accept runId from body |
| `src/app/(dashboard)/rag/test/page.tsx` | E013 | Run selector, download, save, history panel |

### Files Created (4)

| File | Prompt | Purpose |
|------|--------|---------|
| `scripts/migrations/004-embedding-runs-and-reports.js` | E010 | DB migration |
| `src/app/api/rag/test/golden-set/runs/route.ts` | E012 | Embedding runs GET endpoint |
| `src/app/api/rag/test/golden-set/reports/route.ts` | E012 | Reports POST/GET endpoints |
| `src/app/api/rag/test/golden-set/report/route.ts` | E012 | Markdown report POST endpoint |

### Database Changes (E010 Migration)

| Object | Type | Change |
|--------|------|--------|
| `rag_embedding_runs` | Table | NEW — 11 columns |
| `rag_test_reports` | Table | NEW — 17 columns |
| `rag_embeddings.run_id` | Column | NEW — UUID, nullable |
| `match_rag_embeddings_kb` | Function | MODIFIED — new `filter_run_id` param |
| `search_rag_text` | Function | FIXED — ORDER BY 5 DESC |

### No New npm Dependencies

---

## E09 Implementation Complete

After all 4 prompts (E010 → E011 → E012 → E013) are executed:

- ✅ Error fixes: parseJsonResponse log noise suppressed, reranking parse robustness improved
- ✅ Database: 2 new tables, 1 new column, 2 updated PostgreSQL functions
- ✅ Service layer: runId threaded through embedding generation, ingestion, and retrieval
- ✅ API endpoints: 4 new routes (runs, reports, report, updated golden-set)
- ✅ UI: Embedding run selector, download report, save report, history panel
- ✅ Backward compatibility: All existing functionality unchanged
- ✅ TypeScript compilation: Clean


+++++++++++++++++



---

## Success Criteria (E013)

- [ ] `useEffect` fetches embedding runs and historical reports on mount
- [ ] Embedding Run Selector dropdown appears in header
- [ ] Selected runId is passed to test execution via `POST /api/rag/test/golden-set`
- [ ] "Download .md" button triggers markdown file download
- [ ] "Save Report" button saves to database, shows success message
- [ ] History toggle shows/hides history panel
- [ ] History panel lists past reports with pass/fail icons, pass rate badges, durations
- [ ] `SummaryCard` accepts new props (onDownloadReport, onSaveReport, isSaving, saveMessage)
- [ ] TypeScript compiles without errors
- [ ] Vercel deployment succeeds

## Success Criteria (Full E09)

- [ ] All 12 changes from E09 spec implemented
- [ ] 0 new npm dependencies
- [ ] All new parameters are optional (backward compatible)
- [ ] Migration 004 verified (2 tables, 1 column, 2 functions)
- [ ] TypeScript compiles without errors
- [ ] Vercel deployment succeeds
- [ ] RAG chat works normally without runId filter
- [ ] Golden-set test works with and without run selection
