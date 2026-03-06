/**
 * Training Quality Evaluation Card
 * 
 * Displays specialized metrics (Emotional Arc Fidelity, Empathy Score) 
 * shown ONLY in results dashboard (E10), not in configuration or monitoring
 */

'use client';

import { Star, TrendingUp, Heart, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ComparisonMetric } from '@/types/pipeline-evaluation';

interface TrainingQualityEvaluationProps {
  arcCompletionRate: ComparisonMetric;
  empathyFirstRate: ComparisonMetric;
  voiceConsistency: ComparisonMetric;
  overallScore: ComparisonMetric;
}

function MetricRow({
  icon: Icon,
  label,
  metric,
  format = 'percent',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  metric: ComparisonMetric;
  format?: 'percent' | 'score';
}) {
  const value = metric.trained;
  const displayValue = format === 'percent' 
    ? `${(value * 100).toFixed(0)}%` 
    : value.toFixed(1);
  const improvement = metric.absoluteImprovement;
  const improvementDisplay = format === 'percent'
    ? `+${(improvement * 100).toFixed(0)}%`
    : `+${improvement.toFixed(1)}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">{displayValue}</span>
          {improvement > 0 && (
            <Badge variant="secondary" className="text-xs text-green-600 bg-green-100">
              {improvementDisplay}
            </Badge>
          )}
          {metric.meetsTarget && (
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <Progress 
            value={format === 'percent' ? value * 100 : (value / 5) * 100} 
            className="h-2"
          />
        </div>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Baseline: {format === 'percent' 
          ? `${(metric.baseline * 100).toFixed(0)}%` 
          : metric.baseline.toFixed(1)}</span>
        <span>Improvement: {(metric.percentImprovement * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

export function TrainingQualityEvaluation({
  arcCompletionRate,
  empathyFirstRate,
  voiceConsistency,
  overallScore,
}: TrainingQualityEvaluationProps) {
  const allMet = arcCompletionRate.meetsTarget && 
                 empathyFirstRate.meetsTarget && 
                 voiceConsistency.meetsTarget;

  return (
    <Card className={allMet ? 'border-green-500/50' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Training Quality Evaluation</CardTitle>
          {allMet && (
            <Badge className="bg-green-500">All Targets Met</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Claude-as-Judge evaluation comparing trained model to baseline
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <MetricRow
          icon={TrendingUp}
          label="Arc Completion Rate"
          metric={arcCompletionRate}
          format="percent"
        />
        <MetricRow
          icon={Heart}
          label="Empathy First Rate"
          metric={empathyFirstRate}
          format="percent"
        />
        <MetricRow
          icon={MessageCircle}
          label="Voice Consistency"
          metric={voiceConsistency}
          format="percent"
        />
        <MetricRow
          icon={Star}
          label="Overall Score"
          metric={overallScore}
          format="score"
        />
      </CardContent>
    </Card>
  );
}
