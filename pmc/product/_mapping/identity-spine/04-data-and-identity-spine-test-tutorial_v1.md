# BrightHub BRun — System Testing Tutorial & Usage Guide

**Version:** 1.1 — Vercel Deployment
**Date:** 2026-02-23
**Target:** `https://v4-show.vercel.app`
**Scope:** Full system test covering all five modules — Conversations, Training Files, Datasets, Pipeline (LoRA Training), and RAG — with identity spine verification at every step.

---

## How to Use This Document

Each section follows this structure:

1. **Steps** — What to do in the UI or via API
2. **Artifacts** — What is written to the database and Supabase Storage
3. **Identity Spine Check** — SAOL query to confirm the correct user UUID is stamped

Work through Parts 1–5 in order. Part 6 consolidates all identity spine verification in one pass.

All UI interactions target `https://v4-show.vercel.app`. All SAOL commands run locally against the same Supabase database.

---

## SAOL Reference

All database inspection commands use SAOL. Substitute `YOUR_SQL` with the query shown in each section.

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
  const r = await saol.agentExecuteSQL({
    sql: \`YOUR_SQL\`,
    transport: 'pg'
  });
  console.log(JSON.stringify(r.rows, null, 2));
})();"
```

Throughout this document, SAOL queries are shown as ready-to-run commands with the SQL embedded directly.

---

## Part 0: Prerequisites

### 0.1 Confirm the app is live

Navigate to `https://v4-show.vercel.app` in a browser.

Confirm the page loads and redirects to `https://v4-show.vercel.app/signin` (if not already signed in) or `https://v4-show.vercel.app/dashboard`.

### 0.2 Confirm local SAOL environment

- `.env.local` exists in `v4-show/` with `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- SAOL installed: `v4-show/supa-agent-ops/` exists with `node_modules/`.

SAOL connects directly to the Supabase database — it does not go through the Vercel deployment.

### 0.3 Create a test account

1. Navigate to `https://v4-show.vercel.app/signup`.
2. Enter an email and password. Click **Sign Up**.
3. Confirm the email if Supabase requires it.
4. Sign in at `https://v4-show.vercel.app/signin`.
5. On successful login you are redirected to `https://v4-show.vercel.app/dashboard`.

### 0.4 Get your user UUID

After signing in and creating at least one record, run this SAOL query:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
  const r = await saol.agentExecuteSQL({
    sql: \`SELECT DISTINCT user_id FROM conversations ORDER BY 1 LIMIT 5;\`,
    transport: 'pg'
  });
  console.log(JSON.stringify(r.rows, null, 2));
})();"
```

Record your UUID — referred to as `YOUR_UUID` in all identity spine checks below.

---

## Part 1: Conversations Module

**Entry point:** `https://v4-show.vercel.app/conversations`
**All routes flow from:** `/api/conversations`

---

### 1.1 Single Conversation — Template-Based

**Steps:**

1. Navigate to `https://v4-show.vercel.app/conversations/generate`.
2. Select mode: **Template-based**.
3. Select a template from the dropdown.
4. Fill in required parameters (tier, temperature, any template-specific fields).
5. Click **Generate**.
6. Observe the generation progress indicator.
7. On success, observe the result card showing:
   - Conversation title
   - Quality metrics (overall, relevance, accuracy, naturalness, methodology, coherence)
   - Cost

**Route called:** `POST /api/conversations/generate`

**Request body shape:**
```json
{
  "templateId": "<uuid>",
  "parameters": { ... },
  "tier": "template" | "scenario" | "edge_case",
  "temperature": 0.7,
  "maxTokens": 2048
}
```

**Artifacts generated:**

| Artifact | Table / Storage |
|----------|----------------|
| Conversation record | `conversations` — `id`, `title`, `tier`, `status='generated'`, `user_id=YOUR_UUID`, `created_by=YOUR_UUID`, `quality_score` |
| Generation log | `generation_logs` — `conversation_id`, `created_by=YOUR_UUID`, `model_used`, `cost_usd`, `tokens_used` |
| Raw response file | Supabase Storage `conversation-files/YOUR_UUID/<conversation_id>/raw.json` |

**Identity Spine Check:**

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
  const r = await saol.agentExecuteSQL({
    sql: \`
SELECT id, title, status, tier, user_id, created_by, quality_score
FROM conversations
ORDER BY created_at DESC
LIMIT 3;
\`,
    transport: 'pg'
  });
  console.log(JSON.stringify(r.rows, null, 2));
})();"
```

**Observe:** Both `user_id` and `created_by` equal `YOUR_UUID`. `status = 'generated'`.

---

### 1.2 Single Conversation — Scaffolding-Based

**Steps:**

1. Navigate to `https://v4-show.vercel.app/conversations/generate`.
2. Select mode: **Scaffolding-based**.
3. Select from dropdowns:
   - **Persona** (e.g. a customer service archetype)
   - **Emotional Arc** (e.g. frustrated → resolved)
   - **Training Topic** (e.g. billing dispute)
   - **Tier**: `template`, `scenario`, or `edge_case`
4. Click **Generate**.
5. Observe the same result card as 1.1.

**Route called:** `POST /api/conversations/generate-with-scaffolding`

**Request body shape:**
```json
{
  "persona_id": "<uuid>",
  "emotional_arc_id": "<uuid>",
  "training_topic_id": "<uuid>",
  "tier": "scenario",
  "template_id": "<uuid (optional)>",
  "temperature": 0.7,
  "max_tokens": 2048
}
```

**Artifacts generated:** Same tables as 1.1. The `scaffolding_distribution` JSONB column on the `training_files` table will reflect these scaffolding dimensions when the conversation is later added to a training file.

**Identity Spine Check:** Same SAOL query as 1.1.

---

### 1.3 Enrich a Conversation

Enrichment runs a second Claude pass to add structure, validation, and metadata to the raw conversation.

**Steps:**

1. Navigate to `https://v4-show.vercel.app/conversations`.
2. Find a conversation with status `generated`.
3. Open the conversation preview (click the row).
4. Click **Enrich**.
5. Observe status change: `generated` → `enrichment_processing` → `enrichment_complete`.
6. After completion, the preview shows enrichment metadata and a validation report.

**Route called:** `POST /api/conversations/{id}/enrich`

**To check enrichment status:**

Observe via the preview modal, or call `GET /api/conversations/{id}/enrich`.

**Artifacts generated:**

| Artifact | Table / Storage |
|----------|----------------|
| Enriched file | Supabase Storage `conversation-files/YOUR_UUID/<conversation_id>/enriched.json` |
| Validation report | Supabase Storage `conversation-files/YOUR_UUID/<conversation_id>/validation_report.json` |
| Status update | `conversations.enrichment_status = 'enrichment_complete'` |

**Identity Spine Check:**

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
  const r = await saol.agentExecuteSQL({
    sql: \`
SELECT id, title, enrichment_status, user_id, created_by
FROM conversations
WHERE enrichment_status = 'enrichment_complete'
ORDER BY updated_at DESC
LIMIT 3;
\`,
    transport: 'pg'
  });
  console.log(JSON.stringify(r.rows, null, 2));
})();"
```

**Observe:** `user_id` and `created_by` equal `YOUR_UUID`.

---

### 1.4 Approve or Reject a Conversation

**Steps:**

1. Navigate to `https://v4-show.vercel.app/conversations`.
2. Select a conversation with `enrichment_status = 'enrichment_complete'`.
3. Open the status panel.
4. Click **Approve** or **Reject**.
5. For rejection, enter an optional reason.
6. Observe status changes to `approved` or `rejected`.

**Route called:** `PATCH /api/conversations/{id}/status`

**Request body:**
```json
{
  "status": "approved",
  "review_notes": "Clean, well-structured dialogue."
}
```

Valid status values: `pending_review`, `approved`, `rejected`, `archived`.

**Artifacts generated:**

| Artifact | Column |
|----------|--------|
| Status updated | `conversations.status = 'approved'` |
| Reviewer stamped | `conversations.reviewed_by = YOUR_UUID` (via service layer) |
| Timestamp | `conversations.reviewed_at = NOW()` |

**Identity Spine Check:**

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
  const r = await saol.agentExecuteSQL({
    sql: \`
SELECT id, title, status, user_id, created_by
FROM conversations
WHERE status IN ('approved', 'rejected')
ORDER BY updated_at DESC
LIMIT 5;
\`,
    transport: 'pg'
  });
  console.log(JSON.stringify(r.rows, null, 2));
})();"
```

**Observe:** `user_id` = `created_by` = `YOUR_UUID` on all returned rows.

---

### 1.5 Download a Conversation File

**Steps:**

1. Navigate to `https://v4-show.vercel.app/conversations`.
2. Click the download icon on any conversation.
3. Select **Raw** or **Enriched** (enriched requires enrichment to be complete).
4. A signed URL is returned. The browser downloads the JSON file.

**Routes called:**

- Raw: `GET /api/conversations/{id}/download/raw`
- Enriched: `GET /api/conversations/{id}/download/enriched`

**What you receive:** A signed Supabase Storage URL expiring in 60 seconds. The downloaded JSON contains the full conversation including all turns.

**Identity Spine Check:** Both download routes verify `conversation.created_by === user.id` before generating the signed URL. If you supply a conversation ID owned by another user, you receive `404 Not Found`.

---

### 1.6 Batch Conversation Generation

**Steps:**

1. Navigate to `https://v4-show.vercel.app/bulk-generator`.
2. Configure:
   - **Batch name** (required)
   - **Tier**: `template`, `scenario`, or `edge_case`
   - Choose generation mode: template-based (select a template + parameter sets) or scaffolding-based
   - Set **concurrent processing** (optional)
   - Set **error handling**: `stop_on_error` or `continue_on_error`
3. Click **Start Batch**.
4. Observe: the response shows `jobId`, `status = 'queued'`, `estimatedCost`, `estimatedTime`.
5. You are redirected to `https://v4-show.vercel.app/batch-jobs/{jobId}` (or navigate there manually).

**Route called:** `POST /api/conversations/generate-batch`

**Request body shape:**
```json
{
  "name": "Batch test run 1",
  "tier": "scenario",
  "templateId": "<uuid>",
  "parameterSets": [ { ... }, { ... } ],
  "sharedParameters": { "temperature": 0.7 },
  "concurrentProcessing": false,
  "errorHandling": "continue_on_error"
}
```

**Artifacts generated:**

| Artifact | Table |
|----------|-------|
| Batch job record | `batch_jobs` — `id`, `name`, `status='queued'`, `user_id=YOUR_UUID`, `created_by=YOUR_UUID`, `total_items`, `completed_items=0` |
| Batch items | `batch_job_items` — one row per parameter set, `job_id`, `status='queued'` |

**Identity Spine Check:**

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
  const r = await saol.agentExecuteSQL({
    sql: \`
SELECT id, name, status, user_id, created_by, total_items, completed_items, failed_items
FROM batch_jobs
ORDER BY created_at DESC
LIMIT 3;
\`,
    transport: 'pg'
  });
  console.log(JSON.stringify(r.rows, null, 2));
})();"
```

**Observe:** `user_id` = `created_by` = `YOUR_UUID`. `status` is `queued`, `processing`, or `completed` depending on timing.

---

### 1.7 Monitor Batch Job Progress

**Steps:**

1. Navigate to `https://v4-show.vercel.app/batch-jobs` to see all batch jobs.
2. Click a job to go to `https://v4-show.vercel.app/batch-jobs/{id}`.
3. Observe the progress bar: `completed / total` items, percentage.
4. Click **Items** to see per-item status (queued, processing, completed, failed).

**Routes called:**

- `GET /api/conversations/batch/{id}/status` — summary progress
- `GET /api/conversations/batch/{id}/items` — per-item status
- `GET /api/batch-jobs` — all user's jobs (scoped to `user_id`)
- `POST /api/batch-jobs/{id}/cancel` — to cancel

**Observe:** The `/api/batch-jobs` endpoint returns only jobs where `user_id = YOUR_UUID`. No other user's jobs appear in the list.

**Processing a single item manually:**

```bash
POST https://v4-show.vercel.app/api/batch-jobs/{id}/process-next
```

This advances the next queued item in the batch and returns:
```json
{
  "success": true,
  "itemId": "<uuid>",
  "conversationId": "<uuid>",
  "status": "processing",
  "remainingItems": 4,
  "progress": { "total": 5, "completed": 1 }
}
```

---

### 1.8 Bulk Actions on Conversations

**Steps:**

1. Navigate to `https://v4-show.vercel.app/conversations`.
2. Select multiple conversations using checkboxes.
3. Choose an action from the **Bulk Actions** menu: **Approve**, **Reject**, or **Delete**.
4. Confirm the action.
5. Observe: the response includes `count` (affected) and `skipped` (not owned by you).

**Route called:** `POST /api/conversations/bulk-action`

**Request body:**
```json
{
  "action": "approve",
  "conversationIds": ["<uuid1>", "<uuid2>", "<uuid3>"],
  "reason": "Batch approved after review"
}
```

**Identity Spine Check:** The route filters `conversationIds` to only those where `created_by = YOUR_UUID`. Any IDs not owned by you are counted in `skipped` and not modified.

**To verify the skip behavior:**
- Include a UUID that does not belong to your account in the `conversationIds` array.
- Observe `skipped > 0` in the response.

---

### 1.9 Failed Generations

**Steps:**

1. Navigate to `https://v4-show.vercel.app/conversations/failed`.
2. Observe: a table of failed generation attempts, filterable by `failure_type`, `stop_reason`, and `truncation_pattern`.
3. Click a row to see the full failure detail.
4. Click **Download Error Report** to download the raw JSON failure log.

**Routes called:**

- `GET /api/failed-generations` — list (scoped to `created_by = YOUR_UUID`)
- `GET /api/failed-generations/{id}` — single record (ownership check)
- `GET /api/failed-generations/{id}/download` — raw error report

**Identity Spine Check:**

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
  const r = await saol.agentExecuteSQL({
    sql: \`
SELECT id, failure_type, stop_reason, created_by
FROM failed_generations
ORDER BY created_at DESC
LIMIT 5;
\`,
    transport: 'pg'
  });
  console.log(JSON.stringify(r.rows, null, 2));
})();"
```

**Observe:** All rows show `created_by = YOUR_UUID`.

---

### 1.10 Generation Logs

**Steps:**

1. In the browser, navigate to `https://v4-show.vercel.app/api/generation-logs` (or inspect via DevTools while on `/conversations`).
2. Apply filters via query params: `conversationId`, `status`, `modelUsed`, `dateFrom`, `dateTo`.
3. Get cost summary: `GET https://v4-show.vercel.app/api/generation-logs/stats?type=cost&startDate=2026-01-01&endDate=2026-12-31`
4. Get performance metrics: `GET https://v4-show.vercel.app/api/generation-logs/stats?type=performance`

**Identity Spine Check:**

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
  const r = await saol.agentExecuteSQL({
    sql: \`
SELECT id, conversation_id, model_used, status, created_by, cost_usd
FROM generation_logs
ORDER BY created_at DESC
LIMIT 5;
\`,
    transport: 'pg'
  });
  console.log(JSON.stringify(r.rows, null, 2));
})();"
```

**Observe:** All rows show `created_by = YOUR_UUID`.

---

### 1.11 Conversations Module — 401 Rejection Test

Send a request to the Vercel deployment without a session cookie:

```bash
curl -s -o /dev/null -w "%{http_code}" https://v4-show.vercel.app/api/conversations
```

**Observe:** `401` returned.

---

## Part 2: Training Files Module

**Entry point:** `https://v4-show.vercel.app/training-files`
**All routes flow from:** `/api/training-files`

A Training File is a concatenated, packaged JSON/JSONL file built from one or more approved conversations. It is the pre-training artifact that feeds the LoRA pipeline.

---

### 2.1 Create a Training File

**Prerequisites:** At least 1 conversation with `status = 'approved'`.

**Steps:**

1. Navigate to `https://v4-show.vercel.app/conversations`.
2. Select one or more approved conversations (1–80 max).
3. Click **Add to Training File** → **Create New Training File**.
4. Enter a name and optional description.
5. Click **Create**.
6. Observe: new training file appears on `https://v4-show.vercel.app/training-files`.

**Route called:** `POST /api/training-files`

**Request body:**
```json
{
  "name": "Billing Dispute Scenarios v1",
  "description": "Template and scenario tier billing conversations",
  "conversation_ids": ["<uuid1>", "<uuid2>"]
}
```

**Artifacts generated:**

| Artifact | Table / Storage |
|----------|----------------|
| Training file record | `training_files` — `id`, `name`, `description`, `conversation_count`, `total_training_pairs`, `avg_quality_score`, `json_file_path`, `jsonl_file_path`, `user_id=YOUR_UUID`, `created_by=YOUR_UUID` |
| File associations | `training_file_conversations` — one row per conversation, `training_file_id`, `conversation_id`, `added_by=YOUR_UUID` |
| JSON file | Supabase Storage `training-files/{id}.json` |
| JSONL file | Supabase Storage `training-files/{id}.jsonl` |

**The JSON training file structure** contains an array of LoRA training pairs derived from each conversation's turns:

```json
[
  {
    "conversations": [
      { "role": "user", "content": "..." },
      { "role": "assistant", "content": "..." }
    ]
  }
]
```

**Identity Spine Check:**

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
  const r = await saol.agentExecuteSQL({
    sql: \`
SELECT
  tf.id, tf.name, tf.conversation_count, tf.total_training_pairs,
  tf.avg_quality_score, tf.user_id, tf.created_by,
  tf.json_file_path, tf.jsonl_file_path
FROM training_files tf
ORDER BY tf.created_at DESC
LIMIT 3;
\`,
    transport: 'pg'
  });
  console.log(JSON.stringify(r.rows, null, 2));
})();"
```

**Observe:** `user_id` = `created_by` = `YOUR_UUID`. `json_file_path` and `jsonl_file_path` are populated.

**Check file associations:**

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
  const r = await saol.agentExecuteSQL({
    sql: \`
SELECT tfc.training_file_id, tfc.conversation_id, tfc.added_by
FROM training_file_conversations tfc
ORDER BY tfc.added_at DESC
LIMIT 10;
\`,
    transport: 'pg'
  });
  console.log(JSON.stringify(r.rows, null, 2));
})();"
```

**Observe:** `added_by = YOUR_UUID` on all rows.

---

### 2.2 View Training Files

**Steps:**

1. Navigate to `https://v4-show.vercel.app/training-files`.
2. Observe the table columns:
   - Name
   - Conversation count
   - Total training pairs
   - Average quality score
   - Scaffolding distribution (tier breakdown)
   - JSON file size / JSONL file size
   - Download buttons

**Route called:** `GET /api/training-files`

**Observe:** Only training files where `created_by = YOUR_UUID` appear in the list.

---

### 2.3 Download JSON Training File

**Steps:**

1. On `https://v4-show.vercel.app/training-files`, click **Download JSON** for any training file.
2. The API returns a signed URL.
3. The browser downloads the `.json` file.

**Route called:** `GET /api/training-files/{id}/download?format=json`

**Response:**
```json
{
  "download_url": "https://...supabase.co/storage/v1/object/sign/...",
  "filename": "training-file-name.json",
  "expires_in_seconds": 3600
}
```

**Identity Spine Check:** The route verifies `trainingFile.created_by !== user.id` before generating the URL. Requesting a file owned by another user returns `404`.

---

### 2.4 Download JSONL Training File

**Steps:**

1. On `https://v4-show.vercel.app/training-files`, click **Download JSONL** for any training file.
2. Route: `GET /api/training-files/{id}/download?format=jsonl`
3. The JSONL file contains one JSON object per line — one per training pair.

**The JSONL file structure:**

```jsonl
{"conversations":[{"role":"user","content":"..."},{"role":"assistant","content":"..."}]}
{"conversations":[{"role":"user","content":"..."},{"role":"assistant","content":"..."}]}
```

This format is ready for direct ingestion by LoRA fine-tuning frameworks (e.g. Axolotl, LLaMA-Factory).

---

### 2.5 Add Conversations to an Existing Training File

**Steps:**

1. On `https://v4-show.vercel.app/conversations`, select additional approved conversations.
2. Click **Add to Training File** → **Add to Existing**.
3. Select the target training file from the list.
4. Click **Add**.

**Route called:** `POST /api/training-files/{id}/add-conversations`

**Request body:**
```json
{
  "conversation_ids": ["<uuid3>", "<uuid4>"]
}
```

**Artifacts:** New rows inserted into `training_file_conversations`. The `training_files` record stats (`conversation_count`, `total_training_pairs`, `avg_quality_score`) are updated. The JSON/JSONL files in storage are regenerated.

**Identity Spine Check:** `added_by = YOUR_UUID` on the new `training_file_conversations` rows.

---

### 2.6 Training Files — 401 Rejection Test

```bash
curl -s -o /dev/null -w "%{http_code}" https://v4-show.vercel.app/api/training-files
```

**Observe:** `401`.

---

## Part 3: LoRA Datasets Module

**Entry point:** `https://v4-show.vercel.app/datasets`
**All routes flow from:** `/api/datasets`

A Dataset is the LoRA-ready artifact created by importing a Training File. It is what the Pipeline training job consumes.

---

### 3.1 Import a Training File as a Dataset

**Prerequisites:** A Training File exists (from Part 2).

**Steps:**

1. Navigate to `https://v4-show.vercel.app/datasets/import`.
2. Observe: a list of training files available for import (not yet imported).
3. Click **Import** next to the training file.
4. Observe: a dataset record is created with `status = 'validating'`.

**Route called:** `POST /api/datasets/import-from-training-file`

**Request body:**
```json
{
  "training_file_id": "<training_file_uuid>"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "<dataset_uuid>",
    "name": "Billing Dispute Scenarios v1",
    "status": "validating",
    "format": "jsonl",
    "file_name": "...",
    "file_size": 45312,
    "user_id": "YOUR_UUID"
  }
}
```

**Artifacts generated:**

| Artifact | Table |
|----------|-------|
| Dataset record | `datasets` — `id`, `name`, `format`, `status='validating'`, `file_name`, `file_size`, `user_id=YOUR_UUID`, `created_by=YOUR_UUID` |

**Identity Spine Check:**

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
  const r = await saol.agentExecuteSQL({
    sql: \`
SELECT id, name, status, format, file_size, user_id, created_by, deleted_at
FROM datasets
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 5;
\`,
    transport: 'pg'
  });
  console.log(JSON.stringify(r.rows, null, 2));
})();"
```

**Observe:** `user_id` = `created_by` = `YOUR_UUID`. `deleted_at` is null (record is active).

---

### 3.2 Confirm a Dataset

After the validation pass completes, confirm the dataset to make it ready for training.

**Steps:**

1. Navigate to `https://v4-show.vercel.app/datasets`.
2. Click the dataset with `status = 'validating'`.
3. Navigate to `https://v4-show.vercel.app/datasets/{id}`.
4. Click **Confirm**.

**Route called:** `POST /api/datasets/{id}/confirm`

**Observe:** `status` changes from `validating` to `ready` (or `failed` if the JSONL file is malformed).

---

### 3.3 View and Filter Datasets

**Steps:**

1. Navigate to `https://v4-show.vercel.app/datasets`.
2. Apply search and status filters.
3. Observe: only your datasets appear (filtered by `user_id = YOUR_UUID`).

**Route called:** `GET /api/datasets?status=ready&search=billing`

**Response shape:**
```json
{
  "success": true,
  "data": {
    "datasets": [ ... ],
    "total": 3,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### 3.4 Delete a Dataset

**Steps:**

1. Navigate to `https://v4-show.vercel.app/datasets/{id}`, click **Delete**.
2. Confirm the deletion.

**Route called:** `DELETE /api/datasets/{id}`

**Artifact:** `datasets.deleted_at` is set to `NOW()` (soft delete). The record is not physically removed.

**Verify soft delete:**

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
  const r = await saol.agentExecuteSQL({
    sql: \`
SELECT id, name, status, deleted_at, user_id
FROM datasets
WHERE deleted_at IS NOT NULL
ORDER BY deleted_at DESC
LIMIT 3;
\`,
    transport: 'pg'
  });
  console.log(JSON.stringify(r.rows, null, 2));
})();"
```

**Observe:** `deleted_at` is set, `user_id = YOUR_UUID`.

---

### 3.5 Datasets Module — 401 Rejection Test

```bash
curl -s -o /dev/null -w "%{http_code}" https://v4-show.vercel.app/api/datasets
```

**Observe:** `401`.

---

## Part 4: LoRA Training — Pipeline Module

**Entry points:** `https://v4-show.vercel.app/pipeline/configure` and `https://v4-show.vercel.app/pipeline/jobs`
**All routes flow from:** `/api/pipeline`

---

### 4.1 Configure and Create a Training Job

**Prerequisites:** A dataset with `status = 'ready'` (from Part 3).

**Steps:**

1. Navigate to `https://v4-show.vercel.app/pipeline/configure`.
2. Fill in the training form:
   - **Job Name** (required, free text)
   - **Dataset**: select from the dataset picker (shows your `ready` datasets)
   - **Training Sensitivity**: `very_low` / `low` / `medium` / `high` / `very_high`
     - Maps to learning rate: `0.00001` / `0.00005` / `0.0001` / `0.0005` / `0.001`
   - **Training Progression**: `low` / `medium` / `high`
     - Maps to batch size
   - **Training Repetition**: `1` / `3` / `5` / `10`
     - Maps to number of epochs
3. Click **Start Training**.
4. Observe the response: `success: true`, `jobId`, `status: 'pending'`.

**Route called:** `POST /api/pipeline/jobs`

**Request body:**
```json
{
  "jobName": "Billing Dispute LoRA v1",
  "datasetId": "<dataset_uuid>",
  "trainingSensitivity": "medium",
  "trainingProgression": "medium",
  "trainingRepetition": 3
}
```

**Artifacts generated:**

| Artifact | Table |
|----------|-------|
| Training job | `pipeline_training_jobs` — `id`, `job_name`, `status='pending'`, `user_id=YOUR_UUID`, `created_by=YOUR_UUID`, `dataset_id`, `dataset_name`, `training_sensitivity`, `training_progression`, `training_repetition`, `learning_rate`, `batch_size`, `epochs`, `rank`, `alpha`, `dropout`, `engine_id`, `estimated_cost` |

**Identity Spine Check:**

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
  const r = await saol.agentExecuteSQL({
    sql: \`
SELECT
  id, job_name, status, training_sensitivity, training_progression,
  training_repetition, learning_rate, batch_size, epochs,
  rank, alpha, dropout, user_id, created_by,
  estimated_cost, actual_cost, progress
FROM pipeline_training_jobs
ORDER BY created_at DESC
LIMIT 3;
\`,
    transport: 'pg'
  });
  console.log(JSON.stringify(r.rows, null, 2));
})();"
```

**Observe:** `user_id` = `created_by` = `YOUR_UUID`. Technical hyperparameters (`learning_rate`, `batch_size`, `epochs`, `rank`, `alpha`, `dropout`) are derived from the lay-person settings.

---

### 4.2 Monitor Training Job Progress

**Steps:**

1. Navigate to `https://v4-show.vercel.app/pipeline/jobs`.
2. Observe: only your jobs are listed (scoped to `user_id = YOUR_UUID`).
3. Click the job to go to `https://v4-show.vercel.app/pipeline/jobs/{jobId}`.
4. Observe the progress display:
   - Status progression: `pending` → `queued` → `initializing` → `running` → `completed`
   - Progress percentage
   - Current epoch / total epochs
   - Current loss (decreasing is good)
   - Learning rate
   - Tokens per second

**Routes called:**

- `GET /api/pipeline/jobs/{jobId}` — job detail
- `GET /api/pipeline/jobs/{jobId}/metrics` — real-time training metrics

**Artifacts generated during training:**

| Artifact | Table |
|----------|-------|
| Training metrics | `pipeline_training_metrics` — per-step loss, learning rate, tokens/sec |
| RunPod job reference | `pipeline_training_jobs.runpod_job_id`, `.runpod_endpoint_id` |
| Progress updates | `pipeline_training_jobs.progress`, `.current_epoch`, `.current_step`, `.current_loss` |

**Check training metrics:**

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
  const r = await saol.agentExecuteSQL({
    sql: \`
SELECT job_id, step, epoch, loss, learning_rate, tokens_per_second, recorded_at
FROM pipeline_training_metrics
ORDER BY recorded_at DESC
LIMIT 10;
\`,
    transport: 'pg'
  });
  console.log(JSON.stringify(r.rows, null, 2));
})();"
```

---

### 4.3 Cancel a Training Job

**Steps:**

1. Navigate to `https://v4-show.vercel.app/pipeline/jobs/{jobId}`, click **Cancel**.
2. Confirm the cancellation.

**Route called:** `POST /api/pipeline/jobs/{jobId}/cancel`

**Observe:** `status` changes to `cancelled`. The route verifies `job.userId === YOUR_UUID` before cancelling; attempting to cancel another user's job returns `404`.

---

### 4.4 Deploy Adapter Endpoints

After a job reaches `status = 'completed'`, deploy the adapter to an inference endpoint.

**Steps:**

1. Navigate to `https://v4-show.vercel.app/pipeline/jobs/{jobId}`, click **Deploy Adapter**.
2. Optionally tick **Force Redeploy** if an endpoint already exists.
3. Click **Deploy**.

**Route called:** `POST /api/pipeline/adapters/deploy`

**Request body:**
```json
{
  "jobId": "<pipeline_job_uuid>",
  "forceRedeploy": false
}
```

**Artifacts generated:**

| Artifact | Table |
|----------|-------|
| Endpoint records | `pipeline_inference_endpoints` — `control_endpoint_url`, `adapted_endpoint_url`, `status` |

**Check endpoint status:**

`GET https://v4-show.vercel.app/api/pipeline/adapters/status?jobId=<uuid>`

**Response:**
```json
{
  "controlEndpoint": { "url": "...", "status": "ready" },
  "adaptedEndpoint": { "url": "...", "status": "ready" },
  "bothReady": true
}
```

---

### 4.5 A/B Test the Adapter

Compare the base Mistral model (control) against your LoRA-trained adapter (adapted).

**Steps:**

1. Navigate to `https://v4-show.vercel.app/pipeline/jobs/{jobId}/test`.
2. Observe the two-panel display: **Control** (base Mistral) and **Adapted** (your LoRA model).
3. Enter a test prompt in the **User Message** field.
4. Click **Run Test**.
5. Observe both responses side-by-side.
6. Select a winner: **Control**, **Adapted**, **Tie**, or **Neither**.
7. Click **Submit Rating**.

**Routes called:**

- `POST /api/pipeline/adapters/test` — run a test
- `POST /api/pipeline/adapters/rate` — submit a rating

**Test request body:**
```json
{
  "jobId": "<pipeline_job_uuid>",
  "userPrompt": "I've been charged twice for my subscription this month.",
  "systemPrompt": "You are a helpful customer service agent.",
  "enableEvaluation": true
}
```

**Rating request body:**
```json
{
  "testId": "<test_result_uuid>",
  "rating": "adapted",
  "notes": "LoRA model shows improved empathy and resolution clarity."
}
```

**Artifacts generated:**

| Artifact | Table |
|----------|-------|
| Test result | `pipeline_test_results` — `job_id`, `user_id`, `control_response`, `adapted_response`, `user_prompt`, `rating`, `notes` |
| Evaluation result | `pipeline_evaluation_results` — quality scores for each response |

---

### 4.6 Chat with the Trained Model

**Steps:**

1. Navigate to `https://v4-show.vercel.app/pipeline/jobs/{jobId}/chat`.
2. Select which model to chat with: **Control** (base) or **Adapted** (LoRA-tuned).
3. Type a message in the chat input. Click **Send**.
4. Observe the model's response.
5. Continue the multi-turn conversation.
6. Click **Complete** to finalize the conversation record.

**Routes called:**

- `POST /api/pipeline/conversations` — create a chat conversation record
- `POST /api/pipeline/conversations/{id}/turn` — add a turn
- `GET /api/pipeline/conversations/{id}` — retrieve conversation with turns
- `POST /api/pipeline/conversations/{id}/complete` — finalize

**Turn request body:**
```json
{
  "controlUserMessage": "I've been overcharged.",
  "adaptedUserMessage": "I've been overcharged.",
  "enableEvaluation": false
}
```

**Artifacts generated:**

| Artifact | Table |
|----------|-------|
| Chat conversation | `pipeline_conversations` (internal) |
| Conversation turns | Turn records scoped to `user_id = YOUR_UUID` |

---

### 4.7 Download the Adapter Files

After the job is complete, download the LoRA adapter weights as a ZIP archive.

**Steps:**

1. Navigate to `https://v4-show.vercel.app/pipeline/jobs/{jobId}`, click **Download Adapter**.

**Route called:** `GET /api/pipeline/jobs/{jobId}/download`

**Observe:** A ZIP/tar.gz file is downloaded containing the LoRA adapter weights. The route verifies `job.userId === YOUR_UUID` before streaming the file.

**Adapter file path in DB:**

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
  const r = await saol.agentExecuteSQL({
    sql: \`
SELECT id, job_name, status, adapter_file_path, adapter_download_url,
       final_loss, training_time_seconds, user_id
FROM pipeline_training_jobs
WHERE status = 'completed'
ORDER BY completed_at DESC
LIMIT 3;
\`,
    transport: 'pg'
  });
  console.log(JSON.stringify(r.rows, null, 2));
})();"
```

**Observe:** `adapter_file_path` is populated after training. `user_id = YOUR_UUID`.

---

### 4.8 Pipeline Module — 401 Rejection Test

```bash
curl -s -o /dev/null -w "%{http_code}" https://v4-show.vercel.app/api/pipeline/jobs
```

**Observe:** `401`.

**Cross-user ownership test:**

Request a job ID that belongs to another user:

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "Cookie: YOUR_SESSION_COOKIE" \
  https://v4-show.vercel.app/api/pipeline/jobs/OTHER_USER_JOB_ID
```

**Observe:** `404 Not Found`.

---

## Part 5: RAG Module

**Entry point:** `https://v4-show.vercel.app/rag`
**All routes flow from:** `/api/rag`

---

### 5.1 Create a Knowledge Base

A Knowledge Base is the top-level container for RAG documents.

**Steps:**

1. Navigate to `https://v4-show.vercel.app/rag`.
2. Click **New Knowledge Base**.
3. Enter a name and optional description.
4. Click **Create**.

**Route called:** `POST /api/rag/knowledge-bases`

**Request body:**
```json
{
  "name": "Customer Service Policy Docs",
  "description": "Official billing and refund policies"
}
```

**Artifacts generated:**

| Artifact | Table |
|----------|-------|
| Knowledge base | `rag_knowledge_bases` — `id`, `name`, `description`, `user_id=YOUR_UUID`, `created_at` |

**Identity Spine Check:**

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
  const r = await saol.agentExecuteSQL({
    sql: \`
SELECT id, name, description, user_id
FROM rag_knowledge_bases
ORDER BY created_at DESC
LIMIT 5;
\`,
    transport: 'pg'
  });
  console.log(JSON.stringify(r.rows, null, 2));
})();"
```

**Observe:** `user_id = YOUR_UUID`.

---

### 5.2 Create a Document Record

**Steps:**

1. On `https://v4-show.vercel.app/rag`, select your knowledge base.
2. Click **Upload Document**.
3. Fill in:
   - **File name** (e.g. `billing-policy.pdf`)
   - **File type**: `pdf`, `docx`, `txt`, or `html`
   - **Description** (optional)
   - **Fast Mode**: toggle off for full 6-pass extraction (recommended for testing)
4. Click **Create Document**.

**Route called:** `POST /api/rag/documents`

**Request body:**
```json
{
  "knowledgeBaseId": "<kb_uuid>",
  "fileName": "billing-policy.pdf",
  "fileType": "pdf",
  "description": "Billing and refund policy document",
  "fastMode": false
}
```

**Artifacts generated:**

| Artifact | Table |
|----------|-------|
| Document record | `rag_documents` — `id`, `knowledge_base_id`, `user_id=YOUR_UUID`, `file_name`, `file_type`, `status='pending'`, `description`, `fast_mode` |

---

### 5.3 Upload the Document File

**Steps:**

1. After creating the document record, the UI prompts for the actual file.
2. Select and upload the file (PDF, DOCX, TXT, or HTML).
3. The file is uploaded to Supabase Storage.

**Route called:** `POST /api/rag/documents/{id}/upload`

**Request:** `multipart/form-data` with a `file` field.

**Artifacts generated:**

| Artifact | Table / Storage |
|----------|----------------|
| File stored | Supabase Storage `rag-documents/YOUR_UUID/{document_id}/{filename}` |
| File path updated | `rag_documents.file_path` |
| Text extracted | `rag_documents.original_text` (raw text extracted from PDF/DOCX/TXT/HTML) |
| Status updated | `rag_documents.status = 'uploaded'` |

---

### 5.4 Process the Document (6-Pass Inngest Extraction)

Processing triggers an Inngest background job that runs six Claude extraction passes followed by embedding generation.

**Steps:**

1. On the document view (or via the upload confirmation), click **Process**.
2. Observe status change on the document: `uploaded` → `processing` → `complete`.

**Route called:** `POST /api/rag/documents/{id}/process`

**What happens in the background (Inngest function `process-rag-document`):**

| Pass | Model | What it does |
|------|-------|--------------|
| Pass 1: Structure | Claude Sonnet | Identifies document sections, headings, types, and hierarchy |
| Pass 2: Policy Extraction | Claude Sonnet | Extracts rules, requirements, and conditions per section |
| Pass 3: Table Extraction | Claude Sonnet | Parses tables and structured data |
| Pass 4: Glossary & Entities | Claude Haiku | Extracts named entities, definitions, acronyms |
| Pass 5: Narrative Facts | Claude Sonnet | Extracts factual claims per section |
| Pass 6: Verification | Claude Opus | Cross-validates extracted facts for accuracy |

After the 6 passes:
- Relationship links between facts are established
- Expert questions are generated for each document section
- Contextual preambles are built per section
- 3-tier embeddings are generated (section, fact, query-level)
- Document status is finalized to `complete`

**Artifacts generated:**

| Artifact | Table | What it contains |
|----------|-------|-----------------|
| Document sections | `rag_sections` | Section titles, content, type, token count |
| Extracted facts | `rag_facts` | Individual factual claims, section reference, confidence |
| Expert questions | `rag_expert_questions` | Auto-generated Q&A pairs for each section |
| Embedding vectors | `rag_embeddings` | Vector embeddings for each section and fact |
| Embedding run log | `rag_embedding_runs` | Model used, dimensions, created_at |
| Document summary | `rag_documents.document_summary` | High-level summary from structure pass |
| Topic taxonomy | `rag_documents.topic_taxonomy` (JSONB) | Topic hierarchy |
| Entity list | `rag_documents.entity_list` (JSONB) | Named entities |
| Counts | `rag_documents.section_count`, `.fact_count`, `.question_count` | Stats |

**Monitor processing in DB:**

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
  const r = await saol.agentExecuteSQL({
    sql: \`
SELECT
  d.id, d.file_name, d.status, d.section_count, d.fact_count,
  d.question_count, d.user_id,
  (SELECT COUNT(*) FROM rag_sections s WHERE s.document_id = d.id) AS sections_stored,
  (SELECT COUNT(*) FROM rag_facts f WHERE f.document_id = d.id) AS facts_stored,
  (SELECT COUNT(*) FROM rag_embeddings e WHERE e.document_id = d.id) AS embeddings_stored
FROM rag_documents d
WHERE d.user_id = (SELECT user_id FROM rag_documents ORDER BY created_at DESC LIMIT 1)
ORDER BY d.created_at DESC
LIMIT 3;
\`,
    transport: 'pg'
  });
  console.log(JSON.stringify(r.rows, null, 2));
})();"
```

**Observe:** After processing completes, `status = 'complete'`, `sections_stored > 0`, `facts_stored > 0`, `embeddings_stored > 0`.

**Identity Spine Check:**

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
  const r = await saol.agentExecuteSQL({
    sql: \`
SELECT
  d.id, d.file_name, d.status, d.user_id,
  s.id AS section_id, s.title AS section_title
FROM rag_documents d
LEFT JOIN rag_sections s ON s.document_id = d.id
ORDER BY d.created_at DESC, s.section_order ASC
LIMIT 10;
\`,
    transport: 'pg'
  });
  console.log(JSON.stringify(r.rows, null, 2));
})();"
```

**Observe:** `rag_documents.user_id = YOUR_UUID`. Sections exist for the document.

---

### 5.5 View Document Detail

**Steps:**

1. Navigate to `https://v4-show.vercel.app/rag/{document_id}`.
2. Observe the **Detail** tab:
   - Document summary
   - Topic taxonomy
   - Entity list
   - Section list with content previews
3. Observe the **Sections** count and **Facts** count matching the DB values.

**Route called:** `GET /api/rag/documents/{id}`

**Response:**
```json
{
  "success": true,
  "data": {
    "document": { "id": "...", "status": "complete", "section_count": 12, "fact_count": 87, ... },
    "sections": [ { "id": "...", "title": "...", "content": "..." } ],
    "facts": [ { "id": "...", "claim": "...", "confidence": "high" } ]
  }
}
```

---

### 5.6 Single-Document RAG Query

**Steps:**

1. Navigate to `https://v4-show.vercel.app/rag/{document_id}` and open the **Chat** tab.
2. Select the document as the target.
3. Type a question about the document's content.
4. Click **Send** or press Enter.
5. Observe: the response cites specific sections from the document.

**Route called:** `POST /api/rag/query`

**Request body (single-document mode):**
```json
{
  "queryText": "What is the refund policy for subscription billing errors?",
  "documentId": "<document_uuid>",
  "knowledgeBaseId": "<kb_uuid>",
  "mode": "document"
}
```

**Artifacts generated:**

| Artifact | Table |
|----------|-------|
| Query record | `rag_queries` — `id`, `query_text`, `response_text`, `document_id`, `knowledge_base_id`, `mode`, `user_id=YOUR_UUID`, `created_at` |
| Quality score | `rag_quality_scores` — linked to query |

---

### 5.7 Multi-Document RAG Query

Query across all documents in a knowledge base simultaneously.

**Steps:**

1. Navigate to `https://v4-show.vercel.app/rag`.
2. Select the knowledge base (do not select a specific document).
3. Type a question.
4. Click **Send**.
5. Observe: the response synthesizes information from multiple documents, with citations indicating which document each answer segment came from.

**Route called:** `POST /api/rag/query`

**Request body (multi-document mode):**
```json
{
  "queryText": "How do the refund policy and the billing dispute process interact?",
  "knowledgeBaseId": "<kb_uuid>",
  "mode": "knowledge_base"
}
```

Note: no `documentId` — the query spans the entire knowledge base.

**Identity Spine Check for RAG Queries:**

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
  const r = await saol.agentExecuteSQL({
    sql: \`
SELECT id, query_text, mode, knowledge_base_id, document_id, user_id
FROM rag_queries
ORDER BY created_at DESC
LIMIT 5;
\`,
    transport: 'pg'
  });
  console.log(JSON.stringify(r.rows, null, 2));
})();"
```

**Observe:** `user_id = YOUR_UUID` on all queries. `document_id` is null for knowledge-base-mode queries.

---

### 5.8 Query History

**Steps:**

1. Send several queries (single-document and multi-document).
2. Call: `GET https://v4-show.vercel.app/api/rag/query?knowledgeBaseId={kb_uuid}&limit=10`
3. Observe: query history returned, scoped to your user.

---

### 5.9 Query Quality Evaluation

**Steps:**

1. After running a query, note the `queryId` from the response or from the query history.
2. Call: `POST https://v4-show.vercel.app/api/rag/quality` with `{ "queryId": "<uuid>" }`.
3. Observe: a quality score is returned and stored.

**Route called:** `POST /api/rag/quality`

**Artifacts:** `rag_quality_scores` — quality metrics for the query/response pair.

---

### 5.10 Submit RAG Feedback

**Steps:**

1. After a query, click the thumbs up or thumbs down icon.
2. The feedback is submitted.

**Route called:** `POST /api/rag/feedback`

**Request body:**
```json
{
  "queryId": "<query_uuid>",
  "feedback": "positive"
}
```

**Identity Spine Check:** The route verifies `queryRow.user_id === user.id` before accepting feedback. Attempting to submit feedback for another user's query returns an error.

---

### 5.11 Run Diagnostic Test on a Document

**Steps:**

1. Navigate to `https://v4-show.vercel.app/rag/{document_id}`.
2. Open the **Diagnostics** tab.
3. Click **Run Diagnostic Test**.

**Route called:** `POST /api/rag/documents/{id}/diagnostic-test`

**Response:**
```json
{
  "success": true,
  "results": [ { "test": "section_retrieval", "passed": true, "latency_ms": 45 } ],
  "totalElapsedMs": 312,
  "recommendation": "Document processing is healthy."
}
```

---

### 5.12 Golden Set Testing

**Steps:**

1. Navigate to `https://v4-show.vercel.app/rag/test`.
2. Select a document to test against.
3. Click **Run Batch 1** (or a specific batch number).
4. Observe: each test in the batch runs and passes/fails against expected answers.
5. View the test run history.

**Route called:** `POST /api/rag/test/golden-set`

**Request body:**
```json
{
  "batch": 1,
  "documentId": "<document_uuid>"
}
```

**Artifacts generated:**

| Artifact | Table |
|----------|-------|
| Test run | `rag_test_reports` — `document_id`, `user_id`, `batch_results`, `pass_rate`, `created_at` |

---

### 5.13 RAG Module — 401 Rejection Test

```bash
curl -s -o /dev/null -w "%{http_code}" https://v4-show.vercel.app/api/rag/knowledge-bases
```

**Observe:** `401`.

---

## Part 6: Cross-Module Identity Spine Verification

This section provides the consolidated database verification queries to confirm that every module stamps records with `YOUR_UUID` and that the NOT NULL constraints and RLS policies are enforced.

---

### 6.1 Full Identity Stamp Audit — All Modules

Run this single consolidated query to verify all modules in one pass:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
  const r = await saol.agentExecuteSQL({
    sql: \`
SELECT 'conversations' AS module, COUNT(*) AS total_records,
  COUNT(*) FILTER (WHERE user_id IS NULL) AS null_user_ids,
  COUNT(*) FILTER (WHERE created_by IS NULL) AS null_created_by
FROM conversations
UNION ALL
SELECT 'batch_jobs', COUNT(*), COUNT(*) FILTER (WHERE user_id IS NULL), COUNT(*) FILTER (WHERE created_by IS NULL) FROM batch_jobs
UNION ALL
SELECT 'generation_logs', COUNT(*), 0, COUNT(*) FILTER (WHERE created_by IS NULL) FROM generation_logs
UNION ALL
SELECT 'failed_generations', COUNT(*), 0, COUNT(*) FILTER (WHERE created_by IS NULL) FROM failed_generations
UNION ALL
SELECT 'training_files', COUNT(*), COUNT(*) FILTER (WHERE user_id IS NULL), COUNT(*) FILTER (WHERE created_by IS NULL) FROM training_files
UNION ALL
SELECT 'datasets', COUNT(*), COUNT(*) FILTER (WHERE user_id IS NULL), COUNT(*) FILTER (WHERE created_by IS NULL) FROM datasets
UNION ALL
SELECT 'pipeline_training_jobs', COUNT(*), COUNT(*) FILTER (WHERE user_id IS NULL), COUNT(*) FILTER (WHERE created_by IS NULL) FROM pipeline_training_jobs
UNION ALL
SELECT 'rag_knowledge_bases', COUNT(*), COUNT(*) FILTER (WHERE user_id IS NULL), 0 FROM rag_knowledge_bases
UNION ALL
SELECT 'rag_documents', COUNT(*), COUNT(*) FILTER (WHERE user_id IS NULL), 0 FROM rag_documents
UNION ALL
SELECT 'rag_queries', COUNT(*), COUNT(*) FILTER (WHERE user_id IS NULL), 0 FROM rag_queries
ORDER BY module;
\`,
    transport: 'pg'
  });
  console.log(JSON.stringify(r.rows, null, 2));
})();"
```

**Expected:** `null_user_ids = 0` and `null_created_by = 0` for every module with records.

---

### 6.2 Confirm NOT NULL Constraints Are Enforced

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
  const r = await saol.agentExecuteSQL({
    sql: \`
SELECT table_name, column_name, is_nullable
FROM information_schema.columns
WHERE table_name IN ('conversations','training_files','batch_jobs','generation_logs','documents')
AND column_name = 'user_id'
ORDER BY table_name;
\`,
    transport: 'pg'
  });
  console.log(JSON.stringify(r.rows, null, 2));
})();"
```

**Expected:** All 5 rows show `is_nullable: 'NO'`.

---

### 6.3 Confirm RLS Is Enabled on All Target Tables

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
  const r = await saol.agentExecuteSQL({
    sql: \`
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('conversations','documents','notifications','cost_records','metrics_points')
ORDER BY tablename;
\`,
    transport: 'pg'
  });
  console.log(JSON.stringify(r.rows, null, 2));
})();"
```

**Expected:** `rowsecurity: true` for all tables listed.

---

### 6.4 Confirm User Indexes Exist

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
  const r = await saol.agentExecuteSQL({
    sql: \`
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%user_id%'
ORDER BY tablename, indexname;
\`,
    transport: 'pg'
  });
  console.log(r.rows?.length + ' indexes');
  console.log(JSON.stringify(r.rows, null, 2));
})();"
```

**Expected:** At minimum 8 indexes on `user_id` columns (conversations, training_files, batch_jobs, generation_logs, documents, export_logs, failed_generations, and the composite `conversations(user_id, created_at DESC)`).

---

### 6.5 Confirm Conversation RLS Policies

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
  const r = await saol.agentExecuteSQL({
    sql: \`
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('conversations', 'documents')
ORDER BY tablename, policyname;
\`,
    transport: 'pg'
  });
  console.log(JSON.stringify(r.rows, null, 2));
})();"
```

**Expected for `conversations`:** 4 policies (one each for SELECT, INSERT, UPDATE, DELETE). No duplicate "their own" variants.

**Expected for `documents`:** At least 5 policies (documents_select_own, documents_insert_own, documents_update_own, documents_delete_own, documents_service_all).

---

### 6.6 Cross-User Isolation Test

Perform this test with **two separate browser sessions** (e.g. one normal window and one private/incognito window), both pointed at `https://v4-show.vercel.app`.

**Steps:**

1. **Session A** (your primary account): Create a conversation. Note its `id`.
2. **Session B** (a second account): sign in as a different user.
3. From **Session B**, navigate to: `https://v4-show.vercel.app/api/conversations/{id_from_session_A}`
4. **Observe:** `404 Not Found` — not `403 Forbidden`. The record appears not to exist.
5. From **Session B**, attempt: `PATCH https://v4-show.vercel.app/api/conversations/{id_from_session_A}` with `{ "status": "approved" }`
6. **Observe:** `404 Not Found`.
7. From **Session B**, call: `GET https://v4-show.vercel.app/api/conversations`
8. **Observe:** The list does not contain any conversations from Session A.

---

### 6.7 Spoofed Header Test

The identity spine removes all reliance on the `x-user-id` HTTP header. Verify this is the case against the Vercel deployment.

**Steps:**

From **Session B**, call the conversations endpoint with a spoofed header pointing to Session A's UUID:

```bash
curl -s \
  -H "x-user-id: SESSION_A_UUID" \
  -H "Cookie: YOUR_SESSION_B_COOKIE" \
  https://v4-show.vercel.app/api/conversations
```

**To get your Vercel session cookie:** Open DevTools → Application → Cookies → copy the `sb-*-auth-token` cookie value.

**Observe:** The response returns only Session B's conversations. The `x-user-id` header is ignored entirely.

---

### 6.8 Unauthenticated Rejection Test

All endpoints must return `401` when called without a session cookie against the Vercel deployment.

```bash
for endpoint in \
  "/api/conversations" \
  "/api/training-files" \
  "/api/datasets" \
  "/api/pipeline/jobs" \
  "/api/rag/knowledge-bases" \
  "/api/batch-jobs" \
  "/api/generation-logs" \
  "/api/failed-generations" \
  "/api/export/history"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://v4-show.vercel.app${endpoint}")
  echo "${endpoint}: ${code}"
done
```

**Expected output:**
```
/api/conversations: 401
/api/training-files: 401
/api/datasets: 401
/api/pipeline/jobs: 401
/api/rag/knowledge-bases: 401
/api/batch-jobs: 401
/api/generation-logs: 401
/api/failed-generations: 401
/api/export/history: 401
```

---

## Appendix A: Operational Artifacts Reference

### Conversations Module

| Artifact | Location | Populated by |
|----------|----------|-------------|
| Conversation record | `conversations` table | `POST /api/conversations/generate` |
| Turn records | `legacy_conversation_turns` | Stored during generation |
| Raw file | Storage: `conversation-files/UUID/id/raw.json` | Generation step |
| Enriched file | Storage: `conversation-files/UUID/id/enriched.json` | `POST /api/conversations/id/enrich` |
| Validation report | Storage: `conversation-files/UUID/id/validation_report.json` | Enrichment step |
| Generation log | `generation_logs` | Every generation call |
| Failed generation | `failed_generations` | When generation fails |
| Batch job | `batch_jobs` | `POST /api/conversations/generate-batch` |
| Batch items | `batch_job_items` | Created with batch job |

### Training Files Module

| Artifact | Location | Populated by |
|----------|----------|-------------|
| Training file record | `training_files` table | `POST /api/training-files` |
| File associations | `training_file_conversations` | Same call |
| JSON file | Storage: `training-files/id.json` | Same call |
| JSONL file | Storage: `training-files/id.jsonl` | Same call |

### Datasets Module

| Artifact | Location | Populated by |
|----------|----------|-------------|
| Dataset record | `datasets` table | `POST /api/datasets/import-from-training-file` |

### Pipeline Module

| Artifact | Location | Populated by |
|----------|----------|-------------|
| Training job | `pipeline_training_jobs` | `POST /api/pipeline/jobs` |
| Training metrics | `pipeline_training_metrics` | RunPod during training |
| Inference endpoints | `pipeline_inference_endpoints` | `POST /api/pipeline/adapters/deploy` |
| Test results | `pipeline_test_results` | `POST /api/pipeline/adapters/test` |
| Evaluation results | `pipeline_evaluation_results` | Automatic evaluation |
| Evaluation runs | `pipeline_evaluation_runs` | Per evaluation batch |
| Adapter files | Storage: (adapter_file_path) | Training completion |

### RAG Module

| Artifact | Location | Populated by |
|----------|----------|-------------|
| Knowledge base | `rag_knowledge_bases` | `POST /api/rag/knowledge-bases` |
| Document record | `rag_documents` | `POST /api/rag/documents` |
| Document file | Storage: `rag-documents/UUID/doc_id/filename` | `POST /api/rag/documents/id/upload` |
| Document sections | `rag_sections` | Inngest pass 1 |
| Extracted facts | `rag_facts` | Inngest passes 2–5 |
| Expert questions | `rag_expert_questions` | Post-pass step |
| Embeddings | `rag_embeddings` | Post-pass step |
| Embedding run | `rag_embedding_runs` | Per embedding batch |
| Quality scores | `rag_quality_scores` | `POST /api/rag/quality` |
| Query records | `rag_queries` | `POST /api/rag/query` |
| Test reports | `rag_test_reports` | `POST /api/rag/test/golden-set/reports` |

---

## Appendix B: Identity Spine Fields by Table

| Table | `user_id` | `created_by` | NOT NULL | RLS |
|-------|-----------|--------------|----------|-----|
| `conversations` | YES | YES | `user_id` YES | YES |
| `training_files` | YES | YES | `user_id` YES | NO |
| `batch_jobs` | YES | YES | `user_id` YES | NO |
| `generation_logs` | NO | YES | — | NO |
| `failed_generations` | NO | YES | — | NO |
| `datasets` | YES | YES | — | NO |
| `pipeline_training_jobs` | YES | YES | — | NO |
| `documents` (RAG) | YES | — | `user_id` YES | YES |
| `rag_knowledge_bases` | YES | — | — | NO |
| `rag_documents` | YES | — | — | NO |
| `rag_queries` | YES | — | — | NO |
| `notifications` | YES | — | — | YES |
| `cost_records` | YES | — | — | YES |
| `metrics_points` | YES | — | — | YES |

---

## Appendix C: Complete Build Sequence (Ground Up)

To exercise the entire platform in dependency order against `https://v4-show.vercel.app`:

```
1.  Sign up → Sign in at https://v4-show.vercel.app/signup
2.  Generate 5+ conversations via template (1.1)
3.  Generate 5+ conversations via scaffolding (1.2)
4.  Enrich all conversations (1.3)
5.  Approve at least 5 conversations (1.4)
6.  Create a training file from approved conversations (2.1)
7.  Download and inspect the JSON training file (2.3)
8.  Download and inspect the JSONL training file (2.4)
9.  Import the training file as a dataset (3.1)
10. Confirm the dataset (3.2)
11. Create a LoRA training job using the dataset (4.1)
12. Monitor training to completion (4.2)
13. Deploy the adapter (4.4)
14. Run A/B test with the adapter (4.5)
15. Chat with the trained model (4.6)
16. Download the adapter weights (4.7)
17. Create a RAG knowledge base (5.1)
18. Upload one or more documents (5.2 → 5.3)
19. Process the documents (5.4) — wait for status = 'complete'
20. Run single-document RAG query (5.6)
21. Upload a second document, process it
22. Run multi-document RAG query (5.7)
23. Run Part 6 identity spine verification queries (SAOL — local)
```
