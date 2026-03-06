# Multi-Document Retrieval — Testing Tutorial

**Version:** 1.0  
**Date:** February 20, 2026  
**For:** Human tester after E01–E04 implementation  

---

## Prerequisites

Before running any test below:

1. Run `npm run dev` in `c:/Users/james/Master/BrightHub/BRun/v4-show`
2. Open the app at `http://localhost:3000`
3. Open your browser DevTools → **Console** tab (for log verification steps)
4. Open your browser DevTools → **Network** tab (for API response verification steps)

---

## Section 1 — Setup: Create a Knowledge Base with 2+ Documents

You need a KB with at least 2 ready documents for every test below. Do this once before starting.

**1.1 Create the KB:**

1. Navigate to **RAG Frontier** (top nav)
2. Click **New Knowledge Base**
3. Enter a name, e.g. `Test KB`
4. Click **Create**

**1.2 Upload Document A:**

1. Click on `Test KB` in the KB list
2. In the Upload panel, upload any PDF, DOCX, TXT, or MD file — call it **Doc A**
3. Wait until the status badge next to Doc A shows **ready** (green)

**1.3 Upload Document B:**

1. Upload a second, different file — call it **Doc B**
2. Wait until Doc B also shows **ready**

You now have a KB with 2 ready documents. Proceed to Section 2.

---

## Section 2 — UI Entry Point Tests

### Test 2.1: "Chat with All Documents" button on KB Dashboard

**Expected:** Button appears on KB cards with 2+ documents; absent on KB cards with 0–1 documents.

1. Navigate to **RAG Frontier** → top-level KB list
2. Locate the `Test KB` card
3. Confirm a **"Chat with All Documents"** button is visible inside the card (below the document count)
4. If you have another KB with only 1 document, confirm that KB card has **no** such button
5. Click **"Chat with All Documents"** on `Test KB`
6. Confirm the page transitions to the chat view with the header showing `Test KB`

---

### Test 2.2: Scope indicator in RAGChat (KB-wide)

**Expected:** "Searching across all documents in knowledge base" with a Database icon appears below the chat title.

1. From the KB chat view you opened in Test 2.1, look at the card header
2. Below the "Chat with [KB name]" title, confirm the line reads:
   > `🗄 Searching across all documents in knowledge base`
3. Confirm the **ModeSelector** is still present below that line

---

### Test 2.3: Scope indicator in RAGChat (document-level)

**Expected:** "Searching: [document name]" with a FileText icon appears.

1. Navigate to **RAG Frontier** → select `Test KB`
2. In the document list, click on **Doc A** (this routes to `/rag/[docId]`)
3. On the RAGChat card header, confirm the line reads:
   > `📄 Searching: [Doc A filename]`

---

### Test 2.4: "Chat with all documents" card in Document List

**Expected:** A dashed card appears at the top of the document list when 2+ documents are ready.

1. Navigate to **RAG Frontier** → click on `Test KB`
2. At the top of the document list (before the individual document rows), confirm a dashed card is visible with:
   - A MessageCircle icon
   - Text: **"Chat with all documents"**
   - Sub-text: **"Search across 2 ready documents"** (number matches your ready doc count)
3. Click the card
4. Confirm the page transitions to the RAGChat view with `knowledgeBaseId` scope (check the scope indicator from Test 2.2 appears)

---

### Test 2.5: "Back to Documents" navigation

**Expected:** Back button returns to the document list for the same KB, not to the KB list.

1. From the KB-wide chat view (entered via either Test 2.1 or Test 2.4)
2. Click **"Back to Documents"**
3. Confirm you land on the document list view for `Test KB` (not the top-level KB list)
4. Confirm Doc A and Doc B are still visible in the list

---

## Section 3 — Query & Response Tests

### Test 3.1: Basic KB-wide query

1. Open the KB-wide chat view for `Test KB` (via the "Chat with All Documents" button)
2. Type: `What are the main topics covered across these documents?`
3. Press **Enter** or click **Send**
4. Wait for the response (up to ~30 seconds)
5. Confirm:
   - A response text appears
   - The response is not empty or an error message

---

### Test 3.2: Multi-document citations with document provenance

**Expected:** Citations show `📄 [document filename]` label below each badge.

1. Remain in the KB-wide chat from Test 3.1
2. Scroll to the response's **Sources** section at the bottom of the bot message
3. Confirm each `[N] Section Name` badge has a `📄 [filename]` label visible below it (not just in hover tooltip)
4. Confirm at least one citation references Doc A and at least one references Doc B (proving cross-document retrieval)

---

### Test 3.3: Single-document regression

**Expected:** Document-level chat still works exactly as before; only that document's citations appear.

1. Navigate to Doc A's individual chat page (`/rag/[docId]`)
2. Ask: `What is the main topic of this document?`
3. Confirm:
   - Response is generated successfully
   - All citations reference only Doc A (no Doc B filename in any `📄` label)
   - Scope indicator shows `📄 Searching: [Doc A filename]`

---

### Test 3.4: Conversation context (follow-up)

1. In the KB-wide chat view, ask: `What policies are described?`
2. Wait for the response
3. Follow up immediately with: `What are the exceptions to those?`
4. Confirm the second response references the policies mentioned in the first response (it should not ask you to clarify which policies you mean)

---

## Section 4 — Phase 2 Query Decomposition Tests

These tests verify the server-side classification logic. You will confirm the results via browser console / server terminal logs.

### Test 4.1: Simple query classification

1. Open the **server terminal** running `npm run dev`
2. In the KB-wide chat, ask a direct, factual question:
   `What is the document dated?`
3. In the server terminal, look for the log line:
   ```
   [RAG Retrieval] Query classification: simple
   ```
4. Confirm the response is generated normally (no sub-query logs appear)

---

### Test 4.2: Comparative query classification

1. In the KB-wide chat, ask:
   `How do the policies in these documents compare to each other?`
2. In the server terminal, look for:
   ```
   [RAG Retrieval] Query classification: comparative (N sub-queries)
   [RAG Retrieval] Running N sub-queries for comparative query
   ```
3. Confirm the response names or references content from multiple documents

---

### Test 4.3: Multi-hop query classification

1. In the KB-wide chat, ask:
   `What does document A say about the requirements referenced in document B?`
   *(Use actual topic names from your uploaded docs for best results)*
2. In the server terminal, look for:
   ```
   [RAG Retrieval] Query classification: multi-hop (N sub-queries)
   [RAG Retrieval] Running N sub-queries for multi-hop query
   [RAG Retrieval] Multi-hop query complete in NNNms
   ```
3. Confirm the response synthesises information from multiple documents

---

### Test 4.4: Multi-hop fallback to standard path

**Expected:** When sub-queries return no results, the system falls back without error.

1. Create a new KB with 2+ ready documents that have very minimal, unrelated content
2. In KB-wide chat, ask a deeply specific multi-hop question that is unlikely to match anything:
   `How does the IPv6 routing protocol in doc A interact with the blockchain consensus mechanism in doc B?`
3. In the server terminal, confirm either:
   - `[RAG Retrieval] Query classification: simple` (classifier routed it simply), OR
   - `[RAG Retrieval] Multi-hop sub-queries returned no results — falling back to standard retrieval` followed by a normal response
4. Confirm no 500 error or crash occurs — the UI shows either a response or a "no relevant content" message

---

## Section 5 — API-Level Tests

### Test 5.1: KB-wide query via curl

1. Open the browser and run the SAOL script to find your KB ID:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async () => {
  const kbs = await saol.agentQuery({ table: 'rag_knowledge_bases', select: 'id, name', limit: 10 });
  console.log(JSON.stringify(kbs.data, null, 2));
})();"
```

2. Copy your `Test KB` ID from the output
3. Run:

```bash
curl -X POST http://localhost:3000/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{"queryText": "What are the key policies?", "knowledgeBaseId": "YOUR_KB_ID_HERE", "mode": "rag_only"}'
```

4. Confirm the response JSON contains:
   - `"success": true`
   - `"data.responseText"` is non-empty
   - `"data.citations"` is a non-empty array
   - At least one citation has a `"documentName"` field

---

### Test 5.2: Verify `query_scope` stored correctly in DB

1. After running Test 5.1, run:

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

2. Confirm the most recent row shows:
   - `"query_scope": "knowledge_base"`
   - `"knowledge_base_id"` is not null

---

### Test 5.3: Missing scope — expect error

```bash
curl -X POST http://localhost:3000/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{"queryText": "Test", "mode": "rag_only"}'
```

Confirm the response is a 4xx or contains an error message referencing missing `documentId` or `knowledgeBaseId`.

---

## Section 6 — Edge Case Tests

### Test 6.1: KB with only 1 document — no KB-wide UI

1. Create a new KB and upload exactly 1 document. Wait for `ready`
2. On the KB card in the dashboard, confirm **no** "Chat with All Documents" button appears
3. On the document list for that KB, confirm **no** "Chat with all documents" card appears at the top

---

### Test 6.2: KB with 1 document — classification short-circuits

1. In a KB with exactly 1 document, navigate to `/rag/[docId]` and open chat
2. Ask any question
3. In the server terminal, confirm **no** classification log appears (the classification is skipped for single-document queries by design)

---

### Test 6.3: Deduplication — same document uploaded twice

1. Upload **Doc A** again to `Test KB` under a different filename (e.g. `doc-a-copy.pdf`)
2. Wait for it to reach `ready`
3. Open KB-wide chat and ask: `What is the main topic?`
4. In the response citations, confirm the same section title does not appear twice

---

## Section 7 — Pass/Fail Checklist

After completing all tests, confirm every item below:

| # | Check | Pass |
|---|-------|------|
| 2.1 | "Chat with All Documents" button visible on 2+ doc KB cards | ☐ |
| 2.1 | Button absent on 0–1 doc KB cards | ☐ |
| 2.2 | KB-wide scope indicator: "Searching across all documents..." | ☐ |
| 2.3 | Doc-level scope indicator: "Searching: [filename]" | ☐ |
| 2.4 | "Chat with all documents" card at top of document list | ☐ |
| 2.5 | "Back to Documents" returns to document list (not KB list) | ☐ |
| 3.1 | KB-wide query returns non-empty response | ☐ |
| 3.2 | Citations show `📄 [filename]` below badge | ☐ |
| 3.2 | Citations from multiple documents appear in one response | ☐ |
| 3.3 | Document-level query still works (regression) | ☐ |
| 3.3 | Document-level citations only cite that document | ☐ |
| 3.4 | Follow-up question uses context from prior answer | ☐ |
| 4.1 | Simple queries log `classification: simple` | ☐ |
| 4.2 | Comparative queries log `classification: comparative` | ☐ |
| 4.3 | Multi-hop queries log sub-query execution and completion | ☐ |
| 4.4 | No crash when multi-hop sub-queries return empty | ☐ |
| 5.1 | curl KB-wide query returns `success: true` with citations | ☐ |
| 5.2 | DB row has `query_scope = knowledge_base` | ☐ |
| 5.3 | Query without scope returns error (not 500) | ☐ |
| 6.1 | 1-doc KB shows no KB-wide chat entry points | ☐ |
| 6.3 | Duplicate document does not produce duplicate citations | ☐ |
