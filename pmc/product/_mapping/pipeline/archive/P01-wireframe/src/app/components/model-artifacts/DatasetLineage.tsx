import React from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Database, User, Briefcase, ExternalLink, FileText } from 'lucide-react';
import type { ModelArtifact } from '../../data/modelArtifactsMockData';

interface DatasetLineageProps {
  model: ModelArtifact;
  onViewDataset: () => void;
}

export function DatasetLineage({ model, onViewDataset }: DatasetLineageProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="size-5 text-muted-foreground" />
          <h3 className="font-semibold">Dataset Lineage</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onViewDataset}>
          <ExternalLink className="size-4 mr-2" />
          View Dataset
        </Button>
      </div>
      
      <div className="space-y-4">
        {/* Dataset Name */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">Trained On</p>
          <button
            onClick={onViewDataset}
            className="text-lg font-medium text-blue-600 hover:text-blue-700 hover:underline text-left"
          >
            {model.datasetName}
          </button>
        </div>
        
        {/* Training Pairs */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <FileText className="size-4 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Training Pairs</p>
            <p className="font-semibold">{model.totalTrainingPairs.toLocaleString()}</p>
          </div>
        </div>
        
        {/* Consultant Info */}
        <div>
          <p className="text-sm text-muted-foreground mb-3">Consultant Profile</p>
          <div className="flex items-start gap-3 p-3 border rounded-lg">
            <User className="size-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{model.consultantName}</p>
              <p className="text-sm text-muted-foreground">{model.consultantTitle}</p>
            </div>
          </div>
        </div>
        
        {/* Vertical */}
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Briefcase className="size-4 text-blue-600" />
          <div className="flex-1">
            <p className="text-xs text-blue-700 mb-1">Vertical</p>
            <p className="font-semibold text-blue-900">{model.vertical}</p>
          </div>
        </div>
        
        {/* Scaffolding Coverage */}
        <div>
          <p className="text-sm font-medium mb-3">Scaffolding Coverage</p>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">Persona Coverage</span>
                <span className="font-semibold">{model.scaffoldingCoverage.persona}%</span>
              </div>
              <Progress value={model.scaffoldingCoverage.persona} className="h-2" />
            </div>
            
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">Arc Coverage</span>
                <span className="font-semibold">{model.scaffoldingCoverage.arc}%</span>
              </div>
              <Progress value={model.scaffoldingCoverage.arc} className="h-2" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Lineage Path */}
      <div className="mt-6 pt-4 border-t">
        <p className="text-xs text-muted-foreground mb-2">Complete Lineage Path</p>
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <button
            onClick={onViewDataset}
            className="px-2 py-1 bg-muted hover:bg-muted/80 rounded font-medium"
          >
            Dataset
          </button>
          <span className="text-muted-foreground">→</span>
          <span className="px-2 py-1 bg-muted rounded">Configuration</span>
          <span className="text-muted-foreground">→</span>
          <span className="px-2 py-1 bg-muted rounded">Training</span>
          <span className="text-muted-foreground">→</span>
          <span className="px-2 py-1 bg-blue-500 text-white rounded font-medium">
            Model Artifact
          </span>
        </div>
      </div>
    </Card>
  );
}
