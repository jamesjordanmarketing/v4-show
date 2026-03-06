import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { ClaudeLLMProvider } from '@/lib/rag/providers';
import type { LLMProvider } from '@/lib/rag/providers/llm-provider';
import { searchSimilarEmbeddings, searchTextContent } from './rag-embedding-service';
import { mapRowToSection, mapRowToFact, mapRowToDocument, mapRowToQuery } from './rag-db-mappers';
import type {
  RAGQuery,
  RAGSection,
  RAGFact,
  RAGCitation,
  RAGQueryMode,
  HyDEResult,
  SelfEvalResult,
} from '@/types/rag';
import { RAG_CONFIG } from '@/lib/rag/config';
import { callInferenceEndpoint } from '@/lib/services/inference-service';

// ============================================
// RAG Retrieval Service
// ============================================
// Implements the full retrieval pipeline:
// 1. HyDE — generate a hypothetical answer to improve query embedding
// 2. Multi-tier retrieval — search documents, sections, and facts
// 3. Context assembly — build a coherent context from retrieved items
// 4. Response generation — Claude generates a cited answer
// 5. Self-RAG evaluation — Claude evaluates if the answer is supported
// Pattern Source: src/lib/services/pipeline-service.ts

let llmProvider: LLMProvider | null = null;

function getLLMProvider(): LLMProvider {
  if (!llmProvider) {
    llmProvider = new ClaudeLLMProvider();
  }
  return llmProvider;
}

// ============================================
// HyDE: Hypothetical Document Embeddings
// ============================================

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

// ============================================
// Multi-Tier Retrieval
// ============================================

async function retrieveContext(params: {
  queryText: string;
  documentId?: string;
  workbaseId?: string;
  runId?: string;
  hydeText?: string;
}): Promise<{
  sections: Array<RAGSection & { similarity: number }>;
  facts: Array<RAGFact & { similarity: number }>;
  sectionIds: string[];
  factIds: string[];
}> {
  const supabase = createServerSupabaseAdminClient();
  const documentId = params.documentId || undefined;

  // Phase 1: Collect source ID → best similarity score maps
  const sectionScores = new Map<string, number>();
  const factScores = new Map<string, number>();

  const searchTexts = [params.queryText];
  if (params.hydeText) searchTexts.push(params.hydeText);

  // Use lower threshold for KB-wide queries to improve recall across a larger corpus
  const threshold = params.workbaseId && !params.documentId
    ? RAG_CONFIG.retrieval.kbWideSimilarityThreshold
    : RAG_CONFIG.retrieval.similarityThreshold;

  for (const searchText of searchTexts) {
    // Tier 2: Section-level vector search
    const sectionResults = await searchSimilarEmbeddings({
      queryText: searchText,
      documentId,
      workbaseId: params.workbaseId,
      tier: 2,
      runId: params.runId,
      limit: RAG_CONFIG.retrieval.maxSectionsToRetrieve,
      threshold,
    });

    if (sectionResults.success && sectionResults.data) {
      for (const result of sectionResults.data) {
        const existing = sectionScores.get(result.sourceId) || 0;
        if (result.similarity > existing) {
          sectionScores.set(result.sourceId, result.similarity);
        }
      }
    }

    // Tier 3: Fact-level vector search
    const factResults = await searchSimilarEmbeddings({
      queryText: searchText,
      documentId,
      workbaseId: params.workbaseId,
      tier: 3,
      runId: params.runId,
      limit: RAG_CONFIG.retrieval.maxFactsToRetrieve,
      threshold,
    });

    if (factResults.success && factResults.data) {
      for (const result of factResults.data) {
        const existing = factScores.get(result.sourceId) || 0;
        if (result.similarity > existing) {
          factScores.set(result.sourceId, result.similarity);
        }
      }
    }
  }

  // Hybrid text search (BM25)
  const textResults = await searchTextContent({
    queryText: params.queryText,
    documentId: params.documentId,
    workbaseId: params.workbaseId,
    runId: params.runId,
    limit: 10,
  });

  // Log hybrid search overlap metrics for observability
  if (textResults.success && textResults.data && textResults.data.length > 0) {
    const vectorIds = new Set(Array.from(sectionScores.keys()).concat(Array.from(factScores.keys())));
    const bm25Ids = new Set(textResults.data.map(r => r.sourceId));
    const overlap = Array.from(vectorIds).filter(id => bm25Ids.has(id)).length;
    const vectorOnly = vectorIds.size - overlap;
    const bm25Only = bm25Ids.size - overlap;
    console.log(`[RAG Retrieval] Hybrid search: vector=${vectorIds.size}, bm25=${bm25Ids.size}, overlap=${overlap}, vectorOnly=${vectorOnly}, bm25Only=${bm25Only}`);
  }

  if (textResults.success && textResults.data) {
    for (const result of textResults.data) {
      const normalizedScore = 0.5 + (result.rank * 0.3);
      if (result.sourceType === 'section') {
        const existing = sectionScores.get(result.sourceId) || 0;
        if (normalizedScore > existing) {
          sectionScores.set(result.sourceId, normalizedScore);
        }
      } else if (result.sourceType === 'fact') {
        const existing = factScores.get(result.sourceId) || 0;
        if (normalizedScore > existing) {
          factScores.set(result.sourceId, normalizedScore);
        }
      }
    }
  }

  // Phase 2: BATCH FETCH — 2 queries instead of ~50
  const allSectionIds = Array.from(sectionScores.keys());
  const allFactIds = Array.from(factScores.keys());

  const sections: Array<RAGSection & { similarity: number }> = [];
  if (allSectionIds.length > 0) {
    const { data: sectionRows } = await supabase
      .from('rag_sections')
      .select('*')
      .in('id', allSectionIds);

    if (sectionRows) {
      for (const row of sectionRows) {
        sections.push({ ...mapRowToSection(row), similarity: sectionScores.get(row.id) || 0 });
      }
    }
  }

  const facts: Array<RAGFact & { similarity: number }> = [];
  if (allFactIds.length > 0) {
    const { data: factRows } = await supabase
      .from('rag_facts')
      .select('*')
      .in('id', allFactIds);

    if (factRows) {
      for (const row of factRows) {
        facts.push({ ...mapRowToFact(row), similarity: factScores.get(row.id) || 0 });
      }
    }
  }

  // Filter out results from non-ready documents (KB-wide queries only)
  if (!params.documentId && params.workbaseId) {
    const { data: readyDocs } = await supabase
      .from('rag_documents')
      .select('id')
      .eq('workbase_id', params.workbaseId)
      .eq('status', 'ready');

    const readyDocIds = new Set((readyDocs || []).map(d => d.id));

    const filteredSections = sections.filter(s => readyDocIds.has(s.documentId));
    const filteredFacts = facts.filter(f => readyDocIds.has(f.documentId));

    if (filteredSections.length < sections.length || filteredFacts.length < facts.length) {
      console.warn(`[RAG Retrieval] Filtered out ${sections.length - filteredSections.length} sections and ${facts.length - filteredFacts.length} facts from non-ready documents`);
    }

    // Replace array contents in-place (arrays are const, but mutable)
    sections.length = 0;
    sections.push(...filteredSections);
    facts.length = 0;
    facts.push(...filteredFacts);
  }

  // Sort by similarity descending
  sections.sort((a, b) => b.similarity - a.similarity);
  facts.sort((a, b) => b.similarity - a.similarity);

  return { sections, facts, sectionIds: allSectionIds, factIds: allFactIds };
}

// ============================================
// Context Assembly
// ============================================

/**
 * Assemble retrieved context with token budget enforcement.
 * Budget allocation: 5% headers/summary, 70% sections, 25% facts.
 * Multi-doc context includes document name headers for provenance.
 */
function assembleContext(params: {
  sections: Array<RAGSection & { similarity: number }>;
  facts: Array<RAGFact & { similarity: number }>;
  documentSummary?: string;
  documentNames?: Map<string, string>;
}): { context: string; tokenCount: number; truncated: boolean } {
  const { sections, facts, documentSummary, documentNames } = params;
  const maxTokens = RAG_CONFIG.retrieval.maxContextTokens; // 100000

  // Token estimation: chars / 4 (conservative estimate)
  const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

  // Budget allocation
  const headerBudget  = Math.floor(maxTokens * 0.05);  // 5%  for headers/summary
  const sectionBudget = Math.floor(maxTokens * 0.70);  // 70% for sections
  const factBudget    = Math.floor(maxTokens * 0.25);  // 25% for facts

  let usedTokens = 0;
  let truncated = false;
  const contextParts: string[] = [];

  // Check if results span multiple documents
  const docIds = new Set(sections.map(s => s.documentId));
  const isMultiDoc = docIds.size > 1;

  // Add document/KB summary (within header budget)
  if (documentSummary) {
    const summaryText = isMultiDoc
      ? `Knowledge Base Overview: ${documentSummary}`
      : `Document Overview: ${documentSummary}`;
    const summaryTokens = estimateTokens(summaryText);
    if (summaryTokens <= headerBudget) {
      contextParts.push(summaryText);
      usedTokens += summaryTokens;
    } else {
      const truncatedSummary = truncateAtSentence(summaryText, headerBudget * 4);
      contextParts.push(truncatedSummary);
      usedTokens += estimateTokens(truncatedSummary);
      truncated = true;
    }
  }

  // Add sections in similarity order until budget used
  let sectionTokensUsed = 0;
  if (isMultiDoc) {
    // Multi-doc: round-robin interleaving by document to prevent primacy bias.
    // Instead of dumping all of Doc A then all of Doc B, we alternate:
    // Doc A section 1 → Doc B section 1 → Doc A section 2 → Doc B section 2 → ...
    // Each document's sections are pre-sorted by similarity (highest first).
    const sectionsByDoc = new Map<string, Array<RAGSection & { similarity: number }>>();
    for (const section of sections) {
      const existing = sectionsByDoc.get(section.documentId) || [];
      existing.push(section);
      sectionsByDoc.set(section.documentId, existing);
    }

    // Sort each document's sections by similarity (descending) internally
    for (const docSections of Array.from(sectionsByDoc.values())) {
      docSections.sort((a, b) => b.similarity - a.similarity);
    }

    // Build the interleaved order: round-robin across documents
    const docEntries = Array.from(sectionsByDoc.entries()); // [[docId, sections], ...]
    const maxSectionsPerDoc = Math.max(...docEntries.map(([, s]) => s.length));
    const interleavedSections: Array<{ docId: string; section: RAGSection & { similarity: number } }> = [];

    for (let round = 0; round < maxSectionsPerDoc; round++) {
      for (const [docId, docSections] of docEntries) {
        if (round < docSections.length) {
          interleavedSections.push({ docId, section: docSections[round] });
        }
      }
    }

    // Emit headers and sections — track which doc headers we've already emitted
    const emittedHeaders = new Set<string>();
    // Pre-emit all document headers at the top so LLM sees the full document list up front
    for (const [docId] of docEntries) {
      const docName = documentNames?.get(docId) || docId;
      const docHeader = `\n## From: ${docName}`;
      const headerTokens = estimateTokens(docHeader);
      if (sectionTokensUsed + headerTokens > sectionBudget) {
        truncated = true;
        break;
      }
      contextParts.push(docHeader);
      sectionTokensUsed += headerTokens;
      emittedHeaders.add(docId);
    }

    // Now interleave sections with per-section doc attribution
    for (const { docId, section } of interleavedSections) {
      if (!emittedHeaders.has(docId)) continue; // skip if header was truncated
      const docName = documentNames?.get(docId) || docId;
      const preamble = section.contextualPreamble ? `Context: ${section.contextualPreamble}\n` : '';
      const sectionText = `### [${docName}] ${section.title || 'Untitled'} [similarity: ${section.similarity.toFixed(3)}]\n${preamble}${section.originalText}`;
      const sectionTokens = estimateTokens(sectionText);

      if (sectionTokensUsed + sectionTokens > sectionBudget) {
        const remaining = sectionBudget - sectionTokensUsed;
        if (remaining > 200) {
          const truncatedText = truncateAtSentence(sectionText, remaining * 4);
          contextParts.push(truncatedText);
          sectionTokensUsed += estimateTokens(truncatedText);
        }
        truncated = true;
        break;
      }

      contextParts.push(sectionText);
      sectionTokensUsed += sectionTokens;
    }
  } else {
    // Single-doc: original pattern with similarity scores
    contextParts.push('## Relevant Sections');
    for (const section of sections) {
      const header = section.title || `Section ${section.sectionIndex}`;
      const preamble = section.contextualPreamble ? `Context: ${section.contextualPreamble}\n` : '';
      const sectionText = `### ${header} [similarity: ${section.similarity.toFixed(3)}]\n${preamble}${section.originalText}`;
      const sectionTokens = estimateTokens(sectionText);

      if (sectionTokensUsed + sectionTokens > sectionBudget) {
        const remaining = sectionBudget - sectionTokensUsed;
        if (remaining > 200) {
          const truncatedText = truncateAtSentence(sectionText, remaining * 4);
          contextParts.push(truncatedText);
          sectionTokensUsed += estimateTokens(truncatedText);
        }
        truncated = true;
        break;
      }

      contextParts.push(sectionText);
      sectionTokensUsed += sectionTokens;
    }
  }
  usedTokens += sectionTokensUsed;

  // Add facts in similarity order until budget used
  let factTokensUsed = 0;
  const factTexts: string[] = [];
  for (const fact of facts.sort((a, b) => b.similarity - a.similarity)) {
    const provenance: string[] = [];
    if (fact.policyId) provenance.push(`Policy: ${fact.policyId}`);
    if (fact.subsection) provenance.push(`Section: ${fact.subsection}`);
    if (fact.factCategory) provenance.push(`Category: ${fact.factCategory}`);
    const provenanceStr = provenance.length > 0 ? ` (${provenance.join(', ')})` : '';
    const factText = `- [${fact.factType}] ${fact.content}${provenanceStr} (confidence: ${fact.confidence})`;
    const factTokens = estimateTokens(factText);

    if (factTokensUsed + factTokens > factBudget) {
      truncated = true;
      break;
    }

    factTexts.push(factText);
    factTokensUsed += factTokens;
  }

  if (factTexts.length > 0) {
    contextParts.push(`## Relevant Facts\n${factTexts.join('\n')}`);
  }
  usedTokens += factTokensUsed;

  if (truncated) {
    console.warn(`[RAG Retrieval] Context truncated at ${usedTokens} estimated tokens (budget: ${maxTokens})`);
  }

  return {
    context: contextParts.join('\n\n'),
    tokenCount: usedTokens,
    truncated,
  };
}

/**
 * Truncate text at the last sentence boundary before maxChars.
 */
function truncateAtSentence(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const truncated = text.slice(0, maxChars);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('.\n'),
    truncated.lastIndexOf('? '),
    truncated.lastIndexOf('! ')
  );
  return lastSentenceEnd > maxChars * 0.5
    ? truncated.slice(0, lastSentenceEnd + 1)
    : truncated + '...';
}

// ============================================
// Claude Haiku Reranking (Phase 3)
// ============================================

/**
 * Rerank retrieved candidates using Claude Haiku for fast semantic relevance scoring.
 * Target latency: ~300-500ms.
 */
async function rerankWithClaude(params: {
  queryText: string;
  candidates: Array<{ id: string; content: string; similarity: number; documentName?: string }>;
  topK: number;
}): Promise<Array<{ id: string; relevanceScore: number }>> {
  if (params.candidates.length <= params.topK) {
    // No need to rerank if we have fewer candidates than topK
    return params.candidates.map(c => ({ id: c.id, relevanceScore: c.similarity }));
  }

  const provider = getLLMProvider();

  // Increased from 200 to 500 chars for better ranking signal
  const candidateList = params.candidates
    .map((c, i) => {
      const docPrefix = c.documentName ? `[Doc: ${c.documentName}] ` : '';
      return `[${i}] ${docPrefix}${c.content.slice(0, 500)}`;
    })
    .join('\n');

  try {
    // Use dedicated lightweight call — generateResponse() injects RAG citation template
    // which conflicts with the reranker's expected array output
    const response = await provider.generateLightweightCompletion({
      systemPrompt: `You are a relevance ranker. Given a query and numbered passages, return ONLY a JSON array of passage indices ordered from most relevant to least relevant. Example: [3, 0, 5, 1, 2, 4]. No other text.`,
      userMessage: `Query: "${params.queryText}"\n\nPassages:\n${candidateList}`,
      maxTokens: 200,
      temperature: 0,
    });

    // Parse the ranking from Claude's response
    const responseText = response.responseText || '';

    // Try multiple extraction strategies for the ranked indices array
    let rankedIndices: number[] | null = null;

    // Strategy 1: Direct regex match for integer array (handles [3, 0, 5, 1])
    const jsonMatch = responseText.match(/\[[\d,\s\n]+\]/);
    if (jsonMatch) {
      try {
        rankedIndices = JSON.parse(jsonMatch[0]);
      } catch { /* try next strategy */ }
    }

    // Strategy 2: Extract JSON from markdown fences (handles ```json [3, 0, 5] ```)
    if (!rankedIndices) {
      const fenceMatch = responseText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
      if (fenceMatch) {
        try {
          rankedIndices = JSON.parse(fenceMatch[1]);
        } catch { /* try next strategy */ }
      }
    }

    // Strategy 3: Find any JSON array in the response
    if (!rankedIndices) {
      const bracketStart = responseText.indexOf('[');
      const bracketEnd = responseText.lastIndexOf(']');
      if (bracketStart >= 0 && bracketEnd > bracketStart) {
        try {
          rankedIndices = JSON.parse(responseText.substring(bracketStart, bracketEnd + 1));
        } catch { /* give up */ }
      }
    }

    // Validate parsed indices
    if (rankedIndices && Array.isArray(rankedIndices)) {
      rankedIndices = rankedIndices
        .filter(idx => Number.isInteger(idx) && idx >= 0 && idx < params.candidates.length);
    }

    if (!rankedIndices || !Array.isArray(rankedIndices) || rankedIndices.length === 0) {
      console.warn('[RAG Retrieval] Reranking: Could not parse ranking, using original order');
      return params.candidates.slice(0, params.topK).map(c => ({ id: c.id, relevanceScore: c.similarity }));
    }
    const results: Array<{ id: string; relevanceScore: number }> = [];

    for (let rank = 0; rank < Math.min(rankedIndices.length, params.topK); rank++) {
      const idx = rankedIndices[rank];
      if (idx >= 0 && idx < params.candidates.length) {
        results.push({
          id: params.candidates[idx].id,
          // Blend original similarity with rank position
          relevanceScore: params.candidates[idx].similarity * 0.4 + (1 - rank / rankedIndices.length) * 0.6,
        });
      }
    }

    return results;
  } catch (err) {
    console.warn('[RAG Retrieval] Reranking failed, using original order:', err);
    return params.candidates.slice(0, params.topK).map(c => ({ id: c.id, relevanceScore: c.similarity }));
  }
}

/**
 * Rerank sections using Claude. Adapts section data to the reranker format.
 * Only called when >3 sections after balancing.
 */
async function rerankSections(
  sections: Array<RAGSection & { similarity: number }>,
  queryText: string,
  documentNames?: Map<string, string>
): Promise<Array<RAGSection & { similarity: number }>> {
  const reranked = await rerankWithClaude({
    queryText,
    candidates: sections.map(s => ({
      id: s.id,
      content: s.originalText.slice(0, 500),
      similarity: s.similarity,
      documentName: documentNames?.get(s.documentId) || undefined,
    })),
    topK: Math.min(sections.length, 10),
  });

  const scoreMap = new Map(reranked.map(r => [r.id, r.relevanceScore]));
  return sections
    .map(s => ({ ...s, similarity: scoreMap.get(s.id) ?? s.similarity }))
    .sort((a, b) => b.similarity - a.similarity);
}

// ============================================
// Cross-Document Deduplication (Phase 3)
// ============================================

/**
 * Remove near-duplicate results (>90% text overlap), keeping the higher-scored one.
 * This prevents the same fact from appearing multiple times when documents overlap.
 */
function deduplicateResults<T extends { similarity: number }>(
  results: T[],
  textFn: (item: T) => string = (item) => (item as unknown as { content: string }).content || ''
): T[] {
  const deduped: T[] = [];

  for (const result of results) {
    const isDuplicate = deduped.some(existing =>
      textSimilarity(textFn(existing), textFn(result)) > 0.9
    );
    if (!isDuplicate) {
      deduped.push(result);
    }
  }

  return deduped;
}

/**
 * Simple text similarity using Jaccard coefficient of word sets.
 * Fast enough for dedup (~0.1ms per comparison).
 */
function textSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 2));

  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const word of Array.from(wordsA)) {
    if (wordsB.has(word)) intersection++;
  }

  const union = wordsA.size + wordsB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

// ============================================
// Balanced Multi-Doc Coverage (Phase 3)
// ============================================

/**
 * Ensure no single document dominates the results.
 * Max 60% of results can come from any single document.
 * Excess results from over-represented documents are dropped in favor of
 * lower-ranked results from under-represented documents.
 */
function balanceMultiDocCoverage<T extends { documentId: string; similarity: number }>(
  results: T[],
  maxPerDocRatio: number = RAG_CONFIG.retrieval.maxSingleDocRatio
): T[] {
  if (results.length === 0) return results;

  const uniqueDocs = new Set(results.map(r => r.documentId));
  if (uniqueDocs.size <= 1) return results;

  const maxPerDoc = Math.ceil(results.length * maxPerDocRatio);
  const docCounts = new Map<string, number>();
  const balanced: T[] = [];

  for (const result of results) {
    const count = docCounts.get(result.documentId) || 0;
    if (count < maxPerDoc) {
      balanced.push(result);
      docCounts.set(result.documentId, count + 1);
    }
  }

  // Soft fallback: if balancing dropped >30% of results, use original (similarity ordered)
  if (balanced.length < results.length * 0.7) {
    console.warn(`[RAG Retrieval] Balance dropped ${results.length - balanced.length}/${results.length} results — falling back to top-N by similarity`);
    return results;
  }

  return balanced;
}

// ============================================
// Response Generation with Citations
// ============================================

async function generateResponse(params: {
  queryText: string;
  assembledContext: string;
  mode: RAGQueryMode;
  conversationContext?: string;  // recent Q&A pairs for follow-up awareness
}): Promise<{ responseText: string; citations: RAGCitation[] }> {
  const provider = getLLMProvider();

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

  const multiDocInstruction = isMultiDoc
    ? `\n6. **CRITICAL — MULTI-DOCUMENT COMPLETENESS**: The context below contains information from ${docNamesInContext.length} different documents: ${docNamesInContext.map(n => `"${n}"`).join(', ')}. You MUST:
   a. ALWAYS present the equivalent policies from EACH document, even if they approach the topic differently or use different terminology. Do NOT skip any document.
   b. If different documents provide different answers to the same question (e.g., different fee amounts, different thresholds, different policy names), present EACH document's answer clearly labeled with the document name.
   c. Structure your response with clear per-document sections using "## From:" headings for EVERY document.
   d. When citing information, always specify which document it comes from using the "From:" header names.
   e. If a document handles this topic differently than described in the question, explain how that document's approach differs rather than omitting it.
   f. End your response with a brief comparative summary noting the key differences between the documents' approaches.
   Failure to address ALL ${docNamesInContext.length} documents is considered an incomplete answer and will receive a failing score.`
    : '';

  const systemPrompt = `You are a helpful knowledge assistant that answers questions based on provided source material. Your response MUST:
1. Only use information from the provided context
2. Include citations in the format [Section: title] or [Fact: content_preview] for every claim
3. If the context doesn't contain enough information, say so clearly
4. Be comprehensive but concise
5. Never fabricate information not in the context${multiDocInstruction}

Return your response in this JSON format:
{
  "responseText": "Your complete answer text with inline [citations]",
  "citations": [
    { "sectionId": "section-uuid", "sectionTitle": "section title", "excerpt": "cited text excerpt", "relevanceScore": 0.9 }
  ]
}`;

  try {
    const contextSection = params.conversationContext
      ? `\n\nRecent conversation for context (use to understand follow-up references):\n${params.conversationContext}`
      : '';
    const fullContext = params.assembledContext + contextSection;

    const result = await provider.generateResponse({
      queryText: params.queryText,
      assembledContext: fullContext,
      systemPrompt,
    });

    return {
      responseText: result.responseText,
      citations: result.citations,
    };
  } catch (err) {
    console.error('[RAG Retrieval] Response generation failed:', err);
    return {
      responseText: 'I encountered an error generating a response. Please try again.',
      citations: [],
    };
  }
}

// ============================================
// LoRA Response Generation
// ============================================

async function generateLoRAResponse(params: {
  queryText: string;
  assembledContext: string | null;
  mode: RAGQueryMode;
  jobId: string;
  userId: string;
}): Promise<{ responseText: string; citations: RAGCitation[]; effectiveContext: string | null }> {
  const { queryText, mode, jobId } = params;
  let { assembledContext } = params;

  // Defense-in-depth: truncate assembled context to fit LoRA's 16k token window.
  // Budget: loraMaxContextTokens from config (~13,836) minus query/prompt overhead.
  const loraTokenBudget = RAG_CONFIG.retrieval.loraMaxContextTokens;
  if (assembledContext) {
    const estimateTokens = (text: string): number => Math.ceil(text.length / 4);
    const contextTokens = estimateTokens(assembledContext);
    // Reserve ~300 tokens for the wrapping prompt template ("Context from knowledge base...")
    const maxContextTokens = loraTokenBudget - 300;
    if (contextTokens > maxContextTokens) {
      console.warn(`[LoRA-INFERENCE] Context too large (${contextTokens} tokens), truncating to ~${maxContextTokens} tokens for LoRA context window`);
      // Hard truncate at character level as a safety net — assembleMultiHopContext
      // should have already handled this gracefully, but this catches edge cases.
      const maxChars = maxContextTokens * 4;
      assembledContext = assembledContext.slice(0, maxChars);
      // Try to cut at last complete section boundary ("####") for cleaner truncation
      const lastSectionBreak = assembledContext.lastIndexOf('\n####');
      if (lastSectionBreak > maxChars * 0.5) {
        assembledContext = assembledContext.slice(0, lastSectionBreak);
      }
      console.log(`[LoRA-INFERENCE] Truncated context to ~${estimateTokens(assembledContext)} tokens`);
    }
  }

  // Build the prompt for the LoRA model
  let prompt: string;
  let systemPrompt: string;

  if (mode === 'rag_and_lora' && assembledContext) {
    // RAG + LoRA: Include retrieved context but preserve LoRA's trained personality
    // Detect multi-doc context and inject multi-doc awareness into LoRA system prompt
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
      if (loraDocNames.length > 1) {
        loraMultiDocInstruction = `\n\nCRITICAL: The context contains information from ${loraDocNames.length} different documents: ${loraDocNames.map(n => `"${n}"`).join(', ')}. You MUST address EACH document separately in your answer. ALWAYS present the relevant policies from EVERY document, even if they differ. Do NOT only answer from one document. Structure your answer with clear sections per document using "## From:" headings.`;
      }
    }
    systemPrompt = `You are a helpful, empathetic financial assistant with deep knowledge of institutional policies. Use the provided context to answer accurately, but maintain your natural supportive and warm communication style. Include citations in brackets like [Section: title] when referencing specific information. If information is not found in the context, say so honestly rather than guessing.${loraMultiDocInstruction}`;
    prompt = `Context from knowledge base:\n\n${assembledContext}\n\n---\n\nQuestion: ${queryText}\n\nAnswer using the context above, maintaining your natural tone:`;
  } else {
    // LoRA Only: No context, just the query
    systemPrompt = `You are a helpful assistant. Answer the user's question clearly and concisely.`;
    prompt = queryText;
  }

  try {
    // Look up the endpoint info with ownership verification
    const supabase = createServerSupabaseAdminClient();
    const { data: endpoint } = await supabase
      .from('pipeline_inference_endpoints')
      .select(`
        runpod_endpoint_id,
        adapter_path,
        pipeline_training_jobs!inner ( user_id )
      `)
      .eq('job_id', jobId)
      .eq('endpoint_type', 'adapted')
      .eq('status', 'ready')
      .eq('pipeline_training_jobs.user_id', params.userId)
      .single();

    if (!endpoint) {
      return {
        responseText: 'The selected LoRA model endpoint is not available. It may have been terminated or is not ready. Please check the model deployment status.',
        citations: [],
        effectiveContext: assembledContext,
      };
    }

    console.log(`[LoRA-INFERENCE] Calling endpoint for job ${jobId.slice(0, 8)}, mode=${mode}`);

    const result = await callInferenceEndpoint(
      endpoint.runpod_endpoint_id || '',
      prompt,
      systemPrompt,
      true,  // useAdapter = true (we want the LoRA-adapted model)
      endpoint.adapter_path || undefined,
      jobId
    );

    // Attempt to parse citations from the LoRA response (best-effort)
    const citations = parseCitationsFromText(result.response);

    return {
      responseText: result.response,
      citations,
      effectiveContext: assembledContext,  // Post-truncation context the LoRA actually saw
    };
  } catch (err) {
    console.error('[LoRA-INFERENCE] LoRA inference failed:', err);
    const errorMessage = err instanceof Error ? err.message : 'LoRA inference failed';

    // Provide actionable error messages
    if (errorMessage.includes('Cannot connect') || errorMessage.includes('ECONNREFUSED')) {
      return {
        responseText: 'Cannot connect to the LoRA model endpoint. The pod may be stopped. Please check RunPod console and ensure the pod is running.',
        citations: [],
        effectiveContext: assembledContext,
      };
    }

    return {
      responseText: `LoRA inference failed: ${errorMessage}`,
      citations: [],
      effectiveContext: assembledContext,
    };
  }
}

/**
 * Best-effort citation parser for LoRA model responses.
 * Looks for patterns like [Section: title] or [Fact: content] in the response text.
 * LoRA models may not follow this format, so this returns empty array if no matches found.
 */
function parseCitationsFromText(text: string): RAGCitation[] {
  const citations: RAGCitation[] = [];
  const citationPattern = /\[(?:Section|Fact):\s*([^\]]+)\]/g;
  let match: RegExpExecArray | null;

  while ((match = citationPattern.exec(text)) !== null) {
    citations.push({
      sectionId: '',  // Cannot resolve to actual section ID from LoRA output
      sectionTitle: match[1].trim(),
      excerpt: match[0],
      relevanceScore: 0.5,  // Default score since LoRA doesn't provide relevance
    });
  }

  return citations;
}

// ============================================
// Self-RAG Evaluation
// ============================================

async function selfEvaluate(params: {
  queryText: string;
  responseText: string;
  assembledContext: string;
  mode?: RAGQueryMode;
}): Promise<{ passed: boolean; score: number }> {
  const provider = getLLMProvider();

  try {
    let result: SelfEvalResult;
    try {
      result = await provider.selfEvaluate({
        queryText: params.queryText,
        retrievedContext: params.assembledContext,
        responseText: params.responseText,
        mode: params.mode,
      });
    } catch (parseErr) {
      // JSON parse failed (likely truncated response) — return low-confidence default
      // so the overall query still succeeds rather than crashing
      console.warn('[RAG Retrieval] Self-eval JSON parse failed, returning default low-confidence result:', parseErr);
      return { passed: false, score: 0.5 };
    }

    console.log(`[RAG Self-Eval] score=${result.score.toFixed(2)} passed=${result.passed} reasoning="${(result.reasoning ?? '').slice(0, 150)}"`);

    return {
      passed: result.passed,
      score: result.score,
    };
  } catch (err) {
    console.warn('[RAG Retrieval] Self-evaluation failed:', err);
    return { passed: true, score: 0.7 };
  }
}

/**
 * Classify whether a query needs decomposition for multi-document retrieval.
 * Uses Claude Haiku for fast classification (target: <300ms).
 *
 * Returns:
 * - 'simple': Direct retrieval across KB (default path)
 * - 'multi-hop': Needs decomposition into sub-queries
 * - 'comparative': Needs parallel retrieval from specific documents then comparison
 */
async function classifyQuery(params: {
  queryText: string;
  documentCount: number;
}): Promise<{ type: 'simple' | 'multi-hop' | 'comparative'; subQueries?: string[] }> {
  if (params.documentCount <= 1) {
    return { type: 'simple' };
  }

  const provider = getLLMProvider();

  try {
    const response = await provider.generateLightweightCompletion({
      systemPrompt: `You classify queries for a multi-document knowledge base containing ${params.documentCount} documents. Determine if the query:

1. "simple" - A factual lookup that would have the SAME answer regardless of which document it comes from (e.g., "What is the date today?", generic questions)
2. "multi-hop" - Requires finding information in one document that references or depends on information in another document
3. "comparative" - Asks to compare, contrast, or reconcile information across documents

IMPORTANT -- Implicit comparison detection:
When a knowledge base contains multiple documents of the SAME TYPE (e.g., multiple bank policies, multiple product specs, multiple contracts), questions about specific values, thresholds, fees, rules, or penalties are ALMOST ALWAYS "comparative" because each document likely has DIFFERENT answers. Examples:
- "What is the minimum balance?" --> comparative (each bank/product has a different minimum)
- "What fee am I charged?" --> comparative (fee structures differ across documents)
- "What happens when I go below the threshold?" --> comparative (consequences differ)
- "Tell me about the cancellation policy" --> comparative (each contract has its own)

Only classify as "simple" when you are confident the answer would be identical across all documents, or when the query explicitly names a single specific document/entity.

For "multi-hop" and "comparative", break the query into 2-4 sub-queries that each target specific information needed.

RESPOND WITH ONLY THE JSON OBJECT. NO OTHER TEXT.
Format: {"type": "simple"|"multi-hop"|"comparative", "subQueries": ["...", "..."]}`,
      userMessage: `Query: "${params.queryText}"\nDocuments in KB: ${params.documentCount}`,
      maxTokens: 500,
      temperature: 0,
    });

    // Strip markdown code fences, then extract JSON object if there's preamble text
    let cleanedText = response.responseText.replace(/```json\n?|\n?```/g, '').trim();
    const firstBrace = cleanedText.indexOf('{');
    const lastBrace = cleanedText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      cleanedText = cleanedText.slice(firstBrace, lastBrace + 1);
    }
    const parsed = JSON.parse(cleanedText);
    console.log(`[RAG Retrieval] Query classified as: ${parsed.type}, subQueries: ${JSON.stringify(parsed.subQueries || [])}`);
    return {
      type: parsed.type || 'simple',
      subQueries: parsed.subQueries,
    };
  } catch (err) {
    console.warn('[RAG Retrieval] Query classification failed, defaulting to simple. Error:', err);
    return { type: 'simple' };
  }
}

/**
 * Assemble context for multi-hop/comparative queries.
 * Includes sub-query structure so Claude/LoRA understands the decomposition.
 * When maxTokens is provided, sections are truncated by dropping lowest-similarity
 * items in a round-robin fashion across documents to maintain multi-doc balance.
 */
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
  const originalDocIds = Array.from(new Set(params.sections.map(s => s.documentId)));
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
  for (const [docId, docSections] of Array.from(sectionsByDoc.entries())) {
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

/**
 * Enrich citations with document provenance information.
 * Maps section IDs to their source document ID and name.
 */
function enrichCitationsWithDocumentInfo(
  citations: RAGCitation[],
  sections: Array<RAGSection & { similarity: number }>,
  documentNames: Map<string, string>
): RAGCitation[] {
  if (citations.length === 0) return citations;

  const sectionDocMap = new Map<string, string>();
  for (const section of sections) {
    sectionDocMap.set(section.id, section.documentId);
  }

  return citations.map(citation => {
    const documentId = sectionDocMap.get(citation.sectionId);
    if (documentId) {
      return {
        ...citation,
        documentId,
        documentName: documentNames.get(documentId) || undefined,
      };
    }
    return citation;
  });
}

// ============================================
// Main Query Function
// ============================================

export async function queryRAG(params: {
  queryText: string;
  documentId?: string;
  workbaseId?: string;
  userId: string;
  mode?: RAGQueryMode;
  modelJobId?: string;
  runId?: string;
}): Promise<{ success: boolean; data?: RAGQuery; error?: string }> {
  const startTime = Date.now();

  // Validate: at least one scope identifier is required for RAG modes
  if (!params.documentId && !params.workbaseId && params.mode !== 'lora_only') {
    throw new Error('[RAG Retrieval] documentId or workbaseId is required — cannot query without scope');
  }

  // Determine query scope for tracking
  const queryScope: 'document' | 'knowledge_base' = params.documentId ? 'document' : 'knowledge_base';

  try {
    const supabase = createServerSupabaseAdminClient();
    const mode = params.mode || 'rag_only';

    console.log(`[RAG Retrieval] Query: "${params.queryText.slice(0, 100)}..." mode=${mode} modelJobId=${params.modelJobId || 'none'}`);

    // If workbaseId not provided, fetch it from the document
    let workbaseId = params.workbaseId;
    if (!workbaseId && params.documentId) {
      const { data: docRow } = await supabase
        .from('rag_documents')
        .select('workbase_id')
        .eq('id', params.documentId)
        .single();
      workbaseId = docRow?.workbase_id;
    }

    // Validate: LoRA modes require a modelJobId
    if ((mode === 'lora_only' || mode === 'rag_and_lora') && !params.modelJobId) {
      return { success: false, error: 'A deployed LoRA model must be selected for LoRA and RAG+LoRA modes.' };
    }

    // ============================================
    // MODE: lora_only — Skip RAG, go straight to LoRA
    // ============================================
    if (mode === 'lora_only') {
      const { responseText, citations } = await generateLoRAResponse({
        queryText: params.queryText,
        assembledContext: null,
        mode,
        jobId: params.modelJobId!,
        userId: params.userId,
      });

      const responseTimeMs = Date.now() - startTime;

      const { data: queryRow, error: insertError } = await supabase
        .from('rag_queries')
        .insert({
          workbase_id: workbaseId || null,
          document_id: params.documentId || null,
          user_id: params.userId,
          query_text: params.queryText,
          hyde_text: null,
          mode,
          retrieved_section_ids: [],
          retrieved_fact_ids: [],
          assembled_context: '',
          response_text: responseText,
          citations,
          self_eval_passed: null,
          self_eval_score: null,
          response_time_ms: responseTimeMs,
          query_scope: queryScope,
        })
        .select('*')
        .single();

      if (insertError) {
        console.error('[RAG Retrieval] Error storing LoRA-only query:', insertError);
        return { success: false, error: 'Failed to store query results' };
      }

      console.log(`[RAG Retrieval] LoRA-only query complete in ${responseTimeMs}ms`);
      return { success: true, data: mapRowToQuery(queryRow) };
    }

    // ============================================
    // MODE: rag_only OR rag_and_lora — Run RAG retrieval first
    // ============================================

    // Step 1: Get summary for HyDE (document-level or KB-level)
    let documentSummary = '';
    if (params.documentId) {
      // Document-level: use document summary
      const { data: docRow } = await supabase
        .from('rag_documents')
        .select('document_summary')
        .eq('id', params.documentId)
        .single();
      documentSummary = docRow?.document_summary || '';
    } else if (workbaseId) {
      // KB-level: use workbase description as context summary
      const { data: kbRow } = await supabase
        .from('workbases')
        .select('description')
        .eq('id', workbaseId)
        .single();
      documentSummary = kbRow?.description || '';
    }

    // Step 1.5: Conversation context — scoped to match current query type
    const recentQueries = params.documentId
      ? await getQueryHistory({
          documentId: params.documentId,
          userId: params.userId,
          limit: 3,
        })
      : await getQueryHistory({
          workbaseId: workbaseId || undefined,
          userId: params.userId,
          limit: 3,
        });

    const conversationContext = recentQueries.data
      ?.map(q => `Previous Q: ${q.queryText}\nPrevious A: ${q.responseText?.slice(0, 200)}`)
      .join('\n\n') || '';

    // Count ready documents in KB for query classification
    let documentCount = 1;
    if (!params.documentId && workbaseId) {
      const { count } = await supabase
        .from('rag_documents')
        .select('id', { count: 'exact', head: true })
        .eq('workbase_id', workbaseId)
        .eq('status', 'ready');
      documentCount = count || 1;
    }

    // Classify query (only meaningful for KB-wide queries with 2+ documents)
    const classification = (!params.documentId && documentCount > 1)
      ? await classifyQuery({ queryText: params.queryText, documentCount })
      : { type: 'simple' as const };

    console.log(`[RAG Retrieval] Query classification: ${classification.type}${classification.subQueries ? ` (${classification.subQueries.length} sub-queries)` : ''}`);

    // Branch: Multi-hop or comparative query handling (returns early on success)
    if (classification.type !== 'simple' && classification.subQueries?.length) {
      console.log(`[RAG Retrieval] Running ${classification.subQueries.length} sub-queries for ${classification.type} query`);

      // Fetch document names for multi-hop context assembly (own fetch — documentNames not yet defined)
      const multiHopDocNames = new Map<string, string>();
      if (workbaseId) {
        const { data: kbDocs } = await supabase
          .from('rag_documents')
          .select('id, file_name')
          .eq('workbase_id', workbaseId)
          .eq('status', 'ready');
        if (kbDocs) {
          for (const d of kbDocs) {
            multiHopDocNames.set(d.id, d.file_name || d.id);
          }
        }
      }

      // Run sub-queries in parallel (each gets its own HyDE)
      const subResults = await Promise.all(
        classification.subQueries.map(async (subQuery) => {
          const subHydeText = documentSummary
            ? await generateHyDE({ queryText: subQuery, documentSummary })
            : undefined;
          return retrieveContext({
            queryText: subQuery,
            workbaseId,
            runId: params.runId,
            hydeText: subHydeText,
          });
        })
      );

      // Merge and deduplicate all sub-query results
      const mhAllSections = subResults.flatMap(r => r.sections);
      const mhAllFacts = subResults.flatMap(r => r.facts);
      const mhDedupedSections = deduplicateResults(mhAllSections, (s) => s.originalText);
      const mhDedupedFacts = deduplicateResults(mhAllFacts, (f) => f.content);
      const mhBalancedSections = balanceMultiDocCoverage(mhDedupedSections);
      const mhBalancedFacts = balanceMultiDocCoverage(mhDedupedFacts);

      if (mhBalancedSections.length > 0 || mhBalancedFacts.length > 0) {
        // Assemble structured multi-hop context — apply LoRA token budget when in rag_and_lora mode
        const multiHopTokenBudget = (mode === 'rag_and_lora') ? RAG_CONFIG.retrieval.loraMaxContextTokens : undefined;
        const multiHopContext = assembleMultiHopContext({
          originalQuery: params.queryText,
          subQueries: classification.subQueries,
          sections: mhBalancedSections,
          facts: mhBalancedFacts,
          documentNames: multiHopDocNames,
          maxTokens: multiHopTokenBudget,
        });

        // Generate response — branch on mode (LoRA vs Claude)
        let mhResponseText: string;
        let mhCitations: RAGCitation[];
        let mhEffectiveContext: string = multiHopContext;  // Fix A: track what LoRA actually saw

        if (mode === 'rag_and_lora' && params.modelJobId) {
          // LoRA + RAG: Send multi-hop context to LoRA endpoint
          const loraResult = await generateLoRAResponse({
            queryText: params.queryText,
            assembledContext: multiHopContext,
            mode,
            jobId: params.modelJobId,
            userId: params.userId,
          });
          mhResponseText = loraResult.responseText;
          mhCitations = loraResult.citations;
          // Fix A: Use the post-truncation context the LoRA actually saw for self-eval
          if (loraResult.effectiveContext) {
            mhEffectiveContext = loraResult.effectiveContext;
          }
        } else {
          // RAG Only: Use Claude
          const claudeResult = await generateResponse({
            queryText: params.queryText,
            assembledContext: multiHopContext,
            mode,
            conversationContext,
          });
          mhResponseText = claudeResult.responseText;
          mhCitations = claudeResult.citations;
        }

        // Enrich citations with document provenance
        const enrichedCitations = enrichCitationsWithDocumentInfo(
          mhCitations,
          mhBalancedSections,
          multiHopDocNames
        );

        // Self-eval — use effectiveContext (what LoRA actually saw) not full multiHopContext
        const mhSelfEval = await selfEvaluate({
          queryText: params.queryText,
          assembledContext: mhEffectiveContext,
          responseText: mhResponseText,
          mode,  // Fix B: mode-aware self-eval prompt
        });

        // Store query
        const mhResponseTimeMs = Date.now() - startTime;
        const { data: mhQueryRow, error: mhInsertErr } = await supabase
          .from('rag_queries')
          .insert({
            workbase_id: workbaseId || null,
            document_id: params.documentId || null,
            user_id: params.userId,
            query_text: params.queryText,
            hyde_text: null,
            mode,
            retrieved_section_ids: mhBalancedSections.map(s => s.id),
            retrieved_fact_ids: mhBalancedFacts.map(f => f.id),
            assembled_context: multiHopContext.slice(0, 50000),
            response_text: mhResponseText,
            citations: enrichedCitations,
            self_eval_passed: mhSelfEval.passed,
            self_eval_score: mhSelfEval.score,
            response_time_ms: mhResponseTimeMs,
            query_scope: queryScope,
          })
          .select('*')
          .single();

        if (!mhInsertErr && mhQueryRow) {
          console.log(`[RAG Retrieval] Multi-hop query complete in ${mhResponseTimeMs}ms`);
          return { success: true, data: mapRowToQuery(mhQueryRow) };
        }
      } else {
        console.warn('[RAG Retrieval] Multi-hop sub-queries returned no results — falling back to standard retrieval');
      }
    }

    // Step 2: Generate HyDE hypothetical answer (with conversation context)
    let hydeText: string | undefined;
    if (documentSummary) {
      const hydeInput = conversationContext
        ? `${params.queryText}\n\nConversation context:\n${conversationContext}`
        : params.queryText;
      hydeText = await generateHyDE({
        queryText: hydeInput,
        documentSummary,
      });
    }

    // Step 3: Multi-tier retrieval (KB-wide hybrid search)
    const retrieved = await retrieveContext({
      queryText: params.queryText,
      documentId: params.documentId || undefined,
      workbaseId: !params.documentId ? workbaseId : undefined,
      runId: params.runId,
      hydeText,
    });

    if (retrieved.sections.length === 0 && retrieved.facts.length === 0) {
      // No relevant context found
      const noContextMessage = mode === 'rag_and_lora'
        ? 'No relevant context was found in the knowledge base. The LoRA model cannot generate a grounded answer without context.'
        : 'I could not find relevant information in the knowledge base to answer this question.';

      const { data: queryRow, error: insertError } = await supabase
        .from('rag_queries')
        .insert({
          workbase_id: workbaseId || null,
          document_id: params.documentId || null,
          user_id: params.userId,
          query_text: params.queryText,
          hyde_text: hydeText || null,
          mode,
          retrieved_section_ids: [],
          retrieved_fact_ids: [],
          assembled_context: '',
          response_text: noContextMessage,
          citations: [],
          self_eval_passed: false,
          self_eval_score: 0,
          response_time_ms: Date.now() - startTime,
          query_scope: queryScope,
        })
        .select('*')
        .single();

      if (insertError) {
        return { success: false, error: 'Failed to log query' };
      }

      return { success: true, data: mapRowToQuery(queryRow) };
    }

    // Resolve document names — needed for section/fact reranking and context assembly
    const documentNames = new Map<string, string>();
    if (!params.documentId && workbaseId) {
      const { data: docs } = await supabase
        .from('rag_documents')
        .select('id, file_name')
        .eq('workbase_id', workbaseId)
        .eq('status', 'ready');

      if (docs) {
        for (const doc of docs) {
          documentNames.set(doc.id, doc.file_name || doc.id);
        }
      }
    }

    // Step 4: Dedup → Balance → Rerank (sections and facts)

    // Dedup: remove near-identical content (>90% Jaccard overlap)
    const dedupedSections = deduplicateResults(retrieved.sections, (s) => s.originalText);
    const dedupedFacts    = deduplicateResults(retrieved.facts,    (f) => f.content);

    // Balance: cap single-document dominance for KB-wide queries
    const balancedSections = !params.documentId
      ? balanceMultiDocCoverage(dedupedSections)
      : dedupedSections;
    const balancedFacts = !params.documentId
      ? balanceMultiDocCoverage(dedupedFacts)
      : dedupedFacts;

    // Rerank sections (Claude Haiku) — only if >3, passes documentNames for [Doc:] prefix
    const finalSections = balancedSections.length > 3
      ? await rerankSections(balancedSections, params.queryText, documentNames)
      : balancedSections;

    // Rerank facts (Claude Haiku) — only if >3, passes documentName for [Doc:] prefix
    let finalFacts = balancedFacts;
    if (balancedFacts.length > 3) {
      const reranked = await rerankWithClaude({
        queryText: params.queryText,
        candidates: balancedFacts.map(f => ({
          id: f.id,
          content: f.content,
          similarity: f.similarity,
          documentName: documentNames.get(f.documentId) || undefined,
        })),
        topK: Math.min(balancedFacts.length, 15),
      });
      const rerankedFactMap = new Map(reranked.map(r => [r.id, r.relevanceScore]));
      finalFacts = balancedFacts
        .filter(f => rerankedFactMap.has(f.id))
        .sort((a, b) => (rerankedFactMap.get(b.id) || 0) - (rerankedFactMap.get(a.id) || 0));
    }

    // Step 5: Assemble context
    const { context: _assembledContext, tokenCount, truncated } = assembleContext({
      sections: finalSections,
      facts: finalFacts,
      documentSummary,
      documentNames,
    });
    let assembledContext = _assembledContext;

    if (truncated) {
      console.warn(`[RAG Retrieval] Context truncated to ${tokenCount} tokens for query "${params.queryText.slice(0, 50)}..."`);
    }

    // Step 5: Generate response — Branch on mode
    let responseText: string;
    let citations: RAGCitation[];

    if (mode === 'rag_and_lora') {
      // RAG + LoRA: Send assembled context to LoRA endpoint
      const loraResult = await generateLoRAResponse({
        queryText: params.queryText,
        assembledContext,
        mode,
        jobId: params.modelJobId!,
        userId: params.userId,
      });
      responseText = loraResult.responseText;
      citations = loraResult.citations;
      // Fix A: Override assembledContext with what LoRA actually saw for self-eval
      if (loraResult.effectiveContext) {
        assembledContext = loraResult.effectiveContext;
      }
    } else {
      // RAG Only: Use Claude (existing behavior)
      const claudeResult = await generateResponse({
        queryText: params.queryText,
        assembledContext,
        mode,
        conversationContext,
      });
      responseText = claudeResult.responseText;
      citations = claudeResult.citations;
    }

    // Enrich citations with document provenance (adds documentId + documentName)
    citations = enrichCitationsWithDocumentInfo(citations, finalSections, documentNames);

    // Step 6: Self-RAG evaluation (always uses Claude, regardless of response generator)
    const selfEval = await selfEvaluate({
      queryText: params.queryText,
      responseText,
      assembledContext,
      mode,  // Fix B: mode-aware self-eval prompt
    });

    // Step 7: Store query and results
    const responseTimeMs = Date.now() - startTime;

    const { data: queryRow, error: insertError } = await supabase
      .from('rag_queries')
      .insert({
        workbase_id: workbaseId || null,
        document_id: params.documentId || null,
        user_id: params.userId,
        query_text: params.queryText,
        hyde_text: hydeText || null,
        mode,
        retrieved_section_ids: retrieved.sectionIds,
        retrieved_fact_ids: retrieved.factIds,
        assembled_context: assembledContext,
        response_text: responseText,
        citations,
        self_eval_passed: selfEval.passed,
        self_eval_score: selfEval.score,
        response_time_ms: responseTimeMs,
        query_scope: queryScope,
      })
      .select('*')
      .single();

    // When self-eval score is low, add a low-confidence prefix for the UI response only.
    // The clean responseText is already stored in rag_queries — do NOT overwrite it
    // with the prefix so that DB records remain clean and re-queryable.
    let finalResponseText = responseText;
    if (selfEval && selfEval.score < 0.5) {
      finalResponseText = `I couldn't find a confident answer to "${params.queryText}" in the knowledge base.\n\nHere's what I found (low confidence):\n${responseText}\n\nSuggestions to improve results:\n- Try more specific terms from the document\n- Ask about a specific policy or section by name\n- Rephrase using terminology from the document`;
      // Note: finalResponseText is returned to the UI caller but NOT written back to the DB,
      // keeping rag_queries.response_text as the clean factual answer.
    }

    if (insertError) {
      console.error('[RAG Retrieval] Error storing query:', insertError);
      return { success: false, error: 'Failed to store query results' };
    }

    console.log(`[RAG Retrieval] Query complete in ${responseTimeMs}ms, mode=${mode}, self-eval: ${selfEval.score.toFixed(2)} (${selfEval.passed ? 'PASS' : 'FAIL'})`);

    // Return the mapped query with the UI-facing responseText (may include low-confidence prefix).
    // The DB record (queryRow) always stores the clean factual answer without the prefix.
    const mappedQuery = mapRowToQuery(queryRow);
    return { success: true, data: { ...mappedQuery, responseText: finalResponseText } };
  } catch (err) {
    console.error('[RAG Retrieval] Exception in queryRAG:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Query failed' };
  }
}

// ============================================
// Get Query History
// ============================================

export async function getQueryHistory(params: {
  documentId?: string;
  workbaseId?: string;
  userId: string;
  limit?: number;
}): Promise<{ success: boolean; data?: RAGQuery[]; error?: string }> {
  try {
    const supabase = createServerSupabaseAdminClient();
    let query = supabase
      .from('rag_queries')
      .select('*')
      .eq('user_id', params.userId)
      .order('created_at', { ascending: false })
      .limit(params.limit || 50);

    if (params.documentId) {
      query = query.eq('document_id', params.documentId);
    }
    if (params.workbaseId) {
      query = query.eq('workbase_id', params.workbaseId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching query history:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: (data || []).map(mapRowToQuery) };
  } catch (err) {
    console.error('Exception fetching query history:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch query history' };
  }
}
