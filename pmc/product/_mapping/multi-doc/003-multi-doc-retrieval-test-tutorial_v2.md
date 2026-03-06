# Multi-Document Retrieval — Testing Tutorial (Vercel)

**Version:** 2.0  
**Date:** February 20, 2026  
**For:** Human tester — Vercel deployment workflow only

---

## Prerequisites

**Before starting any test:**

1. Commit and push all E01–E04 changes to GitHub
2. Wait for the Vercel build to complete and show **Ready** in the Vercel dashboard
3. Open the deployed app URL (e.g. `https://your-app.vercel.app`)
4. Sign in if required

**For log verification tests (Section 4):**

- Open the [Vercel Dashboard](https://vercel.com/dashboard) → your project → **Logs** tab
- Keep this tab open alongside the app

**For DB verification tests (Section 5):**

- Open a local terminal at `c:/Users/james/Master/BrightHub/BRun/v4-show`
- The SAOL scripts connect directly to Supabase — no local server needed

---

## Section 1 — Setup: Create a Knowledge Base with 2+ Documents

Do this once before running any other tests.

**1.1 Create the KB:**

1. Navigate to **RAG Frontier** (top nav)
2. Click **New Knowledge Base**
3. Name it `Test KB`
4. Click **Create**

**1.2 Upload Document A:**

1. Click on `Test KB` in the KB list
2. Upload any PDF, DOCX, TXT, or MD file — call it **Doc A**
3. Wait until the status badge next to Doc A shows **ready** (green)
   - Inngest processing runs in the background — this can take 1–5 minutes per document on Vercel

**1.3 Upload Document B:**

1. Upload a second, different file — call it **Doc B**
2. Wait until Doc B also shows **ready**

You now have a KB with 2 ready documents. Proceed to Section 2.

---

## Section 2 — UI Entry Point Tests

### Test 2.1: "Chat with All Documents" button on KB Dashboard

1. Navigate to **RAG Frontier** → top-level KB list
2. Locate the `Test KB` card
3. Confirm a **"Chat with All Documents"** button is visible inside the card, below the document count line
4. If you have another KB with only 1 document, confirm that card has **no** such button
5. Click **"Chat with All Documents"** on `Test KB`
6. Confirm the page shows the chat view with `Test KB` in the header

---

### Test 2.2: Scope indicator in RAGChat (KB-wide)

1. From the KB chat view opened in Test 2.1, look at the card header
2. Below the "Chat with [KB name]" title, confirm the line reads:
   > `Searching across all documents in knowledge base`
   (with a small database icon to the left)
3. Confirm the **ModeSelector** is still present below that line

---

### Test 2.3: Scope indicator in RAGChat (document-level)

1. Navigate to **RAG Frontier** → click on `Test KB`
2. In the document list, click on **Doc A** (routes to `/rag/[docId]`)
3. On the RAGChat card header, confirm the line reads:
   > `Searching: [Doc A filename]`
   (with a small file icon to the left)

---

### Test 2.4: "Chat with all documents" card in Document List

1. Navigate to **RAG Frontier** → click on `Test KB`
2. At the **top** of the document list — above the individual document rows — confirm a dashed card is visible showing:
   - A MessageCircle icon
   - Bold text: **"Chat with all documents"**
   - Sub-text: **"Search across 2 ready documents"**
3. Click the card
4. Confirm the page transitions to the RAGChat view and the KB-wide scope indicator appears (as in Test 2.2)

---

### Test 2.5: "Back to Documents" navigation

1. From the KB-wide chat view (entered via Test 2.1 or Test 2.4)
2. Click **"Back to Documents"**
3. Confirm you land on the document list for `Test KB` — not the top-level KB list
4. Confirm Doc A and Doc B are still visible

---

## Section 3 — Query & Response Tests

### Test 3.1: Basic KB-wide query

1. Open the KB-wide chat view for `Test KB`
2. Type: `What are the main topics covered across these documents?`
3. Press **Enter** or click **Send**
4. Wait for the response (up to ~45 seconds on Vercel cold start)
5. Confirm a non-empty response text appears with no error message

---

### Test 3.2: Multi-document citations with document provenance

1. In the response from Test 3.1, scroll to the **Sources** section at the bottom of the bot message
2. Confirm each `[N] Section Name` badge has a `📄 [filename]` label **visibly** below it (it is not hidden inside the hover tooltip)
3. Confirm at least one citation shows Doc A's filename and at least one shows Doc B's filename

---

### Test 3.3: Single-document regression

1. Navigate to Doc A's individual chat page (`/rag/[docId]`)
2. Ask: `What is the main topic of this document?`
3. Confirm:
   - A response is generated successfully
   - All `📄` citation labels show only Doc A's filename — no Doc B filename appears
   - Scope indicator shows `Searching: [Doc A filename]`

---

### Test 3.4: Conversation context (follow-up)

1. In the KB-wide chat view, ask: `What policies are described?`
2. Wait for the response
3. Follow up with: `What are the exceptions to those?`
4. Confirm the second response discusses exceptions to the policies just mentioned — it should not ask you to clarify which policies

---

## Section 4 — Phase 2 Query Decomposition Tests (via Vercel Logs)

For each test below:

1. Send the query from the app
2. Immediately switch to **Vercel Dashboard** → your project → **Logs** tab
3. In the Logs search box, type `[RAG Retrieval]` to filter
4. Look for the log lines specified in each test

> **Tip:** Vercel function logs appear within ~5–10 seconds of the request completing. If nothing appears immediately, wait a few seconds and refresh the Logs view.

---

### Test 4.1: Simple query classification

1. In the KB-wide chat, ask: `What is the document dated?`
2. In Vercel Logs, confirm:
   ```
   [RAG Retrieval] Query classification: simple
   ```
3. Confirm no sub-query log lines appear for this request

---

### Test 4.2: Comparative query classification

1. In the KB-wide chat, ask: `How do the policies in these documents compare to each other?`
2. In Vercel Logs, confirm:
   ```
   [RAG Retrieval] Query classification: comparative (N sub-queries)
   [RAG Retrieval] Running N sub-queries for comparative query
   ```
3. Confirm the response names or references content from both documents

---

### Test 4.3: Multi-hop query classification

1. In the KB-wide chat, ask a question that bridges both documents, e.g.:
   `What requirements from Doc A are referenced or addressed in Doc B?`
   *(Substitute actual topic names from your uploaded documents)*
2. In Vercel Logs, confirm:
   ```
   [RAG Retrieval] Query classification: multi-hop (N sub-queries)
   [RAG Retrieval] Running N sub-queries for multi-hop query
   [RAG Retrieval] Multi-hop query complete in NNNms
   ```
3. Confirm the response synthesises information from both documents

---

### Test 4.4: Multi-hop fallback — no crash

1. In the KB-wide chat, ask something deliberately off-topic for both documents:
   `How does the IPv6 routing protocol in doc A interact with the blockchain consensus mechanism in doc B?`
2. In Vercel Logs, confirm either:
   - `[RAG Retrieval] Query classification: simple` (classifier routed it simply), OR
   - `[RAG Retrieval] Multi-hop sub-queries returned no results — falling back to standard retrieval`
3. Confirm the UI shows a normal response or "no relevant content" message — no 500 error, no blank page

---

## Section 5 — API & Database Verification

### Test 5.1: Get your KB ID

Run this from your local terminal:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async () => {
  const kbs = await saol.agentQuery({ table: 'rag_knowledge_bases', select: 'id, name', limit: 10 });
  console.log(JSON.stringify(kbs.data, null, 2));
})();"
```

Copy the `id` for `Test KB`. Use it in Tests 5.2 and 5.3.

---

### Test 5.2: KB-wide query via curl against Vercel

Replace `YOUR_VERCEL_URL` with your deployed app URL and `YOUR_KB_ID` with the ID from Test 5.1:

```bash
curl -X POST https://YOUR_VERCEL_URL/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{"queryText": "What are the key policies?", "knowledgeBaseId": "YOUR_KB_ID", "mode": "rag_only"}'
```

Confirm the JSON response contains:
- `"success": true`
- `"data.responseText"` is non-empty
- `"data.citations"` is a non-empty array
- At least one citation object has a `"documentName"` field set

---

### Test 5.3: Verify `query_scope` stored in DB

Run after Test 5.2:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async () => {
  const r = await saol.agentQuery({
    table: 'rag_queries',
    select: 'query_text, query_scope, knowledge_base_id',
    orderBy: { column: 'created_at', ascending: false },
    limit: 5
  });
  console.log(JSON.stringify(r.data, null, 2));
})();"
```

Confirm the most recent row shows:
- `"query_scope": "knowledge_base"`
- `"knowledge_base_id"` is not null

---

### Test 5.4: Missing scope — expect error (not 500)

```bash
curl -X POST https://YOUR_VERCEL_URL/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{"queryText": "Test", "mode": "rag_only"}'
```

Confirm the response is a 4xx error or contains a message referencing missing `documentId` or `knowledgeBaseId`. Confirm it is **not** a 500.

---

## Section 6 — Edge Case Tests

### Test 6.1: KB with only 1 document — no KB-wide UI elements

1. Create a new KB with exactly 1 uploaded, **ready** document
2. On its KB card in the dashboard, confirm **no** "Chat with All Documents" button appears
3. Click into that KB — confirm **no** "Chat with all documents" dashed card appears above the document list

---

### Test 6.2: Deduplication — same document uploaded twice

1. Upload **Doc A** again to `Test KB` under a different filename (e.g. `doc-a-v2.pdf`)
2. Wait for it to reach **ready**
3. Open KB-wide chat and ask: `What is the main topic?`
4. In the **Sources** section of the response, confirm the same section title does not appear twice

---

## Section 7 — Pass/Fail Checklist

| # | Check | Pass |
|---|-------|------|
| 2.1 | "Chat with All Documents" button visible on 2+ doc KB cards | ☐ |
| 2.1 | Button absent on 0–1 doc KB cards | ☐ |
| 2.2 | KB-wide scope indicator: "Searching across all documents..." | ☐ |
| 2.3 | Doc-level scope indicator: "Searching: [filename]" | ☐ |
| 2.4 | "Chat with all documents" card at top of document list | ☐ |
| 2.5 | "Back to Documents" returns to document list (not KB list) | ☐ |
| 3.1 | KB-wide query returns non-empty response | ☐ |
| 3.2 | Citations show `📄 [filename]` label below badge | ☐ |
| 3.2 | Citations from multiple documents appear in one response | ☐ |
| 3.3 | Document-level query still works (regression) | ☐ |
| 3.3 | Document-level citations only cite that document | ☐ |
| 3.4 | Follow-up question uses context from prior answer | ☐ |
| 4.1 | Vercel Logs show `classification: simple` for direct queries | ☐ |
| 4.2 | Vercel Logs show `classification: comparative` + sub-queries | ☐ |
| 4.3 | Vercel Logs show `classification: multi-hop` + completion | ☐ |
| 4.4 | No 500 / crash when multi-hop sub-queries return empty | ☐ |
| 5.2 | curl against Vercel URL returns `success: true` with citations | ☐ |
| 5.3 | DB row has `query_scope = knowledge_base` | ☐ |
| 5.4 | Query without scope returns 4xx error (not 500) | ☐ |
| 6.1 | 1-doc KB shows no KB-wide chat entry points | ☐ |
| 6.2 | Duplicate document does not produce duplicate citations | ☐ |
