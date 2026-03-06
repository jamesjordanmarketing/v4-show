'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    Play,
    Loader2,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    ChevronDown,
    ChevronRight,
    ArrowLeft,
    Bug,
    Zap,
    Download,
    Save,
    History,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type {
    TestRunSummary,
    TestResult,
    PreflightCheck,
    PreflightResult,
} from '@/lib/rag/testing/golden-set-definitions';

// ---- Summary computation (moved from server to client) ----

function computeSummary(
    runId: string,
    startedAt: string,
    startTime: number,
    preflight: PreflightResult | null,
    results: TestResult[]
): TestRunSummary {
    const totalPassed = results.filter(r => r.passed).length;
    const totalErrored = results.filter(r => r.error !== null).length;
    const totalFailed = results.length - totalPassed;
    const passRate = results.length > 0 ? Math.round((totalPassed / results.length) * 100) : 0;

    const easyResults = results.filter(r => r.item.difficulty === 'easy');
    const mediumResults = results.filter(r => r.item.difficulty === 'medium');
    const hardResults = results.filter(r => r.item.difficulty === 'hard');

    const avgResponseTimeMs = results.length > 0
        ? Math.round(results.reduce((sum, r) => sum + r.responseTimeMs, 0) / results.length)
        : 0;

    const scoresWithValues = results.filter(r => r.selfEvalScore !== null);
    const avgSelfEvalScore = scoresWithValues.length > 0
        ? scoresWithValues.reduce((sum, r) => sum + (r.selfEvalScore || 0), 0) / scoresWithValues.length
        : 0;

    return {
        runId,
        startedAt,
        completedAt: new Date().toISOString(),
        totalDurationMs: Date.now() - startTime,
        preflight: preflight || { passed: true, checks: [] },
        totalPassed,
        totalFailed,
        totalErrored,
        passRate,
        meetsTarget: passRate >= 85,
        breakdown: {
            easy: { passed: easyResults.filter(r => r.passed).length, total: easyResults.length },
            medium: { passed: mediumResults.filter(r => r.passed).length, total: mediumResults.length },
            hard: { passed: hardResults.filter(r => r.passed).length, total: hardResults.length },
        },
        avgResponseTimeMs,
        avgSelfEvalScore,
        results,
    };
}

// ---- Page Component ----

export default function GoldenSetTestPage() {
    const router = useRouter();
    const [isRunning, setIsRunning] = useState(false);
    const [summary, setSummary] = useState<TestRunSummary | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<'results' | 'diagnostics'>('results');
    const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; completed: number } | null>(null);
    const [selectedRunId, setSelectedRunId] = useState<string | undefined>(undefined);
    const [selectedDocumentId, setSelectedDocumentId] = useState<string | undefined>(undefined);
    const [embeddingRuns, setEmbeddingRuns] = useState<any[]>([]);
    const [untaggedCount, setUntaggedCount] = useState<number>(0);
    const [historicalReports, setHistoricalReports] = useState<any[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    const toggleExpand = (id: string) => {
        setExpandedItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Fetch embedding runs and historical reports on mount
    useEffect(() => {
        fetch('/api/rag/test/golden-set/runs')
            .then(res => res.json())
            .then(json => {
                if (json.success) {
                    setEmbeddingRuns(json.data.runs || []);
                    setUntaggedCount(json.data.untaggedCount || 0);
                }
            })
            .catch(() => {});

        // Historical reports require documentId — fetched when document is selected
        // (see useEffect below that responds to selectedDocumentId changes)
    }, []);

    // Refresh historical reports when the selected document changes
    useEffect(() => {
        if (!selectedDocumentId) {
            setHistoricalReports([]);
            return;
        }
        fetch(`/api/rag/test/golden-set/reports?documentId=${selectedDocumentId}`)
            .then(res => res.json())
            .then(json => {
                if (json.success) {
                    setHistoricalReports(json.data || []);
                }
            })
            .catch(() => {});
    }, [selectedDocumentId]);

    const runTest = async () => {
        setIsRunning(true);
        setSummary(null);
        setError(null);
        setExpandedItems(new Set());

        const runId = crypto.randomUUID();
        const startedAt = new Date().toISOString();
        const startTime = Date.now();
        const allResults: TestResult[] = [];
        let preflight: PreflightResult | null = null;
        // 20 questions / 2 per batch = 10 batches (batch size reduced from 4→2 to avoid timeout)
        const TOTAL_BATCHES = 10;

        // Validate a document is selected before starting
        if (!selectedDocumentId) {
            setError('Select a document before running the golden test.');
            setIsRunning(false);
            return;
        }

        try {
            for (let batch = 0; batch < TOTAL_BATCHES; batch++) {
                setBatchProgress({
                    current: batch,
                    total: TOTAL_BATCHES,
                    completed: allResults.length,
                });

                const res = await fetch('/api/rag/test/golden-set', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ batch, runId: selectedRunId, documentId: selectedDocumentId }),
                });

                // Guard against non-200 responses (e.g. 504 timeout HTML) before calling res.json()
                if (!res.ok) {
                    setError(`Batch ${batch + 1} failed: HTTP ${res.status} ${res.statusText}`);
                    break;
                }

                const json = await res.json();

                if (!json.success) {
                    setError(json.error || `Batch ${batch + 1} failed`);
                    // Keep results from earlier batches
                    break;
                }

                // Capture preflight from batch 0
                if (batch === 0 && json.data.preflight) {
                    preflight = json.data.preflight;
                    if (!preflight.passed) {
                        // Show preflight failure with a partial summary
                        const partialSummary = computeSummary(runId, startedAt, startTime, preflight, []);
                        if (selectedRunId) partialSummary.embeddingRunId = selectedRunId;
                        setSummary(partialSummary);
                        return;
                    }
                }

                allResults.push(...json.data.results);
            }

            // Compute final summary client-side
            if (allResults.length > 0) {
                const finalSummary = computeSummary(runId, startedAt, startTime, preflight, allResults);
                if (selectedRunId) finalSummary.embeddingRunId = selectedRunId;
                setSummary(finalSummary);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Network error');
            // Still compute partial summary if we have results
            if (allResults.length > 0) {
                const partialSummary = computeSummary(runId, startedAt, startTime, preflight, allResults);
                if (selectedRunId) partialSummary.embeddingRunId = selectedRunId;
                setSummary(partialSummary);
            }
        } finally {
            setIsRunning(false);
            setBatchProgress(null);
        }
    };

    const downloadReport = async () => {
        if (!summary) return;
        try {
            const res = await fetch('/api/rag/test/golden-set/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(summary),
            });
            if (!res.ok) { setError('Failed to generate report'); return; }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `golden-set-report-${summary.runId.slice(0, 8)}.md`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Report download failed');
        }
    };

    const saveReport = async () => {
        if (!summary) return;
        setIsSaving(true);
        setSaveMessage(null);
        try {
            const res = await fetch('/api/rag/test/golden-set/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    summary,
                    embeddingRunId: selectedRunId || null,
                    documentId: selectedDocumentId || null,
                }),
            });
            const json = await res.json();
            if (json.success) {
                setSaveMessage('Report saved successfully');
                // Refresh history
                const histRes = await fetch('/api/rag/test/golden-set/reports');
                const histJson = await histRes.json();
                if (histJson.success) setHistoricalReports(histJson.data || []);
            } else {
                setSaveMessage(`Failed to save: ${json.error}`);
            }
        } catch (err) {
            setSaveMessage(err instanceof Error ? err.message : 'Save failed');
        } finally {
            setIsSaving(false);
        }
    };

    const downloadHistoricalReport = (report: any) => {
        const lines: string[] = [
            '# RAG Golden-Set Regression Test Report (Historical)',
            '',
            `**Saved:** ${new Date(report.created_at).toLocaleString()}`,
            `**Result:** ${report.meets_target ? 'PASS' : 'FAIL'} (target: >=85%)`,
            '',
            '## Summary',
            '',
            '| Metric | Value |',
            '|--------|-------|',
            `| Pass Rate | ${report.pass_rate}% |`,
            `| Passed | ${report.total_passed} |`,
            `| Failed | ${report.total_failed} |`,
            `| Errored | ${report.total_errored} |`,
            `| Avg Response Time | ${Math.round(report.avg_response_time_ms / 1000)}s |`,
            `| Avg Self-Eval Score | ${Math.round(report.avg_self_eval_score * 100)}% |`,
            `| Total Duration | ${Math.round(report.total_duration_ms / 1000)}s |`,
            '',
        ];
        if (report.embedding_run_id) {
            lines.push(`**Embedding Run:** ${report.embedding_run_id}`);
            lines.push('');
        }
        if (report.notes) {
            lines.push(`**Notes:** ${report.notes}`);
            lines.push('');
        }
        lines.push('*Full per-question results not included in historical summary. Run a new test to export complete results.*');

        const markdown = lines.join('\n');
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `golden-set-report-${new Date(report.created_at).toISOString().slice(0, 10)}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const erroredResults = summary?.results.filter(r => r.error !== null) || [];
    const errorsByPhase = erroredResults.reduce<Record<string, number>>((acc, r) => {
        const phase = r.diagnostics.errorPhase || 'unknown';
        acc[phase] = (acc[phase] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Bug className="h-6 w-6" />
                        <div>
                            <h1 className="text-2xl font-bold">RAG Golden-Set Regression Test</h1>
                            <p className="text-sm text-muted-foreground">
                                20 Q&A pairs against Sun Chip Bank document. Target: ≥85% pass rate.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => router.push('/rag')}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            RAG
                        </Button>
                        {/* Embedding Run Selector */}
                        <select
                            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                            value={selectedRunId || ''}
                            onChange={(e) => {
                                const runId = e.target.value || undefined;
                                setSelectedRunId(runId);
                                if (runId) {
                                    const run = embeddingRuns.find((r: any) => r.id === runId);
                                    setSelectedDocumentId(run?.documentId || undefined);
                                } else {
                                    setSelectedDocumentId(undefined);
                                }
                            }}
                            disabled={isRunning}
                        >
                            <option value="">All embeddings (no filter)</option>
                            {embeddingRuns.map((run: any) => (
                                <option key={run.id} value={run.id}>
                                    {(run.documentName || run.documentId?.slice(0, 8) || 'doc').slice(0, 30)}{' '}
                                    — {new Date(run.startedAt).toLocaleDateString()}{' '}
                                    {new Date(run.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                                    — {run.embeddingCount} emb ({run.pipelineVersion})
                                </option>
                            ))}
                            {untaggedCount > 0 && (
                                <option value="__untagged__" disabled>
                                    {untaggedCount} untagged (legacy) — cannot filter
                                </option>
                            )}
                        </select>
                        <Button
                            onClick={runTest}
                            disabled={isRunning || !selectedDocumentId}
                            title={!selectedDocumentId ? 'Select a document first' : undefined}
                        >
                            {isRunning ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Running...
                                </>
                            ) : (
                                <>
                                    <Play className="h-4 w-4 mr-2" />
                                    Run Test
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6 space-y-6">
                {/* Running indicator with batch progress */}
                {isRunning && batchProgress && (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                                <span className="text-sm">
                                    Running batch {batchProgress.current + 1} of {batchProgress.total}...
                                    ({batchProgress.completed} of 20 queries complete)
                                </span>
                            </div>
                            <Progress
                                value={(batchProgress.current / batchProgress.total) * 100}
                                className="mt-3"
                            />
                        </CardContent>
                    </Card>
                )}

                {/* Error display */}
                {error && (
                    <Card className="border-red-500">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 text-red-600">
                                <XCircle className="h-5 w-5" />
                                <span className="font-medium">Test Failed</span>
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
                        </CardContent>
                    </Card>
                )}

                {/* History Toggle — always visible, loads independently of test run */}
                <div className="flex justify-end">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowHistory(!showHistory)}
                    >
                        <History className="h-4 w-4 mr-1" />
                        History ({historicalReports.length})
                    </Button>
                </div>

                {/* History Panel */}
                {showHistory && historicalReports.length > 0 && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <History className="h-4 w-4" />
                                Test History
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {historicalReports.map((report: any) => (
                                    <div
                                        key={report.id}
                                        className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm"
                                    >
                                        <div className="flex items-center gap-3">
                                            {report.meets_target ? (
                                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-red-600" />
                                            )}
                                            <div>
                                                <div className="font-medium">
                                                    {new Date(report.created_at).toLocaleDateString()}{' '}
                                                    {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {report.total_passed}/{report.total_passed + report.total_failed} passed
                                                    {report.notes && ` — ${report.notes}`}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Badge variant={report.meets_target ? 'default' : 'destructive'}>
                                                {report.pass_rate}%
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {Math.round(report.total_duration_ms / 1000)}s
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0"
                                                onClick={() => downloadHistoricalReport(report)}
                                                title="Download summary report"
                                            >
                                                <Download className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Pre-flight Checks */}
                {summary && (
                    <PreflightPanel checks={summary.preflight.checks} passed={summary.preflight.passed} />
                )}

                {/* Summary Card */}
                {summary && summary.results.length > 0 && (
                    <SummaryCard
                        summary={summary}
                        onDownloadReport={downloadReport}
                        onSaveReport={saveReport}
                        isSaving={isSaving}
                        saveMessage={saveMessage}
                    />
                )}

                {/* Tab bar: Results / Diagnostics */}
                {summary && summary.results.length > 0 && (
                    <>
                        <div className="flex gap-2 border-b">
                            <button
                                onClick={() => setActiveTab('results')}
                                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === 'results'
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                All Results ({summary.results.length})
                            </button>
                            {erroredResults.length > 0 && (
                                <button
                                    onClick={() => setActiveTab('diagnostics')}
                                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === 'diagnostics'
                                        ? 'border-red-500 text-red-600'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    <Bug className="h-3 w-3 inline mr-1" />
                                    Errors ({erroredResults.length})
                                </button>
                            )}
                        </div>

                        {activeTab === 'results' && (
                            <div className="space-y-2">
                                {summary.results.map(result => (
                                    <ResultRow
                                        key={result.item.id}
                                        result={result}
                                        expanded={expandedItems.has(result.item.id)}
                                        onToggle={() => toggleExpand(result.item.id)}
                                    />
                                ))}
                            </div>
                        )}

                        {activeTab === 'diagnostics' && (
                            <div className="space-y-4">
                                {/* Error phase summary */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Error Breakdown by Phase</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {Object.entries(errorsByPhase).map(([phase, count]) => (
                                                <div key={phase} className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                                                    <div className="text-sm font-mono font-medium text-red-700 dark:text-red-400">{phase}</div>
                                                    <div className="text-2xl font-bold text-red-600">{count}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Errored results */}
                                <div className="space-y-2">
                                    {erroredResults.map(result => (
                                        <ResultRow
                                            key={result.item.id}
                                            result={result}
                                            expanded={expandedItems.has(result.item.id)}
                                            onToggle={() => toggleExpand(result.item.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// ---- Sub-Components ----

function PreflightPanel({ checks, passed }: { checks: PreflightCheck[]; passed: boolean }) {
    return (
        <Card className={passed ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}>
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    {passed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    Pre-Flight Checks
                </CardTitle>
            </CardHeader>
            <CardContent>
                {!passed && (
                    <div className="mb-3 p-2 rounded bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-sm">
                        Critical preflight check failed. Test cannot proceed until all critical checks pass.
                    </div>
                )}
                <div className="space-y-2">
                    {checks.map((check, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                            {check.passed ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            ) : check.severity === 'warning' ? (
                                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            ) : (
                                <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                            )}
                            <div>
                                <span className="font-medium">{check.name}</span>
                                <span className="text-muted-foreground ml-2">{check.detail}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

function SummaryCard({ summary, onDownloadReport, onSaveReport, isSaving, saveMessage }: {
    summary: TestRunSummary;
    onDownloadReport: () => void;
    onSaveReport: () => void;
    isSaving: boolean;
    saveMessage: string | null;
}) {
    const borderColor = summary.meetsTarget
        ? 'border-green-300 dark:border-green-700'
        : 'border-red-300 dark:border-red-700';

    return (
        <Card className={borderColor}>
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Test Summary
                    </span>
                    <Badge variant={summary.meetsTarget ? 'default' : 'destructive'}>
                        {summary.meetsTarget ? 'PASS' : 'FAIL'}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <StatBlock label="Passed" value={summary.totalPassed} color="text-green-600" />
                    <StatBlock label="Failed" value={summary.totalFailed} color="text-red-600" />
                    <StatBlock label="Errored" value={summary.totalErrored} color="text-orange-600" />
                    <StatBlock label="Pass Rate" value={`${summary.passRate}%`} color={summary.meetsTarget ? 'text-green-600' : 'text-red-600'} />
                    <StatBlock label="Avg Time" value={`${Math.round(summary.avgResponseTimeMs / 1000)}s`} />
                    <StatBlock label="Avg Self-Eval" value={`${Math.round(summary.avgSelfEvalScore * 100)}%`} />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                    <DifficultyBlock label="Easy" passed={summary.breakdown.easy.passed} total={summary.breakdown.easy.total} />
                    <DifficultyBlock label="Medium" passed={summary.breakdown.medium.passed} total={summary.breakdown.medium.total} />
                    <DifficultyBlock label="Hard" passed={summary.breakdown.hard.passed} total={summary.breakdown.hard.total} />
                </div>
                <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-muted-foreground">
                        Duration: {Math.round(summary.totalDurationMs / 1000)}s | Run ID: {summary.runId.slice(0, 8)}...
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={onDownloadReport}>
                            <Download className="h-3 w-3 mr-1" />
                            Download .md
                        </Button>
                        <Button variant="outline" size="sm" onClick={onSaveReport} disabled={isSaving}>
                            {isSaving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                            Save Report
                        </Button>
                    </div>
                </div>
                {saveMessage && (
                    <p className={`text-xs mt-1 ${saveMessage.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                        {saveMessage}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

function StatBlock({ label, value, color }: { label: string; value: string | number; color?: string }) {
    return (
        <div className="text-center">
            <div className={`text-2xl font-bold ${color || ''}`}>{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
        </div>
    );
}

function DifficultyBlock({ label, passed, total }: { label: string; passed: number; total: number }) {
    const rate = total > 0 ? Math.round((passed / total) * 100) : 0;
    return (
        <div className="p-2 rounded-lg bg-muted/50 text-center">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="font-semibold">{passed}/{total}</div>
            <div className="text-xs text-muted-foreground">{rate}%</div>
        </div>
    );
}

function ResultRow({ result, expanded, onToggle }: { result: TestResult; expanded: boolean; onToggle: () => void }) {
    const difficultyColors: Record<string, string> = {
        easy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        hard: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };

    return (
        <Card className="overflow-hidden">
            <button
                onClick={onToggle}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors"
            >
                {result.error ? (
                    <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                ) : result.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                ) : (
                    <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                )}
                <span className="text-sm flex-1 truncate">{result.item.question}</span>
                <Badge variant="outline" className={`text-xs ${difficultyColors[result.item.difficulty] || ''}`}>
                    {result.item.difficulty}
                </Badge>
                <span className="text-xs text-muted-foreground w-16 text-right">
                    {Math.round(result.responseTimeMs / 1000)}s
                </span>
                {expanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
            </button>

            {expanded && (
                <div className="px-4 pb-4 pt-0 border-t space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-muted-foreground">Expected substring: </span>
                            <code className="bg-muted px-1 rounded">{result.item.expectedAnswer}</code>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Self-eval: </span>
                            {result.selfEvalScore !== null
                                ? `${Math.round(result.selfEvalScore * 100)}%`
                                : 'N/A'}
                        </div>
                    </div>

                    {result.responseText && (
                        <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1">Response (first 500 chars):</div>
                            <div className="text-sm p-2 rounded bg-muted/50 whitespace-pre-wrap max-h-40 overflow-y-auto">
                                {result.responseText}
                            </div>
                        </div>
                    )}

                    {/* Diagnostics */}
                    <div className="text-xs space-y-1 p-2 rounded bg-muted/30">
                        <div className="font-medium text-muted-foreground mb-1">Diagnostics</div>
                        <div>HyDE generated: {result.diagnostics.hydeGenerated ? 'yes' : 'no'}</div>
                        <div>Sections retrieved: {result.diagnostics.sectionsRetrieved}</div>
                        <div>Facts retrieved: {result.diagnostics.factsRetrieved}</div>
                        {result.diagnostics.errorPhase && (
                            <div className="text-red-600 font-medium">
                                Error phase: {result.diagnostics.errorPhase}
                            </div>
                        )}
                    </div>

                    {/* Error stack (collapsible) */}
                    {result.diagnostics.errorStack && (
                        <details className="text-xs">
                            <summary className="cursor-pointer text-red-600 font-medium">
                                Error Stack Trace
                            </summary>
                            <pre className="mt-1 p-2 rounded bg-red-50 dark:bg-red-950/20 overflow-x-auto text-red-700 dark:text-red-400 whitespace-pre-wrap">
                                {result.diagnostics.errorStack}
                            </pre>
                        </details>
                    )}
                </div>
            )}
        </Card>
    );
}
