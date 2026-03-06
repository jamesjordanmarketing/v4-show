#  UX Decisions & Path Forward

**Version:** 4.0 | **Date:** 2026-02-27
**Supersedes:** 07-internal-ux-decisions_v3.md (v3.0), 07-internal-ux-decisions_v2.md (v2.0), 03-lora-chat-fix-spec_v2.md
**Context:** All decisions from v1/v2 + James' v6/v7 feedback + worker refresh cycle & first customer journey from 03-spec, fully integrated
**Output:** Final consolidated specification — design decisions, technical architecture, implementation plan, acceptance criteria, and testing checkpoints

---

## Table of Contents

1. [Decision Summary](#1-decision-summary)
2. [Decision D1: Eliminate Data Shaping — Aggregate on Conversations Page](#2-decision-d1)
3. [Decision D1b: Conversation Content Viewing & "Fine Tuning Prep" Step](#3-decision-d1b)
4. [Decision D2: No Separate KB — RAG Lives Directly in the Work Base](#4-decision-d2)
5. [Decision D3: Active Adapter Storage — Column on workbases Table](#5-decision-d3)
6. [Decision D4: Behavior Chat Availability States](#6-decision-d4)
7. [Decision D5: Conversation Generation Stays on Conversations Page](#7-decision-d5)
8. [Decision D6: A/B Testing Built into Behavior Chat](#8-decision-d6)
9. [Decision D7: Complete Route Rewrite](#9-decision-d7)
10. [Decision D8: Auto-Enrichment (Replaces Manual "Enrich All")](#10-decision-d8)
11. [Decision D9: Conversation Feedback (Comments Box)](#11-decision-d9)
12. [Decision D10: Modal Background Fix](#12-decision-d10)
13. [Decision D11: Adapter Deployment Threading & Worker Refresh Cycle](#13-decision-d11)
14. [Decision D12: MAX_LORAS Increase & Research Deliverables](#14-decision-d12)
15. [Revised Ontology & Page Map](#15-revised-ontology)
16. [Revised Navigation](#16-revised-navigation)
17. [Detailed Page Specifications](#17-detailed-page-specifications)
18. [Technical Architecture](#18-technical-architecture)
19. [Risk Areas](#19-risk-areas)
20. [Implementation Sequence](#20-implementation-sequence)
21. [Testing Checkpoints](#21-testing-checkpoints)
22. [Warnings](#22-warnings)
23. [Appendix A: First Customer Journey](#appendix-a)
24. [Appendix B: 03-Spec Reconciliation](#appendix-b)

---

## 1. Decision Summary

All decisions from v1 (D1-D7, Q1-Q10) plus v6/v7 additions (D8-D11) and 03-spec integrations (D11 expanded, D12 new), fully approved.

| # | Topic | Decision | Implication |
|---|---|---|---|
| D1 | Data Shaping page | **Eliminated.** Aggregation happens ON the Conversations page. Everything between aggregation and adapter creation is automatic. | 3-step stepper -> **2-step flow**: Conversations (with aggregation) -> Launch Tuning |
| D1b | Conversation content viewing | **View-only detail page.** No editing. No "Fine Tuning Prep" page reintroduced. | New sub-route `/conversations/[convId]` -- drill-down, not a step |
| D2 | KB inside Work Base | **No separate KB entity.** One RAG scope per Work Base. Refactor RAG tables to use `workbase_id` directly. | Eliminate `rag_knowledge_bases` table; replace `knowledge_base_id` with `workbase_id` on 5 RAG tables |
| D3 | Active adapter storage | **`active_adapter_job_id` column on `workbases` table.** Single source of truth, NULL = no adapter. | Simple column, not junction table |
| D4 | Behavior Chat availability | **5 states with contextual banners.** Chat page always accessible, never hidden. Includes "deploying" state during worker refresh. | Conditional banners + mode selector disable logic |
| D5 | Conversation generation | **Stays as button on Conversations page.** Bulk generator absorbed into modal/drawer. | No change to generation flow |
| D6 | A/B testing | **Built into Behavior Chat.** Uses existing MultiTurnChat + DualResponsePanel. | No separate evaluation page |
| D7 | Route approach | **Complete rewrite** under `/workbase/[id]/`. | New route tree, components preserved |
| D8 | Auto-enrichment | **Inngest-based auto-enrich after generation.** "Enrich All" button removed. | New Inngest function, enrichment invisible to user |
| D9 | Conversation feedback | **Comments box on Conversation Detail page.** Natural-language feedback stored in DB. Not content editing. | New `conversation_comments` table with full Identity Spine |
| D10 | Modal backgrounds | **Fix at primitive level.** `bg-zinc-900` on all DialogContent/AlertDialogContent. | 2-file change, all 15 modals inherit |
| D11 | Adapter deployment + worker refresh | **Automated worker refresh cycle after LORA_MODULES update.** New Inngest event `pipeline/adapter.deployed`, new `refreshInferenceWorkers` function. Status transitions: `deploying` -> workers cycle -> `ready`. | New Inngest function, modified autoDeployAdapter, DB status lifecycle |
| D12 | MAX_LORAS + research | **Increase MAX_LORAS from 1 to 5** during worker refresh. Research deliverables: RunPod programmatic endpoints, INFERENCE_MODE docs. | Applied during scale-up step; research is documentation only |
| Q1 | Data migration | **No migration needed** -- test data cleared before work begins | Clean slate |
| Q6 | Expert Q&A | Keep on document detail page | No change |
| Q7 | Quality dashboards | Keep as sub-pages under Fact Training | No change |
| Q8 | Multi-user | **Future feature** -- not for launch | No Settings members section |
| Q9 | Route structure | Use `/workbase/` (not `/w/`) | Readable URLs |
| Q10 | Deployment | Complete rewrite preferred | See D7 |

---

## 2. Decision D1: Eliminate Data Shaping -- Aggregate on Conversations Page

### Core Insight

> "The Data Shaping step should ONLY include the selection of conversations into an aggregate file and then everything between that selection and the Launch Tuning is not needed to be visible to the lay person owner."

### Decision: Yes -- Eliminate Data Shaping as a Separate Page

**The current artifact chain is:**
```
Individual Conversations -> Aggregated JSON -> LoRA JSONL -> Dataset -> Pipeline Job -> Adapter
```

**From the user's perspective, there are only 2 meaningful actions:**
1. "Which conversations do I want to use?" (selection + aggregation)
2. "Go ahead and train" (launch)

Everything in between (JSON aggregation, JSONL conversion, dataset creation) is **plumbing** that is automated.

### The Revised 2-Step Flow

```
STEP 1: Conversations Page
+-- View/create/edit individual conversations (future: human review)
+-- Select conversations for aggregation (checkboxes)
+-- CTA: "Build Training Set" (aggregates selected -> creates JSON -> creates JSONL -> creates dataset automatically)
+-- Shows: list of "Training Sets" (aggregation history) with status

STEP 2: Launch Tuning Page
+-- Auto-selects the latest Training Set (or user picks from history)
+-- 3 lay-person sliders (Sensitivity, Progression, Repetition)
+-- CTA: "Train & Publish" (trains adapter -> stores on HF -> updates endpoint)
+-- Shows: adapter history with rollback
```

### Solving the "Two Identical Conversation Lists" Problem

With Data Shaping eliminated, the Conversations page has **dual purpose**, designed as two clear sections:

**Section A: Conversation Library (top of page)**
- The table of individual conversations with filters, detail modal, enrichment pipeline
- Future: human review/edit capabilities
- Each row shows a status badge: `Draft | Ready | In Training Set`
- Subtext: "Review and refine your training conversations. Select conversations below to build a Training Set."

**Section B: Training Sets (bottom of page, or collapsible panel)**
- List of aggregated Training Sets (previously "Training Files")
- Each row: Name, conversation count, created date, status (Processing / Ready / In Use)
- Badge: "Active" on the set currently being used by the live adapter
- Actions: View JSON, Download JSONL, Use for Launch Tuning
- This replaces the Training Files page, the Datasets page, and the Data Shaping page entirely

**Why this works:**
- The conversation table is the **canonical source** -- users create, review, and select here
- Training Sets are clearly **outputs** (derived from conversations), not a second list of conversations
- The visual hierarchy is: conversations (the material) are primary; Training Sets (the package) are secondary

### What Happens Under the Hood When "Build Training Set" Is Clicked

```
User clicks "Build Training Set" with 15 conversations selected
  -> API: POST /api/workbase/[id]/training-sets
    -> 1. Validate all 15 conversations exist and are approved
    -> 2. Aggregate individual JSONs into combined Training JSON (current training-file-service.ts logic)
    -> 3. Convert to LoRA-compliant JSONL (current training-file-service.ts logic)
    -> 4. Store both files in Supabase Storage
    -> 5. Create training_sets record with workbase_id + metadata
    -> 6. Return success
  -> UI: New Training Set appears in Section B with status "Ready"
```

This is exactly what `training-file-service.ts:createTrainingFile()` already does. We just need to:
1. Add `workbase_id` to the training file/set records
2. Trigger it from the Conversations page instead of a separate page
3. Auto-create a dataset record (or merge the concept entirely)

---

## 3. Decision D1b: Conversation Content Viewing & "Fine Tuning Prep" Step

### Part 1: Build a View-Only Conversation Detail Page

**Why it's necessary:**
- SMB owners investing real money in training will absolutely want to read what their AI is learning before clicking "Train." Without visibility, controlling business owners feel out of control -- and they churn.
- A view-only page is the **minimum viable trust layer**. Without it, users are blindly trusting AI-generated content.
- The current ConversationDetailModal is a modal with limited real estate -- not suitable for reading a full multi-turn conversation.

**Why view-only is the correct scope (not edit):**
- Editing a conversation changes training data, triggering: re-validation, re-enrichment, re-aggregation, potential JSONL regeneration, and conflict resolution if already in a Training Set. That's a full content pipeline.
- View-only gives users the **confidence** they need without the **complexity** of mutation.
- The interface is designed with edit-readiness: the data model doesn't need to change when editing is added later.

**Route:** `/workbase/[id]/fine-tuning/conversations/[convId]`

**Layout:**
- **Back button:** "<- Back to Conversations"
- **Header:** Conversation title/name + status badge (Draft / Ready / In Training Set)
- **Context bar** (horizontal, compact):
  - Persona: "{name}" | Emotional Arc: "{arc name}" | Topic: "{topic}" | Quality Score: {score}/10 | Turn Count: {N} turns
- **Conversation thread** (main content area):
  - Each turn displayed as a chat-style bubble:
    - **User turns** (left-aligned, light background): the "client" side
    - **Assistant turns** (right-aligned, branded background): the AI response being trained
  - Each turn shows: turn number, message content, emotional state tag (pill below message)
  - Strip out: raw JSON structure, technical metadata, enrichment internals, token counts
  - Keep: anything that helps the user understand **what the AI will learn**
- **Your Feedback section** (below conversation thread -- see D9)
- **Footer:** "View Raw JSON" (expandable, collapsed by default)
- **No edit controls.** Layout designed so "Edit" button per turn can be added later without restructuring.

**What to strip vs. keep:**

| Show | Hide |
|---|---|
| Message content (user + assistant) | Raw JSON structure |
| Turn order | Token counts |
| Persona name | Internal IDs |
| Emotional state per turn | Enrichment metadata |
| Topic/category | File paths |
| Quality score | API parameters |

### Part 2: Do Not Reintroduce "Fine Tuning Prep" as a Separate Page

Even with the view-only conversation detail page, **the 2-step flow still works.** The view-only detail page is a **sub-route of Conversations** (`/conversations/[convId]`), not a new step in the flow. The user's workflow doesn't change -- they just have the option to drill into any conversation before selecting it.

A "Fine Tuning Prep" page would make users ask: "What am I supposed to do here that I didn't already do on the Conversations page?" -- creating the two-identical-lists problem.

**Exception:** If conversation **editing** is added in the future, then a "Review & Edit" step between Conversations and Launch Tuning would have a distinct purpose. Not now.

**Updated stepper (unchanged):** `1 Conversations -> 2 Launch Tuning`

| Decision | Recommendation |
|---|---|
| View-only conversation content page | **Yes -- build it.** Route: `/conversations/[convId]`. Chat-style layout, stripped metadata, read-only. Design for future editability. |
| Reintroduce "Fine Tuning Prep" page | **No.** The 2-step flow (Conversations -> Launch Tuning) still holds. The view page is a drill-down within Step 1, not a new step. |
| Future: when editing is added | **Then** consider a "Review & Edit" step between Conversations and Launch Tuning. Not now. |

---

## 4. Decision D2: No Separate KB -- RAG Lives Directly in the Work Base

### Decision: One RAG Scope Per Work Base, No KB Entity

**Why multiple KBs per Work Base would be bad:**
- Adds a container-within-a-container -- users would ask "why do I need to create a Knowledge Base inside my Work Base?"
- Creates the same "Library" problem the transcript identified: a floating entity that doesn't belong
- The Work Base already IS the container. Adding a KB inside it is redundant nesting.

**Why one RAG scope per Work Base is sufficient:**
- Each Work Base represents one project/client/brand
- All documents for that project belong together
- Chat scopes (single doc vs all docs) already handle granularity
- Separate document collections = separate Work Bases

**The resulting model:**
```
Work Base
+-- Fine Tuning: conversations -> training sets -> adapter (one active)
+-- Fact Training: documents -> embeddings -> chat (all docs in this Work Base)
```

No KB creation step. No KB selection. Documents go directly into the Work Base's Fact Training section.

### Technical Impact: Replacing `knowledge_base_id` with `workbase_id`

**Database changes (5 tables):**

| Table | Column Change | Notes |
|---|---|---|
| `rag_documents` | `knowledge_base_id` -> `workbase_id` (NOT NULL) | Primary FK to workbases |
| `rag_embeddings` | `knowledge_base_id` -> `workbase_id` (NULLABLE) | Denormalized for search perf |
| `rag_facts` | `knowledge_base_id` -> `workbase_id` (NULLABLE) | Denormalized for search perf |
| `rag_sections` | `knowledge_base_id` -> `workbase_id` (NULLABLE) | Denormalized for search perf |
| `rag_queries` | `knowledge_base_id` -> `workbase_id` (NOT NULL) | Query history scoping |

**Table to DROP:** `rag_knowledge_bases` -- replaced by `workbases`

**RPC functions to update (4):**
- `increment_kb_doc_count` -> becomes `increment_workbase_doc_count` (or just track on `workbases` table)
- `decrement_kb_doc_count` -> same
- `match_rag_embeddings_kb` -> update `filter_knowledge_base_id` parameter name
- `search_rag_text` -> update `filter_knowledge_base_id` parameter name

**Service files to update (3):**
- `rag-ingestion-service.ts` -- ~6 column references
- `rag-embedding-service.ts` -- ~5 column references
- `rag-retrieval-service.ts` -- ~8 column references

**Type definitions (1 file):**
- `src/types/rag.ts` -- 2 row types + 2 public types

**Gotchas to watch for:**

1. **The denormalization pattern must be preserved.** The `workbase_id` on `rag_embeddings`, `rag_facts`, and `rag_sections` is not a true FK -- it's denormalized for performance so that Work Base-wide vector similarity searches can filter without joining through `rag_documents`. Critical for search performance.

2. **The `increment/decrement_kb_doc_count` RPCs** currently update a `document_count` column on `rag_knowledge_bases`. This counter logic moves to the `workbases` table.

3. **The `rag_knowledge_bases` hook (`useRAGKnowledgeBases`)** and its API route (`/api/rag/knowledge-bases`) become obsolete. The `CreateKnowledgeBaseDialog` component is eliminated.

4. **Client-facing API parameter names** (`knowledgeBaseId` in hooks and routes) can be renamed to `workbaseId` -- this is a clean rewrite.

**Scope assessment:** Medium -- numerous but mechanical changes. No migration risk since test data will be cleared.

---

## 5. Decision D3: Active Adapter Storage -- Column on `workbases` Table

### Decision: `active_adapter_job_id` Column

```sql
ALTER TABLE workbases
ADD COLUMN active_adapter_job_id uuid REFERENCES pipeline_training_jobs(id);
```

**Why this is correct:**
- **Single source of truth**: One column, one place to look
- **Atomic updates**: Changing the active adapter is one UPDATE
- **Simple queries**: `SELECT active_adapter_job_id FROM workbases WHERE id = ?`
- **NULL = no adapter**: Clean representation of "not yet trained"
- **Rollback is trivial**: Just UPDATE to a different job ID
- **Foreign key integrity**: DB enforces that the job exists

**Why NOT a junction table:** The "one active adapter per Work Base" constraint means a junction table with a UNIQUE constraint is functionally identical to a column, but with JOIN overhead. Over-engineered.

**Note on 03-spec `adapter_job_id`:** The 03-spec (Changes 10-15) proposed adding `adapter_job_id` to `rag_knowledge_bases`. Since D2 eliminates `rag_knowledge_bases` entirely, this is superseded. The concept survives as `active_adapter_job_id` on `workbases` -- same binding, different (and simpler) home.

---

## 6. Decision D4: Behavior Chat Availability States

### Decision: Five States with Contextual Banners

| State | LoRA | RAG | What User Sees |
|---|---|---|---|
| **Empty** | No adapter | No docs | Banner: "Set up Fine Tuning or upload documents to start chatting." Two CTAs: "Go to Conversations" / "Upload Documents" |
| **RAG Only** | No adapter | Docs ready | Banner: "Chatting with your documents. Fine Tuning is not active." Chat works with RAG mode. |
| **LoRA Only** | Adapter live | No docs | Banner: "Chatting with your trained AI. No documents uploaded yet." Chat works with LoRA mode. |
| **Full** | Adapter live | Docs ready | Banner: "Chatting with your trained AI + your documents." Mode selector available (LoRA only / RAG only / Both). |
| **Deploying** | Adapter deploying (D11) | Any | Banner: "Your adapter is being deployed -- workers are refreshing. RAG chat is available, LoRA modes will be ready shortly." LoRA/Both modes disabled; RAG-only enabled if docs ready. |

**Implementation:**

The existing `ModeSelector` component already supports `rag_only | lora_only | rag_and_lora`. Needed:
1. Query Work Base state on page load (including `pipeline_inference_endpoints.status`)
2. Auto-select the appropriate default mode
3. Disable unavailable modes in the selector
4. Show the appropriate banner

**Adapter auto-selection:** When an active adapter exists on the Work Base (`active_adapter_job_id IS NOT NULL`), the Behavior Chat page auto-resolves it -- no manual dropdown. This supersedes the 03-spec's Changes 14-15 (RAG Chat adapter auto-selection from KB binding) since the Work Base IS the binding.

**RAG query resolution during LoRA modes:** When the user selects LoRA or RAG+LoRA mode, the chat component resolves the adapter from `workbases.active_adapter_job_id` -- no `modelJobId` parameter needed in the UI. The API resolves it server-side from the Work Base record.

**UX principle:** The chat page is **always accessible** from the sidebar (never grayed out). The page itself explains what's needed and provides CTAs. "Reveal the destination, explain the path."

---

## 7. Decision D5: Conversation Generation Stays on Conversations Page

Keep the "New Conversation" button on the Conversations page. Make the bulk generator a modal/drawer instead of a separate page:

- "New Conversation" -> drawer/modal with persona/emotion/topic selection + "Generate" button
- "Bulk Generate" -> same drawer but with batch size field
- Generated conversations appear in the table with status "Processing -> Ready"
- The `/bulk-generator` page is absorbed -- no separate route

---

## 8. Decision D6: A/B Testing Built into Behavior Chat

The current MultiTurnChat component already includes A/B comparison with:
- `DualResponsePanel` -- side-by-side responses
- `DualArcProgressionDisplay` -- progression comparison
- Per-turn evaluation + Claude-as-Judge scoring

Changes:
1. Component receives `workbaseId` instead of `jobId`
2. Looks up active adapter from the Work Base
3. A/B comparison toggle available when adapter is live
4. When no adapter is live, A/B comparison is hidden/disabled

---

## 9. Decision D7: Complete Route Rewrite

### Decision: Complete Rewrite for Ontological Consistency

**Why rewrite is correct:**
- Current routes lack `workbase_id` parameter -- every page would need a new data-fetching layer
- Dashboard layout has no sidebar -- adding one would conflict with page-level headers
- Mixing old routes (`/rag`) with new routes (`/workbase/[id]/fact-training/documents`) creates URL inconsistency
- RAG page manages internal state transitions via React state -- needs proper routes

**Why rewrite is safe:**
- Test data will be cleared
- No external integrations depend on current routes
- **Components** (ConversationTable, RAGChat, MultiTurnChat, etc.) are preserved -- only **pages** and **routes** change
- API routes (`/api/*`) largely stay the same

| What Changes | What's Preserved |
|---|---|
| All page files under `src/app/(dashboard)/` | All components under `src/components/` |
| Dashboard layout (adds sidebar) | All hooks under `src/hooks/` |
| Route structure (flat -> nested under workbase) | All services under `src/lib/` |
| Page-level data fetching (adds workbase_id) | All API routes under `src/app/api/` (mostly) |
| Zustand stores (adds workbase context) | UI components (`src/components/ui/`) |

**Risk mitigation:**
- Build new routes alongside old ones during development
- Switch default route (`/dashboard` -> `/home`) only when new routes are complete
- Keep old routes alive but hidden for 1 sprint as fallback

---

## 10. Decision D8: Auto-Enrichment (Replaces Manual "Enrich All")

### Problem

The current flow requires users to manually click "Enrich All" on the `/batch-jobs/[id]` page after a batch of conversations is generated. This is an unnecessary manual step.

### Decision: Automatic Inngest-Based Enrichment After Generation

Enrichment was originally manual because Vercel serverless functions terminate after the HTTP response -- fire-and-forget async enrichment gets killed. The solution is to fire an Inngest event after each conversation is generated, which triggers enrichment in a separate function invocation with its own execution time budget.

**New Inngest function: `autoEnrichConversation`**

```typescript
// src/inngest/functions/auto-enrich-conversation.ts
import { inngest } from '@/inngest/client';
import { getPipelineOrchestrator } from '@/lib/services/enrichment-pipeline-orchestrator';

export const autoEnrichConversation = inngest.createFunction(
  {
    id: 'auto-enrich-conversation',
    name: 'Auto-Enrich Conversation',
    concurrency: { limit: 3 },
    retries: 2,
  },
  { event: 'conversation/generation.completed' },
  async ({ event, step }) => {
    const { conversationId, userId } = event.data;

    await step.run('run-enrichment-pipeline', async () => {
      const orchestrator = getPipelineOrchestrator();
      return orchestrator.runPipeline(conversationId, userId);
    });
  }
);
```

**Event fired after each conversation generation succeeds:**

```typescript
await inngest.send({
  name: 'conversation/generation.completed',
  data: {
    conversationId: conversation.id,
    userId: userId,
    batchJobId: batchJob.id,
  },
});
```

**Changes required:**
1. Create `src/inngest/functions/auto-enrich-conversation.ts`
2. Register in `src/inngest/functions/index.ts`
3. Fire event in batch processing flow after conversation is saved
4. **Remove** from `src/app/(dashboard)/batch-jobs/[id]/page.tsx`:
   - "Enrich All" button (lines 609-627)
   - `handleEnrichAll` function (lines 295-339)
   - `enriching` and `enrichResult` state variables
5. **Replace** with live enrichment progress indicator: `Enrichment Progress: 42/50 complete | 3 in progress | 5 pending`
6. **Preserve** `src/app/api/conversations/bulk-enrich/route.ts` -- still useful as retry/recovery mechanism for failed enrichments

**Why Inngest:**
- Independent execution budget (not killed when HTTP response completes)
- Built-in retry with backoff
- Observability via Inngest dashboard
- Concurrency control prevents overwhelming Supabase

**Impact on Conversations page:** Conversations arrive already enriched. The "Enrich Selected" bulk action becomes a retry action for failed enrichments only.

---

## 11. Decision D9: Conversation Feedback (Comments Box)

### Decision: Add Natural-Language Feedback to Conversation Detail Page

A "Your Feedback" section at the bottom of the Conversation Detail page where users can write natural-language comments about what they would change or correct. **Not content editing.** Comments are stored in the DB for future use.

### Database Schema: `conversation_comments` Table

```sql
CREATE TABLE conversation_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Identity Spine (full compliance)
ALTER TABLE conversation_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversation_comments_select_own"
  ON conversation_comments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "conversation_comments_insert_own"
  ON conversation_comments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "conversation_comments_update_own"
  ON conversation_comments FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "conversation_comments_delete_own"
  ON conversation_comments FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "conversation_comments_service_all"
  ON conversation_comments FOR ALL
  USING (auth.role() = 'service_role');

-- Performance indexes
CREATE INDEX idx_conversation_comments_user_id
  ON conversation_comments(user_id);
CREATE INDEX idx_conversation_comments_conversation_id
  ON conversation_comments(conversation_id);
```

**Design decisions:**
- **`ON DELETE CASCADE` from conversations:** Comments cleaned up automatically if conversation is deleted.
- **Multiple comments per conversation:** Users can add multiple comments over time -- more natural than a single blob.
- **`content text NOT NULL`:** No length limit. Users should feel free to write as much as they want.
- **No `turn_number` column (intentional):** This is general feedback, not per-turn annotation. Column can be added later if needed.

### API Routes

**`POST /api/conversations/[id]/comments`** -- Create a comment
**`GET /api/conversations/[id]/comments`** -- List comments for a conversation

Both use `requireAuth()` and verify conversation ownership (404 if not owned).

```typescript
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (!conversation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { content } = await request.json();

  const { data: comment } = await supabase
    .from('conversation_comments')
    .insert({
      conversation_id: params.id,
      user_id: user.id,
      content,
    })
    .select()
    .single();

  return NextResponse.json({ data: comment }, { status: 201 });
}
```

### UI on Conversation Detail Page (Page 2b)

Added below the conversation thread, before the "View Raw JSON" accordion:

- **Section: "Your Feedback"**
  - **Subtext:** "Share your thoughts on this conversation. What would you change? What examples would you correct? Your feedback will help improve future generations."
  - **Comment input:** Multi-line textarea with placeholder: "e.g., 'The advisor's response in turn 3 should be more empathetic' or 'This scenario should include a follow-up question about budget'"
  - **Submit button:** "Add Feedback" (disabled when textarea empty)
  - **Comment list:** Below the input, reverse-chronological. Each comment shows:
    - Comment text
    - Timestamp ("2 hours ago")
    - Delete button (trash icon, with confirmation)
  - **Empty state:** "No feedback yet. After reviewing the conversation, share what you'd change."

**UX notes:**
- Feedback section at the **bottom** (after reading the full conversation) to encourage reading before commenting
- Label says "feedback" not "comments" -- primes the user to think about improvements
- No edit functionality. Users can delete and re-add. Keeps the feature minimal.

### Future Use (documented, not built)

1. **Regeneration with context:** Feed comments as additional system prompt context when regenerating
2. **Quality signal:** Conversations with many comments may indicate lower quality
3. **Training data curation:** Comments help human reviewers understand user quality preferences

---

## 12. Decision D10: Modal Background Fix

### Problem

Every modal in the app is transparent, making them impossible to read and interact with.

### Root Cause

The base Dialog primitive (`src/components/ui/dialog.tsx`) uses `bg-background` for the `DialogContent` panel. This resolves to the CSS variable `--background` which, depending on theme context, may produce insufficient contrast against the underlying page.

### Decision: Fix at the Primitive Level (2 files)

All 15 modal instances across the app inherit from 2 primitives. Fix both primitives, all modals inherit.

**Scope: 15 modal instances**

| Type | Count | Files |
|---|---|---|
| Dialog instances | 13 | error-details-dialog, metadata-edit-dialog, CreateKnowledgeBaseDialog, validation-report-dialog, KeyboardShortcutsHelp, ConversationPreviewModal, ConversationDetailModal, ConversationTable (inline), DatasetSelectorModal, ExportModal, ImportModal, error-report-modal |
| AlertDialog instances | 2 | ConfirmationDialog, batch-jobs/page.tsx (Stop Batch Job) |

**Fix 1: `src/components/ui/dialog.tsx` -- DialogContent**

```tsx
// FROM:
className="bg-background ..."
// TO:
className="bg-zinc-900 text-zinc-50 border-zinc-700 ..."
```

**Fix 2: `src/components/ui/dialog.tsx` -- DialogOverlay**

```tsx
// FROM:
className="... bg-black/50"
// TO:
className="... bg-black/80 backdrop-blur-sm"
```

**Fix 3: `src/components/ui/alert-dialog.tsx`**

Apply identical changes to AlertDialogContent and AlertDialogOverlay.

### Color Palette for Modals

| Element | Class | Result |
|---|---|---|
| **Modal panel background** | `bg-zinc-900` | Solid dark gray (`#18181b`) -- opaque, high contrast |
| **Modal panel text** | `text-zinc-50` | Near-white (`#fafafa`) -- readable |
| **Modal panel border** | `border-zinc-700` | Subtle border (`#3f3f46`) -- defines edge |
| **Overlay/scrim** | `bg-black/80 backdrop-blur-sm` | 80% black + slight blur -- clearly separates modal from page |
| **Input fields inside modals** | `bg-zinc-800` | Slightly lighter (`#27272a`) -- distinguishes inputs |
| **Muted text in modals** | `text-zinc-400` | Gray text (`#a1a1aa`) for secondary info |

**Why `bg-zinc-900` instead of `bg-background`:** Direct Tailwind utility -- no variable chain, guaranteed opaque, clear visual separation regardless of page background.

**Priority:** Phase 0 (pre-work). Fixes a usability blocker across the entire current app immediately.

---

## 13. Decision D11: Adapter Deployment Threading & Worker Refresh Cycle

### Problem

After an adapter is pushed to RunPod via the auto-deploy pipeline, stale workers continue serving old adapter lists -- causing 404 errors when users test newly deployed adapters. The fix: automated worker refresh cycle (`workersMin=0` -> wait -> restore -> verify -> mark ready).

**Shared Endpoint Context:** The single RunPod serverless endpoint (`780tauhj7c126b`) is shared by both the Pipeline adapter testing system (`/pipeline/jobs/[jobId]/test` and `/chat`) **and** the RAG module. Cycling workers affects ALL users and ALL adapters.

### Analysis: Pre-Warming Does Not Work

**Critical constraint identified by James:** RunPod workers do not pick up a new LoRA module until they are **restarted after** the adapter name is added to the endpoint's `LORA_MODULES` environment variable. Pre-warming workers before the adapter name is known is pointless -- the warm worker would need to restart anyway once the adapter is registered.

### Decision: Automated Worker Refresh After LORA_MODULES Update

The existing `autoDeployAdapter` Inngest function handles Steps 1-7 (fetch job -> download adapter -> push to HuggingFace -> update LORA_MODULES -> create DB records). After Step 4 (LORA_MODULES update), a new event triggers the worker refresh cycle.

### Change 1: New Inngest Event Type -- `pipeline/adapter.deployed`

**File:** `src/inngest/client.ts` -- append to the `InngestEvents` type definition

```typescript
/**
 * Fired after auto-deploy-adapter successfully updates LORA_MODULES on RunPod.
 * Triggers worker refresh cycle to ensure new adapters are loaded.
 * Handler: refreshInferenceWorkers (src/inngest/functions/refresh-inference-workers.ts)
 */
'pipeline/adapter.deployed': {
  data: {
    jobId: string;
    userId: string;
    adapterName: string;       // e.g. "adapter-bae71569"
    endpointId: string;        // e.g. "780tauhj7c126b"
    originalWorkersMin: number; // original value to restore
    originalWorkersMax: number; // for reference during polling
  };
};
```

**Acceptance Criteria:**
- GIVEN the `InngestEvents` type in `src/inngest/client.ts`
- WHEN a developer references `'pipeline/adapter.deployed'`
- THEN TypeScript provides type-safe access to `data.jobId`, `data.adapterName`, `data.endpointId`, `data.originalWorkersMin`, `data.originalWorkersMax`

### Change 2: Auto-Deploy Emits `pipeline/adapter.deployed` Event

**File:** `src/inngest/functions/auto-deploy-adapter.ts` -- add a new step between current Step 4 and Step 5

Insert a new Inngest step `emit-worker-refresh` after the existing `update-runpod-lora-modules` step:

```typescript
// =====================================================
// Step 4b: Trigger worker refresh cycle
// Fires pipeline/adapter.deployed event which triggers the
// refreshInferenceWorkers function to cycle workers.
// =====================================================
await step.run('emit-worker-refresh', async () => {
  // Only emit if LORA_MODULES were actually changed (not idempotent skip)
  if (loraModulesResult?.noChange) {
    console.log('[AutoDeployAdapter] LORA_MODULES unchanged -- skipping worker refresh');
    return { skipped: true };
  }

  await inngest.send({
    name: 'pipeline/adapter.deployed',
    data: {
      jobId,
      userId,
      adapterName,
      endpointId: RUNPOD_INFERENCE_ENDPOINT_ID,
      originalWorkersMin: loraModulesResult.originalWorkersMin,
      originalWorkersMax: loraModulesResult.originalWorkersMax,
    },
  });

  console.log(`[AutoDeployAdapter] Emitted pipeline/adapter.deployed for ${adapterName}`);
  return { emitted: true };
});
```

**Step 4 return value changes** -- the `update-runpod-lora-modules` step must return `originalWorkersMin` and `originalWorkersMax`:

```typescript
// Current:
return { loraModules };

// New:
return { loraModules, originalWorkersMin: workersMin, originalWorkersMax: workersMax };
```

For the idempotent skip path:

```typescript
// Current:
return { loraModules, noChange: true };

// New:
return { loraModules, noChange: true, originalWorkersMin: workersMin, originalWorkersMax: workersMax };
```

Capture the return value:

```typescript
const loraModulesResult = await step.run('update-runpod-lora-modules', async () => { ... });
```

**Acceptance Criteria:**
- GIVEN a new adapter is pushed (LORA_MODULES changed on RunPod)
- WHEN the `update-runpod-lora-modules` step completes successfully
- THEN a `pipeline/adapter.deployed` event is emitted with `adapterName`, `endpointId`, `originalWorkersMin`, `originalWorkersMax`

- GIVEN the adapter already exists in LORA_MODULES (idempotent re-run)
- WHEN the `update-runpod-lora-modules` step returns `noChange: true`
- THEN the `emit-worker-refresh` step is skipped (no event emitted)

### Change 3: Step 6 Status from `'ready'` to `'deploying'`

**File:** `src/inngest/functions/auto-deploy-adapter.ts` -- Step 6 (`update-inference-endpoints-db`)

The `update-inference-endpoints-db` step currently writes `status: 'ready'` to `pipeline_inference_endpoints` immediately. Change to `status: 'deploying'` so the UI doesn't show the adapter as ready before workers have restarted.

**RAG Impact:** This status change also affects the RAG models dropdown (`GET /api/rag/models`), which filters for `status: 'ready'`. During the `deploying` window, the adapter will not appear in the RAG model selector -- this is correct behavior, since the adapter cannot serve requests yet.

In the INSERT path of Step 6:
```typescript
// Current:
status: 'ready',
ready_at: now,

// New:
status: 'deploying',
ready_at: null,
```

In the UPDATE path of Step 6:
```typescript
// Current:
status: 'ready',
ready_at: now,

// New:
status: 'deploying',
ready_at: null,
```

**Acceptance Criteria:**
- GIVEN a new adapter deployment completes the LORA_MODULES update
- WHEN Step 6 writes to `pipeline_inference_endpoints`
- THEN both `control` and `adapted` records have `status = 'deploying'` and `ready_at = null`

- GIVEN the UI reads `pipeline_inference_endpoints` for this job
- WHEN the status is `'deploying'`
- THEN the `EndpointStatusBanner` shows "deploying" (not green "ready") and the Run Test button is disabled

- GIVEN a user opens RAG Chat and selects LoRA mode while this adapter is deploying
- WHEN `GET /api/rag/models` executes filtering `status = 'ready'`
- THEN the deploying adapter does NOT appear in the dropdown (correct -- it can't serve yet)

### Change 4: New Inngest Function -- `refreshInferenceWorkers`

**File:** New file `src/inngest/functions/refresh-inference-workers.ts`

```
Function ID: refresh-inference-workers
Trigger: pipeline/adapter.deployed
Concurrency: { limit: 1 }
Retries: 1 (only 1 retry -- avoid infinite worker cycling)
```

**Step sequence:**

| Step Name | Action | Timeout | Fatal on Error? |
|-----------|--------|---------|-----------------|
| `scale-down-workers` | GraphQL `saveEndpoint` with `workersMin: 0` | 30s | Yes |
| `wait-for-workers-terminated` | Poll `GET /health` every 5s until `workers.ready + workers.idle + workers.running + workers.initializing === 0` | 90s | Yes (with cleanup) |
| `scale-up-workers` | GraphQL `saveEndpoint` with `workersMin: originalWorkersMin` (from event data) + `MAX_LORAS: 5` (D12) | 30s | Yes |
| `wait-for-workers-ready` | Poll `GET /health` every 5s until `workers.ready > 0 || workers.idle > 0` | 180s | Yes (with warning) |
| `verify-adapter-available` | Send a lightweight inference request using the adapter name to confirm it does not 404 | 60s | No (non-fatal, log warning) |
| `mark-endpoints-ready` | UPDATE `pipeline_inference_endpoints` SET `status = 'ready'`, `ready_at = NOW()` WHERE `job_id = jobId` | 10s | No (non-fatal) |

**Environment variables used** (same as auto-deploy-adapter -- no new env vars):
- `RUNPOD_GRAPHQL_API_KEY` -- for `saveEndpoint` mutation
- `GPU_CLUSTER_API_KEY` / `RUNPOD_API_KEY` -- for `/health` polling (Bearer auth)
- `INFERENCE_API_URL` -- base URL for health polling

**GraphQL mutation** (reuse exact same `saveEndpoint` mutation from auto-deploy-adapter Step 4):

For scale-down:
```graphql
mutation SaveEndpointEnv($input: EndpointInput!) {
  saveEndpoint(input: $input) { id }
}
```
Input: all original endpoint fields from the fetch query, but with `workersMin: 0`. **Do not change `env`** -- pass it through unchanged.

For scale-up:
Same mutation but with `workersMin: originalWorkersMin` (from event data) and `MAX_LORAS: 5` in the env array (D12).

**Health polling logic:**

```typescript
async function pollWorkerState(
  endpointUrl: string,
  apiKey: string,
  condition: (workers: WorkerState) => boolean,
  maxWaitMs: number,
  pollIntervalMs: number = 5000
): Promise<{ met: boolean; finalState: WorkerState; waitedMs: number }>
```

**Cleanup on failure:** If any step fails, the function must ensure `workersMin` is restored to the original value. Use a try/catch wrapper around the scale-down -> wait -> scale-up sequence, and if the scale-up step hasn't run yet, run it in the catch block.

**Adapter verification** (Step 5 -- `verify-adapter-available`):

Send a minimal inference request to `POST ${INFERENCE_API_URL}/runsync`:
```json
{
  "input": {
    "openai_route": "/v1/chat/completions",
    "openai_input": {
      "model": "<adapterName>",
      "messages": [{"role": "user", "content": "Hello"}],
      "max_tokens": 5,
      "temperature": 0.0
    }
  }
}
```

If the response status is `COMPLETED`, the adapter is verified. If `FAILED` with a 404/NotFoundError, log a warning but do not fail the step -- the adapter may load on the next request. The key constraint is that workers have restarted (they will have the adapter in their LORA_MODULES).

**DB update** (Step 6 -- `mark-endpoints-ready`):

```typescript
const supabase = createServerSupabaseAdminClient();
await supabase
  .from('pipeline_inference_endpoints')
  .update({ status: 'ready', ready_at: new Date().toISOString() })
  .eq('job_id', jobId);
```

Note: This uses Supabase admin client (same as auto-deploy-adapter). This is server-side code running inside an Inngest function -- SAOL is not applicable here because SAOL is for agent-driven terminal operations, not application code.

**Acceptance Criteria:**

- GIVEN the auto-deploy-adapter emits `pipeline/adapter.deployed` with `endpointId: "780tauhj7c126b"` and `originalWorkersMin: 0`
- WHEN `refreshInferenceWorkers` runs
- THEN `workersMin` is set to 0 on the endpoint, the function polls `/health` until all workers are gone, `workersMin` is restored to 0 (original value), workers restart, and `pipeline_inference_endpoints.status` is updated to `'ready'`

- GIVEN `workersMin` was 2 before the deploy
- WHEN `refreshInferenceWorkers` receives `originalWorkersMin: 2`
- THEN after the cycle, `workersMin` is restored to 2

- GIVEN the scale-down step succeeds but `wait-for-workers-terminated` times out at 90s
- WHEN the timeout occurs
- THEN `workersMin` is restored to the original value (cleanup) and the function throws an error (Inngest retries once)

- GIVEN the `verify-adapter-available` step sends a test inference
- WHEN the adapter returns a 404 NotFoundError
- THEN the step logs a warning but does NOT fail -- the endpoints are still marked `'ready'` because worker restart guarantees LORA_MODULES are loaded

### Change 5: Register the New Function

**File:** `src/inngest/functions/index.ts`

Add import:
```typescript
import { refreshInferenceWorkers } from './refresh-inference-workers';
```

Add to the `inngestFunctions` array:
```typescript
export const inngestFunctions = [
  processRAGDocument,
  dispatchTrainingJob,
  dispatchTrainingJobFailureHandler,
  autoDeployAdapter,
  refreshInferenceWorkers,  // NEW
];
```

Add to the named exports:
```typescript
export {
  processRAGDocument,
  dispatchTrainingJob,
  dispatchTrainingJobFailureHandler,
  autoDeployAdapter,
  refreshInferenceWorkers,  // NEW
};
```

**Acceptance Criteria:**
- GIVEN the Inngest serve endpoint at `POST /api/inngest`
- WHEN Inngest syncs functions
- THEN `refresh-inference-workers` appears in the registered functions list

### Impact on `workbases` DDL

No `inference_endpoint_id` or `inference_endpoint_url` columns on the `workbases` table. The shared endpoint is used by all Work Bases. Per-customer endpoints are deferred (see D12 research deliverable).

---

## 14. Decision D12: MAX_LORAS Increase & Research Deliverables

### Change 6: Increase `MAX_LORAS` to 5 via Worker Refresh

**File:** `src/inngest/functions/refresh-inference-workers.ts` -- inside the `scale-up-workers` step

During the worker refresh cycle's `scale-up-workers` step, update the `MAX_LORAS` env var from `1` to `5` alongside restoring `workersMin`.

**Why:** James confirmed: _"We can increase this and even increase the number of workers."_ Doing it during worker refresh means the new value takes effect when workers cold-start with the updated env. With `MAX_LORAS=5`, up to 5 different adapters can be loaded simultaneously on each worker.

**Implementation:**

In the `scale-up-workers` step, after fetching the current endpoint state, modify the `env` array:

```typescript
const updatedEnv = currentEnv.map(e =>
  e.key === 'MAX_LORAS' ? { key: 'MAX_LORAS', value: '5' } : e
);

// Defensive: if MAX_LORAS not in env, append it
if (!updatedEnv.some(e => e.key === 'MAX_LORAS')) {
  updatedEnv.push({ key: 'MAX_LORAS', value: '5' });
}
```

Then pass `env: updatedEnv` along with `workersMin: originalWorkersMin` to the `saveEndpoint` mutation.

**Acceptance Criteria:**

- GIVEN the RunPod endpoint has `MAX_LORAS=1` in its env vars
- WHEN the `scale-up-workers` step runs
- THEN the endpoint's `MAX_LORAS` env var is set to `5`

- GIVEN the endpoint already has `MAX_LORAS=5` (subsequent runs)
- WHEN the `scale-up-workers` step runs
- THEN `MAX_LORAS` remains `5` (idempotent)

### Change 8: Research Deliverable -- RunPod Programmatic Endpoint Creation

**Deliverable type:** Documentation only. Do NOT call `createEndpoint`. Just log what it would look like.

**File:** Include findings as console output in the test script (`scripts/test-worker-refresh.ts`)

**Why:** James asked: _"Research if a serverless endpoint can be created by the API"_ and _"Find out if the API can create serverless LLMs using our template (or at least with our custom settings)"_

**Future Relevance to RAG:** If each customer eventually needs an isolated serverless endpoint (for strong tenant isolation at >10 customers), programmatic endpoint creation becomes critical. The research deliverable should document the full `createEndpoint` mutation signature, template cloning capabilities, and per-endpoint env var injection.

The test script should include a dry-run section that:
1. Queries the existing endpoint `780tauhj7c126b` for its full configuration (template, GPU IDs, env vars)
2. Logs the template ID and all settings
3. Documents the `createEndpoint` mutation signature
4. Does NOT actually create an endpoint -- just logs what the mutation call would look like

**Acceptance Criteria:**
- GIVEN the test script runs
- WHEN the "endpoint creation research" section executes
- THEN it logs the current endpoint's `templateId`, full `env` array, and a sample `createEndpoint` mutation that could be used to create a clone

### Change 9: Document `INFERENCE_MODE` Pods Behavior

**File:** `src/lib/services/inference-service.ts` -- existing mode switch comment block

Add/expand the comment block at the top of `inference-service.ts`:

```typescript
/**
 * INFERENCE_MODE Configuration
 *
 * "serverless" (default):
 *   - Uses RunPod Serverless vLLM endpoints
 *   - Workers auto-scale (workersMin/workersMax)
 *   - Adapters loaded via LORA_MODULES env var at worker cold-start
 *   - Cost: pay per second of active compute
 *   - Endpoint URL: INFERENCE_API_URL (e.g. https://api.runpod.ai/v2/780tauhj7c126b)
 *   - Shared by BOTH Pipeline adapter testing AND RAG LoRA queries
 *
 * "pods" (permanent instance):
 *   - Uses dedicated RunPod Pods with direct OpenAI-compatible API
 *   - Requires two separate pods: one for base model, one with adapter loaded
 *   - Adapters loaded via vLLM CLI args (--lora-modules) at pod startup
 *   - Cost: ~$0.50-5.00/hour continuous (GPU-dependent), faster cold-start
 *   - Endpoint URLs: INFERENCE_API_URL (control) + INFERENCE_API_URL_ADAPTED (adapted)
 *   - To add new adapters: restart the adapted pod with updated --lora-modules
 *
 * Switching: Set INFERENCE_MODE env var in Vercel + .env.local
 */
```

**Acceptance Criteria:**
- GIVEN a developer reads `inference-service.ts`
- WHEN they look at the mode configuration
- THEN they understand both modes, their cost implications, and how adapters are loaded in each

### Change 7: Test Script -- `scripts/test-worker-refresh.ts`

**Purpose:** Standalone script that validates the worker refresh cycle end-to-end outside of Inngest. James asked: _"Run test scripts to set to 0 wait a minute then set to 2. You can do this in an automated way before declaring it is working correct?"_

**Steps:**
1. Load env vars from `.env.local` (`dotenv`)
2. Fetch current endpoint state via RunPod GraphQL (same query as auto-deploy Step 4a)
3. Log current worker count from `/health`
4. Set `workersMin: 0` via `saveEndpoint` mutation
5. Poll `/health` every 3s, logging worker state each poll, until all worker counts reach 0 (or 90s timeout)
6. **Rapid-fire test:** Immediately after setting `workersMin: 0`, also test setting `workersMin: 2` right away, to verify if RunPod honors the 0->2 sequence (James' question: _"This could be tested by sending a 'Workers=0' immediately after sending 'Workers=2'"_)
7. Wait for workers to come back to `ready` or `idle` state
8. Log final worker state
9. Restore original `workersMin` value

**Environment variables:**
- `RUNPOD_GRAPHQL_API_KEY`
- `GPU_CLUSTER_API_KEY` or `RUNPOD_API_KEY`
- `RUNPOD_INFERENCE_ENDPOINT_ID` (or use hardcoded `780tauhj7c126b`)
- `INFERENCE_API_URL`

**Run command:** `npx tsx scripts/test-worker-refresh.ts`

**Acceptance Criteria:**

- GIVEN the script is run with valid env vars
- WHEN `workersMin` is set to 0
- THEN the script logs the worker count decreasing over time until all workers are terminated (including any that were "initializing")

- GIVEN workers are at 0
- WHEN `workersMin` is set back to 2
- THEN new workers initialize and eventually reach "ready" or "idle" state

- GIVEN the 0->2 rapid fire test
- WHEN `workersMin=0` is sent immediately followed by `workersMin=2`
- THEN the script logs whether RunPod processed both in sequence or if the second overrode the first

---

## 15. Revised Ontology & Page Map

```
Account
+-- Home (/home)
|   +-- QuickStart tile (for new users / empty state)
|   +-- Work Base list (cards with status)
|
+-- Work Base (/workbase/[id])
    +-- Overview (/workbase/[id])
    |   +-- Fine Tuning status card (stepper + adapter status)
    |   +-- Fact Training status card (doc count + index status)
    |   +-- Chat shortcut (if anything is configured)
    |
    +-- Fine Tuning (/workbase/[id]/fine-tuning)
    |   +-- Conversations (/workbase/[id]/fine-tuning/conversations)
    |   |   +-- Section A: Conversation Library (table with filters, generation, auto-enrichment)
    |   |   |   +-- "View Content" per row -> Conversation Detail (view-only + feedback)
    |   |   |   +-- "Build Training Set" CTA (select conversations -> aggregate)
    |   |   +-- Section B: Training Sets (aggregation history, status, download)
    |   |
    |   +-- Conversation Detail (/workbase/[id]/fine-tuning/conversations/[convId])
    |   |   +-- View-only: chat-style turn display, context bar, no editing
    |   |   +-- Your Feedback: comments box for natural-language feedback (D9)
    |   |
    |   +-- Launch Tuning (/workbase/[id]/fine-tuning/launch)
    |   |   +-- Current Training Set (auto-selected or user picks)
    |   |   +-- 3 lay-person sliders (Sensitivity, Progression, Repetition)
    |   |   +-- Cost estimate
    |   |   +-- "Train & Publish" CTA
    |   |   +-- Adapter history with rollback
    |   |
    |   +-- Behavior Chat (/workbase/[id]/fine-tuning/chat)
    |       +-- Uses active adapter + optional RAG
    |       +-- A/B testing built-in (when adapter is live)
    |       +-- Mode selector (LoRA only / RAG only / Both)
    |       +-- 5 availability states with contextual banners (D4)
    |       +-- Adapter status: shows "deploying" during worker refresh (D11)
    |
    +-- Fact Training (/workbase/[id]/fact-training)
    |   +-- Documents (/workbase/[id]/fact-training/documents)
    |   |   +-- Upload area (drag-drop)
    |   |   +-- Document list with status pipeline
    |   |   +-- "Chat this document" / "Chat all documents" CTAs
    |   |
    |   +-- Document Detail (/workbase/[id]/fact-training/documents/[docId])
    |   |   +-- Detail tab
    |   |   +-- Expert Q&A tab
    |   |   +-- Chat tab (single-doc)
    |   |   +-- Diagnostic tab
    |   |   +-- Quality tab
    |   |
    |   +-- Chat (/workbase/[id]/fact-training/chat)
    |   |   +-- Default: all documents in Work Base
    |   |   +-- Optional: per-document filter
    |   |   +-- Citations with document names
    |   |
    |   +-- Quality (/workbase/[id]/fact-training/quality)
    |       +-- Quality dashboard (5 metrics)
    |       +-- Golden-set regression testing
    |
    +-- Settings (/workbase/[id]/settings)
        +-- Name, description
        +-- Endpoint/adapter display (read-only)
```

### Key Changes from v1 Ontology

1. **Data Shaping page ELIMINATED** -- aggregation lives on the Conversations page as "Build Training Set"
2. **Stepper simplified**: `Conversations -> Launch Tuning` (2 steps, not 3)
3. **Single Document Chat and All Documents Chat MERGED** into one "Chat" page under Fact Training
4. **Processing Status page ABSORBED** into the Documents page (per-document status inline)
5. **No KB entity anywhere** -- documents go directly into the Work Base
6. **Conversation Detail includes feedback section** (D9)
7. **Auto-enrichment replaces manual "Enrich All"** (D8)
8. **Deploying state visible in Behavior Chat** (D11)

---

## 16. Revised Navigation

```
[Work Base Name] v (switcher)
-------------------------------
Overview

FINE TUNING
  Conversations
  Launch Tuning
  Behavior Chat

FACT TRAINING
  Documents
  Chat
  Quality

Settings
```

- Section headers are "FINE TUNING" and "FACT TRAINING" (uppercase, non-clickable labels)
- 7 clickable pages + 1 overview = 8 pages total

---

## 17. Detailed Page Specifications

### Page 0: Home (`/home`)

**Purpose:** Entry point. Get users to their Work Base or through QuickStart.

**Layout:**
- Header: "BrightHub" + user info + sign out
- **QuickStart tile** (shown if user has 0 Work Bases OR conditional):
  - "Chat with your documents in minutes"
  - CTA: "Get Started" -> QuickStart wizard
- **Your Work Bases** (card grid):
  - Each card: Name, Fine Tuning status pill, Fact Training status pill, last activity
  - Click -> enters Work Base Overview
- **CTA:** "+ New Work Base" (creates empty Work Base with name input)

---

### Page 1: Work Base Overview (`/workbase/[id]`)

**Purpose:** One-glance orientation + next best action.

**Layout:**
- **Conditional QuickStart** (if 0 docs AND no conversations): "Upload documents to start chatting" + "Create conversations to start training"
- **Fine Tuning card:**
  - Stepper: `Conversations -> Launch Tuning`
  - Adapter status: None / Training / Deploying (D11) / Live
  - CTA: "Continue" (routes to the incomplete step)
- **Fact Training card:**
  - Documents: X uploaded, Y ready
  - CTA: "Upload Document" or "Open Chat"
- **Behavior Chat shortcut** (if adapter live OR docs ready):
  - "Chat with your AI" -> routes to Behavior Chat

---

### Page 2: Conversations (`/workbase/[id]/fine-tuning/conversations`)

**Purpose:** Create, review, select, and aggregate conversations into Training Sets.

**Layout -- Section A: Conversation Library (primary)**
- **Header:** "Conversations"
- **Subtext:** "Create and refine training conversations. Select conversations to build a Training Set."
- **Stepper** (top): `1 Conversations <- current -> 2 Launch Tuning`
- **Top controls:**
  - CTA: "New Conversation" (opens generation drawer/modal)
  - CTA: "Add from other Work Bases..." (for reusable conversations -- Phase 4)
  - Search bar
- **Filters:** Status (Draft / Ready / In Training Set), Tier, Quality Score
- **Table:** Same as current ConversationTable but with:
  - Checkbox column for multi-select
  - New column: "Training Sets" (shows which Training Sets include this conversation)
  - Status badge includes: `Draft | Ready | In Training Set`
  - **"View Content" button** per row -> navigates to Conversation Detail page
  - Row click -> ConversationDetailModal (preserved for quick metadata view)
- **Bulk action bar** (appears when conversations selected):
  - "Build Training Set" (primary CTA -- aggregates selected into a new Training Set)
  - "Retry Failed Enrichments" (for conversations where auto-enrichment failed)
- **Pagination:** Preserved from current

**Layout -- Section B: Training Sets (secondary, below)**
- **Header:** "Training Sets"
- **Subtext:** "Packaged conversation bundles ready for Launch Tuning."
- **List/table:** Each row shows:
  - Name (auto-generated: "Training Set -- Feb 27, 2026 3:12pm", editable)
  - Conversations: X conversations, Y training pairs
  - Status: Processing / Ready / Failed
  - Badge: "Active" (if used by the current live adapter)
  - Actions:
    - "Use for Launch Tuning" -> navigates to Launch Tuning with this set pre-selected
    - "View JSON" (expandable viewer)
    - "Download JSONL"
    - "View Details" (which conversations are included)

**What this replaces:** The Conversations page + Training Files page + Datasets page + Data Shaping page. **Four pages become one.**

---

### Page 2b: Conversation Detail (`/workbase/[id]/fine-tuning/conversations/[convId]`)

**Purpose:** Let users read the full content of a conversation before selecting it for training. View-only. Builds trust with controlling SMB owners who need to see what their AI will learn.

**Layout:**
- **Back button:** "<- Back to Conversations"
- **Header:** Conversation title + status badge (Draft / Ready / In Training Set)
- **Context bar** (horizontal strip, compact):
  - Persona: "{name}" | Arc: "{arc}" | Topic: "{topic}" | Quality: {score}/10 | Turns: {N}
- **Conversation thread** (main content, scrollable):
  - Chat-style bubbles for each turn:
    - User turns (left-aligned, light bg): the "client" side
    - Assistant turns (right-aligned, branded bg): the trained AI response
  - Per turn: turn number, message content, emotional state pill (e.g., "frustrated -> empathetic")
  - Generous whitespace, readable font, mobile-friendly
  - Technical metadata stripped: no raw JSON, token counts, IDs, file paths, enrichment internals
- **Your Feedback section** (below conversation thread):
  - **Subtext:** "Share your thoughts on this conversation. What would you change? What examples would you correct? Your feedback will help improve future generations."
  - **Comment input:** Multi-line textarea with placeholder: "e.g., 'The advisor's response in turn 3 should be more empathetic' or 'This scenario should include a follow-up question about budget'"
  - **Submit button:** "Add Feedback" (disabled when textarea empty)
  - **Comment list:** Below the input, reverse-chronological. Each comment shows:
    - Comment text
    - Timestamp ("2 hours ago")
    - Delete button (trash icon, with confirmation)
  - **Empty state:** "No feedback yet. After reviewing the conversation, share what you'd change."
- **Footer (collapsed):** "View Raw JSON" accordion for power users
- **No edit controls.** Layout designed so "Edit" button per turn can be added later without restructuring.

**Data source:** Fetches conversation JSON from Supabase Storage (same data the ConversationDetailModal uses, but rendered as a full page with chat-style formatting).

---

### Page 3: Launch Tuning (`/workbase/[id]/fine-tuning/launch`)

**Purpose:** Configure training parameters -> train -> deploy. One page for the entire launch pipeline.

**Layout:**
- **Stepper** (top): `1 Conversations -> 2 Launch Tuning <- current`
- **Banner:** Active adapter status: `Not launched | Training (X%) | Deploying (D11) | Live`
  - If Live: shows static adapter name

**Section A: Training Input**
- Card: "Training Set: {name}" (auto-selected: latest Ready set, or user picks from dropdown)
- Details: conversation count, training pair count, avg quality
- Button: "Change Training Set" (dropdown of Ready sets)
- Button: "View JSONL" (opens viewer)

**Section B: Training Settings** (preserved from current `pipeline/configure`)
- 3 lay-person sliders:
  - Training Sensitivity (Very Stable <-> Very Adaptive)
  - Training Progression (Deep Thinking <-> Broad Learning)
  - Training Repetition (Quick <-> Deep)
- Job Name input

**Section C: Cost & Launch** (sidebar or right column)
- Cost estimate card (preserved from current)
- CTA: **"Train & Publish"**
  - When clicked: shows inline progress:
    1. Training adapter... (with progress %, metrics)
    2. Storing on HuggingFace...
    3. Updating endpoint...
    4. Refreshing workers... (D11)
  - On completion: "Adapter is Live!" + CTA "Open Behavior Chat"
- If training is running: shows progress inline (replaces the separate monitor page)

**Section D: Adapter History** (bottom, collapsible)
- List of past launches: timestamp, Training Set used, result (Success/Failed), cost
- Action: "Set Active" (rollback to a previous adapter)
- Action: "View Logs"

**What this replaces:** Pipeline Configure + Pipeline Jobs + Pipeline Job Detail + Pipeline Results. **Four pages become one.**

---

### Page 4: Behavior Chat (`/workbase/[id]/fine-tuning/chat`)

**Purpose:** The user reward -- chat with their trained AI, optionally grounded in documents.

**Layout:**
- **Availability banner** (top, conditional -- see D4 states)
- **Deploying banner** (D11): When `pipeline_inference_endpoints.status = 'deploying'`, show: "Your adapter is being deployed -- workers are refreshing. RAG chat is available, LoRA modes will be ready shortly." LoRA/Both modes disabled in selector.
- **Mode selector** (if both LoRA and RAG available):
  - Behavior Only (LoRA)
  - Documents Only (RAG)
  - Behavior + Documents (Both)
- **Chat UI:** Preserved MultiTurnChat component
  - If A/B testing: DualResponsePanel (Control vs Adapted)
  - Per-turn evaluation (optional toggle)
  - Conversation history sidebar

**State logic:**
```
active_adapter = workbase.active_adapter_job_id
adapter_status = pipeline_inference_endpoints.status (for the active adapter)
docs_ready = workbase.document_count > 0 AND at least 1 doc with status 'ready'

if (!active_adapter && !docs_ready)                    -> Empty state
if (!active_adapter && docs_ready)                     -> RAG-only mode, LoRA disabled
if (active_adapter && adapter_status == 'deploying')   -> Deploying state, RAG available, LoRA disabled
if (active_adapter && adapter_status == 'ready' && !docs_ready) -> LoRA-only mode, RAG disabled
if (active_adapter && adapter_status == 'ready' && docs_ready)  -> Full mode, all options enabled
```

---

### Page 5: Documents (`/workbase/[id]/fact-training/documents`)

**Purpose:** Upload and manage documents for this Work Base.

**Layout:**
- **Header:** "Documents"
- **Subtext:** "Upload documents to teach your AI about your business."
- **Upload area:** Drag-drop zone + "Upload Document" button + supported formats
- **Document list:** Each row:
  - Filename + type icon
  - Status pipeline: `Uploading -> Extracting -> Indexing -> Ready` (or Failed)
  - Actions: "Chat" (single-doc), "Details" (-> Document Detail), "Remove"
- **CTAs** (contextual):
  - If 1+ doc Ready: "Chat with Documents" -> routes to Fact Training Chat
- **Info line:** "Documents are scoped to this Work Base."

**What this replaces:** RAG page (KB selection state + document management state) + Knowledge Base Dashboard. The KB selection step is completely eliminated.

---

### Page 6: Document Detail (`/workbase/[id]/fact-training/documents/[docId]`)

**Purpose:** Deep view of a single document with processing details, Expert Q&A, and single-doc chat.

**Layout:** Preserved from current `/rag/[id]` with tabs:
- Detail (document info, sections, facts)
- Expert Q&A (question answering for RAG quality)
- Chat (single-document chat with citations)
- Diagnostic (extraction verification)
- Quality (quality metrics for this document)

**Changes:** Route changes from `/rag/[id]` to `/workbase/[id]/fact-training/documents/[docId]`. Internal component logic preserved.

---

### Page 7: Fact Training Chat (`/workbase/[id]/fact-training/chat`)

**Purpose:** Chat with all documents in the Work Base, with citations.

**Layout:**
- **Left panel:** Document filter (checkboxes, default: all selected)
- **Main panel:** Chat thread with RAGChat component
- **Citations:** Inline with document names + expandable snippets

**What this replaces:** The "chatKbId" state in the RAG page + the "Chat with all" button flow. Now it's a proper route.

---

### Page 8: Quality (`/workbase/[id]/fact-training/quality`)

**Purpose:** RAG quality metrics and regression testing.

**Layout:** Preserved from current:
- Quality Dashboard (5 metrics: Faithfulness, Relevance, Completeness, Citation Accuracy, Composite)
- Golden-set regression testing interface

---

### Page 9: Settings (`/workbase/[id]/settings`)

**Purpose:** Work Base configuration.

**Sections:**
- **General:** Name (editable), Description (editable)
- **Endpoint:** Active adapter info (read-only display): adapter name, model, deployed date
- **Danger zone:** Archive Work Base

---

## 18. Technical Architecture

### New Database Table: `workbases`

```sql
CREATE TABLE workbases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  description text,
  active_adapter_job_id uuid REFERENCES pipeline_training_jobs(id),
  document_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Identity Spine: RLS
ALTER TABLE workbases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own workbases"
  ON workbases FOR ALL
  USING (user_id = auth.uid());

-- Identity Spine: Performance index
CREATE INDEX idx_workbases_user_id ON workbases(user_id);
```

### New Database Table: `conversation_comments`

```sql
CREATE TABLE conversation_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Identity Spine: RLS + 5 policies
ALTER TABLE conversation_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversation_comments_select_own" ON conversation_comments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "conversation_comments_insert_own" ON conversation_comments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "conversation_comments_update_own" ON conversation_comments FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "conversation_comments_delete_own" ON conversation_comments FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "conversation_comments_service_all" ON conversation_comments FOR ALL USING (auth.role() = 'service_role');

-- Identity Spine: Performance indexes
CREATE INDEX idx_conversation_comments_user_id ON conversation_comments(user_id);
CREATE INDEX idx_conversation_comments_conversation_id ON conversation_comments(conversation_id);
```

### Foreign Keys to Add

```sql
ALTER TABLE conversations ADD COLUMN workbase_id uuid REFERENCES workbases(id);
ALTER TABLE training_files ADD COLUMN workbase_id uuid REFERENCES workbases(id);
ALTER TABLE pipeline_training_jobs ADD COLUMN workbase_id uuid REFERENCES workbases(id);

-- RAG tables: RENAME knowledge_base_id -> workbase_id
ALTER TABLE rag_documents RENAME COLUMN knowledge_base_id TO workbase_id;
ALTER TABLE rag_embeddings RENAME COLUMN knowledge_base_id TO workbase_id;
ALTER TABLE rag_facts RENAME COLUMN knowledge_base_id TO workbase_id;
ALTER TABLE rag_sections RENAME COLUMN knowledge_base_id TO workbase_id;
ALTER TABLE rag_queries RENAME COLUMN knowledge_base_id TO workbase_id;

-- Add FK constraint for rag_documents (primary FK)
ALTER TABLE rag_documents ADD CONSTRAINT fk_rag_documents_workbase
  FOREIGN KEY (workbase_id) REFERENCES workbases(id);
```

### Performance Indexes for New FK Columns

```sql
-- Identity Spine compliance: CONCURRENTLY, no transaction
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_workbase_id
  ON conversations(workbase_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_files_workbase_id
  ON training_files(workbase_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pipeline_training_jobs_workbase_id
  ON pipeline_training_jobs(workbase_id);
```

### API Route Pattern (Identity Spine Compliance)

Every new API route MUST follow this pattern:

```typescript
import { requireAuth } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response; // 401 if unauthenticated

  // Verify workbase ownership before any operation
  const workbase = await supabase
    .from('workbases')
    .select('id')
    .eq('id', workbaseId)
    .eq('user_id', user.id)
    .single();

  if (!workbase.data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
    // 404, never 403 -- do not reveal existence
  }
}
```

### New Route Structure

```
src/app/
+-- (auth)/                          # Preserved
|   +-- signin/
|   +-- signup/
+-- (dashboard)/
|   +-- home/page.tsx                # NEW -- replaces /dashboard
|   +-- workbase/[id]/
|       +-- layout.tsx               # NEW -- sidebar layout
|       +-- page.tsx                 # Overview
|       +-- fine-tuning/
|       |   +-- conversations/page.tsx
|       |   +-- conversations/[convId]/page.tsx  # NEW -- Conversation Detail + Feedback
|       |   +-- launch/page.tsx
|       |   +-- chat/page.tsx
|       +-- fact-training/
|       |   +-- documents/page.tsx
|       |   +-- documents/[docId]/page.tsx
|       |   +-- chat/page.tsx
|       |   +-- quality/page.tsx
|       +-- settings/page.tsx
+-- api/                             # Mostly preserved, some new routes
|   +-- workbases/                   # NEW
|   |   +-- route.ts                 # CRUD for workbases
|   +-- workbase/[id]/
|   |   +-- training-sets/route.ts   # NEW -- aggregation endpoint
|   +-- conversations/[id]/
|   |   +-- comments/route.ts        # NEW -- feedback CRUD
|   +-- ... (existing API routes preserved)
```

### New Inngest Functions

| Function | File | Trigger | Concurrency | Purpose |
|---|---|---|---|---|
| `autoEnrichConversation` | `auto-enrich-conversation.ts` | `conversation/generation.completed` | 3 | Auto-enrich each generated conversation (D8) |
| `refreshInferenceWorkers` | `refresh-inference-workers.ts` | `pipeline/adapter.deployed` | 1 | Worker refresh cycle after LORA_MODULES update (D11) |

### Modified Inngest Functions

| Function | File | Changes |
|---|---|---|
| `autoDeployAdapter` | `auto-deploy-adapter.ts` | Step 4 returns `originalWorkersMin/Max`; new Step 4b emits `pipeline/adapter.deployed`; Step 6 writes `status: 'deploying'` instead of `'ready'` |

### New Inngest Event Types

| Event | Emitted By | Handled By |
|---|---|---|
| `conversation/generation.completed` | Batch processing flow (after conversation save) | `autoEnrichConversation` |
| `pipeline/adapter.deployed` | `autoDeployAdapter` Step 4b | `refreshInferenceWorkers` |

### Key Component Reuse

| Existing Component | Used In (New) | Changes Needed |
|---|---|---|
| `ConversationTable` | Conversations page | Add checkbox column, Training Set column |
| `ConversationDetailModal` | Conversations page | None |
| `TrainingParameterSlider` | Launch Tuning page | None |
| `CostEstimateCard` | Launch Tuning page | None |
| `MultiTurnChat` | Behavior Chat page | Accept workbaseId instead of jobId; auto-resolve adapter from Work Base |
| `DualResponsePanel` | Behavior Chat page | None |
| `RAGChat` | Fact Training Chat, Document Detail | Accept workbaseId instead of knowledgeBaseId; auto-resolve adapter from Work Base |
| `DocumentUploader` | Documents page | Accept workbaseId instead of knowledgeBaseId |
| `DocumentList` | Documents page | Accept workbaseId instead of knowledgeBaseId |
| `ExpertQAPanel` | Document Detail | None |
| `QualityDashboard` | Quality page | None |
| `ModeSelector` | Behavior Chat | Add disabled states |
| `EndpointStatusBanner` | Behavior Chat, Launch Tuning | Show "deploying" during worker refresh (D11) |

---

## 19. Risk Areas

| Risk | Mitigation |
|------|------------|
| Setting `workersMin=0` kills workers mid-request | RunPod serverless drains active requests before terminating workers. The `idleTimeout: 5` means workers die 5s after their last request completes. |
| Worker refresh runs while another adapter deploy is in progress | Both `auto-deploy-adapter` and `refresh-inference-workers` have `concurrency: { limit: 1 }`, serializing all operations on the shared endpoint. |
| Timeout: workers never reach "ready" state | 3-minute timeout with fallback to set `workersMin` back to original value -- never leaves the endpoint with 0 workers permanently. |
| `MAX_LORAS` change requires worker restart to take effect | The worker refresh cycle already restarts all workers, so env var changes are picked up automatically. |
| RAG module query using adapter while workers are cycling | The query will hit RunPod's cold-start queue or fail with a retry-able error. The RAG retrieval service already has retry logic in `callInferenceEndpoint()`. During the `deploying` status window, the UI should show a warning but not block RAG-only queries. |

---

## 20. Implementation Sequence

### Phase 0: Pre-work (1 day)
- [ ] **D10: Fix modal backgrounds** -- Update `dialog.tsx` and `alert-dialog.tsx` primitives with opaque `bg-zinc-900` backgrounds and `bg-black/80 backdrop-blur-sm` overlays (2 files, all 15 modals inherit)
- [ ] **D11: Create test script** -- `scripts/test-worker-refresh.ts` to validate worker refresh cycle outside Inngest (including rapid-fire 0->2 test)
- [ ] Clear all test data from database
- [ ] Rename user-facing labels in current codebase (low-risk, immediate value)
- [ ] Plan the database migration

### Phase 1: Database + Work Base Foundation + Worker Refresh (3-4 days)
- [ ] Create `workbases` table with SAOL (Identity Spine compliant: user_id NOT NULL, RLS, index)
- [ ] **D9: Create `conversation_comments` table** with full Identity Spine (user_id NOT NULL, RLS, 5 policies, 2 indexes)
- [ ] Add `workbase_id` to `conversations`, `training_files`, `pipeline_training_jobs`
- [ ] **Create performance indexes** on all 3 new `workbase_id` FK columns (Identity Spine compliance)
- [ ] Rename `knowledge_base_id` -> `workbase_id` on 5 RAG tables
- [ ] Update 4 RPC functions
- [ ] Drop `rag_knowledge_bases` table
- [ ] Create API routes: `POST/GET /api/workbases` (with `requireAuth()`)
- [ ] **D9: Create API routes** for `conversation_comments` (`POST/GET /api/conversations/[id]/comments`)
- [ ] Create Work Base CRUD hooks
- [ ] **D11: Add `pipeline/adapter.deployed` event type** to Inngest client
- [ ] **D11: Modify `autoDeployAdapter`** -- Step 4 returns originalWorkersMin/Max, new Step 4b emits event, Step 6 writes `'deploying'`
- [ ] **D11: Create `refreshInferenceWorkers`** Inngest function (6-step cycle)
- [ ] **D11: Register** `refreshInferenceWorkers` in `src/inngest/functions/index.ts`
- [ ] **D12: Apply `MAX_LORAS=5`** in the scale-up step of refreshInferenceWorkers

### Phase 2: Route Structure + Layout (2-3 days)
- [ ] Create `/home` page (Work Base list + QuickStart)
- [ ] Create `/workbase/[id]/layout.tsx` (sidebar navigation)
- [ ] Create `/workbase/[id]/page.tsx` (Overview)
- [ ] Create Settings page
- [ ] Wire up Work Base switcher in sidebar header

### Phase 3: Fine Tuning Pages (3-4 days)
- [ ] Build Conversations page with dual sections (Library + Training Sets)
- [ ] **D8: Implement auto-enrichment** -- create `autoEnrichConversation` Inngest function, fire event after generation, remove "Enrich All" button
- [ ] Build "Build Training Set" flow (aggregation on Conversations page)
- [ ] Build Launch Tuning page (consolidated configure + monitor + results)
- [ ] Build Behavior Chat page (with 5 availability states + mode selector + deploying banner)
- [ ] Build Conversation Detail page (view-only)
- [ ] **D9: Add feedback section** to Conversation Detail page (textarea + comment list)
- [ ] Update MultiTurnChat component to accept workbaseId; auto-resolve adapter from Work Base
- [ ] Update RAGChat component to auto-resolve adapter from Work Base
- [ ] Wire active adapter logic

### Phase 4: Fact Training Pages (2-3 days)
- [ ] Build Documents page (upload + list, no KB selection)
- [ ] Build Document Detail page (preserve tabs)
- [ ] Build Fact Training Chat page
- [ ] Build Quality page
- [ ] Update RAG services (3 files) for `workbase_id`
- [ ] Update RAG hooks for workbase context

### Phase 5: QuickStart + Polish + Testing (2-3 days)
- [ ] Build QuickStart wizard (Name -> Upload -> Processing -> Chat)
- [ ] Add empty states to all pages
- [ ] Add contextual CTAs on Overview
- [ ] **D11: End-to-end deployment test** (train adapter -> auto-deploy -> worker refresh -> status ready -> chat works)
- [ ] **D12: Research deliverables** -- RunPod programmatic endpoints (Change 8), INFERENCE_MODE docs (Change 9)
- [ ] Test all flows end-to-end
- [ ] Remove old routes (or hide behind feature flag)
- [ ] Verify all Identity Spine compliance (run E04 test suite against new tables)

### Total Estimated Scope: 13-18 days of development

---

## 21. Testing Checkpoints

### Checkpoint 1: Test Script Validates Worker Cycle

Run: `npx tsx scripts/test-worker-refresh.ts`

Expected output:
```
[1/6] Fetching current endpoint state...
  Endpoint: brightrun-inference-official-vllm -fb (780tauhj7c126b)
  Current workersMin: 0, workersMax: 2
  Current MAX_LORAS: 1

[2/6] Current worker state:
  Ready: 0, Idle: 1, Running: 0, Initializing: 0

[3/6] Setting workersMin=0...
  workersMin set to 0

[4/6] Polling until all workers terminated...
  [5s]  Ready: 0, Idle: 1, Running: 0, Initializing: 0
  [10s] Ready: 0, Idle: 0, Running: 0, Initializing: 0
  All workers terminated after 10s

[5/6] Setting workersMin=2 (restoring)...
  workersMin set to 2

[6/6] Polling until workers ready...
  [5s]  Ready: 0, Idle: 0, Running: 0, Initializing: 2
  [30s] Ready: 0, Idle: 0, Running: 0, Initializing: 2
  [60s] Ready: 1, Idle: 0, Running: 0, Initializing: 1
  Workers ready after 60s

[RAPID-FIRE TEST] Setting workersMin=0 then immediately workersMin=2...
  (results logged)

[RESEARCH] Endpoint creation capability:
  templateId: <logged>
  createEndpoint mutation: <logged>
```

### Checkpoint 2: Inngest Function Fires After Deploy

1. Trigger a test deploy via `node scripts/retrigger-adapter-deploy.js`
2. Watch Inngest dashboard: `auto-deploy-adapter` should complete Steps 1-7
3. New step `emit-worker-refresh` should emit `pipeline/adapter.deployed`
4. `refresh-inference-workers` function should appear and run its 6 steps
5. `pipeline_inference_endpoints` status should transition: `deploying` -> `ready`

### Checkpoint 3: UI Shows Correct Status During Deploy

1. Navigate to `/pipeline/jobs/[jobId]/test` while a deploy is in progress
2. `EndpointStatusBanner` should show "deploying" (not green "ready")
3. After `refresh-inference-workers` completes, the status should flip to "ready"
4. The adapted chat should work without 404

### Checkpoint 4: Verify `MAX_LORAS=5` Applied

After the first worker refresh cycle runs, check the endpoint env vars:
```bash
node -e "
  require('dotenv').config({path:'.env.local'});
  fetch('https://api.runpod.io/graphql?api_key='+process.env.RUNPOD_GRAPHQL_API_KEY, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({query:'{ myself { endpoint(id:\"780tauhj7c126b\") { env { key value } } } }'})
  }).then(r=>r.json()).then(d=>{
    const ml = d.data.myself.endpoint.env.find(e=>e.key==='MAX_LORAS');
    console.log('MAX_LORAS:', ml?.value);
  });
"
```
Expected: `MAX_LORAS: 5`

---

## 22. Warnings

### Do NOT:

1. **Do NOT use SAOL for application DB operations** -- The Inngest functions run as server-side TypeScript in the Vercel runtime. They use `createServerSupabaseAdminClient()` from `@/lib/supabase-server` for DB access, NOT SAOL. SAOL is for agent-driven terminal scripts only.

2. **Do NOT change the RunPod GraphQL URL or auth pattern** -- The existing code uses `https://api.runpod.io/graphql?api_key=${RUNPOD_GRAPHQL_API_KEY}` (API key as query param, no Authorization header). Do not switch to Bearer auth -- the RunPod GraphQL API uses query param auth.

3. **Do NOT set `workersMin` to a hardcoded value** -- Always use `originalWorkersMin` from the event data. Currently it's 0, but it could be changed in the future.

4. **Do NOT make the adapter verification step fatal** -- The adapter may take a few seconds to load on the first request after worker restart. A 404 at verification time does not mean the adapter is missing -- it means the worker hasn't finished loading it yet. Log a warning and move on.

5. **Do NOT remove Step 5 (vllm-hot-reload) from auto-deploy-adapter** -- Keep it as-is (non-fatal). It serves as a future-proofing mechanism for when RunPod adds direct vLLM access on serverless.

6. **Do NOT run the GraphQL `saveEndpoint` mutation without passing ALL original endpoint fields** -- The RunPod API replaces the entire endpoint config on each `saveEndpoint` call. If you omit `gpuIds`, `idleTimeout`, `locations`, `templateId`, etc., they will be reset to defaults. Always fetch the current endpoint state first, then pass all fields back with only the changed values modified.

7. **Do NOT attempt to increase `workersMax` beyond 2 in this iteration** -- James specified we're keeping the current scale for the proof of concept. `workersMax` stays at its current value.

8. **Do NOT address overlapping adapter deployments** -- James noted: _"If someone submits multiple LoRA adapters at overlapping times...workers could crash into each other. I think we won't address that right now."_ The existing `concurrency: { limit: 1 }` on `auto-deploy-adapter` serializes deploys, and the same limit on `refresh-inference-workers` serializes refreshes. This is sufficient for now.

9. **Do NOT create the endpoint programmatically in this iteration** -- The research deliverable (Change 8) is documentation only. Do not call `createEndpoint`. Just log what it would look like.

---

## Appendix A: First Customer Journey

### A.1 Current State of the Product

Based on a complete audit of the codebase, here is what BrightRun currently offers:

| Module | Route | Status | Maturity |
|--------|-------|--------|----------|
| **Conversations** | `/conversations` | Functional | Core workflow -- AI generates training conversations from templates |
| **Datasets** | `/datasets` | Functional | Compiles conversations into training-ready JSONL |
| **Training Files** | `/training-files` | Functional | Export layer for fine-tuning data |
| **Pipeline** | `/pipeline/jobs` | Functional | RunPod LoRA adapter training, auto-deploy, A/B testing |
| **RAG Frontier** | `/rag` | Functional | Document ingestion, Expert Q&A, RAG/LoRA/RAG+LoRA chat |
| **Batch Jobs** | `/batch-jobs` | Functional | Batch conversation generation monitoring |

**What does NOT exist yet:**
- No onboarding flow or getting-started wizard
- No billing, payment, or subscription system (no Stripe, no pricing page)
- No usage quotas or rate limiting per user
- No user roles or access tiers
- No persistent sidebar/navigation (just a module card grid)
- No edit/delete for Knowledge Bases (create-only)
- No adapter-to-KB binding (superseded by workbase architecture -- D2/D3)
- No customer-facing documentation or help system

### A.2 Defining the "First Win" (Time-to-Value / Aha Moment)

The term James is looking for is **"Aha Moment"** (also called "Time-to-Value" or "Activation Event") -- the point where a new user first experiences the core value of the product and thinks: _"Oh, this is why I'm paying for this."_

**Recommended Aha Moment for BrightRun:**

> **A customer uploads their domain document, asks a question about it in RAG Chat, and sees a knowledgeable answer grounded in their own data -- all within 15 minutes of signing up.**

Why this specific moment:

1. **It's fast.** RAG document upload, processing, and chat are the shortest path to value. No training job needed (those take 30-60+ minutes). The customer sees their own knowledge reflected back immediately.
2. **It's tangible.** The customer asks a question about THEIR document and gets a precise, cited answer. This is viscerally different from generic ChatGPT.
3. **It's the hook for everything else.** Once they see RAG working, the natural next question is: _"What if it was even better with a fine-tuned model?"_ -- which leads to the Pipeline (training -> adapter -> RAG+LoRA).
4. **It proves the "complicated LLM features made easy"** story. They uploaded a document and got an AI expert on it. No infrastructure, no prompting, no MLOps.

**The Aha Moment flow:**

```
Sign Up -> Create Work Base -> Upload Document -> [wait ~2-5 min for processing] ->
Expert Q&A (optional) -> RAG Chat -> "Holy shit, it knows my document" ->
AHA MOMENT
```

### A.3 Minimum Paid Product (MPP)

The question is: what is the full scope of what must work end-to-end before charging customers?

#### Tier 1: Must Work (Launch Blockers)

These are non-negotiable for the first 10 customers:

| Feature | Current Status | Gap |
|---------|---------------|-----|
| **Sign up / Sign in** | Works (Supabase Auth) | No gap |
| **Create Work Base** | Not yet built | Build as part of this spec (D2) |
| **Upload documents** | Works (PDF, DOCX, TXT, MD) | No gap |
| **RAG Chat (RAG-only mode)** | Works | No gap -- this is the Aha Moment |
| **Train LoRA adapter** | Works (RunPod pipeline) | Need worker refresh (D11) to stop 404s |
| **RAG+LoRA Chat** | Works but adapter selection is manual | Workbase architecture (D2/D3) fixes this |
| **A/B Testing (adapted vs control)** | Works (Pipeline chat) | Need worker refresh (D11) to stop false 404s |
| **Payment** | Does NOT exist | **LAUNCH BLOCKER** -- need Stripe integration |
| **Usage visibility** | Does NOT exist | Need at minimum a "your usage" page showing jobs run, queries made, compute cost |

#### Tier 2: Should Work (First-Month Features)

These aren't launch blockers but make the difference between a customer staying vs. churning:

| Feature | Priority | Reasoning |
|---------|----------|-----------|
| **Onboarding wizard** | High | Guide new users through: Create Work Base -> Upload Doc -> Chat. Without this, customers will stare at 6 module cards and not know where to start |
| **Work Base edit/delete** | High | Customers WILL make mistakes during exploration |
| **Template gallery** | Medium | James' directive: "I want them to feel that I can create templates for them pretty quickly." Pre-built templates per industry (insurance, healthcare, legal, HR) that customers can fork |
| **Persistent navigation** | Medium | The current card-grid-only navigation is fine for demos but frustrating for daily use |
| **Multi-turn RAG conversations** | Medium | RAG Chat is currently stateless (query/response pairs). Real conversations need memory |
| **Usage quotas / soft limits** | Medium | Prevent a single customer from consuming all RunPod compute |

#### Tier 3: Nice to Have (Quarter 1)

| Feature | Reasoning |
|---------|-----------|
| Per-customer isolated endpoints | RunPod endpoint creation via API (D12 research) |
| Custom model selection | Beyond Mistral-7B -- let customers choose base models |
| Batch RAG evaluation | Run a test suite against a KB to measure retrieval quality |
| Export/download trained adapters | Customers take their trained weights elsewhere |
| Team/org features | Multiple users under one account with shared Work Bases |

### A.4 Recommended Pricing Model for First 10 Customers

Given James' constraints:
- _"I DO want them to pay"_
- _"I DO want them to see it as a product test"_
- _"Ideally they will be in their own proof of concept phase and have a budget to figure it out"_

**Recommendation: Flat Monthly + Compute Pass-Through**

| Component | Price | What It Covers |
|-----------|-------|----------------|
| **Platform Access** | $99/month | Dashboard access, Work Base creation, RAG chat, unlimited document uploads |
| **LoRA Training** | ~$5-15/job pass-through | RunPod GPU compute cost for each training run, marked up 2x |
| **Inference Compute** | ~$0.10/minute pass-through | RunPod serverless compute for LoRA/RAG+LoRA queries, marked up 2x |
| **RAG-only Chat** | Included in platform fee | Claude API costs absorbed by platform (they're small -- ~$0.01-0.05/query) |

Why this structure:
1. **$99/month is low enough for exploration budgets** -- most enterprise teams have discretionary spending up to $500/month without procurement approval.
2. **Compute pass-through is transparent** -- customers see exactly what their experiments cost. This aligns with "experimental/discovery phase."
3. **RAG-only is free** -- this ensures the Aha Moment has zero friction. The paywall kicks in when they want LoRA fine-tuning (the premium feature).
4. **The 2x markup on compute** covers infrastructure management, Supabase hosting, Vercel, and development time.

### A.5 What to Build Before Charging (Critical Path)

Given the current state, the **minimum additional work** before the first paying customer:

```
1. This spec (workbase architecture + worker refresh)  <- you are here
2. Stripe integration (subscription + metering)         <- LAUNCH BLOCKER
3. Onboarding flow (3-step wizard)                      <- HIGH PRIORITY
4. Usage dashboard page                                 <- required for billing transparency
5. Work Base edit/rename capability                     <- table-stakes UX
```

Estimated effort: 2-3 weeks of focused development.

### A.6 The Customer's Journey (Detailed Walkthrough)

Here is the recommended end-to-end journey for the first 10 customers:

**Day 0: Discovery**
- Customer finds BrightRun (referral, LinkedIn, demo call with James)
- Sees value prop: "Make your company's knowledge AI-searchable and train custom AI models on your processes -- no ML expertise needed"

**Day 1: Sign Up + Aha Moment (15 minutes)**
1. Sign up (email/password)
2. Onboarding wizard launches: "Let's set up your first AI Work Base"
3. Name their Work Base (e.g., "Claims Processing Manual")
4. Upload their first document (e.g., a 50-page claims processing PDF)
5. Wait for processing (~2-5 minutes, progress bar shown)
6. Wizard: "Your document is ready! Ask it a question."
7. Customer asks: "What is the maximum coverage for flood damage?"
8. RAG response: Precise, cited answer from THEIR document
9. **AHA MOMENT** -- "This thing actually knows my document"

**Day 2-7: Exploration (free trial or first billing cycle)**
- Upload more documents to the Work Base
- Try Expert Q&A if they want to refine the AI's understanding
- Experiment with different questions, compare against their internal search tools
- James offers to build custom conversation templates for their use case

**Day 7-14: LoRA Training (upsell to compute)**
- James explains: "Your RAG answers are good, but with a fine-tuned model, they can be even better -- the AI will speak your company's language"
- Customer configures a training job using the conversation templates James built
- Training runs (~30-60 min)
- Adapter deploys automatically (D11 worker refresh ensures it works)
- Work Base's active adapter is set automatically (D3)
- RAG+LoRA chat: The answers improve -- domain-specific tone, terminology, reasoning

**Day 14-30: Validation + Expansion**
- Customer runs A/B tests (control vs adapted) to measure improvement
- Uploads additional documents (multiple doc support in Work Base)
- Creates a second Work Base for a different department/use case
- Reports findings to their team: "This works for our use case, here's the cost"

**Month 2+: Ongoing Value**
- Customer integrates RAG Chat into their workflow
- Retrains adapters as processes change
- Requests additional templates from James
- Potentially invites team members (Tier 3 feature)

### A.7 Summary of Recommendations

| Category | Recommendation |
|----------|---------------|
| **Aha Moment** | "Upload doc -> RAG Chat -> accurate answer" in 15 minutes |
| **Endpoint of Functionality** | RAG + LoRA training + A/B testing + workbase architecture, with Stripe billing |
| **Pricing** | $99/month platform + compute pass-through (2x markup) |
| **Critical Path Before First Customer** | This spec -> Stripe -> Onboarding wizard -> Usage dashboard -> Work Base edit |
| **Timeline** | 2-3 weeks to minimally shippable paid product |
| **Target Customer** | Enterprise teams in proof-of-concept phase, with budget for AI investigation |
| **James' Differentiator** | Hands-on template creation + the simplicity of the platform make it personal and accessible |

---

## Appendix B: 03-Spec Reconciliation

This table maps every change from `03-lora-chat-fix-spec_v2.md` to its status in this document.

| 03-Spec Change | Description | v4 Status | Location |
|---|---|---|---|
| **Change 1** | New Inngest event type `pipeline/adapter.deployed` | **Integrated** | D11, Change 1 |
| **Change 2** | Auto-deploy emits event after Step 4 | **Integrated** | D11, Change 2 |
| **Change 3** | Step 6 status `'ready'` -> `'deploying'` | **Integrated** | D11, Change 3 |
| **Change 4** | New `refreshInferenceWorkers` Inngest function | **Integrated** | D11, Change 4 |
| **Change 5** | Register new function in index.ts | **Integrated** | D11, Change 5 |
| **Change 6** | Increase `MAX_LORAS` from 1 to 5 | **Integrated** | D12, Change 6 |
| **Change 7** | Test script `scripts/test-worker-refresh.ts` | **Integrated** | D12, Change 7 |
| **Change 8** | Research: RunPod programmatic endpoint creation | **Integrated** | D12, Change 8 |
| **Change 9** | Document INFERENCE_MODE pods behavior | **Integrated** | D12, Change 9 |
| **Change 10** | DB migration: `adapter_job_id` on `rag_knowledge_bases` | **Superseded** | D2 eliminates `rag_knowledge_bases`; concept lives as `active_adapter_job_id` on `workbases` (D3) |
| **Change 11** | Update `RAGKnowledgeBase` TypeScript interface | **Superseded** | Work Base types replace KB types |
| **Change 12** | KB creation accepts optional `adapterJobId` | **Superseded** | Work Base creation replaces KB creation; adapter binding is via `active_adapter_job_id` (D3) |
| **Change 13** | New API route: bind/unbind adapter to KB | **Superseded** | Adapter binding managed via `workbases.active_adapter_job_id` column update |
| **Change 14** | RAG Chat auto-selects KB's bound adapter | **Superseded** | Behavior Chat auto-resolves adapter from Work Base (D4) |
| **Change 15** | RAG query API resolves adapter from KB binding | **Superseded** | Query resolution uses `workbases.active_adapter_job_id` instead of KB binding |
| **Testing Checkpoints 1-4** | Worker cycle, Inngest flow, UI status, MAX_LORAS verification | **Integrated** | Section 21: Testing Checkpoints |
| **Testing Checkpoints 5-7** | KB adapter binding tests | **Superseded** | Workbase architecture replaces KB binding |
| **Warnings 1-9** | Implementation guardrails | **Integrated** | Section 22: Warnings |
| **Warnings 10-12** | KB-specific adapter constraints | **Superseded** | James' response confirmed workbase architecture replaces KB adapter model |
| **Section 8** | First Customer Journey | **Integrated** | Appendix A (updated for workbase terminology) |

---

*End of UX Decisions & Path Forward v4*
