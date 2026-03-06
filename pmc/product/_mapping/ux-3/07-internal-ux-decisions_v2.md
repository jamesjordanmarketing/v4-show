#  UX Decisions & Path Forward

**Version:** 2.0 | **Date:** 2026-02-27
**Supersedes:** 06-internal-ux-decisions_v1.md (v1.0)
**Context:** All decisions from v1 + James' v6 feedback + James' v7 approvals, fully integrated
**Output:** Final consolidated specification — design decisions, technical architecture, and implementation plan

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
13. [Decision D11: Adapter Deployment Threading](#13-decision-d11)
14. [Revised Ontology & Page Map](#14-revised-ontology)
15. [Revised Navigation](#15-revised-navigation)
16. [Detailed Page Specifications](#16-detailed-page-specifications)
17. [Technical Architecture](#17-technical-architecture)
18. [Implementation Sequence](#18-implementation-sequence)

---

## 1. Decision Summary

All decisions from v1 (D1–D7, Q1–Q10) plus v6/v7 additions (D8–D11), fully approved.

| # | Topic | Decision | Implication |
|---|---|---|---|
| D1 | Data Shaping page | **Eliminated.** Aggregation happens ON the Conversations page. Everything between aggregation and adapter creation is automatic. | 3-step stepper → **2-step flow**: Conversations (with aggregation) → Launch Tuning |
| D1b | Conversation content viewing | **View-only detail page.** No editing. No "Fine Tuning Prep" page reintroduced. | New sub-route `/conversations/[convId]` — drill-down, not a step |
| D2 | KB inside Work Base | **No separate KB entity.** One RAG scope per Work Base. Refactor RAG tables to use `workbase_id` directly. | Eliminate `rag_knowledge_bases` table; replace `knowledge_base_id` with `workbase_id` on 5 RAG tables |
| D3 | Active adapter storage | **`active_adapter_job_id` column on `workbases` table.** Single source of truth, NULL = no adapter. | Simple column, not junction table |
| D4 | Behavior Chat availability | **4 states with contextual banners.** Chat page always accessible, never hidden. | Conditional banners + mode selector disable logic |
| D5 | Conversation generation | **Stays as button on Conversations page.** Bulk generator absorbed into modal/drawer. | No change to generation flow |
| D6 | A/B testing | **Built into Behavior Chat.** Uses existing MultiTurnChat + DualResponsePanel. | No separate evaluation page |
| D7 | Route approach | **Complete rewrite** under `/workbase/[id]/`. | New route tree, components preserved |
| D8 | Auto-enrichment | **Inngest-based auto-enrich after generation.** "Enrich All" button removed. | New Inngest function, enrichment invisible to user |
| D9 | Conversation feedback | **Comments box on Conversation Detail page.** Natural-language feedback stored in DB. Not content editing. | New `conversation_comments` table with full Identity Spine |
| D10 | Modal backgrounds | **Fix at primitive level.** `bg-zinc-900` on all DialogContent/AlertDialogContent. | 2-file change, all 15 modals inherit |
| D11 | Adapter deployment | **Keep on independent Inngest thread.** Pre-warming dropped (workers need restart after LORA_MODULES update). No per-customer endpoints this iteration. | Existing `autoDeployAdapter` flow preserved; no new inference columns on workbases |
| Q1 | Data migration | **No migration needed** — test data cleared before work begins | Clean slate |
| Q6 | Expert Q&A | Keep on document detail page | No change |
| Q7 | Quality dashboards | Keep as sub-pages under Fact Training | No change |
| Q8 | Multi-user | **Future feature** — not for launch | No Settings members section |
| Q9 | Route structure | Use `/workbase/` (not `/w/`) | Readable URLs |
| Q10 | Deployment | Complete rewrite preferred | See D7 |

---

## 2. Decision D1: Eliminate Data Shaping — Aggregate on Conversations Page

### Core Insight

> "The Data Shaping step should ONLY include the selection of conversations into an aggregate file and then everything between that selection and the Launch Tuning is not needed to be visible to the lay person owner."

### Decision: Yes — Eliminate Data Shaping as a Separate Page

**The current artifact chain is:**
```
Individual Conversations → Aggregated JSON → LoRA JSONL → Dataset → Pipeline Job → Adapter
```

**From the user's perspective, there are only 2 meaningful actions:**
1. "Which conversations do I want to use?" (selection + aggregation)
2. "Go ahead and train" (launch)

Everything in between (JSON aggregation, JSONL conversion, dataset creation) is **plumbing** that is automated.

### The Revised 2-Step Flow

```
STEP 1: Conversations Page
├── View/create/edit individual conversations (future: human review)
├── Select conversations for aggregation (checkboxes)
├── CTA: "Build Training Set" (aggregates selected → creates JSON → creates JSONL → creates dataset automatically)
└── Shows: list of "Training Sets" (aggregation history) with status

STEP 2: Launch Tuning Page
├── Auto-selects the latest Training Set (or user picks from history)
├── 3 lay-person sliders (Sensitivity, Progression, Repetition)
├── CTA: "Train & Publish" (trains adapter → stores on HF → updates endpoint)
└── Shows: adapter history with rollback
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
- The conversation table is the **canonical source** — users create, review, and select here
- Training Sets are clearly **outputs** (derived from conversations), not a second list of conversations
- The visual hierarchy is: conversations (the material) are primary; Training Sets (the package) are secondary

### What Happens Under the Hood When "Build Training Set" Is Clicked

```
User clicks "Build Training Set" with 15 conversations selected
  → API: POST /api/workbase/[id]/training-sets
    → 1. Validate all 15 conversations exist and are approved
    → 2. Aggregate individual JSONs into combined Training JSON (current training-file-service.ts logic)
    → 3. Convert to LoRA-compliant JSONL (current training-file-service.ts logic)
    → 4. Store both files in Supabase Storage
    → 5. Create training_sets record with workbase_id + metadata
    → 6. Return success
  → UI: New Training Set appears in Section B with status "Ready"
```

This is exactly what `training-file-service.ts:createTrainingFile()` already does. We just need to:
1. Add `workbase_id` to the training file/set records
2. Trigger it from the Conversations page instead of a separate page
3. Auto-create a dataset record (or merge the concept entirely)

---

## 3. Decision D1b: Conversation Content Viewing & "Fine Tuning Prep" Step

### Part 1: Build a View-Only Conversation Detail Page

**Why it's necessary:**
- SMB owners investing real money in training will absolutely want to read what their AI is learning before clicking "Train." Without visibility, controlling business owners feel out of control — and they churn.
- A view-only page is the **minimum viable trust layer**. Without it, users are blindly trusting AI-generated content.
- The current ConversationDetailModal is a modal with limited real estate — not suitable for reading a full multi-turn conversation.

**Why view-only is the correct scope (not edit):**
- Editing a conversation changes training data, triggering: re-validation, re-enrichment, re-aggregation, potential JSONL regeneration, and conflict resolution if already in a Training Set. That's a full content pipeline.
- View-only gives users the **confidence** they need without the **complexity** of mutation.
- The interface is designed with edit-readiness: the data model doesn't need to change when editing is added later.

**Route:** `/workbase/[id]/fine-tuning/conversations/[convId]`

**Layout:**
- **Back button:** "← Back to Conversations"
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
- **Your Feedback section** (below conversation thread — see D9)
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

Even with the view-only conversation detail page, **the 2-step flow still works.** The view-only detail page is a **sub-route of Conversations** (`/conversations/[convId]`), not a new step in the flow. The user's workflow doesn't change — they just have the option to drill into any conversation before selecting it.

A "Fine Tuning Prep" page would make users ask: "What am I supposed to do here that I didn't already do on the Conversations page?" — creating the two-identical-lists problem.

**Exception:** If conversation **editing** is added in the future, then a "Review & Edit" step between Conversations and Launch Tuning would have a distinct purpose. Not now.

**Updated stepper (unchanged):** `1 Conversations → 2 Launch Tuning`

| Decision | Recommendation |
|---|---|
| View-only conversation content page | **Yes — build it.** Route: `/conversations/[convId]`. Chat-style layout, stripped metadata, read-only. Design for future editability. |
| Reintroduce "Fine Tuning Prep" page | **No.** The 2-step flow (Conversations → Launch Tuning) still holds. The view page is a drill-down within Step 1, not a new step. |
| Future: when editing is added | **Then** consider a "Review & Edit" step between Conversations and Launch Tuning. Not now. |

---

## 4. Decision D2: No Separate KB — RAG Lives Directly in the Work Base

### Decision: One RAG Scope Per Work Base, No KB Entity

**Why multiple KBs per Work Base would be bad:**
- Adds a container-within-a-container — users would ask "why do I need to create a Knowledge Base inside my Work Base?"
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
├── Fine Tuning: conversations → training sets → adapter (one active)
└── Fact Training: documents → embeddings → chat (all docs in this Work Base)
```

No KB creation step. No KB selection. Documents go directly into the Work Base's Fact Training section.

### Technical Impact: Replacing `knowledge_base_id` with `workbase_id`

**Database changes (5 tables):**

| Table | Column Change | Notes |
|---|---|---|
| `rag_documents` | `knowledge_base_id` → `workbase_id` (NOT NULL) | Primary FK to workbases |
| `rag_embeddings` | `knowledge_base_id` → `workbase_id` (NULLABLE) | Denormalized for search perf |
| `rag_facts` | `knowledge_base_id` → `workbase_id` (NULLABLE) | Denormalized for search perf |
| `rag_sections` | `knowledge_base_id` → `workbase_id` (NULLABLE) | Denormalized for search perf |
| `rag_queries` | `knowledge_base_id` → `workbase_id` (NOT NULL) | Query history scoping |

**Table to DROP:** `rag_knowledge_bases` — replaced by `workbases`

**RPC functions to update (4):**
- `increment_kb_doc_count` → becomes `increment_workbase_doc_count` (or just track on `workbases` table)
- `decrement_kb_doc_count` → same
- `match_rag_embeddings_kb` → update `filter_knowledge_base_id` parameter name
- `search_rag_text` → update `filter_knowledge_base_id` parameter name

**Service files to update (3):**
- `rag-ingestion-service.ts` — ~6 column references
- `rag-embedding-service.ts` — ~5 column references
- `rag-retrieval-service.ts` — ~8 column references

**Type definitions (1 file):**
- `src/types/rag.ts` — 2 row types + 2 public types

**Gotchas to watch for:**

1. **The denormalization pattern must be preserved.** The `workbase_id` on `rag_embeddings`, `rag_facts`, and `rag_sections` is not a true FK — it's denormalized for performance so that Work Base-wide vector similarity searches can filter without joining through `rag_documents`. Critical for search performance.

2. **The `increment/decrement_kb_doc_count` RPCs** currently update a `document_count` column on `rag_knowledge_bases`. This counter logic moves to the `workbases` table.

3. **The `rag_knowledge_bases` hook (`useRAGKnowledgeBases`)** and its API route (`/api/rag/knowledge-bases`) become obsolete. The `CreateKnowledgeBaseDialog` component is eliminated.

4. **Client-facing API parameter names** (`knowledgeBaseId` in hooks and routes) can be renamed to `workbaseId` — this is a clean rewrite.

**Scope assessment:** Medium — numerous but mechanical changes. No migration risk since test data will be cleared.

---

## 5. Decision D3: Active Adapter Storage — Column on `workbases` Table

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

---

## 6. Decision D4: Behavior Chat Availability States

### Decision: Four Clear States with Contextual Banners

| State | LoRA | RAG | What User Sees |
|---|---|---|---|
| **Empty** | No adapter | No docs | Banner: "Set up Fine Tuning or upload documents to start chatting." Two CTAs: "Go to Conversations" / "Upload Documents" |
| **RAG Only** | No adapter | Docs ready | Banner: "Chatting with your documents. Fine Tuning is not active." Chat works with RAG mode. |
| **LoRA Only** | Adapter live | No docs | Banner: "Chatting with your trained AI. No documents uploaded yet." Chat works with LoRA mode. |
| **Full** | Adapter live | Docs ready | Banner: "Chatting with your trained AI + your documents." Mode selector available (LoRA only / RAG only / Both). |

**Implementation:** The existing `ModeSelector` component already supports `rag_only | lora_only | rag_and_lora`. Needed:
1. Query Work Base state on page load
2. Auto-select the appropriate default mode
3. Disable unavailable modes in the selector
4. Show the appropriate banner

**UX principle:** The chat page is **always accessible** from the sidebar (never grayed out). The page itself explains what's needed and provides CTAs. "Reveal the destination, explain the path."

---

## 7. Decision D5: Conversation Generation Stays on Conversations Page

Keep the "New Conversation" button on the Conversations page. Make the bulk generator a modal/drawer instead of a separate page:

- "New Conversation" → drawer/modal with persona/emotion/topic selection + "Generate" button
- "Bulk Generate" → same drawer but with batch size field
- Generated conversations appear in the table with status "Processing → Ready"
- The `/bulk-generator` page is absorbed — no separate route

---

## 8. Decision D6: A/B Testing Built into Behavior Chat

The current MultiTurnChat component already includes A/B comparison with:
- `DualResponsePanel` — side-by-side responses
- `DualArcProgressionDisplay` — progression comparison
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
- Current routes lack `workbase_id` parameter — every page would need a new data-fetching layer
- Dashboard layout has no sidebar — adding one would conflict with page-level headers
- Mixing old routes (`/rag`) with new routes (`/workbase/[id]/fact-training/documents`) creates URL inconsistency
- RAG page manages internal state transitions via React state — needs proper routes

**Why rewrite is safe:**
- Test data will be cleared
- No external integrations depend on current routes
- **Components** (ConversationTable, RAGChat, MultiTurnChat, etc.) are preserved — only **pages** and **routes** change
- API routes (`/api/*`) largely stay the same

| What Changes | What's Preserved |
|---|---|
| All page files under `src/app/(dashboard)/` | All components under `src/components/` |
| Dashboard layout (adds sidebar) | All hooks under `src/hooks/` |
| Route structure (flat → nested under workbase) | All services under `src/lib/` |
| Page-level data fetching (adds workbase_id) | All API routes under `src/app/api/` (mostly) |
| Zustand stores (adds workbase context) | UI components (`src/components/ui/`) |

**Risk mitigation:**
- Build new routes alongside old ones during development
- Switch default route (`/dashboard` → `/home`) only when new routes are complete
- Keep old routes alive but hidden for 1 sprint as fallback

---

## 10. Decision D8: Auto-Enrichment (Replaces Manual "Enrich All")

### Problem

The current flow requires users to manually click "Enrich All" on the `/batch-jobs/[id]` page after a batch of conversations is generated. This is an unnecessary manual step.

### Decision: Automatic Inngest-Based Enrichment After Generation

Enrichment was originally manual because Vercel serverless functions terminate after the HTTP response — fire-and-forget async enrichment gets killed. The solution is to fire an Inngest event after each conversation is generated, which triggers enrichment in a separate function invocation with its own execution time budget.

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
6. **Preserve** `src/app/api/conversations/bulk-enrich/route.ts` — still useful as retry/recovery mechanism for failed enrichments

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
- **Multiple comments per conversation:** Users can add multiple comments over time — more natural than a single blob.
- **`content text NOT NULL`:** No length limit. Users should feel free to write as much as they want.
- **No `turn_number` column (intentional):** This is general feedback, not per-turn annotation. Column can be added later if needed.

### API Routes

**`POST /api/conversations/[id]/comments`** — Create a comment
**`GET /api/conversations/[id]/comments`** — List comments for a conversation

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
- Label says "feedback" not "comments" — primes the user to think about improvements
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

**Fix 1: `src/components/ui/dialog.tsx` — DialogContent**

```tsx
// FROM:
className="bg-background ..."
// TO:
className="bg-zinc-900 text-zinc-50 border-zinc-700 ..."
```

**Fix 2: `src/components/ui/dialog.tsx` — DialogOverlay**

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
| **Modal panel background** | `bg-zinc-900` | Solid dark gray (`#18181b`) — opaque, high contrast |
| **Modal panel text** | `text-zinc-50` | Near-white (`#fafafa`) — readable |
| **Modal panel border** | `border-zinc-700` | Subtle border (`#3f3f46`) — defines edge |
| **Overlay/scrim** | `bg-black/80 backdrop-blur-sm` | 80% black + slight blur — clearly separates modal from page |
| **Input fields inside modals** | `bg-zinc-800` | Slightly lighter (`#27272a`) — distinguishes inputs |
| **Muted text in modals** | `text-zinc-400` | Gray text (`#a1a1aa`) for secondary info |

**Why `bg-zinc-900` instead of `bg-background`:** Direct Tailwind utility — no variable chain, guaranteed opaque, clear visual separation regardless of page background.

**Priority:** Phase 0 (pre-work). Fixes a usability blocker across the entire current app immediately.

---

## 13. Decision D11: Adapter Deployment Threading

### Problem

Adapter deployment (HuggingFace upload → RunPod LORA_MODULES update → worker restart) takes significant time. Can this be pre-provisioned to improve UX?

### Analysis: Pre-Warming Does Not Work

**Critical constraint identified by James:** RunPod workers do not pick up a new LoRA module until they are **restarted after** the adapter name is added to the endpoint's `LORA_MODULES` environment variable. Pre-warming workers before the adapter name is known is pointless — the warm worker would need to restart anyway once the adapter is registered.

Predicting adapter names ahead of time is not in scope for this iteration (would require a naming strategy based on pre-generated UUIDs before training starts).

### Decision: Keep Deployment on Independent Inngest Thread

The current `autoDeployAdapter` Inngest function already handles this correctly:

1. **Trigger:** Supabase database webhook fires when `pipeline_training_jobs.status = 'completed'` and `adapter_file_path` is set
2. **Webhook route** (`/api/webhooks/training-complete/route.ts`) fires Inngest event `pipeline/adapter.ready`
3. **Inngest function** (`auto-deploy-adapter.ts`) runs with `concurrency: 1` and handles:
   - Step 1: Fetch and validate job (idempotency guard via `hf_adapter_path`)
   - Step 2-3: Download adapter tar.gz from Supabase Storage → push to HuggingFace (`BrightHub2/lora-emotional-intelligence-{jobId[:8]}`)
   - Step 4: Update RunPod `LORA_MODULES` env var via GraphQL API
   - Step 5: Attempt vLLM hot-reload (non-fatal — workers restart on next cold start regardless)
   - Step 6: Create/update `pipeline_inference_endpoints` DB records
   - Step 7: Write `hf_adapter_path` to job record (idempotency signal)

**This is already on an independent thread** — the Inngest function runs asynchronously, decoupled from the training flow. No changes needed to the deployment flow itself.

### What Changes This Iteration

**Nothing changes in the deployment pipeline.** The existing Inngest-based flow is correct:
- Deployment kicks off automatically as soon as the adapter is ready (via webhook)
- It runs on an independent Inngest thread with retry and concurrency control
- The adapter name (`adapter-{jobId[:8]}`) is deterministic from the job ID

**Deferred to future iteration:**
- Per-customer RunPod serverless endpoints (requires GraphQL `saveEndpoint` provisioning)
- Predictive adapter naming (pre-register adapter name before training starts)
- Worker restart forcing after LORA_MODULES update

### Impact on `workbases` DDL

No `inference_endpoint_id` or `inference_endpoint_url` columns on the `workbases` table. These are deferred until per-customer endpoint provisioning is implemented.

---

## 14. Revised Ontology & Page Map

```
Account
├── Home (/home)
│   ├── QuickStart tile (for new users / empty state)
│   └── Work Base list (cards with status)
│
└── Work Base (/workbase/[id])
    ├── Overview (/workbase/[id])
    │   ├── Fine Tuning status card (stepper + adapter status)
    │   ├── Fact Training status card (doc count + index status)
    │   └── Chat shortcut (if anything is configured)
    │
    ├── Fine Tuning (/workbase/[id]/fine-tuning)
    │   ├── Conversations (/workbase/[id]/fine-tuning/conversations)
    │   │   ├── Section A: Conversation Library (table with filters, generation, auto-enrichment)
    │   │   │   ├── "View Content" per row → Conversation Detail (view-only + feedback)
    │   │   │   └── "Build Training Set" CTA (select conversations → aggregate)
    │   │   └── Section B: Training Sets (aggregation history, status, download)
    │   │
    │   ├── Conversation Detail (/workbase/[id]/fine-tuning/conversations/[convId])
    │   │   ├── View-only: chat-style turn display, context bar, no editing
    │   │   └── Your Feedback: comments box for natural-language feedback (D9)
    │   │
    │   ├── Launch Tuning (/workbase/[id]/fine-tuning/launch)
    │   │   ├── Current Training Set (auto-selected or user picks)
    │   │   ├── 3 lay-person sliders (Sensitivity, Progression, Repetition)
    │   │   ├── Cost estimate
    │   │   ├── "Train & Publish" CTA
    │   │   └── Adapter history with rollback
    │   │
    │   └── Behavior Chat (/workbase/[id]/fine-tuning/chat)
    │       ├── Uses active adapter + optional RAG
    │       ├── A/B testing built-in (when adapter is live)
    │       ├── Mode selector (LoRA only / RAG only / Both)
    │       └── 4 availability states with contextual banners
    │
    ├── Fact Training (/workbase/[id]/fact-training)
    │   ├── Documents (/workbase/[id]/fact-training/documents)
    │   │   ├── Upload area (drag-drop)
    │   │   ├── Document list with status pipeline
    │   │   └── "Chat this document" / "Chat all documents" CTAs
    │   │
    │   ├── Document Detail (/workbase/[id]/fact-training/documents/[docId])
    │   │   ├── Detail tab
    │   │   ├── Expert Q&A tab
    │   │   ├── Chat tab (single-doc)
    │   │   ├── Diagnostic tab
    │   │   └── Quality tab
    │   │
    │   ├── Chat (/workbase/[id]/fact-training/chat)
    │   │   ├── Default: all documents in Work Base
    │   │   ├── Optional: per-document filter
    │   │   └── Citations with document names
    │   │
    │   └── Quality (/workbase/[id]/fact-training/quality)
    │       ├── Quality dashboard (5 metrics)
    │       └── Golden-set regression testing
    │
    └── Settings (/workbase/[id]/settings)
        ├── Name, description
        └── Endpoint/adapter display (read-only)
```

### Key Changes from v1 Ontology

1. **Data Shaping page ELIMINATED** — aggregation lives on the Conversations page as "Build Training Set"
2. **Stepper simplified**: `Conversations → Launch Tuning` (2 steps, not 3)
3. **Single Document Chat and All Documents Chat MERGED** into one "Chat" page under Fact Training
4. **Processing Status page ABSORBED** into the Documents page (per-document status inline)
5. **No KB entity anywhere** — documents go directly into the Work Base
6. **Conversation Detail includes feedback section** (D9)
7. **Auto-enrichment replaces manual "Enrich All"** (D8)

---

## 15. Revised Navigation

```
[Work Base Name] ▾ (switcher)
─────────────────────────────
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

## 16. Detailed Page Specifications

### Page 0: Home (`/home`)

**Purpose:** Entry point. Get users to their Work Base or through QuickStart.

**Layout:**
- Header: "BrightHub" + user info + sign out
- **QuickStart tile** (shown if user has 0 Work Bases OR conditional):
  - "Chat with your documents in minutes"
  - CTA: "Get Started" → QuickStart wizard
- **Your Work Bases** (card grid):
  - Each card: Name, Fine Tuning status pill, Fact Training status pill, last activity
  - Click → enters Work Base Overview
- **CTA:** "+ New Work Base" (creates empty Work Base with name input)

---

### Page 1: Work Base Overview (`/workbase/[id]`)

**Purpose:** One-glance orientation + next best action.

**Layout:**
- **Conditional QuickStart** (if 0 docs AND no conversations): "Upload documents to start chatting" + "Create conversations to start training"
- **Fine Tuning card:**
  - Stepper: `Conversations → Launch Tuning`
  - Adapter status: None / Training / Live
  - CTA: "Continue" (routes to the incomplete step)
- **Fact Training card:**
  - Documents: X uploaded, Y ready
  - CTA: "Upload Document" or "Open Chat"
- **Behavior Chat shortcut** (if adapter live OR docs ready):
  - "Chat with your AI" → routes to Behavior Chat

---

### Page 2: Conversations (`/workbase/[id]/fine-tuning/conversations`)

**Purpose:** Create, review, select, and aggregate conversations into Training Sets.

**Layout — Section A: Conversation Library (primary)**
- **Header:** "Conversations"
- **Subtext:** "Create and refine training conversations. Select conversations to build a Training Set."
- **Stepper** (top): `1 Conversations ← current → 2 Launch Tuning`
- **Top controls:**
  - CTA: "New Conversation" (opens generation drawer/modal)
  - CTA: "Add from other Work Bases..." (for reusable conversations — Phase 4)
  - Search bar
- **Filters:** Status (Draft / Ready / In Training Set), Tier, Quality Score
- **Table:** Same as current ConversationTable but with:
  - Checkbox column for multi-select
  - New column: "Training Sets" (shows which Training Sets include this conversation)
  - Status badge includes: `Draft | Ready | In Training Set`
  - **"View Content" button** per row → navigates to Conversation Detail page
  - Row click → ConversationDetailModal (preserved for quick metadata view)
- **Bulk action bar** (appears when conversations selected):
  - "Build Training Set" (primary CTA — aggregates selected into a new Training Set)
  - "Retry Failed Enrichments" (for conversations where auto-enrichment failed)
- **Pagination:** Preserved from current

**Layout — Section B: Training Sets (secondary, below)**
- **Header:** "Training Sets"
- **Subtext:** "Packaged conversation bundles ready for Launch Tuning."
- **List/table:** Each row shows:
  - Name (auto-generated: "Training Set — Feb 27, 2026 3:12pm", editable)
  - Conversations: X conversations, Y training pairs
  - Status: Processing / Ready / Failed
  - Badge: "Active" (if used by the current live adapter)
  - Actions:
    - "Use for Launch Tuning" → navigates to Launch Tuning with this set pre-selected
    - "View JSON" (expandable viewer)
    - "Download JSONL"
    - "View Details" (which conversations are included)

**What this replaces:** The Conversations page + Training Files page + Datasets page + Data Shaping page. **Four pages become one.**

---

### Page 2b: Conversation Detail (`/workbase/[id]/fine-tuning/conversations/[convId]`)

**Purpose:** Let users read the full content of a conversation before selecting it for training. View-only. Builds trust with controlling SMB owners who need to see what their AI will learn.

**Layout:**
- **Back button:** "← Back to Conversations"
- **Header:** Conversation title + status badge (Draft / Ready / In Training Set)
- **Context bar** (horizontal strip, compact):
  - Persona: "{name}" | Arc: "{arc}" | Topic: "{topic}" | Quality: {score}/10 | Turns: {N}
- **Conversation thread** (main content, scrollable):
  - Chat-style bubbles for each turn:
    - User turns (left-aligned, light bg): the "client" side
    - Assistant turns (right-aligned, branded bg): the trained AI response
  - Per turn: turn number, message content, emotional state pill (e.g., "frustrated → empathetic")
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

**Purpose:** Configure training parameters → train → deploy. One page for the entire launch pipeline.

**Layout:**
- **Stepper** (top): `1 Conversations → 2 Launch Tuning ← current`
- **Banner:** Active adapter status: `Not launched | Training (X%) | Live`
  - If Live: shows static adapter name

**Section A: Training Input**
- Card: "Training Set: {name}" (auto-selected: latest Ready set, or user picks from dropdown)
- Details: conversation count, training pair count, avg quality
- Button: "Change Training Set" (dropdown of Ready sets)
- Button: "View JSONL" (opens viewer)

**Section B: Training Settings** (preserved from current `pipeline/configure`)
- 3 lay-person sliders:
  - Training Sensitivity (Very Stable ↔ Very Adaptive)
  - Training Progression (Deep Thinking ↔ Broad Learning)
  - Training Repetition (Quick ↔ Deep)
- Job Name input

**Section C: Cost & Launch** (sidebar or right column)
- Cost estimate card (preserved from current)
- CTA: **"Train & Publish"**
  - When clicked: shows inline progress:
    1. Training adapter... (with progress %, metrics)
    2. Storing on HuggingFace...
    3. Updating endpoint...
  - On completion: "Adapter is Live!" + CTA "Open Behavior Chat"
- If training is running: shows progress inline (replaces the separate monitor page)

**Section D: Adapter History** (bottom, collapsible)
- List of past launches: timestamp, Training Set used, result (Success/Failed), cost
- Action: "Set Active" (rollback to a previous adapter)
- Action: "View Logs"

**What this replaces:** Pipeline Configure + Pipeline Jobs + Pipeline Job Detail + Pipeline Results. **Four pages become one.**

---

### Page 4: Behavior Chat (`/workbase/[id]/fine-tuning/chat`)

**Purpose:** The user reward — chat with their trained AI, optionally grounded in documents.

**Layout:**
- **Availability banner** (top, conditional — see D4 states)
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
docs_ready = workbase.document_count > 0 AND at least 1 doc with status 'ready'

if (!active_adapter && !docs_ready) → Empty state
if (!active_adapter && docs_ready)  → RAG-only mode, LoRA disabled
if (active_adapter && !docs_ready)  → LoRA-only mode, RAG disabled
if (active_adapter && docs_ready)   → Full mode, all options enabled
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
  - Status pipeline: `Uploading → Extracting → Indexing → Ready` (or Failed)
  - Actions: "Chat" (single-doc), "Details" (→ Document Detail), "Remove"
- **CTAs** (contextual):
  - If 1+ doc Ready: "Chat with Documents" → routes to Fact Training Chat
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

## 17. Technical Architecture

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

-- RAG tables: RENAME knowledge_base_id → workbase_id
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
    // 404, never 403 — do not reveal existence
  }
}
```

### New Route Structure

```
src/app/
├── (auth)/                          # Preserved
│   ├── signin/
│   └── signup/
├── (dashboard)/
│   ├── home/page.tsx                # NEW — replaces /dashboard
│   └── workbase/[id]/
│       ├── layout.tsx               # NEW — sidebar layout
│       ├── page.tsx                 # Overview
│       ├── fine-tuning/
│       │   ├── conversations/page.tsx
│       │   ├── conversations/[convId]/page.tsx  # NEW — Conversation Detail + Feedback
│       │   ├── launch/page.tsx
│       │   └── chat/page.tsx
│       ├── fact-training/
│       │   ├── documents/page.tsx
│       │   ├── documents/[docId]/page.tsx
│       │   ├── chat/page.tsx
│       │   └── quality/page.tsx
│       └── settings/page.tsx
├── api/                             # Mostly preserved, some new routes
│   ├── workbases/                   # NEW
│   │   └── route.ts                 # CRUD for workbases
│   ├── workbase/[id]/
│   │   └── training-sets/route.ts   # NEW — aggregation endpoint
│   ├── conversations/[id]/
│   │   └── comments/route.ts        # NEW — feedback CRUD
│   └── ... (existing API routes preserved)
```

### Key Component Reuse

| Existing Component | Used In (New) | Changes Needed |
|---|---|---|
| `ConversationTable` | Conversations page | Add checkbox column, Training Set column |
| `ConversationDetailModal` | Conversations page | None |
| `TrainingParameterSlider` | Launch Tuning page | None |
| `CostEstimateCard` | Launch Tuning page | None |
| `MultiTurnChat` | Behavior Chat page | Accept workbaseId instead of jobId |
| `DualResponsePanel` | Behavior Chat page | None |
| `RAGChat` | Fact Training Chat, Document Detail | Accept workbaseId instead of knowledgeBaseId |
| `DocumentUploader` | Documents page | Accept workbaseId instead of knowledgeBaseId |
| `DocumentList` | Documents page | Accept workbaseId instead of knowledgeBaseId |
| `ExpertQAPanel` | Document Detail | None |
| `QualityDashboard` | Quality page | None |
| `ModeSelector` | Behavior Chat | Add disabled states |

---

## 18. Implementation Sequence

### Phase 0: Pre-work (1 day)
- [ ] **D10: Fix modal backgrounds** — Update `dialog.tsx` and `alert-dialog.tsx` primitives with opaque `bg-zinc-900` backgrounds and `bg-black/80 backdrop-blur-sm` overlays (2 files, all 15 modals inherit)
- [ ] Clear all test data from database
- [ ] Rename user-facing labels in current codebase (low-risk, immediate value)
- [ ] Plan the database migration

### Phase 1: Database + Work Base Foundation (2-3 days)
- [ ] Create `workbases` table with SAOL (Identity Spine compliant: user_id NOT NULL, RLS, index)
- [ ] **D9: Create `conversation_comments` table** with full Identity Spine (user_id NOT NULL, RLS, 5 policies, 2 indexes)
- [ ] Add `workbase_id` to `conversations`, `training_files`, `pipeline_training_jobs`
- [ ] **Create performance indexes** on all 3 new `workbase_id` FK columns (Identity Spine compliance)
- [ ] Rename `knowledge_base_id` → `workbase_id` on 5 RAG tables
- [ ] Update 4 RPC functions
- [ ] Drop `rag_knowledge_bases` table
- [ ] Create API routes: `POST/GET /api/workbases` (with `requireAuth()`)
- [ ] **D9: Create API routes** for `conversation_comments` (`POST/GET /api/conversations/[id]/comments`)
- [ ] Create Work Base CRUD hooks

### Phase 2: Route Structure + Layout (2-3 days)
- [ ] Create `/home` page (Work Base list + QuickStart)
- [ ] Create `/workbase/[id]/layout.tsx` (sidebar navigation)
- [ ] Create `/workbase/[id]/page.tsx` (Overview)
- [ ] Create Settings page
- [ ] Wire up Work Base switcher in sidebar header

### Phase 3: Fine Tuning Pages (3-4 days)
- [ ] Build Conversations page with dual sections (Library + Training Sets)
- [ ] **D8: Implement auto-enrichment** — create `autoEnrichConversation` Inngest function, fire event after generation, remove "Enrich All" button
- [ ] Build "Build Training Set" flow (aggregation on Conversations page)
- [ ] Build Launch Tuning page (consolidated configure + monitor + results)
- [ ] Build Behavior Chat page (with availability states + mode selector)
- [ ] Build Conversation Detail page (view-only)
- [ ] **D9: Add feedback section** to Conversation Detail page (textarea + comment list)
- [ ] Update MultiTurnChat component to accept workbaseId
- [ ] Wire active adapter logic

### Phase 4: Fact Training Pages (2-3 days)
- [ ] Build Documents page (upload + list, no KB selection)
- [ ] Build Document Detail page (preserve tabs)
- [ ] Build Fact Training Chat page
- [ ] Build Quality page
- [ ] Update RAG services (3 files) for `workbase_id`
- [ ] Update RAG hooks for workbase context

### Phase 5: QuickStart + Polish (1-2 days)
- [ ] Build QuickStart wizard (Name → Upload → Processing → Chat)
- [ ] Add empty states to all pages
- [ ] Add contextual CTAs on Overview
- [ ] Test all flows end-to-end
- [ ] Remove old routes (or hide behind feature flag)
- [ ] Verify all Identity Spine compliance (run E04 test suite against new tables)

### Total Estimated Scope: 11-16 days of development

---

*End of UX Decisions & Path Forward v2*
