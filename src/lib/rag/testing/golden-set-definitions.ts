// ============================================
// Golden-Set Regression Test — Types & Data
// ============================================
// Standalone definitions for the RAG golden-set regression test.
// No external dependencies — pure types and data.

// ---- Types ----

export interface GoldenSetItem {
    id: string;                           // e.g. 'GS-001'
    question: string;
    expectedAnswer: string;               // substring match (case-insensitive)
    difficulty: 'easy' | 'medium' | 'hard';
    category: string;                     // e.g. 'direct-lookup', 'rule-exception'
}

export interface QueryDiagnostics {
    hydeGenerated: boolean;
    sectionsRetrieved: number;
    factsRetrieved: number;
    responseTimeMs: number;
    errorStack: string | null;           // full stack trace on failure
    errorPhase: string | null;           // which pipeline step failed
}

export interface TestResult {
    item: GoldenSetItem;
    passed: boolean;
    responseText: string;                 // first 500 chars
    selfEvalScore: number | null;
    responseTimeMs: number;
    error: string | null;                 // null = success
    diagnostics: QueryDiagnostics;
}

export interface PreflightCheck {
    name: string;
    passed: boolean;
    detail: string;
    severity: 'critical' | 'warning' | 'info';
}

export interface PreflightResult {
    passed: boolean;
    checks: PreflightCheck[];
}

export interface TestRunSummary {
    runId: string;
    embeddingRunId?: string;  // Which embedding run was tested (null = all)
    startedAt: string;
    completedAt: string;
    totalDurationMs: number;
    preflight: PreflightResult;
    totalPassed: number;
    totalFailed: number;
    totalErrored: number;                // distinct from failed: error = infrastructure failure
    passRate: number;
    meetsTarget: boolean;
    breakdown: {
        easy: { passed: number; total: number };
        medium: { passed: number; total: number };
        hard: { passed: number; total: number };
    };
    avgResponseTimeMs: number;
    avgSelfEvalScore: number;
    results: TestResult[];
}

// ---- Constants ----

// CANONICAL_DOCUMENT_ID intentionally removed (Change 2).
// documentId must always be supplied explicitly by the caller.
export const TARGET_PASS_RATE = 85;

// ---- Golden Set: 20 Q&A Pairs ----
// Source: scripts/golden-set-test.js
// Each item has an id (GS-001..GS-020) and category for grouping.

export const GOLDEN_SET: GoldenSetItem[] = [
    // ---- Easy: Direct rule lookup (should always pass) ----
    {
        id: 'GS-001',
        question: 'What is the DTI limit for jumbo mortgages?',
        expectedAnswer: '43%',
        difficulty: 'easy',
        category: 'direct-lookup',
    },
    {
        id: 'GS-002',
        question: 'What is the minimum FICO score for jumbo mortgages?',
        expectedAnswer: '740',
        difficulty: 'easy',
        category: 'direct-lookup',
    },
    {
        id: 'GS-003',
        question: 'What are the wire transfer cutoff times?',
        expectedAnswer: 'cutoff',
        difficulty: 'easy',
        category: 'direct-lookup',
    },
    {
        id: 'GS-004',
        question: 'What triggers enhanced due diligence for source of funds?',
        expectedAnswer: '1,000,000',
        difficulty: 'easy',
        category: 'direct-lookup',
    },
    {
        id: 'GS-005',
        question: 'What is the FDIC insurance coverage limit?',
        expectedAnswer: '250,000',
        difficulty: 'easy',
        category: 'direct-lookup',
    },

    // ---- Medium: Rule + Exception combinations ----
    {
        id: 'GS-006',
        question: 'Can the DTI limit be exceeded for jumbo mortgages?',
        expectedAnswer: '45%',
        difficulty: 'medium',
        category: 'rule-exception',
    },
    {
        id: 'GS-007',
        question: 'Are there any exceptions to the minimum down payment requirement?',
        expectedAnswer: 'exception',
        difficulty: 'medium',
        category: 'rule-exception',
    },
    {
        id: 'GS-008',
        question: 'What happens when a wire transfer is flagged for review?',
        expectedAnswer: 'escalat',
        difficulty: 'medium',
        category: 'rule-exception',
    },
    {
        id: 'GS-009',
        question: 'What are the escalation levels for BSA/AML alerts?',
        expectedAnswer: 'compliance',
        difficulty: 'medium',
        category: 'rule-exception',
    },
    {
        id: 'GS-010',
        question: 'What documents are needed for a jumbo mortgage application?',
        expectedAnswer: 'tax',
        difficulty: 'medium',
        category: 'rule-exception',
    },

    // ---- Medium: Definition and glossary lookups ----
    {
        id: 'GS-011',
        question: 'What does DTI stand for in lending context?',
        expectedAnswer: 'debt-to-income',
        difficulty: 'medium',
        category: 'definition',
    },
    {
        id: 'GS-012',
        question: 'What is the definition of a jumbo mortgage?',
        expectedAnswer: '1.5',
        difficulty: 'medium',
        category: 'definition',
    },

    // ---- Medium: Table data retrieval ----
    {
        id: 'GS-013',
        question: 'What are the fee tiers for different account types?',
        expectedAnswer: 'fee',
        difficulty: 'medium',
        category: 'table-data',
    },
    {
        id: 'GS-014',
        question: 'What interest rates apply to certificates of deposit?',
        expectedAnswer: 'rate',
        difficulty: 'medium',
        category: 'table-data',
    },

    // ---- Hard: Cross-section synthesis ----
    {
        id: 'GS-015',
        question: 'What documents do I need to open an account?',
        expectedAnswer: 'passport',
        difficulty: 'hard',
        category: 'cross-section',
    },
    {
        id: 'GS-016',
        question: 'Compare the lending requirements for conventional vs jumbo mortgages',
        expectedAnswer: 'jumbo',
        difficulty: 'hard',
        category: 'cross-section',
    },
    {
        id: 'GS-017',
        question: 'What audit requirements apply to wire transfers over $50,000?',
        expectedAnswer: 'audit',
        difficulty: 'hard',
        category: 'cross-section',
    },
    {
        id: 'GS-018',
        question: 'What are all the circumstances that require manager approval?',
        expectedAnswer: 'approv',
        difficulty: 'hard',
        category: 'cross-section',
    },
    {
        id: 'GS-019',
        question: 'How do the compliance requirements differ between domestic and international wire transfers?',
        expectedAnswer: 'international',
        difficulty: 'hard',
        category: 'cross-section',
    },
    {
        id: 'GS-020',
        question: 'What are the complete steps for processing a mortgage application from start to finish?',
        expectedAnswer: 'appraisal',
        difficulty: 'hard',
        category: 'cross-section',
    },
];
