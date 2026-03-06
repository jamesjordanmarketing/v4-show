import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Calendar, Clock, DollarSign, Cpu, CheckCircle, ExternalLink } from 'lucide-react';
import type { ModelArtifact } from '../../data/modelArtifactsMockData';

interface TrainingSummaryCardProps {
  model: ModelArtifact;
  onViewTrainingJob: () => void;
}

export function TrainingSummaryCard({ model, onViewTrainingJob }: TrainingSummaryCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) + ' at ' + date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };
  
  const costComparison = model.totalCost <= model.estimatedCost.max 
    ? 'within' 
    : 'exceeded';
  
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Training Summary</h3>
        <Button variant="ghost" size="sm" onClick={onViewTrainingJob}>
          <ExternalLink className="size-4 mr-2" />
          View Full Training
        </Button>
      </div>
      
      <div className="space-y-4">
        {/* Completion Info */}
        <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="size-5 text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-900">Training Completed</p>
            <p className="text-xs text-green-700">{formatDate(model.createdAt)}</p>
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <Clock className="size-4 text-muted-foreground mt-1" />
            <div>
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="font-medium">{model.trainingDuration}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <DollarSign className="size-4 text-muted-foreground mt-1" />
            <div>
              <p className="text-xs text-muted-foreground">Total Cost</p>
              <p className="font-medium">${model.totalCost.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">
                Est: ${model.estimatedCost.min}-${model.estimatedCost.max}
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Cpu className="size-4 text-muted-foreground mt-1" />
            <div>
              <p className="text-xs text-muted-foreground">GPU Used</p>
              <p className="font-medium">{model.gpuType}</p>
              <Badge 
                variant="outline" 
                className={`text-xs mt-1 ${
                  model.instanceType === 'spot' 
                    ? 'border-green-500 text-green-700' 
                    : 'border-blue-500 text-blue-700'
                }`}
              >
                {model.instanceType === 'spot' ? 'Spot' : 'On-Demand'}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <CheckCircle className="size-4 text-muted-foreground mt-1" />
            <div>
              <p className="text-xs text-muted-foreground">Progress</p>
              <p className="font-medium">
                {model.stepsCompleted.toLocaleString()} / {model.totalSteps.toLocaleString()} steps
              </p>
              <p className="text-xs text-muted-foreground">
                {model.epochsCompleted} / {model.totalEpochs} epochs
              </p>
            </div>
          </div>
        </div>
        
        {/* Cost Comparison */}
        <div className={`p-3 rounded-lg border ${
          costComparison === 'within' 
            ? 'bg-green-50 border-green-200' 
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <p className={`text-xs ${
            costComparison === 'within' ? 'text-green-700' : 'text-yellow-700'
          }`}>
            {costComparison === 'within' 
              ? `✓ Cost ${costComparison} estimate (${Math.round((model.totalCost / model.estimatedCost.max) * 100)}% of max)`
              : `⚠ Cost ${costComparison} estimate by ${(((model.totalCost - model.estimatedCost.max) / model.estimatedCost.max) * 100).toFixed(1)}%`
            }
          </p>
        </div>
      </div>
    </Card>
  );
}
