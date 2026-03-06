# Golden-Set Regression Test Tool — User Tutorial

**Date:** February 17, 2026  
**Tool Location:** `/rag/test` (dashboard page)  
**API Endpoint:** `/api/rag/test/golden-set`

---

## What This Tool Does

Runs 20 pre-defined Q&A pairs against the Sun Chip Bank document via the RAG pipeline (`queryRAG`), then reports how many answers contain the expected substring. The target is **≥85% pass rate**.

This tool runs **server-side on Vercel** — no CLI, no manual cookie extraction, no terminal. You use it through your browser while logged into BrightHub.

---

## Prerequisites

Before running the test, ensure:

1. **The Sun Chip Bank document is ingested** — Document ID `ceff906e-968a-416f-90a6-df2422519d2b` must exist in the database with `status = 'ready'` and embeddings generated.
2. **Environment variables are set on Vercel** — `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` must all be configured in your Vercel project settings.
3. **You are logged into BrightHub** — The tool uses your browser session for authentication.

> **Note:** The tool will verify all of these automatically via "pre-flight checks" before running any queries. If something is missing, it will tell you exactly what failed.

---

## Step-by-Step: Running the Golden-Set Test

### Step 1: Deploy to Vercel

Push the code to your deployment branch:

```bash
git add -A
git commit -m "E06: Add golden-set regression test tool"
git push
```

Wait for the Vercel deployment to complete.

### Step 2: Navigate to the Test Page

Open your browser and go to:

```
https://<your-vercel-domain>/rag/test
```

For example: `https://v4-show.vercel.app/rag/test`

You should see the **RAG Golden-Set Regression Test** page with a **Run Test** button.

### Step 3: (Optional) Verify the Health Check

You can confirm the endpoint is live by visiting:

```
https://<your-vercel-domain>/api/rag/test/golden-set
```

This should return:

```json
{
  "available": true,
  "testCount": 20,
  "targetPassRate": 85,
  "documentId": "ceff906e-968a-416f-90a6-df2422519d2b"
}
```

### Step 4: Click "Run Test"

1. Click the **▶ Run Test** button.
2. The button changes to **⏳ Running...** and a progress indicator appears.
3. Wait **2–5 minutes**. The tool runs all 20 queries sequentially with a 500ms delay between each to avoid rate limiting.

> **Important:** The Vercel function has a `maxDuration` of 300 seconds (5 minutes). If your Vercel plan's function timeout is lower (e.g., 60s on Hobby), the test may time out. Pro plan allows up to 300s. If this is an issue, the test will return a 504 error.

### Step 5: Read the Results

When complete, the page shows:

#### Pre-Flight Checks Panel
- ✅/❌ for each check: Document exists, Embeddings exist, RPC function, API keys, KB link
- If any **critical** check fails, the test stops here and tells you what to fix

#### Summary Card
- **Pass/Fail** badge (green if ≥85%, red otherwise)
- Stats: Passed, Failed, Errored, Pass Rate, Avg Response Time, Avg Self-Eval Score
- Difficulty breakdown: Easy (5), Medium (9), Hard (6) — with pass counts

#### Results Tab
- Each of the 20 questions listed with ✅/❌/⚠️ icon
- Click any row to expand and see:
  - Expected substring vs. actual response (first 500 chars)
  - Self-eval score
  - Diagnostics: HyDE generated, sections retrieved, facts retrieved
  - Error phase and stack trace (if errored)

#### Errors Tab (if any errors)
- Shows error breakdown by pipeline phase (e.g., `embedding-search`, `hyde`, `llm-response`)
- Lists only the errored queries for focused debugging

---

## Interpreting Results

| Status | Icon | Meaning |
|--------|------|---------|
| **Passed** | ✅ | Response contains the expected substring |
| **Failed** | ❌ | Response was generated but doesn't contain expected substring |
| **Errored** | ⚠️ | Infrastructure failure — query didn't complete (check `errorPhase`) |

### Error Phases

If a query errors, the `errorPhase` tells you which pipeline step failed:

| Phase | What Failed |
|-------|-------------|
| `embedding-search` | Similarity search or embedding generation |
| `hyde` | HyDE hypothetical document generation |
| `llm-response` | Claude response generation |
| `self-eval` | Self-evaluation step |
| `db-insert` | Storing the query result in the database |
| `reranking` | Claude Haiku reranking step |
| `text-search` | Full-text search (tsvector) |
| `unknown` | Error didn't match any known pattern |

### What "Good" Looks Like

- **Pass Rate ≥ 85%** — at least 17/20 questions pass
- **Easy: 5/5** — these are direct lookups and should always pass
- **Medium: 7–9/9** — some may fail on edge cases
- **Hard: 4–6/6** — cross-section synthesis is hardest
- **Avg Response Time: < 15s** — indicates healthy pipeline performance
- **Zero Errored** — errors indicate infrastructure problems, not RAG quality

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| **401 Unauthorized** | You're not logged in. Log into BrightHub first, then retry. |
| **504 Gateway Timeout** | Vercel function timed out. Check your plan's `maxDuration` limit. Pro plan supports 300s. |
| **Pre-flight: Document not found** | The canonical document ID may have changed. Check `rag_documents` table for the Sun Chip Bank doc. |
| **Pre-flight: No embeddings** | Document needs to be reprocessed. Go to `/rag`, find the document, and trigger processing. |
| **Pre-flight: RPC function not found** | The `match_rag_embeddings_kb` database function is missing. Run the migration that creates it. |
| **All queries error with same phase** | Systematic issue — check Vercel function logs for the root cause. |
| **Low pass rate but no errors** | RAG quality issue — the pipeline is working but answers don't contain expected substrings. Review individual responses to understand why. |

---

## Quick Reference

| Item | Value |
|------|-------|
| Test page URL | `https://<domain>/rag/test` |
| Health check URL | `https://<domain>/api/rag/test/golden-set` |
| Target document | `ceff906e-968a-416f-90a6-df2422519d2b` (Sun Chip Bank) |
| Number of questions | 20 (5 easy, 9 medium, 6 hard) |
| Target pass rate | ≥85% |
| Expected runtime | 2–5 minutes |
| Max function duration | 300 seconds |
| Auth method | Browser session (automatic via `requireAuth`) |
