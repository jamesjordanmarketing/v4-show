# E06: Golden-Set Regression Test Tool — Execution Prompt

**Version:** 1.0  
**Date:** February 17, 2026  
**Section:** E06 - Standalone Golden-Set Regression Test Tool  
**Prerequisites:** E01–E05 (RAG Multi-Pass Ingestion) must be complete  
**Source Spec:** `pmc/product/_mapping/v2-mods/013-rag-multi-ingestion-upgrade-execution-promptE05_v2-golden-test-tool_v1.md`  
**Target Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src`

---

## Overview

This prompt implements a **standalone** golden-set regression test tool for the RAG pipeline. It replaces the failing CLI script (`scripts/golden-set-test.js`) with a server-side test runner + UI that solves two problems:

1. **Auth**: The CLI requires manually extracting browser cookies. The Vercel tool uses `requireAuth()` automatically.
2. **Diagnostics**: The CLI gets only `500 Internal Server Error`. The Vercel tool adds pre-flight checks and per-query error phase identification.

**What This Prompt Creates:**

| # | File | Purpose |
|---|------|---------|
| 1 | `src/lib/rag/testing/golden-set-definitions.ts` | Types, 20 Q&A pairs, constants |
| 2 | `src/lib/rag/testing/test-diagnostics.ts` | Pre-flight checks + per-query diagnostic wrapper |
| 3 | `src/app/api/rag/test/golden-set/route.ts` | API route: POST runs test, GET health check |
| 4 | `src/app/(dashboard)/rag/test/page.tsx` | UI page to trigger and view results |

**What This Prompt Does NOT Modify:**
- No existing files are modified
- No production UI is changed  
- No database schema changes required

---

## Critical Instructions

### 1. SAOL is NOT used

**DO NOT** use the SAOL tool (`supa-agent-ops/`) in any codebase files. SAOL is a CLI-only development tool that cannot be maintained as part of the deployed application.

**Instead:** All database access in this tool uses `createServerSupabaseAdminClient()` from `@/lib/supabase-server`. This is the exact same pattern used by `queryRAG()` in `rag-retrieval-service.ts`.

### 2. Standalone Tool

This tool is "standalone" — it lives in the codebase but minimizes production dependencies:
- **OK to use:** `@/lib/supabase-server` (requireAuth, createServerSupabaseAdminClient), `next/server`, types from `@/types/rag`
- **OK to use:** `queryRAG` from `@/lib/rag/services/rag-retrieval-service` (this IS the system under test)
- **OK to use:** Shadcn/UI components from `@/components/ui/*`, `lucide-react`, `sonner` (for the test page)
- **DO NOT add:** New npm dependencies, new database tables, or new production features

### 3. Auth Pattern

API routes use `requireAuth()` from `@/lib/supabase-server`:

```typescript
import { requireAuth } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  const { user, response: authResponse } = await requireAuth(request);
  if (authResponse) return authResponse; // Returns 401 JSON
  // user.id is now available
}
```

### 4. Database Client Pattern

For direct DB queries (pre-flight checks), use:

```typescript
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';

const supabase = createServerSupabaseAdminClient();
const { data, error } = await supabase
  .from('rag_documents')
  .select('id, status, file_name')
  .eq('id', documentId)
  .single();
```

This is the exact pattern from `rag-retrieval-service.ts` lines 615, 623-628.

### 5. queryRAG Entry Point

The function under test is `queryRAG()` from `src/lib/rag/services/rag-retrieval-service.ts`. Its signature:

```typescript
export async function queryRAG(params: {
  queryText: string;
  documentId?: string;
  knowledgeBaseId?: string;
  userId: string;
  mode?: RAGQueryMode;  // 'rag_only' | 'lora_only' | 'rag_and_lora'
  modelJobId?: string;
}): Promise<{ success: boolean; data?: RAGQuery; error?: string }>
```

The returned `data` (type `RAGQuery`) includes:
- `responseText: string | null`
- `selfEvalScore: number | null`
- `selfEvalPassed: boolean | null`
- `retrievedSectionIds: string[]`
- `retrievedFactIds: string[]`
- `hydeText: string | null`
- `responseTimeMs: number | null`

### 6. Environment Variables

These are already configured in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://hqhtbxlgzysfbekexwku.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<configured>
ANTHROPIC_API_KEY=<configured>
OPENAI_API_KEY=<configured>
```

---

## Reference: Existing Codebase Files

Read these files to understand patterns before writing code:

| File | Why |
|------|-----|
| `src/lib/supabase-server.ts` | Auth functions: `requireAuth()`, `createServerSupabaseAdminClient()` |
| `src/lib/rag/services/rag-retrieval-service.ts` | `queryRAG()` function (lines 604-881) — the system under test |
| `src/app/api/rag/query/route.ts` | Example API route using `requireAuth()` |
| `src/app/(dashboard)/rag/page.tsx` | Example dashboard page structure |
| `scripts/golden-set-test.js` | Original 20 Q&A pairs to migrate |

---

## Implementation Tasks

### Task 1: Create Golden-Set Definitions

Create file: `src/lib/rag/testing/golden-set-definitions.ts`

This file contains all types, constants, and the 20 Q&A pairs. No external dependencies — pure TypeScript types and data.

```typescript
// ============================================
// Golden-Set Regression Test — Types & Data
// ============================================
// Standalone definitions for the RAG golden-set regression test.
// No external dependencies — pure types and data.

// ---- Types ----

export interface GoldenSetItem {
  id: string;                           // e.g. 'GS-001'
  question: string;
  expectedAnswer: string;               // substring match (case-insensitive)
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;                     // e.g. 'direct-lookup', 'rule-exception'
}

export interface QueryDiagnostics {
  hydeGenerated: boolean;
  sectionsRetrieved: number;
  factsRetrieved: number;
  responseTimeMs: number;
  errorStack: string | null;           // full stack trace on failure
  errorPhase: string | null;           // which pipeline step failed
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

export interface PreflightCheck {
  name: string;
  passed: boolean;
  detail: string;
  severity: 'critical' | 'warning' | 'info';
}

export interface PreflightResult {
  passed: boolean;
  checks: PreflightCheck[];
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

// ---- Constants ----

export const CANONICAL_DOCUMENT_ID = 'ceff906e-968a-416f-90a6-df2422519d2b';
export const TARGET_PASS_RATE = 85;

// ---- Golden Set: 20 Q&A Pairs ----
// Source: scripts/golden-set-test.js
// Each item has an id (GS-001..GS-020) and category for grouping.

export const GOLDEN_SET: GoldenSetItem[] = [
  // ---- Easy: Direct rule lookup (should always pass) ----
  {
    id: 'GS-001',
    question: 'What is the DTI limit for jumbo mortgages?',
    expectedAnswer: '43%',
    difficulty: 'easy',
    category: 'direct-lookup',
  },
  {
    id: 'GS-002',
    question: 'What is the minimum FICO score for conventional loans?',
    expectedAnswer: '620',
    difficulty: 'easy',
    category: 'direct-lookup',
  },
  {
    id: 'GS-003',
    question: 'What are the wire transfer cutoff times?',
    expectedAnswer: 'cutoff',
    difficulty: 'easy',
    category: 'direct-lookup',
  },
  {
    id: 'GS-004',
    question: 'What is the maximum cash deposit without enhanced due diligence?',
    expectedAnswer: '10,000',
    difficulty: 'easy',
    category: 'direct-lookup',
  },
  {
    id: 'GS-005',
    question: 'What is the FDIC insurance coverage limit?',
    expectedAnswer: '250,000',
    difficulty: 'easy',
    category: 'direct-lookup',
  },

  // ---- Medium: Rule + Exception combinations ----
  {
    id: 'GS-006',
    question: 'Can the DTI limit be exceeded for jumbo mortgages?',
    expectedAnswer: '45%',
    difficulty: 'medium',
    category: 'rule-exception',
  },
  {
    id: 'GS-007',
    question: 'Are there any exceptions to the minimum down payment requirement?',
    expectedAnswer: 'exception',
    difficulty: 'medium',
    category: 'rule-exception',
  },
  {
    id: 'GS-008',
    question: 'What happens when a wire transfer is flagged for review?',
    expectedAnswer: 'escalat',
    difficulty: 'medium',
    category: 'rule-exception',
  },
  {
    id: 'GS-009',
    question: 'What are the escalation levels for BSA/AML alerts?',
    expectedAnswer: 'compliance',
    difficulty: 'medium',
    category: 'rule-exception',
  },
  {
    id: 'GS-010',
    question: 'What documents are needed for a jumbo mortgage application?',
    expectedAnswer: 'tax',
    difficulty: 'medium',
    category: 'rule-exception',
  },

  // ---- Medium: Definition and glossary lookups ----
  {
    id: 'GS-011',
    question: 'What does DTI stand for in lending context?',
    expectedAnswer: 'debt-to-income',
    difficulty: 'medium',
    category: 'definition',
  },
  {
    id: 'GS-012',
    question: 'What is the definition of a jumbo mortgage?',
    expectedAnswer: 'conforming',
    difficulty: 'medium',
    category: 'definition',
  },

  // ---- Medium: Table data retrieval ----
  {
    id: 'GS-013',
    question: 'What are the fee tiers for different account types?',
    expectedAnswer: 'fee',
    difficulty: 'medium',
    category: 'table-data',
  },
  {
    id: 'GS-014',
    question: 'What interest rates apply to certificates of deposit?',
    expectedAnswer: 'rate',
    difficulty: 'medium',
    category: 'table-data',
  },

  // ---- Hard: Cross-section synthesis ----
  {
    id: 'GS-015',
    question: 'What documents do I need to open an account?',
    expectedAnswer: 'identification',
    difficulty: 'hard',
    category: 'cross-section',
  },
  {
    id: 'GS-016',
    question: 'Compare the lending requirements for conventional vs jumbo mortgages',
    expectedAnswer: 'jumbo',
    difficulty: 'hard',
    category: 'cross-section',
  },
  {
    id: 'GS-017',
    question: 'What audit requirements apply to wire transfers over $50,000?',
    expectedAnswer: 'audit',
    difficulty: 'hard',
    category: 'cross-section',
  },
  {
    id: 'GS-018',
    question: 'What are all the circumstances that require manager approval?',
    expectedAnswer: 'approv',
    difficulty: 'hard',
    category: 'cross-section',
  },
  {
    id: 'GS-019',
    question: 'How do the compliance requirements differ between domestic and international wire transfers?',
    expectedAnswer: 'international',
    difficulty: 'hard',
    category: 'cross-section',
  },
  {
    id: 'GS-020',
    question: 'What are the complete steps for processing a mortgage application from start to finish?',
    expectedAnswer: 'appraisal',
    difficulty: 'hard',
    category: 'cross-section',
  },
];
```

### Task 2: Create Test Diagnostics Service

Create file: `src/lib/rag/testing/test-diagnostics.ts`

This file contains pre-flight health checks and the per-query diagnostic wrapper. All database access uses `createServerSupabaseAdminClient()` — NOT SAOL.

```typescript
// ============================================
// Golden-Set Test — Diagnostics Service
// ============================================
// Pre-flight checks and per-query diagnostic wrappers.
// Uses createServerSupabaseAdminClient() for all DB access.

import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { queryRAG } from '@/lib/rag/services/rag-retrieval-service';
import type {
  GoldenSetItem,
  TestResult,
  QueryDiagnostics,
  PreflightResult,
  PreflightCheck,
} from './golden-set-definitions';

// ---- Pre-Flight Checks ----

export async function runPreflightChecks(documentId: string): Promise<PreflightResult> {
  const checks: PreflightCheck[] = [];

  // Check 1: Document exists and is ready
  try {
    const supabase = createServerSupabaseAdminClient();
    const { data: doc, error } = await supabase
      .from('rag_documents')
      .select('id, status, file_name, knowledge_base_id')
      .eq('id', documentId)
      .single();

    if (error || !doc) {
      checks.push({
        name: 'Document Exists',
        passed: false,
        detail: `Document ${documentId.slice(0, 8)}... not found: ${error?.message || 'no data'}`,
        severity: 'critical',
      });
    } else {
      const statusOk = doc.status === 'ready';
      checks.push({
        name: 'Document Exists',
        passed: statusOk,
        detail: `${doc.file_name || 'unknown'} | status=${doc.status}`,
        severity: statusOk ? 'info' : 'critical',
      });

      // Check 6 (inline): Knowledge Base Link
      checks.push({
        name: 'Knowledge Base Link',
        passed: !!doc.knowledge_base_id,
        detail: doc.knowledge_base_id
          ? `knowledge_base_id: ${doc.knowledge_base_id.slice(0, 8)}...`
          : 'Document not linked to a knowledge base (may affect KB-wide search)',
        severity: doc.knowledge_base_id ? 'info' : 'warning',
      });
    }
  } catch (err) {
    checks.push({
      name: 'Document Exists',
      passed: false,
      detail: `DB connection error: ${err instanceof Error ? err.message : 'unknown'}`,
      severity: 'critical',
    });
  }

  // Check 2: Embeddings exist for this document
  try {
    const supabase = createServerSupabaseAdminClient();
    const { data: embeddings, error } = await supabase
      .from('rag_embeddings')
      .select('id, tier')
      .eq('document_id', documentId);

    if (error) {
      checks.push({
        name: 'Embeddings Exist',
        passed: false,
        detail: `Query error: ${error.message}`,
        severity: 'critical',
      });
    } else {
      const count = embeddings?.length || 0;
      // Count by tier
      const tier1 = embeddings?.filter(e => e.tier === 1).length || 0;
      const tier2 = embeddings?.filter(e => e.tier === 2).length || 0;
      const tier3 = embeddings?.filter(e => e.tier === 3).length || 0;

      checks.push({
        name: 'Embeddings Exist',
        passed: count > 0,
        detail: count > 0
          ? `${count} embeddings (tier1: ${tier1}, tier2: ${tier2}, tier3: ${tier3})`
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

  // Check 3: RPC function exists (match_rag_embeddings_kb)
  // We test by calling the RPC with a dummy zero vector and expecting it to return results or
  // a recognizable error (not "function does not exist")
  try {
    const supabase = createServerSupabaseAdminClient();
    const zeroVector = new Array(1536).fill(0);
    const { error } = await supabase.rpc('match_rag_embeddings_kb', {
      query_embedding: zeroVector,
      match_threshold: 0.99, // Very high threshold so it returns nothing
      match_count: 1,
      filter_knowledge_base_id: null,
      filter_document_id: documentId,
      filter_tier: null,
    });

    if (error && error.message.includes('does not exist')) {
      checks.push({
        name: 'RPC Function (match_rag_embeddings_kb)',
        passed: false,
        detail: 'RPC function not found in database',
        severity: 'critical',
      });
    } else {
      // Either succeeded or returned a non-critical error (like empty results)
      checks.push({
        name: 'RPC Function (match_rag_embeddings_kb)',
        passed: true,
        detail: error ? `RPC callable (returned: ${error.message.slice(0, 80)})` : 'RPC available and callable',
        severity: 'info',
      });
    }
  } catch (err) {
    checks.push({
      name: 'RPC Function (match_rag_embeddings_kb)',
      passed: false,
      detail: `RPC test error: ${err instanceof Error ? err.message : 'unknown'}`,
      severity: 'critical',
    });
  }

  // Check 4: Anthropic API key
  const anthropicKey = process.env.ANTHROPIC_API_KEY || '';
  checks.push({
    name: 'Anthropic API Key',
    passed: anthropicKey.length > 0,
    detail: anthropicKey.length > 0
      ? `ANTHROPIC_API_KEY set (${anthropicKey.slice(0, 7)}...${anthropicKey.slice(-4)})`
      : 'ANTHROPIC_API_KEY not set — Claude calls will fail',
    severity: anthropicKey.length > 0 ? 'info' : 'critical',
  });

  // Check 5: OpenAI API key (for embeddings)
  const openaiKey = process.env.OPENAI_API_KEY || '';
  checks.push({
    name: 'OpenAI API Key',
    passed: openaiKey.length > 0,
    detail: openaiKey.length > 0
      ? `OPENAI_API_KEY set (${openaiKey.slice(0, 5)}...${openaiKey.slice(-4)})`
      : 'OPENAI_API_KEY not set — embedding generation will fail',
    severity: openaiKey.length > 0 ? 'info' : 'critical',
  });

  // Determine overall pass: all critical checks must pass
  const hasCriticalFailure = checks.some(c => c.severity === 'critical' && !c.passed);

  return {
    passed: !hasCriticalFailure,
    checks,
  };
}

// ---- Per-Query Diagnostic Wrapper ----

function identifyErrorPhase(errorMessage: string): string {
  const msg = errorMessage.toLowerCase();
  if (msg.includes('similarity search') || msg.includes('embedding')) return 'embedding-search';
  if (msg.includes('hyde')) return 'hyde';
  if (msg.includes('response generation') || msg.includes('generateresponse')) return 'llm-response';
  if (msg.includes('self-eval') || msg.includes('selfevaluate')) return 'self-eval';
  if (msg.includes('failed to store') || msg.includes('insert')) return 'db-insert';
  if (msg.includes('rerank')) return 'reranking';
  if (msg.includes('text search') || msg.includes('tsvector')) return 'text-search';
  return 'unknown';
}

export async function runSingleTest(
  item: GoldenSetItem,
  userId: string,
  documentId: string,
): Promise<TestResult> {
  const startTime = Date.now();

  const emptyDiagnostics: QueryDiagnostics = {
    hydeGenerated: false,
    sectionsRetrieved: 0,
    factsRetrieved: 0,
    responseTimeMs: 0,
    errorStack: null,
    errorPhase: null,
  };

  try {
    const result = await queryRAG({
      queryText: item.question,
      documentId,
      userId,
      mode: 'rag_only',
    });

    const responseTimeMs = Date.now() - startTime;

    if (!result.success || !result.data) {
      // queryRAG returned { success: false } — this is a "soft" error
      return {
        item,
        passed: false,
        responseText: '',
        selfEvalScore: null,
        responseTimeMs,
        error: result.error || 'queryRAG returned success=false with no error message',
        diagnostics: {
          ...emptyDiagnostics,
          responseTimeMs,
          errorPhase: identifyErrorPhase(result.error || ''),
          errorStack: result.error || null,
        },
      };
    }

    // Extract data from the RAGQuery result
    const query = result.data;
    const responseText = query.responseText || '';
    const containsExpected = responseText.toLowerCase().includes(item.expectedAnswer.toLowerCase());

    return {
      item,
      passed: containsExpected,
      responseText: responseText.slice(0, 500),
      selfEvalScore: query.selfEvalScore ?? null,
      responseTimeMs,
      error: null,
      diagnostics: {
        hydeGenerated: !!query.hydeText,
        sectionsRetrieved: query.retrievedSectionIds?.length || 0,
        factsRetrieved: query.retrievedFactIds?.length || 0,
        responseTimeMs,
        errorStack: null,
        errorPhase: null,
      },
    };
  } catch (err) {
    const responseTimeMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack || errorMessage : errorMessage;

    return {
      item,
      passed: false,
      responseText: '',
      selfEvalScore: null,
      responseTimeMs,
      error: errorMessage,
      diagnostics: {
        ...emptyDiagnostics,
        responseTimeMs,
        errorStack,
        errorPhase: identifyErrorPhase(errorMessage),
      },
    };
  }
}
```

### Task 3: Create API Route

Create file: `src/app/api/rag/test/golden-set/route.ts`

```typescript
/**
 * Golden-Set Regression Test API
 * 
 * POST — Run the full 20-question golden-set test
 * GET  — Health check (returns test availability + count)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { runPreflightChecks, runSingleTest } from '@/lib/rag/testing/test-diagnostics';
import {
  GOLDEN_SET,
  CANONICAL_DOCUMENT_ID,
  TARGET_PASS_RATE,
} from '@/lib/rag/testing/golden-set-definitions';
import type { TestResult, TestRunSummary } from '@/lib/rag/testing/golden-set-definitions';

// Allow up to 5 minutes for 20 queries
export const maxDuration = 300;

export async function GET() {
  return NextResponse.json({
    available: true,
    testCount: GOLDEN_SET.length,
    targetPassRate: TARGET_PASS_RATE,
    documentId: CANONICAL_DOCUMENT_ID,
  });
}

export async function POST(request: NextRequest) {
  // Auth check
  const { user, response: authResponse } = await requireAuth(request);
  if (authResponse) return authResponse;

  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const startTime = Date.now();

  try {
    // Step 1: Pre-flight checks
    const preflight = await runPreflightChecks(CANONICAL_DOCUMENT_ID);

    if (!preflight.passed) {
      // Critical failure — return diagnostics without running queries
      const summary: TestRunSummary = {
        runId,
        startedAt,
        completedAt: new Date().toISOString(),
        totalDurationMs: Date.now() - startTime,
        preflight,
        totalPassed: 0,
        totalFailed: 0,
        totalErrored: 0,
        passRate: 0,
        meetsTarget: false,
        breakdown: {
          easy: { passed: 0, total: 5 },
          medium: { passed: 0, total: 9 },
          hard: { passed: 0, total: 6 },
        },
        avgResponseTimeMs: 0,
        avgSelfEvalScore: 0,
        results: [],
      };

      return NextResponse.json({ success: true, data: summary });
    }

    // Step 2: Run all 20 queries sequentially
    const results: TestResult[] = [];

    for (const item of GOLDEN_SET) {
      const result = await runSingleTest(item, user!.id, CANONICAL_DOCUMENT_ID);
      results.push(result);

      // 500ms delay between queries to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Step 3: Compute summary statistics
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

    const summary: TestRunSummary = {
      runId,
      startedAt,
      completedAt: new Date().toISOString(),
      totalDurationMs: Date.now() - startTime,
      preflight,
      totalPassed,
      totalFailed,
      totalErrored,
      passRate,
      meetsTarget: passRate >= TARGET_PASS_RATE,
      breakdown: {
        easy: {
          passed: easyResults.filter(r => r.passed).length,
          total: easyResults.length,
        },
        medium: {
          passed: mediumResults.filter(r => r.passed).length,
          total: mediumResults.length,
        },
        hard: {
          passed: hardResults.filter(r => r.passed).length,
          total: hardResults.length,
        },
      },
      avgResponseTimeMs,
      avgSelfEvalScore,
      results,
    };

    return NextResponse.json({ success: true, data: summary });
  } catch (err) {
    console.error('[Golden-Set Test] Fatal error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Test runner crashed',
      },
      { status: 500 }
    );
  }
}
```

### Task 4: Create Test UI Page

Create file: `src/app/(dashboard)/rag/test/page.tsx`

This is a `'use client'` page. It uses Shadcn/UI components that already exist in `src/components/ui/`.

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import { useRouter } from 'next/navigation';
import type { TestRunSummary, TestResult, PreflightCheck } from '@/lib/rag/testing/golden-set-definitions';

export default function GoldenSetTestPage() {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<TestRunSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'results' | 'diagnostics'>('results');

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runTest = async () => {
    setIsRunning(true);
    setSummary(null);
    setError(null);
    setExpandedItems(new Set());

    try {
      const res = await fetch('/api/rag/test/golden-set', { method: 'POST' });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || `HTTP ${res.status}`);
        return;
      }

      setSummary(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsRunning(false);
    }
  };

  const erroredResults = summary?.results.filter(r => r.error !== null) || [];
  const errorsByPhase = erroredResults.reduce<Record<string, number>>((acc, r) => {
    const phase = r.diagnostics.errorPhase || 'unknown';
    acc[phase] = (acc[phase] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bug className="h-6 w-6" />
            <div>
              <h1 className="text-2xl font-bold">RAG Golden-Set Regression Test</h1>
              <p className="text-sm text-muted-foreground">
                20 Q&A pairs against Sun Chip Bank document. Target: ≥85% pass rate.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/rag')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              RAG
            </Button>
            <Button onClick={runTest} disabled={isRunning}>
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Test
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Running indicator */}
        {isRunning && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <span className="text-sm">Running golden-set test... This may take 2-5 minutes.</span>
              </div>
              <Progress value={undefined} className="mt-3" />
            </CardContent>
          </Card>
        )}

        {/* Error display */}
        {error && (
          <Card className="border-red-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="h-5 w-5" />
                <span className="font-medium">Test Failed</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Pre-flight Checks */}
        {summary && (
          <PreflightPanel checks={summary.preflight.checks} passed={summary.preflight.passed} />
        )}

        {/* Summary Card */}
        {summary && summary.results.length > 0 && (
          <SummaryCard summary={summary} />
        )}

        {/* Tab bar: Results / Diagnostics */}
        {summary && summary.results.length > 0 && (
          <>
            <div className="flex gap-2 border-b">
              <button
                onClick={() => setActiveTab('results')}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                  activeTab === 'results'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                All Results ({summary.results.length})
              </button>
              {erroredResults.length > 0 && (
                <button
                  onClick={() => setActiveTab('diagnostics')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                    activeTab === 'diagnostics'
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Bug className="h-3 w-3 inline mr-1" />
                  Errors ({erroredResults.length})
                </button>
              )}
            </div>

            {activeTab === 'results' && (
              <div className="space-y-2">
                {summary.results.map(result => (
                  <ResultRow
                    key={result.item.id}
                    result={result}
                    expanded={expandedItems.has(result.item.id)}
                    onToggle={() => toggleExpand(result.item.id)}
                  />
                ))}
              </div>
            )}

            {activeTab === 'diagnostics' && (
              <div className="space-y-4">
                {/* Error phase summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Error Breakdown by Phase</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(errorsByPhase).map(([phase, count]) => (
                        <div key={phase} className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                          <div className="text-sm font-mono font-medium text-red-700 dark:text-red-400">{phase}</div>
                          <div className="text-2xl font-bold text-red-600">{count}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Errored results */}
                <div className="space-y-2">
                  {erroredResults.map(result => (
                    <ResultRow
                      key={result.item.id}
                      result={result}
                      expanded={expandedItems.has(result.item.id)}
                      onToggle={() => toggleExpand(result.item.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---- Sub-Components ----

function PreflightPanel({ checks, passed }: { checks: PreflightCheck[]; passed: boolean }) {
  return (
    <Card className={passed ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {passed ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
          Pre-Flight Checks
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!passed && (
          <div className="mb-3 p-2 rounded bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-sm">
            Critical preflight check failed. Test cannot proceed until all critical checks pass.
          </div>
        )}
        <div className="space-y-2">
          {checks.map((check, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              {check.passed ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              ) : check.severity === 'warning' ? (
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <span className="font-medium">{check.name}</span>
                <span className="text-muted-foreground ml-2">{check.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryCard({ summary }: { summary: TestRunSummary }) {
  const borderColor = summary.meetsTarget
    ? 'border-green-300 dark:border-green-700'
    : 'border-red-300 dark:border-red-700';

  return (
    <Card className={borderColor}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Test Summary
          </span>
          <Badge variant={summary.meetsTarget ? 'default' : 'destructive'}>
            {summary.meetsTarget ? 'PASS' : 'FAIL'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatBlock label="Passed" value={summary.totalPassed} color="text-green-600" />
          <StatBlock label="Failed" value={summary.totalFailed} color="text-red-600" />
          <StatBlock label="Errored" value={summary.totalErrored} color="text-orange-600" />
          <StatBlock label="Pass Rate" value={`${summary.passRate}%`} color={summary.meetsTarget ? 'text-green-600' : 'text-red-600'} />
          <StatBlock label="Avg Time" value={`${Math.round(summary.avgResponseTimeMs / 1000)}s`} />
          <StatBlock label="Avg Self-Eval" value={`${Math.round(summary.avgSelfEvalScore * 100)}%`} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <DifficultyBlock label="Easy" passed={summary.breakdown.easy.passed} total={summary.breakdown.easy.total} />
          <DifficultyBlock label="Medium" passed={summary.breakdown.medium.passed} total={summary.breakdown.medium.total} />
          <DifficultyBlock label="Hard" passed={summary.breakdown.hard.passed} total={summary.breakdown.hard.total} />
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Duration: {Math.round(summary.totalDurationMs / 1000)}s | Run ID: {summary.runId.slice(0, 8)}...
        </p>
      </CardContent>
    </Card>
  );
}

function StatBlock({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${color || ''}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function DifficultyBlock({ label, passed, total }: { label: string; passed: number; total: number }) {
  const rate = total > 0 ? Math.round((passed / total) * 100) : 0;
  return (
    <div className="p-2 rounded-lg bg-muted/50 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold">{passed}/{total}</div>
      <div className="text-xs text-muted-foreground">{rate}%</div>
    </div>
  );
}

function ResultRow({ result, expanded, onToggle }: { result: TestResult; expanded: boolean; onToggle: () => void }) {
  const difficultyColors: Record<string, string> = {
    easy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    hard: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <Card className="overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors"
      >
        {result.error ? (
          <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
        ) : result.passed ? (
          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
        )}
        <span className="text-sm flex-1 truncate">{result.item.question}</span>
        <Badge variant="outline" className={`text-xs ${difficultyColors[result.item.difficulty] || ''}`}>
          {result.item.difficulty}
        </Badge>
        <span className="text-xs text-muted-foreground w-16 text-right">
          {Math.round(result.responseTimeMs / 1000)}s
        </span>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Expected substring: </span>
              <code className="bg-muted px-1 rounded">{result.item.expectedAnswer}</code>
            </div>
            <div>
              <span className="text-muted-foreground">Self-eval: </span>
              {result.selfEvalScore !== null
                ? `${Math.round(result.selfEvalScore * 100)}%`
                : 'N/A'}
            </div>
          </div>

          {result.responseText && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Response (first 500 chars):</div>
              <div className="text-sm p-2 rounded bg-muted/50 whitespace-pre-wrap max-h-40 overflow-y-auto">
                {result.responseText}
              </div>
            </div>
          )}

          {/* Diagnostics */}
          <div className="text-xs space-y-1 p-2 rounded bg-muted/30">
            <div className="font-medium text-muted-foreground mb-1">Diagnostics</div>
            <div>HyDE generated: {result.diagnostics.hydeGenerated ? 'yes' : 'no'}</div>
            <div>Sections retrieved: {result.diagnostics.sectionsRetrieved}</div>
            <div>Facts retrieved: {result.diagnostics.factsRetrieved}</div>
            {result.diagnostics.errorPhase && (
              <div className="text-red-600 font-medium">
                Error phase: {result.diagnostics.errorPhase}
              </div>
            )}
          </div>

          {/* Error stack (collapsible) */}
          {result.diagnostics.errorStack && (
            <details className="text-xs">
              <summary className="cursor-pointer text-red-600 font-medium">
                Error Stack Trace
              </summary>
              <pre className="mt-1 p-2 rounded bg-red-50 dark:bg-red-950/20 overflow-x-auto text-red-700 dark:text-red-400 whitespace-pre-wrap">
                {result.diagnostics.errorStack}
              </pre>
            </details>
          )}
        </div>
      )}
    </Card>
  );
}
```

### Task 5: Verify Implementation

After creating all 4 files, run these verification steps:

```bash
# 1. TypeScript compilation check
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && npx tsc --noEmit

# 2. Verify dev server starts (should already be running)
# Navigate to http://localhost:3000/rag/test in browser

# 3. Health check endpoint
curl http://localhost:3000/api/rag/test/golden-set

# 4. If compilation errors, fix them before proceeding
```

**Expected compilation issues to watch for:**
- Type `RAGQuery` must have the fields `hydeText`, `retrievedSectionIds`, `retrievedFactIds`, `selfEvalScore`, `responseText`. Check `src/types/rag.ts` to confirm these exist.
- If `RAGQuery` uses different field names (e.g., `hyde_text` vs `hydeText`), update `test-diagnostics.ts` to match.

---

## Success Criteria

- [ ] All 4 files created at the specified paths
- [ ] TypeScript compiles with `npx tsc --noEmit` — zero errors
- [ ] `/rag/test` page loads in browser without console errors
- [ ] Clicking "Run Test" triggers pre-flight checks and displays results
- [ ] Pre-flight catches missing API keys (test by temporarily unsetting one)
- [ ] Pre-flight catches wrong document ID (test with a fake UUID)
- [ ] Each failed/errored query shows `errorPhase` and `errorStack`
- [ ] Summary shows pass rate, difficulty breakdown, and avg metrics

---

## Files Created

| File | LOC (approx) | Purpose |
|------|------------|---------|
| `src/lib/rag/testing/golden-set-definitions.ts` | ~180 | Types, 20 Q&A pairs, constants |
| `src/lib/rag/testing/test-diagnostics.ts` | ~200 | Pre-flight checks + per-query wrapper |
| `src/app/api/rag/test/golden-set/route.ts` | ~120 | API: POST runs test, GET health check |
| `src/app/(dashboard)/rag/test/page.tsx` | ~350 | Full test UI with results + diagnostics |

---

**END OF E06 PROMPT**
