'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BarChart3, TrendingUp } from 'lucide-react';
import { useRAGQualitySummary, useRAGQualityScores } from '@/hooks/useRAGQuality';

interface QualityDashboardProps {
  documentId: string;
}

const metricLabels: Record<string, string> = {
  faithfulness: 'Faithfulness',
  answerRelevance: 'Answer Relevance',
  contextRelevance: 'Context Relevance',
  completeness: 'Completeness',
  citationAccuracy: 'Citation Accuracy',
};

const metricWeights: Record<string, number> = {
  faithfulness: 0.30,
  answerRelevance: 0.25,
  contextRelevance: 0.20,
  completeness: 0.15,
  citationAccuracy: 0.10,
};

function ScoreBar({ label, score, weight }: { label: string; score: number; weight: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? 'bg-green-600' : pct >= 60 ? 'bg-yellow-600' : 'bg-red-600';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>{label} <span className="text-xs text-muted-foreground">({(weight * 100).toFixed(0)}%)</span></span>
        <span className="font-mono font-medium">{pct}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function QualityDashboard({ documentId }: QualityDashboardProps) {
  const { data: summary, isLoading: summaryLoading } = useRAGQualitySummary(documentId);
  const { data: scores, isLoading: scoresLoading } = useRAGQualityScores(documentId);

  const isLoading = summaryLoading || scoresLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading quality data...</span>
      </div>
    );
  }

  if (!summary || summary.queryCount === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No quality evaluations yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Chat with the document and evaluate responses to see quality metrics.</p>
        </CardContent>
      </Card>
    );
  }

  const compositePct = Math.round(summary.averageComposite * 100);
  const compositeColor = compositePct >= 80 ? 'text-green-600' : compositePct >= 60 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="space-y-4">
      {/* Composite Score */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            RAG Quality Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className={`text-4xl font-bold font-mono ${compositeColor}`}>
              {compositePct}%
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Composite score across {summary.queryCount} evaluated queries</p>
              <p className="text-xs mt-1">
                Weighted: 30% Faithfulness · 25% Answer Relevance · 20% Context Relevance · 15% Completeness · 10% Citation Accuracy
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-Metric Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Metric Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(summary.breakdown).map(([key, score]) => (
            <ScoreBar
              key={key}
              label={metricLabels[key] || key}
              score={score}
              weight={metricWeights[key] || 0}
            />
          ))}
        </CardContent>
      </Card>

      {/* Recent Evaluations */}
      {scores && scores.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recent Evaluations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {scores.slice(0, 10).map((score) => (
                <div key={score.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                  <span className="text-muted-foreground">
                    {new Date(score.evaluatedAt).toLocaleDateString()}
                  </span>
                  <span className="font-mono font-medium">
                    {Math.round((score.compositeScore || 0) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
