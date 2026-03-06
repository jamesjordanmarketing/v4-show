# Golden-Set Regression Test Tool — Vercel Implementation Specification

**Version:** 1.0  
**Date:** February 17, 2026  
**Target Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src`  
**Purpose:** Replace CLI-based `scripts/golden-set-test.js` with a server-side test runner + UI

---

## Problem Statement

The CLI golden-set test (`scripts/golden-set-test.js`) failed for two reasons:
1. **Auth**: Requires manually extracting browser cookies and passing via `RAG_TEST_COOKIE` env var
2. **500 Errors**: All 20 queries returned `Internal Server Error` — likely because the `queryRAG` service internally calls `searchSimilarEmbeddings` (which invokes the Supabase RPC `match_rag_embeddings_kb` + OpenAI embedding API) and `generateResponse` (Claude API). Any of these dependencies failing causes an undiagnosable 500.

**Root cause of undiagnosability:** `queryRAG` has a top-level try/catch at line 877 that swallows all errors into a generic message. No structured error reporting exists.

---

## Architecture Analysis

### queryRAG Pipeline (rag-retrieval-service.ts lines 604-881)

The function performs 7 sequential steps. Each is a potential failure point:

| Step | Function | External Dependency | Failure Mode |
|------|----------|-------------------|--------------|
| 1 | Document lookup | Supabase admin client | DB connection / missing doc |
| 2 | `generateHyDE()` | Claude API (Haiku) | API key missing / rate limit |
| 3 | `searchSimilarEmbeddings()` | OpenAI embed API + Supabase RPC `match_rag_embeddings_kb` | API key / RPC not found |
| 4 | `searchTextContent()` | Supabase text search | tsvector column missing |
| 5 | `rerankWithClaude()` | Claude API (Haiku) | API key / rate limit |
| 6 | `generateResponse()` | Claude API (Haiku) | API key / JSON parse |
| 7 | `selfEvaluate()` | Claude API (Haiku) | API key / response format |
| 8 | Insert to `rag_queries` | Supabase admin client | Schema mismatch |

### Key Insight: SAOL vs supabase-js

The existing `queryRAG` function uses `createServerSupabaseAdminClient()` (supabase-js) for all its DB operations. This is the established pattern in `rag-retrieval-service.ts` and must NOT be changed.

**SAOL is required for:** New diagnostic queries added by this tool (checking document existence, embedding counts, RPC availability, schema introspection).

**SAOL Reference:** `pmc/product/_mapping/multi/workfiles/supabase-agent-ops-library-use-instructions.md`

### Auth Pattern

All API routes use `requireAuth()` from `@/lib/supabase-server` which reads cookies from the `NextRequest`. When the test UI page calls `fetch('/api/rag/test/golden-set')`, the browser automatically sends cookies — no manual extraction needed.

---

## Files to Create

| # | File | Type | Description |
|---|------|------|-------------|
| 1 | `src/lib/rag/testing/golden-set-definitions.ts` | Shared | 20 Q&A pairs + constants |
| 2 | `src/lib/rag/testing/test-diagnostics.ts` | Service | Pre-flight checks + per-query diagnostics |
| 3 | `src/app/api/rag/test/golden-set/route.ts` | API Route | Test runner with structured error capture |
| 4 | `src/app/(dashboard)/rag/test/page.tsx` | Page | UI to trigger tests and view results |

---

## File 1: Golden-Set Definitions

**Path:** `src/lib/rag/testing/golden-set-definitions.ts`

### Types

```typescript
export interface GoldenSetItem {
  id: string;                           // e.g. 'GS-001'
  question: string;
  expectedAnswer: string;               // substring match (case-insensitive)
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;                     // e.g. 'direct-lookup', 'rule-exception', 'cross-section'
}

export interface TestResult {
  item: GoldenSetItem;
  passed: boolean;
  responseText: string;                 // first 500 chars
  selfEvalScore: number | null;
  responseTimeMs: number;
  error: string | null;                 // null = success
  diagnostics: QueryDiagnostics;
}

export interface QueryDiagnostics {
  hydeGenerated: boolean;
  sectionsRetrieved: number;
  factsRetrieved: number;
  embeddingSearchMs: number | null;
  llmResponseMs: number | null;
  dbInsertMs: number | null;
  errorStack: string | null;           // full stack trace on failure
  errorPhase: string | null;           // which pipeline step failed
}

export interface PreflightResult {
  passed: boolean;
  checks: PreflightCheck[];
}

export interface PreflightCheck {
  name: string;
  passed: boolean;
  detail: string;                      // e.g. "109 facts found" or "RPC not found"
  severity: 'critical' | 'warning' | 'info';
}

export interface TestRunSummary {
  runId: string;
  startedAt: string;
  completedAt: string;
  totalDurationMs: number;
  preflight: PreflightResult;
  totalPassed: number;
  totalFailed: number;
  totalErrored: number;                // distinct from failed: error = infrastructure failure
  passRate: number;
  meetsTarget: boolean;
  breakdown: {
    easy: { passed: number; total: number };
    medium: { passed: number; total: number };
    hard: { passed: number; total: number };
  };
  avgResponseTimeMs: number;
  avgSelfEvalScore: number;
  results: TestResult[];
}
```

### Constants

```typescript
export const CANONICAL_DOCUMENT_ID = 'ceff906e-968a-416f-90a6-df2422519d2b';
export const TARGET_PASS_RATE = 85;
```

### Golden Set Array

Same 20 items as existing `scripts/golden-set-test.js`, but each item gets an `id` field (`GS-001` through `GS-020`) and a `category` field for grouping:

- `GS-001` to `GS-005`: `category: 'direct-lookup'` (easy)
- `GS-006` to `GS-010`: `category: 'rule-exception'` (medium)
- `GS-011` to `GS-012`: `category: 'definition'` (medium)
- `GS-013` to `GS-014`: `category: 'table-data'` (medium)
- `GS-015` to `GS-020`: `category: 'cross-section'` (hard)

---

## File 2: Test Diagnostics Service

**Path:** `src/lib/rag/testing/test-diagnostics.ts`

This file contains pre-flight health checks and per-query diagnostic wrappers. **All new DB queries in this file MUST use SAOL** via dynamic import of the SAOL module.

### SAOL Usage Pattern (Server-Side)

Since SAOL lives in `supa-agent-ops/` (outside `src/`), the test diagnostics service must use dynamic `require()` with path resolution:

```typescript
import path from 'path';

function getSAOL() {
  const saolDir = path.resolve(process.cwd(), 'supa-agent-ops');
  return require(saolDir);
}
```

> **IMPORTANT:** The `process.cwd()` in Next.js API routes resolves to the project root (`v4-show/`), NOT `v4-show/src/`. The SAOL directory is at `v4-show/supa-agent-ops/`. Verify this path resolves correctly by testing `path.resolve(process.cwd(), 'supa-agent-ops')`.

> **FALLBACK:** If SAOL import fails (e.g., missing dependency in Vercel deployment), the diagnostic should catch the error, report `severity: 'warning'` with detail `"SAOL unavailable — using supabase-js fallback"`, and fall back to `createServerSupabaseAdminClient()` for that specific check. This ensures the test tool works even if SAOL isn't available in the deployment environment.

### Function: `runPreflightChecks(documentId: string): Promise<PreflightResult>`

Runs 6 health checks before any queries execute. Returns early analysis of what might fail:

**Check 1: Document Exists**
- SAOL: `agentQuery({ table: 'rag_documents', select: 'id,status,file_name,section_count,fact_count', where: [{ column: 'id', operator: 'eq', value: documentId }], transport: 'pg' })`
- Pass: Document found with `status === 'ready'`
- Fail (critical): Document not found or archived
- Detail: `"Sun-Chip-Bank-Policy-Document-v2.0.md | status=ready | sections=10 | facts=109"`

**Check 2: Embeddings Exist**
- SAOL: `agentQuery({ table: 'rag_embeddings', select: 'id,tier', where: [{ column: 'document_id', operator: 'eq', value: documentId }], transport: 'pg' })`
- Pass: Count > 0
- Fail (critical): No embeddings for this document
- Detail: `"247 embeddings (tier1: X, tier2: Y, tier3: Z)"`

**Check 3: RPC Function Exists**
- SAOL: `agentIntrospectSchema({ table: 'match_rag_embeddings_kb', transport: 'pg' })` — if this fails, the RPC might not exist
- Alternative: Try a dummy RPC call with a zero vector
- Pass: RPC callable
- Fail (critical): RPC missing or broken
- Detail: `"match_rag_embeddings_kb RPC available"`

**Check 4: Anthropic API Key**
- Check: `!!process.env.ANTHROPIC_API_KEY`
- Pass: Key exists and is non-empty
- Fail (critical): Key missing
- Detail: `"ANTHROPIC_API_KEY set (sk-ant-...${last4})"`

**Check 5: OpenAI API Key (Embeddings)**
- Check: `!!process.env.OPENAI_API_KEY`
- Pass: Key exists
- Fail (critical): Key missing
- Detail: `"OPENAI_API_KEY set (sk-...${last4})"`

**Check 6: Knowledge Base Link**
- SAOL: `agentQuery({ table: 'rag_documents', select: 'knowledge_base_id', where: [{ column: 'id', operator: 'eq', value: documentId }], transport: 'pg' })`
- Pass: `knowledge_base_id` is not null
- Fail (warning): Document not linked to a KB (may affect KB-wide search)
- Detail: `"knowledge_base_id: abc123..."`

### Function: `wrapQueryWithDiagnostics(queryFn, item): Promise<TestResult>`

Wraps the call to `queryRAG()` with timing and error capture for each pipeline phase. Uses `console.time`/`console.timeEnd` markers and catches errors to identify which phase failed.

Implementation approach:
1. Record `startTime`
2. Call `queryRAG(...)` in a try/catch
3. On success: extract `selfEvalScore`, `retrievedSectionIds.length`, `retrievedFactIds.length` from the result
4. On error: capture the full stack trace and attempt to identify the failing phase from the error message patterns:
   - `"similarity search"` → Phase: `embedding-search`
   - `"HyDE generation"` → Phase: `hyde`
   - `"Response generation"` → Phase: `llm-response`
   - `"Self-evaluation"` → Phase: `self-eval`
   - `"Failed to store"` → Phase: `db-insert`
   - Default → Phase: `unknown`

---

## File 3: Test Runner API Route

**Path:** `src/app/api/rag/test/golden-set/route.ts`

```typescript
export const maxDuration = 300; // 5 minutes — 20 queries at ~10s each
```

### POST Handler

1. `requireAuth(request)` — standard auth check
2. `runPreflightChecks(CANONICAL_DOCUMENT_ID)` — run all 6 checks
3. If any `critical` check fails → return `{ success: true, data: { preflight, results: [], summary } }` with `passRate: 0` and `meetsTarget: false`. Do NOT return 500 — the preflight failure IS the valuable diagnostic.
4. Loop through `GOLDEN_SET`:
   - For each item, call `wrapQueryWithDiagnostics(queryRAG, item)`
   - 500ms delay between queries (`await new Promise(r => setTimeout(r, 500))`)
   - Accumulate results
5. Compute summary statistics (same as existing script)
6. Return `{ success: true, data: { summary, preflight, results } }`

### GET Handler

Simple health check:
```typescript
export async function GET() {
  return NextResponse.json({ available: true, testCount: GOLDEN_SET.length });
}
```

### Error Response Shape

Every response returns `success: true` with diagnostic data — even when queries fail. The only `success: false` case is if auth fails or the handler itself crashes. This ensures the UI always gets actionable data.

---

## File 4: Test UI Page

**Path:** `src/app/(dashboard)/rag/test/page.tsx`

A `'use client'` page following existing patterns (Shadcn/UI, Tailwind, lucide-react, sonner).

### UI Sections

**Header:**
- Title: "RAG Golden-Set Regression Test"
- Subtitle: "20 Q&A pairs against Sun Chip Bank document. Target: ≥85% pass rate."
- "Run Test" button (disabled while running, shows Loader2 spinner)

**Preflight Panel** (shown after clicking Run, before results):
- Card with title "Pre-Flight Checks"
- List of 6 checks, each showing:
  - Icon: CheckCircle2 (green) or XCircle (red) or AlertTriangle (amber for warning)
  - Check name
  - Detail string
- If any critical check fails: show red alert banner "Critical preflight check failed. Test cannot proceed."

**Summary Card** (shown after test completes):
- Large pass/fail indicator with color (green border if meets target, red if not)
- Grid of stats: Passed / Failed / Errored / Pass Rate / Avg Response Time / Avg Self-Eval
- Breakdown by difficulty: Easy / Medium / Hard (each showing X/Y)

**Detailed Results** (scrollable list):
- Each result is a collapsible Card:
  - **Collapsed:** Status icon + question text + difficulty badge + response time
  - **Expanded:** Shows:
    - Expected answer substring
    - Actual response (first 500 chars)
    - Self-eval score
    - Diagnostics panel:
      - HyDE generated: yes/no
      - Sections retrieved: N
      - Facts retrieved: N
      - Error phase (if failed): highlighted in red
      - Error stack (if failed): collapsible pre block with monospace font

**Error Diagnostics Tab** (only shown if any query errored):
- Filtered view showing only errored queries
- Groups errors by `errorPhase`
- Shows count per phase: e.g. "embedding-search: 15 errors, llm-response: 3 errors"

### UI Component Usage

| Component | From | Usage |
|-----------|------|-------|
| Card, CardHeader, CardTitle, CardContent | `@/components/ui/card` | All panels |
| Button | `@/components/ui/button` | Run Test |
| Badge | `@/components/ui/badge` | Difficulty labels |
| Progress | `@/components/ui/progress` | Test progress bar |
| Tabs, TabsList, TabsTrigger, TabsContent | `@/components/ui/tabs` | Results / Diagnostics views |
| Collapsible, CollapsibleTrigger, CollapsibleContent | `@/components/ui/collapsible` | Expandable result rows |
| Icons | `lucide-react` | Play, Loader2, CheckCircle2, XCircle, AlertTriangle, ChevronDown, Bug, Zap |
| toast | `sonner` | Success/failure notifications |

### State Management

Simple `useState` hooks (no React Query needed since this is a one-shot operation):

```typescript
const [isRunning, setIsRunning] = useState(false);
const [progress, setProgress] = useState(0);        // 0..100
const [summary, setSummary] = useState<TestRunSummary | null>(null);
```

---

## Verification Plan

### Automated Checks
1. TypeScript compilation: `npx tsc -p src/tsconfig.json --noEmit` — no errors
2. Navigate to `/rag/test` — page renders without errors
3. Click "Run Golden-Set Test" — pre-flight checks execute and display
4. If pre-flight passes, all 20 queries execute with per-query diagnostics
5. Summary displays with pass rate

### Manual Checks
1. Verify pre-flight catches missing API keys (temporarily unset `ANTHROPIC_API_KEY`)
2. Verify pre-flight catches missing document (use a fake UUID)
3. Verify errored queries show the correct `errorPhase`
4. Verify the UI is navigable from `/rag` page

---

## Implementation Checklist

- [ ] Create `src/lib/rag/testing/golden-set-definitions.ts` — types + 20 Q&A items
- [ ] Create `src/lib/rag/testing/test-diagnostics.ts` — preflight checks (SAOL) + diagnostic wrapper
- [ ] Create `src/app/api/rag/test/golden-set/route.ts` — POST (test runner) + GET (health)
- [ ] Create `src/app/(dashboard)/rag/test/page.tsx` — full test UI
- [ ] Run TypeScript compilation
- [ ] Test preflight checks by navigating to `/rag/test`
- [ ] Run full golden-set test
- [ ] Verify diagnostic data renders for failed queries
