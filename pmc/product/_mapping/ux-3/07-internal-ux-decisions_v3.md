#  UX Decisions & Path Forward

**Version:** 3.0 | **Date:** 2026-02-27
**Supersedes:** 07-internal-ux-decisions_v2.md (v2.0), 03-lora-chat-fix-spec_v2.md
**Context:** All decisions from v1/v2 + worker refresh cycle from 03-spec (unimplemented), fully integrated
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
13. [Decision D11: Adapter Deployment Threading & Worker Refresh Cycle](#13-decision-d11)
14. [Decision D12: MAX_LORAS Increase & Research Deliverables](#14-decision-d12)
15. [Revised Ontology & Page Map](#15-revised-ontology)
16. [Revised Navigation](#16-revised-navigation)
17. [Detailed Page Specifications](#17-detailed-page-specifications)
18. [Technical Architecture](#18-technical-architecture)
19. [Implementation Sequence](#19-implementation-sequence)
20. [Appendix A: First Customer Journey](#20-appendix-a)
21. [Appendix B: 03-Spec Reconciliation](#21-appendix-b)

---

## 1. Decision Summary

All decisions from v1 (D1–D7, Q1–Q10), v6/v7 additions (D8–D10), plus 03-spec integration (D11 revised, D12 new).

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
| D11 | Adapter deployment + worker refresh | **Worker refresh cycle after LORA_MODULES update.** `deploying` status until workers restart and adapter is verified. Pre-warming dropped. No per-customer endpoints this iteration. | Revised `autoDeployAdapter` + new `refreshInferenceWorkers` Inngest function |
| D12 | MAX_LORAS + research | **Increase MAX_LORAS to 5.** Research RunPod programmatic endpoint creation (documentation only, no implementation). | Environment variable change during worker refresh; research deliverable |
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
- Each row shows a status badge: `Draft | Ready | In Training Set`
- Subtext: "Review and refine your training conversations. Select conversations below to build a Training Set."

**Section B: Training Sets (bottom of page, or collapsible panel)**
- List of aggregated Training Sets (previously "Training Files")
- Each row: Name, conversation count, created date, status (Processing / Ready / In Use)
- Badge: "Active" on the set currently being used by the live adapter
- Actions: View JSON, Download JSONL, Use for Launch Tuning
- This replaces the Training Files page, the Datasets page, and the Data Shaping page entirely

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

---

## 3. Decision D1b: Conversation Content Viewing & "Fine Tuning Prep" Step

### Part 1: Build a View-Only Conversation Detail Page

**Why it's necessary:**
- SMB owners investing real money in training will absolutely want to read what their AI is learning. Without visibility, they churn.
- A view-only page is the **minimum viable trust layer**.
- The current ConversationDetailModal is too cramped for reading full multi-turn conversations.

**Why view-only is the correct scope (not edit):**
- Editing triggers re-validation, re-enrichment, re-aggregation, potential JSONL regeneration — a full content pipeline.
- View-only gives confidence without complexity.
- The interface is designed with edit-readiness for later.

**Route:** `/workbase/[id]/fine-tuning/conversations/[convId]`

**Layout:**
- **Back button:** "← Back to Conversations"
- **Header:** Conversation title + status badge
- **Context bar:** Persona | Arc | Topic | Quality | Turns
- **Conversation thread:** Chat-style bubbles (user left, assistant right), turn numbers, emotional state pills
- **Your Feedback section** (see D9)
- **Footer:** "View Raw JSON" accordion
- **No edit controls.** Layout designed so "Edit" button per turn can be added later.

### Part 2: Do Not Reintroduce "Fine Tuning Prep" as a Separate Page

The view-only detail page is a **sub-route of Conversations**, not a new step.

**Updated stepper (unchanged):** `1 Conversations → 2 Launch Tuning`

---

## 4. Decision D2: No Separate KB — RAG Lives Directly in the Work Base

### Decision: One RAG Scope Per Work Base, No KB Entity

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
- `increment_kb_doc_count` → `increment_workbase_doc_count`
- `decrement_kb_doc_count` → same
- `match_rag_embeddings_kb` → update parameter name
- `search_rag_text` → update parameter name

**Service files to update (3):** `rag-ingestion-service.ts`, `rag-embedding-service.ts`, `rag-retrieval-service.ts`

**Type definitions:** `src/types/rag.ts` — 2 row types + 2 public types

**Gotchas:**
1. Denormalization pattern on `rag_embeddings/facts/sections` must be preserved for vector search performance
2. `increment/decrement_kb_doc_count` RPCs move counter logic to `workbases` table
3. `useRAGKnowledgeBases` hook, `/api/rag/knowledge-bases` route, and `CreateKnowledgeBaseDialog` all become obsolete
4. All client-facing `knowledgeBaseId` params renamed to `workbaseId`

---

## 5. Decision D3: Active Adapter Storage — Column on `workbases` Table

### Decision: `active_adapter_job_id` Column

```sql
ALTER TABLE workbases
ADD COLUMN active_adapter_job_id uuid REFERENCES pipeline_training_jobs(id);
```

**Why:** Single source of truth, atomic updates, simple queries, NULL = no adapter, rollback is trivial, FK integrity enforced.

**Note on 03-spec `adapter_job_id` on `rag_knowledge_bases`:** That spec proposed adding `adapter_job_id` to `rag_knowledge_bases` for KB↔adapter binding. Since `rag_knowledge_bases` is being dropped (D2) and replaced by `workbases`, the `active_adapter_job_id` on `workbases` **supersedes** the 03-spec's adapter binding approach. Same concept, new home.

---

## 6. Decision D4: Behavior Chat Availability States

### Decision: Four Clear States with Contextual Banners

| State | LoRA | RAG | What User Sees |
|---|---|---|---|
| **Empty** | No adapter | No docs | Banner: "Set up Fine Tuning or upload documents to start chatting." Two CTAs. |
| **RAG Only** | No adapter | Docs ready | Banner: "Chatting with your documents. Fine Tuning is not active." |
| **LoRA Only** | Adapter live | No docs | Banner: "Chatting with your trained AI. No documents uploaded yet." |
| **Full** | Adapter live | Docs ready | Banner: "Chatting with your trained AI + your documents." Full mode selector. |

**Adapter auto-selection:** When a Work Base has `active_adapter_job_id` set, the Behavior Chat page auto-selects that adapter. No manual dropdown. The adapter is resolved from the Work Base — this replaces the 03-spec's "KB bound adapter auto-select" (Change 14) with workbase-scoped resolution.

**RAG query resolution:** When a query is submitted in `lora_only` or `rag_and_lora` mode, the API resolves the adapter from the Work Base's `active_adapter_job_id`. No explicit `modelJobId` needed from the client. This replaces the 03-spec's "query route resolves adapter from KB binding" (Change 15).

Chat page **always accessible** from sidebar (never grayed out). "Reveal the destination, explain the path."

---

## 7. Decision D5: Conversation Generation Stays on Conversations Page

Keep the "New Conversation" button on the Conversations page. Bulk generator absorbed into modal/drawer — no separate route.

---

## 8. Decision D6: A/B Testing Built into Behavior Chat

Uses existing MultiTurnChat + DualResponsePanel. Component receives `workbaseId` instead of `jobId`, looks up active adapter from Work Base. A/B toggle available when adapter is live.

---

## 9. Decision D7: Complete Route Rewrite

### Decision: Complete Rewrite for Ontological Consistency

**Why rewrite:** Current routes lack `workbase_id`, dashboard has no sidebar, mixing old/new routes creates URL inconsistency, RAG page uses React state for navigation.

**Why safe:** Test data cleared, no external integrations, components preserved, only pages/routes change.

| What Changes | What's Preserved |
|---|---|
| All page files under `src/app/(dashboard)/` | All components under `src/components/` |
| Dashboard layout (adds sidebar) | All hooks under `src/hooks/` |
| Route structure (flat → nested under workbase) | All services under `src/lib/` |
| Page-level data fetching (adds workbase_id) | All API routes under `src/app/api/` (mostly) |
| Zustand stores (adds workbase context) | UI components (`src/components/ui/`) |

---

## 10. Decision D8: Auto-Enrichment (Replaces Manual "Enrich All")

### Problem

Users manually click "Enrich All" on `/batch-jobs/[id]` after batch generation. This is an unnecessary step.

### Decision: Automatic Inngest-Based Enrichment After Generation

Fire an Inngest event after each conversation is generated, triggering enrichment in a separate function invocation.

**New Inngest function: `autoEnrichConversation`**

```typescript
// src/inngest/functions/auto-enrich-conversation.ts
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

**Changes:**
1. Create `auto-enrich-conversation.ts`, register in `index.ts`
2. Fire `conversation/generation.completed` event after each conversation is saved
3. Remove "Enrich All" button from batch-jobs page
4. Replace with live enrichment progress indicator
5. Preserve `bulk-enrich` API as retry/recovery mechanism

---

## 11. Decision D9: Conversation Feedback (Comments Box)

### Decision: Add Natural-Language Feedback to Conversation Detail Page

"Your Feedback" section at the bottom of the Conversation Detail page. **Not content editing.** Comments stored in DB for future use (e.g., regenerating with added context).

**Database: `conversation_comments` table** — full Identity Spine compliance (see Technical Architecture section).

**API:** `POST/GET /api/conversations/[id]/comments` — uses `requireAuth()`, verifies conversation ownership.

**UI:** Multi-line textarea, "Add Feedback" button, reverse-chronological comment list with delete, empty state. Placed at bottom to encourage reading before commenting.

---

## 12. Decision D10: Modal Background Fix

### Problem

Every modal in the app is transparent, making them impossible to read.

### Decision: Fix at the Primitive Level (2 files)

All 15 modal instances inherit from 2 primitives (`dialog.tsx`, `alert-dialog.tsx`). Fix both, all modals inherit.

**Changes:**
- `DialogContent` / `AlertDialogContent`: `bg-background` → `bg-zinc-900 text-zinc-50 border-zinc-700`
- `DialogOverlay` / `AlertDialogOverlay`: `bg-black/50` → `bg-black/80 backdrop-blur-sm`

| Element | Class | Result |
|---|---|---|
| Modal panel background | `bg-zinc-900` | Solid `#18181b` — opaque |
| Modal panel text | `text-zinc-50` | Near-white `#fafafa` |
| Modal panel border | `border-zinc-700` | Subtle `#3f3f46` |
| Overlay/scrim | `bg-black/80 backdrop-blur-sm` | 80% black + blur |

**Priority:** Phase 0 (pre-work). Fixes usability blocker across entire current app.

---

## 13. Decision D11: Adapter Deployment Threading & Worker Refresh Cycle

### Problem

After an adapter is pushed to RunPod via the auto-deploy pipeline, stale workers continue serving old adapter lists — causing **404 errors** when users test newly deployed adapters. The current `autoDeployAdapter` Step 6 writes `status: 'ready'` immediately, before workers restart. This is premature.

**Root cause (from 03-lora-chat-fix-spec_v2.md):** Workers do not pick up new LoRA modules until they restart **after** the `LORA_MODULES` environment variable is updated. Pre-warming workers before the adapter name is known is pointless — the warm worker needs to restart anyway.

### Decision: Worker Refresh Cycle After LORA_MODULES Update

The deployment pipeline is extended with a worker refresh cycle that ensures adapters are actually loadable before marking them ready.

**Pre-warming dropped:** James confirmed workers must restart after `LORA_MODULES` update. Pre-warming does no good. No `inference_endpoint_id`/`inference_endpoint_url` columns on `workbases` — per-customer endpoints deferred.

### Implementation: 3 Changes to Auto-Deploy Pipeline + 1 New Inngest Function

#### Change A: New Inngest Event — `pipeline/adapter.deployed`

Add to `InngestEvents` type in `src/inngest/client.ts`:

```typescript
'pipeline/adapter.deployed': {
  data: {
    jobId: string;
    userId: string;
    adapterName: string;       // e.g. "adapter-bae71569"
    endpointId: string;        // e.g. "780tauhj7c126b"
    originalWorkersMin: number;
    originalWorkersMax: number;
  };
};
```

#### Change B: Auto-Deploy Emits Event + Step 6 Status → `deploying`

In `src/inngest/functions/auto-deploy-adapter.ts`:

**Step 4 return value updated** to include `originalWorkersMin` and `originalWorkersMax` from the fetched endpoint state.

**New Step 4b (`emit-worker-refresh`)** inserted after Step 4:

```typescript
await step.run('emit-worker-refresh', async () => {
  if (loraModulesResult?.noChange) {
    console.log('[AutoDeployAdapter] LORA_MODULES unchanged — skipping worker refresh');
    return { skipped: true };
  }
  await inngest.send({
    name: 'pipeline/adapter.deployed',
    data: {
      jobId, userId, adapterName,
      endpointId: RUNPOD_INFERENCE_ENDPOINT_ID,
      originalWorkersMin: loraModulesResult.originalWorkersMin,
      originalWorkersMax: loraModulesResult.originalWorkersMax,
    },
  });
  return { emitted: true };
});
```

**Step 6 (`update-inference-endpoints-db`) status changed** from `'ready'` to `'deploying'`:

```typescript
// Both INSERT and UPDATE paths:
status: 'deploying',  // was 'ready'
ready_at: null,        // was now
```

This prevents the UI from showing the adapter as ready before workers restart. The `EndpointStatusBanner` shows "deploying" and the Run Test button is disabled during this window.

#### Change C: New Inngest Function — `refreshInferenceWorkers`

**File:** `src/inngest/functions/refresh-inference-workers.ts`

```
Function ID: refresh-inference-workers
Trigger: pipeline/adapter.deployed
Concurrency: { limit: 1 }
Retries: 1
```

**Step sequence:**

| Step | Action | Timeout | Fatal? |
|---|---|---|---|
| `scale-down-workers` | GraphQL `saveEndpoint` with `workersMin: 0` | 30s | Yes |
| `wait-for-workers-terminated` | Poll `GET /health` every 5s until all worker counts = 0 | 90s | Yes (with cleanup) |
| `scale-up-workers` | GraphQL `saveEndpoint` with `workersMin: originalWorkersMin` + `MAX_LORAS: 5` (see D12) | 30s | Yes |
| `wait-for-workers-ready` | Poll `GET /health` every 5s until `workers.ready > 0 || workers.idle > 0` | 180s | Yes (with warning) |
| `verify-adapter-available` | Send lightweight inference request using adapter name | 60s | No (non-fatal) |
| `mark-endpoints-ready` | UPDATE `pipeline_inference_endpoints` SET `status = 'ready'`, `ready_at = NOW()` | 10s | No (non-fatal) |

**Cleanup on failure:** If any step fails before scale-up, restore `workersMin` to original value. Never leave the endpoint with 0 workers permanently.

**Adapter verification:** Send minimal request to `POST ${INFERENCE_API_URL}/runsync` with the adapter name. If 404, log warning but don't fail — workers have the adapter in LORA_MODULES and will load it on next request.

**Shared endpoint consideration:** The same RunPod endpoint serves both Pipeline adapter testing and RAG LoRA queries. Cycling workers affects ALL users. `concurrency: { limit: 1 }` serializes all refresh operations.

**Environment variables used** (same as auto-deploy — no new env vars):
- `RUNPOD_GRAPHQL_API_KEY` — for `saveEndpoint` mutation
- `GPU_CLUSTER_API_KEY` / `RUNPOD_API_KEY` — for `/health` polling
- `INFERENCE_API_URL` — base URL

#### Change D: Register Function

In `src/inngest/functions/index.ts`, add `refreshInferenceWorkers` to the functions array and exports.

### Deployment Status Flow (End-to-End)

```
Training completes
  → Supabase webhook fires
  → autoDeployAdapter runs:
      Step 1: Fetch job
      Step 2-3: Download adapter → push to HuggingFace
      Step 4: Update LORA_MODULES on RunPod
      Step 4b: Emit pipeline/adapter.deployed event
      Step 5: Attempt vLLM hot-reload (non-fatal)
      Step 6: Write status = 'deploying' to DB  ← CHANGED from 'ready'
      Step 7: Write hf_adapter_path to job

  → refreshInferenceWorkers runs (triggered by event):
      Step 1: Scale down workers (workersMin=0)
      Step 2: Wait for all workers terminated
      Step 3: Scale up workers (workersMin=original, MAX_LORAS=5)
      Step 4: Wait for workers ready
      Step 5: Verify adapter available (non-fatal)
      Step 6: Mark endpoints status = 'ready'  ← NOW safe to mark ready

  → UI: EndpointStatusBanner flips to green "ready"
  → User: Can test adapter without 404
```

### Warnings (from 03-spec)

1. **Do NOT use SAOL for application DB operations** — Inngest functions use `createServerSupabaseAdminClient()`
2. **Do NOT change RunPod GraphQL URL or auth pattern** — uses `?api_key=` query param, not Bearer
3. **Do NOT set `workersMin` to a hardcoded value** — always use `originalWorkersMin` from event data
4. **Do NOT make adapter verification fatal** — adapter may take seconds to load after restart
5. **Do NOT remove Step 5 (vllm-hot-reload) from auto-deploy** — keep as future-proofing
6. **Do NOT run `saveEndpoint` without ALL original endpoint fields** — RunPod replaces entire config
7. **Do NOT increase `workersMax` beyond 2 this iteration**
8. **Do NOT address overlapping adapter deployments** — `concurrency: { limit: 1 }` on both functions serializes operations

---

## 14. Decision D12: MAX_LORAS Increase & Research Deliverables

### MAX_LORAS Increase to 5

During the worker refresh cycle's `scale-up-workers` step (D11), update the `MAX_LORAS` env var from `1` to `5`. With `MAX_LORAS=5`, up to 5 different adapters can be loaded simultaneously per worker — supporting multiple Work Bases with distinct adapters.

```typescript
const updatedEnv = currentEnv.map(e =>
  e.key === 'MAX_LORAS' ? { key: 'MAX_LORAS', value: '5' } : e
);
if (!updatedEnv.some(e => e.key === 'MAX_LORAS')) {
  updatedEnv.push({ key: 'MAX_LORAS', value: '5' });
}
```

### Research Deliverable: RunPod Programmatic Endpoint Creation

**Scope:** Documentation only — do NOT create endpoints programmatically this iteration.

The test script (`scripts/test-worker-refresh.ts`) should include a research section that:
1. Queries the existing endpoint `780tauhj7c126b` for its full configuration (template, GPU IDs, env vars)
2. Logs the template ID and all settings
3. Documents the `createEndpoint` GraphQL mutation signature
4. Does NOT actually call `createEndpoint`

This feeds into the future scaling plan for per-customer isolated endpoints (when >10 customers or tenant isolation is needed).

### Test Script: `scripts/test-worker-refresh.ts`

A standalone script to validate the worker refresh cycle outside of Inngest:

1. Fetch current endpoint state via RunPod GraphQL
2. Log current worker count from `/health`
3. Set `workersMin: 0` via `saveEndpoint`
4. Poll `/health` every 3s until all workers terminated
5. Set `workersMin` back to original
6. Poll until workers reach `ready` or `idle`
7. Log final state
8. Log endpoint creation research output

**Run:** `npx tsx scripts/test-worker-refresh.ts`

---

## 15. Revised Ontology & Page Map

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
    │       ├── Uses active adapter (auto-resolved from Work Base) + optional RAG
    │       ├── A/B testing built-in (when adapter is live)
    │       ├── Mode selector (LoRA only / RAG only / Both)
    │       ├── 4 availability states with contextual banners
    │       └── Adapter status: shows "deploying" during worker refresh (D11)
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

### Key Changes from v2 Ontology

1. Behavior Chat now shows "deploying" status during worker refresh cycle (D11)
2. Adapter auto-resolved from Work Base (no manual dropdown) — supersedes 03-spec's manual adapter selector

---

## 16. Revised Navigation

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

7 clickable pages + 1 overview = 8 pages total.

---

## 17. Detailed Page Specifications

### Page 0: Home (`/home`)

**Purpose:** Entry point. Get users to their Work Base or through QuickStart.

**Layout:**
- Header: "BrightHub" + user info + sign out
- **QuickStart tile** (shown if user has 0 Work Bases):
  - "Chat with your documents in minutes"
  - CTA: "Get Started" → QuickStart wizard
- **Your Work Bases** (card grid):
  - Each card: Name, Fine Tuning status pill, Fact Training status pill, last activity
  - Click → enters Work Base Overview
- **CTA:** "+ New Work Base"

---

### Page 1: Work Base Overview (`/workbase/[id]`)

**Purpose:** One-glance orientation + next best action.

**Layout:**
- **Conditional QuickStart** (if 0 docs AND no conversations)
- **Fine Tuning card:**
  - Stepper: `Conversations → Launch Tuning`
  - Adapter status: None / Training / Deploying (D11) / Live
  - CTA: "Continue" (routes to the incomplete step)
- **Fact Training card:**
  - Documents: X uploaded, Y ready
  - CTA: "Upload Document" or "Open Chat"
- **Behavior Chat shortcut** (if adapter live OR docs ready)

---

### Page 2: Conversations (`/workbase/[id]/fine-tuning/conversations`)

**Purpose:** Create, review, select, and aggregate conversations into Training Sets.

**Layout — Section A: Conversation Library (primary)**
- **Stepper** (top): `1 Conversations ← current → 2 Launch Tuning`
- **Top controls:** "New Conversation" (drawer/modal), Search bar
- **Filters:** Status (Draft / Ready / In Training Set), Tier, Quality Score
- **Table:** ConversationTable with checkbox column, Training Set column, "View Content" button
- **Bulk action bar:** "Build Training Set" (primary), "Retry Failed Enrichments" (for auto-enrichment failures)

**Layout — Section B: Training Sets (secondary)**
- List/table with name, conversation count, status, "Active" badge
- Actions: "Use for Launch Tuning", "View JSON", "Download JSONL", "View Details"

**Replaces:** Conversations + Training Files + Datasets + Data Shaping — **four pages become one.**

---

### Page 2b: Conversation Detail (`/workbase/[id]/fine-tuning/conversations/[convId]`)

**Purpose:** View-only conversation content. Builds trust.

**Layout:**
- Back button, header with status badge, context bar
- **Conversation thread:** Chat-style bubbles, turn numbers, emotional state pills
- **Your Feedback section** (D9):
  - Subtext: "Share your thoughts on this conversation..."
  - Multi-line textarea, "Add Feedback" button
  - Comment list (reverse-chronological, with delete)
- **Footer:** "View Raw JSON" accordion
- **No edit controls.**

---

### Page 3: Launch Tuning (`/workbase/[id]/fine-tuning/launch`)

**Purpose:** Configure training parameters → train → deploy. One page for the entire launch pipeline.

**Layout:**
- **Stepper:** `1 Conversations → 2 Launch Tuning ← current`
- **Banner:** Adapter status: `Not launched | Training (X%) | Deploying (D11) | Live`

**Section A: Training Input** — Training Set card, conversation count, avg quality, "Change Training Set" dropdown

**Section B: Training Settings** — 3 lay-person sliders + Job Name

**Section C: Cost & Launch** — Cost estimate, "Train & Publish" CTA with inline progress:
1. Training adapter... (progress %)
2. Storing on HuggingFace...
3. Updating endpoint...
4. **Refreshing workers... (D11 — new step visible to user)**
5. "Adapter is Live!" + CTA "Open Behavior Chat"

**Section D: Adapter History** — Past launches with "Set Active" rollback

**Replaces:** Pipeline Configure + Pipeline Jobs + Pipeline Job Detail + Pipeline Results — **four pages become one.**

---

### Page 4: Behavior Chat (`/workbase/[id]/fine-tuning/chat`)

**Purpose:** Chat with trained AI, optionally grounded in documents.

**Layout:**
- **Availability banner** (D4 — 4 states)
- **Deploying banner** (D11 — shown when `pipeline_inference_endpoints.status = 'deploying'`):
  - "Your adapter is being deployed. Workers are restarting — this usually takes 2-3 minutes."
  - Chat disabled for LoRA modes; RAG-only mode still available
- **Mode selector** (if both LoRA and RAG available): Behavior Only / Documents Only / Both
- **Chat UI:** MultiTurnChat with A/B testing, no manual adapter dropdown (auto-resolved from Work Base)

**State logic:**
```
active_adapter = workbase.active_adapter_job_id
adapter_ready = pipeline_inference_endpoints.status === 'ready' (for this adapter)
docs_ready = workbase.document_count > 0 AND at least 1 doc with status 'ready'

if (!active_adapter && !docs_ready) → Empty state
if (!active_adapter && docs_ready)  → RAG-only mode
if (active_adapter && !adapter_ready) → Deploying state (RAG available, LoRA disabled)
if (active_adapter && adapter_ready && !docs_ready) → LoRA-only mode
if (active_adapter && adapter_ready && docs_ready) → Full mode
```

---

### Page 5: Documents (`/workbase/[id]/fact-training/documents`)

**Purpose:** Upload and manage documents for this Work Base.

**Layout:**
- Upload area (drag-drop), document list with status pipeline, contextual CTAs
- **Replaces:** RAG page KB selection + document management. KB selection eliminated.

---

### Page 6: Document Detail (`/workbase/[id]/fact-training/documents/[docId]`)

Preserved from current `/rag/[id]` with tabs (Detail, Expert Q&A, Chat, Diagnostic, Quality). Route changes only.

---

### Page 7: Fact Training Chat (`/workbase/[id]/fact-training/chat`)

Chat with all documents in Work Base. Document filter panel, RAGChat component, citations.

---

### Page 8: Quality (`/workbase/[id]/fact-training/quality`)

Quality Dashboard (5 metrics) + golden-set regression testing. Preserved from current.

---

### Page 9: Settings (`/workbase/[id]/settings`)

Name (editable), Description (editable), Endpoint/adapter info (read-only), Archive Work Base.

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
│       │   ├── conversations/[convId]/page.tsx  # NEW — Detail + Feedback
│       │   ├── launch/page.tsx
│       │   └── chat/page.tsx
│       ├── fact-training/
│       │   ├── documents/page.tsx
│       │   ├── documents/[docId]/page.tsx
│       │   ├── chat/page.tsx
│       │   └── quality/page.tsx
│       └── settings/page.tsx
├── api/
│   ├── workbases/route.ts           # NEW — CRUD
│   ├── workbase/[id]/
│   │   └── training-sets/route.ts   # NEW — aggregation
│   ├── conversations/[id]/
│   │   └── comments/route.ts        # NEW — feedback CRUD
│   └── ... (existing API routes preserved)
```

### New Inngest Functions

| Function | File | Trigger | Purpose |
|---|---|---|---|
| `autoEnrichConversation` | `auto-enrich-conversation.ts` | `conversation/generation.completed` | Auto-enrich after generation (D8) |
| `refreshInferenceWorkers` | `refresh-inference-workers.ts` | `pipeline/adapter.deployed` | Worker refresh cycle after adapter deploy (D11) |

### Modified Inngest Functions

| Function | Change |
|---|---|
| `autoDeployAdapter` | Add Step 4b (`emit-worker-refresh`), change Step 6 status to `'deploying'`, return `originalWorkersMin/Max` from Step 4 |

### New Inngest Event Types

| Event | Data | Emitted By | Handled By |
|---|---|---|---|
| `conversation/generation.completed` | `conversationId, userId, batchJobId` | Batch processing flow | `autoEnrichConversation` |
| `pipeline/adapter.deployed` | `jobId, userId, adapterName, endpointId, originalWorkersMin, originalWorkersMax` | `autoDeployAdapter` Step 4b | `refreshInferenceWorkers` |

### Key Component Reuse

| Existing Component | Used In (New) | Changes Needed |
|---|---|---|
| `ConversationTable` | Conversations page | Add checkbox column, Training Set column |
| `ConversationDetailModal` | Conversations page | None |
| `TrainingParameterSlider` | Launch Tuning page | None |
| `CostEstimateCard` | Launch Tuning page | None |
| `MultiTurnChat` | Behavior Chat page | Accept workbaseId, auto-resolve adapter from Work Base |
| `DualResponsePanel` | Behavior Chat page | None |
| `RAGChat` | Fact Training Chat, Document Detail | Accept workbaseId, auto-resolve adapter from Work Base |
| `DocumentUploader` | Documents page | Accept workbaseId |
| `DocumentList` | Documents page | Accept workbaseId |
| `ExpertQAPanel` | Document Detail | None |
| `QualityDashboard` | Quality page | None |
| `ModeSelector` | Behavior Chat | Add disabled states + "deploying" state |
| `EndpointStatusBanner` | Launch Tuning, Behavior Chat | Show `deploying` → `ready` transition (D11) |

---

## 19. Implementation Sequence

### Phase 0: Pre-work (1 day)
- [ ] **D10: Fix modal backgrounds** — Update `dialog.tsx` and `alert-dialog.tsx` primitives (2 files, all 15 modals inherit)
- [ ] **D11: Worker refresh test script** — Create `scripts/test-worker-refresh.ts`, validate 0→wait→restore cycle + RunPod endpoint creation research (D12)
- [ ] Clear all test data from database
- [ ] Rename user-facing labels in current codebase
- [ ] Plan the database migration

### Phase 1: Database + Work Base Foundation + Deployment Pipeline (3-4 days)
- [ ] Create `workbases` table with SAOL (Identity Spine compliant)
- [ ] Create `conversation_comments` table with full Identity Spine (D9)
- [ ] Add `workbase_id` to `conversations`, `training_files`, `pipeline_training_jobs`
- [ ] Create performance indexes on all 3 new `workbase_id` FK columns
- [ ] Rename `knowledge_base_id` → `workbase_id` on 5 RAG tables
- [ ] Update 4 RPC functions
- [ ] Drop `rag_knowledge_bases` table
- [ ] Create API routes: `POST/GET /api/workbases` (with `requireAuth()`)
- [ ] Create API routes for `conversation_comments` (D9)
- [ ] Create Work Base CRUD hooks
- [ ] **D11: Add `pipeline/adapter.deployed` event type** to Inngest client
- [ ] **D11: Modify `autoDeployAdapter`** — add Step 4b, change Step 6 to `'deploying'`
- [ ] **D11: Create `refreshInferenceWorkers` Inngest function** — full worker refresh cycle
- [ ] **D11: Register `refreshInferenceWorkers`** in `index.ts`
- [ ] **D12: MAX_LORAS=5** — integrated into `refreshInferenceWorkers` scale-up step

### Phase 2: Route Structure + Layout (2-3 days)
- [ ] Create `/home` page (Work Base list + QuickStart)
- [ ] Create `/workbase/[id]/layout.tsx` (sidebar navigation)
- [ ] Create `/workbase/[id]/page.tsx` (Overview)
- [ ] Create Settings page
- [ ] Wire up Work Base switcher in sidebar header

### Phase 3: Fine Tuning Pages (3-4 days)
- [ ] Build Conversations page with dual sections (Library + Training Sets)
- [ ] **D8: Implement auto-enrichment** — create Inngest function, fire event after generation, remove "Enrich All" button
- [ ] Build "Build Training Set" flow (aggregation on Conversations page)
- [ ] Build Launch Tuning page (consolidated configure + monitor + results + deploying status)
- [ ] Build Behavior Chat page (with availability states + mode selector + deploying banner)
- [ ] Build Conversation Detail page (view-only + feedback section)
- [ ] Update MultiTurnChat to accept workbaseId, auto-resolve adapter
- [ ] Update RAGChat to accept workbaseId, auto-resolve adapter (replaces 03-spec Changes 14-15)
- [ ] Wire active adapter logic + deploying state

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
- [ ] **D11: End-to-end deployment test** — train adapter, verify deploying→ready transition, confirm no 404s
- [ ] Remove old routes (or hide behind feature flag)
- [ ] Verify all Identity Spine compliance (run E04 test suite against new tables)

### Total Estimated Scope: 12-17 days of development

---

## 20. Appendix A: First Customer Journey

*Extracted from 03-lora-chat-fix-spec_v2.md Section 8 — strategic context for prioritization.*

### Aha Moment

> A customer uploads their domain document, asks a question about it in RAG Chat, and sees a knowledgeable answer grounded in their own data — all within 15 minutes of signing up.

```
Sign Up → Create Work Base → Upload Document → [wait ~2-5 min] →
RAG Chat → "Holy shit, it knows my document" → AHA MOMENT
```

### Minimum Paid Product (What Must Work Before Charging)

**Tier 1: Launch Blockers**

| Feature | Status |
|---|---|
| Sign up / Sign in | Works |
| Create Work Base (replaces KB) | Needs implementation (this spec) |
| Upload documents | Works |
| RAG Chat (RAG-only) | Works — this IS the Aha Moment |
| Train LoRA adapter | Works — needs worker refresh (D11) to stop 404s |
| RAG+LoRA Chat | Works — adapter auto-resolved from Work Base (D4) |
| A/B Testing | Works — needs worker refresh (D11) |
| **Payment** | **DOES NOT EXIST — LAUNCH BLOCKER** |
| **Usage visibility** | **DOES NOT EXIST** |

**Tier 2: First-Month Features**

| Feature | Priority |
|---|---|
| Onboarding wizard (QuickStart) | High |
| Work Base edit/delete | High |
| Template gallery | Medium |
| Persistent navigation (sidebar) | Medium — addressed in this spec (D7) |
| Multi-turn RAG conversations | Medium |
| Usage quotas | Medium |

**Tier 3: Quarter 1**
- Per-customer isolated endpoints
- Custom model selection
- Batch RAG evaluation
- Export/download adapters
- Team/org features

### Recommended Pricing Model

| Component | Price |
|---|---|
| Platform Access | $99/month |
| LoRA Training | ~$5–15/job (RunPod compute, 2x markup) |
| Inference Compute | ~$0.10/min (RunPod serverless, 2x markup) |
| RAG-only Chat | Included in platform fee |

### Critical Path Before First Paying Customer

```
1. This spec (workbase + deployment pipeline)  ← YOU ARE HERE
2. Stripe integration (subscription + metering) ← LAUNCH BLOCKER
3. Onboarding flow (QuickStart wizard)          ← HIGH PRIORITY
4. Usage dashboard page                         ← Required for billing
5. Work Base edit/rename                        ← Table-stakes UX
```

---

## 21. Appendix B: 03-Spec Reconciliation

This section maps every item from `03-lora-chat-fix-spec_v2.md` to its status in this document.

| 03-Spec Item | Description | Status in v3 |
|---|---|---|
| **Change 1** | New Inngest event `pipeline/adapter.deployed` | **Integrated into D11** — same event, same data shape |
| **Change 2** | Auto-deploy emits event after Step 4 | **Integrated into D11** — Step 4b `emit-worker-refresh` |
| **Change 3** | Step 6 status → `deploying` | **Integrated into D11** — both INSERT and UPDATE paths changed |
| **Change 4** | New `refreshInferenceWorkers` function | **Integrated into D11** — 6-step worker refresh cycle |
| **Change 5** | Register new function | **Integrated into D11** — added to `index.ts` |
| **Change 6** | Increase MAX_LORAS to 5 | **Integrated into D12** — applied during scale-up step |
| **Change 7** | Test script `test-worker-refresh.ts` | **Integrated into D12** — Phase 0 deliverable |
| **Change 8** | Research: RunPod programmatic endpoints | **Integrated into D12** — documentation section in test script |
| **Change 9** | Document INFERENCE_MODE | **Already implemented** (partially) — documentation block exists in `inference-service.ts` |
| **Change 10** | Migration: `adapter_job_id` on `rag_knowledge_bases` | **Superseded by D3** — `active_adapter_job_id` on `workbases` table. `rag_knowledge_bases` is being dropped (D2). |
| **Change 11** | Update `RAGKnowledgeBase` TypeScript interface | **Superseded by D2** — `RAGKnowledgeBase` type eliminated, replaced by Work Base type |
| **Change 12** | KB creation accepts `adapterJobId` | **Superseded by D3** — Work Base creation does not need an adapter dropdown; adapter is bound after training via `active_adapter_job_id` |
| **Change 13** | Bind/unbind adapter API route | **Superseded by D3** — adapter binding is a simple UPDATE on `workbases.active_adapter_job_id`, done automatically after training or manually via Settings |
| **Change 14** | RAG Chat auto-selects KB's bound adapter | **Superseded by D4/D6** — Behavior Chat auto-resolves adapter from Work Base's `active_adapter_job_id`. No manual dropdown. |
| **Change 15** | RAG query API resolves adapter from KB binding | **Superseded by D4** — query API resolves adapter from Work Base's `active_adapter_job_id` when `modelJobId` not provided |
| **Section 7** | Warnings (DO NOT list) | **Integrated into D11** — all 8 warnings preserved |
| **Section 8** | First Customer Journey | **Integrated into Appendix A** — key strategic recommendations preserved |

**Summary:** Changes 1-8 are integrated (worker refresh + MAX_LORAS + research). Change 9 is already done. Changes 10-15 are superseded by the workbase architecture. Sections 7-8 are preserved.

---

*End of UX Decisions & Path Forward v3*
