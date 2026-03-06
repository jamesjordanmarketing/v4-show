import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Calendar, Cpu } from 'lucide-react';
import type { ModelArtifact } from '../../data/modelArtifactsMockData';
import { getStatusBadge } from '../../data/modelArtifactsMockData';

interface ModelCardHeaderProps {
  model: ModelArtifact;
}

export function ModelCardHeader({ model }: ModelCardHeaderProps) {
  const statusBadge = getStatusBadge(model.status);
  
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
  
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-3xl font-semibold mb-2">{model.name}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="size-4" />
              <span>Created {formatDate(model.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Cpu className="size-4" />
              <span>{model.baseModel}</span>
            </div>
          </div>
        </div>
        
        <Badge className={`${statusBadge.bgColor} ${statusBadge.color} hover:${statusBadge.bgColor}`}>
          {statusBadge.label}
        </Badge>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4 pt-4 border-t">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Training Job</p>
          <p className="text-sm font-medium">#{model.trainingJobId.slice(-8)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Dataset</p>
          <p className="text-sm font-medium">{model.totalTrainingPairs.toLocaleString()} pairs</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Duration</p>
          <p className="text-sm font-medium">{model.trainingDuration}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Total Cost</p>
          <p className="text-sm font-medium">${model.totalCost.toFixed(2)}</p>
        </div>
      </div>
    </Card>
  );
}
