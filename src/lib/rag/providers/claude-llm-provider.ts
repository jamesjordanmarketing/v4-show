import Anthropic from '@anthropic-ai/sdk';
import type {
  DocumentUnderstanding,
  KnowledgeRefinement,
  ContextualPreambleResult,
  HyDEResult,
  SelfEvalResult,
  QualityEvaluation,
  RAGExpertQuestion,
  RAGSection,
  RAGCitation,
  // Multi-pass extraction types (Phase 1)
  StructureAnalysisResult,
  PolicyExtractionResult,
  TableExtractionResult,
  GlossaryExtractionResult,
  NarrativeExtractionResult,
  VerificationResult,
  FactExtraction,
  RAGDocumentType,
} from '@/types/rag';
import type { LLMProvider } from './llm-provider';
import { RAG_CONFIG } from '../config';

// ============================================
// Claude LLM Provider Implementation
// ============================================
// Pattern Source: src/lib/services/claude-api-client.ts

/**
 * Safely parse JSON from Claude responses, stripping markdown code fences if present.
 * Claude sometimes wraps JSON in ```json ... ``` despite being told not to.
 * This uses a robust approach: find the first { or [ and the last } or ] to extract JSON.
 * 
 * If parsing fails, the raw response is logged to help with debugging.
 */
function parseJsonResponse<T>(text: string, context?: string): T {
  const originalText = text;
  let cleaned = text.trim();

  // Try direct parse first (fast path)
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Direct parse failed — expected when Claude wraps JSON in ```json fences.
    // Fallback to brace/bracket boundary extraction below.
    // No logging here to avoid noise; failure is logged if the fallback also fails.
  }

  // Extract JSON by finding the first opening brace/bracket and last closing brace/bracket
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  const lastBrace = cleaned.lastIndexOf('}');
  const lastBracket = cleaned.lastIndexOf(']');

  let start = -1;
  let end = -1;

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    if (firstBracket >= 0 && firstBracket < firstBrace) {
      // Array starts before object
      start = firstBracket;
      end = lastBracket;
    } else {
      start = firstBrace;
      end = lastBrace;
    }
  } else if (firstBracket >= 0 && lastBracket > firstBracket) {
    start = firstBracket;
    end = lastBracket;
  }

  if (start >= 0 && end > start) {
    cleaned = cleaned.substring(start, end + 1);
  }

  // Final parse attempt with detailed error logging
  try {
    return JSON.parse(cleaned) as T;
  } catch (finalError) {
    // Log comprehensive diagnostic information
    console.error(`[parseJsonResponse] FAILED TO PARSE JSON (${context || 'unknown context'})`);
    console.error('Error:', finalError instanceof Error ? finalError.message : String(finalError));
    console.error('Original response length:', originalText.length);
    console.error('Cleaned response length:', cleaned.length);
    console.error('First 500 chars of original:', originalText.slice(0, 500));
    console.error('Last 500 chars of original:', originalText.slice(-500));
    console.error('First 500 chars of cleaned:', cleaned.slice(0, 500));
    console.error('Last 500 chars of cleaned:', cleaned.slice(-500));

    // Store the full response for later analysis (truncate to reasonable size)
    const truncatedResponse = originalText.length > 50000
      ? originalText.slice(0, 25000) + '\n\n[... TRUNCATED ...]\n\n' + originalText.slice(-25000)
      : originalText;
    console.error('FULL RESPONSE FOR DEBUGGING:', truncatedResponse);

    throw new Error(
      `Failed to parse JSON response from Claude (${context || 'unknown'}). ` +
      `Error: ${finalError instanceof Error ? finalError.message : String(finalError)}. ` +
      `Response length: ${originalText.length} chars. ` +
      `Check logs for full response content.`
    );
  }
}


export class ClaudeLLMProvider implements LLMProvider {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      // Set 20-minute timeout for large document processing with high max_tokens
      // Default is 10 minutes, but 32K tokens on large docs can take longer
      timeout: 20 * 60 * 1000, // 20 minutes in milliseconds
    });
  }

  async readDocument(params: {
    documentText: string;
    fileName: string;
    description?: string;
  }): Promise<DocumentUnderstanding> {
    const { documentText, fileName, description } = params;

    const systemPrompt = `You are a document analysis expert. You will read an entire document and produce a structured understanding of its contents.

CRITICAL REQUIREMENTS:
1. Output ONLY valid, well-formed JSON - no markdown code fences, no explanations, no preamble
2. The JSON MUST be syntactically correct - all arrays and objects must be properly closed
3. All strings must have properly escaped quotes and special characters
4. If you approach token limits, prioritize completing the JSON structure properly over including all content
5. Better to have fewer, complete sections than many truncated ones

Your output must match the specified schema exactly.`;

    const userPrompt = `Read the following document and produce a structured understanding. Focus on quality over quantity - it's better to extract fewer high-quality items than many low-quality ones.

Document Name: ${fileName}
${description ? `Description: ${description}` : ''}

<document>
${documentText}
</document>

Produce a JSON object with exactly these fields:
{
  "summary": "A comprehensive 300-500 word summary of the document's main points and purpose",
  "sections": [
    {
      "title": "Section title",
      "originalText": "The full original text of this section",
      "summary": "A 2-3 sentence summary of this section",
      "tokenCount": 0
    }
  ],
  "entities": [
    {
      "name": "Entity name",
      "type": "person|organization|concept|process|product|location|other",
      "description": "1-2 sentence description"
    }
  ],
  "facts": [
    {
      "factType": "fact|entity|definition|relationship|table_row|policy_exception|policy_rule",
      "content": "The atomic factual statement",
      "sourceText": "Brief excerpt showing source",
      "confidence": 0.95
    }
  ],
  "topicTaxonomy": ["Topic 1", "Topic 2", "Subtopic 2a"],
  "ambiguities": ["Brief description of ambiguity"],
  "expertQuestions": [
    {
      "questionText": "The question to ask the domain expert",
      "questionReason": "Why this matters",
      "impactLevel": "high|medium|low"
    }
  ]
}

CRITICAL EXTRACTION GUIDELINES:
- Sections: Extract 5-15 major sections (chapters, main headings) - do NOT extract every paragraph
- Entities: Extract 10-30 key entities only
- Facts: Extract 50-150 facts (increased to capture tables and exceptions)
  * SPECIAL: For tables, extract EACH ROW as a separate fact
  * SPECIAL: For exception clauses (E1, E2, etc.), extract EACH as a separate fact
  * SPECIAL: For policy rules (R1, R2, etc.), extract EACH as a separate fact
- Expert questions: Generate exactly 5 questions (high impact only)
- Topic taxonomy: 3-8 topics maximum
- Ambiguities: 3-10 items maximum

TABLE HANDLING:
When you encounter a table (markdown tables with | delimiters, or structured lists):
1. Keep the table in the section's originalText (preserve structure)
2. ALSO extract each meaningful row as a separate fact with:
   - factType: "table_row"
   - content: "Column1: value1, Column2: value2, Column3: value3" (combine all columns into one descriptive string)
   - sourceText: "From table: [Table Name or Section Title]"
   - confidence: 0.95

Example table:
| Age Group | Literacy Focus | Key Activities |
| Ages 16-22 | Practical Application | Credit management; tax filing |

Should be extracted as a fact:
{
  "factType": "table_row",
  "content": "Age Group: Ages 16-22, Literacy Focus: Practical Application, Key Activities: Credit management; tax filing basics; managing larger allowances",
  "sourceText": "From Human Capital Competency Framework table in Section 7",
  "confidence": 0.95
}

EXCEPTION AND RULE HANDLING:
When you encounter policy exceptions (E1:, E2:, Exception 1:, etc.) or rules (R1:, R2:, Rule 1:, etc.):
1. Extract each as a separate fact with:
   - factType: "policy_exception" (for exceptions) or "policy_rule" (for rules)
   - content: The complete text of the exception/rule with all details
   - sourceText: "From [Section/Policy ID]: [Exception/Rule identifier]"
   - confidence: 0.95

Example exception:
* E1: "High Liquidity Offset": DTI may be expanded to 45% if the client holds 60+ months of PITI reserves.

Should be extracted as a fact:
{
  "factType": "policy_exception",
  "content": "High Liquidity Offset: DTI may be expanded to 45% if the client holds 60+ months of PITI reserves at Sun Chip",
  "sourceText": "From BC-PROD-004 (Jumbo Mortgage Program): Exception E1",
  "confidence": 0.95
}

IMPORTANT: 
1. You MUST complete the JSON structure properly - all arrays and objects closed
2. With increased fact extraction (50-150), prioritize tables, exceptions, and rules first
3. Extract general facts only after capturing all structured data (tables, exceptions, rules)
4. If document is very large, prioritize breadth over depth
5. Table rows and exceptions are CRITICAL - never skip these even if approaching token limits`;

    console.log(`[readDocument] Starting Claude API call...`, {
      fileName,
      docLength: documentText.length,
      model: RAG_CONFIG.llm.model,
      maxTokens: RAG_CONFIG.llm.maxTokens.default,
    });

    const startTime = Date.now();

    // No timeout - Inngest has unlimited execution time
    // Let Claude take as long as it needs for complex documents with enhanced prompts
    let response;
    try {
      response = await this.client.messages.create({
        model: RAG_CONFIG.llm.model,
        max_tokens: RAG_CONFIG.llm.maxTokens.default,
        temperature: RAG_CONFIG.llm.temperature,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });
    } catch (error: any) {
      throw error;
    }

    // Check if response was truncated due to token limit
    if (response.stop_reason === 'max_tokens') {
      console.warn(
        `[readDocument] Claude hit max_tokens limit (${RAG_CONFIG.llm.maxTokens.default}). ` +
        `Response may be truncated. Consider increasing maxTokens in config.`
      );
      // Don't throw - attempt to parse whatever we got, JSON parser will handle errors
    }

    const elapsedMs = Date.now() - startTime;
    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Log response metadata for debugging
    console.log(`[readDocument] Claude response received:`, {
      fileName,
      responseLength: text.length,
      elapsedMs,
      model: RAG_CONFIG.llm.model,
      maxTokens: RAG_CONFIG.llm.maxTokens.default,
      stopReason: response.stop_reason,
      usage: response.usage
    });

    // Check if response was truncated due to max_tokens
    if (response.stop_reason === 'max_tokens') {
      console.warn(`[readDocument] WARNING: Claude response was truncated due to max_tokens limit!`);
      console.warn(`  - Input tokens: ${response.usage.input_tokens}`);
      console.warn(`  - Output tokens: ${response.usage.output_tokens}`);
      console.warn(`  - Max tokens configured: ${RAG_CONFIG.llm.maxTokens.default}`);
      console.warn(`  - Response length: ${text.length} chars`);
      console.warn(`  - This may cause JSON parsing errors. Consider increasing maxTokens in config.`);
    }

    return parseJsonResponse<DocumentUnderstanding>(text, 'readDocument');
  }

  async generateContextualPreamble(params: {
    documentSummary: string;
    sectionText: string;
    sectionTitle?: string;
  }): Promise<ContextualPreambleResult> {
    const { documentSummary, sectionText, sectionTitle } = params;

    const response = await this.client.messages.create({
      model: RAG_CONFIG.llm.model,
      max_tokens: 300,
      temperature: 0,
      system: 'You generate contextual preambles for document sections. Output ONLY the preamble text (1-2 sentences). No JSON, no explanation.',
      messages: [{
        role: 'user',
        content: `Document summary: ${documentSummary}\n\nSection${sectionTitle ? ` "${sectionTitle}"` : ''}:\n${sectionText.slice(0, 2000)}\n\nWrite a 1-2 sentence contextual preamble that explains what this section is about within the larger document. The preamble should help a search system understand the context of this section.`,
      }],
    });

    const preamble = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    return { sectionId: '', preamble };
  }

  async refineKnowledge(params: {
    documentText: string;
    currentSummary: string;
    questions: RAGExpertQuestion[];
    sections: RAGSection[];
  }): Promise<KnowledgeRefinement> {
    const { documentText, currentSummary, questions, sections } = params;

    const answeredQuestions = questions
      .filter(q => q.answerText && !q.skipped)
      .map(q => `Q: ${q.questionText}\nA: ${q.answerText}`)
      .join('\n\n');

    const sectionList = sections.map((s, i) =>
      `Section ${i}: ${s.title || 'Untitled'}\nSummary: ${s.summary || 'No summary'}`
    ).join('\n\n');

    const response = await this.client.messages.create({
      model: RAG_CONFIG.llm.model,
      max_tokens: RAG_CONFIG.llm.maxTokens.default,
      temperature: 0,
      system: 'You refine document knowledge based on expert answers. Output valid JSON only.',
      messages: [{
        role: 'user',
        content: `Original document summary: ${currentSummary}

Current sections:
${sectionList}

Expert Q&A:
${answeredQuestions}

Based on the expert answers, produce a JSON object:
{
  "updatedSections": [{"sectionIndex": 0, "updatedSummary": "..."}],
  "updatedEntities": [{"name": "...", "type": "...", "description": "..."}],
  "updatedFacts": [{"factType": "fact", "content": "...", "sourceText": "Expert answer", "confidence": 1.0}],
  "refinementNotes": "Summary of what was refined"
}

Only include sections whose summaries need updating based on the expert answers. Add new entities and facts revealed by the expert answers.`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return parseJsonResponse<KnowledgeRefinement>(text, 'refineKnowledge');
  }

  async generateHyDE(params: {
    queryText: string;
    documentSummary: string;
  }): Promise<HyDEResult> {
    const { queryText, documentSummary } = params;

    const response = await this.client.messages.create({
      model: RAG_CONFIG.llm.model,
      max_tokens: 500,
      temperature: 0,
      system: 'Generate a hypothetical answer paragraph. Output ONLY the answer text. No preamble.',
      messages: [{
        role: 'user',
        content: `Document context: ${documentSummary}\n\nQuestion: ${queryText}\n\nWrite a detailed paragraph that would answer this question based on a document like the one described. Use formal language matching how the document likely discusses this topic.`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    return { hypotheticalAnswer: text };
  }

  async selfEvaluate(params: {
    queryText: string;
    retrievedContext: string;
    responseText: string;
    mode?: string;
  }): Promise<SelfEvalResult> {
    const { queryText, retrievedContext, responseText, mode } = params;
    const isLoRAMode = mode === 'rag_and_lora' || mode === 'lora_only';

    // Extract document names from context for format-agnostic detection
    const docNameMatches = retrievedContext.match(/###?\s*From:\s*(.+)/g) || [];
    const docNames = docNameMatches.map(m => m.replace(/###?\s*From:\s*/, '').trim());
    const uniqueDocNames = Array.from(new Set(docNames));

    const loraAdjustment = isLoRAMode ? `

IMPORTANT — LoRA MODEL RESPONSE ADJUSTMENT:
The response being evaluated was generated by a fine-tuned LoRA model, NOT by Claude.
LoRA models produce conversational, personality-infused responses. Adjust your evaluation accordingly:
- Do NOT require "## From:" headers or structured per-document sections. Instead, check if the response MENTIONS each document's institution BY NAME (e.g., "${uniqueDocNames.join('", "')}").
- Do NOT penalize conversational tone, empathetic language, or first-person address ("I", "we", "our").
- Do NOT flag reasonable inferences as hallucinations IF the inference is consistent with the context direction (e.g., if context discusses traditional asset custody only, inferring "we don't custody crypto" is reasonable — not a hallucination).
- DO flag claims that directly CONTRADICT specific facts in the context (e.g., wrong numbers, reversed policies, attributed to wrong institution).
- The LoRA may have been shown a TRUNCATED version of the context below. If the response omits information that appears in the context, consider whether the LoRA may not have seen those sections before penalizing for incompleteness.` : '';

    const multiDocCheck = uniqueDocNames.length > 1 ? `
4. **MULTI-DOCUMENT COMPLETENESS CHECK**: The retrieved context contains information from ${uniqueDocNames.length} documents: ${uniqueDocNames.map(n => `"${n}"`).join(', ')}.
   a. Does the response address information from ALL documents present in the context?
   b. If different documents provide different answers, does the response present EACH document's answer?
   c. ${isLoRAMode
     ? 'Check for document coverage by looking for institution NAME mentions (not header format). If the response mentions all institutions by name and addresses their policies, that counts as complete multi-document coverage.'
     : 'A response that only addresses ONE document when the context contains relevant information from MULTIPLE documents is INCOMPLETE and should score LOW (0.3-0.5) even if the single-document answer is factually correct.'
   }
   d. Count distinct document/institution references in the response — if fewer than ${uniqueDocNames.length} are addressed, deduct points proportionally.` : '';

    const scoringGuide = isLoRAMode ? `
Scoring (LoRA mode — accounts for conversational style and potential context truncation):
- 0.8-1.0: Factually grounded, addresses all documents, no contradictions with context
- 0.6-0.8: Mostly grounded, minor gaps or one document less thoroughly covered
- 0.4-0.6: Addresses some documents but misses key information from others, OR makes a factual error that doesn't contradict context (may be from training data)
- 0.2-0.4: Significant factual errors that directly contradict the context, OR only addresses one document
- 0.0-0.2: Multiple direct contradictions with specific facts in the context` : `
Scoring:
- 0.8-1.0: Well-grounded AND addresses all documents in context
- 0.5-0.7: Factually correct but incomplete (missing one or more document perspectives)
- 0.3-0.5: Only addresses a single document when multiple are present with different relevant information
- 0.0-0.3: Hallucination or contradiction`;

    const response = await this.client.messages.create({
      model: RAG_CONFIG.llm.model,
      max_tokens: 800,
      temperature: 0,
      system: 'You are a RAG hallucination and completeness detector. Evaluate whether a generated response is factually grounded in the retrieved context AND whether it adequately addresses all source documents. Output valid JSON only.',
      messages: [{
        role: 'user',
        content: `Query: ${queryText}

Retrieved context:
${retrievedContext}

Generated response:
${responseText}

Evaluate the generated response against the retrieved context:
1. Does the response make claims NOT supported by the retrieved context? (hallucination)
2. Does the response accurately represent what the context says?
3. When information is not in the context, does the response appropriately say so?
${multiDocCheck}
${loraAdjustment}
${scoringGuide}
If the response honestly says "not found" or "not in document", that is correct behavior and should score HIGH.

{"passed": true/false, "score": 0.0-1.0, "reasoning": "brief explanation"}`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return parseJsonResponse<SelfEvalResult>(text, 'selfEvaluate');
  }

  /**
   * Lightweight Claude call for tasks that need a raw text response without RAG formatting.
   * Used for reranking and any other operation where generateResponse() would inject
   * the RAG citation template and break the expected output format.
   */
  async generateLightweightCompletion(params: {
    systemPrompt: string;
    userMessage: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<{ responseText: string }> {
    const response = await this.client.messages.create({
      model: RAG_CONFIG.llm.model,
      max_tokens: params.maxTokens ?? 200,
      temperature: params.temperature ?? 0,
      system: params.systemPrompt,
      messages: [{ role: 'user', content: params.userMessage }],
    });

    const responseText = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('');

    return { responseText };
  }

  async generateResponse(params: {
    queryText: string;
    assembledContext: string;
    systemPrompt: string;
  }): Promise<{ responseText: string; citations: RAGCitation[] }> {
    const { queryText, assembledContext, systemPrompt } = params;

    const response = await this.client.messages.create({
      model: RAG_CONFIG.llm.model,
      max_tokens: RAG_CONFIG.llm.maxTokens.default,
      temperature: 0.3,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `Context from knowledge base:\n${assembledContext}\n\n---\n\nUser question: ${queryText}\n\nProvide a comprehensive answer based on the context above. Include specific citations by referencing section titles. Output JSON:\n{"responseText": "...", "citations": [{"sectionId": "", "sectionTitle": "...", "excerpt": "...", "relevanceScore": 0.9}]}`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return parseJsonResponse<{ responseText: string; citations: RAGCitation[] }>(text, 'generateResponse');
  }

  async evaluateQuality(params: {
    queryText: string;
    retrievedContext: string;
    responseText: string;
    citations: RAGCitation[];
  }): Promise<QualityEvaluation> {
    const { queryText, retrievedContext, responseText, citations } = params;

    const response = await this.client.messages.create({
      model: RAG_CONFIG.llm.model,
      max_tokens: 500,
      temperature: 0,
      system: 'You are a RAG quality evaluator. Score each dimension 0.0-1.0. Output valid JSON only.',
      messages: [{
        role: 'user',
        content: `Query: ${queryText}\n\nRetrieved Context:\n${retrievedContext.slice(0, 3000)}\n\nGenerated Response:\n${responseText}\n\nCitations: ${JSON.stringify(citations)}\n\nEvaluate:\n{"faithfulness": 0.0-1.0, "answerRelevance": 0.0-1.0, "contextRelevance": 0.0-1.0, "answerCompleteness": 0.0-1.0, "citationAccuracy": 0.0-1.0, "composite": 0.0-1.0, "details": {"reasoning": "..."}}`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return parseJsonResponse<QualityEvaluation>(text, 'evaluateQuality');
  }

  async generateVerificationQuestions(params: {
    documentSummary: string;
    sections: RAGSection[];
    count: number;
  }): Promise<string[]> {
    const { documentSummary, sections, count } = params;

    const sectionTitles = sections.map(s => s.title || 'Untitled').join(', ');

    const response = await this.client.messages.create({
      model: RAG_CONFIG.llm.model,
      max_tokens: 500,
      temperature: 0.3,
      system: 'Generate verification questions. Output a JSON array of strings only.',
      messages: [{
        role: 'user',
        content: `Document summary: ${documentSummary}\nSections: ${sectionTitles}\n\nGenerate ${count} diverse questions that test whether the system understands this document well. Mix factual, contextual, and multi-section questions. Output: ["question1", "question2", ...]`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return parseJsonResponse<string[]>(text, 'generateVerificationQuestions');
  }

  // ============================================
  // Multi-Pass Extraction Methods (Phase 1)
  // ============================================

  async analyzeDocumentStructure(params: {
    documentText: string;
    fileName: string;
  }): Promise<StructureAnalysisResult> {
    const { documentText, fileName } = params;

    const systemPrompt = `You are a document structure analyst. You will analyze a document and produce a structural map. Output ONLY valid JSON. No markdown code fences.`;

    const userPrompt = `Analyze the structure of the following document and produce a JSON structural map.

Document: ${fileName}

<document>
${documentText}
</document>

Produce a JSON object with exactly these fields:
{
  "summary": "300-500 word comprehensive summary of the document",
  "documentType": "structured-policy | tabular | narrative | mixed",
  "sections": [
    {
      "title": "Section title as it appears in the document",
      "startLine": 1,
      "endLine": 50,
      "summary": "2-3 sentence summary of this section",
      "policyId": "BC-ELIG-001 or null if no policy ID",
      "isNarrative": false
    }
  ],
  "tables": [
    {
      "startLine": 100,
      "endLine": 115,
      "nearestSection": "Section title this table belongs to"
    }
  ],
  "topicTaxonomy": ["Topic 1", "Topic 2"],
  "ambiguities": ["Description of ambiguity"],
  "expertQuestions": [
    {
      "questionText": "The question",
      "questionReason": "Why it matters",
      "impactLevel": "high | medium | low"
    }
  ]
}

DOCUMENT TYPE CLASSIFICATION RULES:
- "structured-policy": Document has numbered rules (R1, R2), exception blocks (E1, E2), policy IDs (BC-PROD-004), formal section hierarchy
- "tabular": >50% of content is in markdown tables or structured lists, few narrative paragraphs
- "narrative": Predominantly prose paragraphs, minimal numbered rules or tables
- "mixed": Combination of structured sections AND narrative sections AND/OR tables

SECTION IDENTIFICATION RULES:
- Extract 5-20 major sections (chapters, main headings)
- For each section, identify its startLine and endLine (1-indexed line numbers)
- Set policyId if the section header contains a policy identifier (e.g., "BC-ELIG-001")
- Set isNarrative=true for sections that are primarily prose without labeled rules

TABLE IDENTIFICATION:
- List every markdown table (lines with | delimiters) with its line range
- Associate each table with the nearest section

EXPERT QUESTIONS: Generate 3-5 high-impact questions only.

CRITICAL: Line numbers must be accurate. Use 1-indexed line numbers matching the document text.`;

    const response = await this.client.messages.create({
      model: RAG_CONFIG.llm.ingestionModels.structureAnalysis,
      max_tokens: RAG_CONFIG.llm.maxTokens.structureAnalysis,
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return parseJsonResponse<StructureAnalysisResult>(text, 'analyzeDocumentStructure');
  }

  async extractPoliciesForSection(params: {
    sectionText: string;
    sectionTitle: string;
    policyId: string | null;
    documentType: RAGDocumentType;
  }): Promise<PolicyExtractionResult> {
    const { sectionText, sectionTitle, policyId, documentType } = params;

    // Document-type-specific extraction guidance
    let typeGuidance = '';
    if (documentType === 'narrative') {
      typeGuidance = `This is a NARRATIVE document. Instead of looking for labeled rules (R1, E1), look for:
- Implicit requirements, obligations, and prohibitions
- Statements about what someone "must", "cannot", "shall", or "is required to" do
- Conditions and limits expressed in prose
- Treat each such statement as a policy rule with a generated ruleId.`;
    } else if (documentType === 'tabular') {
      // Tabular documents skip Pass 2 entirely — return empty
      return {
        policyId: policyId || 'UNKNOWN',
        rules: [], exceptions: [], limits: [], requiredDocuments: [],
        escalations: [], auditFields: [], relatedPolicies: [], definitions: [],
      };
    } else {
      typeGuidance = `Extract all labeled rules (R1-R8), exceptions (E1-E2), and structured policy elements.`;
    }

    const systemPrompt = `You are a policy extraction specialist. Extract ALL policy elements from the section. Output ONLY valid JSON.`;

    const userPrompt = `Extract all policy elements from this section.

Section Title: ${sectionTitle}
Policy ID: ${policyId || 'Not specified'}

${typeGuidance}

<section>
${sectionText}
</section>

Produce a JSON object:
{
  "policyId": "${policyId || 'INFERRED_ID'}",
  "rules": [
    {
      "ruleId": "R1",
      "content": "Complete rule text including all conditions and amounts",
      "conditions": ["condition 1", "condition 2"],
      "amounts": ["$10,000", "43%"],
      "timeframes": ["24 hours", "30 days"]
    }
  ],
  "exceptions": [
    {
      "exceptionId": "E1",
      "content": "Complete exception text",
      "qualifiesRule": "R4",
      "conditions": ["condition for exception to apply"]
    }
  ],
  "limits": [
    { "name": "Max FDIC Coverage", "value": "100000000", "unit": "USD", "window": "per depositor" }
  ],
  "requiredDocuments": [
    { "scenario": "Account opening", "documents": ["Tax Returns (2 years)", "W-2s"] }
  ],
  "escalations": [
    { "trigger": "Wire > $10M", "levels": ["Relationship Manager", "Head of Treasury", "CEO"] }
  ],
  "auditFields": [
    { "fieldName": "wire_imad_omad", "description": "Fed reference number for wire tracking" }
  ],
  "relatedPolicies": [
    { "policyId": "BC-ELIG-004", "relationship": "Account Closure triggers this policy" }
  ],
  "definitions": [
    { "term": "Priority Window", "definition": "8:00 AM to 1:00 PM ET business days" }
  ]
}

EXTRACTION RULES:
1. Extract EVERY rule, exception, limit, threshold, required document, escalation path, and audit field
2. For each rule, extract ALL conditions, monetary amounts, and timeframes mentioned
3. For each exception, identify which rule it qualifies (qualifiesRule field)
4. Limits include: dollar amounts, percentages, time windows, count limits
5. Required documents: list by scenario (account opening, large wire, etc.)
6. Escalations: the approval chain (who must approve at each level)
7. Audit fields: any field names mentioned for audit/receipt/tracking purposes
8. Related policies: any cross-references to other policy IDs (BC-xxx-yyy)
9. Definitions: any terms defined within this section (not in glossary)
10. If NO items exist for a category, return an empty array — do NOT omit the key`;

    const response = await this.client.messages.create({
      model: RAG_CONFIG.llm.ingestionModels.policyExtraction,
      max_tokens: RAG_CONFIG.llm.maxTokens.policyExtraction,
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return parseJsonResponse<PolicyExtractionResult>(text, 'extractPoliciesForSection');
  }

  async extractTableData(params: {
    tableText: string;
    surroundingContext: string;
    documentType: RAGDocumentType;
  }): Promise<TableExtractionResult> {
    const { tableText, surroundingContext, documentType } = params;

    const systemPrompt = `You are a table data extraction specialist. Extract every row from the table as structured data. Output ONLY valid JSON.`;

    const userPrompt = `Extract all data from this table.

Context around the table:
${surroundingContext}

Table content:
${tableText}

Produce a JSON object:
{
  "tableName": "Descriptive name for this table",
  "tableContext": "Which section/policy this table belongs to",
  "columns": ["Column 1", "Column 2", "Column 3"],
  "rows": [
    { "Column 1": "value", "Column 2": "value", "Column 3": "value" }
  ]
}

RULES:
1. Extract EVERY row including header-like rows
2. Preserve exact values (numbers, percentages, dollar amounts)
3. If cells span multiple lines, combine them
4. For the tableName, use the table's caption or the nearest heading
5. tableContext should reference the section title or policy ID`;

    const response = await this.client.messages.create({
      model: RAG_CONFIG.llm.ingestionModels.tableExtraction,
      max_tokens: RAG_CONFIG.llm.maxTokens.tableExtraction,
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return parseJsonResponse<TableExtractionResult>(text, 'extractTableData');
  }

  async extractGlossaryAndRelationships(params: {
    documentText: string;
    existingSections: Array<{ title: string; policyId: string | null }>;
  }): Promise<GlossaryExtractionResult> {
    const { documentText, existingSections } = params;

    const sectionList = existingSections
      .map(s => `- ${s.title}${s.policyId ? ` (${s.policyId})` : ''}`)
      .join('\n');

    const systemPrompt = `You are a glossary and entity extraction specialist. Extract ALL defined terms, key entities, and cross-references. Output ONLY valid JSON.`;

    const userPrompt = `Extract all glossary terms, entities, and relationships from this document.

Known sections:
${sectionList}

<document>
${documentText}
</document>

Produce a JSON object:
{
  "definitions": [
    {
      "term": "Active Liquidity",
      "definition": "Cash and cash-equivalent assets immediately available for deployment",
      "policyContext": "Used in BC-ELIG-001 Minimum Balance requirements"
    }
  ],
  "entities": [
    {
      "name": "BCCC (Sun Chip Confirmation Ceremony)",
      "type": "process",
      "description": "Biometric verification ceremony required for high-value transactions"
    }
  ],
  "relationships": [
    {
      "from": "BC-ELIG-001",
      "to": "BC-ELIG-004",
      "type": "triggers",
      "description": "Falling below minimum balance triggers Account Closure policy"
    }
  ]
}

EXTRACTION RULES:
1. Definitions: Every term that is explicitly defined in the document (glossary section, inline definitions)
2. Entities: Named processes, systems, roles, organizations, standards referenced in the document
   - Types: person, organization, process, system, standard, role, concept
3. Relationships: Cross-references between policies, sections, or entities
   - Types: triggers, requires, overrides, extends, references, conflicts_with
4. Extract ALL items — do not skip any defined terms even if they seem minor
5. For definitions, include the policyContext showing where/how the term is used`;

    const response = await this.client.messages.create({
      model: RAG_CONFIG.llm.ingestionModels.glossaryExtraction,
      max_tokens: RAG_CONFIG.llm.maxTokens.glossaryExtraction,
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return parseJsonResponse<GlossaryExtractionResult>(text, 'extractGlossaryAndRelationships');
  }

  async extractNarrativeFacts(params: {
    sectionText: string;
    sectionTitle: string;
    documentType: RAGDocumentType;
  }): Promise<NarrativeExtractionResult> {
    const { sectionText, sectionTitle, documentType } = params;

    let typeGuidance = '';
    if (documentType === 'narrative') {
      typeGuidance = `This is the PRIMARY extraction pass for this narrative document. Extract ALL factual claims, requirements, conditions, definitions-in-context, temporal statements, and quantitative assertions.`;
    } else if (documentType === 'tabular') {
      typeGuidance = `Extract any introductory/explanatory text around tables (headers, footnotes, disclaimers). Usually very few narrative facts for tabular documents.`;
    } else {
      typeGuidance = `Extract facts from the narrative portions of this section that were NOT captured as labeled rules or table rows. Focus on: claims, conditions, qualifiers, implicit requirements.`;
    }

    const systemPrompt = `You are a narrative fact extraction specialist. Extract factual statements from unstructured text. Output ONLY valid JSON.`;

    const userPrompt = `Extract all narrative facts from this section.

Section: "${sectionTitle}"

${typeGuidance}

<section>
${sectionText}
</section>

Produce a JSON object:
{
  "facts": [
    {
      "factType": "narrative_fact",
      "content": "70% of wealth transfers fail due to lack of communication and heir preparation",
      "sourceText": "From the Great Wealth Transfer subsection",
      "confidence": 0.9,
      "factCategory": "statistic",
      "subsection": "Multi-Generational Wealth Stewardship"
    }
  ]
}

EXTRACTION RULES:
1. Each fact should be an atomic, self-contained statement
2. factType should be one of: narrative_fact, fact, entity, definition
3. factCategory: statistic, requirement, condition, process, recommendation, claim, qualification
4. subsection: the nearest sub-heading or topic within the section
5. confidence: 0.9 for explicit statements, 0.7-0.8 for inferred/implicit facts
6. Do NOT duplicate facts that would be captured by policy rule extraction (R1, E1 patterns)
7. Focus on: statistics, best practices, process descriptions, organizational structure, conditions, qualifiers, temporal statements, quantitative assertions`;

    const response = await this.client.messages.create({
      model: RAG_CONFIG.llm.ingestionModels.narrativeExtraction,
      max_tokens: RAG_CONFIG.llm.maxTokens.narrativeExtraction,
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return parseJsonResponse<NarrativeExtractionResult>(text, 'extractNarrativeFacts');
  }

  async verifyExtractionCompleteness(params: {
    sectionText: string;
    sectionTitle: string;
    existingFacts: FactExtraction[];
    documentType: RAGDocumentType;
  }): Promise<VerificationResult> {
    const { sectionText, sectionTitle, existingFacts, documentType } = params;

    const existingFactList = existingFacts
      .map((f, i) => `  ${i + 1}. [${f.factType}] ${f.content}`)
      .join('\n');

    const systemPrompt = `You are an extraction completeness verifier. Your job is to find facts that were MISSED by previous extraction passes. You must be thorough and precise. Output ONLY valid JSON.`;

    const userPrompt = `Review this section and find any facts that were MISSED by previous extraction.

Section: "${sectionTitle}"
Document Type: ${documentType}

<section_text>
${sectionText}
</section_text>

<already_extracted_facts>
${existingFactList || '(No facts extracted yet)'}
</already_extracted_facts>

Your task: Compare the section text against the already-extracted facts. Find ANY information that was missed. Focus specifically on:
1. Implicit limits, thresholds, or conditions not captured
2. Facts buried in subordinate clauses or qualifying phrases
3. Cross-references to other sections or policies
4. Qualifiers or conditions that modify existing rules
5. Numeric values (dollar amounts, percentages, time periods) not yet captured
6. Process steps or procedures described in text
7. Definitions given in context (not in a glossary)
8. Exceptions or edge cases mentioned in passing

Return ONLY the newly found facts — do NOT duplicate anything already in the extracted list.

Produce a JSON object:
{
  "missingFacts": [
    {
      "factType": "limit",
      "content": "The actual missing fact content",
      "sourceText": "Brief quote from the section showing the source",
      "confidence": 0.85,
      "factCategory": "verification_recovery",
      "subsection": "Nearest heading"
    }
  ],
  "coverageEstimate": 0.95
}

RULES:
1. Only include genuinely new facts not already in the extracted list
2. Set factCategory to "verification_recovery" for all facts found by this pass
3. coverageEstimate: your estimate of what % of the section's factual content is now captured (0.0-1.0)
4. If nothing is missing, return empty missingFacts array and coverageEstimate near 1.0
5. Be thorough — check every sentence against the extracted facts list
6. factType MUST be one of these exact strings (choose the closest match; use "fact" if unsure):
   "fact", "entity", "definition", "relationship", "table_row",
   "policy_exception", "policy_rule", "limit", "threshold",
   "required_document", "escalation_path", "audit_field",
   "cross_reference", "narrative_fact"`;

    const response = await this.client.messages.create({
      model: RAG_CONFIG.llm.ingestionModels.verification,
      max_tokens: RAG_CONFIG.llm.maxTokens.verification,
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return parseJsonResponse<VerificationResult>(text, 'verifyExtractionCompleteness');
  }
}
