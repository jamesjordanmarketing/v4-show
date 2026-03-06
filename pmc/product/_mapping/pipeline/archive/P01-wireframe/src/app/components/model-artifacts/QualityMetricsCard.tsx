import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Star, TrendingDown, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import type { ModelArtifact } from '../../data/modelArtifactsMockData';
import {
  getQualityContext,
  getMetricContext,
  calculateImprovement,
} from '../../data/modelArtifactsMockData';

interface QualityMetricsCardProps {
  model: ModelArtifact;
}

export function QualityMetricsCard({ model }: QualityMetricsCardProps) {
  const qualityInfo = getQualityContext(model.qualityRating);
  const lossContext = getMetricContext('loss', model.finalMetrics.validationLoss);
  const perplexityContext = getMetricContext('perplexity', model.finalMetrics.perplexity);
  const improvement = calculateImprovement(
    model.finalMetrics.initialLoss,
    model.finalMetrics.validationLoss
  );
  
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`size-5 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };
  
  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Quality Metrics</h3>
      
      {/* Quality Rating */}
      <div className="mb-6 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {renderStars(model.qualityRating)}
          </div>
          <Badge className={`${qualityInfo.color} bg-transparent border`}>
            {qualityInfo.label}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {qualityInfo.description}
        </p>
      </div>
      
      {/* Metrics Grid */}
      <div className="space-y-4">
        {/* Validation Loss */}
        <div className="p-4 border rounded-lg">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Validation Loss</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="size-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      Measures how well the model performs on unseen data. 
                      Lower is better. Values below 0.5 indicate good performance.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Badge
              variant="outline"
              className={
                lossContext.status === 'excellent' ? 'border-green-500 text-green-700' :
                lossContext.status === 'good' ? 'border-blue-500 text-blue-700' :
                lossContext.status === 'fair' ? 'border-yellow-500 text-yellow-700' :
                'border-red-500 text-red-700'
              }
            >
              {lossContext.description.split(' - ')[0]}
            </Badge>
          </div>
          
          <p className="text-3xl font-bold mb-1">
            {model.finalMetrics.validationLoss.toFixed(4)}
          </p>
          
          <p className="text-xs text-muted-foreground">
            {lossContext.description}
          </p>
        </div>
        
        {/* Perplexity */}
        <div className="p-4 border rounded-lg">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Perplexity</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="size-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      Measures model uncertainty in predictions. Lower is better.
                      Values below 2.0 indicate good language modeling capability.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Badge
              variant="outline"
              className={
                perplexityContext.status === 'excellent' ? 'border-green-500 text-green-700' :
                perplexityContext.status === 'good' ? 'border-blue-500 text-blue-700' :
                perplexityContext.status === 'fair' ? 'border-yellow-500 text-yellow-700' :
                'border-red-500 text-red-700'
              }
            >
              {perplexityContext.description.split(' - ')[0]}
            </Badge>
          </div>
          
          <p className="text-3xl font-bold mb-1">
            {model.finalMetrics.perplexity.toFixed(2)}
          </p>
          
          <p className="text-xs text-muted-foreground">
            {perplexityContext.description}
          </p>
        </div>
        
        {/* Improvement */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="size-4 text-green-600" />
            <span className="text-sm font-medium text-green-900">
              Training Improvement
            </span>
          </div>
          
          <p className="text-sm text-green-800">
            Started at <span className="font-semibold">{model.finalMetrics.initialLoss.toFixed(4)}</span>,
            ended at <span className="font-semibold">{model.finalMetrics.validationLoss.toFixed(4)}</span>
            {' '}({improvement.percentage}% {improvement.label})
          </p>
        </div>
      </div>
    </Card>
  );
}
