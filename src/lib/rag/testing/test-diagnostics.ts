// ============================================
// Golden-Set Test — Diagnostics Service
// ============================================
// Pre-flight checks and per-query diagnostic wrappers.
// Uses createServerSupabaseAdminClient() for all DB access.

import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { queryRAG } from '@/lib/rag/services/rag-retrieval-service';
import type {
    GoldenSetItem,
    TestResult,
    QueryDiagnostics,
    PreflightResult,
    PreflightCheck,
} from './golden-set-definitions';

// ---- Pre-Flight Checks ----

export async function runPreflightChecks(documentId: string): Promise<PreflightResult> {
    const checks: PreflightCheck[] = [];

    // Check 1: Document exists and is ready
    try {
        const supabase = createServerSupabaseAdminClient();
        const { data: doc, error } = await supabase
            .from('rag_documents')
            .select('id, status, file_name, knowledge_base_id')
            .eq('id', documentId)
            .single();

        if (error || !doc) {
            checks.push({
                name: 'Document Exists',
                passed: false,
                detail: `Document ${documentId.slice(0, 8)}... not found: ${error?.message || 'no data'}`,
                severity: 'critical',
            });
        } else {
            const statusOk = doc.status === 'ready';
            checks.push({
                name: 'Document Exists',
                passed: statusOk,
                detail: `${doc.file_name || 'unknown'} | status=${doc.status}`,
                severity: statusOk ? 'info' : 'critical',
            });

            // Check 6 (inline): Knowledge Base Link
            checks.push({
                name: 'Knowledge Base Link',
                passed: !!doc.knowledge_base_id,
                detail: doc.knowledge_base_id
                    ? `knowledge_base_id: ${doc.knowledge_base_id.slice(0, 8)}...`
                    : 'Document not linked to a knowledge base (may affect KB-wide search)',
                severity: doc.knowledge_base_id ? 'info' : 'warning',
            });
        }
    } catch (err) {
        checks.push({
            name: 'Document Exists',
            passed: false,
            detail: `DB connection error: ${err instanceof Error ? err.message : 'unknown'}`,
            severity: 'critical',
        });
    }

    // Check 2: Embeddings exist for this document
    try {
        const supabase = createServerSupabaseAdminClient();
        const { data: embeddings, error } = await supabase
            .from('rag_embeddings')
            .select('id, tier, created_at, run_id')
            .eq('document_id', documentId)
            .order('created_at', { ascending: true });

        if (error) {
            checks.push({
                name: 'Embeddings Exist',
                passed: false,
                detail: `Query error: ${error.message}`,
                severity: 'critical',
            });
        } else {
            const count = embeddings?.length || 0;
            const tier1 = embeddings?.filter((e: any) => e.tier === 1).length || 0;
            const tier2 = embeddings?.filter((e: any) => e.tier === 2).length || 0;
            const tier3 = embeddings?.filter((e: any) => e.tier === 3).length || 0;

            // Determine embedding creation time range
            let timeRange = '';
            if (count > 0) {
                const oldest = embeddings![0]?.created_at;
                const newest = embeddings![embeddings!.length - 1]?.created_at;
                const oldestDate = oldest ? new Date(oldest) : null;
                const newestDate = newest ? new Date(newest) : null;

                if (oldestDate && newestDate) {
                    const spanMs = newestDate.getTime() - oldestDate.getTime();
                    const spanHours = Math.round(spanMs / (1000 * 60 * 60));

                    if (spanHours < 1) {
                        timeRange = ` | single run ~${oldestDate.toISOString().slice(0, 16)}Z`;
                    } else {
                        timeRange = ` | span: ${oldestDate.toISOString().slice(0, 16)}Z → ${newestDate.toISOString().slice(0, 16)}Z (${spanHours}h — may include multiple runs)`;
                    }
                }

                // Count distinct run_ids
                const runIds = new Set(embeddings!.map((e: any) => e.run_id).filter(Boolean));
                const untaggedCount = embeddings!.filter((e: any) => !e.run_id).length;
                if (runIds.size > 0 || untaggedCount > 0) {
                    const parts: string[] = [];
                    if (runIds.size > 0) parts.push(`${runIds.size} tagged run(s)`);
                    if (untaggedCount > 0) parts.push(`${untaggedCount} untagged (legacy)`);
                    timeRange += ` | ${parts.join(', ')}`;
                }
            }

            checks.push({
                name: 'Embeddings Exist',
                passed: count > 0,
                detail: count > 0
                    ? `${count} embeddings (tier1: ${tier1}, tier2: ${tier2}, tier3: ${tier3})${timeRange}`
                    : 'No embeddings found for this document',
                severity: count > 0 ? 'info' : 'critical',
            });
        }
    } catch (err) {
        checks.push({
            name: 'Embeddings Exist',
            passed: false,
            detail: `Error: ${err instanceof Error ? err.message : 'unknown'}`,
            severity: 'critical',
        });
    }

    // Check 3: RPC function exists (match_rag_embeddings_kb)
    // We test by calling the RPC with a dummy zero vector and expecting it to return results or
    // a recognizable error (not "function does not exist")
    try {
        const supabase = createServerSupabaseAdminClient();
        const zeroVector = new Array(1536).fill(0);
        const { error } = await supabase.rpc('match_rag_embeddings_kb', {
            query_embedding: zeroVector,
            match_threshold: 0.99, // Very high threshold so it returns nothing
            match_count: 1,
            filter_knowledge_base_id: null,
            filter_document_id: documentId,
            filter_tier: null,
            filter_run_id: null,
        });

        if (error && error.message.includes('does not exist')) {
            checks.push({
                name: 'RPC Function (match_rag_embeddings_kb)',
                passed: false,
                detail: 'RPC function not found in database',
                severity: 'critical',
            });
        } else {
            // Either succeeded or returned a non-critical error (like empty results)
            checks.push({
                name: 'RPC Function (match_rag_embeddings_kb)',
                passed: true,
                detail: error ? `RPC callable (returned: ${error.message.slice(0, 80)})` : 'RPC available and callable',
                severity: 'info',
            });
        }
    } catch (err) {
        checks.push({
            name: 'RPC Function (match_rag_embeddings_kb)',
            passed: false,
            detail: `RPC test error: ${err instanceof Error ? err.message : 'unknown'}`,
            severity: 'critical',
        });
    }

    // Check 4: Anthropic API key
    const anthropicKey = process.env.ANTHROPIC_API_KEY || '';
    checks.push({
        name: 'Anthropic API Key',
        passed: anthropicKey.length > 0,
        detail: anthropicKey.length > 0
            ? `ANTHROPIC_API_KEY set (${anthropicKey.slice(0, 7)}...${anthropicKey.slice(-4)})`
            : 'ANTHROPIC_API_KEY not set — Claude calls will fail',
        severity: anthropicKey.length > 0 ? 'info' : 'critical',
    });

    // Check 5: OpenAI API key (for embeddings)
    const openaiKey = process.env.OPENAI_API_KEY || '';
    checks.push({
        name: 'OpenAI API Key',
        passed: openaiKey.length > 0,
        detail: openaiKey.length > 0
            ? `OPENAI_API_KEY set (${openaiKey.slice(0, 5)}...${openaiKey.slice(-4)})`
            : 'OPENAI_API_KEY not set — embedding generation will fail',
        severity: openaiKey.length > 0 ? 'info' : 'critical',
    });

    // Determine overall pass: all critical checks must pass
    const hasCriticalFailure = checks.some(c => c.severity === 'critical' && !c.passed);

    return {
        passed: !hasCriticalFailure,
        checks,
    };
}

// ---- Per-Query Diagnostic Wrapper ----

function identifyErrorPhase(errorMessage: string): string {
    const msg = errorMessage.toLowerCase();
    if (msg.includes('similarity search') || msg.includes('embedding')) return 'embedding-search';
    if (msg.includes('hyde')) return 'hyde';
    if (msg.includes('response generation') || msg.includes('generateresponse')) return 'llm-response';
    if (msg.includes('self-eval') || msg.includes('selfevaluate')) return 'self-eval';
    if (msg.includes('failed to store') || msg.includes('insert')) return 'db-insert';
    if (msg.includes('rerank')) return 'reranking';
    if (msg.includes('text search') || msg.includes('tsvector')) return 'text-search';
    return 'unknown';
}

export async function runSingleTest(
    item: GoldenSetItem,
    userId: string,
    documentId: string,
    runId?: string,
): Promise<TestResult> {
    const startTime = Date.now();

    const emptyDiagnostics: QueryDiagnostics = {
        hydeGenerated: false,
        sectionsRetrieved: 0,
        factsRetrieved: 0,
        responseTimeMs: 0,
        errorStack: null,
        errorPhase: null,
    };

    try {
        const result = await queryRAG({
            queryText: item.question,
            documentId,
            userId,
            mode: 'rag_only',
            runId,
        });

        const responseTimeMs = Date.now() - startTime;

        if (!result.success || !result.data) {
            // queryRAG returned { success: false } — this is a "soft" error
            return {
                item,
                passed: false,
                responseText: '',
                selfEvalScore: null,
                responseTimeMs,
                error: result.error || 'queryRAG returned success=false with no error message',
                diagnostics: {
                    ...emptyDiagnostics,
                    responseTimeMs,
                    errorPhase: identifyErrorPhase(result.error || ''),
                    errorStack: result.error || null,
                },
            };
        }

        // Extract data from the RAGQuery result
        const query = result.data;
        const responseText = query.responseText || '';
        const containsExpected = responseText.toLowerCase().includes(item.expectedAnswer.toLowerCase());

        return {
            item,
            passed: containsExpected,
            responseText: responseText.slice(0, 500),
            selfEvalScore: query.selfEvalScore ?? null,
            responseTimeMs,
            error: null,
            diagnostics: {
                hydeGenerated: !!query.hydeText,
                sectionsRetrieved: query.retrievedSectionIds?.length || 0,
                factsRetrieved: query.retrievedFactIds?.length || 0,
                responseTimeMs,
                errorStack: null,
                errorPhase: null,
            },
        };
    } catch (err) {
        const responseTimeMs = Date.now() - startTime;
        const errorMessage = err instanceof Error ? err.message : String(err);
        const errorStack = err instanceof Error ? err.stack || errorMessage : errorMessage;

        return {
            item,
            passed: false,
            responseText: '',
            selfEvalScore: null,
            responseTimeMs,
            error: errorMessage,
            diagnostics: {
                ...emptyDiagnostics,
                responseTimeMs,
                errorStack,
                errorPhase: identifyErrorPhase(errorMessage),
            },
        };
    }
}

// ---- Embedding Run Listing ----

export interface EmbeddingRunInfo {
    id: string;
    documentId: string;
    documentName: string;
    embeddingCount: number;
    embeddingModel: string;
    status: string;
    pipelineVersion: string;
    startedAt: string;
    completedAt: string | null;
    metadata: Record<string, unknown>;
}

export async function getEmbeddingRuns(documentId?: string): Promise<EmbeddingRunInfo[]> {
    try {
        const supabase = createServerSupabaseAdminClient();

        let query = supabase
            .from('rag_embedding_runs')
            .select('*')
            .order('created_at', { ascending: false });

        if (documentId) {
            query = query.eq('document_id', documentId);
        }

        const { data, error } = await query;

        if (error || !data) {
            console.warn('[Test Diagnostics] Failed to fetch embedding runs:', error);
            return [];
        }

        return data.map((row: any) => ({
            id: row.id,
            documentId: row.document_id,
            // metadata.document_file_name is stored at insert time by both single-pass and multi-pass pipelines
            documentName: row.metadata?.document_file_name || row.document_id.slice(0, 8),
            embeddingCount: row.embedding_count,
            embeddingModel: row.embedding_model,
            status: row.status,
            pipelineVersion: row.pipeline_version,
            startedAt: row.started_at,
            completedAt: row.completed_at,
            metadata: row.metadata || {},
        }));
    } catch (err) {
        console.warn('[Test Diagnostics] Error fetching embedding runs:', err);
        return [];
    }
}
