/**
 * Golden-Set Test Report — Markdown Generator
 *
 * POST — Accepts TestRunSummary JSON, returns plain-text Markdown report
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import type { TestRunSummary, TestResult } from '@/lib/rag/testing/golden-set-definitions';

export const maxDuration = 10;

export async function POST(request: NextRequest) {
    const { response: authResponse } = await requireAuth(request);
    if (authResponse) return authResponse;

    try {
        const summary: TestRunSummary = await request.json();
        const markdown = generateMarkdownReport(summary);

        return new NextResponse(markdown, {
            status: 200,
            headers: {
                'Content-Type': 'text/markdown; charset=utf-8',
                'Content-Disposition': `attachment; filename="golden-set-report-${summary.runId.slice(0, 8)}.md"`,
            },
        });
    } catch (err) {
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : 'Report generation failed' },
            { status: 500 }
        );
    }
}

function generateMarkdownReport(summary: TestRunSummary): string {
    const lines: string[] = [];

    lines.push('# RAG Golden-Set Regression Test Report');
    lines.push('');
    lines.push(`**Run ID:** ${summary.runId}`);
    lines.push(`**Started:** ${summary.startedAt}`);
    lines.push(`**Completed:** ${summary.completedAt}`);
    lines.push(`**Duration:** ${Math.round(summary.totalDurationMs / 1000)}s`);
    lines.push(`**Result:** ${summary.meetsTarget ? 'PASS' : 'FAIL'} (target: >=85%)`);
    if (summary.embeddingRunId) {
        lines.push(`**Embedding Run:** ${summary.embeddingRunId}`);
    }
    lines.push('');

    lines.push('## Summary');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Pass Rate | ${summary.passRate}% |`);
    lines.push(`| Passed | ${summary.totalPassed} |`);
    lines.push(`| Failed | ${summary.totalFailed} |`);
    lines.push(`| Errored | ${summary.totalErrored} |`);
    lines.push(`| Avg Response Time | ${Math.round(summary.avgResponseTimeMs / 1000)}s |`);
    lines.push(`| Avg Self-Eval Score | ${Math.round(summary.avgSelfEvalScore * 100)}% |`);
    lines.push('');

    lines.push('## Difficulty Breakdown');
    lines.push('');
    lines.push('| Difficulty | Passed | Total | Rate |');
    lines.push('|------------|--------|-------|------|');
    for (const [level, data] of Object.entries(summary.breakdown)) {
        const rate = data.total > 0 ? Math.round((data.passed / data.total) * 100) : 0;
        lines.push(`| ${level} | ${data.passed} | ${data.total} | ${rate}% |`);
    }
    lines.push('');

    lines.push('## Preflight Checks');
    lines.push('');
    lines.push(`**Overall:** ${summary.preflight.passed ? 'PASSED' : 'FAILED'}`);
    lines.push('');
    for (const check of summary.preflight.checks) {
        const icon = check.passed ? '[PASS]' : check.severity === 'warning' ? '[WARN]' : '[FAIL]';
        lines.push(`- ${icon} **${check.name}** — ${check.detail}`);
    }
    lines.push('');

    lines.push('## Individual Results');
    lines.push('');

    const passed = summary.results.filter(r => r.passed);
    const failed = summary.results.filter(r => !r.passed && !r.error);
    const errored = summary.results.filter(r => r.error !== null);

    if (errored.length > 0) {
        lines.push(`### Errored (${errored.length})`);
        lines.push('');
        for (const r of errored) lines.push(...formatResult(r));
    }

    if (failed.length > 0) {
        lines.push(`### Failed (${failed.length})`);
        lines.push('');
        for (const r of failed) lines.push(...formatResult(r));
    }

    if (passed.length > 0) {
        lines.push(`### Passed (${passed.length})`);
        lines.push('');
        for (const r of passed) lines.push(...formatResult(r));
    }

    return lines.join('\n');
}

function formatResult(r: TestResult): string[] {
    const lines: string[] = [];
    const status = r.error ? 'ERROR' : r.passed ? 'PASS' : 'FAIL';

    lines.push(`#### ${r.item.id}: ${status} [${r.item.difficulty}]`);
    lines.push('');
    lines.push(`**Question:** ${r.item.question}`);
    lines.push(`**Expected substring:** \`${r.item.expectedAnswer}\``);
    lines.push(`**Self-eval:** ${r.selfEvalScore !== null ? `${Math.round(r.selfEvalScore * 100)}%` : 'N/A'}`);
    lines.push(`**Response time:** ${Math.round(r.responseTimeMs / 1000)}s`);
    lines.push(`**Category:** ${r.item.category}`);
    lines.push('');

    if (r.error) {
        lines.push(`**Error:** ${r.error}`);
        lines.push('');
    }

    if (r.responseText) {
        lines.push('**Response (first 500 chars):**');
        lines.push('');
        lines.push('```');
        lines.push(r.responseText);
        lines.push('```');
        lines.push('');
    }

    lines.push('**Diagnostics:**');
    lines.push(`- HyDE generated: ${r.diagnostics.hydeGenerated ? 'yes' : 'no'}`);
    lines.push(`- Sections retrieved: ${r.diagnostics.sectionsRetrieved}`);
    lines.push(`- Facts retrieved: ${r.diagnostics.factsRetrieved}`);
    if (r.diagnostics.errorPhase) lines.push(`- Error phase: ${r.diagnostics.errorPhase}`);
    if (r.diagnostics.errorStack) lines.push(`- Error stack: ${r.diagnostics.errorStack}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    return lines;
}
