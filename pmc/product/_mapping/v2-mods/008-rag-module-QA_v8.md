# 008 RAG Module QA — Round 8: Context Pollution & Position Bias Investigation

**Created**: February 22, 2026  
**Status**: Investigation Report & Specification — Ready for Implementation  
**Upstream**: `008-rag-module-QA_v7.md` (Round 7 — context restructure + prompt token tracking)  
**Deployment Under Test**: `dpl_HTPR6wjM3Vzq3cMCbtVATRpG1PD6`  
**Previous Deployment**: `dpl_4vez6VtR8hVm8rNLsPQUZXdn6qhz`

---

## Executive Summary

Round 7 fixes (Fix 1: context restructure, Fix 3: prompt token tracking, DISABLE_SLIDING_WINDOW=true) were deployed and tested with 2 queries. The results reveal a **partial success**: the simple-path query correctly named both banks, but the comparative-path query still produced a single-document answer referencing only Sun Chip Bank.

**Critical finding: This is NOT a truncation issue.** The LoRA received the full 13,277-token prompt (well within the 32,768 max_model_len limit). Both banks' sections were present in the context. The model simply ignored Moon Banc.

Three new root causes were identified:

1. **"Lost in the Middle" position bias**: `assembleMultiHopContext()` groups all sections by document — all 11 Sun Chip sections appear before any of the 6 Moon Banc sections. Research shows 7B models attend primarily to the beginning and end of context, weakening attention to content that appears later.

2. **Context pollution**: Only 5 of 17 retrieved sections are relevant to the maintenance fee question. The remaining 12 are noise (Jumbo Mortgage, ACH, Sweep Logic, Source of Funds, Treasury Ladders, Change Log) — diluting the signal and bloating the context unnecessarily.

3. **No similarity floor in assembly**: Sections with similarity as low as 0.350 (Change Log!) and 0.423 are included. The upstream threshold (0.3/0.4) is too permissive for focused answers.

Notably, Query 2 ("name both banks") **succeeded** because it used the `assembleContext()` path (classified as "simple"), which **interleaves** sections from both documents. This confirms that section ordering directly impacts model attention.

---

## 1. Test Results — Post-Round 7 Deployment

### 1.1 Configuration Confirmed

| Setting | Value | Source |
|---------|-------|--------|
| `max_model_len` | 32768 | RunPod log: worker `h8dhw1qcevq6xs` |
| `disable_sliding_window` | **True** ✅ (NEW) | RunPod log |
| `GPU KV cache` | 480,080 tokens | RunPod log |
| `loraMaxContextTokens` | 29,000 | config.ts |
| `max_tokens` (completion) | 2,048 | inference-serverless.ts |
| LoRA adapter | `adapter-6fd5ac79` | Vercel log |
| vLLM version | 0.15.0 | RunPod log |
| Engine | Mistral-7B-Instruct-v0.2, bfloat16 | RunPod log |

### 1.2 Queries Executed (newest first)

| # | Query | Classification | Score | Passed | promptTokens | Truncated? | Key Finding |
|---|-------|---------------|-------|--------|--------------|------------|-------------|
| 2 | "I have two accounts. Tell me the name of both banks." | **simple** | 0.25 | NO | 8,522 | No | ✅ Correctly named BOTH banks. Self-eval FAIL may reflect format/completeness, not bank coverage. |
| 1 | "I am absolutely insulted! maintenance fee..." | **comparative** | 0.35 | NO | 13,277 | No | ❌ Only referenced Sun Banc. Moon Banc completely absent from response. HALLUCINATION DETECTED. |

### 1.3 Detailed Query Analysis

#### Query 1 — Maintenance Fee (Request: `95bfm-1771736654915`)

| Metric | Value |
|--------|-------|
| Classification | `comparative` (3 sub-queries) |
| Sub-queries | 1. Minimum balance requirement in each document 2. Name of restricted status in each document 3. Maintenance fee amount in each document |
| Assembly path | `assembleMultiHopContext()` |
| Assembled tokens | ~10,674 (budget: 29,000) |
| promptLength (chars) | 43,246 (system: 790, user: 43,246) |
| promptTokens (vLLM) | 13,277 |
| completionTokens | 468 |
| totalTokens | 13,745 |
| inputRatio | 120.6% — **NOT truncated** |
| finishReason | `stop` — completed normally |
| responseLength | 1,710 chars |
| generationTimeMs | 185,972 (~3 min — includes cold-start queue) |
| Self-eval | 0.35 FAIL — "significant multi-document incompleteness... HALLUCINATION DETECTED" |
| Total wall time | 200,562ms |

**Sections in context (17 total):**

| # | Section | Source | Similarity | Relevant? |
|---|---------|--------|-----------|-----------|
| 1 | BC-ELIG-001: Minimum Balance and Maintenance Rules | Sun Chip | 0.802 | ✅ YES |
| 2 | 2. Eligibility and Account Standards | Sun Chip | 0.741 | ✅ YES |
| 3 | 1. Bank Overview and Philosophy | Sun Chip | 0.666 | Marginal |
| 4 | BC-PROD-004: Jumbo Mortgage Program | Sun Chip | 0.635 | ❌ NO |
| 5 | BC-COMP-002: Source of Funds (SOF/SOW) | Sun Chip | 0.622 | ❌ NO |
| 6 | BC-PROD-001: Flagship Cash Account / Sweep Logic | Sun Chip | 0.610 | ❌ NO |
| 7 | BC-ACH-001: ACH and Return Management | Sun Chip | 0.606 | ❌ NO |
| 8 | 5. Compliance and Risk | Sun Chip | 0.603 | ❌ NO |
| 9 | BC-PROD-002: Treasury Ladder Automation | Sun Chip | 0.532 | ❌ NO |
| 10 | Appendix A: Limits & Thresholds Master Table | Sun Chip | 0.525 | Marginal |
| 11 | BC-ELIG-002: U.S.-Only Residency | Sun Chip | 0.450 | ❌ NO |
| 12 | MB-ELIG-001: Minimum Asset and Jurisdiction Standards | Moon Banc | 0.709 | ✅ YES |
| 13 | Appendix A: Fee Schedule (Standard) | Moon Banc | 0.668 | ✅ YES |
| 14 | 2. Eligibility and Account Standards | Moon Banc | 0.664 | ✅ YES |
| 15 | 8. Exceptions and Governance | Moon Banc | 0.636 | Marginal |
| 16 | MB-EXCP-001: The Cantonal Override | Moon Banc | 0.423 | ❌ NO |
| 17 | Change Log | Moon Banc | 0.350 | ❌ NO |

**Relevance breakdown**: 5 relevant, 3 marginal, 9 irrelevant. Only **29%** of sections are relevant to the question.

**Context layout (as sent to LoRA):**
```
[SYSTEM] (790 chars) — multi-doc CRITICAL instruction ✅
[USER]   (43,246 chars):
  ## Original Question
  ## Sub-Questions Investigated (1-3)
  ## Evidence from Documents
    ### From: Sun-Chip-Bank (11 sections — positions 1-11)   ← MODEL READS THIS
        #### BC-ELIG-001 [0.802] — RELEVANT
        #### Eligibility Standards [0.741] — RELEVANT
        #### Bank Overview [0.666] — marginal
        #### Jumbo Mortgage [0.635] — NOISE
        #### SOF/SOW [0.622] — NOISE
        #### Sweep Logic [0.610] — NOISE
        #### ACH [0.606] — NOISE
        #### Compliance [0.603] — NOISE
        #### Treasury Ladder [0.532] — NOISE
        #### Appendix A [0.525] — marginal
        #### Residency [0.450] — NOISE
    ### From: Moon-Banc (6 sections — positions 12-17)       ← MODEL LOSES ATTENTION HERE
        #### MB-ELIG-001 [0.709] — RELEVANT
        #### Fee Schedule [0.668] — RELEVANT
        #### Eligibility Standards [0.664] — RELEVANT
        #### Exceptions [0.636] — marginal
        #### Cantonal Override [0.423] — NOISE
        #### Change Log [0.350] — NOISE
  ## Key Facts (~60 facts from both banks)                   ← AT THE VERY END
  ---
  Question: <original question>
  Answer using the context above, maintaining your natural tone:
```

**The "Lost in the Middle" effect**: Moon Banc's first relevant section (MB-ELIG-001) appears at position 12, after 11 Sun Chip sections (9 of which are irrelevant noise). By this point, the 7B model has already "committed" its answer strategy to Sun Chip data.

#### Query 2 — Bank Names (Request: `fxk99-1771737229037`)

| Metric | Value |
|--------|-------|
| Classification | `simple` (2 sub-queries) |
| Assembly path | `assembleContext()` — **different from Query 1** |
| promptTokens (vLLM) | 8,522 |
| completionTokens | 348 |
| inputRatio | 116.0% — **NOT truncated** |
| finishReason | `stop` |
| Self-eval | 0.25 FAIL |
| Total time | 15,468ms (worker warm) |

**Why Query 2 succeeded in naming both banks:**
1. `assembleContext()` **interleaves** sections (Sun→Moon→Sun→Moon), so Moon Banc content appears throughout the prompt — not buried at the end.
2. Shorter context (8,522 tokens) — less material to lose focus on.
3. The question explicitly asked for "both banks" — a direct instruction the model could follow.

### 1.4 Key Observation: Two Code Paths, Two Outcomes

| Aspect | Query 1 (maintenance fee) | Query 2 (bank names) |
|--------|---------------------------|----------------------|
| Classification | `comparative` | `simple` |
| Assembly function | `assembleMultiHopContext()` | `assembleContext()` |
| Section ordering | **Grouped by document** | **Interleaved** |
| Sun position | Positions 1-11 (ALL first) | Interleaved throughout |
| Moon position | Positions 12-17 (ALL last) | Interleaved throughout |
| Both banks in answer? | ❌ No — Sun only | ✅ Yes — Both banks |
| promptTokens | 13,277 | 8,522 |
| Self-eval | 0.35 | 0.25 |

**This confirms that section ordering is a primary factor in multi-document coverage.** The interleaved format (used by `assembleContext`) prevents position-bias failure.

---

## 2. Root Cause Analysis

### ROOT CAUSE 1 (CRITICAL): "Lost in the Middle" — assembleMultiHopContext Groups by Document

**File**: `src/lib/rag/services/rag-retrieval-service.ts` lines 1062–1070  
**Function**: `assembleMultiHopContext()`

The Round 7 fix correctly nests sections under document headers (the disconnected-headers bug is fixed). However, the function **groups all sections by document** — all Sun Chip sections appear as a block, then all Moon Banc sections as a block.

**Code evidence** (lines 1062–1070):
```typescript
// Output grouped by document — NOT interleaved
for (const [docId, docSections] of docEntries) {
    const docName = params.documentNames.get(docId) || docId;
    sectionParts.push(`\n### From: ${docName}\n`);
    // All selected sections for this doc emitted here
    for (const section of selectedByDoc.get(docId) || []) {
        sectionParts.push(formatSection(section));
    }
}
```

**Impact**: When Sun Chip has more retrieved sections (11 vs 6), ALL 11 appear first. Moon Banc's critical content starts at position 12. Research confirms 7B models suffer severe attention degradation for content in the middle-to-late positions of long contexts (Liu et al., 2023 — "Lost in the Middle: How Language Models Use Long Contexts").

**Contrast**: `assembleContext()` (the "simple" path) interleaves sections — and Query 2 succeeded.

**Fix**: Change `assembleMultiHopContext()` to interleave sections by document in the output, not group them.

---

### ROOT CAUSE 2 (HIGH): Context Pollution — Irrelevant Sections Dominate the Context

**Evidence**: For Query 1, 9 of 17 sections (53%) are completely irrelevant:
- Jumbo Mortgage (0.635) — nothing to do with minimum balance or maintenance fees
- ACH (0.606) — nothing to do with maintenance fees
- Treasury Ladder (0.532) — nothing to do with maintenance fees
- Change Log (0.350) — contains zero policy content

These sections consume ~7,000+ tokens of context budget without contributing to the answer. They push relevant Moon Banc content further from the model's attention window.

**Root**: The upstream similarity threshold (`similarityThreshold: 0.4`, `kbWideSimilarityThreshold: 0.3` in config.ts) is too permissive. There is no **assembly-time** relevance floor in `assembleMultiHopContext`.

**Fix**: Add a minimum similarity threshold (e.g., 0.55) in the assembly function itself, or raise the retrieval thresholds.

---

### ROOT CAUSE 3 (MEDIUM): No Per-Document Section Cap

**Evidence**: Sun Chip has 11 sections, Moon Banc has 6. The upstream `balanceMultiDocCoverage()` function caps any single document to 60% of results (`maxSingleDocRatio: 0.6`). But 11/17 = 64.7% — barely over the threshold and likely passes due to rounding or timing of the cap application.

Even with round-robin selection, when one document has nearly 2x the sections, it dominates the final output. The round-robin ensures selection fairness (alternating picks), but since the output is grouped (Root Cause 1), all 11 Sun sections still appear before any Moon sections.

**Fix**: Add a hard per-document cap (e.g., 6 sections max per document) in the assembly function.

---

### ROOT CAUSE 4 (MEDIUM): Key Facts Section Positioned at Context End

The `## Key Facts` section — which contains the most structured and directly answerable data from both banks — appears at the very END of the assembled context, after all 17 sections. This places the best comparison data in the lowest-attention position.

**Evidence from payload**: The Key Facts section includes:
- `R3: If NAV falls below 25M CHF, the account enters Low-Orbit Mode immediately.` (Moon Banc)
- `R4: Low-Orbit accounts are assessed a Complexity Fee of 15,000.00 CHF per quarter.` (Moon Banc)
- `Sub-Tier Maintenance Fee: 5000.00 USD (per month)` (Sun Chip)

These three facts alone provide the core comparison the question demands. But they're buried after ~10K tokens of section content.

**Fix**: Move Key Facts to appear BEFORE the detailed sections (between Sub-Questions and Evidence from Documents).

---

### RESOLVED ROOT CAUSES (from prior rounds)

| Root Cause | Round | Status |
|-----------|-------|--------|
| Context headers disconnected from sections | Round 7, Fix 1 | ✅ RESOLVED — Sections now nested correctly |
| vLLM MAX_MODEL_LEN | Round 7, Fix 2 | ✅ RESOLVED — Confirmed 32768 |
| Sliding window attention | Round 7 | ✅ RESOLVED — `DISABLE_SLIDING_WINDOW=true` confirmed in log |
| Prompt token tracking | Round 7, Fix 3 | ✅ RESOLVED — Working, no truncation detected |
| Self-eval bias toward LoRA | Round 6, Fix B | ✅ RESOLVED — Mode-aware scoring working |
| Context parity for LoRA | Round 6, Fix A | ✅ RESOLVED — `effectiveContext` return working |

---

## 3. Fix Specifications

### Fix A: Interleave Section Output in assembleMultiHopContext (P0)

**File**: `src/lib/rag/services/rag-retrieval-service.ts`  
**Function**: `assembleMultiHopContext()` lines 1062–1070

**Current behavior**: Sections grouped by document (all Doc A, then all Doc B).

**Target behavior**: Sections interleaved by document while maintaining doc attribution. Use the round-robin selection order as the output order, with each section tagged with its source document.

**Implementation**:
```typescript
// BEFORE: Grouped output
for (const [docId, docSections] of docEntries) {
    sectionParts.push(`\n### From: ${docName}\n`);
    for (const section of selectedByDoc.get(docId) || []) { ... }
}

// AFTER: Interleaved output with per-section attribution
for (const section of selectedSections) {  // selectedSections in round-robin order
    const docName = params.documentNames.get(section.document_id) || section.document_id;
    sectionParts.push(`\n### From: ${docName}\n`);
    sectionParts.push(formatSection(section));
}
```

OR: Use the same interleaving approach as `assembleContext()` — sections in round-robin order, each prefixed with `[DocName]`.

**Risk**: Low — changes output format only, no logic changes.

### Fix B: Add Similarity Floor in Assembly (P0)

**File**: `src/lib/rag/services/rag-retrieval-service.ts`  
**Function**: `assembleMultiHopContext()` — add filter before round-robin selection

**Implementation**:
```typescript
const ASSEMBLY_SIMILARITY_FLOOR = 0.55;

// Filter out low-relevance sections before round-robin
const filteredSections = sections.filter(s => s.similarity >= ASSEMBLY_SIMILARITY_FLOOR);
```

**Impact analysis for Query 1**: Would remove 5 sections:
- BC-PROD-002: Treasury Ladder (0.532) → removed
- Appendix A: Limits (0.525) → removed
- BC-ELIG-002: Residency (0.450) → removed
- MB-EXCP-001: Cantonal Override (0.423) → removed
- Change Log (0.350) → removed

Result: 12 sections → 5 relevant + 2 marginal. Context would shrink from ~10,674 tokens to ~7,500. Much better signal-to-noise ratio.

**Safeguard**: If filtering removes ALL sections for a document, lower the threshold to 0.40 for that document only to guarantee coverage.

### Fix C: Per-Document Section Cap (P1)

**File**: `src/lib/rag/services/rag-retrieval-service.ts`  
**Function**: `assembleMultiHopContext()` — apply per-doc cap before round-robin

**Implementation**:
```typescript
const MAX_SECTIONS_PER_DOC = 6;

for (const [docId, docSections] of docEntries) {
    docSections.splice(MAX_SECTIONS_PER_DOC); // Keep top-6 by similarity
}
```

**Impact**: Sun Chip would be capped from 11 to 6 sections, resulting in 6+6=12 balanced sections.

### Fix D: Move Key Facts Before Sections (P1)

**File**: `src/lib/rag/services/rag-retrieval-service.ts`  
**Function**: `assembleMultiHopContext()` — restructure output order

**Current order**:
```
## Original Question
## Sub-Questions
## Evidence from Documents (sections)
## Key Facts
```

**Target order**:
```
## Original Question
## Sub-Questions
## Key Facts                          ← MOVED UP
## Evidence from Documents (sections)
```

**Rationale**: Key Facts contain the most concise, structured comparison data. Placing them before detailed sections gives the model the answer "summary" first, then supporting detail.

---

## 4. Why Query 2 Succeeded Despite Lower Self-Eval

Query 2 ("Tell me the name of both banks") achieved a self-eval of 0.25 (FAIL) despite correctly naming both banks. This apparent contradiction is explained by the self-eval reasoning: "The generated response fails to directly answer the user's straightforward query."

This suggests the LoRA's response was either:
- Verbose/rambling before naming the banks
- Not structured clearly enough for the evaluator
- Missing other quality criteria (citations, formatting)

The key data point is that **the content was correct** — the model DID name both banks. The interleaved context structure ensured both documents were visible throughout the prompt.

---

## 5. Diagnostic Evidence: Input NOT Truncated

Both queries' prompt token tracking confirms NO truncation:

| Query | promptTokens | completionTokens | max_model_len | inputRatio | Truncated? |
|-------|-------------|-------------------|---------------|------------|------------|
| 1 (maintenance fee) | 13,277 | 468 | 32,768 | 120.6% | ❌ No |
| 2 (bank names) | 8,522 | 348 | 32,768 | 116.0% | ❌ No |

The inputRatio > 100% simply indicates Mistral's tokenizer is more efficient than the chars/4 estimator. Both queries had ample headroom within the 32K context window.

**This definitively rules out truncation as a cause.** The model received all context — it just didn't attend to the Moon Banc sections in Query 1.

---

## 6. Implementation Priority Matrix

| # | Fix | Effort | Impact | Priority | Status |
|---|-----|--------|--------|----------|--------|
| A | Interleave section output in assembleMultiHopContext | Small | Critical | P0 | Ready for implementation |
| B | Add similarity floor (0.55) in assembly | Small | High | P0 | Ready for implementation |
| C | Per-document section cap (max 6) | Small | Medium | P1 | Ready for implementation |
| D | Move Key Facts before sections | Small | Medium | P1 | Ready for implementation |
| — | ~~Nest sections under doc headers~~ | — | — | — | ✅ DONE (Round 7 Fix 1) |
| — | ~~Prompt token tracking~~ | — | — | — | ✅ DONE (Round 7 Fix 3) |
| — | ~~DISABLE_SLIDING_WINDOW~~ | — | — | — | ✅ DONE (RunPod config) |

**Recommended next deployment**: Fix A + Fix B (both P0, small changes). Fix C and Fix D can be included in the same deployment for minimal additional risk.

---

## 7. Test Questions for Next Round

The following 5 questions are specifically designed to **require referencing both banks by name** in the answer. Each question targets policies that differ between Sun Chip and Moon Banc, making a single-document answer objectively incomplete.

### Test Question 1 — Minimum Balance Comparison
> "What is the exact minimum balance I need to maintain at each of my two banks, and what currency is each denominated in?"

**Expected answer must include**:
- Sun Chip: $10,000,000.00 USD
- Moon Banc: 25,000,000.00 CHF

### Test Question 2 — Restricted Status Naming
> "If my accounts fall below the required minimum balance at both banks, what is the specific name of the restricted status my account enters at each institution?"

**Expected answer must include**:
- Sun Chip: "Warning Status" (triggered when DAB falls below $10M)
- Moon Banc: "Low-Orbit Mode" (triggered when NAV falls below 25M CHF)

### Test Question 3 — Penalty Fee Comparison
> "Compare the penalty fees charged by each bank when my account falls below the minimum balance. Give me the exact amounts and how often they are charged."

**Expected answer must include**:
- Sun Chip: $5,000.00 USD per month ("Sub-Tier Maintenance Fee")
- Moon Banc: 15,000.00 CHF per quarter ("Complexity Fee")

### Test Question 4 — Account Closure Timelines
> "If I fail to restore my balance above the minimum at both banks, how long do I have before each bank forces my account closed? Explain the timeline for each."

**Expected answer must include**:
- Sun Chip: 30-day Cure Window → "Automatic Downgrade Circuit" → 2 consecutive quarters in Warning Status → "Forced Closure Protocol" (CRO sign-off required)
- Moon Banc: Low-Orbit Mode → 12 months → administrative offboarding (check mailed to last known address)

### Test Question 5 — Geographic and Currency Jurisdiction
> "I'm considering opening accounts at both banks. One of my businesses is incorporated in Switzerland and the other in New York. Can each bank serve both entities? Explain any jurisdiction or currency restrictions."

**Expected answer must include**:
- Sun Chip: U.S.-only (all entities must be incorporated in 50 states or DC, SSN required, no international — strict BC-ELIG-002 rules)
- Moon Banc: Multi-jurisdictional (accepts clients from Qualified Jurisdictions not on FATF Grey/Black list, supports CHF/USD/EUR/GBP/JPY/SGD)

---

## 8. Diagnostic Data Reference

### 8.1 Vercel Log Entries (v58 Deployment)

**Query 1 — Maintenance Fee** (request `95bfm-1771736654915`):
```
05:04:14  [RAG Retrieval] Query mode=rag_and_lora
05:04:14  Query classified as: comparative (3 sub-queries)
05:04:14  Sub-queries: [minimum balance, restricted status name, maintenance fee amount]
05:04:14  Hybrid search: vector=47, bm25=5, overlap=5, vectorOnly=42, bm25Only=0
05:04:14  [assembleMultiHopContext] Assembled ~10674 tokens (budget: 29000) ← Well under budget
05:04:14  promptLength: 43,246 chars
05:04:24  Workers: 2 ready, 2 idle (cold start resolved)
05:04:24  Using adapter: adapter-6fd5ac79
05:04:24  Messages: 2 (system: 790 chars, user: 43,246 chars)
05:05:54  RunPod initial response: IN_QUEUE
05:06:04–05:07:10  Polls 2-16: IN_QUEUE (~70 seconds in queue)
05:07:15  Poll 16: IN_PROGRESS
05:07:30  Poll 19: COMPLETED
05:07:30  Extracted: { responseLength: 1710, tokensUsed: 468, promptTokens: 13277, finishReason: 'stop' }
05:07:30  Token analysis: { promptTokens: 13277, completionTokens: 468, inputRatio: 120.6%, truncated: false }
05:07:36  Self-eval: score=0.35 FAIL — "significant multi-document incompleteness... HALLUCINATION DETECTED"
05:07:36  Multi-hop query complete in 200562ms
```

**Query 2 — Bank Names** (request `fxk99-1771737229037`):
```
05:07:49  [RAG Retrieval] Query mode=rag_and_lora
05:07:49  Query classified as: simple (2 sub-queries)
05:07:49  Assembly path: assembleContext() (NOT assembleMultiHopContext)
05:07:49  promptLength: 28,585 chars
05:08:04  Extracted: { responseLength: 1400, tokensUsed: 348, promptTokens: 8522, finishReason: 'stop' }
05:08:04  Token analysis: { promptTokens: 8522, completionTokens: 348, inputRatio: 116.0%, truncated: false }
05:08:05  Self-eval: score=0.25 FAIL
05:08:05  Total time: 15,468ms (worker warm)
```

### 8.2 RunPod Worker Configuration (v58)

```
Worker: h8dhw1qcevq6xs
Engine: vLLM v0.15.0
Model: mistralai/Mistral-7B-Instruct-v0.2
dtype: torch.bfloat16
max_model_len: 32768
max_seq_len: 32768
disable_sliding_window: True    ← NEW (confirmed working)
GPU KV cache: 480,080 tokens
enable_lora: True
Adapter: BrightHub2/lora-emotional-intelligence-6fd5ac79
Engine init time: 162.21s
```

Previous workers `5kukcbiwidus2b` and `im6p1h4tcwsjl9` died unexpectedly during this session (EngineCore_DP0 died, WorkerProc terminated). Worker `h8dhw1qcevq6xs` was initialized fresh.

### 8.3 Context Distribution Analysis

**Query 1 section distribution**:
- Sun Chip: 11 sections (8 sections ≤ 0.635 similarity — mostly noise)
- Moon Banc: 6 sections (2 sections ≤ 0.423 similarity — noise)
- Relevant sections: 5 of 17 (29%)
- Noise sections: 9 of 17 (53%)
- Marginal sections: 3 of 17 (18%)

**If Fix B (similarity floor 0.55) were applied**:
- Sun Chip: 6 sections (removed: Treasury Ladder 0.532, Limits 0.525, Residency 0.450)
- Moon Banc: 4 sections (removed: Cantonal Override 0.423, Change Log 0.350)
- Total: 10 sections (reduced from 17)
- Noise removed: 5 of 9 noise sections eliminated

**If Fix B + Fix C (similarity floor 0.55 + cap at 6) were applied**:
- Sun Chip: 6 sections (already at cap after filtering)
- Moon Banc: 4 sections (below cap)
- Total: 10 sections
- Estimated token count: ~7,500 (down from ~10,674)
- Signal-to-noise ratio: significantly improved

---

## 9. Files to Modify

**Round 8 code changes:**
- `src/lib/rag/services/rag-retrieval-service.ts` — Fix A (interleave output), Fix B (similarity floor), Fix C (per-doc cap), Fix D (Key Facts position)

**No config changes required.** All fixes are code-level in the assembly function.

---

## 10. Appendix: Assembly Path Comparison

| Feature | `assembleMultiHopContext()` | `assembleContext()` |
|---------|----------------------------|---------------------|
| Used for | `comparative`, `multi-hop` queries | `simple` queries |
| Token budget | `loraMaxContextTokens` (29K) | Fixed 100K |
| Budget split | 85% sections / 15% facts | 70% sections / 25% facts / 5% headers |
| Section output order | **Grouped by document** ← PROBLEM | **Interleaved (round-robin)** ← WORKS |
| Document attribution | `### From: DocName` header + `#### Section` nested | `### [DocName] Section` prefix per section |
| Has document summary | No | Yes ("Knowledge Base Overview") |
| Has query decomposition | Yes (Original Q + Sub-Questions) | No |
| Round-robin selection | Yes | Yes (multi-doc only) |
| Produces correct answers? | ❌ Fails for multi-doc (Query 1) | ✅ Works for multi-doc (Query 2) |
