import React from 'react';
import { Card } from '../ui/card';
import { Check, Loader2 } from 'lucide-react';
import type { TrainingStageInfo, TrainingStage } from '../../data/trainingMonitorMockData';
import { getStageDisplayName, formatDuration } from '../../data/trainingMonitorMockData';

interface StageProgressIndicatorProps {
  stages: TrainingStageInfo[];
  currentStage: TrainingStage;
}

export function StageProgressIndicator({ stages, currentStage }: StageProgressIndicatorProps) {
  const getStageColor = (stage: TrainingStageInfo) => {
    switch (stage.status) {
      case 'completed':
        return 'bg-green-500 border-green-500';
      case 'active':
        return 'bg-blue-500 border-blue-500';
      case 'failed':
        return 'bg-red-500 border-red-500';
      default:
        return 'bg-gray-200 border-gray-300';
    }
  };
  
  const getConnectorColor = (index: number) => {
    const stage = stages[index];
    if (stage.status === 'completed') {
      return 'bg-green-500';
    }
    return 'bg-gray-200';
  };
  
  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-6">Training Stages</h3>
      
      {/* Stage progression */}
      <div className="relative">
        {/* Connector lines */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200" />
        <div
          className="absolute top-5 left-0 h-0.5 bg-green-500 transition-all duration-500"
          style={{
            width: `${(stages.filter(s => s.status === 'completed').length / stages.length) * 100}%`,
          }}
        />
        
        {/* Stages */}
        <div className="relative grid grid-cols-4 gap-4">
          {stages.map((stage, index) => (
            <div key={stage.stage} className="flex flex-col items-center">
              {/* Stage Icon */}
              <div
                className={`size-10 rounded-full border-2 flex items-center justify-center ${getStageColor(
                  stage
                )} transition-all duration-300 mb-3 relative z-10`}
              >
                {stage.status === 'completed' && (
                  <Check className="size-5 text-white" />
                )}
                {stage.status === 'active' && (
                  <Loader2 className="size-5 text-white animate-spin" />
                )}
                {stage.status === 'pending' && (
                  <span className="text-xs text-gray-500 font-medium">{index + 1}</span>
                )}
                {stage.status === 'failed' && (
                  <span className="text-white font-bold">✗</span>
                )}
              </div>
              
              {/* Stage Name */}
              <p
                className={`text-sm font-medium text-center mb-1 ${
                  stage.status === 'active' ? 'text-blue-600' : ''
                }`}
              >
                {getStageDisplayName(stage.stage)}
              </p>
              
              {/* Stage Duration */}
              {stage.status === 'completed' && stage.duration && (
                <p className="text-xs text-muted-foreground">
                  {formatDuration(stage.duration)}
                </p>
              )}
              
              {stage.status === 'active' && (
                <p className="text-xs text-blue-600 animate-pulse">In Progress</p>
              )}
              
              {stage.status === 'pending' && (
                <p className="text-xs text-muted-foreground">
                  {stage.estimatedDuration.min}-{stage.estimatedDuration.max}m
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Active Stage Substatus */}
      {stages.find(s => s.status === 'active')?.substatus && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-900">
            {stages.find(s => s.status === 'active')?.substatus}
          </p>
        </div>
      )}
    </Card>
  );
}
