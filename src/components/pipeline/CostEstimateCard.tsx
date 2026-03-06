/**
 * Cost Estimate Card
 * 
 * Real-time cost calculation based on configuration
 */

'use client';

import { DollarSign, Timer, Cpu, Beaker } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CostEstimateCardProps {
  computeCost: number;
  evaluationCost: number;
  totalCost: number;
  estimatedDuration: string;
  gpuType?: string;
}

export function CostEstimateCard({
  computeCost,
  evaluationCost,
  totalCost,
  estimatedDuration,
  gpuType = 'NVIDIA A40',
}: CostEstimateCardProps) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Estimated Cost</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Total cost - prominent */}
          <div className="text-center py-4 border-b">
            <p className="text-4xl font-bold text-primary">
              ${totalCost.toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Total estimated cost</p>
          </div>

          {/* Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Training Compute</span>
              </div>
              <span className="text-sm font-medium">${computeCost.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Beaker className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Quality Evaluation</span>
              </div>
              <span className="text-sm font-medium">${evaluationCost.toFixed(2)}</span>
            </div>
          </div>

          {/* Duration and GPU */}
          <div className="pt-4 border-t space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-muted-foreground" />
                <span>Estimated Duration</span>
              </div>
              <span className="font-medium">{estimatedDuration}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>GPU Type</span>
              <span>{gpuType}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
