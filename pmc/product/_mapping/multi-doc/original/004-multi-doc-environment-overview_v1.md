# Frontier RAG System: Architecture Overview

**Document Version**: v1
**Created**: February 8, 2026
**Status**: Overview / Architecture Proposal
**Prerequisite Reading**: 001-rag-addition-overview_v1.md, 002-rag-creation-module_v1.md

---

## 1. Executive Summary

This document proposes a **frontier-level RAG creation system** that fundamentally departs from the traditional small-chunk embedding pipeline described in documents 001 and 002. Instead of fragmenting documents into 512-token pieces and hoping similarity search finds the right slivers, this system treats **entire documents as first-class knowledge units**, uses **frontier LLMs as the primary intelligence layer** for understanding and organizing that knowledge, and employs an **interactive human expert Q&A loop** to resolve ambiguities that no automated system can handle alone.

### The Three Premises This Architecture Serves

| Premise | What It Means | How This Architecture Addresses It |
|---------|---------------|------------------------------------|
| **A. Large-chunk operation** | Up to 500-page documents as retrieval units | Multi-tier document intelligence with hierarchical indexing; full-document injection via long-context LLMs |
| **B. Low-tech, low-attention users** | Non-technical domain experts upload documents and answer simple questions | System handles all technical complexity; user interacts through natural language only |
| **C. Expert Q&A loop** | The system asks the human targeted questions to improve knowledge quality | LLM identifies ambiguities, implicit assumptions, and domain-specific context gaps; expert answers refine the knowledge representation |

### Core Thesis

> Modern frontier LLMs (200K-1M+ token context windows) have made the traditional "chop into tiny pieces, embed, pray for good similarity matches" paradigm **unnecessary for many use cases**. The bottleneck is no longer the LLM's ability to process text — it is the **quality and context of the knowledge** fed into that window. This architecture invests in knowledge quality rather than retrieval cleverness.

---

## 2. Feasibility Assessment

### Can This Be Done as Described?

**Yes. Unambiguously yes.**

But with an important clarification: "document-level RAG with 500-page chunks" does **not** mean embedding 500 pages as a single vector. No embedding model can do that, nor would it be useful. What it means is:

1. The system **organizes knowledge at the document level** — the user thinks in documents, not chunks
2. The system **understands documents holistically** — using a frontier LLM to read the full document and generate rich metadata, summaries, entity maps, and clarification questions
3. The system **retrieves at the right granularity** — sometimes the whole document, sometimes a section, sometimes a specific fact
4. The system **injects large context** — modern LLMs can receive 100-500 pages in a single prompt when needed

### Why It's Feasible Now (But Wasn't 18 Months Ago)

| Capability | 18 Months Ago | Today (Feb 2026) |
|------------|---------------|-------------------|
| **LLM context windows** | 8K-32K tokens (~6-24 pages) | 200K-1M tokens (~150-750 pages) |
| **Embedding quality** | Good but context-blind | Contextual embeddings preserve document-level understanding |
| **Cost of LLM processing** | Expensive per document | Prompt caching, batching, and cheaper models make full-document reading practical |
| **Hierarchical retrieval** | Experimental (academic papers) | Production-ready (RAPTOR, GraphRAG, LazyGraphRAG all shipped) |
| **Multimodal document understanding** | OCR + text extraction pipeline | ColPali reads PDFs as images — tables, charts, and layout understood natively |

### What Your Existing Stack Already Supports

| Component | Role in Frontier RAG |
|-----------|---------------------|
| **Claude API** | Document reader, question generator, knowledge extractor (200K context) |
| **Supabase PostgreSQL + pgvector** | Storage for document metadata, section embeddings, entity graphs, expert answers |
| **Supabase Storage** | Original document files |
| **Next.js API Routes** | Orchestration of the ingestion + Q&A + retrieval pipeline |
| **RunPod vLLM + LoRA** | Final inference with RAG context + adapter |
| **Existing UI patterns** | Queue-based review workflows already built for enrichment pipeline |

---

## 3. The Paradigm Shift: Why Documents 001/002 Describe Yesterday's RAG

Documents 001 and 002 describe a **standard 2023-era RAG pipeline**. That pipeline was designed for an era when:

- LLMs had 4K-8K context windows and needed tiny, precise chunks to avoid exceeding limits
- Embedding models were the only intelligence in the retrieval step
- Similarity search was the only matching mechanism
- Human review meant approving/rejecting individual text fragments

### What Has Changed

```
TRADITIONAL RAG (Docs 001/002)          FRONTIER RAG (This Document)
─────────────────────────────          ─────────────────────────────

Document → Chop into 512-token         Document → LLM reads entire document
           pieces blindly                          with full understanding

Chunks → Embed each chunk              Document → LLM generates rich metadata:
          independently                            summaries, entities, relationships,
          (no context awareness)                   topics, ambiguity list, questions

Embed → Store 1536-dim vectors         Understanding → Multi-tier representation:
         in pgvector                                   document summaries, section
                                                       embeddings, entity graph,
                                                       fact propositions

Query → Cosine similarity search        Query → Intelligent routing:
         returns top-K chunks                    Which document? Which section?
                                                 What level of detail needed?

Chunks → Stuff into prompt              Context → Inject full document or
          (hoping they're relevant)               relevant sections into
                                                  long-context LLM

Response → Hope for the best           Response → Grounded in comprehensive
                                                  document understanding +
                                                  expert-validated context
```

### The Key Insight

Traditional RAG assumes the system is **stupid at indexing time** and tries to be **clever at retrieval time**. Frontier RAG flips this: be **intelligent at indexing time** (use a frontier LLM to deeply understand each document) so that retrieval becomes **straightforward** (you already know what's in each document, what it's about, and how it relates to other documents).

---

## 4. Even More Modern Algorithms: What Goes Beyond Your Description

Per your requirement to identify approaches that could make this **even easier and more user-friendly** than what you described, here are seven frontier techniques that enhance or simplify the proposed architecture.

### 4.1 Contextual Retrieval (Anthropic, 2024)

**What it does**: Before embedding any text unit, an LLM automatically prepends a contextual preamble explaining what that text is about within the larger document.

**Example**:
- Raw text: *"Revenue grew by 3% over the previous quarter."*
- With context: *"[This is from Acme Corp's Q2 2024 financial report, section 3: Revenue Analysis] Revenue grew by 3% over the previous quarter."*

**Why it matters for your system**: This is the automated version of what your human Q&A loop does — adding context that isn't in the raw text. Use this as the baseline, then layer human expert context on top for even higher quality.

**Impact**: 67% reduction in retrieval failure rate. Cost: $1.02 per million tokens (one-time at indexing).
Reply: Yes

### 4.2 RAPTOR — Hierarchical Summary Trees (Stanford, 2024)

**What it does**: Automatically builds a tree of summaries from leaf chunks up through section summaries to full-document summaries. Retrieval can happen at any level of the tree.

**Why it matters for your system**: This solves the "500-page document" problem elegantly. A broad question ("What is this company's strategy?") retrieves from high-level summaries. A specific question ("What was Q3 revenue?") retrieves from leaf-level details. No manual organization needed.

**Impact**: 20% absolute accuracy improvement on complex multi-step reasoning tasks.
Reply:
a. How "mature" is this? Are there reports of it being used in production? Are there reports of it incorrectly corrupting retrieval or storage?
b. What "is" it? Is it a pattern, or an open source software library?
c. What is the overhead of running it?
d. Will it make anything incompatible with the rest of this system?


### 4.3 LazyGraphRAG (Microsoft, 2025)

**What it does**: Builds a knowledge graph (entities + relationships) from documents but defers expensive summarization to query time. Gets 99% of GraphRAG quality at 1% of the indexing cost.

**Why it matters for your system**: For document collections where entities and their relationships matter (organizations, people, products, processes), this automatically maps the connections. When a user asks a question that spans multiple documents, the graph routes the query to the right information.

**Impact**: 99% cheaper than full GraphRAG. Comparable quality. Good for entity-rich business documents.

### 4.4 ColPali — Visual Document Understanding (2024-2025)

**What it does**: Processes document pages as images directly using a vision-language model. No OCR, no text extraction, no parsing pipeline. Tables, charts, diagrams, headers, footers — all understood natively.

**Why it matters for your system**: Your low-tech users will upload messy PDFs with complex formatting. Traditional text extraction pipelines break on tables, multi-column layouts, embedded images, and scanned documents. ColPali skips the entire extraction step.

**Impact**: Outperforms all traditional document retrieval pipelines on the ViDoRe benchmark. Eliminates the most fragile part of any RAG pipeline (document parsing).


### 4.5 Self-RAG / Corrective RAG — Self-Healing Retrieval (2024-2025)

**What it does**: The system evaluates its own retrieval results before generating a response. If retrieved context is irrelevant or insufficient, it re-queries, searches the web, or acknowledges the gap instead of hallucinating.

**Why it matters for your system**: Reduces the need for human QA on the retrieval side. The system catches its own mistakes. This is especially valuable for low-tech users who won't notice when the system retrieves the wrong context.

**Impact**: Significant reduction in hallucinations. The system knows when it doesn't know.

### 4.6 HyDE — Hypothetical Document Embeddings (Evolved, 2025)

**What it does**: When a user asks a question, the system first generates a hypothetical answer, then uses that answer to search for matching real documents. This bridges the vocabulary gap between how users ask questions and how documents are written.

**Why it matters for your system**: Low-tech users ask questions in their own words, which often don't match the formal language of documents. HyDE translates the user's intent into document-like language before searching.

**Impact**: Up to 42% improvement in retrieval precision. Zero changes to the knowledge base required.

### 4.7 Agentic RAG — Autonomous Retrieval Planning (2025)

**What it does**: Instead of a single retrieve-then-generate step, an AI agent plans a multi-step retrieval strategy: decompose complex questions, search different sources, synthesize partial results, verify answers, and iterate until confident.

**Why it matters for your system**: Complex questions from business users often require information from multiple documents or multiple sections. An agent can orchestrate this without the user needing to ask multiple questions.

**Impact**: Handles complex, multi-hop questions that single-step RAG fails on. Makes the system feel genuinely intelligent to the end user.

### Summary: Which Techniques to Adopt

| Technique | Effort to Implement | Quality Impact | Recommended? |
|-----------|---------------------|----------------|--------------|
| **Contextual Retrieval** | Low | Very High (67% improvement) | **Yes — foundational** |
| **RAPTOR** | Medium | High (20% improvement) | **Yes — solves document-level problem** |
| **LazyGraphRAG** | Medium-High | High for entity-rich docs | **Yes — for multi-document queries** |
| **ColPali** | Medium | High for complex PDFs | **Yes — eliminates parsing fragility** |
| **Self-RAG / Corrective RAG** | Medium | High (reduces hallucinations) | **Yes — critical for trust** |
| **HyDE** | Low | Moderate (42% precision) | **Yes — easy win** |
| **Agentic RAG** | High | Very High for complex queries | **Phase 2 — add after core is working** |

---

## 5. Recommended Architecture Overview

### 5.1 System Architecture — Three Pillars

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        FRONTIER RAG CREATION SYSTEM                              │
│                                                                                  │
│   PILLAR 1:                  PILLAR 2:                  PILLAR 3:               │
│   INGESTION PIPELINE         HUMAN EXPERT Q&A           RAG INDEX & RETRIEVAL   │
│   ──────────────────         ──────────────────         ─────────────────────    │
│                                                                                  │
│   Upload document            LLM generates              Multi-tier retrieval     │
│          ↓                   targeted questions          from document metadata,  │
│   LLM reads entire                  ↓                   section embeddings,      │
│   document (200K ctx)        Expert answers in           entity graphs            │
│          ↓                   natural language                    ↓                │
│   Generate rich                     ↓                   Long-context injection   │
│   knowledge representation   Answers refine              into vLLM + LoRA        │
│          ↓                   knowledge representation           ↓                │
│   Build multi-tier index            ↓                   Response with citations  │
│          ↓                   System confirms                                     │
│   Ready for Q&A loop        understanding with                                   │
│                              the expert                                           │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### 5.2 Pillar 1: Ingestion Pipeline

The ingestion pipeline replaces the traditional "chunk → embed → store" approach with an **LLM-native document understanding** approach.

#### Stage 1: Document Upload

The user uploads a document. That's it. No configuration, no chunking parameters, no embedding model selection.

- Accepted formats: PDF, DOCX, TXT, Markdown, HTML
- No file size limits beyond platform storage constraints (Supabase handles large files)
- The user provides optional brief context: "This is our employee handbook" or "These are our therapy session guidelines"
- The system stores the original file and begins processing

#### Stage 2: Full-Document Reading (LLM-Powered)

A frontier LLM (Claude, 200K context) reads the **entire document** in one pass. This is the critical departure from traditional RAG: instead of blindly chopping text into pieces, the system understands the document first.

**What the LLM generates from each document:**

| Output | Purpose |
|--------|---------|
| **Document Summary** (500-1000 words) | High-level understanding for document routing |
| **Section Breakdown** | Natural divisions within the document (chapters, sections, topics) |
| **Key Entities** | People, organizations, products, concepts, processes mentioned |
| **Key Facts** | Atomic factual statements extracted from the document |
| **Topic Taxonomy** | What subjects this document covers, at multiple levels of specificity |
| **Cross-Reference Candidates** | How this document likely relates to other documents in the knowledge base |
| **Ambiguity List** | Terms, references, or assumptions that are unclear without domain expertise |
| **Expert Questions** | Targeted questions that, if answered, would significantly improve the system's understanding |

**For documents exceeding 200K tokens** (roughly 150+ pages): The system processes the document in overlapping windows, with a final synthesis pass that reconciles the windows into a unified understanding.

#### Stage 3: Multi-Tier Knowledge Representation

The LLM's understanding is organized into a **hierarchical knowledge structure**:

```
TIER 1: DOCUMENT LEVEL
┌─────────────────────────────────────────────────────────────┐
│  Document summary + metadata + topic taxonomy               │
│  Embedded as a single vector for document-level routing     │
│  "Which document answers this question?"                    │
└──────────────────────────────┬──────────────────────────────┘
                               │
TIER 2: SECTION LEVEL          ▼
┌─────────────────────────────────────────────────────────────┐
│  Section summaries + section text + section metadata         │
│  Each section embedded independently WITH document context   │
│  (Contextual Retrieval applied here)                        │
│  "Which part of this document is relevant?"                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
TIER 3: FACT / ENTITY LEVEL    ▼
┌─────────────────────────────────────────────────────────────┐
│  Atomic facts, entity definitions, key relationships         │
│  Organized as a mini knowledge graph per document           │
│  "What specific fact answers this question?"                │
└─────────────────────────────────────────────────────────────┘
```

This is essentially an automated RAPTOR-style hierarchy, but driven by LLM comprehension rather than blind recursive clustering.

#### Stage 4: Embedding and Indexing

With the knowledge representation built, the system embeds at multiple tiers:

- **Tier 1 (Document)**: Document summary + topic taxonomy → single embedding for routing
- **Tier 2 (Section)**: Each section summary (with contextual preamble) → section embeddings for targeted retrieval
- **Tier 3 (Fact/Entity)**: Key facts and entity definitions → fine-grained embeddings for specific questions

All stored in pgvector. The same infrastructure as documents 001/002 proposed, but the **units being embedded are intelligent summaries and contextual sections**, not blind 512-token slices.

---

### 5.3 Pillar 2: Human Expert Q&A System

This is the most innovative component of the architecture and the primary quality differentiator over automated-only systems.

#### The Core Insight

No automated system — no matter how sophisticated — can resolve every ambiguity in a domain document. Documents contain:

- **Implicit knowledge**: Assumptions the author made about what the reader already knows
- **Domain jargon**: Terms that mean different things in different contexts
- **Unstated relationships**: Connections between concepts that are obvious to a domain expert but invisible to an outside reader
- **Context-dependent meaning**: Statements that are true only in specific situations

The Q&A loop addresses all of these by asking the person who **already has this knowledge** to make it explicit.

#### How the Q&A Loop Works

```
PHASE 1: UPFRONT CONTEXT
─────────────────────────
User uploads document and provides brief context:
  "This is our clinical therapy guidebook used by our counselors.
   It covers CBT, DBT, and mindfulness-based approaches."

PHASE 2: LLM ANALYSIS + QUESTION GENERATION
────────────────────────────────────────────
LLM reads entire document and identifies gaps.
Generates targeted questions, ranked by impact:

  HIGH IMPACT:
  Q1: "The document references 'the standard protocol' in several
       places without defining it. What does this refer to?"
  Q2: "Chapter 4 discusses 'client readiness assessment' but doesn't
       specify criteria. What determines readiness in your practice?"

  MEDIUM IMPACT:
  Q3: "The term 'session progression' appears to mean different things
       in chapters 2 vs 5. Can you clarify the distinction?"
  Q4: "The document mentions 'supervisor approval' for certain
       interventions. Who are the typical supervisors, and what
       is the approval process?"

  NICE TO HAVE:
  Q5: "Are there any recent updates to the CBT protocols described
       in chapter 3 that aren't reflected in this document?"

PHASE 3: EXPERT ANSWERS
────────────────────────
Expert answers questions in natural language through a simple UI.
No technical knowledge required. Just domain expertise.

  A1: "The standard protocol refers to our 12-session intake process
       where we do assessment, goal-setting, and..."

  A2: "Readiness is determined by three factors: the client has
       completed intake, the therapist has reviewed history, and..."

PHASE 4: KNOWLEDGE REFINEMENT
─────────────────────────────
LLM integrates expert answers into the knowledge representation:
  - Ambiguous terms now have explicit definitions
  - Implicit knowledge is now part of the context
  - Section summaries are updated with clarified meaning
  - Entity definitions enriched with expert context
  - Embeddings regenerated for affected sections

PHASE 5: VERIFICATION (OPTIONAL)
────────────────────────────────
System generates sample questions and shows the expert what
answers would be produced. Expert confirms or corrects.
  "If someone asked 'When should I start CBT with a new client?',
   the system would answer: [generated answer]. Is this correct?"
```

#### Design Principles for the Q&A Loop

| Principle | Rationale |
|-----------|-----------|
| **Questions are ranked by impact** | Respect the expert's time. High-impact questions first. |
| **Natural language in, natural language out** | No forms, no dropdowns, no checkboxes. The expert just talks. |
| **Minimal questions per document** | Target 3-8 questions. More than 10 loses the low-attention user. |
| **Progressive refinement** | Start with the most critical gaps. Come back for more detail later if needed. |
| **Always optional** | The system works without expert answers. Answers just make it better. |
| **Explain why each question matters** | "We're asking this because it will help the system accurately answer questions about [topic]." |

#### What Makes This Different from Document 001's "Review Queue"

| Document 001 Approach | This Approach |
|------------------------|---------------|
| Human reviews individual chunks (hundreds per document) | Human answers 3-8 targeted questions per document |
| Human approves/rejects/edits text fragments | Human provides domain knowledge in natural language |
| Requires understanding of what a "good chunk" looks like | Requires only domain expertise — no technical understanding |
| Time per document: hours (reviewing hundreds of chunks) | Time per document: 10-20 minutes (answering a few questions) |
| Quality ceiling: only as good as the chunk boundaries | Quality ceiling: the expert's actual domain knowledge |

---

### 5.4 Pillar 3: RAG Index & Retrieval

#### Multi-Tier Retrieval Strategy

When a user asks a question, the system doesn't just do a single cosine similarity search. It uses an intelligent multi-step process:

```
USER QUERY
    │
    ▼
STEP 1: QUERY UNDERSTANDING
┌─────────────────────────────────────────────────────────────┐
│  Classify the query:                                         │
│  - Broad or specific?                                        │
│  - Which topic domain?                                       │
│  - Single-document or cross-document?                        │
│  - Factual lookup or contextual understanding?               │
│                                                              │
│  Apply HyDE: Generate a hypothetical answer to improve       │
│  search accuracy                                             │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
STEP 2: DOCUMENT ROUTING (TIER 1)
┌─────────────────────────────────────────────────────────────┐
│  Search document-level embeddings (summaries + metadata)     │
│  Identify which 1-3 documents are most relevant              │
│  Use topic taxonomy for additional filtering                 │
│                                                              │
│  For most queries: 1 document. For comparative queries: 2-3  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
STEP 3: SECTION RETRIEVAL (TIER 2)
┌─────────────────────────────────────────────────────────────┐
│  Within the identified document(s):                          │
│  Search section-level embeddings                             │
│  Rank sections by relevance                                  │
│                                                              │
│  If total relevant section size < LLM context limit:         │
│    → Include all relevant sections (maximize context)        │
│  If total exceeds limit:                                     │
│    → Include top-ranked sections up to limit                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
STEP 4: FACT ENRICHMENT (TIER 3) — OPTIONAL
┌─────────────────────────────────────────────────────────────┐
│  For factual queries: add specific facts from entity graph   │
│  For queries about relationships: add entity connections     │
│  Include expert-provided context for relevant terms          │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
STEP 5: CONTEXT ASSEMBLY + GENERATION
┌─────────────────────────────────────────────────────────────┐
│  Assemble final prompt:                                      │
│  - System prompt (includes LoRA adapter guidance)            │
│  - Document context (sections + facts + expert annotations)  │
│  - Expert-provided definitions for domain terms              │
│  - User query                                                │
│  - Citation markers for source tracking                      │
│                                                              │
│  Send to: vLLM (Mistral-7B + EI LoRA adapter)               │
│  Or: Any other LLM endpoint (architecture is portable)       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
STEP 6: SELF-EVALUATION (CORRECTIVE RAG)
┌─────────────────────────────────────────────────────────────┐
│  Evaluate response quality:                                  │
│  - Is the response grounded in the retrieved context?        │
│  - Are citations accurate?                                   │
│  - Does the response actually answer the question?           │
│                                                              │
│  If quality is low:                                          │
│    → Re-query with refined search (expand/narrow scope)      │
│    → Acknowledge uncertainty rather than hallucinate          │
└─────────────────────────────────────────────────────────────┘
```

#### How This Differs from Traditional RAG Retrieval

| Traditional (Docs 001/002) | Frontier (This Architecture) |
|---------------------------|------------------------------|
| Single-step: query → cosine search → top-K chunks | Multi-step: understand → route → retrieve → enrich → evaluate |
| Fixed K (e.g., top-5 chunks always) | Adaptive context sizing based on query complexity |
| Same retrieval strategy for every query | Query classification determines retrieval approach |
| No self-evaluation | Corrective RAG catches bad retrievals before responding |
| Raw chunks in prompt | Intelligently assembled context with expert annotations |

---

## 6. Integration with Existing LoRA Adapter System

### Nothing Changes at the Inference Layer

The LoRA adapter operates at the model weight level. The RAG system operates at the prompt level. They are fully independent and complementary:

```
┌─────────────────────────────────────────────────────────────────┐
│                   FRONTIER RAG + LoRA SYNERGY                    │
│                                                                  │
│  RAG PROVIDES (via prompt):          LoRA PROVIDES (via weights):│
│  ─────────────────────────           ────────────────────────────│
│  • Domain knowledge from docs        • Emotional intelligence    │
│  • Expert-validated context           • Response tone & style    │
│  • Factual grounding                  • Personality consistency  │
│  • Source citations                   • Trained behavior patterns│
│  • Cross-document connections         • Therapeutic techniques   │
│                                                                  │
│  COMBINED RESULT:                                                │
│  Factually grounded, domain-aware responses delivered with       │
│  emotionally intelligent style and appropriate therapeutic tone  │
└─────────────────────────────────────────────────────────────────┘
```

### What Stays the Same

- LoRA adapter files (no retraining)
- RunPod pod configuration
- vLLM startup scripts
- Adapter loading mechanism
- Model selection logic
- A/B testing infrastructure

### What Gets Enhanced

- The inference service accepts RAG context as an additional prompt component
- The chat interface gains a knowledge base selector and source citations
- A/B testing can now compare: base model vs LoRA vs RAG vs RAG+LoRA (four-way comparison if desired)

---

## 7. The User Experience: What the Non-Technical Expert Actually Does

This section describes the entire experience from the perspective of the low-tech, low-attention business user.

### Step 1: Upload (2 minutes)

The user clicks "Add Knowledge," drags in a PDF, and optionally types a one-sentence description:
> "This is our therapy center's clinical practice guide, 2024 edition."

They click "Process" and wait. The system shows a progress indicator: "Reading your document..."

### Step 2: Answer Questions (10-20 minutes)

The system presents 3-8 questions in a simple chat-like interface:

> **System**: "Your document mentions 'Phase 2 interventions' several times but doesn't clearly define what distinguishes Phase 2 from Phase 1. Can you briefly describe the difference?"
>
> **Expert**: "Phase 1 is assessment and rapport building. Phase 2 is active therapeutic intervention where we start using specific techniques like CBT restructuring."
>
> **System**: "Got it. The document references several acronyms (ERP, PE, CPT) without definitions. Are these standard therapy modalities your staff would know, or should the system explain them when they come up?"
>
> **Expert**: "Those are standard — ERP is Exposure Response Prevention, PE is Prolonged Exposure, CPT is Cognitive Processing Therapy. Our staff knows these but clients might not."

The user can skip any question. The system works without all answers — each answer just improves quality.

### Step 3: Verify (Optional, 5 minutes)

The system shows 2-3 sample questions and what it would answer:

> **System**: "Here's how I'd answer a question about your document. Does this seem right?"
>
> **Sample question**: "When should a counselor escalate to a supervisor?"
>
> **System's answer**: "According to your clinical practice guide, counselor-to-supervisor escalation should occur when: (1) a client presents with suicidal ideation, (2) treatment progress has stalled for more than 3 sessions, or (3) the counselor encounters a clinical situation outside their competency area. The supervisor approval process involves [details from expert's earlier answer]."
>
> **Expert**: "Yes, that's correct."

### Step 4: Use (Ongoing)

The knowledge base is live. When the user (or anyone authorized) asks questions through the chat interface, the system retrieves relevant context from the processed documents and generates responses styled by the LoRA adapter.

### Total Expert Time Investment Per Document: 15-30 Minutes

Compare this to Document 002's review queue approach, which would require hours of chunk-by-chunk review for a 500-page document.

---

## 8. Architecture Decisions and Trade-Offs

### Decision 1: Primary LLM for Document Understanding

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **Claude (Anthropic)** | 200K context, excellent comprehension, already in stack | Cost per document, API dependency | **Recommended** — already integrated, largest context window reliably available |
| **Gemini (Google)** | 1M+ context for very large documents | New API integration, different strengths | Consider for documents >150 pages |
| **Local LLM** | No API costs, privacy | Smaller context windows, lower comprehension | Not recommended for document understanding |

### Decision 2: Embedding Model

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **OpenAI text-embedding-3-small** | Industry-leading quality, 8K context, low cost | API dependency | **Recommended** for most use cases |
| **OpenAI text-embedding-3-large** | Highest quality | Higher cost | For premium accuracy needs |
| **Jina Embeddings v3** | Late chunking support, 8K context, open weights | Newer, less battle-tested | Consider for late chunking approach |

### Decision 3: Document Parsing Strategy

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **Traditional (pdf-parse + mammoth)** | Simple, well-understood, free | Breaks on complex layouts, tables, images | For simple text-heavy documents |
| **ColPali (visual processing)** | Handles any layout, tables, charts | Newer technology, requires GPU | **Recommended for complex PDFs** |
| **Hybrid** | Best of both worlds | More complex pipeline | **Best approach** — use text extraction first, fall back to visual for complex pages |

### Decision 4: Knowledge Graph Depth

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **No graph (embeddings only)** | Simplest to implement | Misses entity relationships | For MVP / Phase 1 |
| **Lightweight entity extraction** | Captures key relationships | Moderate complexity | **Recommended** — good balance |
| **Full GraphRAG** | Best for complex multi-document queries | Significant implementation effort | Phase 2 enhancement |
| **LazyGraphRAG** | 99% cheaper than full, comparable quality | Newer approach | **Recommended** for Phase 2 |

### Decision 5: Inference LLM for RAG Responses

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **Mistral-7B + LoRA (current)** | Already deployed, LoRA provides style | 32K context window limits RAG context size | **Default** — works for most queries |
| **Larger model (Qwen-32B, Llama-3-70B)** | Larger context window, better comprehension | More GPU resources, new LoRA needed | Future upgrade path |
| **Claude (for complex queries)** | 200K context, excellent reasoning | No LoRA adapter, API cost | Fallback for queries requiring huge context |

---

## 9. Phased Implementation Roadmap

### Phase 1: Foundation + Core Ingestion (MVP)

**Goal**: Upload a document → LLM reads it → generates summaries + sections + questions → stores in Supabase

**What gets built**:
- Document upload and storage
- LLM document reading pipeline (Claude API)
- Summary, section breakdown, and metadata generation
- Basic embedding and storage in pgvector
- Simple Q&A interface for expert questions

**What you can test**: Upload a document, see the system's understanding, answer questions, verify comprehension

### Phase 2: Retrieval + Chat Integration

**Goal**: Ask questions → system retrieves relevant context → generates responses via existing inference endpoint

**What gets built**:
- Multi-tier retrieval (document → section → fact)
- Context assembly and prompt formatting
- Integration with existing inference service (vLLM + LoRA)
- RAG toggle in chat UI
- Source citation display

**What you can test**: Full end-to-end RAG + LoRA conversations with source citations

### Phase 3: Intelligence Enhancements

**Goal**: Improve retrieval quality with frontier techniques

**What gets built**:
- HyDE (hypothetical document embeddings) for query expansion
- Contextual Retrieval for better section embeddings
- Self-evaluation / Corrective RAG for response validation
- RAPTOR-style hierarchical indexing for large document collections

**What you can test**: Measurably better retrieval accuracy and response quality

### Phase 4: Advanced Features

**Goal**: Scale to multi-document knowledge bases with cross-document intelligence

**What gets built**:
- LazyGraphRAG for entity-relationship mapping across documents
- Multi-document Q&A (questions that require information from multiple sources)
- Knowledge base versioning and document updates
- Agentic RAG for complex, multi-step queries
- ColPali visual document understanding for complex PDFs

**What you can test**: Complex queries spanning multiple documents, visual document processing

---

## 10. Comparison: Traditional (001/002) vs Frontier (This Document)

| Dimension | Traditional RAG (Docs 001/002) | Frontier RAG (This Document) |
|-----------|-------------------------------|------------------------------|
| **Chunk size** | 512-1024 tokens (fixed) | Document-level understanding with multi-tier retrieval |
| **Intelligence at indexing** | None — blind chunking + embedding | High — LLM reads and understands each document |
| **Human involvement** | Review hundreds of chunks per document | Answer 3-8 targeted questions per document |
| **Time per document (expert)** | Hours | 15-30 minutes |
| **Retrieval mechanism** | Single cosine similarity search | Multi-tier intelligent routing with self-evaluation |
| **Context quality** | Raw text fragments, often missing context | LLM-generated summaries + expert-validated annotations |
| **Error handling** | None — bad chunks silently degrade quality | Self-RAG catches bad retrievals automatically |
| **Query flexibility** | Same approach for all queries | Query classification determines retrieval strategy |
| **Document complexity** | Breaks on tables, images, complex layouts | ColPali handles any document format natively |
| **Cross-document queries** | Limited to chunk-level matches | Entity graph maps relationships across documents |
| **User experience** | Technical (chunk review UI) | Non-technical (answer questions in natural language) |
| **LLM portability** | Both are LLM-agnostic at the RAG layer | Same — fully portable |
| **LoRA compatibility** | Fully compatible | Fully compatible — same integration point |
| **Estimated build time** | 9-12 weeks | Phase 1+2: 8-10 weeks; Full system: 16-20 weeks |
| **Quality ceiling** | Limited by chunk boundary quality | Limited by LLM comprehension + expert knowledge |

---

## 11. Open Questions for Discussion

Before proceeding to detailed implementation planning, the following questions should be resolved:

### Architecture Questions

1. **Which LLM for document understanding?** Claude is recommended (already in stack, 200K context). Confirm this choice vs. adding Gemini for very large documents.

2. **Embedding model selection?** OpenAI text-embedding-3-small is the practical default. Is there a preference for open-source/self-hosted to avoid API dependency?

3. **ColPali for visual document processing?** This is a significant quality improvement for complex PDFs but adds implementation complexity. Is this a Phase 1 requirement or Phase 4 enhancement?

4. **Knowledge graph depth?** Lightweight entity extraction is recommended for Phase 1. Full LazyGraphRAG for Phase 2+. Does the expected document corpus have significant entity relationships (organizations, processes, cross-references)?

### Product Questions

5. **What types of documents will be ingested first?** This determines parsing priority. Text-heavy PDFs? DOCX with tables? Scanned documents?

6. **How many documents in a typical knowledge base?** 5-10 documents behaves very differently from 500+ documents. This affects retrieval strategy.

7. **Will the LoRA adapter always be active during RAG queries?** Or should users be able to use RAG alone (without LoRA styling)?

8. **Multi-tenancy?** Will different users/organizations have separate knowledge bases, or is this a single-tenant system?

### Scope Questions

9. **What defines "Phase 1 done"?** Is it "upload one document, answer questions, ask questions and get good answers"? Or does it include multi-document support from the start?
**James Decision:** Yes, this defines Phase 1 done. And it is in fact working.

10. **Priority between quality and speed?** The Q&A loop significantly improves quality but adds a human step. Should the system also support a "fast mode" that skips expert questions for rapid prototyping?

---

## 12. Summary

### The Three Deliverables Requested

**1. Can this be done as requested?**

Yes. The proposed system of document-level RAG with large chunks, low-tech user experience, and human expert Q&A is fully feasible with your current technology stack. The key enablers are modern long-context LLMs (Claude 200K), pgvector for multi-tier storage, and your existing Next.js + Supabase infrastructure.

**2. Are there even more modern algorithms?**

Yes — seven frontier techniques identified. The most impactful are:
- **Contextual Retrieval** (67% accuracy improvement, easy to implement)
- **RAPTOR** (hierarchical document understanding, solves the large-document problem)
- **ColPali** (eliminates document parsing fragility)
- **Self-RAG/Corrective RAG** (self-healing retrieval, critical for user trust)
- **HyDE** (bridges vocabulary gap for non-technical users)

These techniques make the system **even more user-friendly and less human-effort** than the original description. Several are near-automatic — they improve quality without requiring any additional human work.

**3. Overview stage request (this document)**

This document provides the complete architectural overview. No implementation code or configurations are included. The system is designed in four phases, with Phase 1+2 delivering a functional end-to-end system and Phases 3+4 adding frontier intelligence enhancements.

---

**Document Owner**: Project Management & Control (PMC)
**File Location**: `pmc/product/_mapping/v2-mods/004-rag-frontier-overview_v1.md`
