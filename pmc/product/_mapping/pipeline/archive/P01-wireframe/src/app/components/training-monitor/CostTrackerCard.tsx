import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import type { CostInfo } from '../../data/trainingMonitorMockData';

interface CostTrackerCardProps {
  cost: CostInfo;
  instanceType: 'spot' | 'on-demand';
}

export function CostTrackerCard({ cost, instanceType }: CostTrackerCardProps) {
  const getProgressColor = () => {
    if (cost.percentage < 80) return '';
    if (cost.percentage < 100) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  const getAlertLevel = () => {
    if (cost.percentage >= 100) return 'error';
    if (cost.percentage >= 80) return 'warning';
    return 'normal';
  };
  
  const alertLevel = getAlertLevel();
  
  return (
    <Card className={`p-6 ${
      alertLevel === 'error' ? 'border-red-300 border-2 animate-pulse' :
      alertLevel === 'warning' ? 'border-yellow-300 border-2' : ''
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Cost Tracker</h3>
          <p className="text-sm text-muted-foreground">Real-time spending</p>
        </div>
        <Badge
          variant={instanceType === 'spot' ? 'default' : 'secondary'}
          className={instanceType === 'spot' ? 'bg-green-500' : ''}
        >
          {instanceType === 'spot' ? 'Spot' : 'On-Demand'}
        </Badge>
      </div>
      
      {/* Alert Banner */}
      {alertLevel !== 'normal' && (
        <div className={`mb-4 p-3 rounded-lg border ${
          alertLevel === 'error' 
            ? 'bg-red-50 border-red-300' 
            : 'bg-yellow-50 border-yellow-300'
        }`}>
          <div className="flex items-start gap-2">
            <AlertTriangle className={`size-5 shrink-0 mt-0.5 ${
              alertLevel === 'error' ? 'text-red-600' : 'text-yellow-600'
            }`} />
            <div>
              <p className={`text-sm font-semibold ${
                alertLevel === 'error' ? 'text-red-900' : 'text-yellow-900'
              }`}>
                {alertLevel === 'error' ? 'Cost Exceeding Estimate!' : 'Cost Warning'}
              </p>
              <p className={`text-xs ${
                alertLevel === 'error' ? 'text-red-800' : 'text-yellow-800'
              }`}>
                {alertLevel === 'error' 
                  ? 'Current spend has exceeded the original estimate. Consider cancelling if budget is critical.'
                  : 'Current spend is approaching the estimated range. Monitor closely.'}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Current Spend */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm text-muted-foreground">Current Spend</span>
          <div className="flex items-baseline gap-1">
            <DollarSign className="size-5 text-blue-600" />
            <span className="text-3xl font-bold text-blue-600">
              {cost.currentSpend.toFixed(2)}
            </span>
            <span className="text-sm text-muted-foreground">USD</span>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={Math.min(cost.percentage, 100)} className={`h-2 ${getProgressColor()}`} />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {cost.percentage}% of estimate
            </span>
            <span className={`font-semibold ${
              alertLevel === 'error' ? 'text-red-600' :
              alertLevel === 'warning' ? 'text-yellow-600' : 'text-green-600'
            }`}>
              ${cost.estimated.min}-${cost.estimated.max}
            </span>
          </div>
        </div>
      </div>
      
      {/* Cost Breakdown */}
      <div className="space-y-3 pt-4 border-t">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Estimated Range</span>
          <span className="font-medium text-gray-500">
            ${cost.estimated.min}-${cost.estimated.max}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <TrendingUp className="size-3" />
            Hourly Rate
          </span>
          <span className="font-medium">${cost.hourlyRate.toFixed(2)}/hr</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Projected Final</span>
          <span className={`font-semibold ${
            cost.projectedFinal > cost.estimated.max ? 'text-red-600' : 'text-blue-600'
          }`}>
            ${cost.projectedFinal.toFixed(2)}
          </span>
        </div>
      </div>
      
      {/* Info Footer */}
      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          {instanceType === 'spot' 
            ? '⚡ Spot instances offer ~70% savings but may be interrupted'
            : '🔒 On-demand instances guarantee availability without interruption'}
        </p>
      </div>
    </Card>
  );
}
