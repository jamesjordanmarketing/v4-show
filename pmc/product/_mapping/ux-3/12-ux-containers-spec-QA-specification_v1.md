# Implementation Specification: v4-Show Bug Fixes
**Version:** v1
**Date:** 2026-03-01
**Source QA doc:** `pmc/product/_mapping/ux-3/11-ux-containers-spec-QA_v2.md`
**Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\`

---

## Background (Read This First)

**Platform:** BrightHub BRun — Next.js 14 App Router. Two product paths:
- **Fine Tuning** (LoRA Training): Generates AI conversations → enriches → trains LoRA adapter → deploys to RunPod
- **Fact Training** (RAG): Uploads documents → 6-pass Claude ingestion → semantic search → chat with citations

**Work Base architecture:** Introduced in v4-Show. Every operation is scoped to a `workbase` entity. The `workbases` table exists. Routes are at `/workbase/[id]/fine-tuning/*` and `/workbase/[id]/fact-training/*`.

**Core bug:** The v4-Show migration renamed `knowledge_base_id → workbase_id` on `rag_documents`, `rag_sections`, `rag_facts`, and `rag_embeddings`. It also created a new `workbases` table. However, **two stored PostgreSQL functions** were never updated to use the new column names. This breaks ALL document ingestion. The Inngest log for a Venus Bank upload confirms this exact error.

**Tech stack:** Supabase Pro (PostgreSQL + pgvector), Inngest background jobs, OpenAI embeddings (`text-embedding-3-small`), Claude API (Anthropic), shadcn/UI + Tailwind.

**SAOL:** All database operations run by the agent in terminal scripts MUST use SAOL (`supa-agent-ops/`). Application code (API routes, Inngest functions) uses `createServerSupabaseAdminClient()` from `@/lib/supabase-server`. SAOL is never imported in application code.

**Operating rules:**
- Before running SAOL scripts, `require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') })` (or appropriate path) loads `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Always dry-run SAOL DDL first: `dryRun: true`, then `dryRun: false`
- Always use `transport: 'pg'` for DDL operations

---

## Verified DB State (as of 2026-03-01)

```
workbases (active):
  232bea74-b987-4629-afbc-a21180fe6e84 | rag-KB-v2_v1     | user_id: 8d26cc10-a3c1-4927-8708-667d37a3348b
  4fc8fa25-0b5d-4dbb-9db4-6bd70fb84303 | Sun Chip Policy  | user_id: 8d26cc10-a3c1-4927-8708-667d37a3348b

conversations: 51 total — all workbase_id = NULL

rag_documents (workbase 232bea74):
  77115c6f | Sun-Chip-Bank-Policy-Document-v2.0.md | status: ready | facts=1268 | embeddings=0 ❌
  a8f5a781 | Moon-Banc-Policy-Document_v1.md        | status: ready | facts=650  | embeddings=679 ✅

Venus Bank 714845cf: FAILED ingestion (new upload, document.uploaded event fired 2026-03-01)

rag_sections columns:  id, document_id, user_id, section_index, title, original_text,
                       summary, contextual_preamble, section_metadata, token_count,
                       created_at, updated_at, text_tsv, workbase_id
rag_facts columns:     id, document_id, section_id, user_id, fact_type, content,
                       source_text, confidence, metadata, created_at, updated_at,
                       policy_id, rule_id, parent_fact_id, subsection, fact_category,
                       content_tsv, workbase_id
```

---

## Implementation Order

Execute in this exact order. Each task has a dependency on the previous critical tasks.

| # | Task | Type | Priority |
|---|------|------|----------|
| 1 | SAOL pre-flight verification | Script | Required first |
| 2 | DB migration: fix stale RPC function bodies | Script | CRITICAL — unblocks all RAG |
| 3 | Code: add `workbase_id` to section + fact inserts | Code | CRITICAL |
| 4 | Code: guard finalize step on embedding count | Code | HIGH |
| 5 | Script: backfill 51 conversations with workbase_id | Script | HIGH |
| 6 | Code: thread `workbaseId` through generate API + emit Inngest event | Code | HIGH |
| 7 | Code: new conversation generator inside workbase UI | Code | HIGH |
| 8 | Code: persistent "+" Create Work Base card on /home | Code | MEDIUM |
| 9 | Code: Archive — add Restore flow + AlertDialog | Code | MEDIUM |
| 10 | Script: re-trigger Sun Bank embedding | Script | After Task 2 |

---

## Task 1: SAOL Pre-Flight Verification

**Purpose:** Confirm live DB state matches this spec before writing any code or migrations.

Create `scripts/verify-005-preflight.js`:

```javascript
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const saol = require('../supa-agent-ops');

async function run() {
  console.log('=== Pre-Flight Verification ===\n');

  // 1. Confirm rag_sections has workbase_id column
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: sectionRow } = await supabase.from('rag_sections').select('*').limit(1);
  const sectionCols = sectionRow && sectionRow.length > 0 ? Object.keys(sectionRow[0]) : [];
  console.log('rag_sections.workbase_id column:', sectionCols.includes('workbase_id') ? '✅ EXISTS' : '❌ MISSING');
  console.log('rag_sections.knowledge_base_id column:', sectionCols.includes('knowledge_base_id') ? '⚠️ STILL EXISTS' : '✅ RENAMED/REMOVED');

  const { data: factRow } = await supabase.from('rag_facts').select('*').limit(1);
  const factCols = factRow && factRow.length > 0 ? Object.keys(factRow[0]) : [];
  console.log('rag_facts.workbase_id column:', factCols.includes('workbase_id') ? '✅ EXISTS' : '❌ MISSING');

  // 2. Confirm conversations workbase_id state
  const { count } = await supabase.from('conversations').select('*', { count: 'exact', head: true });
  const { count: withWB } = await supabase.from('conversations').select('*', { count: 'exact', head: true }).not('workbase_id', 'is', null);
  console.log(`\nconversations total: ${count}, with workbase_id: ${withWB}, NULL: ${(count ?? 0) - (withWB ?? 0)}`);

  // 3. Confirm Sun Bank embedding state
  const { count: sunEmbeds } = await supabase.from('rag_embeddings').select('*', { count: 'exact', head: true }).eq('document_id', '77115c6f-b987-4784-985a-afb4c45d02b6');
  console.log(`\nSun Bank (77115c6f) embeddings: ${sunEmbeds} (expected 0)`);

  // 4. Confirm workbases exist
  const { data: wbs } = await supabase.from('workbases').select('id, name, status').eq('status', 'active');
  console.log(`\nActive workbases (${wbs?.length ?? 0}):`);
  wbs?.forEach(w => console.log(`  ${w.id.slice(0,8)} | ${w.name}`));

  console.log('\n=== Pre-Flight Complete ===');
}
run().catch(console.error);
```

Run: `node scripts/verify-005-preflight.js`

Expected output confirms:
- `rag_sections.workbase_id` ✅ EXISTS
- `rag_sections.knowledge_base_id` ✅ RENAMED/REMOVED
- 51 conversations with 0 having workbase_id
- Sun Bank has 0 embeddings

---

## Task 2: DB Migration — Fix Stale RPC Function Bodies

**File to create:** `scripts/migrations/005-fix-kb-id-rename.js`

**What this fixes:** Two PostgreSQL functions (`match_rag_embeddings_kb` and `search_rag_text`) were created when the column was named `knowledge_base_id`. After the v4-Show column rename to `workbase_id`, these function bodies reference a non-existent column. PostgREST's schema cache validates all function bodies during reload, causing it to mark tables referenced by the broken functions as invalid. This surfaces as `"Could not find the 'knowledge_base_id' column of 'rag_sections' in the schema cache"` during any INSERT to `rag_sections`, completely blocking the document ingestion pipeline.

The parameter names (`filter_knowledge_base_id`) stay unchanged — they are purely internal function parameters and the TypeScript calling code in `src/lib/rag/services/rag-embedding-service.ts` uses these names. Only the function **body** column references are updated.

```javascript
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') });
const saol = require('../../supa-agent-ops');

const MIGRATION_SQL = `
  -- ============================================================
  -- Fix match_rag_embeddings_kb: e.knowledge_base_id → e.workbase_id
  -- ============================================================
  CREATE OR REPLACE FUNCTION match_rag_embeddings_kb(
    query_embedding vector(1536),
    match_threshold float,
    match_count int,
    filter_knowledge_base_id uuid DEFAULT NULL,
    filter_document_id uuid DEFAULT NULL,
    filter_tier int DEFAULT NULL,
    filter_run_id uuid DEFAULT NULL
  )
  RETURNS TABLE (
    id uuid,
    document_id uuid,
    source_type text,
    source_id uuid,
    content_text text,
    similarity float,
    tier int,
    metadata jsonb
  )
  LANGUAGE plpgsql
  AS $$
  BEGIN
    RETURN QUERY
    SELECT
      e.id,
      e.document_id,
      e.source_type,
      e.source_id,
      e.content_text,
      1 - (e.embedding <=> query_embedding) AS similarity,
      e.tier,
      e.metadata
    FROM rag_embeddings e
    WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
      AND (filter_knowledge_base_id IS NULL OR e.workbase_id = filter_knowledge_base_id)
      AND (filter_document_id IS NULL OR e.document_id = filter_document_id)
      AND (filter_tier IS NULL OR e.tier = filter_tier)
      AND (filter_run_id IS NULL OR e.run_id = filter_run_id)
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
  END;
  $$;

  -- ============================================================
  -- Fix search_rag_text: d.knowledge_base_id → d.workbase_id (two occurrences)
  -- ============================================================
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
          SELECT d.id FROM rag_documents d WHERE d.workbase_id = filter_knowledge_base_id
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
          SELECT d.id FROM rag_documents d WHERE d.workbase_id = filter_knowledge_base_id
        ))
    )
    ORDER BY 5 DESC
    LIMIT match_count;
  END;
  $$;
`;

(async () => {
  console.log('Migration 005: Fix knowledge_base_id → workbase_id in stored functions');
  console.log('=======================================================================');

  // Dry run
  const dry = await saol.agentExecuteDDL({
    sql: MIGRATION_SQL,
    dryRun: true,
    transaction: true,
    transport: 'pg',
  });
  console.log('Dry-run:', dry.success ? '✓ PASS' : '✗ FAIL', dry.summary);
  if (!dry.success) { console.error('Dry-run failed — aborting.'); process.exit(1); }

  // Execute
  const result = await saol.agentExecuteDDL({
    sql: MIGRATION_SQL,
    dryRun: false,
    transaction: true,
    transport: 'pg',
  });
  console.log('Migration:', result.success ? '✅ SUCCESS' : '❌ FAILED', result.summary);
  if (!result.success) { process.exit(1); }

  console.log('\nVerification: Upload a new test document to confirm ingestion pipeline works.');
  console.log('Expected: rag_sections INSERT no longer throws knowledge_base_id schema error.');
})();
```

Run: `node scripts/migrations/005-fix-kb-id-rename.js`

**After running this migration, all document ingestion will unblock.** The PostgREST schema cache will refresh and resolve the function bodies correctly against the live column names.

---

## Task 3: Code — Add `workbase_id` to Section and Fact Inserts

**File:** `src/lib/rag/services/rag-ingestion-service.ts`

### Change 3A: `storeSectionsFromStructure()` — add `workbase_id` to insert

The function already accepts `workbaseId?: string` as its 5th parameter (line 617). It is called from `process-rag-document.ts` with `doc.workbaseId` (line 114). The insert record on line 630–644 does not include `workbase_id`. Add it.

**Find block (lines 630–644):**
```typescript
    return {
      document_id: documentId,
      user_id: userId,
      section_index: index,
      title: section.title,
      original_text: sectionText,
      summary: section.summary,
      token_count: Math.ceil(sectionText.length / 4),
      section_metadata: {
        policyId: section.policyId,
        isNarrative: section.isNarrative,
        startLine: section.startLine,
        endLine: section.endLine,
      },
    };
```

**Replace with:**
```typescript
    return {
      document_id: documentId,
      user_id: userId,
      workbase_id: workbaseId || null,
      section_index: index,
      title: section.title,
      original_text: sectionText,
      summary: section.summary,
      token_count: Math.ceil(sectionText.length / 4),
      section_metadata: {
        policyId: section.policyId,
        isNarrative: section.isNarrative,
        startLine: section.startLine,
        endLine: section.endLine,
      },
    };
```

### Change 3B: `storeExtractedFacts()` — add `workbase_id` to insert

The function accepts `workbaseId?: string` as its 5th parameter (line 861). It is called from `process-rag-document.ts` with `doc.workbaseId` (e.g., line 138). The insert record on lines 876–889 does not include `workbase_id`. Add it.

**Find block (lines 876–889):**
```typescript
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
```

**Replace with:**
```typescript
  const records = facts.map(fact => ({
    document_id: documentId,
    user_id: userId,
    section_id: sectionId,
    workbase_id: workbaseId || null,
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
```

---

## Task 4: Code — Guard Finalize Step Against 0 Embeddings

**File:** `src/inngest/functions/process-rag-document.ts`

**Problem:** The finalize step (Step 12, line ~534) sets `status: 'ready'` even when `embeddingCount === 0` (embedding generation failed). This leaves documents appearing ready when they have no chat capability.

**Locate the finalize step** (around line 534):
```typescript
    await step.run('finalize', async () => {
      // Count facts
      const { count: factCount } = await supabase
        .from('rag_facts')
        .select('*', { count: 'exact', head: true })
        .eq('document_id', documentId);

      const { count: sectionCount } = await supabase
        .from('rag_sections')
        .select('*', { count: 'exact', head: true })
        .eq('document_id', documentId);

      const finalStatus = doc.fastMode ? 'ready' : 'awaiting_questions';
```

**Replace `const finalStatus = ...` line** with:
```typescript
      // Only mark as ready/awaiting_questions if embeddings were generated.
      // embeddingCount is 0 when the generate-embeddings step failed or was skipped.
      const finalStatus = embeddingCount === 0
        ? 'processing'
        : (doc.fastMode ? 'ready' : 'awaiting_questions');
```

`embeddingCount` is the return value of the `generate-embeddings` step (Step 11), which is in scope as `const embeddingCount = await step.run('generate-embeddings', ...)`. This variable is available in the outer function scope at the finalize step.

---

## Task 5: Script — Backfill 51 Conversations With `workbase_id`

**File to create:** `scripts/backfill-conversations-workbase.js`

All 51 existing conversations belong to user `8d26cc10-a3c1-4927-8708-667d37a3348b` and should be assigned to workbase `232bea74-b987-4629-afbc-a21180fe6e84` (`rag-KB-v2_v1`).

```javascript
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const saol = require('../supa-agent-ops');

const TARGET_WORKBASE_ID = '232bea74-b987-4629-afbc-a21180fe6e84';
const TARGET_USER_ID     = '8d26cc10-a3c1-4927-8708-667d37a3348b';

const SQL = `
  UPDATE conversations
  SET workbase_id = '${TARGET_WORKBASE_ID}'
  WHERE workbase_id IS NULL
    AND user_id = '${TARGET_USER_ID}';
`;

(async () => {
  console.log('Backfill: assign NULL workbase_id conversations to rag-KB-v2_v1');
  console.log('Target workbase:', TARGET_WORKBASE_ID);

  // Dry run
  const dry = await saol.agentExecuteDDL({ sql: SQL, dryRun: true, transaction: true, transport: 'pg' });
  console.log('Dry-run:', dry.success ? '✓ PASS' : '✗ FAIL');
  if (!dry.success) { console.error(dry.summary); process.exit(1); }

  // Execute
  const result = await saol.agentExecuteDDL({ sql: SQL, dryRun: false, transaction: true, transport: 'pg' });
  console.log('Result:', result.success ? '✅ SUCCESS' : '❌ FAILED', result.summary);

  // Verify
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { count: remaining } = await supabase
    .from('conversations').select('*', { count: 'exact', head: true }).is('workbase_id', null);
  console.log(`\nConversations still with NULL workbase_id: ${remaining} (expected 0)`);
})();
```

Run: `node scripts/backfill-conversations-workbase.js`

---

## Task 6: Code — Thread `workbaseId` Through Generate API + Emit Inngest Event

This task makes new conversations generated through the API automatically associated with the correct workbase and automatically enriched.

### Change 6A: Update `POST /api/conversations/generate/route.ts`

**File:** `src/app/api/conversations/generate/route.ts`

**Step 1:** Add `workbaseId` to the Zod schema. In the `GenerateRequestSchema` object, add:
```typescript
  workbaseId: z.string().uuid().optional(),
```
Place it after the `category` field (line 22). The full schema becomes:
```typescript
const GenerateRequestSchema = z.object({
  templateId: z.string().uuid('Template ID must be a valid UUID'),
  parameters: z.record(z.string(), z.any()),
  tier: z.enum(['template', 'scenario', 'edge_case']),
  userId: z.string().optional(),
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().min(100).max(8192).optional(),
  category: z.array(z.string()).optional(),
  workbaseId: z.string().uuid().optional(),
});
```

**Step 2:** Add required imports at the top of the file (after existing imports):
```typescript
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { inngest } from '@/inngest/client';
```

**Step 3:** After the successful generation block (after `if (!result.success)` check, before `return NextResponse.json(..., { status: 201 })`), add:

```typescript
    // If workbaseId was provided, associate this conversation with the workbase.
    // The generation service creates the conversation without workbase_id;
    // we patch it here immediately after creation.
    if (validated.workbaseId && result.conversation.id) {
      try {
        const supabase = createServerSupabaseAdminClient();
        await supabase
          .from('conversations')
          .update({ workbase_id: validated.workbaseId })
          .eq('conversation_id', result.conversation.id)
          .eq('user_id', userId);
      } catch (err) {
        // Non-fatal — log and continue. Conversation was created; workbase link failed.
        console.error('[Generate] Failed to set workbase_id on conversation:', err);
      }
    }

    // Trigger auto-enrichment via Inngest (D8). Fire-and-forget.
    // The autoEnrichConversation function handles idempotency and retries.
    if (result.conversation.id) {
      try {
        await inngest.send({
          name: 'conversation/generation.completed',
          data: { conversationId: result.conversation.id, userId },
        });
      } catch (err) {
        // Non-fatal — enrichment can be triggered manually if Inngest is unavailable.
        console.error('[Generate] Failed to emit generation.completed event:', err);
      }
    }
```

**Note on `result.conversation.id`:** The `generateSingleConversation` method returns a `Conversation` object. The `id` field on `Conversation` maps to the `conversation_id` column (the UUID generated at creation, e.g., `"5e9f28c0-..."`). The Supabase UPDATE must use `.eq('conversation_id', result.conversation.id)` (not `.eq('id', ...)`) because `id` in `Conversation` is the `conversation_id` UUID. Verify this by checking the `transformStorageToConversation` mapping in `src/app/(dashboard)/conversations/page.tsx` line 26: `conversationId: storage.conversation_id` — and the `Conversation` type's `id` field maps to what the generation service sets as `generationId` (which becomes `conversation_id` in the DB).

**Full modified POST handler** (only the success block changes; wrap the existing return block):

```typescript
    // Return success response
    return NextResponse.json(
      {
        success: true,
        conversation: result.conversation,
        cost: result.metrics.cost,
        qualityMetrics: {
          qualityScore: result.conversation.qualityScore,
          turnCount: result.conversation.totalTurns,
          tokenCount: result.conversation.totalTokens,
          durationMs: result.metrics.durationMs,
        },
      },
      { status: 201 }
    );
```

The workbase_id update and inngest.send must be placed BEFORE this return statement.

---

## Task 7: Code — New Conversation Generator Inside Workbase UI

**File:** `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx`

The current "New Conversation" button (line 88–93) routes to the old `/conversations?workbaseId=` page. Replace it with an in-page Sheet that calls the updated generate API with `workbaseId`.

### What to build

A Sheet (slide-over from the right) that opens when "New Conversation" is clicked. Inside:
1. A template selector (fetched from `GET /api/templates`)
2. A tier selector (template / scenario / edge_case)
3. A "Generate" button that calls `POST /api/conversations/generate` with `workbaseId`
4. A loading state and success/error toast

### Implementation

Add these imports at the top of the file:
```typescript
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Wand2 } from 'lucide-react';
```

Add these state variables inside `WorkbaseConversationsPage`:
```typescript
  const [showGenerator, setShowGenerator] = useState(false);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedTier, setSelectedTier] = useState<'template' | 'scenario' | 'edge_case'>('template');
  const [isGenerating, setIsGenerating] = useState(false);
```

Add a `useEffect` to fetch templates when the sheet opens:
```typescript
  useEffect(() => {
    if (!showGenerator) return;
    fetch('/api/templates?limit=50')
      .then(r => r.json())
      .then(json => {
        if (json.data?.templates) {
          setTemplates(json.data.templates.map((t: any) => ({ id: t.id, name: t.name })));
        }
      })
      .catch(() => toast.error('Failed to load templates'));
  }, [showGenerator]);
```

Add the generate handler:
```typescript
  async function handleGenerateConversation() {
    if (!selectedTemplateId) {
      toast.error('Select a template');
      return;
    }
    setIsGenerating(true);
    try {
      const res = await fetch('/api/conversations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          tier: selectedTier,
          parameters: {},
          workbaseId: workbaseId,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Generation failed');
      toast.success('Conversation generated — enrichment running in background');
      setShowGenerator(false);
      // Refresh conversation list
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  }
```

**Replace the existing "New Conversation" button** (lines 88–93, inside `<CardHeader>`):

Old:
```typescript
          <Button
            size="sm"
            onClick={() => router.push(`/conversations?workbaseId=${workbaseId}`)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Conversation
          </Button>
```

New:
```typescript
          <Button size="sm" onClick={() => setShowGenerator(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Conversation
          </Button>
```

**Replace the empty-state link** (lines 131–135) that routes to the old page:

Old:
```typescript
              <button
                className="underline text-zinc-400 hover:text-zinc-200"
                onClick={() => router.push(`/conversations?workbaseId=${workbaseId}`)}
              >
                Generate your first conversation.
              </button>
```

New:
```typescript
              <button
                className="underline text-zinc-400 hover:text-zinc-200"
                onClick={() => setShowGenerator(true)}
              >
                Generate your first conversation.
              </button>
```

**Add the Sheet component** before the closing `</div>` of the returned JSX (after the Training Sets card):

```typescript
      {/* ── Conversation Generator Sheet ──────────────────────────── */}
      <Sheet open={showGenerator} onOpenChange={setShowGenerator}>
        <SheetContent className="w-full sm:max-w-md bg-zinc-950 border-zinc-800">
          <SheetHeader>
            <SheetTitle className="text-zinc-50">Generate Conversation</SheetTitle>
            <SheetDescription className="text-zinc-400">
              Select a template and generate a new conversation for this Work Base.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-6">
            <div>
              <label className="text-sm font-medium text-zinc-200 block mb-1">Template</label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a template…" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-200 block mb-1">Tier</label>
              <Select value={selectedTier} onValueChange={(v) => setSelectedTier(v as typeof selectedTier)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="template">Template</SelectItem>
                  <SelectItem value="scenario">Scenario</SelectItem>
                  <SelectItem value="edge_case">Edge Case</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full mt-4"
              onClick={handleGenerateConversation}
              disabled={!selectedTemplateId || isGenerating}
            >
              {isGenerating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</>
              ) : (
                <><Wand2 className="h-4 w-4 mr-2" />Generate</>
              )}
            </Button>

            <p className="text-xs text-zinc-500 text-center">
              Enrichment runs automatically in the background after generation.
            </p>
          </div>
        </SheetContent>
      </Sheet>
```

---

## Task 8: Code — Persistent "+" Create Work Base Card on `/home`

**File:** `src/app/(dashboard)/home/page.tsx`

**Problem:** The "New Work Base" button at line 226–229 is a `size="sm"` button in a header row that James confirmed is not visible. Add a persistent "+" Create card in the workbase grid that always renders alongside existing workbase cards.

**Find the grid section** (lines 237–264):
```typescript
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workbases?.map((wb) => (
              <Card
                key={wb.id}
                ...
              >
                ...
              </Card>
            ))}
          </div>
```

**Replace with** (adds a "+" card after the workbase list):
```typescript
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workbases?.map((wb) => (
              <Card
                key={wb.id}
                className="cursor-pointer hover:border-primary transition-colors bg-zinc-900 border-zinc-800"
                onClick={() => handleSelectWorkbase(wb)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-zinc-50 truncate">{wb.name}</CardTitle>
                  {wb.description && (
                    <p className="text-sm text-zinc-400 truncate">{wb.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-zinc-500">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {wb.activeAdapterJobId ? 'Adapter Live' : 'No Adapter'}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      {wb.documentCount} docs
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Always-visible Create New Work Base card */}
            <Card
              className="cursor-pointer border-dashed border-zinc-700 hover:border-primary bg-zinc-900/50 hover:bg-zinc-900 transition-colors"
              onClick={openWizard}
            >
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Plus className="h-8 w-8 text-zinc-500 mb-3" />
                <p className="text-sm font-medium text-zinc-400">Create New Work Base</p>
              </CardContent>
            </Card>
          </div>
```

**Also remove the now-redundant small header button** (lines 224–230). The section becomes:
```typescript
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-zinc-50">Your Work Bases</h2>
        </div>
```

The "Get Started" QuickStart tile (lines 204–221, shown when `workbases.length === 0`) remains unchanged.

---

## Task 9: Code — Archive: Add Restore Flow + AlertDialog

### Change 9A: Add Archived Workbases Section to `/home`

**File:** `src/app/(dashboard)/home/page.tsx`

**Step 1:** Update `useWorkbases` data fetching. The current hook at line 47 fetches only active workbases. Add a separate fetch for archived ones by adding a new API parameter. The `GET /api/workbases` route currently filters `status = 'active'`. Update it to also support `?includeArchived=true`.

**Update `src/app/api/workbases/route.ts` GET handler** to support archived:

```typescript
export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const includeArchived = searchParams.get('includeArchived') === 'true';

  const supabase = createServerSupabaseAdminClient();

  let query = supabase
    .from('workbases')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (!includeArchived) {
    query = query.eq('status', 'active');
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: (data || []).map(mapRowToWorkbase),
  });
}
```

**Step 2:** In `home/page.tsx`, add a separate fetch for archived workbases. Add after the existing `useWorkbases` line:

```typescript
  const { data: allWorkbases } = useWorkbases(); // active only (default)
  const { data: archivedWorkbases } = useWorkbasesArchived(); // archived only
```

Add a new hook `useWorkbasesArchived` to `src/hooks/useWorkbases.ts`:

```typescript
export function useWorkbasesArchived() {
  return useQuery({
    queryKey: [...workbaseKeys.list(), 'archived'],
    queryFn: async () => {
      const res = await fetch('/api/workbases?includeArchived=true');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch workbases');
      // Filter to only archived
      return (json.data as Workbase[]).filter(wb => wb.status === 'archived');
    },
    staleTime: 30_000,
  });
}
```

Also add `useRestoreWorkbase` to `src/hooks/useWorkbases.ts`:

```typescript
export function useRestoreWorkbase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/workbases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to restore');
      return json.data as Workbase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workbaseKeys.list() });
    },
  });
}
```

**Step 3:** Add the archived section below the workbase grid in `home/page.tsx`. Add after the grid closing `</div>` and before the `</div>` of the main content area:

```typescript
        {/* Archived Work Bases */}
        {archivedWorkbases && archivedWorkbases.length > 0 && (
          <div className="mt-10">
            <h2 className="text-base font-semibold text-zinc-500 mb-4">
              Archived Work Bases ({archivedWorkbases.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {archivedWorkbases.map((wb) => (
                <ArchivedWorkbaseCard key={wb.id} workbase={wb} />
              ))}
            </div>
          </div>
        )}
```

Add the `ArchivedWorkbaseCard` component inside `home/page.tsx` (above the `HomePage` function):

```typescript
function ArchivedWorkbaseCard({ workbase }: { workbase: Workbase }) {
  const restoreMutation = useRestoreWorkbase();
  return (
    <Card className="bg-zinc-900/50 border-zinc-800 opacity-60">
      <CardHeader className="pb-2">
        <CardTitle className="text-zinc-400 truncate text-base">{workbase.name}</CardTitle>
        {workbase.description && (
          <p className="text-sm text-zinc-500 truncate">{workbase.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          disabled={restoreMutation.isPending}
          onClick={() => restoreMutation.mutate(workbase.id)}
        >
          {restoreMutation.isPending ? (
            <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Restoring…</>
          ) : 'Restore Work Base'}
        </Button>
      </CardContent>
    </Card>
  );
}
```

Import `useRestoreWorkbase` at the top of `home/page.tsx` alongside the existing `useWorkbases` import.

### Change 9B: Replace `confirm()` with AlertDialog in Settings

**File:** `src/app/(dashboard)/workbase/[id]/settings/page.tsx`

**Add imports:**
```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
```

**Add state:**
```typescript
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
```

**Replace `handleArchive` function:**
```typescript
  async function handleArchive() {
    try {
      await updateMutation.mutateAsync({
        id: workbaseId,
        updates: { status: 'archived' },
      });
      toast.success('Work Base archived');
      router.push('/home');
    } catch (err) {
      toast.error('Failed to archive');
    }
  }
```

**Find the Archive button in the Danger Zone section** and replace it with an `AlertDialog`-wrapped version. Locate the existing archive button (it renders inside a Danger Zone card with `onClick={handleArchive}`) and replace it with:

```typescript
                <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      Archive Work Base
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Archive this Work Base?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This Work Base will be hidden from your home list. Your documents,
                        conversations, and all data are preserved. You can restore it from
                        the home page at any time.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={handleArchive}
                        disabled={updateMutation.isPending}
                      >
                        {updateMutation.isPending ? 'Archiving…' : 'Archive'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
```

---

## Task 10: Script — Re-trigger Sun Bank Embedding

**Run AFTER Task 2 (DB migration) is confirmed working.**

The Sun Bank document (`77115c6f-b987-4784-985a-afb4c45d02b6`) has sections and facts stored but zero embeddings. The `processRAGDocument` Inngest function's `generate-embeddings` step calls `deleteDocumentEmbeddings(documentId)` first, so re-triggering is safe.

**File to create:** `scripts/retrigger-sun-bank-embedding.js`

```javascript
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const { Inngest } = require('inngest');

const DOCUMENT_ID = '77115c6f-b987-4784-985a-afb4c45d02b6';
const USER_ID     = '8d26cc10-a3c1-4927-8708-667d37a3348b';

const inngest = new Inngest({
  id: 'brighthub-rag-frontier',
  eventKey: process.env.INNGEST_EVENT_KEY,
});

(async () => {
  console.log('Re-triggering processRAGDocument for Sun Bank:', DOCUMENT_ID);
  await inngest.send({
    name: 'rag/document.uploaded',
    data: { documentId: DOCUMENT_ID, userId: USER_ID },
  });
  console.log('✅ Event sent. Monitor Inngest dashboard for process-rag-document function execution.');
  console.log('   Expected: 29 sections already stored; only generate-embeddings step will run.');
  console.log('   Expected result: ~1298 embeddings generated for Sun Bank document.');
})();
```

Run: `node scripts/retrigger-sun-bank-embedding.js`

**Note:** The `processRAGDocument` function will re-run all passes including LLM extraction. This is safe — sections and facts will be re-stored (existing rows may cause duplicates if not deleted first). If duplicate sections/facts are a concern, first delete existing ones:

```javascript
// Optional cleanup before re-triggering (add to the script if needed):
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
await supabase.from('rag_sections').delete().eq('document_id', DOCUMENT_ID);
await supabase.from('rag_facts').delete().eq('document_id', DOCUMENT_ID);
await supabase.from('rag_embeddings').delete().eq('document_id', DOCUMENT_ID);
console.log('Cleaned up existing sections, facts, and embeddings for', DOCUMENT_ID);
```

---

## Verification Checklist

After completing all tasks, verify each fix:

| Task | Verification |
|------|-------------|
| Task 2 | Upload a new test document → Inngest function completes without `knowledge_base_id` error in logs |
| Task 3 | After a document processes, check `rag_sections` and `rag_facts` rows have `workbase_id != NULL` |
| Task 4 | Force an embedding failure (e.g., temporarily bad API key) → document stays `status: processing`, not `ready` |
| Task 5 | `GET /api/conversations?workbaseId=232bea74...` returns > 0 conversations |
| Task 6 | Generate a conversation from the workbase UI → row has `workbase_id` set in DB |
| Task 6 | Inngest dashboard shows `auto-enrich-conversation` triggered after generation |
| Task 7 | "New Conversation" on conversations page opens Sheet, generate completes, list refreshes |
| Task 8 | `/home` shows "+" card in grid, clicking opens wizard and creates workbase |
| Task 9 | Settings page archive button shows AlertDialog with correct text; archive works; home shows archived section with Restore |
| Task 10 | Sun Bank document gets 1298 embeddings; chat with Sun Bank policy returns answers |

---

## Files Modified Summary

| File | Task | Change Type |
|------|------|-------------|
| `scripts/verify-005-preflight.js` | 1 | New script |
| `scripts/migrations/005-fix-kb-id-rename.js` | 2 | New script |
| `src/lib/rag/services/rag-ingestion-service.ts` | 3 | Add `workbase_id` to 2 insert records |
| `src/inngest/functions/process-rag-document.ts` | 4 | Guard finalize on embedding count |
| `scripts/backfill-conversations-workbase.js` | 5 | New script |
| `src/app/api/conversations/generate/route.ts` | 6 | Accept `workbaseId`; patch conversation; emit Inngest event |
| `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx` | 7 | Add Sheet generator; replace old CTA links |
| `src/app/(dashboard)/home/page.tsx` | 8, 9 | Add "+" card; add archived section |
| `src/app/api/workbases/route.ts` | 9 | Support `?includeArchived=true` |
| `src/hooks/useWorkbases.ts` | 9 | Add `useWorkbasesArchived`, `useRestoreWorkbase` |
| `src/app/(dashboard)/workbase/[id]/settings/page.tsx` | 9 | Replace `confirm()` with AlertDialog |
| `scripts/retrigger-sun-bank-embedding.js` | 10 | New script |

---

## Manual Test Tutorial

### T1 — Document Ingestion Unblocked (Task 2 + 3)

1. Go to `/home` → open any active Work Base → **Fact Training → Documents**.
2. Upload a new `.md` or `.pdf` file (< 5 MB is fine for a quick test).
3. Open the Inngest dashboard → **Functions → process-rag-document** → watch the new run.
4. **Observe:** All steps complete without a `"Could not find the 'knowledge_base_id' column"` error.
5. After the run finishes, open Supabase Table Editor → `rag_sections`. Filter by the new `document_id`.
6. **Observe:** Every row has a non-null `workbase_id` matching the Work Base you uploaded to.
7. Repeat for `rag_facts`. **Observe:** Same — `workbase_id` is populated on every row.

---

### T2 — Finalize Guard: No Embeddings → Status Stays Processing (Task 4)

1. Temporarily set `OPENAI_API_KEY` to an invalid value in `.env.local` and restart the dev server.
2. Upload a small document to trigger ingestion.
3. Watch the Inngest run — the `generate-embeddings` step will fail or return 0.
4. **Observe:** The document's `status` in `rag_documents` remains `processing`, not `ready` or `awaiting_questions`.
5. Restore the correct `OPENAI_API_KEY` and restart.

---

### T3 — Conversations Backfill (Task 5)

1. Open Supabase Table Editor → `conversations`.
2. Filter where `user_id = '8d26cc10-a3c1-4927-8708-667d37a3348b'`.
3. **Observe:** Every row has `workbase_id = '232bea74-b987-4629-afbc-a21180fe6e84'`. Zero NULL values.

---

### T4 — Generate Conversation with Workbase Association (Task 6)

1. Navigate to any Work Base → **Fine Tuning → Conversations**.
2. Click **New Conversation**. A Sheet slides in from the right.
3. Select any template from the dropdown. Select a tier. Click **Generate**.
4. **Observe:** Toast reads "Conversation generated — enrichment running in background". Sheet closes. List reloads.
5. Open Supabase → `conversations`. Find the newest row.
6. **Observe:** `workbase_id` matches the Work Base you generated from.
7. Open the Inngest dashboard. **Observe:** A `conversation/generation.completed` event fired and `auto-enrich-conversation` (or equivalent) triggered.

---

### T5 — Conversation Generator Sheet (Task 7)

1. Navigate to a Work Base → **Fine Tuning → Conversations**.
2. **Observe:** The **New Conversation** button in the card header is present.
3. Click it. **Observe:** A Sheet opens (slides from right) titled "Generate Conversation".
4. **Observe:** A Template dropdown and a Tier dropdown are visible.
5. Without selecting a template, click **Generate**. **Observe:** Error toast "Select a template".
6. Select a template, click **Generate**. **Observe:** Button shows spinner + "Generating…" while in-flight.
7. Navigate to a Work Base with zero conversations. **Observe:** The empty-state link "Generate your first conversation." is present and clicking it opens the same Sheet.

---

### T6 — Persistent "+" Create Work Base Card (Task 8)

1. Go to `/home`.
2. **Observe:** The workbase grid contains a dashed-border card labelled **"Create New Work Base"** with a `+` icon, alongside existing Work Base cards.
3. **Observe:** There is no longer a small "New Work Base" button in the section header row.
4. Click the `+` card. **Observe:** The Create Work Base wizard Dialog opens (same multi-step flow as before).
5. Complete the wizard (name only, skip upload). **Observe:** New Work Base card appears in the grid. The `+` card remains visible after it.

---

### T7 — Archive Work Base with AlertDialog (Task 9A)

1. Open any Work Base → **Settings**.
2. Scroll to the **Danger Zone** card.
3. Click **Archive Work Base**.
4. **Observe:** An AlertDialog appears — no browser `confirm()` popup. Title reads "Archive this Work Base?". Body text mentions data is preserved and restoration is available from home.
5. Click **Cancel**. **Observe:** Dialog closes, no change.
6. Click **Archive Work Base** again → click **Archive** in the dialog.
7. **Observe:** Toast "Work Base archived". Redirected to `/home`.

---

### T8 — Archived Work Bases Section + Restore (Task 9B)

1. Complete T7 above so at least one Work Base is archived.
2. Go to `/home`.
3. **Observe:** A section titled **"Archived Work Bases (N)"** appears below the main grid, with faded cards for each archived Work Base.
4. **Observe:** Archived cards are not clickable/navigable — they only show a **Restore Work Base** button.
5. Click **Restore Work Base** on an archived card.
6. **Observe:** Button shows "Restoring…" spinner while pending.
7. **Observe:** On success, the card disappears from the archived section and reappears in the active grid.
8. **Observe:** If no archived Work Bases exist, the archived section is not rendered at all.

---

### T9 — Sun Bank Embeddings Re-trigger (Task 10)

1. Confirm migration T1 passes first (new doc ingests without error).
2. Run: `node scripts/retrigger-sun-bank-embedding.js`
3. **Observe:** Terminal prints "✅ Event sent."
4. Open Inngest dashboard → watch the `process-rag-document` run for document `77115c6f`.
5. After the run completes, open Supabase → `rag_embeddings`. Filter by `document_id = '77115c6f-b987-4784-985a-afb4c45d02b6'`.
6. **Observe:** Row count is approximately 1298.
7. Go to the Sun Chip Policy Work Base → **Fact Training → Chat**. Ask: *"What is the maximum ATM withdrawal limit?"*
8. **Observe:** Response contains a relevant answer with a document citation.

Testing now
