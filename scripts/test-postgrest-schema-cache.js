/**
 * test-postgrest-schema-cache.js
 *
 * Targeted test for the `knowledge_base_id → workbase_id` rename issue.
 *
 * This script exercises TWO test vectors:
 *
 *   Test 1 — LOCAL Supabase client insert (hits PostgREST directly).
 *            Tests whether the database / PostgREST schema cache is clean.
 *
 *   Test 2 — DEPLOYED Vercel API endpoint (hits the actual serverless function).
 *            This is the REAL test. It calls the deployed `/api/rag/test-section-insert`
 *            diagnostic endpoint, which executes the exact same `storeSectionsFromStructure`
 *            code path the Inngest function uses.
 *
 * If Test 1 passes but Test 2 fails, the Vercel build has stale compiled chunks.
 *
 * Usage:
 *   cd C:/Users/james/Master/BrightHub/BRun/v4-show
 *   node scripts/test-postgrest-schema-cache.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VERCEL_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || 'https://v4-show.vercel.app';

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
});

// ─── Constants ───────────────────────────────────────────────────────────────
const WORKBASE_ID = '232bea74-b987-4629-afbc-a21180fe6e84'; // rag-KB-v2_v1
const USER_ID = '8d26cc10-a3c1-4927-8708-667d37a3348b'; // James

async function run() {
    let passed = 0;
    let failed = 0;
    const cleanup = [];

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║   PostgREST Schema Cache + Vercel Build — workbase_id Test   ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // ── 0: Find a document to use as parent FK ──────────────────────────────
    console.log('Step 0: Fetching a real rag_document for FK …');
    const { data: docRows, error: docErr } = await supabase
        .from('rag_documents')
        .select('id')
        .eq('workbase_id', WORKBASE_ID)
        .eq('user_id', USER_ID)
        .order('created_at', { ascending: false })
        .limit(1);

    if (docErr || !docRows?.length) {
        console.error('❌  Could not find a rag_document for this workbase:', docErr?.message || 'no rows');
        console.error('    Upload at least one document first, then re-run this script.');
        process.exit(1);
    }

    const DOCUMENT_ID = docRows[0].id;
    console.log(`    Using document: ${DOCUMENT_ID}\n`);

    // ═══════════════════════════════════════════════════════════════════════════
    // TEST 1: LOCAL Supabase client → PostgREST (tests the DB layer)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('┌──────────────────────────────────────────────────────────┐');
    console.log('│  Test 1: LOCAL Supabase INSERT with workbase_id         │');
    console.log('│  (Tests PostgREST schema cache — NOT the Vercel build) │');
    console.log('└──────────────────────────────────────────────────────────┘');

    // 1a: rag_sections
    console.log('\n  1a: INSERT rag_sections with workbase_id …');
    const { data: sec, error: secErr } = await supabase
        .from('rag_sections')
        .insert({
            document_id: DOCUMENT_ID,
            user_id: USER_ID,
            workbase_id: WORKBASE_ID,
            section_index: 999,
            title: '[CACHE-TEST] temp section — safe to delete',
            original_text: 'Schema cache test',
            summary: 'Schema cache test',
            contextual_preamble: '',
            token_count: 10,
            section_metadata: {},
        })
        .select('id')
        .single();

    if (secErr) {
        console.error(`      ❌  FAIL — ${secErr.message}`);
        failed++;
    } else {
        console.log(`      ✅  PASS — section inserted (id: ${sec.id})`);
        cleanup.push({ table: 'rag_sections', id: sec.id });
        passed++;
    }

    // 1b: rag_facts
    console.log('  1b: INSERT rag_facts with workbase_id …');
    const { data: fact, error: factErr } = await supabase
        .from('rag_facts')
        .insert({
            document_id: DOCUMENT_ID,
            user_id: USER_ID,
            workbase_id: WORKBASE_ID,
            section_id: sec?.id || null,
            fact_type: 'fact',
            content: '[CACHE-TEST] temp fact — safe to delete',
            source_text: 'Schema cache test',
            confidence: 1.0,
            metadata: {},
        })
        .select('id')
        .single();

    if (factErr) {
        console.error(`      ❌  FAIL — ${factErr.message}`);
        failed++;
    } else {
        console.log(`      ✅  PASS — fact inserted (id: ${fact.id})`);
        cleanup.push({ table: 'rag_facts', id: fact.id });
        passed++;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TEST 2: HIT DEPLOYED VERCEL ENDPOINT (tests the Vercel build)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n┌──────────────────────────────────────────────────────────┐');
    console.log('│  Test 2: DEPLOYED Vercel endpoint section insert test    │');
    console.log('│  (Tests whether the VERCEL BUILD uses workbase_id)      │');
    console.log('└──────────────────────────────────────────────────────────┘');

    if (!VERCEL_URL) {
        console.warn('\n  ⚠️  SKIPPED — NEXT_PUBLIC_SITE_URL / VERCEL_URL not set in .env.local');
        console.warn('     Add NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app to .env.local');
        console.warn('     This is the most important test — it exercises the actual Vercel build.\n');
    } else {
        const testUrl = `${VERCEL_URL.replace(/\/$/, '')}/api/rag/test-section-insert`;
        console.log(`\n  Hitting: ${testUrl}`);

        try {
            const resp = await fetch(testUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-service-key': SERVICE_KEY,
                },
                body: JSON.stringify({
                    documentId: DOCUMENT_ID,
                    userId: USER_ID,
                    workbaseId: WORKBASE_ID,
                }),
            });

            const body = await resp.json();

            if (resp.ok && body.success) {
                console.log(`      ✅  PASS — Vercel build uses workbase_id correctly`);
                if (body.buildFingerprint) {
                    console.log(`      📦  Build fingerprint: ${body.buildFingerprint}`);
                }
                if (body.sectionId) {
                    cleanup.push({ table: 'rag_sections', id: body.sectionId });
                }
                passed++;
            } else {
                console.error(`      ❌  FAIL — ${body.error || resp.statusText}`);
                if (body.error && body.error.includes('knowledge_base_id')) {
                    console.error('      🔴  CONFIRMED: Vercel build has STALE CODE — still uses knowledge_base_id');
                    console.error('         The source code is correct but the compiled chunks are old.');
                    console.error('         Make a trivial code change, commit, and push to force recompile.');
                }
                failed++;
            }
        } catch (fetchErr) {
            if (fetchErr.message?.includes('404') || fetchErr.cause?.code === 'ENOTFOUND') {
                console.warn(`      ⚠️  SKIPPED — diagnostic endpoint not deployed yet`);
                console.warn('         Deploy the /api/rag/test-section-insert route first.');
            } else {
                console.error(`      ❌  FAIL — fetch error: ${fetchErr.message}`);
                failed++;
            }
        }
    }

    // ── Cleanup ────────────────────────────────────────────────────────────────
    console.log('\nCleaning up test rows …');
    for (const row of cleanup.reverse()) {
        const { error: delErr } = await supabase
            .from(row.table)
            .delete()
            .eq('id', row.id);
        if (delErr) {
            console.warn(`  ⚠️  Could not delete ${row.table}/${row.id}: ${delErr.message}`);
        } else {
            console.log(`  🗑  Deleted ${row.table}/${row.id}`);
        }
    }

    // ── Summary ────────────────────────────────────────────────────────────────
    console.log('\n══════════════════════════════════════════════════════════════');
    if (failed === 0) {
        console.log(`✅  ALL TESTS PASSED (${passed}/${passed})`);
        console.log('    PostgREST schema cache is CLEAN and Vercel build is correct.');
        console.log('    Safe to run the RAG pipeline.');
    } else {
        console.log(`❌  ${failed} TEST(S) FAILED (${passed}/${passed + failed} passed)`);
        console.log('    If only Test 1 passed but Test 2 failed:');
        console.log('      → Vercel build is stale. Commit a trivial change and push.');
        console.log('    If Test 1 failed:');
        console.log('      → PostgREST schema cache is stale. Reload in Supabase Dashboard.');
    }
    console.log('══════════════════════════════════════════════════════════════\n');

    process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
});
