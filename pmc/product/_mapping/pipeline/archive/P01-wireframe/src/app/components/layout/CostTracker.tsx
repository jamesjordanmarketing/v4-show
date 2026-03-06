import React, { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { cn } from '../ui/utils';
import type { CostData } from '../../data/mockData';

interface CostTrackerProps {
  costData: CostData;
  onViewDetails?: () => void;
}

export function CostTracker({ costData, onViewDetails }: CostTrackerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const TrendIcon = costData.trend === 'up' ? TrendingUp : TrendingDown;
  const trendColor = costData.trend === 'up' ? 'text-amber-500' : 'text-green-500';

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3"
      >
        <DollarSign className="size-4" />
        <span className="hidden lg:inline">
          ${costData.currentMonth.toFixed(2)}
        </span>
        <span className={cn("hidden lg:inline text-xs", trendColor)}>
          {costData.trend === 'up' ? '+' : '-'}{costData.trendPercentage}%
        </span>
      </Button>

      {/* Dropdown Panel */}
      {isExpanded && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsExpanded(false)}
          />
          
          {/* Dropdown Content */}
          <div className="absolute top-full right-0 mt-2 w-[320px] bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Monthly Costs</h3>
                <TrendIcon className={cn("size-5", trendColor)} />
              </div>

              {/* Total Cost */}
              <div className="mb-4">
                <div className="text-3xl font-bold mb-1">
                  ${costData.currentMonth.toFixed(2)}
                </div>
                <div className={cn("text-sm flex items-center gap-1", trendColor)}>
                  {costData.trend === 'up' ? (
                    <>
                      <TrendingUp className="size-4" />
                      <span>Up {costData.trendPercentage}% from last month</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="size-4" />
                      <span>Down {costData.trendPercentage}% from last month</span>
                    </>
                  )}
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="space-y-3 mb-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Training</span>
                    <span className="font-medium">${costData.breakdown.training.toFixed(2)}</span>
                  </div>
                  <Progress 
                    value={(costData.breakdown.training / costData.currentMonth) * 100} 
                    className="h-1.5"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Storage</span>
                    <span className="font-medium">${costData.breakdown.storage.toFixed(2)}</span>
                  </div>
                  <Progress 
                    value={(costData.breakdown.storage / costData.currentMonth) * 100} 
                    className="h-1.5"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">API Calls</span>
                    <span className="font-medium">${costData.breakdown.api.toFixed(2)}</span>
                  </div>
                  <Progress 
                    value={(costData.breakdown.api / costData.currentMonth) * 100} 
                    className="h-1.5"
                  />
                </div>
              </div>

              {/* Action Button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  onViewDetails?.();
                  setIsExpanded(false);
                }}
              >
                View Detailed Report
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
