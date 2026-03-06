# RAG Module QA Document v2 - Retrieval Quality Issues

**Date:** February 15, 2026  
**Focus:** Document Retrieval Quality & Table Parsing

---

## Bug #13: RAG Retrieval Missing Specific Information

### Issue Description

User tested RAG with the Sun Chip Bank Policy Document v2.0 and asked a complex, multi-part question designed to test retrieval precision:

**User Question:**
> "I am 52 and starting over after a divorce where I was completely passive about our finances; I'm currently feeling a lot of shame about my lack of financial literacy. If I were a client at Sun Chip and wanted to ensure my children didn't end up in this same position, what is the specific age range defined in the Human Capital Competency Framework for 'Practical Application' (like credit management and tax filing), and what is the maximum debt-to-income (DTI) ratio Sun Chip allows for a Jumbo Mortgage if I don't have a High Liquidity Offset?"

**Expected Answer:**
1. **Age Range for "Practical Application":** Ages 16-22 (from the table at lines 886-891 of source document)
2. **DTI without High Liquidity Offset:** 43% (base requirement)
3. **DTI exception information:** 45% if client holds 60+ months of PITI reserves (from line 751, Exception E1)

**Actual RAG Response:**
1. ✓ **Correctly cited** the general financial literacy program (ages 5-22) from Section 7
2. ✓ **Correctly cited** the base 43% DTI requirement from Section 6
3. ✗ **FAILED to find** the specific "Ages 16-22" age range for "Practical Application" despite it being in a clearly labeled table
4. ✗ **FAILED to find** the "High Liquidity Offset" exception (45% DTI) despite it being explicitly defined

### Root Cause Analysis

After analyzing the RAG implementation in:
- `src/lib/rag/services/rag-ingestion-service.ts`
- `src/lib/rag/providers/claude-llm-provider.ts`
- `src/lib/rag/config.ts`
- `src/lib/rag/services/rag-retrieval-service.ts`

**The core issues are:**

#### 1. **Overly Coarse Document Chunking Strategy**

**Evidence:**
```typescript
// From claude-llm-provider.ts, lines 171-178
CRITICAL EXTRACTION GUIDELINES:
- Sections: Extract 5-15 major sections (chapters, main headings) - do NOT extract every paragraph
- Entities: Extract 10-30 key entities only
- Facts: Extract 20-50 most important facts only
```

**Problem:** 
- The system is designed to extract only "major sections" and "most important facts"
- For a 71KB, 1097-line document like the Sun Chip Policy, extracting only 5-15 sections means each section averages 73-219 lines
- Fine-grained details (specific table rows, exception clauses, sub-policies) are aggregated into large sections
- When a user asks a specific question, the retrieval system finds the "nearby" section but not the precise detail

**Impact:**
- The "Human Capital Competency Framework" table (lines 886-891) was likely included in a larger "Family Office Governance" section
- When embedded, the table's specific rows may have been "diluted" by surrounding text
- The query embedding for "Ages 16-22 Practical Application credit management tax filing" didn't match strongly enough to the section that contained this table alongside other governance topics

#### 2. **No Special Handling for Tabular Data**

**Evidence:**
The prompt in `claude-llm-provider.ts` (lines 134-169) instructs Claude to extract:
- Sections (with title, originalText, summary)
- Entities
- Facts
- Topic taxonomy
- Ambiguities
- Expert questions

**Problem:**
- No instruction to "extract each row of a table as a separate fact" or "pay special attention to structured/tabular data"
- Tables in markdown are just treated as part of the section's `originalText`
- When embedding the section, the table structure is flattened into a text blob
- The semantic meaning of individual table rows is lost

**Example of what happened:**
The table:
```markdown
| Age Group | Literacy Focus | Key Activities |
| Ages 16 – 22 | Practical Application | Credit management; tax filing basics; managing larger allowances. |
```

Became part of a larger section like:
```
Section 7: Family Office Governance - Staff, Aviation, Digital Assets, and Wealth Transfer

[Large block of text about family offices, wealth transfer, human capital framework, includes the table somewhere in the middle, followed by more text about family governance and meetings]

Summary: This section covers operational governance for UHNW family offices including staff vetting, aviation safety, digital asset custody, and multi-generational wealth stewardship education.
```

When embedded, the vector representation of this section captures "family office governance" and "wealth education" but not "ages 16-22 for practical application" as a distinct, retrievable unit.

#### 3. **Exception Clauses Buried in Large Sections**

**Evidence:**
Line 751 of source document:
```markdown
* E1: "High Liquidity Offset": DTI may be expanded to 45% if the client holds 60+ months of PITI reserves at Sun Chip.
```

This exception clause was in **Section 6: BC-PROD-004: Jumbo Mortgage Program**, which also contains:
- General mortgage rules (lines 716-769)
- Definitions
- Policy rules R1-R5
- Limits & thresholds table
- Required documents
- Exception E1 (the one we needed)
- Escalation & approvals
- Audit receipt fields
- Related policies

**Problem:**
- When the user asked about "DTI ratio if I don't have a High Liquidity Offset", the query embedding likely matched to the main policy rules (R4: "DTI capped at 43%")
- The exception clause E1 was "buried" in the same section but didn't have a strong enough signal in the embedding to be separately retrieved
- The section-level embedding emphasized "jumbo mortgages, 20% down, 740 FICO, 43% DTI" but not the edge-case exception

#### 4. **Retrieval Threshold May Be Too High**

**Evidence:**
```typescript
// From src/lib/rag/config.ts
retrieval: {
  maxSectionsToRetrieve: 10,
  maxFactsToRetrieve: 20,
  similarityThreshold: 0.5,  // ← This
  selfEvalThreshold: 0.6,
  maxContextTokens: 100000,
}
```

**Problem:**
- Similarity threshold of 0.5 means only chunks with 50%+ cosine similarity are retrieved
- For highly specific queries (like "Ages 16-22 Practical Application"), if the embedding similarity is 0.45-0.49, the relevant chunk is excluded
- This is a common issue with vector search: the threshold needs to balance precision (not retrieving junk) vs recall (not missing relevant info)

#### 5. **HyDE May Not Help with Specific Factual Queries**

**Evidence:**
```typescript
// From src/lib/rag/services/rag-retrieval-service.ts, lines 42-57
async function generateHyDE(params: {
  queryText: string;
  documentSummary: string;
}): Promise<string> {
  const provider = getLLMProvider();
  try {
    const result: HyDEResult = await provider.generateHyDE({
      queryText: params.queryText,
      documentSummary: params.documentSummary,
    });
    return result.hypotheticalAnswer;
  } catch (err) {
    console.warn('[RAG Retrieval] HyDE generation failed:', err);
    return '';
  }
}
```

**Problem:**
- HyDE (Hypothetical Document Embeddings) works by generating a hypothetical answer and embedding it alongside the query
- This is great for conceptual/semantic queries ("explain how authentication works")
- But for specific factual lookups ("what is the age range for X?"), HyDE may actually hurt:
  - The hypothetical answer might be generic ("The age range for practical application is typically 18-25")
  - This generic embedding may match *worse* to the specific text "Ages 16-22" than the original query would have
- HyDE adds latency and API cost without clear benefit for factual retrieval

---

## Solution: Multi-Pronged Approach

### **Solution 1: Implement Hierarchical Chunking with Table Extraction**

**Goal:** Extract table rows and exception clauses as separate, first-class facts.

**Implementation:**

#### Step 1a: Update Document Processing Prompt

**File:** `src/lib/rag/providers/claude-llm-provider.ts`

**Change:** Modify the `readDocument` prompt (lines 134-184) to explicitly instruct Claude to:
1. Extract each row of a table as a separate fact
2. Extract each exception clause (E1, E2, etc.) as a separate fact
3. Preserve the table structure in section originalText but also break it down

**New prompt section:**
```typescript
CRITICAL EXTRACTION GUIDELINES:
- Sections: Extract 5-15 major sections (chapters, main headings) - do NOT extract every paragraph
- Entities: Extract 10-30 key entities only
- Facts: Extract 20-50 most important facts only
  * SPECIAL: For tables, extract EACH ROW as a separate fact
  * SPECIAL: For exception clauses (E1, E2, etc.), extract EACH as a separate fact
  * SPECIAL: For policy rules (R1, R2, etc.), extract EACH as a separate fact
- Expert questions: Generate exactly 5 questions (high impact only)
- Topic taxonomy: 3-8 topics maximum
- Ambiguities: 3-10 items maximum

TABLE HANDLING:
- When you encounter a table, extract each row as a fact with:
  * factType: "table_row"
  * content: "Column1: value1, Column2: value2, Column3: value3" (all columns in one string)
  * sourceText: "From table: [Table Name or Section]"
  * confidence: 0.95
- Example: For a table row "| Ages 16-22 | Practical Application | Credit management |"
  * Extract as: { factType: "table_row", content: "Age Group: Ages 16-22, Literacy Focus: Practical Application, Key Activities: Credit management; tax filing basics; managing larger allowances", sourceText: "From Human Capital Competency Framework table", confidence: 0.95 }

EXCEPTION/RULE HANDLING:
- When you encounter exceptions (E1, E2) or rules (R1, R2), extract each as a separate fact:
  * factType: "policy_exception" or "policy_rule"
  * content: The full text of the exception/rule
  * sourceText: "From [Policy ID]: [Exception/Rule Number]"
```

**Rationale:**
- By explicitly instructing Claude to extract table rows and exceptions as facts, we create smaller, more focused embedding targets
- These facts will have embeddings that are much more likely to match specific queries

#### Step 1b: Increase Fact Extraction Limit

**File:** `src/lib/rag/providers/claude-llm-provider.ts`

**Change:** Update the extraction guideline from "20-50 facts" to "50-150 facts" to accommodate table rows and exceptions.

**Rationale:**
- A 71KB document with multiple tables and exception lists may have 100+ atomic facts
- This is still manageable for embedding and storage

---

### **Solution 2: Lower Similarity Threshold**

**File:** `src/lib/rag/config.ts`

**Change:**
```typescript
retrieval: {
  maxSectionsToRetrieve: 10,
  maxFactsToRetrieve: 20,
  similarityThreshold: 0.4,  // ← Lowered from 0.5 to 0.4
  selfEvalThreshold: 0.6,
  maxContextTokens: 100000,
}
```

**Rationale:**
- Lowering from 0.5 to 0.4 increases recall (retrieves more chunks) at the cost of some precision
- For a RAG system, it's better to retrieve a few extra chunks (and let the LLM filter) than to miss the one chunk with the answer
- This is especially important for "needle in a haystack" queries where the exact phrasing may differ

**Trade-off:**
- May retrieve some less-relevant chunks
- Slightly increases context size sent to LLM (but we have 100K token budget)

---

### **Solution 3: Add Query Expansion with Keyword Extraction**

**Goal:** Supplement HyDE with keyword-based expansion to catch specific terms.

**Implementation:**

**File:** `src/lib/rag/services/rag-retrieval-service.ts`

**Change:** In the `retrieveContext` function (lines 63-151), add a third search pass using keyword extraction:

```typescript
// After HyDE search, add keyword search
const keywords = extractKeywords(queryText); // e.g., ["16-22", "Practical Application", "45%", "High Liquidity Offset"]
for (const keyword of keywords) {
  // Search with exact keyword
  const keywordResults = await searchSimilarEmbeddings({
    queryText: keyword,
    documentId,
    tier: 3, // Facts tier
    limit: 5,
    threshold: 0.3, // Lower threshold for keyword search
  });
  // Merge results...
}

function extractKeywords(query: string): string[] {
  // Simple regex-based keyword extraction:
  // - Numbers with units: "16-22", "43%", "45%"
  // - Quoted phrases: "High Liquidity Offset", "Practical Application"
  // - Capitalized phrases: "Human Capital Competency Framework"
  const keywords: string[] = [];
  
  // Extract quoted strings
  const quoted = query.match(/"([^"]+)"/g);
  if (quoted) keywords.push(...quoted.map(q => q.replace(/"/g, '')));
  
  // Extract numbers with %, $, or age ranges
  const numbers = query.match(/\d+[-–]\d+|\d+%|\$[\d,]+/g);
  if (numbers) keywords.push(...numbers);
  
  // Extract capitalized multi-word phrases (likely proper nouns/technical terms)
  const capitalized = query.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g);
  if (capitalized) keywords.push(...capitalized);
  
  return keywords.filter(k => k.length > 2); // Filter out very short keywords
}
```

**Rationale:**
- For queries with specific numbers, acronyms, or technical terms, keyword matching is more reliable than semantic similarity
- This supplements HyDE/semantic search without replacing it

---

### **Solution 4: Add Fact-Level Metadata for Table Context**

**Goal:** When embedding table rows as facts, add metadata that preserves table context.

**Implementation:**

**File:** `src/lib/rag/services/rag-ingestion-service.ts`

**Change:** When storing facts, add a `fact_metadata` JSON field:

```typescript
const factRecords = understanding.facts.map((fact, index) => ({
  document_id: documentId,
  user_id: doc.userId,
  fact_index: index,
  fact_type: fact.factType,
  content_text: fact.content,
  source_text: fact.sourceText,
  confidence_score: fact.confidence || 0.9,
  fact_metadata: {
    // Add structured metadata for tables
    isTableRow: fact.factType === 'table_row',
    tableColumns: fact.factType === 'table_row' ? parseTableColumns(fact.content) : null,
    isPolicyRule: fact.factType === 'policy_rule',
    isPolicyException: fact.factType === 'policy_exception',
  },
}));

function parseTableColumns(content: string): Record<string, string> {
  // Parse "Column1: value1, Column2: value2" format into { Column1: value1, Column2: value2 }
  const pairs = content.split(', ').map(p => p.split(': '));
  return Object.fromEntries(pairs);
}
```

**Rationale:**
- This allows future enhancements like "boost table rows in ranking" or "filter by fact type"
- Makes debugging easier (can see which facts are from tables vs free text)

---

### **Solution 5: Improve Section-Level Context with Subsection Splitting**

**Goal:** Break large sections into smaller subsections for finer-grained retrieval.

**Implementation:**

**Option A: Post-Processing Split**

After Claude extracts sections, run a post-processing step that splits sections longer than 2000 tokens into subsections based on markdown headers (`##`, `###`).

**File:** `src/lib/rag/services/rag-ingestion-service.ts`

```typescript
// After understanding = await provider.readDocument(...)
// Before storing sections, split large ones
const processedSections = understanding.sections.flatMap(section => {
  if (section.tokenCount && section.tokenCount > 2000) {
    return splitSectionByHeaders(section);
  }
  return [section];
});

function splitSectionByHeaders(section: RAGSection): RAGSection[] {
  const lines = section.originalText.split('\n');
  const subsections: RAGSection[] = [];
  let currentSubsection: string[] = [];
  let currentTitle = section.title;
  
  for (const line of lines) {
    if (line.match(/^#{2,3}\s+/)) { // ## or ### header
      if (currentSubsection.length > 0) {
        subsections.push({
          title: currentTitle,
          originalText: currentSubsection.join('\n'),
          summary: `Subsection of ${section.title}`,
          tokenCount: Math.ceil(currentSubsection.join(' ').length / 4),
        });
      }
      currentTitle = line.replace(/^#{2,3}\s+/, '');
      currentSubsection = [line];
    } else {
      currentSubsection.push(line);
    }
  }
  
  // Add final subsection
  if (currentSubsection.length > 0) {
    subsections.push({
      title: currentTitle,
      originalText: currentSubsection.join('\n'),
      summary: `Subsection of ${section.title}`,
      tokenCount: Math.ceil(currentSubsection.join(' ').length / 4),
    });
  }
  
  return subsections.length > 1 ? subsections : [section];
}
```

**Option B: Prompt Claude to Extract More Sections**

Change the extraction guideline from "5-15 major sections" to "10-30 sections (including subsections)".

**Recommendation:** Use Option B (easier to implement, leverages Claude's understanding).

---

### **Solution 6: Add Re-Ranking with Cross-Encoder (Future Enhancement)**

**Goal:** After initial vector retrieval, re-rank results using a cross-encoder model that compares query-to-chunk relevance more accurately.

**Status:** Not implemented yet, but recommended for future work.

**Approach:**
1. Use vector search to retrieve top 50 chunks (with lower threshold)
2. Use a cross-encoder model (e.g., `ms-marco-MiniLM-L-12-v2`) to score query-chunk pairs
3. Re-rank based on cross-encoder scores
4. Return top 10 after re-ranking

**Rationale:**
- Vector search (embedding similarity) is fast but sometimes imprecise
- Cross-encoders directly compare query and chunk, yielding better relevance scores
- Two-stage retrieval (fast vector + precise re-ranking) is a best practice in modern RAG

---

## Recommended Implementation Plan

### **Phase 1: Quick Wins (Immediate - 1-2 hours)**

1. ✅ **Lower similarity threshold** from 0.5 to 0.4
2. ✅ **Update extraction prompt** to explicitly handle tables and exceptions
3. ✅ **Increase fact extraction limit** from 20-50 to 50-150

**Expected Impact:** Should retrieve the "Ages 16-22" table row and "High Liquidity Offset" exception on the test query.

### **Phase 2: Enhanced Parsing (Next - 2-4 hours)**

4. ✅ **Add fact metadata** for table rows and exceptions
5. ✅ **Implement keyword extraction** for specific terms

**Expected Impact:** Better recall on queries with numbers, acronyms, technical terms.

### **Phase 3: Section Refinement (Later - 4-6 hours)**

6. ✅ **Add subsection splitting** to break large sections
7. ✅ **Test with 10+ diverse documents** to ensure no regression

**Expected Impact:** More granular retrieval, better handling of long documents.

### **Phase 4: Advanced (Future - Research Required)**

8. ⏳ **Cross-encoder re-ranking** (requires new model deployment)
9. ⏳ **Hybrid search** (combine vector + BM25 keyword search)

---

## Testing Strategy

### **Test 1: Exact Question Repeat**

Re-run the exact user question after Phase 1 changes:
- ✅ Should retrieve "Ages 16-22" for Practical Application
- ✅ Should retrieve "45% DTI with High Liquidity Offset"

### **Test 2: Other Specific Queries**

Test with other "needle in haystack" queries:
- "What is the minimum FICO score for a Jumbo Mortgage?"
- "How many months of PITI reserves are required for a loan over $5M?"
- "What happens if my DAB falls below $10M?"

### **Test 3: Conceptual Queries**

Ensure we didn't break broad conceptual queries:
- "How does Sun Chip handle security for money movement?"
- "What is the philosophy behind Sun Chip's operational rules?"

### **Test 4: Edge Cases**

- Very short documents (< 5 pages): Should still work
- Documents without tables: Should not degrade
- Documents with many tables: Should extract all rows

---

## Metrics to Track

After implementing Phase 1 changes, track:

1. **Retrieval Recall:** % of queries where the correct chunk is in top-10 retrieved
   - **Target:** > 90% for factual queries
2. **Response Quality:** Average self-eval score
   - **Target:** > 75%
3. **Citation Accuracy:** % of responses with at least one correct citation
   - **Target:** > 95%
4. **Processing Time:** Document ingestion time
   - **Baseline:** 30-60s for 71KB doc
   - **Target:** < 90s even with 3x more facts

---

## Conclusion

The RAG system is **functionally correct** but suffers from **retrieval granularity issues**. The core problem is that the system was designed to extract "major sections" and "most important facts" for efficiency, but this causes it to miss specific data points buried in large sections or table rows.

By implementing the proposed solutions—especially table row extraction, exception clause parsing, and lowering the similarity threshold—we should achieve **90%+ recall on factual queries** while maintaining good performance on conceptual queries.

**Immediate Action:** Implement Phase 1 changes and re-test with the user's question.

---

## Appendix: Code References

### Files to Modify

1. **`src/lib/rag/providers/claude-llm-provider.ts`**
   - Lines 134-184: Update `readDocument` prompt
   - Add table/exception extraction instructions

2. **`src/lib/rag/config.ts`**
   - Line 45: Change `similarityThreshold: 0.5` → `0.4`

3. **`src/lib/rag/services/rag-ingestion-service.ts`**
   - Lines 340-360: Add fact metadata when storing
   - (Optional) Add subsection splitting logic

4. **`src/lib/rag/services/rag-retrieval-service.ts`**
   - Lines 63-151: (Optional) Add keyword extraction search pass

### Database Schema Impact

**No schema changes required** for Phase 1. The `fact_metadata` field already exists as JSONB in `rag_facts` table, so we can start populating it immediately.

---

---

## Implementation Log

### 2026-02-15: Solution 1 - Hierarchical Chunking with Table Extraction (IMPLEMENTED)

**Status:** ✅ COMPLETED

**Files Modified:**
- `src/lib/rag/providers/claude-llm-provider.ts` (lines 152-227)

**Changes Made:**

#### Step 1a: Updated Document Processing Prompt
✅ **Enhanced fact extraction guidelines:**
- Changed fact extraction limit from "20-50" to "50-150 facts"
- Added explicit instruction: "For tables, extract EACH ROW as a separate fact"
- Added explicit instruction: "For exception clauses (E1, E2, etc.), extract EACH as a separate fact"
- Added explicit instruction: "For policy rules (R1, R2, etc.), extract EACH as a separate fact"

✅ **Added TABLE HANDLING section:**
- Detailed instructions on how to extract table rows
- Provided concrete example: "Age Group: Ages 16-22, Literacy Focus: Practical Application..."
- Specified format: `factType: "table_row"`, with all columns combined into descriptive content
- Instructed to preserve tables in section originalText while ALSO extracting rows as facts

✅ **Added EXCEPTION AND RULE HANDLING section:**
- Detailed instructions on extracting policy exceptions (E1, E2, etc.)
- Detailed instructions on extracting policy rules (R1, R2, etc.)
- Provided concrete example: "High Liquidity Offset: DTI may be expanded to 45%..."
- Specified format: `factType: "policy_exception"` or `"policy_rule"`

✅ **Updated IMPORTANT section:**
- Priority instruction: "prioritize tables, exceptions, and rules first"
- Critical instruction: "Table rows and exceptions are CRITICAL - never skip these even if approaching token limits"

#### Step 1b: Updated Fact Schema
✅ **Enhanced factType enum:**
- Changed from: `"fact|entity|definition|relationship"`
- Changed to: `"fact|entity|definition|relationship|table_row|policy_exception|policy_rule"`
- This allows Claude to use the new fact types in its response

**Expected Impact:**
- Should now extract the "Ages 16-22" row from Human Capital Competency Framework table as a separate, searchable fact
- Should now extract the "High Liquidity Offset: DTI 45%" exception as a separate, searchable fact
- Should extract 50-150 facts per document (up from 20-50), with priority given to structured data
- Existing documents will need to be re-processed to benefit from these changes

**Next Steps for Testing:**
1. Re-process the Sun Chip Bank Policy Document v2.0
2. Run the exact user query: "what is the specific age range defined in the Human Capital Competency Framework for 'Practical Application'..."
3. Verify that:
   - The "Ages 16-22" fact is retrieved
   - The "45% DTI with High Liquidity Offset" fact is retrieved
   - The response correctly cites both specific data points

**Deployment Notes:**
- No database schema changes required
- Existing documents in the system will continue to work with old extraction format
- To get improved retrieval, users must re-upload/re-process documents
- Consider adding a "Re-analyze Document" button in the UI for existing RAG documents

---

### 2026-02-15: Solution 2 - Lower Similarity Threshold (IMPLEMENTED)

**Status:** ✅ COMPLETED

**Files Modified:**
- `src/lib/rag/config.ts` (line 45)

**Changes Made:**

✅ **Lowered similarity threshold for retrieval:**
- Changed from: `similarityThreshold: 0.5`
- Changed to: `similarityThreshold: 0.4`

**Rationale:**
- **Increases recall:** Retrieves more potentially relevant chunks (catches borderline matches)
- **Minimal precision loss:** With 100K token context budget, a few extra chunks won't hurt
- **Better failure mode:** It's better to retrieve extra chunks and let the LLM filter than to miss the answer entirely
- **Especially important for "needle in haystack" queries** where exact phrasing may vary

**Expected Impact:**
- Chunks with 40-50% cosine similarity will now be retrieved (previously excluded)
- For the Sun Chip test case:
  - If "Ages 16-22 Practical Application" chunk had 0.45 similarity, it will now be included
  - If "High Liquidity Offset 45% DTI" chunk had 0.48 similarity, it will now be included
- May retrieve 1-3 additional chunks per query on average
- Self-evaluation threshold remains at 0.6, so LLM will still filter low-quality matches

**Immediate Effect:**
- This change takes effect immediately for all queries (no re-processing needed)
- Works on existing documents with old extraction format
- Combined with Solution 1 (hierarchical chunking), should significantly improve retrieval precision

**Trade-offs:**
- Slight increase in context size sent to LLM (negligible given 100K budget)
- May retrieve 1-2 less-relevant chunks per query (LLM handles filtering well)
- Overall: **Strongly positive** trade-off for factual/specific queries

---

## Summary of Implemented Solutions

### Phase 1 (COMPLETED) - Quick Wins ✅

1. ✅ **Solution 1:** Hierarchical Chunking with Table Extraction
   - Extract table rows as separate facts (50-150 facts vs 20-50)
   - Extract exception clauses as separate facts
   - Extract policy rules as separate facts
   - Priority system: tables/exceptions/rules first

2. ✅ **Solution 2:** Lower Similarity Threshold
   - Reduced from 0.5 → 0.4 for better recall
   - No re-processing needed, immediate effect

**Combined Expected Impact:**
- Should now retrieve "Ages 16-22" table row ✓
- Should now retrieve "45% DTI High Liquidity Offset" exception ✓
- Improved recall on specific factual queries ✓
- Minimal impact on processing time or quality ✓

**Ready for Testing:**
1. Re-process Sun Chip Bank Policy Document v2.0
2. Run the exact user query
3. Verify both specific data points are retrieved and cited

---

**End of Document**
