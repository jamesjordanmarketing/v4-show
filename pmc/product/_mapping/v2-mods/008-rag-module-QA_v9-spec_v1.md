# 008 RAG Module QA — v9 Implementation Specification

**Created**: February 21, 2026  
**Type**: Implementation Specification (for building agent execution)  
**Upstream Investigation**: `008-rag-module-QA_v8.md`  
**Status**: Ready for Implementation

---

## 1. Objective

Modify the `assembleMultiHopContext()` function in a single file to fix four issues that cause the LoRA model (Mistral-7B) to ignore second-document content when answering multi-document comparative queries. All four fixes target the same function in the same file.

**File to modify**:  
`src/lib/rag/services/rag-retrieval-service.ts`

**Function to modify**:  
`assembleMultiHopContext()` — starts at **line 977**, ends at approximately **line 1098**.

**No other files need to be modified.** No config changes. No new files.

---

## 2. Problem Summary

When users ask comparative questions across two bank policy documents (Sun Chip Bank and Moon Banc), the LoRA model only answers using one bank's data even though both banks' sections are present in the context. Root cause analysis identified four contributing factors, all within `assembleMultiHopContext()`:

1. **Grouped output** — All sections from Document A appear before any sections from Document B. The 7B model loses attention to later content ("lost in the middle" bias).
2. **No similarity floor** — Sections with similarity as low as 0.350 are included, polluting the context with irrelevant noise (e.g., "Change Log", "Jumbo Mortgage Program").
3. **No per-document section cap** — One document can contribute 11 sections vs 6 for the other, creating imbalance.
4. **Key Facts positioned last** — The most structured comparison data is buried at the end of the context.

---

## 3. Current Code (In Full)

The complete current function is at lines 977–1098 of `src/lib/rag/services/rag-retrieval-service.ts`:

```typescript
function assembleMultiHopContext(params: {
  originalQuery: string;
  subQueries: string[];
  sections: Array<RAGSection & { similarity: number }>;
  facts: Array<RAGFact & { similarity: number }>;
  documentNames: Map<string, string>;
  maxTokens?: number;
}): string {
  // Token estimation: chars / 4 (same heuristic as assembleContext)
  const estimateTokens = (text: string): number => Math.ceil(text.length / 4);
  const maxTokens = params.maxTokens || Infinity;

  const parts: string[] = [];
  let usedTokens = 0;

  // Headers (original question + sub-questions) — always included, count against budget
  const headerPart = `## Original Question\n${params.originalQuery}`;
  const subQPart = `## Sub-Questions Investigated\n${params.subQueries.map((q, i) => `${i + 1}. ${q}`).join('\n')}`;
  usedTokens += estimateTokens(headerPart) + estimateTokens(subQPart);
  parts.push(headerPart);
  parts.push(subQPart);

  // Group sections by document, each doc sorted by similarity descending
  const sectionsByDoc = new Map<string, Array<RAGSection & { similarity: number }>>();
  for (const section of params.sections) {
    const existing = sectionsByDoc.get(section.documentId) || [];
    existing.push(section);
    sectionsByDoc.set(section.documentId, existing);
  }
  for (const docSections of Array.from(sectionsByDoc.values())) {
    docSections.sort((a, b) => b.similarity - a.similarity);
  }

  // Reserve ~15% of remaining budget for facts
  const remainingAfterHeaders = maxTokens - usedTokens;
  const factBudget = Math.floor(remainingAfterHeaders * 0.15);
  const sectionBudget = remainingAfterHeaders - factBudget;

  // Build section list using round-robin across documents (balanced truncation)
  const docEntries = Array.from(sectionsByDoc.entries());
  const maxRounds = Math.max(...docEntries.map(([, s]) => s.length), 0);
  let sectionTokensUsed = 0;
  let truncated = false;

  // Pre-build the evidence header
  const evidenceHeader = '## Evidence from Documents';
  sectionTokensUsed += estimateTokens(evidenceHeader);

  // Pre-compute per-doc header tokens so they count against budget
  const docHeaders = new Map<string, string>();
  for (const [docId] of docEntries) {
    const docName = params.documentNames.get(docId) || docId;
    const docHeader = `### From: ${docName}`;
    docHeaders.set(docId, docHeader);
    sectionTokensUsed += estimateTokens(docHeader);
  }

  // Round-robin selection: pick sections in balanced order, track per-doc
  const selectedByDoc = new Map<string, string[]>();
  for (const [docId] of docEntries) {
    selectedByDoc.set(docId, []);
  }

  for (let round = 0; round < maxRounds && !truncated; round++) {
    for (const [docId, docSections] of docEntries) {
      if (round >= docSections.length) continue;
      const section = docSections[round];
      const preamble = section.contextualPreamble ? `Context: ${section.contextualPreamble}\n` : '';
      const sectionText = `#### ${section.title || 'Untitled'} [similarity: ${section.similarity.toFixed(3)}]\n${preamble}${section.originalText}`;
      const sectionTokens = estimateTokens(sectionText);

      if (sectionTokensUsed + sectionTokens > sectionBudget) {
        truncated = true;
        break;
      }
      selectedByDoc.get(docId)!.push(sectionText);
      sectionTokensUsed += sectionTokens;
    }
  }

  // Assemble with sections NESTED under their document headers
  const sectionParts: string[] = [evidenceHeader];
  for (const [docId] of docEntries) {
    const docSections = selectedByDoc.get(docId)!;
    if (docSections.length === 0) continue;
    // Document header followed by its sections — no separation/disconnect
    sectionParts.push(`${docHeaders.get(docId)}\n\n${docSections.join('\n\n')}`);
  }
  parts.push(...sectionParts);
  usedTokens += sectionTokensUsed;

  if (truncated) {
    console.log(`[assembleMultiHopContext] Truncated sections to fit ${maxTokens} token budget (used ~${usedTokens} for sections)`);
  }

  // Add facts within remaining budget
  if (params.facts.length > 0) {
    const factHeader = '## Key Facts';
    let factTokensUsed = estimateTokens(factHeader);
    const factParts: string[] = [factHeader];

    for (const fact of params.facts) {
      const factText = `- [${fact.factType}] ${fact.content} (confidence: ${fact.confidence})`;
      const factTokens = estimateTokens(factText);
      if (factTokensUsed + factTokens > factBudget) {
        console.log(`[assembleMultiHopContext] Truncated facts to fit budget`);
        break;
      }
      factParts.push(factText);
      factTokensUsed += factTokens;
    }

    if (factParts.length > 1) {
      parts.push(...factParts);
      usedTokens += factTokensUsed;
    }
  }

  const assembled = parts.join('\n\n');
  console.log(`[assembleMultiHopContext] Assembled ~${estimateTokens(assembled)} tokens (budget: ${maxTokens === Infinity ? 'unlimited' : maxTokens})`);
  return assembled;
}
```

---

## 4. Fix Specifications (4 Fixes, All in Same Function)

### Fix A: Interleave Section Output (P0 — CRITICAL)

**What**: Change the output ordering from "grouped by document" to "interleaved by document (round-robin)". Each section must carry its source document name inline.

**Why**: Currently all Sun Chip sections (11) appear before any Moon Banc sections (6). The 7B LoRA model loses attention to content after position ~10. By interleaving (Sun→Moon→Sun→Moon→...), both documents' content appears throughout the prompt, preventing position-bias failure. This was proven to work in the `assembleContext()` function where Query 2 successfully named both banks.

**Current output format** (grouped — bad):
```
## Evidence from Documents

### From: Sun-Chip-Bank-Policy-Document-v2.0.md

#### BC-ELIG-001: Minimum Balance [similarity: 0.802]
<Sun Chip content>

#### Eligibility Standards [similarity: 0.741]
<Sun Chip content>

... (9 more Sun Chip sections) ...

### From: Moon-Banc-Policy-Document-v1.0.md

#### MB-ELIG-001: Minimum Asset [similarity: 0.709]
<Moon Banc content — model has lost attention by here>
```

**Target output format** (interleaved — good):
```
## Evidence from Documents

### [Sun-Chip-Bank-Policy-Document-v2.0.md] BC-ELIG-001: Minimum Balance [similarity: 0.802]
<Sun Chip content>

### [Moon-Banc-Policy-Document-v1.0.md] MB-ELIG-001: Minimum Asset [similarity: 0.709]
<Moon Banc content>

### [Sun-Chip-Bank-Policy-Document-v2.0.md] Eligibility Standards [similarity: 0.741]
<Sun Chip content>

### [Moon-Banc-Policy-Document-v1.0.md] Fee Schedule [similarity: 0.668]
<Moon Banc content>

... (continues alternating) ...
```

**Implementation details**:

1. Remove the `selectedByDoc` Map and the grouped output loop (lines 1055–1065 in current code).
2. Instead, during the round-robin selection loop, collect sections into a SINGLE flat array IN ROUND-ROBIN ORDER, attaching each section's `docId`.
3. In the output phase, iterate over this flat array. For each section, emit a `### [DocName] SectionTitle [similarity: X.XXX]` heading (using `###` not `####`).
4. The `## Evidence from Documents` header is still emitted once at the top.
5. Remove the per-document `### From: DocName` headers. Document attribution is now per-section via the `[DocName]` prefix.

**The section text format changes from**:
```
#### SectionTitle [similarity: 0.802]
Context: <preamble>
<text>
```

**To**:
```
### [DocName] SectionTitle [similarity: 0.802]
Context: <preamble>
<text>
```

Note the heading level changes from `####` to `###` since we removed the `### From:` grouping level.

**IMPORTANT for downstream compatibility**: The `generateLoRAResponse()` function (line ~770) detects multi-doc context by checking for `'## From:'` or `'### From:'` in the assembled context. After this fix, the headers will be `### [DocName]` instead. The detector regex at line ~774 is:
```typescript
const loraHeaderRegex = /##?# From: (.+)/g;
```
This will no longer match. **You must also update the multi-doc detection** in `generateLoRAResponse()` to handle the new format. Specifically:

- The check on line ~770: `assembledContext.includes('## From:') || assembledContext.includes('### From:')` — change to also detect `### [` (the new per-section format).
- The regex on line ~774: `/##?# From: (.+)/g` — change to also capture `### [DocName]` patterns. A suitable regex: `/##?#?\s*(?:From:\s*(.+?)|\[(.+?)\])/g` — or, more simply, extract document names from the `documentNames` Map that is available upstream.

**HOWEVER**, there is a simpler approach: since the interleaved format no longer has `### From:` headers, the multi-doc detection in `generateLoRAResponse()` needs a different signal. The simplest fix is to check for `### [` which will be present whenever per-section doc attribution exists. 

**Update the multi-doc detection in `generateLoRAResponse()` (around lines 770–780)**:

Current code:
```typescript
const isLoRAMultiDoc = assembledContext.includes('## From:') || assembledContext.includes('### From:');
let loraMultiDocInstruction = '';
if (isLoRAMultiDoc) {
    const loraDocNames: string[] = [];
    const loraHeaderRegex = /##?# From: (.+)/g;
    let loraMatch;
    while ((loraMatch = loraHeaderRegex.exec(assembledContext)) !== null) {
        loraDocNames.push(loraMatch[1].trim());
    }
```

Change to:
```typescript
const isLoRAMultiDoc = assembledContext.includes('## From:') || assembledContext.includes('### From:') || assembledContext.includes('### [');
let loraMultiDocInstruction = '';
if (isLoRAMultiDoc) {
    const loraDocNames: string[] = [];
    // Match both old format "### From: DocName" and new interleaved format "### [DocName]"
    const loraHeaderRegex = /###?\s*(?:From:\s*(.+?)$|\[([^\]]+)\])/gm;
    let loraMatch;
    while ((loraMatch = loraHeaderRegex.exec(assembledContext)) !== null) {
        const name = (loraMatch[1] || loraMatch[2] || '').trim();
        if (name && !loraDocNames.includes(name)) {
            loraDocNames.push(name);
        }
    }
```

This ensures the system prompt still gets the CRITICAL multi-doc instruction with both bank names listed.

**Also update `generateResponse()` (around line 660–675)**: This function (used for Claude/RAG-only mode) has similar multi-doc detection. It checks `params.assembledContext.includes('## From:')` and uses regex `/## From: (.+)/g`. Update this the same way to detect `### [DocName]` patterns as well:

Current code (around line 660):
```typescript
const isMultiDoc = params.assembledContext.includes('## From:');

// Extract document names from context headers for the multi-doc instruction
const docNamesInContext: string[] = [];
if (isMultiDoc) {
    const headerRegex = /## From: (.+)/g;
    let match;
    while ((match = headerRegex.exec(params.assembledContext)) !== null) {
        docNamesInContext.push(match[1].trim());
    }
}
```

Change to:
```typescript
const isMultiDoc = params.assembledContext.includes('## From:') || params.assembledContext.includes('### [');

// Extract document names from context headers for the multi-doc instruction
const docNamesInContext: string[] = [];
if (isMultiDoc) {
    // Match both grouped format "## From: DocName" and interleaved format "### [DocName]"
    const headerRegex = /(?:##\s*From:\s*(.+?)$|###\s*\[([^\]]+)\])/gm;
    let match;
    while ((match = headerRegex.exec(params.assembledContext)) !== null) {
        const name = (match[1] || match[2] || '').trim();
        if (name && !docNamesInContext.includes(name)) {
            docNamesInContext.push(name);
        }
    }
}
```

---

### Fix B: Add Similarity Floor in Assembly (P0)

**What**: Filter out low-relevance sections before the round-robin selection step. Use a minimum similarity threshold of **0.55**.

**Why**: In the test query, 9 of 17 sections (53%) were irrelevant noise — Jumbo Mortgage (0.635), ACH (0.606), Treasury Ladder (0.532), Change Log (0.350), etc. These waste tokens and push relevant content further down. A 0.55 floor would eliminate the worst offenders.

**Implementation details**:

1. Add a constant at the top of the function body:
```typescript
const ASSEMBLY_SIMILARITY_FLOOR = 0.55;
```

2. Filter sections BEFORE grouping by document:
```typescript
// Filter out low-relevance sections to reduce noise
let filteredSections = params.sections.filter(s => s.similarity >= ASSEMBLY_SIMILARITY_FLOOR);

// Safeguard: if filtering removed ALL sections for any document that had sections originally,
// lower the floor for that document to ensure coverage
const originalDocIds = new Set(params.sections.map(s => s.documentId));
const filteredDocIds = new Set(filteredSections.map(s => s.documentId));
for (const docId of originalDocIds) {
    if (!filteredDocIds.has(docId)) {
        // This document lost all sections — add back its best section(s) above a lower floor
        const docSections = params.sections
            .filter(s => s.documentId === docId)
            .sort((a, b) => b.similarity - a.similarity);
        // Add the top 2 sections from this document regardless of similarity
        filteredSections.push(...docSections.slice(0, 2));
        console.log(`[assembleMultiHopContext] Document ${docId} had no sections above ${ASSEMBLY_SIMILARITY_FLOOR} — added top ${Math.min(2, docSections.length)} sections (best similarity: ${docSections[0]?.similarity.toFixed(3)})`);
    }
}

if (filteredSections.length < params.sections.length) {
    console.log(`[assembleMultiHopContext] Similarity floor ${ASSEMBLY_SIMILARITY_FLOOR}: kept ${filteredSections.length}/${params.sections.length} sections`);
}
```

3. Use `filteredSections` instead of `params.sections` for the rest of the function (the grouping-by-doc step and everything after it).

---

### Fix C: Per-Document Section Cap (P1)

**What**: Cap each document to a maximum of **6 sections** after grouping by document and sorting by similarity. This ensures one document can't dominate the context.

**Why**: In the test query, Sun Chip had 11 sections (65%) vs Moon Banc's 6 (35%). Even with round-robin selection, this creates a 2:1 content imbalance.

**Implementation details**:

After grouping sections by document and sorting each doc's sections by similarity descending, add:

```typescript
const MAX_SECTIONS_PER_DOC = 6;
for (const [docId, docSections] of sectionsByDoc) {
    if (docSections.length > MAX_SECTIONS_PER_DOC) {
        console.log(`[assembleMultiHopContext] Capped ${params.documentNames.get(docId) || docId} from ${docSections.length} to ${MAX_SECTIONS_PER_DOC} sections`);
        sectionsByDoc.set(docId, docSections.slice(0, MAX_SECTIONS_PER_DOC));
    }
}
```

This runs AFTER Fix B's similarity filter but BEFORE the round-robin selection loop. The cap keeps the highest-similarity sections per document.

---

### Fix D: Move Key Facts Before Sections (P1)

**What**: Reorder the output so that `## Key Facts` appears BEFORE `## Evidence from Documents`.

**Why**: Key Facts contain the most concise, directly answerable comparison data (e.g., "Sub-Tier Maintenance Fee: 5000.00 USD", "Complexity Fee: 15,000.00 CHF per quarter"). Placing them before the detailed sections gives the model a structured "answer summary" first, then supporting detail. Currently they're buried after ~10K+ tokens of section content.

**Current output order**:
```
## Original Question
## Sub-Questions Investigated
## Evidence from Documents   ← sections (10K+ tokens)
## Key Facts                 ← buried at end
```

**Target output order**:
```
## Original Question
## Sub-Questions Investigated
## Key Facts                 ← MOVED UP (concise comparison data)
## Evidence from Documents   ← detailed sections after
```

**Implementation details**:

Move the facts assembly block to execute BEFORE the sections assembly block. The facts should be added to `parts[]` right after the `subQPart`.

The budget split (85% sections / 15% facts) remains the same. The only change is the order of assembly and output.

Concretely, the function body should follow this order:
1. Compute header parts and add to `parts[]`
2. Compute budget splits
3. **Assemble facts** (within fact budget) and add to `parts[]`
4. Filter sections (Fix B)
5. Cap sections per doc (Fix C)
6. Round-robin select and interleave sections (Fix A) and add to `parts[]`

---

## 5. Complete Target Code

Below is the complete replacement function. This replaces everything from the `function assembleMultiHopContext(params: {` signature through the closing `}` of the function (lines 977 to ~1098).

```typescript
function assembleMultiHopContext(params: {
  originalQuery: string;
  subQueries: string[];
  sections: Array<RAGSection & { similarity: number }>;
  facts: Array<RAGFact & { similarity: number }>;
  documentNames: Map<string, string>;
  maxTokens?: number;
}): string {
  // Token estimation: chars / 4 (same heuristic as assembleContext)
  const estimateTokens = (text: string): number => Math.ceil(text.length / 4);
  const maxTokens = params.maxTokens || Infinity;

  const parts: string[] = [];
  let usedTokens = 0;

  // --- Constants for quality control ---
  const ASSEMBLY_SIMILARITY_FLOOR = 0.55;
  const MAX_SECTIONS_PER_DOC = 6;

  // --- 1. Headers (original question + sub-questions) — always included ---
  const headerPart = `## Original Question\n${params.originalQuery}`;
  const subQPart = `## Sub-Questions Investigated\n${params.subQueries.map((q, i) => `${i + 1}. ${q}`).join('\n')}`;
  usedTokens += estimateTokens(headerPart) + estimateTokens(subQPart);
  parts.push(headerPart);
  parts.push(subQPart);

  // --- Budget allocation ---
  const remainingAfterHeaders = maxTokens - usedTokens;
  const factBudget = Math.floor(remainingAfterHeaders * 0.15);
  const sectionBudget = remainingAfterHeaders - factBudget;

  // --- 2. Key Facts FIRST (Fix D: moved before sections for better model attention) ---
  let factTokensUsed = 0;
  if (params.facts.length > 0) {
    const factHeader = '## Key Facts';
    factTokensUsed = estimateTokens(factHeader);
    const factParts: string[] = [factHeader];

    for (const fact of params.facts) {
      const factText = `- [${fact.factType}] ${fact.content} (confidence: ${fact.confidence})`;
      const factTokens = estimateTokens(factText);
      if (factTokensUsed + factTokens > factBudget) {
        console.log(`[assembleMultiHopContext] Truncated facts to fit budget`);
        break;
      }
      factParts.push(factText);
      factTokensUsed += factTokens;
    }

    if (factParts.length > 1) {
      parts.push(factParts.join('\n'));
      usedTokens += factTokensUsed;
    }
  }

  // --- 3. Similarity floor filter (Fix B: remove low-relevance noise) ---
  let filteredSections = params.sections.filter(s => s.similarity >= ASSEMBLY_SIMILARITY_FLOOR);

  // Safeguard: if filtering removed ALL sections for any document that originally had sections,
  // add back that document's top 2 sections regardless of similarity to ensure coverage
  const originalDocIds = new Set(params.sections.map(s => s.documentId));
  const filteredDocIds = new Set(filteredSections.map(s => s.documentId));
  for (const docId of originalDocIds) {
    if (!filteredDocIds.has(docId)) {
      const docSections = params.sections
        .filter(s => s.documentId === docId)
        .sort((a, b) => b.similarity - a.similarity);
      filteredSections.push(...docSections.slice(0, 2));
      console.log(`[assembleMultiHopContext] Document ${params.documentNames.get(docId) || docId} had no sections above ${ASSEMBLY_SIMILARITY_FLOOR} — added top ${Math.min(2, docSections.length)} sections (best similarity: ${docSections[0]?.similarity.toFixed(3)})`);
    }
  }

  if (filteredSections.length < params.sections.length) {
    console.log(`[assembleMultiHopContext] Similarity floor ${ASSEMBLY_SIMILARITY_FLOOR}: kept ${filteredSections.length}/${params.sections.length} sections`);
  }

  // --- 4. Group by document, sort, and apply per-doc cap (Fix C) ---
  const sectionsByDoc = new Map<string, Array<RAGSection & { similarity: number }>>();
  for (const section of filteredSections) {
    const existing = sectionsByDoc.get(section.documentId) || [];
    existing.push(section);
    sectionsByDoc.set(section.documentId, existing);
  }
  for (const docSections of Array.from(sectionsByDoc.values())) {
    docSections.sort((a, b) => b.similarity - a.similarity);
  }

  // Per-document section cap
  for (const [docId, docSections] of sectionsByDoc) {
    if (docSections.length > MAX_SECTIONS_PER_DOC) {
      console.log(`[assembleMultiHopContext] Capped ${params.documentNames.get(docId) || docId} from ${docSections.length} to ${MAX_SECTIONS_PER_DOC} sections`);
      sectionsByDoc.set(docId, docSections.slice(0, MAX_SECTIONS_PER_DOC));
    }
  }

  // --- 5. Round-robin selection with INTERLEAVED output (Fix A) ---
  const docEntries = Array.from(sectionsByDoc.entries());
  const maxRounds = Math.max(...docEntries.map(([, s]) => s.length), 0);
  let sectionTokensUsed = 0;
  let truncated = false;

  // Evidence header
  const evidenceHeader = '## Evidence from Documents';
  sectionTokensUsed += estimateTokens(evidenceHeader);

  // Build interleaved sections in round-robin order (Doc A §1 → Doc B §1 → Doc A §2 → Doc B §2 → ...)
  // Each section carries its source document name inline via [DocName] prefix
  const interleavedSections: string[] = [];

  for (let round = 0; round < maxRounds && !truncated; round++) {
    for (const [docId, docSections] of docEntries) {
      if (round >= docSections.length) continue;
      const section = docSections[round];
      const docName = params.documentNames.get(docId) || docId;
      const preamble = section.contextualPreamble ? `Context: ${section.contextualPreamble}\n` : '';
      // Per-section doc attribution: ### [DocName] Title [similarity: X.XXX]
      const sectionText = `### [${docName}] ${section.title || 'Untitled'} [similarity: ${section.similarity.toFixed(3)}]\n${preamble}${section.originalText}`;
      const sectionTokens = estimateTokens(sectionText);

      if (sectionTokensUsed + sectionTokens > sectionBudget) {
        truncated = true;
        break;
      }
      interleavedSections.push(sectionText);
      sectionTokensUsed += sectionTokens;
    }
  }

  // Assemble: evidence header + interleaved sections (no grouped doc headers)
  if (interleavedSections.length > 0) {
    parts.push(evidenceHeader);
    parts.push(...interleavedSections);
  }
  usedTokens += sectionTokensUsed;

  if (truncated) {
    console.log(`[assembleMultiHopContext] Truncated sections to fit ${maxTokens} token budget (used ~${usedTokens} for sections)`);
  }

  const assembled = parts.join('\n\n');
  console.log(`[assembleMultiHopContext] Assembled ~${estimateTokens(assembled)} tokens (budget: ${maxTokens === Infinity ? 'unlimited' : maxTokens}), ${interleavedSections.length} sections from ${docEntries.length} documents`);
  return assembled;
}
```

---

## 6. Additional Required Changes (Multi-Doc Detection)

Because Fix A changes the section heading format from `### From: DocName` to `### [DocName] Title`, two other functions in the SAME FILE need their multi-doc detection updated.

### 6.1 Update `generateLoRAResponse()` (around line 770)

**Location**: `src/lib/rag/services/rag-retrieval-service.ts`, inside `generateLoRAResponse()`, approximately lines 768-780.

**Find this exact code**:
```typescript
    const isLoRAMultiDoc = assembledContext.includes('## From:') || assembledContext.includes('### From:');
    let loraMultiDocInstruction = '';
    if (isLoRAMultiDoc) {
      const loraDocNames: string[] = [];
      const loraHeaderRegex = /##?# From: (.+)/g;
      let loraMatch;
      while ((loraMatch = loraHeaderRegex.exec(assembledContext)) !== null) {
        loraDocNames.push(loraMatch[1].trim());
      }
```

**Replace with**:
```typescript
    const isLoRAMultiDoc = assembledContext.includes('## From:') || assembledContext.includes('### From:') || assembledContext.includes('### [');
    let loraMultiDocInstruction = '';
    if (isLoRAMultiDoc) {
      const loraDocNames: string[] = [];
      // Match both grouped format "### From: DocName" and interleaved format "### [DocName]"
      const loraHeaderRegex = /###?\s*(?:From:\s*(.+?)$|\[([^\]]+)\])/gm;
      let loraMatch;
      while ((loraMatch = loraHeaderRegex.exec(assembledContext)) !== null) {
        const name = (loraMatch[1] || loraMatch[2] || '').trim();
        if (name && !loraDocNames.includes(name)) {
          loraDocNames.push(name);
        }
      }
```

**Keep everything else in the function unchanged** — the `if (loraDocNames.length > 1)` block and the rest of the system prompt construction remain the same.

### 6.2 Update `generateResponse()` (around line 660)

**Location**: `src/lib/rag/services/rag-retrieval-service.ts`, inside `generateResponse()`, approximately lines 660-672.

**Find this exact code**:
```typescript
  const isMultiDoc = params.assembledContext.includes('## From:');

  // Extract document names from context headers for the multi-doc instruction
  const docNamesInContext: string[] = [];
  if (isMultiDoc) {
    const headerRegex = /## From: (.+)/g;
    let match;
    while ((match = headerRegex.exec(params.assembledContext)) !== null) {
      docNamesInContext.push(match[1].trim());
    }
  }
```

**Replace with**:
```typescript
  const isMultiDoc = params.assembledContext.includes('## From:') || params.assembledContext.includes('### [');

  // Extract document names from context headers for the multi-doc instruction
  const docNamesInContext: string[] = [];
  if (isMultiDoc) {
    // Match both grouped format "## From: DocName" and interleaved format "### [DocName]"
    const headerRegex = /(?:##\s*From:\s*(.+?)$|###\s*\[([^\]]+)\])/gm;
    let match;
    while ((match = headerRegex.exec(params.assembledContext)) !== null) {
      const name = (match[1] || match[2] || '').trim();
      if (name && !docNamesInContext.includes(name)) {
        docNamesInContext.push(name);
      }
    }
  }
```

---

## 7. Change Summary

| # | Location | Lines (approx) | Change | Fix |
|---|----------|----------------|--------|-----|
| 1 | `assembleMultiHopContext()` | 977–1098 | Replace entire function body | A+B+C+D |
| 2 | `generateLoRAResponse()` | 768–780 | Update multi-doc detection regex | A (compat) |
| 3 | `generateResponse()` | 660–672 | Update multi-doc detection regex | A (compat) |

**All changes are in one file**: `src/lib/rag/services/rag-retrieval-service.ts`

---

## 8. Expected Output Format (After All Fixes)

For a comparative query about maintenance fees across two banks, the assembled context should look like:

```
## Original Question
I am absolutely insulted! I just noticed a massive, ridiculous maintenance fee...

## Sub-Questions Investigated
1. What is the minimum balance requirement in each document?
2. What is the name of the restricted status when an account falls below the minimum balance in each document?
3. What is the maintenance fee amount charged in each document?

## Key Facts
- [policy_rule] R3: If the DAB falls below $10,000,000.00, the account enters "Warning Status"... (confidence: 0.95)
- [policy_rule] R3: If NAV falls below 25M CHF, the account enters Low-Orbit Mode immediately. (confidence: 0.95)
- [limit] Sub-Tier Maintenance Fee: 5000.00 USD (per month) (confidence: 0.95)
- [limit] Complexity Fee: 15000.00 CHF (per Quarter) (confidence: 0.95)
... (more facts from both banks)

## Evidence from Documents

### [Sun-Chip-Bank-Policy-Document-v2.0.md] BC-ELIG-001: Minimum Balance and Maintenance Rules [similarity: 0.802]
Context: This section establishes the mandatory minimum balance requirements...
<section text>

### [Moon-Banc-Policy-Document-v1.0.md] MB-ELIG-001: Minimum Asset and Jurisdiction Standards [similarity: 0.709]
Context: This section establishes Moon Banc's foundational client eligibility requirements...
<section text>

### [Sun-Chip-Bank-Policy-Document-v2.0.md] 2. Eligibility and Account Standards [similarity: 0.741]
<section text>

### [Moon-Banc-Policy-Document-v1.0.md] Appendix A: Fee Schedule (Standard) [similarity: 0.668]
<section text>

### [Sun-Chip-Bank-Policy-Document-v2.0.md] 1. Bank Overview and Philosophy [similarity: 0.666]
<section text>

### [Moon-Banc-Policy-Document-v1.0.md] 2. Eligibility and Account Standards [similarity: 0.664]
<section text>

... (continues interleaved, max 6 per doc, all above 0.55 similarity)
```

Key differences from current output:
1. **Key Facts appear BEFORE sections** (not after)
2. **Sections are interleaved** (Sun→Moon→Sun→Moon) not grouped
3. **Each section has `[DocName]` prefix** for inline attribution
4. **Low-similarity sections removed** (Change Log 0.350, Cantonal Override 0.423, Treasury Ladder 0.532 — all below 0.55)
5. **Max 6 sections per document** (Sun Chip capped from 11 to 6)

---

## 9. Verification Checklist

After implementing, verify:

- [ ] `assembleMultiHopContext()` compiles without TypeScript errors
- [ ] The function signature and return type are unchanged (`string`)
- [ ] The function is still called with the same parameters from the call site (line ~1322)
- [ ] `generateLoRAResponse()` multi-doc detection handles both old format (`### From:`) and new format (`### [DocName]`)
- [ ] `generateResponse()` multi-doc detection handles both formats
- [ ] The `RAGSection` type has `.documentId`, `.title`, `.originalText`, `.contextualPreamble`, `.similarity` properties (it does — no changes needed)
- [ ] The `RAGFact` type has `.factType`, `.content`, `.confidence` properties (it does — no changes needed)
- [ ] `console.log` statements use the `[assembleMultiHopContext]` prefix for consistency with existing logging
- [ ] No other functions in the file reference `selectedByDoc` or `docHeaders` (they don't — these are local to the function)
- [ ] Run `npm run build` (or the project's build command) to confirm no compile errors

---

## 10. What NOT to Change

- **Do NOT modify `assembleContext()`** — This is the "simple query" path and it already interleaves correctly. It produced correct results in testing.
- **Do NOT modify `config.ts`** — No config changes needed. The `similarityThreshold: 0.4` and `kbWideSimilarityThreshold: 0.3` in config are upstream retrieval thresholds; our assembly floor (0.55) is independent.
- **Do NOT modify `inference-serverless.ts`** — The prompt token tracking from Round 7 Fix 3 is working correctly.
- **Do NOT modify any test files or create new test files** unless specifically asked.
- **Do NOT change the function signature or return type of `assembleMultiHopContext()`** — it must remain `(params: {...}): string`.
- **Do NOT change the call site** at line ~1322 — it passes the same parameters and receives the same `string` return.
- **Do NOT change the token estimation heuristic** (`chars / 4`) — it's consistent across the codebase.
- **Do NOT change the budget split ratio** (85% sections / 15% facts) — it's appropriate for the use case.

---

## 11. TypeScript Type Context

For reference, the relevant types used in this function (you do NOT need to modify these — they already exist in the codebase):

```typescript
// RAGSection has at minimum these properties used by the function:
interface RAGSection {
  documentId: string;
  title?: string;
  originalText: string;
  contextualPreamble?: string;
  sectionIndex?: number;
  // ... other properties
}

// RAGFact has at minimum these properties used by the function:
interface RAGFact {
  factType: string;
  content: string;
  confidence: number;
  policyId?: string;
  subsection?: string;
  factCategory?: string;
  // ... other properties
}

// The sections and facts passed to the function also include:
// { similarity: number } — added by the retrieval pipeline
```

The `params.documentNames` is `Map<string, string>` mapping `documentId` → human-readable document name (e.g., `"abc-123"` → `"Sun-Chip-Bank-Policy-Document-v2.0.md"`).
