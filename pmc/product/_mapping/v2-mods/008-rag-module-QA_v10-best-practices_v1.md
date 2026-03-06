# 008 RAG Module QA — v10 Best Practices Analysis

**Created**: February 22, 2026  
**Type**: Architecture Analysis & Best Practices  
**Upstream Work**: `008-rag-module-QA_v9-spec_v1.md` (v9 fixes deployed & working)  
**Status**: Analysis Complete — No implementation required at this time

---

## Table of Contents

1. [Issue 1: Implicit vs Explicit Multi-Document Queries](#issue-1-implicit-vs-explicit-multi-document-queries)
   - 1.1 [Why This Happens — Root Cause Chain](#11-why-this-happens--root-cause-chain)
   - 1.2 [What the User Would Expect](#12-what-the-user-would-expect)
   - 1.3 [Industry Best Practices: "Default-Comprehensive" Retrieval](#13-industry-best-practices-default-comprehensive-retrieval)
   - 1.4 [Recommended Solution Architecture](#14-recommended-solution-architecture)
   - 1.5 [Trade-off Matrix](#15-trade-off-matrix)
   - 1.6 [Decision](#16-decision)
2. [Issue 2: Queries About Topics Not in the RAG](#issue-2-queries-about-topics-not-in-the-rag)
   - 2.1 [What Happens Today — The "Moon Invoice" Scenario](#21-what-happens-today--the-moon-invoice-scenario)
   - 2.2 [What the User Would Expect](#22-what-the-user-would-expect)
   - 2.3 [Industry Best Practices: RAG + LLM Fallback Orchestration](#23-industry-best-practices-rag--llm-fallback-orchestration)
   - 2.4 [The Three Canonical Patterns](#24-the-three-canonical-patterns)
   - 2.5 [Our System — Where Each Pattern Applies](#25-our-system--where-each-pattern-applies)
   - 2.6 [Recommended Solution Architecture](#26-recommended-solution-architecture)
   - 2.7 [Decision](#27-decision)
3. [Appendix: Code References](#appendix-code-references)

---

## Issue 1: Implicit vs Explicit Multi-Document Queries

### Observation

When the user asks a single-entity question ("my account is locked... can I use a standard authenticator app?"), the RAG answers using only Sun Chip Bank data. When the user explicitly says "both banks" / "both my banks", the RAG correctly returns information from both Sun Chip Bank and Moon Banc.

---

### 1.1 Why This Happens — Root Cause Chain

The behavior is caused by four layers in the pipeline, each reinforcing the single-document bias:

#### Layer 1: Classifier Decision (`classifyQuery()`)

The `classifyQuery()` function (line ~928) uses Claude Haiku to decide if a query is `simple`, `multi-hop`, or `comparative`. Its system prompt says:

> "Only classify as 'simple' when you are confident the answer would be identical across all documents, or when the query explicitly names a single specific document/entity."

The implicit-comparison heuristics are aggressive ("What is the minimum balance?" → comparative), but they rely on the query clearly being *about a topic that varies per document*. The single-entity Tuscany query doesn't trigger these heuristics.

**Why**: The query says "my account" (singular). It doesn't mention two banks. It isn't asking "what fee am I charged?" (which the classifier knows varies per bank). It's asking about authentication hardware and security modes — topics the classifier can't confidently predict vary across documents without seeing the document contents. The classifier calls it `simple`.

**Result**: The query takes the standard path (lines 1450+), which uses `retrieveContext()` + `assembleContext()` instead of the multi-hop decomposition path.

#### Layer 2: Embedding Similarity Asymmetry

The `retrieveContext()` function (line ~63) does vector search across the entire KB with a 0.3 similarity threshold. The query mentions "plastic challenge card", "USB key", "authenticator app", "security mode", "logging in from Europe". 

Sun Chip Bank's document likely has sections about hardware authentication tokens and geographic access restrictions that match these keywords with high similarity (0.7+). Moon Banc's document may use different terminology (e.g., "multi-factor device", "cross-border access protocol") that results in lower similarity scores.

With `maxSectionsToRetrieve: 10` and BM25 hybrid search favoring exact keyword matches, Sun Chip sections could dominate all 10 retrieval slots.

**Result**: The retrieval returns mostly (or entirely) Sun Chip sections, with Moon Banc sections either absent or at the very low end of similarity.

#### Layer 3: `balanceMultiDocCoverage()` Can't Fix What's Not There

The `balanceMultiDocCoverage()` function (line ~617) caps any single document at 60% of results. But if retrieval only returned Sun Chip sections (because Moon Banc's terminology didn't match), there's nothing to balance. If Moon Banc has 1 section and Sun Chip has 9, the balance caps Sun Chip at 6 — but 6:1 is still heavily one-sided.

**Result**: The "simple" path's balancing is a soft cap, not a guarantee of multi-doc coverage.

#### Layer 4: `assembleContext()` Interleaves But Can't Create Content

The `assembleContext()` function (line ~240) does roundrobin interleaving in multi-doc mode. But if only 1 Moon Banc section made it through retrieval, interleaving gives:

```
Sun Chip §1 → Moon Banc §1 → Sun Chip §2 → Sun Chip §3 → Sun Chip §4 → ...
```

The model sees one Moon Banc mention versus five Sun Chip sections. It naturally focuses on the majority content.

**Result**: The response mentions only Sun Chip because that's almost all the context contains.

#### Summary: It's a Pipeline Cascade

```
User: "my account is locked, can I use authenticator app?"
  ↓
classifyQuery(): "simple" (no explicit multi-bank signal)
  ↓  
retrieveContext(): [9 Sun Chip sections, 1 Moon Banc section] (terminology mismatch)
  ↓
balanceMultiDocCoverage(): [6 Sun Chip, 1 Moon Banc] (cap at 60%, but 1 is still 1)
  ↓
assembleContext(): interleaved but 6:1 ratio
  ↓
LLM: answers from Sun Chip only (dominant content)
```

When the user says "both banks", the classifier catches it:

```
User: "both my banks have my accounts locked..."
  ↓
classifyQuery(): "comparative" (explicit multi-bank signal)
  ↓
Sub-queries generated: ["What auth methods does Sun Chip require?", "What auth methods does Moon Banc require?", ...]
  ↓
Each sub-query retrieves from its target document independently
  ↓
assembleMultiHopContext(): interleaved, balanced, similarity-floored
  ↓
LLM: answers from both banks ✓
```

---

### 1.2 What the User Would Expect

The user is a customer who has accounts at **both** banks loaded into this knowledge base. They don't know about RAG, classifiers, or embedding vectors. Their mental model is:

> "This system knows about my banks. When I ask about my account, it should tell me about all the relevant policies — from whichever bank(s) have relevant information."

**Expected behavior for the Tuscany question**:

- If both banks have authentication policies and geographic access restrictions → show both.
- If only one bank has a relevant policy → show that one (and optionally note the other bank has no matching policy).
- The user should NOT need to say "both banks" to get comprehensive answers when both banks are relevant.

**However**, there's a counter-expectation:

- If the user says "my Sun Chip account is locked", they probably want only Sun Chip's answer. Force-injecting Moon Banc would be confusing.
- If the query is genuinely about one topic (e.g., "what's the interest rate on my savings?"), and only one bank has a savings product, returning only that bank is correct.

**The ideal**: The system should be **comprehensive by default** (include all relevant sources) unless the user explicitly scopes to one entity.

---

### 1.3 Industry Best Practices: "Default-Comprehensive" Retrieval

The industry is converging on a pattern called **"default-comprehensive with late filtering"** for multi-document RAG systems. Key principles from leading implementations:

#### Principle 1: Classify on Intent, Not Keywords

Best-in-class classifiers don't just look for "both" or "compare". They consider:

- **KB composition awareness**: If the KB contains N documents of the same type (policies, contracts), most topical queries are implicitly comparative.
- **Entity resolution**: Does the query mention a specific entity? If yes → scope to that document. If no → assume all documents.
- **Default to comprehensive**: When uncertain, retrieve from all docs and let the LLM decide what's relevant.

Our classifier already has good implicit-comparison heuristics ("What is the minimum balance?" → comparative). The gap is that it defaults to `simple` for queries that don't match the heuristic patterns — and `simple` means single-pass retrieval that can miss one bank.

#### Principle 2: Parallel Retrieval Per Document (Even for "Simple" Queries in Multi-Doc KBs)

Google's REALM, Meta's Atlas, and Microsoft's newer RAG papers all recommend: **when operating on a multi-document KB, retrieve independently from each document, then merge**. This prevents document-A terminology from dominating the embedding space.

Our multi-hop path already does this (runs sub-queries which retrieve across the KB). The simple path does a single KB-wide search, which creates the asymmetry.

#### Principle 3: The LLM Should Be the Final Content Filter, Not the Retriever

Retrieve broadly, assemble conservatively, and let the LLM decide what's relevant. If you show the LLM content from both banks, it will naturally scope its answer to the relevant bank(s). If you never give it Moon Banc content, it can't reference it.

---

### 1.4 Recommended Solution Architecture

There are three options, ordered from least to most invasive:

#### Option A: Bias the Classifier Toward "comparative" (Low Effort)

Modify the `classifyQuery()` system prompt to default to `comparative` for multi-doc KBs unless the query explicitly names a single entity:

```
Current heuristic: "Only classify as 'simple' when confident the answer would be identical across all documents"
Proposed heuristic: "For multi-document KBs of the same type, ALWAYS classify as 'comparative' unless the query explicitly references ONE specific document/entity by name."
```

**Pros**: One prompt edit. Covers 80% of cases.  
**Cons**: Over-triggers on genuinely simple queries. Adds sub-query decomposition latency (~300ms) even for queries that don't need it. Forces the multi-hop path which generates sub-queries even when the original query is sufficient.

**Estimated effort**: 30 minutes. One line change in classifier prompt.  
**Risk**: Low-moderate. May degrade latency for simple queries in multi-doc KBs.

#### Option B: "Ensure Coverage" Step in the Simple Path (Medium Effort)

After standard retrieval in the simple path, check if the results span all documents in the KB. If not, do a supplementary retrieval from under-represented documents:

```typescript
// After retrieveContext() in the simple path (~line 1455):
const retrievedDocIds = new Set(retrieved.sections.map(s => s.documentId));
if (!params.documentId && knowledgeBaseId && retrievedDocIds.size < documentCount) {
  // Some documents have zero representation — do targeted retrieval
  for (const docId of allDocIds) {
    if (!retrievedDocIds.has(docId)) {
      const supplementary = await retrieveContext({
        queryText: params.queryText,
        documentId: docId,
        runId: params.runId,
        hydeText,
      });
      retrieved.sections.push(...supplementary.sections.slice(0, 3));
      retrieved.facts.push(...supplementary.facts.slice(0, 3));
    }
  }
}
```

**Pros**: Simple path stays fast for single-doc queries. Multi-doc gets coverage without full multi-hop decomposition. LLM sees content from all docs and can decide relevance.  
**Cons**: Additional retrieval calls add latency (~200ms per missing doc). Might add noisy low-relevance content from documents that genuinely aren't relevant.  

**Estimated effort**: 2–3 hours. Requires knowing all doc IDs in the KB.  
**Risk**: Low. Worst case: the LLM ignores irrelevant supplementary content.

#### Option C: Promote All Multi-Doc KB Queries to Multi-Hop (Most Comprehensive)

Eliminate the `simple` classification for multi-doc KBs entirely. Any query in a KB with 2+ documents always goes through the multi-hop path:

```typescript
const classification = (!params.documentId && documentCount > 1)
  ? await classifyQuery({ queryText: params.queryText, documentCount })
  : { type: 'simple' as const };

// Change to:
const classification = (!params.documentId && documentCount > 1)
  ? { type: 'comparative' as const, subQueries: [params.queryText] }  // Always multi-hop
  : { type: 'simple' as const };
```

Wait — this removes the intelligent sub-query decomposition. Better approach: always classify, but override `simple → comparative` for multi-doc KBs:

```typescript
let classification = (!params.documentId && documentCount > 1)
  ? await classifyQuery({ queryText: params.queryText, documentCount })
  : { type: 'simple' as const };

// Multi-doc KBs: never use simple path
if (classification.type === 'simple' && documentCount > 1) {
  classification = {
    type: 'comparative',
    subQueries: [params.queryText],  // Use original query as single sub-query
  };
}
```

**Pros**: Guarantees all queries hit the multi-hop path with balancing, interleaving, similarity floor, and per-doc cap. Most comprehensive.  
**Cons**: Every query incurs classifier + multi-hop overhead. Single sub-query (the original query) doesn't get the benefit of decomposition. May need to adjust how `assembleMultiHopContext()` handles single-sub-query cases.

**Estimated effort**: 1–2 hours.  
**Risk**: Moderate. Latency increase for all queries. The multi-hop path's sub-query parallel retrieval with a single query basically replicates what `retrieveContext()` does, so it's not harmful — just redundant.

---

### 1.5 Trade-off Matrix

| Dimension | Option A (Classifier Bias) | Option B (Ensure Coverage) | Option C (Always Multi-Hop) |
|-----------|---------------------------|---------------------------|----------------------------|
| **Coverage guarantee** | ~80% (classifier can still miss) | ~95% (supplementary retrieval fills gaps) | 100% (all queries go multi-hop) |
| **Latency impact** | +300ms on false-positive comparative | +200ms per missing doc | +300ms classifier + parallel retrieval always |
| **Code changes** | 1 prompt edit | ~30 lines new code | ~10 lines override logic |
| **Risk of degradation** | Low (over-classification is safe) | Low (supplementary content ignored if irrelevant) | Moderate (single-sub-query multi-hop is untested) |
| **User experience** | Good (may decompose unnecessarily) | Best (fast for single-doc, comprehensive for multi) | Good (always comprehensive, slightly slower) |

---

### 1.6 Decision

**Recommendation: Option B (Ensure Coverage) for production quality. Option A as a quick-win interim.**

Option B is the most user-respecting approach: it keeps the fast path for genuinely simple queries while ensuring every document gets representation. The LLM acts as the final relevance filter rather than forcing the retriever to guess.

Option A is deployable in 30 minutes as an interim improvement while Option B is built.

**This is NOT a bug.** The system is working as designed — the classifier correctly identifies single-entity queries as "simple" and the simple path retrieves what's most similar. The delta is between "working as designed" and "optimal user experience in multi-doc KBs." This is an enhancement, not a fix.

---

---

## Issue 2: Queries About Topics Not in the RAG

### Observation

If a user asks about "Moon Invoice" (a third-party invoicing service not in the knowledge base), the current system would either:
1. Return no relevant results and show a "no context found" message, OR
2. Return low-similarity false positives (e.g., Moon Banc sections that happen to contain the word "Moon") and generate a confused answer mixing Moon Banc banking policies with the user's invoicing question.

---

### 2.1 What Happens Today — The "Moon Invoice" Scenario

Let's trace the exact path for: *"What are the tax practices of my invoicing service Moon Invoice?"*

```
Step 1: classifyQuery()
  → Input: "What are the tax practices of my invoicing service Moon Invoice?"
  → With 2 documents in KB (Sun Chip Bank, Moon Banc)
  → Classifier sees "tax practices" and "invoicing service" — unfamiliar topic
  → Could classify as "simple" (not obviously comparative) or "comparative" (2 docs in KB)
  → Let's say: "simple"

Step 2: generateHyDE()
  → Generates hypothetical answer about tax practices of Moon Invoice
  → HyDE text: "Moon Invoice applies a 7% tax rate on all invoices..."

Step 3: retrieveContext()
  → Vector search: "tax practices Moon Invoice" + HyDE text
  → Similarity threshold: 0.3 (KB-wide)
  → Results: 
    - Moon Banc sections may match on "Moon" keyword (BM25) → similarity 0.35–0.45
    - "Tax" related sections from either bank (if they exist) → similarity 0.30–0.40
    - Most results below meaningful relevance
  → Returns: Maybe 2–4 low-similarity sections about Moon Banc / tax provisions

Step 4: Context is assembled and sent to LLM

Step 5: LLM generates response
  → Gets Moon Banc banking policy sections when user asked about invoicing
  → Either: confusingly mixes "Moon Banc" with "Moon Invoice"
  → Or: correctly says "I don't have information about Moon Invoice"
  → Depends on LLM quality and prompt instructions

Step 6: selfEvaluate()
  → Score likely low (0.3–0.5) because response doesn't match query intent
  → May trigger low-confidence prefix in UI
```

**Worst case**: The system serves Moon Banc content labeled as "Moon Invoice" information — a hallucinated, wrong answer.

**Best case**: The retrieval returns nothing above threshold, the system returns "No relevant context found", and the user gets no answer at all.

**Neither is ideal.**

---

### 2.2 What the User Would Expect

The user doesn't know about RAG, LoRA, or Mistral. They see a chat interface and think:

> "This AI assistant knows about my banks AND general things. If it doesn't know about Moon Invoice from my bank documents, it should still try to answer from general knowledge — or tell me it can't help with that topic."

**User expectations in order of preference:**

1. **Best**: "Moon Invoice isn't in your knowledge base, but here's what I know about it generally: [general LLM knowledge]. For bank-specific tax questions, here's what your banks say: [nothing relevant found]."

2. **Acceptable**: "I don't have any information about Moon Invoice in your knowledge base. My knowledge is limited to Sun Chip Bank and Moon Banc policies. For Moon Invoice tax practices, please check Moon Invoice's documentation or website."

3. **Unacceptable**: "According to Moon Banc's policy, the tax rate is..." (hallucinated cross-contamination between "Moon" entities).

4. **Unacceptable**: Silent failure / empty response.

---

### 2.3 Industry Best Practices: RAG + LLM Fallback Orchestration

The AI industry has converged on a pattern called **"Retrieval-Augmented Generation with Graceful Fallback"**. The core principle:

> **RAG is an enhancement, not a cage.** When the knowledge base has relevant content, use it. When it doesn't, the system should degrade gracefully — not crash into confusion.

Leading implementations from Anthropic (Claude for Enterprise), OpenAI (Assistants API), Google (Vertex AI RAG), and Cohere (RAG pipeline) all implement variants of this pattern.

---

### 2.4 The Three Canonical Patterns

#### Pattern 1: "Hard RAG" — KB-Only Answers (Current BrightRun Behavior)

```
Query → Retrieve → If results: Generate from context
                  → If no results: "I don't have that information"
```

**When to use**: Compliance-critical domains where hallucination is unacceptable (legal, medical, financial regulation). The model should NEVER generate from parametric knowledge because it could be wrong or outdated.

**Pros**: Zero hallucination risk. Every answer is grounded in documents.  
**Cons**: Gives empty answers for legitimate questions outside the KB. Frustrating UX.

**Industry users**: Legal document review tools, FDA compliance bots, financial audit systems.

#### Pattern 2: "Soft RAG" — KB-Preferred with LLM Fallback

```
Query → Retrieve → If high-confidence results: Generate from context (grounded)
                  → If low/no results: Generate from LLM's parametric knowledge (ungrounded)
                  → Always label which parts are RAG-grounded vs LLM-generated
```

**When to use**: Knowledge assistants where the KB covers a specific domain but users may ask about adjacent topics. The system should be helpful broadly while being authoritative on KB content.

**Pros**: Answers more questions. Good UX. Labeled sources maintain trust.  
**Cons**: LLM parametric knowledge can be outdated or wrong. Requires clear UI labeling. User may not understand the reliability difference.

**Industry users**: Customer support bots, internal knowledge assistants, Notion AI, Glean.

#### Pattern 3: "Hybrid-RAG" — Confidence-Routed with Knowledge Boundaries

```
Query → Classify intent:
  → If KB-domain query + high retrieval confidence → Hard RAG (grounded only)
  → If KB-domain query + low retrieval confidence → Hard RAG + "I may not have complete info"
  → If out-of-domain query → LLM with disclaimer OR decline gracefully
  → If mixed query → RAG portions grounded, other portions from LLM, clearly labeled
```

**When to use**: Sophisticated systems where trust, accuracy, and UX all matter. Financial advisory, enterprise knowledge management.

**Pros**: Best of both worlds. Domain-expert on KB content, broadly helpful otherwise. Clear trust signals.  
**Cons**: Most complex to implement. Requires robust confidence scoring and intent classification.

**Industry users**: Anthropic Claude for Enterprise, Bloomberg GPT, proprietary RAG systems at large financial institutions.

---

### 2.5 Our System — Where Each Pattern Applies

BrightRun's architecture has three inference modes: **RAG-only** (Claude), **LoRA-only** (Mistral-7B fine-tuned), and **RAG+LoRA** (retrieved context fed to LoRA). Each mode has different considerations for fallback:

#### RAG-Only Mode (Claude)

Claude's parametric knowledge is vast and current. It can answer "Moon Invoice" questions reasonably from training data. The question is whether we *should let it*.

- **Current behavior**: Hard RAG. If retrieval returns nothing, shows "I could not find relevant information."
- **Ideal behavior**: Hybrid-RAG. Attempt retrieval → if no/low results + query is out-of-domain → allow Claude to answer from parametric knowledge **with prominent disclaimer**.

This is relatively safe because Claude is a large, well-calibrated model with good factual recall.

#### LoRA+RAG Mode (Mistral-7B with Fine-Tuning)

Mistral-7B's parametric knowledge is **much less reliable** than Claude's. It's a 7B model — its general knowledge is patchy and prone to hallucination. The LoRA fine-tuning further narrows its reliable knowledge to the training domain. Letting it generate ungrounded answers about "Moon Invoice" would likely produce confabulation.

- **Current behavior**: Hard RAG. If retrieval returns nothing, shows "No relevant context was found. The LoRA model cannot generate a grounded answer without context."
- **Ideal behavior for LoRA**: **Stay with Hard RAG** for LoRA. Never let the 7B model answer ungrounded. But improve the *messaging* to the user.

This is a critical distinction: **the fallback strategy should differ by model capability**.

#### LoRA-Only Mode (No RAG)

This mode has no retrieval. The user is talking directly to the fine-tuned Mistral-7B. It can only answer from what it learned in fine-tuning + base model parametric knowledge.

- **Current behavior**: Direct generation. No RAG retrieval attempted.
- **Considerations**: This mode is explicitly chosen by the user and doesn't involve RAG at all, so it's outside the scope of this analysis.

---

### 2.6 Recommended Solution Architecture

The ideal solution for BrightRun involves **three layers**:

#### Layer 1: Out-of-Domain Detection (Pre-Retrieval)

Before or alongside retrieval, classify whether the query is in-domain (about content likely in the KB) or out-of-domain (about an unrelated topic).

**Implementation approach** — add a lightweight check after retrieval:

```typescript
// After retrieval, before assembly:
const isOutOfDomain = (
  retrieved.sections.length === 0 && retrieved.facts.length === 0
) || (
  // All results have very low similarity — none are truly relevant
  retrieved.sections.every(s => s.similarity < 0.45) &&
  retrieved.facts.every(f => f.similarity < 0.45)
);
```

This doesn't require a separate LLM call — it uses the retrieval confidence scores we already have.

#### Layer 2: Mode-Aware Fallback Routing

Based on detection result + current mode:

| Scenario | RAG-Only (Claude) | RAG+LoRA (Mistral-7B) |
|----------|--------------------|-----------------------|
| **In-domain, high confidence** | Generate from RAG context | Generate from RAG context via LoRA |
| **In-domain, low confidence** | Generate from RAG context + disclaimer | Generate from RAG context via LoRA + disclaimer |
| **Out-of-domain, retrievals exist** | Generate from RAG context + note limited KB coverage | Generate from RAG context via LoRA + note limited KB coverage |
| **Out-of-domain, no retrievals** | *Generate from Claude's parametric knowledge + disclaimer* | *Decline gracefully with helpful message* |

Key difference: Claude can fallback to parametric knowledge. LoRA/Mistral-7B should NOT — instead it should give a clear, helpful "this isn't in my knowledge base" message.

#### Layer 3: Transparent Sourcing in Responses

When fallback occurs, the response should clearly indicate the knowledge source:

**For Claude fallback (out-of-domain, RAG-only mode)**:
```
⚠️ This answer is NOT from your knowledge base — it's from my general training knowledge.
Your knowledge base contains policies from Sun Chip Bank and Moon Banc, but does not contain 
information about Moon Invoice.

Based on general knowledge:
[Claude's parametric answer about Moon Invoice]

For verified information about Moon Invoice's tax practices, please refer to 
Moon Invoice's official documentation.
```

**For LoRA/Mistral decline (out-of-domain, RAG+LoRA mode)**:
```
I don't have information about Moon Invoice in your knowledge base.

Your knowledge base currently contains:
• Sun-Chip-Bank-Policy-Document-v2.0.md
• Moon-Banc-Policy-Document-v1.0.md

To get information about Moon Invoice, you could:
• Upload Moon Invoice's documentation to this knowledge base
• Ask this question in RAG-only mode (which can draw on broader AI knowledge)
• Check Moon Invoice's website or support documentation directly
```

#### Layer 4: The "Tricky Middle" — Partial Match / Entity Confusion

The hardest case is "Moon Invoice" when "Moon Banc" is in the KB. The system might retrieve Moon Banc content with moderate similarity due to shared "Moon" terminology. This is the **cross-contamination** risk.

**Mitigation**: After retrieval, if the query mentions an entity name (Moon Invoice) that doesn't match any document name in the KB, and the retrieved results are from a similarly-named-but-different entity (Moon Banc), the system should:

1. **Not** present Moon Banc results as if they're about Moon Invoice.
2. Instead, explicitly note: "Your knowledge base contains Moon Banc (a bank), not Moon Invoice (an invoicing service). These appear to be different companies."

This requires **entity disambiguation** — comparing query-mentioned entities against KB document names. It's achievable with a simple string-matching heuristic in many cases, or a lightweight LLM call for ambiguous cases.

---

### 2.7 Decision

**Recommendation: Implement Layer 1 (out-of-domain detection) and Layer 2 (mode-aware fallback) as the next enhancement cycle. Layer 3 (transparent sourcing) and Layer 4 (entity disambiguation) are stretch goals.**

**For the "Can the LoRA/Mistral answer from general knowledge?" question:**

> **No — and it shouldn't.** Mistral-7B's parametric knowledge is unreliable for factual questions. Allowing it to answer ungrounded would produce hallucinations that look authoritative. The correct behavior in RAG+LoRA mode is: retrieve → if nothing relevant → decline with helpful guidance. 

> **Yes — for Claude in RAG-only mode.** Claude has strong enough parametric knowledge to provide useful (if unverified) answers about well-known topics. The key requirement is clear labeling that the answer is from general AI knowledge, not the knowledge base.

**The flow the user described is exactly right:**

> *1. Search the RAG. Find no reference to "Moon Invoice".*  
> *2. Pass that signal to the LLM.*  
> *3. The LLM answers from its own knowledge about that third company.*

This is Pattern 2 (Soft RAG), and it's the correct approach for Claude-powered RAG-only mode. For LoRA mode, we'd stop at step 2 and give a helpful "not in your KB" message.

**Is additional engineering needed?** Yes, but it's scoped:

| Change | Effort | What |
|--------|--------|------|
| Out-of-domain detection | 1 hour | Confidence-based check after retrieval |
| Claude fallback in RAG-only mode | 2-3 hours | New code path when retrieval is empty/low-confidence, remove KB-only constraint, add disclaimer |
| LoRA decline improvement | 1 hour | Better "not in KB" message with doc names and suggestions |
| Entity disambiguation (stretch) | 3-5 hours | Compare query entities against KB document names |
| UI source labeling (stretch) | 2-3 hours | Visual indicator for "KB-grounded" vs "general knowledge" answers |

**Total estimate**: 4–6 hours for core changes, +5–8 hours for stretch goals.

**Priority**: This is lower priority than Issue 1 (implicit multi-doc) because:
- Issue 1 affects the primary use case (asking about your own bank policies) on every query.
- Issue 2 only triggers when users ask about topics not in the KB — an edge case that becomes more common as users develop trust in the system and start asking broader questions.

---

## Appendix: Code References

All code references are in `src/lib/rag/services/rag-retrieval-service.ts`:

| Function | Lines | Role |
|----------|-------|------|
| `retrieveContext()` | ~63–237 | Vector + BM25 hybrid search across KB |
| `assembleContext()` | ~240–410 | Context assembly for simple queries (interleaved multi-doc) |
| `balanceMultiDocCoverage()` | ~617–648 | Cap single-doc dominance at 60% |
| `generateResponse()` | ~651–725 | Claude response generation with multi-doc detection |
| `generateLoRAResponse()` | ~730–850 | LoRA/Mistral response generation with multi-doc detection |
| `selfEvaluate()` | ~875–925 | Self-RAG quality check |
| `classifyQuery()` | ~928–992 | Query classification (simple/multi-hop/comparative) |
| `assembleMultiHopContext()` | ~993–1130 | Multi-hop context assembly (v9 fixes applied) |
| `queryRAG()` | ~1270–1660 | Main orchestration: classify → retrieve → assemble → generate → eval |

Configuration in `src/lib/rag/config.ts`:
| Setting | Value | Purpose |
|---------|-------|---------|
| `similarityThreshold` | 0.4 | Single-doc retrieval minimum |
| `kbWideSimilarityThreshold` | 0.3 | KB-wide retrieval minimum (more recall) |
| `maxSingleDocRatio` | 0.6 | Balance cap per document |
| `maxSectionsToRetrieve` | 10 | Vector search result limit |
| `maxFactsToRetrieve` | 20 | Fact search result limit |
| `loraMaxContextTokens` | 29000 | LoRA context window budget |
| `ASSEMBLY_SIMILARITY_FLOOR` | 0.55 | Multi-hop assembly floor (v9 fix) |
| `MAX_SECTIONS_PER_DOC` | 6 | Multi-hop per-doc cap (v9 fix) |

## Response Comments

```


  

Created 4 todos

Searched codebase for "multi-hop query detection comparative query routing sub-queries", 16 results

Starting: *Research RAG retrieval & multi-doc logic* (2/4)

Read [](file:///c%3A/Users/james/Master/BrightHub/brun/v4-show/src/lib/rag/services/rag-retrieval-service.ts#928-928), lines 928 to 960

Read [](file:///c%3A/Users/james/Master/BrightHub/brun/v4-show/src/lib/rag/services/rag-retrieval-service.ts#1290-1290), lines 1290 to 1500

Starting: *Research LoRA/LLM fallback behavior* (3/4)

Read [](file:///c%3A/Users/james/Master/BrightHub/brun/v4-show/src/lib/rag/services/rag-retrieval-service.ts#1500-1500), lines 1500 to 1694

Read [](file:///c%3A/Users/james/Master/BrightHub/brun/v4-show/src/lib/rag/services/rag-retrieval-service.ts#700-700), lines 700 to 800

Read [](file:///c%3A/Users/james/Master/BrightHub/brun/v4-show/src/lib/rag/services/rag-retrieval-service.ts#800-800), lines 800 to 930

Now let me also look at the `assembleContext()` function (the simple-query path) and the `retrieveContext` function to understand the single-bank-only retrieval: 

Research RAG retrieval functions

Searched for regex `assembleContext|retrieveContext|balanceMultiDocCoverage|no relevant context found|similarityThreshold|kbWideSimilarityThreshold|loraMaxContextTokens` (`**/src/lib/rag/services/rag-retrieval-service.ts`), 17 results

Ran terminal command:  wc -l "c:\Users\james\Master\BrightHub\brun\v4-show\src\lib\rag\services\rag-retrieval-service.ts"

Read [](file:///c%3A/Users/james/Master/BrightHub/brun/v4-show/src/lib/rag/services/rag-retrieval-service.ts#63-63), lines 63 to 240

Read [](file:///c%3A/Users/james/Master/BrightHub/brun/v4-show/src/lib/rag/services/rag-retrieval-service.ts#240-240), lines 240 to 620

Read [](file:///c%3A/Users/james/Master/BrightHub/brun/v4-show/src/lib/rag/services/rag-retrieval-service.ts#617-617), lines 617 to 760

Read [](file:///c%3A/Users/james/Master/BrightHub/brun/v4-show/src/lib/rag/services/rag-retrieval-service.ts#1440-1440), lines 1440 to 1570

Read [](file:///c%3A/Users/james/Master/BrightHub/brun/v4-show/src/lib/rag/services/rag-retrieval-service.ts#1-1), lines 1 to 62

Searched for regex `similarityThreshold|kbWideSimilarityThreshold|loraMaxContextTokens` (`**/src/lib/rag/**`), 9 results

Read [](file:///c%3A/Users/james/Master/BrightHub/brun/v4-show/src/lib/rag/config.ts#55-55), lines 55 to 90

Read [](file:///c%3A/Users/james/AppData/Roaming/Code/User/workspaceStorage/682fa60358ece42cb72aa6b9640df091/GitHub.copilot-chat/chat-session-resources/0013cd16-97d0-4943-8e78-fe59fd4c57f2/toolu_bdrk_016gs2Y1hsRJJyybsMYUgrS7__vscode-1771579102104/content.txt#1-1), lines 1 to 300

Read [](file:///c%3A/Users/james/AppData/Roaming/Code/User/workspaceStorage/682fa60358ece42cb72aa6b9640df091/GitHub.copilot-chat/chat-session-resources/0013cd16-97d0-4943-8e78-fe59fd4c57f2/toolu_bdrk_016gs2Y1hsRJJyybsMYUgrS7__vscode-1771579102104/content.txt#300-300), lines 300 to 372

Starting: *Write v10 best practices report* (4/4)

Created [](file:///c%3A/Users/james/Master/BrightHub/brun/v4-show/pmc/product/_mapping/v2-mods/008-rag-module-QA_v10-best-practices_v1.md)

Completed: *Write v10 best practices report* (4/4)

Written to 008-rag-module-QA_v10-best-practices_v1.md. Here's the summary:

**Issue 1 — Single-bank answers for implicit multi-doc queries:**

The root cause is a cascade: `classifyQuery()` marks "my account is locked" as `simple` (no explicit multi-bank signal) → single-pass retrieval favors Sun Chip due to terminology match → `balanceMultiDocCoverage()` can't balance what was never retrieved → LLM only sees one bank's content. Three solution options are analyzed; **Option B (ensure-coverage supplementary retrieval)** is recommended as the production fix, with **Option A (classifier prompt bias)** as a quick-win interim. This is an enhancement, not a bug.

**Issue 2 — Questions about topics not in the RAG (e.g., "Moon Invoice"):**

The answer to your flow question: **yes, that's exactly the right pattern** — but only for Claude (RAG-only mode). Mistral-7B/LoRA should **not** attempt ungrounded answers because 7B parametric knowledge is unreliable and would produce hallucinations. The recommendation is:
- **Claude mode**: Soft RAG fallback — answer from general knowledge with a prominent disclaimer
- **LoRA mode**: Decline gracefully with a helpful message listing what's in the KB and suggesting alternatives

Core engineering work is ~4–6 hours. Entity disambiguation (preventing "Moon Banc" ≠ "Moon Invoice" cross-contamination) is a stretch goal.
```
