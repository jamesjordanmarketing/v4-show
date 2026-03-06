import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Settings, ExternalLink } from 'lucide-react';
import type { ModelArtifact } from '../../data/modelArtifactsMockData';
import { getPresetDisplayName } from '../../data/modelArtifactsMockData';

interface ConfigurationReferenceProps {
  model: ModelArtifact;
  onViewConfiguration: () => void;
}

export function ConfigurationReference({ model, onViewConfiguration }: ConfigurationReferenceProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="size-5 text-muted-foreground" />
          <h3 className="font-semibold">Training Configuration</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onViewConfiguration}>
          <ExternalLink className="size-4 mr-2" />
          View Full Config
        </Button>
      </div>
      
      <div className="space-y-4">
        {/* Preset */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">Preset Used</p>
          <Badge className="bg-blue-500 hover:bg-blue-600">
            {getPresetDisplayName(model.presetUsed)} Preset
          </Badge>
        </div>
        
        {/* Key Hyperparameters */}
        <div>
          <p className="text-sm font-medium mb-3">Key Hyperparameters</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">LoRA Rank (r)</p>
              <p className="text-lg font-semibold">{model.hyperparameters.loraRank}</p>
            </div>
            
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">LoRA Alpha (α)</p>
              <p className="text-lg font-semibold">{model.hyperparameters.loraAlpha}</p>
            </div>
            
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Dropout</p>
              <p className="text-lg font-semibold">{model.hyperparameters.loraDropout}</p>
            </div>
            
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Batch Size</p>
              <p className="text-lg font-semibold">{model.hyperparameters.batchSize}</p>
            </div>
          </div>
        </div>
        
        {/* Learning Rate */}
        <div className="p-3 border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Learning Rate</p>
              <p className="font-semibold">{model.hyperparameters.learningRate}</p>
            </div>
            <Badge variant="outline">Cosine Schedule</Badge>
          </div>
        </div>
        
        {/* Epochs */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700 mb-1">Number of Epochs</p>
          <p className="text-lg font-semibold text-blue-900">
            {model.hyperparameters.numEpochs}
          </p>
        </div>
      </div>
    </Card>
  );
}
