import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { HelpCircle, TrendingUp, Clock, DollarSign } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import type { CostBreakdown } from '../../data/trainingConfigMockData';

interface CostEstimationPanelProps {
  costBreakdown: CostBreakdown;
  instanceType: 'spot' | 'on-demand';
}

export function CostEstimationPanel({ costBreakdown, instanceType }: CostEstimationPanelProps) {
  return (
    <Card className="p-6 border-2 border-blue-200 bg-blue-50/30">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Cost Estimation</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-1 hover:bg-muted rounded-full">
                <HelpCircle className="size-4 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">
                Cost estimates include base training, storage, and a buffer for unexpected overhead.
                Actual costs may vary based on training duration and resource usage.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Total Cost - Prominent Display */}
      <div className="mb-6 p-4 bg-white rounded-lg border-2 border-blue-300">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm text-muted-foreground">Estimated Total Cost</span>
          <Badge
            variant={instanceType === 'spot' ? 'default' : 'secondary'}
            className={instanceType === 'spot' ? 'bg-green-500' : 'bg-blue-500'}
          >
            {instanceType === 'spot' ? 'Spot Instance' : 'On-Demand'}
          </Badge>
        </div>
        <div className="flex items-baseline gap-2">
          <DollarSign className="size-6 text-blue-600" />
          <span className="text-4xl font-bold text-blue-600">
            {costBreakdown.total.min}
          </span>
          <span className="text-2xl text-blue-600">-</span>
          <span className="text-4xl font-bold text-blue-600">
            {costBreakdown.total.max}
          </span>
          <span className="text-xl text-muted-foreground ml-1">USD</span>
        </div>
      </div>

      {/* Duration Estimate */}
      <div className="mb-4 p-3 bg-white rounded-lg border">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Estimated Duration</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold">
            {costBreakdown.duration.min}-{costBreakdown.duration.max}
          </span>
          <span className="text-sm text-muted-foreground">hours</span>
        </div>
      </div>

      {/* Hourly Rate */}
      <div className="mb-4 p-3 bg-white rounded-lg border">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Hourly Rate</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold">
            ${costBreakdown.hourlyRate.toFixed(2)}
          </span>
          <span className="text-sm text-muted-foreground">/hour</span>
        </div>
      </div>

      <Separator className="my-4" />

      {/* Cost Breakdown */}
      <div>
        <h4 className="text-sm font-medium mb-3">Cost Breakdown</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Base Training</span>
            <span className="font-medium">
              ${Math.round(costBreakdown.baseTraining)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Storage & I/O</span>
            <span className="font-medium">${costBreakdown.storage}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Buffer (uncertainty)</span>
            <span className="font-medium">${costBreakdown.buffer}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between font-semibold">
            <span>Total Range</span>
            <span className="text-blue-600">
              ${costBreakdown.total.min}-${costBreakdown.total.max}
            </span>
          </div>
        </div>
      </div>

      {/* Why a range? */}
      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <HelpCircle className="size-3" />
                Why a cost range?
              </p>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">
                Training duration varies based on convergence speed, checkpoint frequency,
                and system performance. We provide a range to account for this variability.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <p className="text-xs text-muted-foreground mt-1">
          Actual duration depends on convergence and system performance
        </p>
      </div>

      {/* Spot Instance Warning */}
      {instanceType === 'spot' && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-800 font-medium mb-1">
            ⚠️ Spot Instance Cost Savings
          </p>
          <p className="text-xs text-yellow-700">
            Spot instances are ~70% cheaper but may be interrupted. Training automatically
            resumes from checkpoints.
          </p>
        </div>
      )}
    </Card>
  );
}
