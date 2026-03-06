# UX Discovery Report: Bright Run Platform Internal Review

**Version:** 1.0 | **Date:** 2026-02-26
**Role:** Senior UX Designer (AI-native SaaS)
**Scope:** Design discovery only — no specification

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis (with Code Evidence)](#2-current-state-analysis)
3. [Three Biggest Barriers for Non-Technical Users](#3-three-biggest-barriers)
4. [Problem-by-Problem Findings](#4-problem-by-problem-findings)
5. [Proposed Ontology & Page Map](#5-proposed-ontology--page-map)
6. [Detailed Page-by-Page Recommendations](#6-detailed-page-by-page-recommendations)
7. [Improvement Actions (Ranked)](#7-improvement-actions-ranked)
8. [Open Questions](#8-open-questions)

---

## 1. Executive Summary

The Bright Run platform currently functions as a **developer-facing dashboard** organized by technical modules (Conversations, Datasets, Training Files, Pipeline, RAG Frontier, Batch Jobs). While all core functionality works, the current UX has three critical problems for a launch to non-technical users:

1. **The navigation exposes technical plumbing, not user goals.** Six top-level module cards force users to understand the difference between "Conversations," "Datasets," "Training Files," and "Pipeline" — all of which serve the single goal of fine-tuning an AI.

2. **There is no concept of "workspace" or container.** Everything is flat and global. A user cannot create separate training projects, and the LoRA pipeline is tied to individual job IDs rather than a persistent workspace.

3. **Time-to-value is extremely slow.** A new user must navigate 4+ pages and understand 3+ concepts before getting any result. The quickest A-ha moment (RAG chat) requires creating a knowledge base, uploading a document, waiting for processing, and then finding the chat button.

The external UX conversation (from ChatGPT) proposed a "Work Base" ontology that solves all three problems. This report integrates that proposal with the **actual codebase** and recommends a concrete, minimally-disruptive path to a launch-ready UX.

---

## 2. Current State Analysis

### 2.1 Current Navigation Structure

**Evidence:** `src/app/(dashboard)/dashboard/page.tsx:65-72`

The dashboard presents 6 equal-weight module cards:

```
Dashboard (/)
├── Conversations        → /conversations
├── Datasets             → /datasets
├── Training Files       → /training-files
├── Pipeline             → /pipeline/jobs
├── RAG Frontier         → /rag
└── Batch Jobs           → /batch-jobs
```

**Problem:** All 6 are presented at the same level. A non-technical user cannot tell which to click first, which are prerequisites for others, or what the relationship is between them.

### 2.2 Current LoRA Training Flow (Fine Tuning)

The LoRA training flow currently spans **4 separate top-level modules** with no stepper or guided flow:

```
Step 1: /conversations        → Generate individual conversations (with enrichment)
Step 2: /training-files       → Aggregate conversations into JSON/JSONL files
Step 3: /datasets             → Import JSONL into a "dataset" object
Step 4: /pipeline/configure   → Select dataset, configure hyperparameters, launch training
Step 5: /pipeline/jobs/[id]   → Monitor training job
Step 6: /pipeline/jobs/[id]/results  → View evaluation results
Step 7: /pipeline/jobs/[id]/test     → A/B test the adapter
Step 8: /pipeline/jobs/[id]/chat     → Multi-turn chat testing
```

**Evidence (fragmentation across pages):**

- Conversations page (`src/app/(dashboard)/conversations/page.tsx:96-98`): Title "Conversations" with description "Manage generated training conversations with enrichment pipeline"
- Training Files page (`src/app/(dashboard)/training-files/page.tsx:107`): Title "LoRA Training JSON Files" — uses the word "LoRA" directly
- Datasets page (`src/app/(dashboard)/datasets/page.tsx:83-85`): Title "Datasets" with "Manage your training datasets"
- Pipeline Configure (`src/app/(dashboard)/pipeline/configure/page.tsx:145`): Title "Configure Training"

**Problem:** Steps 1-3 are disconnected from Steps 4-8. A user must leave one module, navigate back to the dashboard, and enter another module to proceed. There are button links between some (e.g., "Training Files" button on the Conversations page at line 112, and a "Start Training" action on datasets), but these are scattered affordances, not a guided flow.

### 2.3 Current RAG Flow (Fact Training)

The RAG flow is more contained but still uses technical terminology:

```
Step 1: /rag                  → Select/create "Knowledge Base"
Step 2: /rag (selected KB)    → Upload documents (drag-drop)
Step 3: /rag/[id]             → View document detail (tabs: Detail, Expert Q&A, Chat, Diagnostic, Quality)
Step 4: /rag (chat mode)      → Chat with all documents in KB
Step 5: /rag/test             → Golden-set regression testing
```

**Evidence:** `src/app/(dashboard)/rag/page.tsx:26-27`: Title "RAG Frontier" — exposed to users.

**What works well:**
- The RAG page manages state transitions (KB selection → document view → chat) within a single page using React state (`src/app/(dashboard)/rag/page.tsx:13-17`)
- Document upload is contextual (you're already inside a KB)
- Chat is one click from the document list ("Chat with all" button)

**What doesn't work:**
- "RAG Frontier" and "Knowledge Base" are technical terms
- The page title "RAG Frontier" is meaningless to a business owner
- The Expert Q&A workflow is buried in a tab on the document detail page

### 2.4 No Workspace/Container Concept

**Evidence:** There is **no** `workspace` table in the database schema (see document overview lines 173-217). There is no workspace ID on any table. There is no workspace selector in the UI.

The closest analog is:
- `rag_knowledge_bases` — acts as a container for RAG documents
- `pipeline_training_jobs` — acts as an individual training run, but has no parent container

**Problem:** Without workspaces, there is no way to group a set of conversations + their resulting adapter + a set of documents + their RAG index into a single coherent project. Everything is a flat, global list.

### 2.5 User-Facing Labels Audit

| Current Label | Location | User Comprehension Risk |
|---|---|---|
| "RAG Frontier" | Dashboard card, RAG page header | **HIGH** — "RAG" is a technical term |
| "LoRA Training JSON Files" | Training Files page header | **HIGH** — "LoRA" and "JSONL" are developer terms |
| "Pipeline" | Dashboard card | **HIGH** — meaningless to non-technical users |
| "Datasets" | Dashboard card | **MEDIUM** — vague, unclear relationship to Conversations |
| "Training Files" | Dashboard card | **MEDIUM** — sounds similar to "Datasets" |
| "Batch Jobs" | Dashboard card | **MEDIUM** — operational, not goal-oriented |
| "Conversations" | Dashboard card | **LOW** — intuitive but relationship to training unclear |
| "Knowledge Base" | RAG page | **MEDIUM** — acceptable but "Knowledge" alone is better |
| "Configure Training" | Pipeline configure page | **LOW** — clear enough |
| "Multi-Turn Chat Testing" | Chat page header | **MEDIUM** — "multi-turn" is jargon |

### 2.6 Layout & Navigation Patterns

**Evidence:** `src/app/(dashboard)/layout.tsx` — The dashboard layout is minimal: just auth protection + a Suspense wrapper. There is **no persistent sidebar**, **no global navigation**, and **no breadcrumb system** at the layout level.

Each page independently includes:
- A back button (RAG pages: `src/app/(dashboard)/rag/page.tsx:28-31`)
- Breadcrumb-like headers (Pipeline pages reference "Dashboard")
- No consistent left-nav pattern

**Problem:** Users lose context when navigating between modules. There is no persistent "you are here" indicator.

---

## 3. Three Biggest Barriers for Non-Technical Users

### Barrier 1: "What do I click first?" — No guided onboarding or goal-oriented navigation

**Root Cause:** The dashboard presents 6 equal-weight technical module cards with no indication of sequence, priority, or relationship.

**Evidence:** `src/app/(dashboard)/dashboard/page.tsx:65-72` — All 6 `ModuleCard` components have identical styling and visual weight. There is no "Start here" CTA, no stepper, no empty-state guidance.

**Impact:** A first-time user arriving at the dashboard will be paralyzed by choice. They don't know whether to start with "Conversations" or "RAG Frontier" or "Pipeline." Most will bounce.

**Recommended Solution:** Replace the flat 6-card dashboard with:
1. A **QuickStart tile** at the top that guides to the fastest A-ha (upload doc → chat), creating a Work Base automatically
2. A **Work Base list** below (like project cards) that users enter to do their work
3. Inside each Work Base: a left sidebar with two clear sections (Fine Tuning + Fact Training) and a guided stepper

**Severity:** High
**Confidence:** High — this is a well-established UX pattern (Notion, Linear, Hubspot all use workspace-first navigation)

---

### Barrier 2: "Why are there 4 different pages for the same thing?" — Fine Tuning flow is fragmented across modules

**Root Cause:** The LoRA training pipeline was built incrementally (Conversations → Training Files → Datasets → Pipeline) and each step became its own top-level module. But from the user's perspective, these are all sub-steps of one goal: "Train my AI."

**Evidence:**
- Conversations page has a "Training Files" button (`conversations/page.tsx:111-119`) — acknowledging users need to go there next
- Datasets page has a "Start Training" action (`datasets/page.tsx:74-75`) — acknowledging the pipeline connection
- Pipeline configure page has a dataset selector (`pipeline/configure/page.tsx:154-168`) — acknowledging datasets are inputs

These cross-links prove the modules are tightly coupled but presented as independent.

**Impact:** A user who generates conversations has to: leave Conversations → go to Training Files → export JSONL → go to Datasets → import the file → go to Pipeline → select the dataset → configure → launch. That's 8+ navigation steps across 4 modules with 3 concepts to understand (training file vs dataset vs pipeline job).

**Recommended Solution:** Collapse Conversations, Training Files/Datasets, and Pipeline into a single "Fine Tuning" section within a Work Base, using a 3-step flow:
1. **Conversations** (create/manage the raw training material)
2. **Data Shaping** (select conversations → auto-generate JSONL — one page, one button)
3. **Launch Tuning** (configure params → train → deploy — one page)
**James' Response**: Where should the step that selects all conversations and combines them into one pre training JSON file live?

The intermediate artifacts (JSON, JSONL, datasets) become "build outputs" visible for QA but not separate navigation items.

**Severity:** High
**Confidence:** High — the transcript's "Tuning Build" concept directly solves this

---

### Barrier 3: "What is RAG Frontier?" — Technical jargon in user-facing labels

**Root Cause:** Features were named during development, not for end users. Terms like "RAG Frontier," "LoRA Training JSON Files," "Pipeline," "Knowledge Base," and "Batch Jobs" assume familiarity with AI/ML concepts.

**Evidence:**
- `dashboard/page.tsx:71`: `<ModuleCard title="RAG Frontier" ... description="Document ingestion and expert Q&A" />`
- `training-files/page.tsx:107`: `<h1>LoRA Training JSON Files</h1>`
- `rag/page.tsx:27`: `<h1>RAG Frontier</h1>`
- `pipeline/jobs/[jobId]/chat/page.tsx:39`: `<h1>Multi-Turn Chat Testing</h1>`

**Impact:** Non-technical users will feel the app "isn't for them." Technical labels create an intimidation barrier that causes churn before users even try the product.

**Recommended Solution:** Rename every user-facing label to goal-oriented, plain English:

| Current | Proposed | Why |
|---|---|---|
| RAG Frontier | Fact Training (or "Knowledge") | Describes what it does |
| Knowledge Base | (removed — Work Base IS the container) | One fewer concept |
| Pipeline | Fine Tuning | Describes what it does |
| Datasets | (absorbed into Data Shaping) | Eliminated as separate concept |
| Training Files | (absorbed into Data Shaping) | Eliminated as separate concept |
| Batch Jobs | (hidden — operational detail) | Not a user goal |
| LoRA Training JSON Files | (not user-facing) | Hidden behind "Data Shaping" |
| Multi-Turn Chat Testing | Behavior Chat | Describes what it does |
| Conversations | Conversations (keep) | Already intuitive |

**Severity:** High
**Confidence:** High — label changes are the highest-impact, lowest-effort improvement

---

## 4. Problem-by-Problem Findings

### Problem 1: No Container/Workspace Concept

**Root cause(s):**
- Database has no `workspaces` table — all entities are global within a user's account
- `rag_knowledge_bases` is the only container-like entity, but it only groups RAG documents
- LoRA training jobs are standalone with no parent grouping
- Evidence: Full page list at `src/app/(dashboard)/` shows flat routing with no workspace parameter

**Contributing factors:**
- The app was built feature-by-feature (conversations first, then pipeline, then RAG) without a unifying container
- Auth context provides `user_id` but no `workspace_id`

**Severity:** High — this is the structural gap that prevents the ontology from working
**Confidence:** High — confirmed by codebase: no workspace table, no workspace ID on any entity

---

### Problem 2: LoRA Flow Requires 4 Separate Module Navigations

**Root cause(s):**
- Conversations, Training Files, Datasets, and Pipeline were built as independent modules
- Each has its own top-level route and its own page component
- Evidence: 4 separate route directories: `/conversations`, `/training-files`, `/datasets`, `/pipeline`
- Evidence: Cross-module links exist but are buttons that navigate away (e.g., `conversations/page.tsx:111-119` "Training Files" button uses `window.location.href`)

**Contributing factors:**
- No state machine or stepper tracks the user's progress across these steps
- The Zustand `pipelineStore` (`stores/pipelineStore.ts`) only tracks pipeline configuration state, not the full workflow state
- No back-navigation from Pipeline to Conversations context

**Severity:** High — users will drop off between steps
**Confidence:** High — confirmed by reading all 4 page files and tracing the navigation flow

---

### Problem 3: RAG "Knowledge Base" Is an Extra Abstraction Layer

**Root cause(s):**
- The RAG flow requires: Create KB → Select KB → Upload Doc → Process → Chat
- In the proposed Work Base model, the Work Base IS the KB — no need for a separate "Knowledge Base" entity
- Evidence: `rag/page.tsx:13-17` manages 4 state variables to track which KB/chat is selected

**Contributing factors:**
- The current KB model supports multiple KBs per user, but the proposed ontology scopes RAG to a Work Base (one KB per Work Base)
- RAG chat mode selector (`components/rag/ModeSelector.tsx`) offers `rag_only | lora_only | rag_and_lora` — the `rag_and_lora` mode implies combining both paths, which is the "Work Chat" concept from the transcript

**Severity:** Medium — the current KB flow works but adds an unnecessary step
**Confidence:** Medium — mapping KB → Work Base is architecturally clean but requires a migration

**James' Response**: Should we have a separate KB for the RAG which lies within the Work Base? I.e. I was thinking there would be a separate RAG page within the Workbase, but not a full fledged KB. Adding another "base" inside the Workbase is just another step, and it implies that we could have more than one RAG base within a Work Base. Is that needed or wise? Is it better to just have it be a normal RAG management page and have there be just one RAG per Work Base.
My original idea was that the Worker Base is the container for both, regardless of which one you want to create first. and then "oh by the way you can create the other one here too and they can interact (RAG + LoRA chat). Research this issue and make the best recommendation. I am not a UX expert. I want you as the Lead UX expert who designs AI first SaaS apps for multi billion dollar companies to help me solve this issue elegantly and with the lowest cognitive load on our users, who are busy small business owners.

---

### Problem 4: Dashboard Has No Empty-State Guidance

**Root cause(s):**
- `dashboard/page.tsx` renders 6 cards unconditionally — no awareness of user progress
- Evidence: Lines 65-72 render all cards regardless of whether the user has created any conversations, documents, or jobs

**Contributing factors:**
- No onboarding wizard or checklist
- No "what to do next" logic based on data state

**Severity:** Medium — first-time users get no guidance
**Confidence:** High — confirmed by reading the page: no conditional rendering based on data

---

### Problem 5: No Persistent Navigation Shell

**Root cause(s):**
- `layout.tsx` at the dashboard level only wraps children in auth protection
- Evidence: `src/app/(dashboard)/layout.tsx` — no sidebar, no top nav, no breadcrumbs at layout level
- Each page independently renders its own header and back buttons

**Contributing factors:**
- Pages use different navigation patterns: some have breadcrumbs, some have back buttons, some have neither
- The RAG page manages sub-navigation via React state (KB → docs → chat) rather than routes

**Severity:** Medium — users lose spatial orientation
**Confidence:** High — confirmed by reading layout.tsx and multiple page files

---

### Problem 6: Technical Terminology Throughout UI

**Root cause(s):**
- Features were named for developer comprehension during build
- Evidence collected in Section 2.5 above (10 instances documented)

**Contributing factors:**
- No UX review or copy editing pass before launch
- RAG-specific terms leak through component names into user-facing text

**Severity:** High — creates intimidation for target audience (SMB owners)
**Confidence:** High — every instance documented with file:line references

---

### Problem 7: Conversation-to-Adapter Path Has 3 Intermediate Artifact Types

**Root cause(s):**
- The current flow produces 3 artifacts: Training File (JSON/JSONL), Dataset (imported JSONL), and Pipeline Job
- Users must understand the relationship between these 3 types
- Evidence: Training Files page shows JSON + JSONL downloads (`training-files/page.tsx:199-206`), Datasets page shows "Import from Training File" (`datasets/page.tsx:96-99`), Pipeline requires a Dataset ID (`pipeline/configure/page.tsx:121-126`)

**Contributing factors:**
- Training Files and Datasets are nearly identical concepts (both are JSONL files with metadata) but are stored in different tables
- The "import" step from Training File → Dataset is a manual user action that could be automated

**Severity:** Medium — adds confusion without adding value for non-technical users
**Confidence:** High — the artifact chain is clearly visible in the code
**James' Response**: Actually there is a step here and potentially a 4th artifact too. Depending on whether you meant "intermediate artifact types" was in between the Conversation artifacts and the Adapter artifact. 
Regardeless, you missed the important step of a individual conversations needing to be collated into a collected JSON file. In a future iteration of the app we will want users to review and approve/edit the conversations. So it is important that those are still visible.
---

### Problem 8: Multi-Turn Chat Is Buried Under Pipeline Job ID

**Root cause(s):**
- Multi-turn chat lives at `/pipeline/jobs/[jobId]/chat` — it's nested under a specific job
- Evidence: `src/app/(dashboard)/pipeline/jobs/[jobId]/chat/page.tsx:21` — route requires `jobId` param
- To access chat, users must: navigate to Pipeline → find their job → click into it → click "Chat"

**Contributing factors:**
- This makes sense architecturally (chat uses the job's adapter), but is poor for users who just want to "talk to their AI"
- The proposed UX puts Multi Turn Chat as a sibling page under Fine Tuning, not nested under a job
**James' Response**: I understand the need for the multi-turn chat to be a higher level entity.  There are few issues with this:
a. We would have to make it clear what is available in that chat (i.e. if neither LoRA or RAG have been implemented then the chat must not be functional and the user must understand why it is not available.)

**Severity:** Medium — the chat (the main user reward) is hard to find
**Confidence:** High — confirmed by route structure

---

## 5. Proposed Ontology & Page Map

Based on the transcript recommendations integrated with the actual codebase:

```
Account
├── Home (QuickStart + Work Base list)
└── Work Bases
   └── Work Base (container — maps to a new `workbases` table)
      ├── Overview (status + next steps + conditional QuickStart)
      ├── Fine Tuning (Behavior)
      │  ├── Conversations (create/manage; add from other Work Bases via shortcuts)
      │  ├── Data Shaping (Tuning Builds: selects conversations → produces JSONL)
      │  ├── Launch Tuning (train adapter + publish; 1 active adapter per Work Base)
      │  └── Behavior Chat (Multi-turn LoRA-only chat with the active adapter)
      ├── Fact Training (Knowledge)
      │  ├── Documents (upload + manage; replaces "Document Upload" + "Knowledge Base" concept)
      │  ├── Processing Status (replaces "The RAG Engine" — transparent pipeline view)
      │  ├── Single Document Chat (chat scoped to one document)
      │  └── All Documents Chat (chat across all docs in Work Base)
      ├── Work Chat (optional later: combined adapter + knowledge chat)
      └── Settings (name, endpoint display, members)
```
**James' Response**: As mentioned in another response: This ontology map does not surface the required step of aggregating conversations into one (non JSON file).  Honestly from our customer, the small business owner  persona's point of view the Data Shaping step should ONLY include the selection of conversations into an aggregate file and then everything between that selction and the Launch Tuning is not needed to be visible to the lay person owner. Even at this stage..the Dev view, its not needed for me to click and point the LoRA JSONL into existence. It's only if it is broken that I need access to them. 
Still for the "Conversation Aggregation" step each Conversation is shown on the Conversations table and within that table we select which ones we want to aggregate. So the aggregation step naturally and by creation step, exists within the Conversation table. Maybe we should eliminate the Data Shaping step altogeher and the flow is simplified to: Conversations Page->Aggregate Conversations **ON** the Conversations page-> Everything up to "creating the adapter" step is automatic. And Giving the adapter a "go forward" button is the Launch Tuning step? Help me make the correct decision here.


### Key Architectural Mappings (Current → Proposed)

| Current Entity | Proposed Entity | Database Impact |
|---|---|---|
| (none) | `workbases` table | **NEW** — needs creation |
| `rag_knowledge_bases` | 1:1 with Work Base | Add `workbase_id` FK, or repurpose the KB as the Work Base |
| `conversations` | Scoped to Work Base | Add `workbase_id` FK |
| `training_files` | Absorbed into "Tuning Build" | Add `workbase_id` FK |
| `pipeline_training_jobs` | Scoped to Work Base | Add `workbase_id` FK |
| `rag_documents` | Scoped to Work Base (via KB) | Already scoped via `knowledge_base_id` |
| Datasets module | Merged into Data Shaping | Dataset creation auto-generated from conversations |

**James' Response**: per my observation above, the keeping the KB separate vs. repurposing it into the Work Base is an open question. I am waiting for feedback from your to determine the best way to handle it.

### Navigation Structure (Left Sidebar Within Work Base)

```
[Work Base Name] ▾ (switcher)
─────────────────
Overview

Fine Tuning
  Conversations
  Data Shaping
  Launch Tuning
  Behavior Chat

Fact Training
  Documents
  Processing Status
  Single Document Chat
  All Documents Chat

Settings
```

---

## 6. Detailed Page-by-Page Recommendations

### Page A: Account Home

**Current:** `src/app/(dashboard)/dashboard/page.tsx` — 6 equal module cards
**Proposed:** QuickStart hero + Work Base grid

**Layout:**
- **QuickStart tile** (top, prominent): "Chat with your docs in minutes" → wizard that creates Work Base + uploads doc + processes → opens chat
- **Your Work Bases** (below): Card grid showing each Work Base with:
  - Name
  - Fine Tuning status (Not started / Live)
  - Fact Training status (X docs / Ready)
  - Last activity
- **CTA:** "New Work Base" button
- **Empty state:** "Create your first Work Base to start training your AI."

**What it replaces:** The 6-card module dashboard. Conversations, Datasets, Training Files, Pipeline, Batch Jobs are no longer top-level items.

---

### Page B: QuickStart Wizard

**Current:** Does not exist
**Proposed:** 4-step wizard (Account-level entry, Work Base anchored)

**Steps:**
1. **Name your Work Base** — text input, suggested name ("My First Work Base")
2. **Upload a document** — drag-drop, supported formats note, "Indexing takes ~20 minutes" disclosure
3. **Processing** — progress panel (Extract → Embed → Store), "You can leave this page" copy
4. **Chat** — routes into the Work Base's Single Document Chat

**Key rule:** The wizard creates a Work Base in step 1 and saves the document to it. The user lands inside a Work Base after the wizard — they're now oriented.

---

### Page 1: Work Base → Overview

**Current:** Does not exist (closest: `/dashboard` module cards)
**Proposed:** One-glance "what's set up / what's next"

**Sections:**
- **Conditional QuickStart tile** (only if 0 docs indexed): "Upload docs and start chatting"
- **Fine Tuning card**: Stepper (Conversations → Data Shaping → Launch Tuning), adapter status (None/Live), "Continue" CTA
- **Fact Training card**: Doc count, index status, "Upload Document" or "Open Chat" CTA
- **Behavior Chat shortcut** (if adapter is Live): "Chat with your trained AI"

---

### Page 2: Fine Tuning → Conversations

**Current:** `src/app/(dashboard)/conversations/page.tsx` — flat table with filters
**Proposed:** Same data, but scoped to Work Base + Visibility controls

**Changes from current:**
- Add scope: conversations in this Work Base (default view) vs "Added from other Work Bases" (shortcuts)
- Add stepper at top: `1 Conversations → 2 Data Shaping → 3 Launch Tuning`
- Add "New Conversation" and "Add from other Work Bases..." buttons
- Add Visibility control on create/edit: "Only this Work Base" (default) vs "Reusable in other Work Bases"
- Remove "Failed Generations" and "Bulk Generator" buttons from the main view (move to a dropdown or Settings)
- Remove "Training Files" button — this step is replaced by Data Shaping

**Preserved from current:**
- The ConversationTable component with filters (status, tier, quality)
- Pagination
- ConversationDetailModal
- Enrichment pipeline workflow

---

### Page 3: Fine Tuning → Data Shaping

**Current:** Split across `/training-files` and `/datasets`
**Proposed:** Single page that does both steps

**Layout:**
- **Stepper:** Conversations → **Data Shaping** → Launch Tuning
- **Section A: Create a Tuning Build**
  - Multi-select conversations from this Work Base
  - Optional shaping parameters (if any)
  - CTA: "Generate Build" (auto-creates JSON + JSONL)
- **Section B: Tuning Builds list** (Work Base-scoped)
  - Each row: Build name (auto-timestamped), conversation count, status, outputs (JSON/JSONL view/download)
  - Action: "Use for Launch Tuning" (sets as current input)
  - Action: "View run log"
  - No "Reusable" toggle — builds are operational artifacts, not shareable resources
- **Footer:** Back to Conversations / Continue to Launch Tuning

**What this replaces:** The entire Training Files page + the Datasets page + the "Import from Training File" flow. These 3 pages become 1 section on 1 page.
**James' Response**: I see what you did here. You moved the conversations aggregation to the Data Shaping page. But is it redundant to have a conversation listing on two pages. One does nothing and the other only aggregates conversations. I guess the Conversations page needs to be preserved for the next stage where they can be read and improved by a human. And then the Data Shaping page can also allow aggregating conversations that were "shared" by other Work Bases, so it does in fact have a value add. Still I don't want the user to see two identical "conversation" listing pages which could confuse them as to which one is canonical. The conversation one should show and implicate that it will be designed soon for individual conversations user editing and evaluation while the data shaping one should be similar to the current Conversation table with perhaps some more relevant data for the aggregation step (e.g. can each conversation row show which aggregations the conversation is currently used in? This just an idea. What are some better ones?).
---

### Page 4: Fine Tuning → Launch Tuning

**Current:** `src/app/(dashboard)/pipeline/configure/page.tsx` + `pipeline/jobs/[jobId]/page.tsx` + `pipeline/jobs/[jobId]/results/page.tsx`
**Proposed:** Consolidated train + publish page

**Layout:**
- **Stepper:** Conversations → Data Shaping → **Launch Tuning**
- **Banner:** Active adapter status (Not launched / Launching / Live) + static adapter name
- **Input card:** Current Tuning Build reference + "View JSONL" + "Change build"
- **Training Settings:** The 3 lay-person sliders (Sensitivity, Progression, Repetition) — preserved from current `pipeline/configure/page.tsx:182-213`
- **Cost estimate:** Sidebar card — preserved from current
- **CTA:** "Train & Publish" with progress sub-steps (Train → Store on HF → Update endpoint)
- **Adapter History:** List of past launches with rollback option
- **Exit path:** When Live → "Open Behavior Chat"

**Key changes from current:**
- Configure + monitor + results are on one page instead of 3 separate routes
- Training progress shows inline (no separate monitor page needed)
- Evaluation results show inline after completion
- One active adapter per Work Base enforced

---

### Page 5: Fine Tuning → Behavior Chat

**Current:** `src/app/(dashboard)/pipeline/jobs/[jobId]/chat/page.tsx` — nested under job ID
**Proposed:** Work Base-level page (no job ID in URL)

**Changes:**
- Route changes from `/pipeline/jobs/[jobId]/chat` to `/workbase/[id]/fine-tuning/chat`
- Automatically uses the Work Base's active adapter
- If no adapter is live: shows banner "Fine Tuning isn't live yet" + CTA "Go to Launch Tuning"
- Label: "Behavior Chat" (not "Multi-Turn Chat Testing")
- The chat UI itself (MultiTurnChat component) is preserved — it already works well

---

### Page 6: Fact Training → Documents

**Current:** `src/app/(dashboard)/rag/page.tsx` (selected KB state)
**Proposed:** Simpler version without KB selection step

**Changes:**
- Remove the Knowledge Base selection screen — the Work Base IS the knowledge base
- Go directly to document upload + document list
- Preserve the DocumentUploader and DocumentList components
- Add status pipeline: Uploading → Extracting → Indexing → Ready
- Add "Chat this document" action per document
- Add "Chat all documents" CTA when 2+ docs are ready
- Label: "Documents" (not "Document Upload")

---

### Page 7: Fact Training → Processing Status

**Current:** Does not exist as a page (processing is shown per-document in the detail view)
**Proposed:** Transparent pipeline view

**Layout:**
- Pipeline visualization: Extract facts → Push to vector DB → Connect chats
- Per-document status breakdown
- CTA: "Rebuild index" (with confirmation)
- Links to extraction report

**Note:** This page is optional for launch. The document list can show per-document status, and this page becomes a "power user" view.

---

### Page 8: Fact Training → Single Document Chat

**Current:** `src/app/(dashboard)/rag/[id]/page.tsx` (Chat tab)
**Proposed:** Standalone page within Work Base

**Changes:**
- Left panel: document selector (Work Base docs only)
- Main panel: chat thread with citations
- Preserves RAGChat component functionality
- Label: "Single Document Chat" (or just "Document Chat")

---

### Page 9: Fact Training → All Documents Chat

**Current:** `src/app/(dashboard)/rag/page.tsx` (chatKbId state)
**Proposed:** Standalone page within Work Base

**Changes:**
- Default scope: all docs in Work Base
- Optional per-document filter
- Citations include document names
- Preserves RAGChat component — just pass `knowledgeBaseId` instead of `documentId`

---

### Page 10: Settings

**Current:** Does not exist
**Proposed:** Work Base configuration

**Sections:**
- General: Work Base name, description
- Endpoint: adapter binding display (read-only)
- (Future) Access: members, permissions

---

## 7. Improvement Actions (Ranked)

Ranked by `(quality impact x confidence in diagnosis)` descending:

### Action 1: Rename All User-Facing Technical Labels

**What:** Replace "RAG Frontier" → "Fact Training", "Pipeline" → "Fine Tuning", "LoRA Training JSON Files" → hidden, "Knowledge Base" → "Documents", "Multi-Turn Chat Testing" → "Behavior Chat", "Batch Jobs" → hidden
**Why:** Addresses Barrier 3 (technical jargon)
**Expected impact:** Removes the #1 intimidation factor for non-technical users. Every label change directly reduces cognitive load.
**Scope:** Small fix — text changes in ~10 files
**Dependencies:** None — can be done immediately

---

### Action 2: Create Work Base Container + Dashboard Redesign

**What:** Create `workbases` table, add `workbase_id` FK to key tables, replace the 6-card dashboard with Work Base list + QuickStart
**Why:** Addresses Barrier 1 (no guided onboarding) and Problem 1 (no container concept)
**Expected impact:** Transforms the entire navigation model. Users will understand "I have projects, I work inside them."
**Scope:** Large refactor — new DB table, new dashboard page, new layout with sidebar
**Dependencies:** Should be done before Action 3 (Fine Tuning consolidation) since Fine Tuning needs the Work Base context

---

### Action 3: Consolidate Fine Tuning Flow (4 modules → 1 section)

**What:** Merge Conversations + Training Files + Datasets + Pipeline into a single "Fine Tuning" section with 3 sub-pages (Conversations, Data Shaping, Launch Tuning) + Behavior Chat
**Why:** Addresses Barrier 2 (fragmented flow) and Problem 2 + Problem 7
**Expected impact:** Reduces navigation steps from 8+ to 3. Eliminates 2 intermediate concepts (Training Files, Datasets) from the user's mental model.
**Scope:** Large refactor — new pages, Data Shaping logic to auto-generate JSONL, route restructuring
**Dependencies:** Depends on Action 2 (Work Base must exist first)

---

### Action 4: Build QuickStart Wizard

**What:** 4-step wizard: Name Work Base → Upload Doc → Processing → Chat
**Why:** Addresses the TTV problem — gets users to the A-ha moment (working RAG chat) in the fewest clicks
**Expected impact:** Reduces time-to-first-value from "minutes of confusion" to "1 wizard flow"
**Scope:** Medium change — new wizard component + integration with existing upload/processing logic
**Dependencies:** Depends on Action 2 (Work Base creation is step 1 of the wizard)

---

### Action 5: Add Persistent Left Sidebar Navigation

**What:** Replace the current no-nav layout with a Work Base sidebar (sections: Overview, Fine Tuning, Fact Training, Settings)
**Why:** Addresses Problem 5 (no persistent navigation) — users need to always know where they are
**Expected impact:** Eliminates the "lost in the app" feeling. Provides constant spatial orientation.
**Scope:** Medium change — new layout component for Work Base routes
**Dependencies:** Depends on Action 2 (sidebar is Work Base-scoped)

---

### Action 6: Elevate Behavior Chat Out of Job ID Nesting

**What:** Move multi-turn chat from `/pipeline/jobs/[jobId]/chat` to a Work Base-level page that auto-selects the active adapter
**Why:** Addresses Problem 8 — the main user reward (chatting with their trained AI) is currently buried
**Expected impact:** Users can find and use their trained AI in one click from the sidebar
**Scope:** Small-Medium change — new route + modify MultiTurnChat to accept adapter reference instead of job ID
**Dependencies:** Depends on Action 2 (needs Work Base context) and the concept of "active adapter per Work Base"

---

### Action 7: Simplify RAG by Removing KB Selection Step

**What:** Remove the Knowledge Base selection screen from the RAG flow. Each Work Base gets an auto-created KB.
**Why:** Addresses Problem 3 — eliminates an unnecessary abstraction layer
**Expected impact:** Saves users one decision point and one concept to understand
**Scope:** Small change — skip KB selection in RAG page, auto-create KB when Work Base is created
**Dependencies:** Depends on Action 2 (Work Base = KB mapping)

---

### Action 8: Add Conversation Reusability Controls

**What:** Add Visibility toggle ("Only this Work Base" / "Reusable in other Work Bases") to conversation create/edit, plus "Add from other Work Bases" picker
**Why:** Addresses the cross-Work Base reuse need from the transcript without creating a global Library
**Expected impact:** Enables sophisticated multi-workspace workflows without the "200 mystery items" problem
**Scope:** Medium change — new UI controls + DB query for cross-workspace conversation discovery
**Dependencies:** Depends on Action 2 (conversations must be scoped to Work Bases first)

---

## 8. Open Questions

### Questions I Could Not Determine from Available Evidence

1. **Database migration strategy:** The `workbases` table needs to be created, and `workbase_id` needs to be added to multiple tables. Should existing data be migrated into a "Default Work Base" or should the migration only apply going forward? I don't have visibility into how much production data exists.
**James' Response**: You do have visibility int othe data using SAOL. Regardeless, no we do not need to migrate data. It is only testing data and we will clear it before we start work.

2. **Knowledge Base ↔ Work Base mapping:** Should we create a 1:1 mapping (one auto-created KB per Work Base) or refactor the RAG tables to use `workbase_id` directly? The former is simpler; the latter is cleaner. Need to understand the RAG embedding/retrieval query paths to determine impact.
**James' Response** I think we should "refactor the RAG tables to use `workbase_id` directly" and simply have the RAG process live on a sub page, instead of a formal KB. Think of any gotchas with this decision.

3. **Active adapter per Work Base enforcement:** The current system tracks adapters per `pipeline_training_job`. How should the "one active adapter per Work Base" constraint be stored? Options: a `active_adapter_job_id` column on the `workbases` table, or a separate `workbase_adapters` junction table with a unique constraint.
**James' Response**: I am not 100% knowledgeable about the way that gives the app the most hardiness and flexibility, while mainting a forward development architecture for future enhancements. My guess is that adding `active_adapter_job_id` column on the `workbases` table, is the most archtecturally sound. Act as a senior application developer and tell me which way meets my requirements the best.

4. **Conversation generation flow:** The current conversation generation uses Claude API with persona/emotion/topic parameters. In the new model, where does the "generate conversations" action live? Is it a button on the Conversations page, or a separate creation flow? The current bulk generator page (`/bulk-generator`) would need to be integrated. 
**James' Response**: I think this can remain a button on the Conversations page, as it is now. What would be the form and benefit of a separate creation flow?

5. **Existing A/B testing flow:** The current A/B testing (`/pipeline/jobs/[jobId]/test`) compares Control vs Adapted with Claude-as-Judge evaluation. In the new ontology, does this become part of "Behavior Chat" or is it a separate "Evaluation" page? The transcript doesn't explicitly address this.
**James' Response**: I think for this iteration it can be built into the Behavior Chat, as it is now part of the "multi turn chat".

6. **Expert Q&A workflow:** Currently at `/rag/[id]` (Expert Q&A tab). In the new ontology, where does this live? It's important for RAG quality but is a power-user workflow. Recommendation: keep it on the document detail page, accessible from the Documents list.
**James' Response**: I agree, keep it on the document detail page, accessible from the Documents list.

7. **Quality dashboards:** The RAG quality dashboard (`/rag/[id]/quality`) and the golden-set test (`/rag/test`) are valuable but not addressed in the transcript. Recommendation: keep them as sub-pages under Fact Training or Settings.
**James' Response**: I agree, keep them as sub-pages under Fact Training or Settings for now.

8. **Multi-user / team access:** The transcript mentions "members" in Settings, but the current auth model is single-user. Is multi-user a launch requirement or a future feature?
**James' Response**: multi-user is a future feature.

9. **Route structure:** Should Work Base routes be `/workbase/[id]/fine-tuning/conversations` or should we use a simpler structure like `/w/[id]/conversations`? The route naming affects URL readability and deep-linking.
**James' Response**: I think /workbase/ is better for this iteration.

10. **Deployment approach:** Should the new UX be a complete rewrite of the routing structure, or can it be incrementally adopted by wrapping existing pages in the new layout while preserving their internal logic?
**James' Response**: This is a question for the technical architect. As the product owner, I would prefer a complete rewrite of the routing structure so that the new system is ontologically consistent. This may break a lot of things, so please have the technical architect create a robust plan that weighs all the factors and makes the best decision.

---

## Appendix A: File Reference Index

Key files analyzed for this report:

| File | Relevance |
|---|---|
| `src/app/(dashboard)/dashboard/page.tsx` | Current main dashboard (6-card grid) |
| `src/app/(dashboard)/layout.tsx` | Dashboard layout (no sidebar/nav) |
| `src/app/(dashboard)/conversations/page.tsx` | Conversation management page |
| `src/app/(dashboard)/training-files/page.tsx` | Training file export page |
| `src/app/(dashboard)/datasets/page.tsx` | Dataset management page |
| `src/app/(dashboard)/pipeline/configure/page.tsx` | Training configuration page |
| `src/app/(dashboard)/pipeline/jobs/page.tsx` | Training jobs list |
| `src/app/(dashboard)/pipeline/jobs/[jobId]/chat/page.tsx` | Multi-turn chat page |
| `src/app/(dashboard)/rag/page.tsx` | RAG main page (KB → docs → chat) |
| `src/app/(dashboard)/rag/[id]/page.tsx` | RAG document detail |
| `src/components/rag/RAGChat.tsx` | RAG chat component |
| `src/components/rag/ModeSelector.tsx` | RAG/LoRA mode selector |
| `src/components/pipeline/chat/` | Multi-turn chat components |
| `src/stores/pipelineStore.ts` | Pipeline configuration state |
| `src/types/pipeline.ts` | Pipeline type definitions |
| `src/types/rag.ts` | RAG type definitions |

---

## Appendix B: Implementation Phasing Recommendation

For launch next week, focus on the **minimum viable UX transformation**:

### Phase 0 (Immediate — 1 day): Label Changes Only
- Rename all user-facing technical terms (Action 1)
- No structural changes, just text
- Deploy immediately for user testing

### Phase 1 (Short term — 3-5 days): Work Base + Sidebar
- Create `workbases` table + migration
- Build Work Base list page (replaces dashboard)
- Build left sidebar layout for Work Base context
- Route restructuring under `/workbase/[id]/`

### Phase 2 (Medium term — 5-7 days): Fine Tuning Consolidation
- Build Data Shaping page (merges Training Files + Datasets)
- Build Launch Tuning page (merges Configure + Monitor + Results)
- Elevate Behavior Chat to Work Base level
- Add stepper across Fine Tuning pages

### Phase 3 (Medium term — 3-5 days): Fact Training + QuickStart
- Simplify RAG flow (remove KB selection, auto-create KB per Work Base)
- Build QuickStart wizard
- Add Processing Status page

### Phase 4 (Post-launch): Cross-Work Base Features
- Conversation reusability controls
- "Add from other Work Bases" picker
- Work Chat (combined LoRA + RAG)

---

*End of UX Discovery Report*
