/**
 * Diagnostic endpoint: tests whether the DEPLOYED Vercel build
 * correctly uses `workbase_id` by calling the ACTUAL `storeSectionsFromStructure`
 * function — the exact same code path the Inngest function uses.
 *
 * This endpoint imports storeSectionsFromStructure from the same module,
 * meaning it exercises the SAME compiled chunk (9172.js) as the Inngest route.
 *
 * POST /api/rag/test-section-insert
 * Body: { documentId, userId, workbaseId }
 * Auth: x-service-key header must match SUPABASE_SERVICE_ROLE_KEY
 */

import { NextRequest, NextResponse } from 'next/server';
import { storeSectionsFromStructure } from '@/lib/rag/services/rag-ingestion-service';
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import type { StructureAnalysisResult } from '@/types/rag';

// Build fingerprint — when this changes, the chunk MUST recompile
const BUILD_FINGERPRINT = '2026-03-01T10:15Z-v2';

export async function POST(request: NextRequest) {
    // Gate: require service role key
    const serviceKey = request.headers.get('x-service-key');
    if (serviceKey !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId, userId, workbaseId } = await request.json();

    if (!documentId || !userId || !workbaseId) {
        return NextResponse.json(
            { error: 'Missing documentId, userId, or workbaseId' },
            { status: 400 }
        );
    }

    const supabase = createServerSupabaseAdminClient();

    try {
        // Create a minimal StructureAnalysisResult with one test section
        const testStructure: StructureAnalysisResult = {
            summary: 'Build verification test',
            documentType: 'narrative',
            sections: [
                {
                    title: '[DIAG] build-verification section — safe to delete',
                    summary: 'Build verification test',
                    startLine: 1,
                    endLine: 1,
                    isNarrative: false,
                    policyId: null,
                },
            ],
            tables: [],
            topicTaxonomy: [],
            ambiguities: [],
            expertQuestions: [],
        };

        // Call the ACTUAL storeSectionsFromStructure — same function the Inngest route uses.
        // This exercises the same compiled chunk (9172.js).
        const sections = await storeSectionsFromStructure(
            documentId,
            userId,
            'Build verification test line',  // originalText
            testStructure,
            workbaseId
        );

        // Clean up the test section
        if (sections.length > 0) {
            await supabase
                .from('rag_sections')
                .delete()
                .eq('id', sections[0].id);
        }

        return NextResponse.json({
            success: true,
            sectionId: sections[0]?.id,
            buildFingerprint: BUILD_FINGERPRINT,
            message: 'storeSectionsFromStructure() uses workbase_id correctly',
            sectionCount: sections.length,
        });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('[DIAG] storeSectionsFromStructure failed:', errorMessage);

        return NextResponse.json({
            success: false,
            error: errorMessage,
            buildFingerprint: BUILD_FINGERPRINT,
            isKnowledgeBaseIdError: errorMessage.includes('knowledge_base_id'),
        }, { status: 500 });
    }
}
