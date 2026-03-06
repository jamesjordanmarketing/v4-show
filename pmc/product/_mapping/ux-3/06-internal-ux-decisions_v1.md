#  UX Decisions & Path Forward

**Version:** 1.0 | **Date:** 2026-02-27
**Context:** James' decisions on 05-internal-ux-review_v1.md, integrated with codebase analysis
**Output:** Final design decisions + architectural recommendations + clear path forward

---

----


## Table of Contents

1. [Decision Summary (All Responses Synthesized)](#1-decision-summary)
2. [Decision D1: Eliminate Data Shaping — Aggregate on Conversations Page](#2-decision-d1)
2b. [Decision D1b: Conversation Content Viewing & "Fine Tuning Prep" Step](#2b-decision-d1b)
3. [Decision D2: No Separate KB — RAG Lives Directly in the Work Base](#3-decision-d2)
4. [Decision D3: Active Adapter Storage — Column on workbases Table](#4-decision-d3)
5. [Decision D4: Behavior Chat Availability States](#5-decision-d4)
6. [Decision D5: Conversation Generation Stays on Conversations Page](#6-decision-d5)
7. [Decision D6: A/B Testing Built into Behavior Chat](#7-decision-d6)
8. [Decision D7: Complete Route Rewrite](#8-decision-d7)
9. [Revised Ontology & Page Map (Final)](#9-revised-ontology)
10. [Revised Navigation (Final)](#10-revised-navigation)
11. [Detailed Page Specifications (Final)](#11-detailed-page-specifications)
12. [Technical Architecture Recommendations](#12-technical-architecture)
13. [Implementation Sequence](#13-implementation-sequence)

---

## 1. Decision Summary

James provided responses to 7 inline discussion points and 10 open questions. Here is every decision, synthesized:

| # | Topic | James' Decision | Implication |
|---|---|---|---|
| D1 | Data Shaping page | Wants to **eliminate it**. Aggregation happens ON the Conversations page. Everything between aggregation and adapter creation is automatic. Launch Tuning is just a "go forward" button. | The 3-step stepper becomes a **2-step flow**: Conversations (with aggregation) → Launch Tuning |
| D2 | KB inside Work Base | **No separate KB entity**. RAG is a sub-page, not a formal Knowledge Base. One RAG scope per Work Base. Refactor RAG tables to use `workbase_id` directly. | Eliminate `rag_knowledge_bases` table; replace `knowledge_base_id` with `workbase_id` on 5 RAG tables |
| D3 | Active adapter storage | Wants `active_adapter_job_id` on `workbases` table. Wants architectural validation. | See D3 section for full recommendation |
| D4 | Behavior Chat availability | Must clearly communicate what's available (LoRA, RAG, both, neither) and disable when nothing is configured | Chat page needs conditional banners and availability states |
| D5 | Conversation generation | Stays as a button on the Conversations page (current pattern) | No change needed to generation flow |
| D6 | A/B testing | Built into Behavior Chat, as it currently lives in multi-turn chat | No separate evaluation page needed |
| D7 | Route approach | **Complete rewrite** for ontological consistency | New route tree under `/workbase/[id]/` |
| Q1 | Data migration | **No migration needed** — test data will be cleared before work begins | Clean slate for new schema |
| Q2 | KB ↔ Work Base | Refactor RAG tables to use `workbase_id` directly | See D2 |
| Q6 | Expert Q&A | Keep on document detail page | No change |
| Q7 | Quality dashboards | Keep as sub-pages under Fact Training | No change |
| Q8 | Multi-user | **Future feature** — not for launch | No Settings members section needed |
| Q9 | Route structure | Use `/workbase/` (not `/w/`) | Readable URLs |
| Q10 | Deployment | Complete rewrite preferred | See D7 |

---

## 2. Decision D1: Eliminate Data Shaping — Aggregate on Conversations Page

### James' Core Insight

> "The Data Shaping step should ONLY include the selection of conversations into an aggregate file and then everything between that selection and the Launch Tuning is not needed to be visible to the lay person owner."

> "Maybe we should eliminate the Data Shaping step altogether and the flow is simplified to: Conversations Page → Aggregate Conversations ON the Conversations page → Everything up to 'creating the adapter' step is automatic. And giving the adapter a 'go forward' button is the Launch Tuning step?"

### Recommendation: Yes — Eliminate Data Shaping as a Separate Page

This is the correct call. Here's why:

**The current artifact chain is:**
```
Individual Conversations → Aggregated JSON → LoRA JSONL → Dataset → Pipeline Job → Adapter
```

**James is right that from the user's perspective, there are only 2 meaningful actions:**
1. "Which conversations do I want to use?" (selection + aggregation)
2. "Go ahead and train" (launch)

Everything in between (JSON aggregation, JSONL conversion, dataset creation) is **plumbing** that should be automated.

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

James flagged this concern: having conversations listed on both the Conversations page and a Data Shaping page would be confusing. With Data Shaping eliminated, this is moot. But the Conversations page now has **dual purpose**, which needs careful design:

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

## 2b. Decision D1b: Conversation Content Viewing & "Fine Tuning Prep" Step

### James' New Questions

> "My customers are highly controlling business owners who will definitely want to see the content before they train on it. On the other hand creating a full content editing pipeline could introduce so many factors that need to be controlled that it would be too expensive in cost, time, & testing."

> "What do you think about creating a VIEW only interface for each conversation?"

> "In this scenario DOES it make sense to reintroduce the Data Shaping step? Though I would recommend naming it 'Fine Tuning Prep'."

### Part 1: Yes — Build a View-Only Conversation Detail Page

This is the right call, and here's why it's both necessary and low-risk:

**Why it's necessary:**
- Your customers are SMB owners who are investing real money in training. They will absolutely want to read what their AI is learning before clicking "Train." If they can't see the content, they'll feel out of control — and controlling business owners who feel out of control churn.
- A view-only page is the **minimum viable trust layer**. Without it, users are being asked to blindly trust AI-generated content, which contradicts the "human in the loop" value proposition.
- The current ConversationDetailModal (`src/components/conversations/ConversationDetailModal.tsx`) already shows some conversation data, but it's a modal with limited real estate — not suitable for reading a full multi-turn conversation.

**Why view-only is the correct scope (not edit):**
- Editing a conversation changes the training data, which means: re-validation, re-enrichment, re-aggregation, potential JSONL regeneration, and conflict resolution if the conversation is already in a Training Set. That's a full content pipeline — expensive to build and test.
- View-only gives users the **confidence** they need ("I read it, it looks right") without the **complexity** of mutation.
- The interface can be designed with edit-readiness: use `<div contentEditable={false}>` or a read-only rich text component that can later be swapped to editable. The data model doesn't need to change.

**Recommended implementation:**

**Route:** `/workbase/[id]/fine-tuning/conversations/[convId]`

**Layout:**
- **Back button:** "← Back to Conversations"
- **Header:** Conversation title/name + status badge (Draft / Ready / In Training Set)
- **Context bar** (horizontal, compact):
  - Persona: "{name}"
  - Emotional Arc: "{arc name}"
  - Topic: "{topic}"
  - Quality Score: {score}/10
  - Turn Count: {N} turns
- **Conversation thread** (the main content area):
  - Each turn displayed as a chat-style bubble:
    - **User turns** (left-aligned, light background): the "client" side of the training conversation
    - **Assistant turns** (right-aligned, branded background): the AI response being trained
  - Each turn shows:
    - Turn number (subtle, e.g., "Turn 3 of 8")
    - The message content (plain text, readable font, generous line-height)
    - Emotional state tag (small pill below the message, e.g., "frustrated → empathetic")
  - Strip out: raw JSON structure, technical metadata, enrichment internals, token counts
  - Keep: anything that helps the user understand **what the AI will learn** from this conversation
- **Footer:** "View Raw JSON" (expandable, collapsed by default — for power users/debugging)
- **No edit controls.** But a subtle placeholder: "Editing coming soon" or simply design the layout so that adding an "Edit" button per turn is trivial later.

**What to strip vs. keep from the conversation JSON:**

| Show | Hide |
|---|---|
| Message content (user + assistant) | Raw JSON structure |
| Turn order | Token counts |
| Persona name | Internal IDs |
| Emotional state per turn | Enrichment metadata |
| Topic/category | File paths |
| Quality score | API parameters |

**Effort:** Small-Medium. This is a read-only page that fetches one conversation's JSON from Supabase Storage and renders it as a styled chat thread. No mutations, no state management complexity. The hardest part is parsing the conversation JSON into a clean display format — but the data is already structured with turns, roles, and content.

### Part 2: No — Do Not Reintroduce "Fine Tuning Prep" as a Separate Page

Even with the view-only conversation detail page, **the 2-step flow still works.** Here's why:

**The user's mental journey with view-only is:**

```
1. CONVERSATIONS page
   → See table of conversations
   → Click "View Content" on a conversation → opens detail page → read it → back button → back to table
   → Repeat for a few conversations
   → Select the good ones (checkboxes)
   → Click "Build Training Set"
   → Training Set appears in Section B

2. LAUNCH TUNING page
   → Training Set is auto-selected
   → Adjust sliders
   → Click "Train & Publish"
```

The view-only detail page is a **sub-route of Conversations** (`/conversations/[convId]`), not a new step in the flow. The user's workflow doesn't change — they just have the option to drill into any conversation before selecting it.

**Why "Fine Tuning Prep" would add confusion, not clarity:**

A "Fine Tuning Prep" page implies a **new action** the user must take between reviewing conversations and launching training. But what would that action be? If it's just "select conversations and aggregate" — that's already what "Build Training Set" does on the Conversations page. If it's "review conversations before aggregation" — that's what the view-only detail page does.

Adding a page called "Fine Tuning Prep" would make users ask: "What am I supposed to do here that I didn't already do on the Conversations page?" If the answer is "the same thing but with a different view" — that's the two-identical-lists problem James flagged earlier.

**The one exception where a prep step would make sense:**

If in the future you add **conversation editing**, then the flow becomes:

```
1. CONVERSATIONS → generate/import conversations
2. REVIEW & EDIT (new page) → read, edit, approve individual conversations
3. LAUNCH TUNING → aggregate approved conversations + train
```

At that point, the "Review & Edit" page has a distinct purpose: it's where conversations get **mutated** before training. But for view-only, the detail page as a sub-route of Conversations is sufficient.

**Updated stepper (unchanged):** `1 Conversations → 2 Launch Tuning`

The view-only conversation detail is accessible via "View Content" button on each row — it's a drill-down, not a step.

### Summary

| Decision | Recommendation |
|---|---|
| View-only conversation content page | **Yes — build it.** Route: `/conversations/[convId]`. Chat-style layout, stripped metadata, read-only. Design for future editability. |
| Reintroduce "Fine Tuning Prep" page | **No.** The 2-step flow (Conversations → Launch Tuning) still holds. The view page is a drill-down within Step 1, not a new step. |
| Future: when editing is added | **Then** consider a "Review & Edit" step between Conversations and Launch Tuning. Not now. |

---

## 3. Decision D2: No Separate KB — RAG Lives Directly in the Work Base

### James' Core Insight

> "Adding another 'base' inside the Workbase is just another step, and it implies that we could have more than one RAG base within a Work Base. Is that needed or wise?"

> "My original idea was that the Work Base is the container for both, regardless of which one you want to create first."

### Recommendation: One RAG Scope Per Work Base, No KB Entity

**The answer is definitively: no separate KB.** Here's the analysis:

**Why multiple KBs per Work Base would be bad:**
- Adds a container-within-a-container — users would ask "why do I need to create a Knowledge Base inside my Work Base?"
- Creates the same "Library" problem the transcript identified: a floating entity that doesn't feel like it belongs
- The Work Base already IS the container. Adding a KB inside it is redundant nesting.

**Why one RAG scope per Work Base is sufficient:**
- Each Work Base represents one project/client/brand
- All documents for that project belong together
- The chat scopes (single doc vs all docs) already handle granularity
- If a user needs separate document collections, they create separate Work Bases — that's the entire point of Work Bases

**The resulting model:**
```
Work Base
├── Fine Tuning: conversations → training sets → adapter (one active)
└── Fact Training: documents → embeddings → chat (all docs in this Work Base)
```

No KB creation step. No KB selection. Documents go directly into the Work Base's Fact Training section.

### Technical Impact: Replacing `knowledge_base_id` with `workbase_id`

Based on the deep code analysis, here is the scope:

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

1. **The denormalization pattern must be preserved.** The `workbase_id` on `rag_embeddings`, `rag_facts`, and `rag_sections` is not a true FK — it's denormalized for performance so that KB-wide (now Work Base-wide) vector similarity searches can filter without joining through `rag_documents`. This is critical for search performance and must be maintained.

2. **The `increment/decrement_kb_doc_count` RPCs** currently update a `document_count` column on `rag_knowledge_bases`. This counter logic needs to move to the `workbases` table (add a `document_count` column) or be removed in favor of a computed count.

3. **The `rag_knowledge_bases` hook (`useRAGKnowledgeBases`)** is used by the KB selection screen on the RAG page. This entire hook and its API route (`/api/rag/knowledge-bases`) become obsolete. The `CreateKnowledgeBaseDialog` component is also eliminated.

4. **Client-facing API parameter names** (`knowledgeBaseId` in hooks and routes) can be renamed to `workbaseId` since this is a clean rewrite, not a backward-compatible migration.

**Scope assessment:** Medium — the changes are numerous but mechanical. Since test data will be cleared, there's no migration risk. The hardest part is updating the 3 service files and 4 RPC functions.

---

## 4. Decision D3: Active Adapter Storage — Column on `workbases` Table

### James' Question

> "I am not 100% knowledgeable about the way that gives the app the most hardiness and flexibility, while maintaining a forward development architecture for future enhancements."

### Recommendation: `active_adapter_job_id` Column on `workbases` Table

**This is the correct choice.** Here's the architectural analysis:

**Option A: `active_adapter_job_id` on `workbases` table (RECOMMENDED)**

```sql
ALTER TABLE workbases
ADD COLUMN active_adapter_job_id uuid REFERENCES pipeline_training_jobs(id);
```

Pros:
- **Single source of truth**: One column, one place to look
- **Atomic updates**: Changing the active adapter is one UPDATE, not a delete+insert
- **Simple queries**: `SELECT active_adapter_job_id FROM workbases WHERE id = ?`
- **NULL = no adapter**: Clean representation of "not yet trained"
- **Rollback is trivial**: Just UPDATE to a different job ID
- **Foreign key integrity**: DB enforces that the job exists
- **Forward-compatible**: If you later need metadata about the active adapter (deployed_at, deployed_by), you add columns to `workbases` or create a simple view

Cons:
- Only supports one active adapter (which is the requirement)
- If you ever need multiple active adapters per Work Base (e.g., for A/B testing two adapters simultaneously), you'd need to refactor

**Option B: Junction table `workbase_adapters` (NOT RECOMMENDED for this stage)**

```sql
CREATE TABLE workbase_adapters (
  workbase_id uuid REFERENCES workbases(id) UNIQUE,
  job_id uuid REFERENCES pipeline_training_jobs(id),
  activated_at timestamptz
);
```

Pros:
- Could support multiple adapters per Work Base in the future
- Can store activation metadata (who activated, when)

Cons:
- Over-engineered for the "one active adapter" requirement
- UNIQUE constraint on `workbase_id` means it's functionally identical to a column, but with extra JOIN overhead
- More complex queries everywhere
- The "multiple adapters" future scenario is explicitly not needed (James said: "There can only be one LoRA adapter per workspace")

**Verdict: Option A.** The column approach is simpler, faster, and perfectly fits the stated constraint. If the constraint ever changes (unlikely — James gave two structural reasons why it won't), the migration from column to junction table is trivial.

**Additional columns to add to `workbases`:**

```sql
CREATE TABLE workbases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  description text,
  active_adapter_job_id uuid REFERENCES pipeline_training_jobs(id),
  document_count integer DEFAULT 0,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

- `document_count` replaces the counter on `rag_knowledge_bases`
- `status` for soft-delete/archiving
- RLS: `user_id = auth.uid()`

---

## 5. Decision D4: Behavior Chat Availability States

### James' Concern

> "We would have to make it clear what is available in that chat (i.e. if neither LoRA or RAG have been implemented then the chat must not be functional and the user must understand why it is not available.)"

### Recommendation: Four Clear States with Contextual Banners

The Behavior Chat page should handle 4 states:

| State | LoRA | RAG | What User Sees |
|---|---|---|---|
| **Empty** | No adapter | No docs | Banner: "Set up Fine Tuning or upload documents to start chatting." Two CTAs: "Go to Conversations" / "Upload Documents" |
| **RAG Only** | No adapter | Docs ready | Banner: "Chatting with your documents. Fine Tuning is not active." Chat works with RAG mode. |
| **LoRA Only** | Adapter live | No docs | Banner: "Chatting with your trained AI. No documents uploaded yet." Chat works with LoRA mode. |
| **Full** | Adapter live | Docs ready | Banner: "Chatting with your trained AI + your documents." Mode selector available (LoRA only / RAG only / Both). |

**Implementation:** The existing `ModeSelector` component (`components/rag/ModeSelector.tsx`) already supports `rag_only | lora_only | rag_and_lora`. We just need to:
1. Query Work Base state (active adapter? docs ready?) on page load
2. Auto-select the appropriate default mode
3. Disable unavailable modes in the selector
4. Show the appropriate banner

**Important UX note:** The chat page should **always be accessible** from the sidebar (never grayed out or hidden). Hiding it means users never discover the "reward." Instead, the page itself explains what's needed and provides direct CTAs to set things up. This follows the "reveal the destination, explain the path" pattern used by Notion, Figma, and Linear for empty states.

---

## 6. Decision D5: Conversation Generation Stays on Conversations Page

### James' Decision

> "I think this can remain a button on the Conversations page, as it is now."

### The Question: Would a Separate Creation Flow Add Value?

A separate creation flow (wizard/modal) would only add value if:
- The generation parameters are complex enough to warrant their own screen (currently: persona, emotion, topic — 3 fields)
- Users need to preview/configure the conversation before generating
- Batch generation needs a dedicated monitoring view

Currently, the Conversations page has a "Bulk Generator" button that navigates to `/bulk-generator`. In the new model:

**Recommendation: Keep the "New Conversation" button on the Conversations page, but make the bulk generator a modal/drawer instead of a separate page.**

- "New Conversation" → opens a drawer/modal with persona/emotion/topic selection + "Generate" button
- "Bulk Generate" → same drawer but with batch size field
- Generated conversations appear in the table with status "Processing → Ready"
- The `/bulk-generator` page is absorbed — no separate route needed

This keeps users in context (they never leave the Conversations page) while still providing full generation capabilities.

---

## 7. Decision D6: A/B Testing Built into Behavior Chat

### James' Decision

> "I think for this iteration it can be built into the Behavior Chat, as it is now part of the 'multi turn chat'."

### Implementation Note

The current multi-turn chat (`MultiTurnChat` component) already includes A/B comparison (Control vs Adapted) with:
- `DualResponsePanel` — side-by-side responses
- `DualArcProgressionDisplay` — progression comparison
- Per-turn evaluation
- Claude-as-Judge scoring

All of this stays. The only change is:
1. The component receives `workbaseId` instead of `jobId`
2. It looks up the active adapter from the Work Base
3. The A/B comparison toggle is available when an adapter is live
4. When no adapter is live, A/B comparison is hidden/disabled

---

## 8. Decision D7: Complete Route Rewrite

### James' Decision

> "I would prefer a complete rewrite of the routing structure so that the new system is ontologically consistent."

### Technical Architect Assessment

**A complete rewrite is the correct approach for this case.** Here's why:

**Why incremental wrapping would be worse:**
- The current routes (`/conversations`, `/datasets`, `/training-files`, `/pipeline/*`, `/rag/*`) don't have a `workbase_id` parameter — every page would need a new data-fetching layer
- The dashboard layout (`layout.tsx`) has no sidebar — adding one would conflict with page-level headers
- Mixing old routes (`/rag`) with new routes (`/workbase/[id]/fact-training/documents`) would create confusing URL inconsistency
- The RAG page manages internal state transitions via React state — this needs to be broken into proper routes

**Why a rewrite is safe in this case:**
- Test data will be cleared (James confirmed)
- No external integrations depend on the current routes
- The **components** (ConversationTable, RAGChat, MultiTurnChat, etc.) are preserved — only the **pages** and **routes** change
- API routes (`/api/*`) can largely stay the same — the rewrite is frontend routing, not backend

**The rewrite scope:**

| What Changes | What's Preserved |
|---|---|
| All page files under `src/app/(dashboard)/` | All components under `src/components/` |
| Dashboard layout (adds sidebar) | All hooks under `src/hooks/` |
| Route structure (flat → nested under workbase) | All services under `src/lib/` |
| Page-level data fetching (adds workbase_id) | All API routes under `src/app/api/` (mostly) |
| Zustand stores (adds workbase context) | UI components (`src/components/ui/`) |

**Risk mitigation:**
- Build new routes alongside old ones during development (both accessible)
- Switch the default route (`/dashboard` → `/home`) only when new routes are complete
- Keep old routes alive but hidden for 1 sprint as fallback

---

## 9. Revised Ontology & Page Map (Final)

Incorporating all of James' decisions:

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
    │   │   ├── Section A: Conversation Library (table with filters, generation, enrichment)
    │   │   │   ├── "View Content" per row → Conversation Detail (view-only)
    │   │   │   └── "Build Training Set" CTA (select conversations → aggregate)
    │   │   └── Section B: Training Sets (aggregation history, status, download)
    │   │
    │   ├── Conversation Detail (/workbase/[id]/fine-tuning/conversations/[convId])
    │   │   └── View-only: chat-style turn display, context bar, no editing
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
3. **Single Document Chat and All Documents Chat MERGED** into one "Chat" page under Fact Training (with document filter)
4. **Processing Status page ABSORBED** into the Documents page (per-document status shown inline)
5. **No KB entity anywhere** — documents go directly into the Work Base

---

## 10. Revised Navigation (Final)

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

**Changes from v1 navigation:**
- "Data Shaping" removed (absorbed into Conversations)
- "Processing Status" removed (absorbed into Documents)
- "Single Document Chat" and "All Documents Chat" merged into "Chat"
- Section headers are "FINE TUNING" and "FACT TRAINING" (uppercase, non-clickable labels)
- 7 clickable pages + 1 overview = 8 pages total (down from 11 in v1)

---

## 11. Detailed Page Specifications (Final)

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
  - New column: "Training Sets" (shows which Training Sets include this conversation, e.g., "Set 1, Set 3")
  - Status badge includes: `Draft | Ready | In Training Set`
  - **"View Content" button** per row → navigates to Conversation Detail page (view-only, chat-style)
  - Row click → ConversationDetailModal (preserved for quick metadata view)
- **Bulk action bar** (appears when conversations selected):
  - "Build Training Set" (primary CTA — aggregates selected into a new Training Set)
  - "Enrich Selected" (existing enrichment pipeline)
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
- **Footer (collapsed):** "View Raw JSON" accordion for power users
- **No edit controls.** Layout designed so "Edit" button per turn can be added later without restructuring.

**Data source:** Fetches conversation JSON from Supabase Storage (same data the ConversationDetailModal uses, but rendered as a full page with chat-style formatting).

**Effort:** Small-Medium — read-only page, no mutations, main work is parsing the conversation JSON into a clean chat display.

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
- **Availability banner** (top, conditional — see D4 states above)
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

**What this replaces:** The "chatKbId" state in the RAG page + the "Chat with all" button flow. Now it's a proper route instead of React state management.

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

## 12. Technical Architecture Recommendations

### New Database Table

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

-- RLS
ALTER TABLE workbases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own workbases"
  ON workbases FOR ALL
  USING (user_id = auth.uid());

-- Index
CREATE INDEX idx_workbases_user_id ON workbases(user_id);
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

-- Add FK constraints
ALTER TABLE rag_documents ADD CONSTRAINT fk_rag_documents_workbase
  FOREIGN KEY (workbase_id) REFERENCES workbases(id);
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

## 13. Implementation Sequence

### Phase 0: Pre-work (1 day)
- [ ] Clear all test data from database
- [ ] Rename user-facing labels in current codebase (low-risk, immediate value)
- [ ] Plan the database migration (DDL for `workbases` table + column changes)

### Phase 1: Database + Work Base Foundation (2-3 days)
- [ ] Create `workbases` table with SAOL
- [ ] Add `workbase_id` to `conversations`, `training_files`, `pipeline_training_jobs`
- [ ] Rename `knowledge_base_id` → `workbase_id` on 5 RAG tables
- [ ] Update 4 RPC functions
- [ ] Drop `rag_knowledge_bases` table
- [ ] Create API routes: `POST/GET /api/workbases`
- [ ] Create Work Base CRUD hooks

### Phase 2: Route Structure + Layout (2-3 days)
- [ ] Create `/home` page (Work Base list + QuickStart)
- [ ] Create `/workbase/[id]/layout.tsx` (sidebar navigation)
- [ ] Create `/workbase/[id]/page.tsx` (Overview)
- [ ] Create Settings page
- [ ] Wire up Work Base switcher in sidebar header

### Phase 3: Fine Tuning Pages (3-4 days)
- [ ] Build Conversations page with dual sections (Library + Training Sets)
- [ ] Build "Build Training Set" flow (aggregation on Conversations page)
- [ ] Build Launch Tuning page (consolidated configure + monitor + results)
- [ ] Build Behavior Chat page (with availability states + mode selector)
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

### Total Estimated Scope: 11-16 days of development


## **James' Response v6 — Analysis & Solutions**

James provided 5 items of feedback. Each is analyzed below with a complete, actionable solution that integrates into the existing specification.

---

### V6-1: Identity Spine Compliance Audit

**James' Request:** Check that all new or changed entities have their identity constraints and connections factored in.

**Analysis:** The Identity Spine (E03/E04) established a strict pattern for every table: `user_id UUID NOT NULL REFERENCES auth.users(id)`, RLS enabled, per-operation policies (SELECT/INSERT/UPDATE/DELETE + service_role), performance index on `user_id`, and `requireAuth()` on every API route. I audited every entity in this specification against that pattern.

#### Audit Results

| Entity | Status | Notes |
|---|---|---|
| **`workbases` table (NEW)** | **COMPLIANT** | DDL in Section 12 already includes: `user_id UUID NOT NULL REFERENCES auth.users(id)`, `ALTER TABLE workbases ENABLE ROW LEVEL SECURITY`, policy `USING (user_id = auth.uid())`, and `CREATE INDEX idx_workbases_user_id`. Fully spine-compliant as specified. |
| **`conversations.workbase_id` (NEW FK)** | **NEEDS ADDITION** | The DDL in Section 12 adds `workbase_id uuid REFERENCES workbases(id)` but does NOT add a performance index. Required: `CREATE INDEX CONCURRENTLY idx_conversations_workbase_id ON conversations(workbase_id);` |
| **`training_files.workbase_id` (NEW FK)** | **NEEDS ADDITION** | Same gap. Required: `CREATE INDEX CONCURRENTLY idx_training_files_workbase_id ON training_files(workbase_id);` |
| **`pipeline_training_jobs.workbase_id` (NEW FK)** | **NEEDS ADDITION** | Same gap. Required: `CREATE INDEX CONCURRENTLY idx_pipeline_training_jobs_workbase_id ON pipeline_training_jobs(workbase_id);` |
| **RAG tables `workbase_id` RENAME** | **COMPLIANT** | These columns already have indexes via the existing `knowledge_base_id` columns. Rename preserves the index. RLS policies on all 5 RAG tables already enforce `user_id = auth.uid()` — the `workbase_id` rename is a scoping FK, not an ownership column. No new RLS changes needed. |
| **`conversation_comments` table (NEW — see V6-3)** | **NEEDS FULL SPINE** | New table. Full spine required — see V6-3 below. |
| **API routes for `/api/workbases`** | **NEEDS `requireAuth()`** | New route. Must use `requireAuth()` + scope all queries by `user.id`. Gold Standard pattern from `datasets/route.ts`. |
| **API routes for `/api/workbase/[id]/training-sets`** | **NEEDS `requireAuth()`** | New route. Same pattern. Must verify workbase ownership before any operation. |

#### Required DDL Additions to Section 12

```sql
-- Performance indexes for new FK columns (CONCURRENTLY, no transaction)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_workbase_id
  ON conversations(workbase_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_files_workbase_id
  ON training_files(workbase_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pipeline_training_jobs_workbase_id
  ON pipeline_training_jobs(workbase_id);
```

#### API Route Pattern for All New Routes

Every new API route MUST follow this pattern (established by the Identity Spine):

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

#### Verdict

The `workbases` table DDL is already spine-compliant. Three new FK columns need performance indexes. All new API routes must use `requireAuth()` and verify workbase ownership. The new `conversation_comments` table (V6-3) needs a full spine build. These additions are documented below and integrated into the implementation phases.
**James' Response v7** I agree with this solution for version 07.
---

### V6-2: Auto-Enrich — Remove Manual "Enrich All" Button

**James' Request:** The "Enrich All" button on `/batch-jobs/[id]` needs to go away. Enrichment should happen automatically.

**Analysis:** Deep research of the enrichment flow reveals:

**Current flow (manual):**
1. Batch job generates conversations (via Inngest `process-next` loop)
2. Each conversation is created with `enrichment_status: 'not_started'`
3. User navigates to `/batch-jobs/[id]` and clicks "Enrich All" after batch completes
4. "Enrich All" button calls `POST /api/conversations/bulk-enrich` with all completed conversation IDs
5. The bulk-enrich API loops through each conversation and calls the Enrichment Pipeline Orchestrator (5 stages: validate → enrich → normalize → store → mark complete)

**Why enrichment was originally manual:** A comment in `conversation-generation-service.ts` (line 278-281) explains:
> "Fire-and-forget async enrichment doesn't work in Vercel serverless (gets killed after HTTP response)"

The generation service deliberately does NOT auto-enrich because Vercel serverless functions terminate after the HTTP response is sent. Enrichment needs its own execution context.

**Solution: Trigger enrichment automatically when each conversation generation completes.**

The correct approach is to fire an Inngest event after each conversation is generated, which triggers enrichment in a separate serverless function invocation with its own execution time budget.

#### Implementation Plan

**Step 1: Create a new Inngest function `autoEnrichConversation`**

```typescript
// src/inngest/functions/auto-enrich-conversation.ts
import { inngest } from '@/inngest/client';
import { getPipelineOrchestrator } from '@/lib/services/enrichment-pipeline-orchestrator';

export const autoEnrichConversation = inngest.createFunction(
  {
    id: 'auto-enrich-conversation',
    name: 'Auto-Enrich Conversation',
    concurrency: { limit: 3 }, // Limit concurrent enrichments
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

**Step 2: Fire the Inngest event after each conversation generation succeeds**

In the batch processing flow (`/api/batch-jobs/[id]/process-next/route.ts` or `conversation-generation-service.ts`), after a conversation is successfully generated and stored:

```typescript
// After conversation is saved with enrichment_status: 'not_started'
await inngest.send({
  name: 'conversation/generation.completed',
  data: {
    conversationId: conversation.id,
    userId: userId,
    batchJobId: batchJob.id, // for traceability
  },
});
```

**Step 3: Register the new function in `src/inngest/functions/index.ts`**

Add `autoEnrichConversation` to the exported functions array.

**Step 4: Remove the "Enrich All" button**

- **File:** `src/app/(dashboard)/batch-jobs/[id]/page.tsx`
  - Remove the "Enrich All" button (lines 609-627)
  - Remove the `handleEnrichAll` function (lines 295-339)
  - Remove `enriching` and `enrichResult` state variables
  - Replace the enrichment results card with an inline status showing how many conversations have been auto-enriched (query by `enrichment_status` counts)
- **File:** `src/app/api/conversations/bulk-enrich/route.ts`
  - **PRESERVE** — the bulk-enrich API still has value as a retry/recovery mechanism. It can be called manually if any auto-enrichments fail. But it is no longer the primary flow.

**Step 5: Update the batch job completion card**

Replace the "Enrich All" button section with a live enrichment progress indicator:

```
Enrichment Progress: 42/50 complete | 3 in progress | 5 pending
```

This queries conversations by `batch_job_id` and groups by `enrichment_status`.

#### Why Inngest (not inline)

- **Vercel timeout:** Enrichment takes 5-15 seconds per conversation (validation + metadata fetch + normalization + storage). Vercel serverless has a 10-60 second timeout. Inngest functions have their own independent execution budget.
- **Retry built-in:** Inngest retries on failure with backoff. No custom retry logic needed.
- **Observability:** Inngest dashboard shows enrichment status per conversation.
- **Concurrency control:** The `concurrency: { limit: 3 }` prevents overwhelming Supabase with parallel enrichment queries.

#### Impact on Specification

- **Page 2 (Conversations page):** Conversations arrive already enriched. The "Enrich Selected" bulk action in the conversations table can be simplified to a retry action for failed enrichments only.
- **Batch Jobs page** (existing, deprecated after route rewrite): "Enrich All" button removed, replaced with auto-enrichment progress display.
- **No user action required:** Enrichment is invisible to the user. Conversations appear as "Ready" without manual intervention.

**James' Response v7** I agree with this solution for v7.
---

### V6-3: Comments Box on Conversation Detail Page

**James' Request:** Add a comments box at the bottom of the Conversation Detail page where users can write natural-language feedback about what they would change or correct. NOT content editing. Comments stored in DB for future use (e.g., regenerating with added context). No functionality built for the comments now — just storage.

**Analysis:** This is a clean, well-scoped feature. It requires a new database table and a simple UI addition to the Conversation Detail page (Page 2b in the specification).

#### Database Schema: `conversation_comments` Table

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
- **`ON DELETE CASCADE` from conversations:** If a conversation is deleted, its comments are cleaned up automatically.
- **Multiple comments per conversation:** Users can add multiple comments over time (not just one text blob). This is more natural — they might notice different things on different reviews.
- **`content text NOT NULL`:** No length limit. Users should feel free to write as much as they want. Future: these comments could be fed as additional context when regenerating a conversation.
- **No `turn_number` column (intentional):** James said this is general feedback, not per-turn annotation. If per-turn feedback is needed later, a `turn_number INTEGER` column can be added.

#### API Route

**`POST /api/conversations/[id]/comments`** — Create a comment
**`GET /api/conversations/[id]/comments`** — List comments for a conversation

Both routes use `requireAuth()` and verify conversation ownership (404 if not owned).

```typescript
// POST /api/conversations/[id]/comments
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  // Verify conversation ownership
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

#### UI Addition to Page 2b (Conversation Detail)

Updated Page 2b specification:

**Add below the conversation thread, before the "View Raw JSON" accordion:**

- **Section: "Your Feedback"**
  - **Subtext:** "Share your thoughts on this conversation. What would you change? What examples would you correct? Your feedback will help improve future generations."
  - **Comment input:** Multi-line textarea with placeholder: "e.g., 'The advisor's response in turn 3 should be more empathetic' or 'This scenario should include a follow-up question about budget'"
  - **Submit button:** "Add Feedback" (disabled when textarea empty)
  - **Comment list:** Below the input, reverse-chronological. Each comment shows:
    - Comment text
    - Timestamp ("2 hours ago")
    - Delete button (trash icon, with confirmation)
  - **Empty state:** "No feedback yet. After reviewing the conversation, share what you'd change."

**Important UX notes:**
- The feedback section is deliberately at the **bottom** (after reading the full conversation) to encourage reading before commenting.
- The label says "feedback" not "comments" — it primes the user to think about improvements, not social commentary.
- No edit functionality. Users can delete and re-add if they need to change something. This keeps the feature minimal.

#### Future Use (documented, not built)

These comments are stored for future features:
1. **Regeneration with context:** When regenerating a conversation, feed the user's comments as additional system prompt context: "The user has provided this feedback on the previous version: {comments}. Please incorporate this feedback."
2. **Quality signal:** Conversations with many comments may indicate lower quality or opportunities for improvement.
3. **Training data curation:** Comments help human reviewers understand what the user values in conversation quality.

**James' Response v7** I agree with this solution for v7.
---

### V6-4: Modal Background Fix — Opaque Backgrounds on All Modals

**James' Request:** Every modal in the app is transparent, making them impossible to read. Pick an appropriate background color and implement it on ALL modals.

**Analysis:** Full audit of the modal system reveals:

**Root cause:** The base Dialog primitive (`src/components/ui/dialog.tsx`) uses `bg-background` for the `DialogContent` panel. This resolves to the CSS variable `--background`, which is set to:
- Light mode: `#ffffff` (white)
- Dark mode: `oklch(0.145 0 0)` (~`#1c1c1c`, near-black)

The problem is NOT that the DialogContent lacks a background — it has one. The problem is likely one of:
1. **The app is running in dark mode** and `oklch(0.145 0 0)` against a dark page creates insufficient contrast
2. **A custom theme or override** is clearing the background variable
3. **The `bg-background` class is being overridden** by more specific styles

However, regardless of the root cause, the fix is the same: ensure ALL modal content panels have an explicitly opaque, high-contrast background.

**Scope: 15 modal instances across the app.**

**Dialog instances (13):**
| Component | File | Custom max-width |
|---|---|---|
| Error Details Dialog | `src/components/upload/error-details-dialog.tsx` | `sm:max-w-[600px]` |
| Metadata Edit Dialog | `src/components/upload/metadata-edit-dialog.tsx` | `sm:max-w-[500px]` |
| Create KB Dialog | `src/components/rag/CreateKnowledgeBaseDialog.tsx` | default |
| Validation Report | `src/components/conversations/validation-report-dialog.tsx` | `max-w-3xl` |
| Keyboard Shortcuts | `src/components/conversations/KeyboardShortcutsHelp.tsx` | `max-w-2xl` |
| Conversation Preview | `src/components/conversations/ConversationPreviewModal.tsx` | `max-w-4xl` |
| Conversation Detail | `src/components/conversations/ConversationDetailModal.tsx` | `max-w-5xl` |
| Create Training File | `src/components/conversations/ConversationTable.tsx` | default |
| Dataset Selector | `src/components/pipeline/DatasetSelectorModal.tsx` | `max-w-2xl` |
| Export Modal | `src/components/import-export/ExportModal.tsx` | `max-w-md` |
| Import Modal | `src/components/import-export/ImportModal.tsx` | `max-w-2xl` |
| Error Report | `src/components/failed-generations/error-report-modal.tsx` | `max-w-4xl` |

**AlertDialog instances (2):**
| Component | File |
|---|---|
| Confirmation Dialog | `src/components/conversations/ConfirmationDialog.tsx` |
| Stop Batch Job | `src/app/(dashboard)/batch-jobs/page.tsx` |

#### Solution: Fix at the Primitive Level (2 files)

The most efficient fix is at the base primitive level. This ensures ALL current and future modals inherit the correct styling. No need to touch 15 individual files.

**Fix 1: `src/components/ui/dialog.tsx` — DialogContent**

Change `DialogContent` className from:
```tsx
className="bg-background ..."
```
To:
```tsx
className="bg-zinc-900 text-zinc-50 border-zinc-700 ..."
```

**Fix 2: `src/components/ui/dialog.tsx` — DialogOverlay**

Change overlay from:
```tsx
className="... bg-black/50"
```
To:
```tsx
className="... bg-black/80 backdrop-blur-sm"
```

**Fix 3: `src/components/ui/alert-dialog.tsx` — AlertDialogContent and AlertDialogOverlay**

Apply identical changes to the AlertDialog variants.

#### Recommended Color Palette for Modals

Given the app uses a dark theme with the existing Tailwind palette:

| Element | Class | Result |
|---|---|---|
| **Modal panel background** | `bg-zinc-900` | Solid dark gray (`#18181b`) — opaque, high contrast against dark pages |
| **Modal panel text** | `text-zinc-50` | Near-white (`#fafafa`) — readable against dark background |
| **Modal panel border** | `border-zinc-700` | Subtle border (`#3f3f46`) — defines the modal edge |
| **Overlay/scrim** | `bg-black/80 backdrop-blur-sm` | 80% black with slight blur — clearly separates modal from page content |
| **Input fields inside modals** | `bg-zinc-800` | Slightly lighter (`#27272a`) — distinguishes inputs from panel |
| **Muted text in modals** | `text-zinc-400` | Gray text (`#a1a1aa`) for secondary info |

**Why `bg-zinc-900` instead of `bg-background`:**
- `bg-background` references a CSS variable that may be the same as the page background, creating the transparency illusion
- `bg-zinc-900` is a direct Tailwind utility — no variable chain, guaranteed opaque
- It provides clear visual separation from the underlying page regardless of the page's own background

#### Implementation: Phase 0 (Pre-work)

This fix should be applied **immediately** as part of Phase 0 (pre-work), since:
1. It is a 2-file change (both primitives)
2. It fixes a usability blocker across the entire current app
3. It benefits users before any other UX changes land
4. All 15 modal instances inherit the fix automatically

**James' Response v7** I agree with this solution for v7.
---

### V6-5: Pre-Provisioned Inference Endpoints (Standalone / If Time)

**James' Request:** Pre-create inference serverless endpoints for each new customer BEFORE they are needed. Either at first Work Base creation or at the beginning of RAG/LoRA training. They take time to spin up, so "pre-doing" them improves UX.

**Analysis:** Deep research of the current deployment flow reveals:

**Current flow:**
1. Training job completes → Supabase webhook fires → Inngest `autoDeployAdapter` function runs
2. `autoDeployAdapter` does: download adapter tar.gz → push to HuggingFace → update RunPod LORA_MODULES env var on the shared serverless endpoint → attempt vLLM hot-reload → create DB records in `pipeline_inference_endpoints`
3. There are currently **two inference modes** controlled by `INFERENCE_MODE` env var:
   - **Pods mode (current):** Two separate RunPod pod URLs — one control, one adapted. Pod URLs are manually configured in Vercel env vars. No per-customer provisioning.
   - **Serverless mode (preserved but disabled):** Single shared RunPod serverless endpoint. All customers share the same endpoint. LoRA adapters are registered via the `LORA_MODULES` environment variable on the shared endpoint.

**Key insight: The current architecture uses a SHARED inference endpoint, not per-customer endpoints.**

All customers share one RunPod endpoint (`RUNPOD_INFERENCE_ENDPOINT_ID`). LoRA adapters are loaded as named modules (`adapter-{jobId[:8]}`) on the shared vLLM instance. This means there is nothing to "pre-provision" per customer — the endpoint already exists. What takes time is:
1. **Cold start of a RunPod serverless worker** (~30-60 seconds, includes loading base model + all registered LoRA adapters)
2. **HuggingFace upload** (~10-30 seconds for 66MB adapter)
3. **RunPod GraphQL env var update** (~2-5 seconds)

**The real UX delay is the cold start, not endpoint creation.** Workers spin down when idle and must cold-start when the next request arrives.

#### Recommendation: Pre-Warm Workers, Not Pre-Create Endpoints

Since the architecture uses a shared endpoint, the correct optimization is **pre-warming workers** so they're hot when the user is ready to chat.

**Option A: Pre-warm at Work Base creation time (RECOMMENDED)**

When a user creates their first Work Base, fire a lightweight "wake-up" request to the inference endpoint:

```typescript
// In the POST /api/workbases route, after creating the workbase
await inngest.send({
  name: 'inference/worker.warmup',
  data: { userId: user.id, workbaseId: workbase.id },
});
```

```typescript
// src/inngest/functions/warmup-inference-worker.ts
export const warmupInferenceWorker = inngest.createFunction(
  {
    id: 'warmup-inference-worker',
    name: 'Warmup Inference Worker',
    retries: 1,
    concurrency: { limit: 1 },
  },
  { event: 'inference/worker.warmup' },
  async ({ event, step }) => {
    await step.run('send-warmup-request', async () => {
      // Send a minimal inference request to force a worker to cold-start
      // The response is discarded — we just want the worker running
      const response = await fetch(process.env.INFERENCE_API_URL + '/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mistralai/Mistral-7B-Instruct-v0.2',
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 1,
        }),
      });
      return { status: response.status };
    });
  }
);
```

**Option B: Pre-warm when LoRA training starts**

Fire the warmup event when a user clicks "Train & Publish" on the Launch Tuning page. Training takes 10-60 minutes, so the worker will be warm by the time the adapter is deployed.

```typescript
// In the training job creation flow
await inngest.send({
  name: 'inference/worker.warmup',
  data: { userId: user.id, trigger: 'training-started' },
});
```

**Option C: Scheduled keep-alive (if budget allows)**

Run a cron job every 10 minutes to send a minimal request to the inference endpoint, keeping at least one worker alive:

```typescript
// src/inngest/functions/inference-keepalive.ts
export const inferenceKeepalive = inngest.createFunction(
  { id: 'inference-keepalive', name: 'Inference Keep-Alive' },
  { cron: '*/10 * * * *' }, // Every 10 minutes
  async ({ step }) => {
    await step.run('ping', async () => {
      await fetch(process.env.INFERENCE_API_URL + '/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mistralai/Mistral-7B-Instruct-v0.2',
          messages: [{ role: 'user', content: 'keepalive' }],
          max_tokens: 1,
        }),
      });
    });
  }
);
```

**Cost consideration:** RunPod serverless charges per-second of GPU time. A keepalive ping costs ~$0.0003 per ping (1 token generation on Mistral 7B). At every 10 minutes, that's ~$0.04/day. The real cost is keeping a GPU worker alive continuously (~$0.50-1.00/hour). The worker will auto-scale down after the idle timeout regardless.

#### Per-Customer Endpoints: When It Makes Sense

James mentioned "inference serverless endpoint created for each new customer." If the intent is to eventually give each customer their own isolated RunPod serverless endpoint (not shared), that is a much larger architectural change:

1. **Create a RunPod serverless endpoint per customer** via GraphQL API (`saveEndpoint` mutation)
2. **Configure the endpoint** with the base model + customer's LoRA adapters
3. **Store the endpoint ID** in `workbases.inference_endpoint_id` (new column)
4. **Route inference requests** to the customer-specific endpoint URL

**This would require:**
```sql
ALTER TABLE workbases ADD COLUMN inference_endpoint_id text;
ALTER TABLE workbases ADD COLUMN inference_endpoint_url text;
ALTER TABLE workbases ADD COLUMN inference_status text
  DEFAULT 'pending' CHECK (inference_status IN ('pending', 'provisioning', 'ready', 'failed'));
```

**Timeline:** This is a Phase 5+ enhancement. The shared endpoint approach works well for the initial customer base. Per-customer endpoints become necessary when:
- Customer A's LoRA adapter loading delays Customer B's requests
- Customers need guaranteed GPU availability (SLA)
- The total number of LoRA adapters exceeds vLLM's in-memory limit (~10-20 adapters per worker)

#### Recommended Approach for This Iteration

1. **Implement Option A (pre-warm at Work Base creation)** — minimal effort, immediate UX improvement
2. **Implement Option B (pre-warm at training start)** — ensures worker is hot when adapter deploys
3. **Add `inference_endpoint_id` column to `workbases` DDL** as NULLABLE — forward-compatible for per-customer endpoints later, no cost now
4. **Defer per-customer endpoint provisioning** to a future phase when customer scale demands it

**James' Response v7**
I actually just realized a huge limiting factor.
The workers do not pick up the LoRA module until they are restarted **after** the LoRA module name is in the endpoints's`LORA_MODULES` environment variable. So pre warming them does no good. We could implement an adapter naming strategy that allows us to predict the future name of the adapter. But I think that is not in scope for this iteration. For now we will stay with sending the adapter name to Runpod at the time of adapter name creation. If it could be moved to an independent thread that kicks off as soon as we **DO** know the adapter name that would be great.

#### Updated `workbases` DDL (with inference column)

```sql
CREATE TABLE workbases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  description text,
  active_adapter_job_id uuid REFERENCES pipeline_training_jobs(id),
  document_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  inference_endpoint_id text,       -- NULL until per-customer endpoints are implemented
  inference_endpoint_url text,      -- NULL until per-customer endpoints are implemented
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

---

## Updated Implementation Sequence (Revised with V6 Items)

### Phase 0: Pre-work (1 day)
- [ ] **V6-4: Fix modal backgrounds** — Update `dialog.tsx` and `alert-dialog.tsx` primitives with opaque `bg-zinc-900` backgrounds and `bg-black/80 backdrop-blur-sm` overlays (2 files, all 15 modals inherit)
- [ ] Clear all test data from database
- [ ] Rename user-facing labels in current codebase (low-risk, immediate value)
- [ ] Plan the database migration

### Phase 1: Database + Work Base Foundation (2-3 days)
- [ ] Create `workbases` table with SAOL (with `inference_endpoint_id` and `inference_endpoint_url` columns)
- [ ] **V6-3: Create `conversation_comments` table** with full Identity Spine (user_id NOT NULL, RLS, 5 policies, 2 indexes)
- [ ] Add `workbase_id` to `conversations`, `training_files`, `pipeline_training_jobs`
- [ ] **V6-1: Create performance indexes** on all 3 new `workbase_id` FK columns
- [ ] Rename `knowledge_base_id` → `workbase_id` on 5 RAG tables
- [ ] Update 4 RPC functions
- [ ] Drop `rag_knowledge_bases` table
- [ ] Create API routes: `POST/GET /api/workbases` (with `requireAuth()`)
- [ ] **V6-3: Create API routes** for `conversation_comments` (`POST/GET /api/conversations/[id]/comments`)
- [ ] Create Work Base CRUD hooks

### Phase 2: Route Structure + Layout (2-3 days)
- [ ] Create `/home` page (Work Base list + QuickStart)
- [ ] Create `/workbase/[id]/layout.tsx` (sidebar navigation)
- [ ] Create `/workbase/[id]/page.tsx` (Overview)
- [ ] Create Settings page
- [ ] Wire up Work Base switcher in sidebar header
- [ ] **V6-5: Add inference worker warmup** — fire `inference/worker.warmup` Inngest event on Work Base creation

### Phase 3: Fine Tuning Pages (3-4 days)
- [ ] Build Conversations page with dual sections (Library + Training Sets)
- [ ] **V6-2: Implement auto-enrichment** — create `autoEnrichConversation` Inngest function, fire event after generation, remove "Enrich All" button
- [ ] Build "Build Training Set" flow (aggregation on Conversations page)
- [ ] Build Launch Tuning page (consolidated configure + monitor + results)
- [ ] **V6-5: Fire inference warmup** when user clicks "Train & Publish"
- [ ] Build Behavior Chat page (with availability states + mode selector)
- [ ] Build Conversation Detail page (view-only)
- [ ] **V6-3: Add feedback section** to Conversation Detail page (textarea + comment list)
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

*End of UX Decisions & Path Forward*