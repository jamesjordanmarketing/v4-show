/**
 * Golden-Set Regression Test for RAG Pipeline
 *
 * 20 Q&A pairs from the Sun Chip Bank document.
 * Run after every ingestion or retrieval change to catch regressions.
 *
 * Prerequisites: Dev server must be running (npm run dev)
 *
 * Usage:
 *   node scripts/golden-set-test.js
 *
 * Expected: 85%+ pass rate (17/20 minimum)
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const KEEP_DOCUMENT_ID = 'ceff906e-968a-416f-90a6-df2422519d2b';

// We need a session cookie for auth — get it from the browser or provide a test token
// For CI, set RAG_TEST_COOKIE env var
const AUTH_COOKIE = process.env.RAG_TEST_COOKIE || '';

// ============================================
// Golden Set Definition
// ============================================

const GOLDEN_SET = [
    // ---- Easy: Direct rule lookup (should always pass) ----
    {
        question: 'What is the DTI limit for jumbo mortgages?',
        expectedAnswer: '43%',
        difficulty: 'easy',
    },
    {
        question: 'What is the minimum FICO score for conventional loans?',
        expectedAnswer: '620',
        difficulty: 'easy',
    },
    {
        question: 'What are the wire transfer cutoff times?',
        expectedAnswer: 'cutoff',
        difficulty: 'easy',
    },
    {
        question: 'What is the maximum cash deposit without enhanced due diligence?',
        expectedAnswer: '10,000',
        difficulty: 'easy',
    },
    {
        question: 'What is the FDIC insurance coverage limit?',
        expectedAnswer: '250,000',
        difficulty: 'easy',
    },

    // ---- Medium: Rule + Exception combinations ----
    {
        question: 'Can the DTI limit be exceeded for jumbo mortgages?',
        expectedAnswer: '45%',
        difficulty: 'medium',
    },
    {
        question: 'Are there any exceptions to the minimum down payment requirement?',
        expectedAnswer: 'exception',
        difficulty: 'medium',
    },
    {
        question: 'What happens when a wire transfer is flagged for review?',
        expectedAnswer: 'escalat',
        difficulty: 'medium',
    },
    {
        question: 'What are the escalation levels for BSA/AML alerts?',
        expectedAnswer: 'compliance',
        difficulty: 'medium',
    },
    {
        question: 'What documents are needed for a jumbo mortgage application?',
        expectedAnswer: 'tax',
        difficulty: 'medium',
    },

    // ---- Medium: Definition and glossary lookups ----
    {
        question: 'What does DTI stand for in lending context?',
        expectedAnswer: 'debt-to-income',
        difficulty: 'medium',
    },
    {
        question: 'What is the definition of a jumbo mortgage?',
        expectedAnswer: 'conforming',
        difficulty: 'medium',
    },

    // ---- Medium: Table data retrieval ----
    {
        question: 'What are the fee tiers for different account types?',
        expectedAnswer: 'fee',
        difficulty: 'medium',
    },
    {
        question: 'What interest rates apply to certificates of deposit?',
        expectedAnswer: 'rate',
        difficulty: 'medium',
    },

    // ---- Hard: Cross-section synthesis ----
    {
        question: 'What documents do I need to open an account?',
        expectedAnswer: 'identification',
        difficulty: 'hard',
    },
    {
        question: 'Compare the lending requirements for conventional vs jumbo mortgages',
        expectedAnswer: 'jumbo',
        difficulty: 'hard',
    },
    {
        question: 'What audit requirements apply to wire transfers over $50,000?',
        expectedAnswer: 'audit',
        difficulty: 'hard',
    },
    {
        question: 'What are all the circumstances that require manager approval?',
        expectedAnswer: 'approv',
        difficulty: 'hard',
    },
    {
        question: 'How do the compliance requirements differ between domestic and international wire transfers?',
        expectedAnswer: 'international',
        difficulty: 'hard',
    },
    {
        question: 'What are the complete steps for processing a mortgage application from start to finish?',
        expectedAnswer: 'appraisal',
        difficulty: 'hard',
    },
];

// ============================================
// Test Runner
// ============================================

async function queryRAGViaAPI(question) {
    const res = await fetch(`${BASE_URL}/api/rag/query`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(AUTH_COOKIE ? { Cookie: AUTH_COOKIE } : {}),
        },
        body: JSON.stringify({
            queryText: question,
            documentId: KEEP_DOCUMENT_ID,
            mode: 'rag_only',
        }),
    });

    if (!res.ok) {
        throw new Error(`API returned ${res.status}: ${res.statusText}`);
    }

    return res.json();
}

async function runGoldenSetTest() {
    console.log('========================================');
    console.log('  Golden-Set Regression Test');
    console.log('  RAG Multi-Pass Pipeline');
    console.log('========================================\n');

    const results = [];
    let passed = 0;
    let failed = 0;

    for (let i = 0; i < GOLDEN_SET.length; i++) {
        const item = GOLDEN_SET[i];
        const startTime = Date.now();

        try {
            const result = await queryRAGViaAPI(item.question);
            const responseTimeMs = Date.now() - startTime;
            const responseText = result.data?.responseText || result.data?.response_text || '';
            const selfEvalScore = result.data?.selfEvalScore ?? result.data?.self_eval_score ?? null;
            const containsExpected = responseText.toLowerCase().includes(item.expectedAnswer.toLowerCase());

            results.push({
                question: item.question,
                difficulty: item.difficulty,
                passed: containsExpected,
                expectedAnswer: item.expectedAnswer,
                actualResponse: responseText.slice(0, 200),
                selfEvalScore,
                responseTimeMs,
            });

            if (containsExpected) {
                passed++;
                console.log(`  ✓ [${item.difficulty.padEnd(6)}] ${item.question}`);
                if (selfEvalScore !== null) {
                    console.log(`    Score: ${(selfEvalScore * 100).toFixed(0)}% | ${responseTimeMs}ms`);
                }
            } else {
                failed++;
                console.log(`  ✗ [${item.difficulty.padEnd(6)}] ${item.question}`);
                console.log(`    Expected: "${item.expectedAnswer}"`);
                console.log(`    Got: "${responseText.slice(0, 150)}..."`);
                if (selfEvalScore !== null) {
                    console.log(`    Score: ${(selfEvalScore * 100).toFixed(0)}% | ${responseTimeMs}ms`);
                }
            }
        } catch (err) {
            failed++;
            console.log(`  ✗ [${item.difficulty.padEnd(6)}] ${item.question}`);
            console.log(`    ERROR: ${err.message}`);

            results.push({
                question: item.question,
                difficulty: item.difficulty,
                passed: false,
                expectedAnswer: item.expectedAnswer,
                actualResponse: `ERROR: ${err.message}`,
                selfEvalScore: null,
                responseTimeMs: Date.now() - startTime,
            });
        }

        // Small delay between queries to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // ============================================
    // Summary Report
    // ============================================
    const total = passed + failed;
    const rate = ((passed / total) * 100).toFixed(1);

    const easyPassed = results.filter(r => r.difficulty === 'easy' && r.passed).length;
    const easyTotal = results.filter(r => r.difficulty === 'easy').length;
    const mediumPassed = results.filter(r => r.difficulty === 'medium' && r.passed).length;
    const mediumTotal = results.filter(r => r.difficulty === 'medium').length;
    const hardPassed = results.filter(r => r.difficulty === 'hard' && r.passed).length;
    const hardTotal = results.filter(r => r.difficulty === 'hard').length;

    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTimeMs, 0) / results.length;
    const scoresWithValues = results.filter(r => r.selfEvalScore !== null);
    const avgSelfEval = scoresWithValues.length > 0
        ? scoresWithValues.reduce((sum, r) => sum + (r.selfEvalScore || 0), 0) / scoresWithValues.length
        : 0;

    console.log('\n========================================');
    console.log('  RESULTS');
    console.log('========================================');
    console.log(`  Total:  ${passed}/${total} passed (${rate}%)`);
    console.log(`  Easy:   ${easyPassed}/${easyTotal}`);
    console.log(`  Medium: ${mediumPassed}/${mediumTotal}`);
    console.log(`  Hard:   ${hardPassed}/${hardTotal}`);
    console.log(`  Avg Response Time: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`  Avg Self-Eval: ${(avgSelfEval * 100).toFixed(0)}%`);
    console.log('========================================');

    const TARGET_RATE = 85;
    if (parseFloat(rate) >= TARGET_RATE) {
        console.log(`\n✓ PASS — meets ${TARGET_RATE}% target\n`);
        process.exit(0);
    } else {
        console.log(`\n✗ FAIL — below ${TARGET_RATE}% target\n`);
        process.exit(1);
    }
}

// Run
runGoldenSetTest().catch(err => {
    console.error('Test runner failed:', err);
    process.exit(1);
});
