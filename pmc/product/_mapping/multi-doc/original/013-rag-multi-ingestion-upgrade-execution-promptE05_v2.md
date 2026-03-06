# 013 — RAG Multi-Pass Ingestion Upgrade: Execution Prompt E05

**Section:** E05 — Phase 4 Operational Polish + Duplicate Cleanup + Golden-Set Regression Test  
**Version:** 2.0  
**Date:** February 17, 2026  
**Prerequisites:** E01 (Schema, Types, Config, Interface, Mappers) + E02 (6 Claude Methods) + E03 (Ingestion Service, Inngest Pipeline) + E04 (Multi-Doc Retrieval, Retrieval Quality) complete  
**Builds Upon:** E01, E02, E03 & E04  
**Final Section** — completes the entire multi-pass RAG upgrade

---

## v2 Notes — Changes From v1

> [!IMPORTANT]
> **6 discrepancies corrected from v1 after cross-referencing with the codebase post-E04:**

1. **Migration/script `require` paths fixed.** v1 used `require('dotenv').config({ path: '../.env.local' })` and `require('.')` — incorrect because the file lives in `scripts/migrations/` not `supa-agent-ops/`. Fixed to use `path.resolve(__dirname, ...)` pattern (matching migration 001 and 002).
2. **Auth pattern corrected.** v1 used `getServerSession` from `@/lib/auth` — this does NOT exist in the codebase. The project uses `requireAuth` from `@/lib/supabase-server` (confirmed in existing `src/app/api/rag/query/route.ts`).
3. **RAGQuery type/row/mapper updated.** v1 did not include the type system changes needed for feedback. Added explicit Task 1.5 to add `userFeedback` and `feedbackAt` to `RAGQuery` interface, `RAGQueryRow`, and `mapRowToQuery()`.
4. **RAGChat component identified.** v1 said "search for it." It is definitively `src/components/rag/RAGChat.tsx` — confirmed by grep. Exact line numbers and insertion points are specified. Uses `lucide-react` icons (ThumbsUp/ThumbsDown available). Needs `cn` import from `@/lib/utils`.
5. **Golden-set test restructured.** v1 used `import { queryRAG } from '@/lib/rag/services/rag-retrieval-service'` — `@/` aliases don't resolve in CLI-executed scripts. Replaced with HTTP API calls to `/api/rag/query` which does work from Node.js scripts.
6. **Cleanup script `require` paths fixed.** Same pattern fix as #1.

---

## Overview

This prompt implements the final operational polish: confidence display in the chat UI, user feedback (thumbs up/down), a query analytics dashboard API, the duplicate Sun Chip document cleanup script, and the golden-set regression test suite.

**What This Section Creates / Modifies:**
1. `scripts/migrations/003-feedback.js` — SAOL migration: `user_feedback` + `feedback_at` on `rag_queries`
2. `src/types/rag.ts` — Add `userFeedback` + `feedbackAt` to RAGQuery interface and RAGQueryRow
3. `src/lib/rag/services/rag-db-mappers.ts` — Map new feedback fields in `mapRowToQuery()`
4. `src/components/rag/RAGChat.tsx` — Add confidence display + thumbs up/down UI
5. `src/app/api/rag/feedback/route.ts` — NEW: API route for submitting feedback
6. `src/app/api/rag/dashboard/route.ts` — NEW: API route for query analytics dashboard
7. `scripts/cleanup-duplicate-documents.js` — NEW: Archive duplicate Sun Chip documents
8. `scripts/golden-set-test.js` — NEW: 20-item Q&A regression test suite (plain JS, uses HTTP API)

**What This Section Does NOT Create:**
- No changes to ingestion pipeline (E03)
- No changes to retrieval pipeline (E04)
- No changes to LLM config (E01)

---

========================    


## Prompt E05: Phase 4 Operational Polish + Duplicate Cleanup + Golden-Set Regression Test

You are implementing the final operational polish for a 6-pass RAG extraction system. This is E05 — the final part of a 5-part implementation.

**Target Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\`

### Prerequisites — What E01-E04 Built

**E01:** Schema migrations (001), types, config, LLM interface, DB mappers — all with provenance fields.
**E02:** 6 Claude extraction methods in `claude-llm-provider.ts`.
**E03:** Ingestion service helpers, 12-step Inngest pipeline, `buildEnrichedEmbeddingText()`.
**E04:** Migration 002 (KB-wide search), hybrid search, Haiku reranking, dedup, balanced coverage, conversation context, improved not-found responses.

After E04, the full pipeline is:
- Documents → 6-pass extraction → enriched 3-tier embeddings
- Queries → HyDE → hybrid vector+text search → rerank → dedup → balance → response + self-eval

This prompt adds the operational and quality assurance layer on top.

### Critical Rules

1. **Read files before modifying.** Read any UI component or API route before changing it.
2. **ALL database operations use the admin Supabase client:** `createServerSupabaseAdminClient()`.
3. **ALL database DDL uses SAOL:** `agentExecuteDDL()` via `require(saolDir)` with `transport: 'pg'`.
4. **ALL auth** in API routes uses: `import { requireAuth } from '@/lib/supabase-server'` → `const { user, response } = await requireAuth(request); if (response) return response;`
5. **UI components** follow the existing patterns in `src/components/` — Shadcn/UI, Tailwind, React Query v5, `lucide-react` icons.
6. **Scripts** in `scripts/` use `path.resolve(__dirname, ...)` for require paths (see migration 001/002 for pattern).

---

### Task 1: Create Migration 3 — Feedback Columns

**File:** `scripts/migrations/003-feedback.js`

Create this NEW file:

```javascript
/**
 * Migration 003: Query Feedback Support
 *
 * Adds user_feedback and feedback_at columns to rag_queries
 * for thumbs up/down tracking.
 *
 * Usage:
 *   cd supa-agent-ops && node ../scripts/migrations/003-feedback.js
 */

const path = require('path');
const saolDir = path.resolve(__dirname, '../../supa-agent-ops');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });
const saol = require(saolDir);

const MIGRATION_SQL = `
  -- Add feedback columns to rag_queries
  ALTER TABLE rag_queries ADD COLUMN IF NOT EXISTS user_feedback TEXT;
  -- Values: 'positive', 'negative', null
  ALTER TABLE rag_queries ADD COLUMN IF NOT EXISTS feedback_at TIMESTAMPTZ;

  -- Index for dashboard queries
  CREATE INDEX IF NOT EXISTS idx_rag_queries_feedback
    ON rag_queries (user_feedback)
    WHERE user_feedback IS NOT NULL;
`;

(async () => {
  console.log('Migration 003: Query Feedback Support');
  console.log('=====================================');

  // Dry run first
  const dryRun = await saol.agentExecuteDDL({
    sql: MIGRATION_SQL,
    dryRun: true,
    transaction: true,
    transport: 'pg'
  });

  console.log('Dry-run:', dryRun.success ? 'PASS' : 'FAIL');
  if (!dryRun.success) {
    console.error('Dry-run failed:', dryRun.summary);
    process.exit(1);
  }

  // Execute
  const result = await saol.agentExecuteDDL({
    sql: MIGRATION_SQL,
    dryRun: false,
    transaction: true,
    transport: 'pg'
  });

  console.log('Migration:', result.success ? 'SUCCESS' : 'FAILED');
  console.log('Summary:', result.summary);

  // Verify
  const check = await saol.agentIntrospectSchema({
    table: 'rag_queries',
    includeColumns: true,
    transport: 'pg'
  });
  const cols = check.tables?.[0]?.columns?.map(c => c.name) || [];
  console.log('\nVerification:');
  console.log('  user_feedback:', cols.includes('user_feedback') ? '✓' : '✗');
  console.log('  feedback_at:', cols.includes('feedback_at') ? '✓' : '✗');
})();
```

**Run the migration:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node ../scripts/migrations/003-feedback.js
```

---

### Task 1.5: Update Type System + DB Mapper for Feedback Fields

The migration adds columns but the TypeScript types and mappers need updating too.

#### 1.5a Modify `src/types/rag.ts`

**Add to `RAGQuery` interface** (after `responseTimeMs` on line 202):

```typescript
  userFeedback: 'positive' | 'negative' | null;
  feedbackAt: string | null;
```

**Add to `RAGQueryRow` interface** (after `response_time_ms` on line 618):

```typescript
  user_feedback: string | null;
  feedback_at: string | null;
```

#### 1.5b Modify `src/lib/rag/services/rag-db-mappers.ts`

**Add to `mapRowToQuery()` function** (after `responseTimeMs: row.response_time_ms,` on line 168):

```typescript
    userFeedback: (row.user_feedback as 'positive' | 'negative' | null) || null,
    feedbackAt: row.feedback_at,
```

---

### Task 2: Add Confidence Display + Feedback to RAGChat

**File:** `src/components/rag/RAGChat.tsx`

Read this file first. It renders the chat messages at line 139-186, with the response text at line 157 and self-eval score at line 160-164.

#### 2.1 Add imports

Add to the existing `lucide-react` import on line 7:

```typescript
import { Loader2, Send, MessageCircle, Bot, User, BarChart3, Cpu, ThumbsUp, ThumbsDown } from 'lucide-react';
```

Add `cn` import:

```typescript
import { cn } from '@/lib/utils';
```

#### 2.2 Add `getConfidenceDisplay()` helper + `submitFeedback()` handler

Add these functions inside the `RAGChat` component, after the `handleKeyDown` function (line ~81):

```typescript
  function getConfidenceDisplay(score: number | null): {
    label: string;
    color: 'green' | 'amber' | 'red' | '';
    showBadge: boolean;
  } {
    if (score === null) return { label: '', color: '', showBadge: false };
    if (score > 0.8) return { label: '', color: 'green', showBadge: false };
    if (score >= 0.5) return {
      label: 'Based on available information...',
      color: 'amber',
      showBadge: true,
    };
    return {
      label: "I couldn't find a confident answer. Here's what I found...",
      color: 'red',
      showBadge: true,
    };
  }

  async function submitFeedback(queryId: string, feedback: 'positive' | 'negative') {
    try {
      const res = await fetch('/api/rag/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryId, feedback }),
      });
      if (res.ok) {
        toast.success(feedback === 'positive' ? 'Thanks for the feedback!' : 'Thanks — we\'ll work on improving.');
      }
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    }
  }
```

#### 2.3 Add Confidence Qualifier + Thumbs Up/Down UI

In the JSX, **before** the response text on line 157, insert the confidence qualifier:

```tsx
                  {/* Confidence qualifier */}
                  {(() => {
                    const confidence = getConfidenceDisplay(query.selfEvalScore);
                    if (!confidence.showBadge) return null;
                    return (
                      <div className={cn(
                        'mb-2 px-3 py-1.5 rounded-md text-sm font-medium',
                        confidence.color === 'amber' && 'bg-amber-50 text-amber-700 border border-amber-200',
                        confidence.color === 'red' && 'bg-red-50 text-red-700 border border-red-200',
                      )}>
                        {confidence.label}
                      </div>
                    );
                  })()}
```

**After** the existing self-eval and Evaluate button section (inside the footer `<div>` at line 159), add the feedback buttons. Insert **before** the `responseTimeMs` span (line 177):

```tsx
                    {/* Feedback buttons */}
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => submitFeedback(query.id, 'positive')}
                        className={cn(
                          'p-1 rounded-md hover:bg-green-50 transition-colors',
                          query.userFeedback === 'positive' && 'bg-green-100 text-green-700',
                        )}
                        title="Helpful"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => submitFeedback(query.id, 'negative')}
                        className={cn(
                          'p-1 rounded-md hover:bg-red-50 transition-colors',
                          query.userFeedback === 'negative' && 'bg-red-100 text-red-700',
                        )}
                        title="Not helpful"
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
```

---

### Task 3: Create Feedback API Route

**File:** `src/app/api/rag/feedback/route.ts`

Create this NEW file:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const { queryId, feedback } = await request.json();

    if (!queryId) {
      return NextResponse.json({ success: false, error: 'queryId is required' }, { status: 400 });
    }

    if (!feedback || !['positive', 'negative'].includes(feedback)) {
      return NextResponse.json(
        { success: false, error: 'feedback must be "positive" or "negative"' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseAdminClient();

    // Verify the query belongs to this user
    const { data: queryRow, error: fetchError } = await supabase
      .from('rag_queries')
      .select('id, user_id')
      .eq('id', queryId)
      .single();

    if (fetchError || !queryRow) {
      return NextResponse.json({ success: false, error: 'Query not found' }, { status: 404 });
    }

    if (queryRow.user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // Update feedback
    const { error: updateError } = await supabase
      .from('rag_queries')
      .update({
        user_feedback: feedback,
        feedback_at: new Date().toISOString(),
      })
      .eq('id', queryId);

    if (updateError) {
      console.error('[RAG Feedback] Error updating feedback:', updateError);
      return NextResponse.json({ success: false, error: 'Failed to save feedback' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[RAG Feedback] Error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
```

---

### Task 4: Create Dashboard API Route

**File:** `src/app/api/rag/dashboard/route.ts`

Create this NEW file:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const supabase = createServerSupabaseAdminClient();
    const userId = user.id;

    // 1. Total queries and average self-eval score
    const { data: statsRows } = await supabase
      .from('rag_queries')
      .select('self_eval_score, mode, user_feedback, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(500);

    const stats = statsRows || [];
    const totalQueries = stats.length;

    const scoresWithValues = stats.filter(s => s.self_eval_score !== null);
    const avgScore = scoresWithValues.length > 0
      ? scoresWithValues.reduce((sum, s) => sum + (s.self_eval_score || 0), 0) / scoresWithValues.length
      : null;

    // 2. Mode breakdown
    const modeBreakdown: Record<string, number> = {};
    for (const s of stats) {
      const mode = s.mode || 'rag_only';
      modeBreakdown[mode] = (modeBreakdown[mode] || 0) + 1;
    }

    // 3. Feedback summary
    const feedbackSummary = {
      positive: stats.filter(s => s.user_feedback === 'positive').length,
      negative: stats.filter(s => s.user_feedback === 'negative').length,
      none: stats.filter(s => !s.user_feedback).length,
    };

    // 4. Score trend (last 7 days, daily averages)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentStats = stats.filter(s => new Date(s.created_at) >= sevenDaysAgo);

    const dailyScores: Record<string, { total: number; count: number }> = {};
    for (const s of recentStats) {
      if (s.self_eval_score === null) continue;
      const day = new Date(s.created_at).toISOString().split('T')[0];
      if (!dailyScores[day]) dailyScores[day] = { total: 0, count: 0 };
      dailyScores[day].total += s.self_eval_score;
      dailyScores[day].count += 1;
    }

    const scoreTrend = Object.entries(dailyScores)
      .map(([date, { total, count }]) => ({
        date,
        avgScore: Math.round((total / count) * 100) / 100,
        queryCount: count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 5. Confidence distribution
    const confidenceDistribution = {
      high: scoresWithValues.filter(s => (s.self_eval_score || 0) > 0.8).length,
      medium: scoresWithValues.filter(s => (s.self_eval_score || 0) >= 0.5 && (s.self_eval_score || 0) <= 0.8).length,
      low: scoresWithValues.filter(s => (s.self_eval_score || 0) < 0.5).length,
    };

    return NextResponse.json({
      success: true,
      data: {
        totalQueries,
        averageSelfEvalScore: avgScore ? Math.round(avgScore * 100) / 100 : null,
        modeBreakdown,
        feedbackSummary,
        scoreTrend,
        confidenceDistribution,
      },
    });
  } catch (err) {
    console.error('[RAG Dashboard] Error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
```

---

### Task 5: Create Duplicate Cleanup Script

**File:** `scripts/cleanup-duplicate-documents.js`

Create this NEW file:

```javascript
/**
 * Cleanup Duplicate Sun Chip Documents
 *
 * The database currently has ~6 duplicate Sun Chip Bank documents.
 * Keep only ceff906e (the one with the most facts: 109).
 * Archives the rest (sets status='archived') and deletes their embeddings.
 *
 * Usage:
 *   cd supa-agent-ops && node ../scripts/cleanup-duplicate-documents.js
 */

const path = require('path');
const saolDir = path.resolve(__dirname, '../supa-agent-ops');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const saol = require(saolDir);

const KEEP_DOCUMENT_ID = 'ceff906e-968a-416f-90a6-df2422519d2b';

(async () => {
  console.log('Duplicate Document Cleanup');
  console.log('==========================\n');

  // Find all Sun Chip documents
  const result = await saol.agentQuery({
    table: 'rag_documents',
    select: 'id,file_name,status,section_count,fact_count',
    where: [
      { column: 'file_name', operator: 'ilike', value: '%Sun%Chip%' }
    ],
    transport: 'pg',
  });

  if (!result.success || !result.data) {
    console.error('Failed to query documents:', result.error);
    process.exit(1);
  }

  console.log(`Found ${result.data.length} Sun Chip documents:\n`);
  for (const doc of result.data) {
    const isKeep = doc.id === KEEP_DOCUMENT_ID;
    console.log(`  ${isKeep ? '✓ KEEP   ' : '✗ ARCHIVE'} ${doc.id.slice(0, 8)}... | status=${doc.status} | sections=${doc.section_count || 0} | facts=${doc.fact_count || 0} | ${doc.file_name}`);
  }

  // Identify duplicates
  const duplicateIds = result.data
    .filter(d => d.id !== KEEP_DOCUMENT_ID)
    .map(d => d.id);

  if (duplicateIds.length === 0) {
    console.log('\nNo duplicates to archive. All clean!');
    return;
  }

  console.log(`\nArchiving ${duplicateIds.length} duplicate documents...\n`);

  for (const id of duplicateIds) {
    // Archive the document (don't delete — preserves audit trail)
    const archiveResult = await saol.agentExecuteSQL({
      sql: `UPDATE rag_documents SET status = 'archived' WHERE id = '${id}'`,
      transport: 'pg',
      transaction: true,
    });

    if (!archiveResult.success) {
      console.error(`  ✗ Failed to archive ${id.slice(0, 8)}:`, archiveResult.error);
      continue;
    }

    // Delete embeddings for archived documents (saves storage + prevents stale search results)
    const embedResult = await saol.agentExecuteSQL({
      sql: `DELETE FROM rag_embeddings WHERE document_id = '${id}'`,
      transport: 'pg',
      transaction: true,
    });

    const deletedCount = embedResult.rowCount || 0;
    console.log(`  ✓ Archived ${id.slice(0, 8)} — deleted ${deletedCount} embeddings`);
  }

  // Verify final state
  console.log('\n--- Verification ---');
  const verifyResult = await saol.agentQuery({
    table: 'rag_documents',
    select: 'id,status,fact_count',
    where: [
      { column: 'file_name', operator: 'ilike', value: '%Sun%Chip%' }
    ],
    transport: 'pg',
  });

  if (verifyResult.success) {
    const active = verifyResult.data.filter(d => d.status !== 'archived');
    const archived = verifyResult.data.filter(d => d.status === 'archived');
    console.log(`  Active documents: ${active.length}`);
    console.log(`  Archived documents: ${archived.length}`);
    if (active.length === 1 && active[0].id === KEEP_DOCUMENT_ID) {
      console.log('\n✓ Cleanup complete — only the canonical document remains active.');
    } else {
      console.log('\n⚠ Unexpected state — please verify manually.');
    }
  }
})();
```

---

### Task 6: Create Golden-Set Regression Test

**File:** `scripts/golden-set-test.js`

> [!IMPORTANT]
> This is a **plain JavaScript** file (not TypeScript) because it runs from the CLI where `@/` path aliases don't resolve. It calls the RAG API over HTTP instead of importing service functions directly. This requires the dev server to be running.

Create this NEW file:

```javascript
/**
 * Golden-Set Regression Test for RAG Pipeline
 *
 * 20 Q&A pairs from the Sun Chip Bank document.
 * Run after every ingestion or retrieval change to catch regressions.
 *
 * Prerequisites: Dev server must be running (npm run dev)
 *
 * Usage:
 *   node scripts/golden-set-test.js
 *
 * Expected: 85%+ pass rate (17/20 minimum)
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const KEEP_DOCUMENT_ID = 'ceff906e-968a-416f-90a6-df2422519d2b';

// We need a session cookie for auth — get it from the browser or provide a test token
// For CI, set RAG_TEST_COOKIE env var
const AUTH_COOKIE = process.env.RAG_TEST_COOKIE || '';

// ============================================
// Golden Set Definition
// ============================================

const GOLDEN_SET = [
  // ---- Easy: Direct rule lookup (should always pass) ----
  {
    question: 'What is the DTI limit for jumbo mortgages?',
    expectedAnswer: '43%',
    difficulty: 'easy',
  },
  {
    question: 'What is the minimum FICO score for conventional loans?',
    expectedAnswer: '620',
    difficulty: 'easy',
  },
  {
    question: 'What are the wire transfer cutoff times?',
    expectedAnswer: 'cutoff',
    difficulty: 'easy',
  },
  {
    question: 'What is the maximum cash deposit without enhanced due diligence?',
    expectedAnswer: '10,000',
    difficulty: 'easy',
  },
  {
    question: 'What is the FDIC insurance coverage limit?',
    expectedAnswer: '250,000',
    difficulty: 'easy',
  },

  // ---- Medium: Rule + Exception combinations ----
  {
    question: 'Can the DTI limit be exceeded for jumbo mortgages?',
    expectedAnswer: '45%',
    difficulty: 'medium',
  },
  {
    question: 'Are there any exceptions to the minimum down payment requirement?',
    expectedAnswer: 'exception',
    difficulty: 'medium',
  },
  {
    question: 'What happens when a wire transfer is flagged for review?',
    expectedAnswer: 'escalat',
    difficulty: 'medium',
  },
  {
    question: 'What are the escalation levels for BSA/AML alerts?',
    expectedAnswer: 'compliance',
    difficulty: 'medium',
  },
  {
    question: 'What documents are needed for a jumbo mortgage application?',
    expectedAnswer: 'tax',
    difficulty: 'medium',
  },

  // ---- Medium: Definition and glossary lookups ----
  {
    question: 'What does DTI stand for in lending context?',
    expectedAnswer: 'debt-to-income',
    difficulty: 'medium',
  },
  {
    question: 'What is the definition of a jumbo mortgage?',
    expectedAnswer: 'conforming',
    difficulty: 'medium',
  },

  // ---- Medium: Table data retrieval ----
  {
    question: 'What are the fee tiers for different account types?',
    expectedAnswer: 'fee',
    difficulty: 'medium',
  },
  {
    question: 'What interest rates apply to certificates of deposit?',
    expectedAnswer: 'rate',
    difficulty: 'medium',
  },

  // ---- Hard: Cross-section synthesis ----
  {
    question: 'What documents do I need to open an account?',
    expectedAnswer: 'identification',
    difficulty: 'hard',
  },
  {
    question: 'Compare the lending requirements for conventional vs jumbo mortgages',
    expectedAnswer: 'jumbo',
    difficulty: 'hard',
  },
  {
    question: 'What audit requirements apply to wire transfers over $50,000?',
    expectedAnswer: 'audit',
    difficulty: 'hard',
  },
  {
    question: 'What are all the circumstances that require manager approval?',
    expectedAnswer: 'approv',
    difficulty: 'hard',
  },
  {
    question: 'How do the compliance requirements differ between domestic and international wire transfers?',
    expectedAnswer: 'international',
    difficulty: 'hard',
  },
  {
    question: 'What are the complete steps for processing a mortgage application from start to finish?',
    expectedAnswer: 'appraisal',
    difficulty: 'hard',
  },
];

// ============================================
// Test Runner
// ============================================

async function queryRAGViaAPI(question) {
  const res = await fetch(`${BASE_URL}/api/rag/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(AUTH_COOKIE ? { Cookie: AUTH_COOKIE } : {}),
    },
    body: JSON.stringify({
      queryText: question,
      documentId: KEEP_DOCUMENT_ID,
      mode: 'rag_only',
    }),
  });

  if (!res.ok) {
    throw new Error(`API returned ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

async function runGoldenSetTest() {
  console.log('========================================');
  console.log('  Golden-Set Regression Test');
  console.log('  RAG Multi-Pass Pipeline');
  console.log('========================================\n');

  const results = [];
  let passed = 0;
  let failed = 0;

  for (let i = 0; i < GOLDEN_SET.length; i++) {
    const item = GOLDEN_SET[i];
    const startTime = Date.now();

    try {
      const result = await queryRAGViaAPI(item.question);
      const responseTimeMs = Date.now() - startTime;
      const responseText = result.data?.responseText || result.data?.response_text || '';
      const selfEvalScore = result.data?.selfEvalScore ?? result.data?.self_eval_score ?? null;
      const containsExpected = responseText.toLowerCase().includes(item.expectedAnswer.toLowerCase());

      results.push({
        question: item.question,
        difficulty: item.difficulty,
        passed: containsExpected,
        expectedAnswer: item.expectedAnswer,
        actualResponse: responseText.slice(0, 200),
        selfEvalScore,
        responseTimeMs,
      });

      if (containsExpected) {
        passed++;
        console.log(`  ✓ [${item.difficulty.padEnd(6)}] ${item.question}`);
        if (selfEvalScore !== null) {
          console.log(`    Score: ${(selfEvalScore * 100).toFixed(0)}% | ${responseTimeMs}ms`);
        }
      } else {
        failed++;
        console.log(`  ✗ [${item.difficulty.padEnd(6)}] ${item.question}`);
        console.log(`    Expected: "${item.expectedAnswer}"`);
        console.log(`    Got: "${responseText.slice(0, 150)}..."`);
        if (selfEvalScore !== null) {
          console.log(`    Score: ${(selfEvalScore * 100).toFixed(0)}% | ${responseTimeMs}ms`);
        }
      }
    } catch (err) {
      failed++;
      console.log(`  ✗ [${item.difficulty.padEnd(6)}] ${item.question}`);
      console.log(`    ERROR: ${err.message}`);

      results.push({
        question: item.question,
        difficulty: item.difficulty,
        passed: false,
        expectedAnswer: item.expectedAnswer,
        actualResponse: `ERROR: ${err.message}`,
        selfEvalScore: null,
        responseTimeMs: Date.now() - startTime,
      });
    }

    // Small delay between queries to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // ============================================
  // Summary Report
  // ============================================
  const total = passed + failed;
  const rate = ((passed / total) * 100).toFixed(1);

  const easyPassed = results.filter(r => r.difficulty === 'easy' && r.passed).length;
  const easyTotal = results.filter(r => r.difficulty === 'easy').length;
  const mediumPassed = results.filter(r => r.difficulty === 'medium' && r.passed).length;
  const mediumTotal = results.filter(r => r.difficulty === 'medium').length;
  const hardPassed = results.filter(r => r.difficulty === 'hard' && r.passed).length;
  const hardTotal = results.filter(r => r.difficulty === 'hard').length;

  const avgResponseTime = results.reduce((sum, r) => sum + r.responseTimeMs, 0) / results.length;
  const scoresWithValues = results.filter(r => r.selfEvalScore !== null);
  const avgSelfEval = scoresWithValues.length > 0
    ? scoresWithValues.reduce((sum, r) => sum + (r.selfEvalScore || 0), 0) / scoresWithValues.length
    : 0;

  console.log('\n========================================');
  console.log('  RESULTS');
  console.log('========================================');
  console.log(`  Total:  ${passed}/${total} passed (${rate}%)`);
  console.log(`  Easy:   ${easyPassed}/${easyTotal}`);
  console.log(`  Medium: ${mediumPassed}/${mediumTotal}`);
  console.log(`  Hard:   ${hardPassed}/${hardTotal}`);
  console.log(`  Avg Response Time: ${avgResponseTime.toFixed(0)}ms`);
  console.log(`  Avg Self-Eval: ${(avgSelfEval * 100).toFixed(0)}%`);
  console.log('========================================');

  const TARGET_RATE = 85;
  if (parseFloat(rate) >= TARGET_RATE) {
    console.log(`\n✓ PASS — meets ${TARGET_RATE}% target\n`);
    process.exit(0);
  } else {
    console.log(`\n✗ FAIL — below ${TARGET_RATE}% target\n`);
    process.exit(1);
  }
}

// Run
runGoldenSetTest().catch(err => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
```

---

### Verification Checklist

After completing all tasks, verify:

1. **Migration 003 ran successfully:**
   ```bash
   cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'rag_queries',includeColumns:true,transport:'pg'});const cols=r.tables[0]?.columns.map(c=>c.name)||[];console.log('user_feedback:',cols.includes('user_feedback')?'✓':'✗');console.log('feedback_at:',cols.includes('feedback_at')?'✓':'✗');})();"
   ```

2. **TypeScript compilation:** Verify no type errors related to the new feedback fields.

3. **Feedback API route works:**
   - POST `/api/rag/feedback` with `{ queryId, feedback: 'positive' }` → 200 OK

4. **Dashboard API route works:**
   - GET `/api/rag/dashboard` → returns `{ totalQueries, averageSelfEvalScore, modeBreakdown, feedbackSummary, scoreTrend, confidenceDistribution }`

5. **Confidence display** appears in chat UI for medium/low confidence responses.

6. **Cleanup script** ran successfully:
   - Only `ceff906e` remains active
   - Other Sun Chip documents are archived
   - Archived document embeddings are deleted

7. **Golden-set test** passes with ≥85% rate:
   ```bash
   # Start dev server first, then in another terminal:
   node scripts/golden-set-test.js
   ```

---

### Files Created / Modified in This Section

| File | Action | Description |
|------|--------|-------------|
| `scripts/migrations/003-feedback.js` | CREATE | SAOL migration: user_feedback + feedback_at on rag_queries |
| `src/types/rag.ts` | MODIFY | Add userFeedback/feedbackAt to RAGQuery + RAGQueryRow |
| `src/lib/rag/services/rag-db-mappers.ts` | MODIFY | Map new feedback fields in mapRowToQuery() |
| `src/components/rag/RAGChat.tsx` | MODIFY | Add confidence display + thumbs up/down UI |
| `src/app/api/rag/feedback/route.ts` | CREATE | POST endpoint for submitting feedback |
| `src/app/api/rag/dashboard/route.ts` | CREATE | GET endpoint for query analytics |
| `scripts/cleanup-duplicate-documents.js` | CREATE | Archive duplicate Sun Chip documents |
| `scripts/golden-set-test.js` | CREATE | 20-item regression test suite (plain JS, HTTP API) |

---

### End-to-End Validation

After all 5 execution prompts (E01-E05) are complete, run this full validation sequence:

```bash
# 1. Verify all migrations ran
cd supa-agent-ops && node ../scripts/migrations/001-enhanced-rag-facts.js
cd supa-agent-ops && node ../scripts/migrations/002-multi-doc-search.js
cd supa-agent-ops && node ../scripts/migrations/003-feedback.js

# 2. Clean up duplicate documents
cd supa-agent-ops && node ../scripts/cleanup-duplicate-documents.js

# 3. Re-ingest the canonical Sun Chip document
# (Trigger via the UI or send the Inngest event manually)

# 4. Start dev server
cd v2-modules && npm run dev

# 5. Run regression tests (separate terminal)
node scripts/golden-set-test.js
```

**Expected results after full pipeline:**
- Sun Chip document: ~300-500 facts (up from 109 with single-pass)
- 14 fact types represented (up from 4)
- Golden-set: ≥85% pass rate
- Per-document ingestion cost: ~$0.72
- Per-query cost: ~$0.006
- Query latency: ~4.3 seconds (RAG-only mode)


+++++++++++++++++



