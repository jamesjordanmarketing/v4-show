import React from 'react';
import { Card } from '../ui/card';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import type { TrainingMetrics } from '../../data/trainingMonitorMockData';
import { calculateMetricTrend } from '../../data/trainingMonitorMockData';

interface CurrentMetricsTableProps {
  metrics: TrainingMetrics;
  previousMetrics?: TrainingMetrics;
}

export function CurrentMetricsTable({ metrics, previousMetrics }: CurrentMetricsTableProps) {
  const getTrendIcon = (direction: 'up' | 'down' | 'stable', isGoodWhenDown: boolean = false) => {
    const isGood = isGoodWhenDown ? direction === 'down' : direction === 'up';
    
    if (direction === 'stable') {
      return <Minus className="size-4 text-gray-400" />;
    }
    
    const Icon = direction === 'down' ? ArrowDown : ArrowUp;
    const colorClass = isGood ? 'text-green-600' : 'text-red-600';
    
    return <Icon className={`size-4 ${colorClass}`} />;
  };
  
  const formatTrend = (current: number, previous?: number, isGoodWhenDown: boolean = false) => {
    if (!previous) return null;
    
    const trend = calculateMetricTrend(current, previous);
    
    return (
      <div className="flex items-center gap-2">
        {getTrendIcon(trend.direction, isGoodWhenDown)}
        <span className={`text-sm ${
          trend.direction === 'stable' ? 'text-gray-500' : 
          (isGoodWhenDown ? trend.direction === 'down' : trend.direction === 'up') 
            ? 'text-green-600' : 'text-red-600'
        }`}>
          {trend.direction === 'stable' ? '~' : trend.percentChange > 0 ? '+' : ''}
          {trend.percentChange}%
        </span>
      </div>
    );
  };
  
  const MetricRow = ({
    label,
    value,
    unit = '',
    trend,
    isGoodWhenDown = false,
  }: {
    label: string;
    value: string | number;
    unit?: string;
    trend?: React.ReactNode;
    isGoodWhenDown?: boolean;
  }) => (
    <tr className="border-b last:border-0">
      <td className="py-3 pr-4 text-sm text-muted-foreground">{label}</td>
      <td className="py-3 px-4 text-right font-semibold">
        {value}
        {unit && <span className="text-sm text-muted-foreground font-normal ml-1">{unit}</span>}
      </td>
      <td className="py-3 pl-4 text-right">{trend}</td>
    </tr>
  );
  
  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Current Metrics</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="py-2 pr-4 text-left text-sm font-medium text-muted-foreground">
                Metric
              </th>
              <th className="py-2 px-4 text-right text-sm font-medium text-muted-foreground">
                Value
              </th>
              <th className="py-2 pl-4 text-right text-sm font-medium text-muted-foreground">
                Trend
              </th>
            </tr>
          </thead>
          <tbody>
            <MetricRow
              label="Training Loss"
              value={metrics.trainingLoss.toFixed(4)}
              trend={formatTrend(metrics.trainingLoss, previousMetrics?.trainingLoss, true)}
              isGoodWhenDown
            />
            <MetricRow
              label="Validation Loss"
              value={metrics.validationLoss.toFixed(4)}
              trend={formatTrend(metrics.validationLoss, previousMetrics?.validationLoss, true)}
              isGoodWhenDown
            />
            <MetricRow
              label="Learning Rate"
              value={metrics.learningRate.toFixed(6)}
              trend={formatTrend(metrics.learningRate, previousMetrics?.learningRate)}
            />
            <MetricRow
              label="GPU Utilization"
              value={metrics.gpuUtilization}
              unit="%"
              trend={formatTrend(metrics.gpuUtilization, previousMetrics?.gpuUtilization)}
            />
            <MetricRow
              label="GPU Memory"
              value={`${metrics.gpuMemoryUsed}GB / ${metrics.gpuMemoryTotal}GB`}
              unit={`(${Math.round((metrics.gpuMemoryUsed / metrics.gpuMemoryTotal) * 100)}%)`}
            />
            {metrics.perplexity !== undefined && (
              <MetricRow
                label="Perplexity"
                value={metrics.perplexity.toFixed(2)}
                trend={formatTrend(metrics.perplexity, previousMetrics?.perplexity, true)}
                isGoodWhenDown
              />
            )}
            <MetricRow
              label="Tokens/Second"
              value={metrics.tokensPerSecond.toLocaleString()}
              trend={formatTrend(metrics.tokensPerSecond, previousMetrics?.tokensPerSecond)}
            />
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          Metrics update every 60 seconds during training. Trends show change from previous update.
        </p>
      </div>
    </Card>
  );
}
