# Specification 016: RAG Pipeline Bug Fixes + Golden-Set Test Tool Adjustments

**Version:** 1.0  
**Date:** 2026-02-18  
**Status:** Ready for Implementation  
**Prerequisite Specs:** E010, E011, E012, E013 (all complete)

---

## 1. Summary

This specification implements three RAG pipeline data-quality bug fixes identified in `015-rag-multi-ingestion-golden-doublecheck_v5.md`, and two test tool usability improvements to the Golden-Set regression test page (`/rag/test`). The pipeline fixes address silent fact loss in Pass 6 (invalid `fact_type` values) and wasted API calls in Pass 3 (empty table content). The test tool changes remove the hard-coded `CANONICAL_DOCUMENT_ID` constraint from the embedding run selector (so runs from any document upload of the same corpus are selectable) and add markdown download capability to the historical reports panel.

---

## 2. Impact Analysis

### Files Modified (7 total)

| # | File | Change Group |
|---|------|-------------|
| 1 | `src/lib/rag/providers/claude-llm-provider.ts` | Bug Fix A1 |
| 2 | `src/lib/rag/services/rag-ingestion-service.ts` | Bug Fix A2 |
| 3 | `src/inngest/functions/process-rag-document.ts` | Bug Fix B |
| 4 | `src/lib/rag/testing/test-diagnostics.ts` | Test Tool: all-runs selector |
| 5 | `src/app/api/rag/test/golden-set/runs/route.ts` | Test Tool: all-runs selector |
| 6 | `src/app/api/rag/test/golden-set/route.ts` | Test Tool: document routing |
| 7 | `src/app/(dashboard)/rag/test/page.tsx` | Test Tool: selector + history download |

### Files Created

None.

### Dependencies Touched

- `RAGFactType` (from `src/types/rag.ts`) — read, not modified; used to derive the `ALLOWED_RAG_FACT_TYPES` set
- `EmbeddingRunInfo` interface (in `test-diagnostics.ts`) — gains an optional `documentName` field

### Database Tables Read / Written

| Table | Operation | Change |
|-------|-----------|--------|
| `rag_facts` | INSERT | Now validates `fact_type` before insert (Fix A2) |
| `rag_embedding_runs` | SELECT | Now returns all documents, not just canonical (Change 4) |
| `rag_documents` | SELECT | New join in `getEmbeddingRuns` to fetch `file_name` for display |

### Risk Areas

- **Fix A2 normalization** touches `storeExtractedFacts`, which is called by every extraction pass (Pass 2, 3, 4, 5, 6). Risk: minimal — it only changes the value of `fact_type` if the value is NOT in the allowed set. Valid existing values are untouched.
- **Removing CANONICAL_DOCUMENT_ID from the `/runs` route** means the selector will now show all runs across all documents. Risk: if a user selects a run from a completely different, unrelated document corpus, the test will run against that document's embeddings. This is intentional per the user's request but should be clearly communicated in the dropdown label.
- **golden-set route accepting `documentId` from body** — if `documentId` is omitted, it falls back to `CANONICAL_DOCUMENT_ID`, so existing behavior is preserved.

---

## 3. Changes

---

### Change 1 — Fix A1: Constrain `factType` in Pass 6 Verification Prompt

**File:** `src/lib/rag/providers/claude-llm-provider.ts`  
**Location:** `verifyExtractionCompleteness()` method, `userPrompt` string, RULES section (lines 901–906 in current file)

**Why:** Claude's Pass 6 (Opus verification) generates `fact_type` values such as `scope`, `reference`, `date_value`, `numeric_value`, `condition`, `frequency`, `process_detail` — none of which are in the `rag_facts_fact_type_check` DB constraint. This causes ~13 facts per run to be silently dropped on insert. Adding an explicit enumeration to the prompt forces Claude to choose from the valid set.

**Current RULES block (lines 901–906):**
```
RULES:
1. Only include genuinely new facts not already in the extracted list
2. Set factCategory to "verification_recovery" for all facts found by this pass
3. coverageEstimate: your estimate of what % of the section's factual content is now captured (0.0-1.0)
4. If nothing is missing, return empty missingFacts array and coverageEstimate near 1.0
5. Be thorough — check every sentence against the extracted facts list`;
```

**Change to:**
```
RULES:
1. Only include genuinely new facts not already in the extracted list
2. Set factCategory to "verification_recovery" for all facts found by this pass
3. coverageEstimate: your estimate of what % of the section's factual content is now captured (0.0-1.0)
4. If nothing is missing, return empty missingFacts array and coverageEstimate near 1.0
5. Be thorough — check every sentence against the extracted facts list
6. factType MUST be one of these exact strings (choose the closest match; use "fact" if unsure):
   "fact", "entity", "definition", "relationship", "table_row",
   "policy_exception", "policy_rule", "limit", "threshold",
   "required_document", "escalation_path", "audit_field",
   "cross_reference", "narrative_fact"`;
```

**Also update the JSON example** in the same prompt (lines 887–899) to reinforce the constraint. Change the example `"factType": "limit"` comment to show a realistic variety example that uses only valid types:

```json
{
  "missingFacts": [
    {
      "factType": "limit",
      "content": "The actual missing fact content",
      "sourceText": "Brief quote from the section showing the source",
      "confidence": 0.85,
      "factCategory": "verification_recovery",
      "subsection": "Nearest heading"
    }
  ],
  "coverageEstimate": 0.95
}
```
*(The JSON example already shows `"limit"` which is a valid type — no change needed to the JSON block itself. Only Rule 6 is added.)*

**Acceptance Criteria:**

GIVEN a new RAG ingestion run is triggered  
WHEN Pass 6 (Opus verification) sends its prompt to Claude  
THEN the prompt's RULES section contains an explicit list of all 14 allowed `factType` values  
AND Claude returns only `factType` values from that list in its JSON response  
AND no `rag_facts_fact_type_check` constraint violations are logged in the Vercel output  

---

### Change 2 — Fix A2: Add `fact_type` Normalization Fallback in `storeExtractedFacts`

**File:** `src/lib/rag/services/rag-ingestion-service.ts`  
**Location:** `storeExtractedFacts()` function (starting at line 894)

**Why:** Even with the prompt constraint (Change 1), Claude might occasionally hallucinate an invalid type. This change adds a code-level safety net so no DB constraint violation can ever reach the INSERT statement. This is the defensive layer; Change 1 is the preventive layer.

**Current records mapping (lines 904–917):**
```typescript
const records = facts.map(fact => ({
    document_id: documentId,
    user_id: userId,
    section_id: sectionId,
    fact_type: fact.factType,
    content: fact.content,
    source_text: fact.sourceText,
    confidence: fact.confidence,
    metadata: {},
    policy_id: fact.policyId || null,
    rule_id: fact.ruleId || null,
    subsection: fact.subsection || null,
    fact_category: fact.factCategory || null,
}));
```

**Change to:**

Add the `ALLOWED_RAG_FACT_TYPES` constant before the function (or at the top of the file near other constants), then use it in the mapping:

```typescript
// Add this constant — derive from the RAGFactType union to stay in sync
const ALLOWED_RAG_FACT_TYPES = new Set<string>([
    'fact', 'entity', 'definition', 'relationship', 'table_row',
    'policy_exception', 'policy_rule', 'limit', 'threshold',
    'required_document', 'escalation_path', 'audit_field',
    'cross_reference', 'narrative_fact',
]);
```

Then in the `records` mapping, change the `fact_type` line:
```typescript
fact_type: ALLOWED_RAG_FACT_TYPES.has(fact.factType) ? fact.factType : 'fact',
```

When a fact with an invalid `factType` is normalized, log a warning before the insert so it remains observable:

```typescript
const invalidFacts = facts.filter(f => !ALLOWED_RAG_FACT_TYPES.has(f.factType));
if (invalidFacts.length > 0) {
    console.warn(
        `[RAG Ingestion] storeExtractedFacts: ${invalidFacts.length} facts had invalid factType ` +
        `and were normalized to "fact": ` +
        invalidFacts.map(f => `"${f.factType}"`).join(', ')
    );
}
```

Place this warning immediately before the `records` mapping, after `if (facts.length === 0) return [];`.

**Complete updated `storeExtractedFacts` function body:**

```typescript
export async function storeExtractedFacts(
    documentId: string,
    userId: string,
    sectionId: string | null,
    facts: FactExtraction[]
): Promise<RAGFact[]> {
    if (facts.length === 0) return [];

    const invalidFacts = facts.filter(f => !ALLOWED_RAG_FACT_TYPES.has(f.factType));
    if (invalidFacts.length > 0) {
        console.warn(
            `[RAG Ingestion] storeExtractedFacts: ${invalidFacts.length} facts had invalid factType ` +
            `and were normalized to "fact": ` +
            invalidFacts.map(f => `"${f.factType}"`).join(', ')
        );
    }

    const supabase = createServerSupabaseAdminClient();

    const records = facts.map(fact => ({
        document_id: documentId,
        user_id: userId,
        section_id: sectionId,
        fact_type: ALLOWED_RAG_FACT_TYPES.has(fact.factType) ? fact.factType : 'fact',
        content: fact.content,
        source_text: fact.sourceText,
        confidence: fact.confidence,
        metadata: {},
        policy_id: fact.policyId || null,
        rule_id: fact.ruleId || null,
        subsection: fact.subsection || null,
        fact_category: fact.factCategory || null,
    }));

    const { data: insertedFacts, error } = await supabase
        .from('rag_facts')
        .insert(records)
        .select('*');

    if (error) {
        console.warn('[RAG Ingestion] Error storing facts:', error);
        return [];
    }

    return (insertedFacts || []).map(mapRowToFact);
}
```

**Placement of constant:** Add `ALLOWED_RAG_FACT_TYPES` immediately above the `storeExtractedFacts` function (before line 890 / the JSDoc comment block). Do NOT import it from `src/types/rag.ts` — keep it co-located with the function that uses it to avoid circular dependencies and to be explicit.

**Acceptance Criteria:**

GIVEN `storeExtractedFacts` is called with facts containing a mix of valid and invalid `factType` values  
WHEN the records are built for DB insert  
THEN facts with valid `factType` are stored with their original type unchanged  
AND facts with invalid `factType` are stored with `fact_type = 'fact'`  
AND a `console.warn` is emitted listing each invalid type that was normalized  
AND no `rag_facts_fact_type_check` DB constraint error is thrown  

---

### Change 3 — Fix B: Empty Table Content Guard in Pass 3

**File:** `src/inngest/functions/process-rag-document.ts`  
**Location:** Inside the Pass 3 `for` loop, inside `step.run('pass-3-table-${tableIdx}', ...)`, before the `provider.extractTableData()` call (current line 185–186)

**Why:** One table per run has empty content between the `[TABLE]` markers. Claude responds with conversational text ("I don't see any table content…") instead of JSON, causing a `parseJsonResponse` parse failure. While the existing `try/catch` handles it gracefully, this wastes an Opus/Haiku API call and generates an error log entry. A content check before the LLM call eliminates both.

**Current code (lines 184–200):**
```typescript
const tblFacts = await step.run(`pass-3-table-${tableIdx}`, async () => {
    try {
        const result = await provider.extractTableData({
            tableText,
            surroundingContext: `${contextBefore}\n[TABLE]\n${contextAfter}`,
            documentType: structure.documentType,
        });
        const facts = tableResultToFacts(result);
        const sectionId = findSectionForLine(sections as any, structure as any, table.startLine);
        await storeExtractedFacts(documentId, doc.userId, sectionId, facts);
        console.log(`[Inngest] Pass 3: Table "${result.tableName}": ${facts.length} rows`);
        return facts;
    } catch (err) {
        console.warn(`[Inngest] Pass 3 error for table at line ${table.startLine}:`, err);
        return [] as FactExtraction[];
    }
});
```

**Change to** — add the guard as the first thing inside the `step.run` callback, before `try`:

```typescript
const tblFacts = await step.run(`pass-3-table-${tableIdx}`, async () => {
    // Guard: skip empty or near-empty table content to avoid wasted LLM calls
    const rawContent = tableText?.trim() ?? '';
    if (rawContent.length < 10) {
        console.log(
            `[Inngest] Pass 3: Table ${tableIdx} at line ${table.startLine} — ` +
            `empty content (${rawContent.length} chars), skipping LLM call`
        );
        return [] as FactExtraction[];
    }

    try {
        const result = await provider.extractTableData({
            tableText,
            surroundingContext: `${contextBefore}\n[TABLE]\n${contextAfter}`,
            documentType: structure.documentType,
        });
        const facts = tableResultToFacts(result);
        const sectionId = findSectionForLine(sections as any, structure as any, table.startLine);
        await storeExtractedFacts(documentId, doc.userId, sectionId, facts);
        console.log(`[Inngest] Pass 3: Table "${result.tableName}": ${facts.length} rows`);
        return facts;
    } catch (err) {
        console.warn(`[Inngest] Pass 3 error for table at line ${table.startLine}:`, err);
        return [] as FactExtraction[];
    }
});
```

**Threshold rationale:** `< 10` chars is deliberately conservative. Any real table row would contain at least `| x |` (5 chars) plus content. A threshold of 10 catches genuinely empty, whitespace-only, or placeholder content while allowing even the smallest real table through.

**Acceptance Criteria:**

GIVEN a RAG document contains a table structural region with empty or near-empty content (`tableText.trim().length < 10`)  
WHEN Pass 3 processes that table  
THEN no call to `provider.extractTableData()` is made for that table  
AND a `console.log` is emitted noting the table was skipped  
AND `[] as FactExtraction[]` is returned from the step, contributing 0 facts  
AND the pipeline continues to the next table without error  

GIVEN a table with real content (`tableText.trim().length >= 10`)  
WHEN Pass 3 processes that table  
THEN the existing behavior is completely unchanged  

---

### Change 4 — Test Tool: Expand `getEmbeddingRuns` to All Documents

**File:** `src/lib/rag/testing/test-diagnostics.ts`  
**Location:** `getEmbeddingRuns()` function (lines 325–354) and `EmbeddingRunInfo` interface (lines 313–323)

**Why:** `getEmbeddingRuns` is currently called with `CANONICAL_DOCUMENT_ID` and only returns runs for that one document. When the user uploads the same corpus file to a new knowledge base, it gets a new document ID, so its runs never appear in the selector. The fix makes `documentId` optional — when omitted, all runs are returned, each labelled with the source document's filename.

**Update `EmbeddingRunInfo` interface** — add one optional field:

```typescript
export interface EmbeddingRunInfo {
    id: string;
    documentId: string;
    documentName: string;        // NEW: file_name from rag_documents join
    embeddingCount: number;
    embeddingModel: string;
    status: string;
    pipelineVersion: string;
    startedAt: string;
    completedAt: string | null;
    metadata: Record<string, unknown>;
}
```

**Update `getEmbeddingRuns` function signature and query:**

```typescript
export async function getEmbeddingRuns(documentId?: string): Promise<EmbeddingRunInfo[]> {
    try {
        const supabase = createServerSupabaseAdminClient();

        let query = supabase
            .from('rag_embedding_runs')
            .select(`
                *,
                rag_documents ( file_name )
            `)
            .order('created_at', { ascending: false });

        if (documentId) {
            query = query.eq('document_id', documentId);
        }

        const { data, error } = await query;

        if (error || !data) {
            console.warn('[Test Diagnostics] Failed to fetch embedding runs:', error);
            return [];
        }

        return data.map((row: any) => ({
            id: row.id,
            documentId: row.document_id,
            documentName: row.rag_documents?.file_name || row.document_id.slice(0, 8),
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

**Notes on the Supabase join:** `rag_embedding_runs` has a `document_id` FK to `rag_documents.id`. The PostgREST syntax `.select('*, rag_documents(file_name)')` performs an implicit inner join and embeds the related row's fields. If a document has been deleted, `row.rag_documents` will be `null`; the fallback `row.document_id.slice(0, 8)` handles this safely.

**Acceptance Criteria:**

GIVEN multiple RAG documents have been processed with different document IDs  
WHEN `getEmbeddingRuns()` is called with no argument  
THEN all embedding runs across all documents are returned, ordered newest first  
AND each run includes a `documentName` field showing the source file's `file_name`  
AND runs for documents that no longer exist fall back to `documentId.slice(0, 8)` as the name  

GIVEN `getEmbeddingRuns(documentId)` is called with a specific document ID  
WHEN the query executes  
THEN only runs for that document are returned (existing behavior preserved)  

---

### Change 5 — Test Tool: Update `/runs` Route to Return All Runs

**File:** `src/app/api/rag/test/golden-set/runs/route.ts`

**Why:** The route currently calls `getEmbeddingRuns(CANONICAL_DOCUMENT_ID)` and counts untagged embeddings only for the canonical document. With Change 4, `getEmbeddingRuns()` can return all runs. The untagged count is legacy context that becomes less meaningful across all documents; simplify it.

**Current file (full):**
```typescript
import { getEmbeddingRuns } from '@/lib/rag/testing/test-diagnostics';
import { CANONICAL_DOCUMENT_ID } from '@/lib/rag/testing/golden-set-definitions';

export async function GET(request: NextRequest) {
    // ...
    const runs = await getEmbeddingRuns(CANONICAL_DOCUMENT_ID);
    const supabase = createServerSupabaseAdminClient();
    const { count: untaggedCount } = await supabase
        .from('rag_embeddings')
        .select('id', { count: 'exact', head: true })
        .eq('document_id', CANONICAL_DOCUMENT_ID)
        .is('run_id', null);

    return NextResponse.json({
        success: true,
        data: { runs, untaggedCount: untaggedCount ?? 0, documentId: CANONICAL_DOCUMENT_ID },
    });
}
```

**Change to:**

```typescript
/**
 * Embedding Runs API — List all available embedding runs (all documents)
 *
 * GET — Returns all embedding runs across all documents.
 *       The client uses these to populate the run selector dropdown.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { getEmbeddingRuns } from '@/lib/rag/testing/test-diagnostics';

export async function GET(request: NextRequest) {
    const { response: authResponse } = await requireAuth(request);
    if (authResponse) return authResponse;

    try {
        const runs = await getEmbeddingRuns(); // no documentId = all runs

        return NextResponse.json({
            success: true,
            data: {
                runs,
                untaggedCount: 0,   // Legacy field — kept for API compatibility
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

**Remove imports:** `createServerSupabaseAdminClient` and `CANONICAL_DOCUMENT_ID` are no longer used in this file.

**Acceptance Criteria:**

GIVEN the user navigates to `/rag/test`  
WHEN the page's `useEffect` fires and `GET /api/rag/test/golden-set/runs` is called  
THEN the response contains runs for ALL processed documents  
AND the `documentId` field on each run correctly identifies which document it belongs to  
AND the `documentName` field shows the human-readable filename  

---

### Change 6 — Test Tool: Update Golden-Set Route to Accept `documentId`

**File:** `src/app/api/rag/test/golden-set/route.ts`  
**Location:** `POST` handler body parsing (lines 40–43) and usage of `CANONICAL_DOCUMENT_ID` (lines 56, 77)

**Why:** Currently the route hardcodes `CANONICAL_DOCUMENT_ID` for both `runPreflightChecks` and `runSingleTest`. When the user selects a run from a different document, the tests must query that document's embeddings. Accepting `documentId` from the request body and falling back to `CANONICAL_DOCUMENT_ID` preserves backward compatibility.

**Current lines 40–43 (body parsing):**
```typescript
const body = await request.json();
const batch: number = body.batch ?? 0;
const runId: string | undefined = body.runId || undefined;
const totalBatches = Math.ceil(GOLDEN_SET.length / BATCH_SIZE);
```

**Change to:**
```typescript
const body = await request.json();
const batch: number = body.batch ?? 0;
const runId: string | undefined = body.runId || undefined;
const documentId: string = body.documentId || CANONICAL_DOCUMENT_ID;
const totalBatches = Math.ceil(GOLDEN_SET.length / BATCH_SIZE);
```

**Current line 56 (preflight):**
```typescript
preflight = await runPreflightChecks(CANONICAL_DOCUMENT_ID);
```

**Change to:**
```typescript
preflight = await runPreflightChecks(documentId);
```

**Current line 77 (runSingleTest):**
```typescript
const result = await runSingleTest(item, user!.id, CANONICAL_DOCUMENT_ID, runId);
```

**Change to:**
```typescript
const result = await runSingleTest(item, user!.id, documentId, runId);
```

`CANONICAL_DOCUMENT_ID` import remains — it is still used as the fallback default value. No change to the import.

**Acceptance Criteria:**

GIVEN the user selects an embedding run from document B (not the canonical document)  
WHEN `POST /api/rag/test/golden-set` is called with `{ batch, runId, documentId: "<doc-B-id>" }`  
THEN preflight checks run against document B  
AND all test queries are issued against document B's embeddings  
AND the run selector filters by `runId` within document B's embedding space  

GIVEN `POST /api/rag/test/golden-set` is called WITHOUT a `documentId` in the body  
WHEN the route processes the request  
THEN `CANONICAL_DOCUMENT_ID` is used as the document (existing behavior unchanged)  

---

### Change 7 — Test Tool: Page Selector + Document Routing + History Download

**File:** `src/app/(dashboard)/rag/test/page.tsx`

This change has four sub-parts:

#### 7a. Add `selectedDocumentId` State

After the existing `selectedRunId` state declaration (line 90), add:

```typescript
const [selectedDocumentId, setSelectedDocumentId] = useState<string | undefined>(undefined);
```

#### 7b. Update Embedding Run Selector `onChange` and Label

**Current `<select>` onChange (line 282):**
```typescript
onChange={(e) => setSelectedRunId(e.target.value || undefined)}
```

**Change to:**
```typescript
onChange={(e) => {
    const runId = e.target.value || undefined;
    setSelectedRunId(runId);
    if (runId) {
        const run = embeddingRuns.find((r: any) => r.id === runId);
        setSelectedDocumentId(run?.documentId || undefined);
    } else {
        setSelectedDocumentId(undefined);
    }
}}
```

**Current option label (lines 288–291):**
```tsx
{new Date(run.startedAt).toLocaleDateString()}{' '}
{new Date(run.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
— {run.embeddingCount} embeddings ({run.pipelineVersion})
```

**Change to** (add document name prefix):
```tsx
{(run.documentName || run.documentId?.slice(0, 8) || 'doc').slice(0, 30)}{' '}
— {new Date(run.startedAt).toLocaleDateString()}{' '}
{new Date(run.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
— {run.embeddingCount} emb ({run.pipelineVersion})
```

The `documentName` is truncated to 30 chars to keep the dropdown readable.

#### 7c. Pass `documentId` in `runTest` Fetch Body

**Current fetch body in `runTest` (line 153):**
```typescript
body: JSON.stringify({ batch, runId: selectedRunId }),
```

**Change to:**
```typescript
body: JSON.stringify({ batch, runId: selectedRunId, documentId: selectedDocumentId }),
```

#### 7d. Add `downloadHistoricalReport` Function and Download Button in History Panel

**Add function** after the existing `saveReport` function (after line 250):

```typescript
const downloadHistoricalReport = (report: any) => {
    const lines: string[] = [
        '# RAG Golden-Set Regression Test Report (Historical)',
        '',
        `**Saved:** ${new Date(report.created_at).toLocaleString()}`,
        `**Result:** ${report.meets_target ? 'PASS' : 'FAIL'} (target: >=85%)`,
        '',
        '## Summary',
        '',
        '| Metric | Value |',
        '|--------|-------|',
        `| Pass Rate | ${report.pass_rate}% |`,
        `| Passed | ${report.total_passed} |`,
        `| Failed | ${report.total_failed} |`,
        `| Errored | ${report.total_errored} |`,
        `| Avg Response Time | ${Math.round(report.avg_response_time_ms / 1000)}s |`,
        `| Avg Self-Eval Score | ${Math.round(report.avg_self_eval_score * 100)}% |`,
        `| Total Duration | ${Math.round(report.total_duration_ms / 1000)}s |`,
        '',
    ];
    if (report.embedding_run_id) {
        lines.push(`**Embedding Run:** ${report.embedding_run_id}`);
        lines.push('');
    }
    if (report.notes) {
        lines.push(`**Notes:** ${report.notes}`);
        lines.push('');
    }
    lines.push('*Full per-question results not included in historical summary. Run a new test to export complete results.*');

    const markdown = lines.join('\n');
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `golden-set-report-${new Date(report.created_at).toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
```

**Update history panel row** — add a Download button to each history row. In the history row's right-side `<div className="flex items-center gap-3">` block (lines 394–401), add a download button after the Badge:

**Current:**
```tsx
<div className="flex items-center gap-3">
    <Badge variant={report.meets_target ? 'default' : 'destructive'}>
        {report.pass_rate}%
    </Badge>
    <span className="text-xs text-muted-foreground">
        {Math.round(report.total_duration_ms / 1000)}s
    </span>
</div>
```

**Change to:**
```tsx
<div className="flex items-center gap-3">
    <Badge variant={report.meets_target ? 'default' : 'destructive'}>
        {report.pass_rate}%
    </Badge>
    <span className="text-xs text-muted-foreground">
        {Math.round(report.total_duration_ms / 1000)}s
    </span>
    <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        onClick={() => downloadHistoricalReport(report)}
        title="Download summary report"
    >
        <Download className="h-3 w-3" />
    </Button>
</div>
```

`Download` icon is already imported (added in E013). No new imports needed.

**Regarding the user's question about markdown being "linked to" from the test results page:**  
The "Download .md" button in `SummaryCard` IS already present and functional — it appears immediately after every completed test run. The history panel now also has a per-row download icon (this change). The full per-question results are only available in the immediate post-run download; the historical download produces a summary-only report, with a note explaining this.

**Acceptance Criteria:**

GIVEN the user selects an embedding run from the dropdown  
WHEN the onChange fires  
THEN `selectedRunId` is set to the run's ID  
AND `selectedDocumentId` is set to that run's `documentId`  
AND the dropdown option shows the document's filename prefix  

GIVEN `selectedDocumentId` is set  
WHEN `runTest` fires and sends the POST to `/api/rag/test/golden-set`  
THEN `documentId` is included in the request body  

GIVEN the history panel is showing and has one or more reports  
WHEN the user clicks the Download icon on a history row  
THEN the browser downloads a `.md` file named `golden-set-report-YYYY-MM-DD.md`  
AND the file contains the summary metrics from that historical report  
AND the file includes a note that full per-question results are not available in the historical summary  

---

## 4. Testing Checkpoints

### Checkpoint 1 — TypeScript Compilation (no errors)
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/src" && npx tsc -p tsconfig.json --noEmit
```
Expected: 0 errors, 0 warnings.

### Checkpoint 2 — Verify Fix A2 Normalization Constant
After implementing Change 2, run a TypeScript check specifically on the ingestion service:
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/src" && npx tsc -p tsconfig.json --noEmit 2>&1 | grep rag-ingestion
```
Expected: No output (no errors in that file).

### Checkpoint 3 — Verify Schema Compatibility (SAOL)
After deploying, run this SAOL check to confirm `rag_embedding_runs` has the `document_id` FK (required for the join in Change 4):
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
    const result = await saol.agentIntrospectSchema({
        table: 'rag_embedding_runs',
        includeColumns: true,
        transport: 'pg'
    });
    const cols = result.tables?.[0]?.columns?.map(c => c.name) || [];
    console.log('document_id present:', cols.includes('document_id'));
    console.log('Columns:', cols.join(', '));
})();
"
```
Expected: `document_id present: true`

### Checkpoint 4 — Embedding Run Selector Populated with All Docs
1. Navigate to `/rag/test` in the browser
2. Open browser DevTools → Network → filter by `runs`
3. The GET `/api/rag/test/golden-set/runs` response should show runs from ALL documents
4. The dropdown should show entries with filenames like `Sun-Chip-Bank-Policy-Do... — 2026-02-17 09:10 — 1030 emb (multi-pass)`

### Checkpoint 5 — Cross-Document Test Execution
1. Select an embedding run from a non-canonical document upload
2. Click "Run Test"
3. In Vercel/browser dev tools logs, confirm that `documentId` in the POST body matches the selected run's document ID
4. Confirm preflight "Document Exists" check passes for that document

### Checkpoint 6 — Pass 6 Facts No Longer Dropped
Run a new RAG ingestion on the test document after deploying. In the Vercel logs:
- Look for `[Inngest] Pass 6` section
- Should see NO `violates check constraint "rag_facts_fact_type_check"` errors
- If any normalization occurred (Fix A2 safety net), look for `[RAG Ingestion] storeExtractedFacts: N facts had invalid factType and were normalized to "fact"` — this is acceptable/expected for transition period

### Checkpoint 7 — Pass 3 Empty Table Skipped
Run a new RAG ingestion. In the Vercel logs during Pass 3:
- Look for `[Inngest] Pass 3: Table N at line NNNN — empty content (N chars), skipping LLM call`
- Should see NO `[parseJsonResponse] FAILED TO PARSE JSON (extractTableData)` errors

### Checkpoint 8 — Historical Report Download
1. Navigate to `/rag/test` and click History to open the panel
2. If reports exist, click the download icon on any row
3. Verify a `.md` file downloads with summary metrics and the "full results not available" note

---

## 5. Warnings

### DO NOT modify `computeSummary` in `page.tsx`
It is correct and must not change. `embeddingRunId` is set outside it (E013 pattern).

### DO NOT modify `RAGFactType` in `src/types/rag.ts`
The type is correct. Do not add new values to accommodate Claude's invented types. The correct fix is to constrain Claude (Change 1) and normalize at insert time (Change 2).

### DO NOT expand the DB `rag_facts_fact_type_check` constraint
Adding invalid types (`scope`, `reference`, etc.) to the constraint is the wrong solution — it would fragment the taxonomy and create inconsistency with `RAGFactType` in TypeScript.

### DO NOT remove the CANONICAL_DOCUMENT_ID import from `golden-set/route.ts`
It is still used as the default fallback value when no `documentId` is sent. Removing it would break the case where the dropdown has "All embeddings (no filter)" selected.

### DO NOT make the document join in `getEmbeddingRuns` blocking
The Supabase PostgREST join `.select('*, rag_documents(file_name)')` is a single query — it does not add round trips. Do not refactor it into separate queries.

### DO NOT change the `maxDuration` on any route
All routes have appropriate timeouts from E012. The new changes do not require longer timeouts (no LLM calls are added to any route).

### The historical download is summary-only by design
Do NOT add a new API endpoint to fetch full `results` JSONB for historical reports. The current GET `/reports` intentionally omits the `results` column to keep the response small. If full per-question historical results are needed in the future, that is a separate spec item. The note in the downloaded markdown file already communicates this limitation to the user.

---

*Specification authored from codebase internalization of `src/app/(dashboard)/rag/test/page.tsx` (717 lines), `src/lib/rag/testing/test-diagnostics.ts` (355 lines), `src/app/api/rag/test/golden-set/route.ts`, `src/app/api/rag/test/golden-set/runs/route.ts`, `src/app/api/rag/test/golden-set/reports/route.ts`, `src/app/api/rag/test/golden-set/report/route.ts`, `src/lib/rag/providers/claude-llm-provider.ts`, `src/lib/rag/services/rag-ingestion-service.ts`, `src/inngest/functions/process-rag-document.ts`, and `src/types/rag.ts`.*
