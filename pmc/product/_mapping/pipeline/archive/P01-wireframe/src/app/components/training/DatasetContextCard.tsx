import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Database, Star, FileText, ArrowRight } from 'lucide-react';
import type { Dataset } from '../../data/datasetMockData';

interface DatasetContextCardProps {
  dataset: Dataset;
  onChangeDataset: () => void;
}

export function DatasetContextCard({ dataset, onChangeDataset }: DatasetContextCardProps) {
  const getQualityColor = (score: number) => {
    if (score >= 4) return 'text-green-600 bg-green-100';
    if (score >= 3) return 'text-blue-600 bg-blue-100';
    if (score >= 2) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <Card className="p-6 bg-muted/30">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="size-5 text-muted-foreground" />
          <h3 className="font-semibold">Selected Dataset</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onChangeDataset}>
          Change Dataset
          <ArrowRight className="size-4 ml-1" />
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <h4 className="font-medium text-lg mb-1">{dataset.name}</h4>
          <p className="text-sm text-muted-foreground">
            {dataset.vertical} • {dataset.consultantName}, {dataset.consultantTitle}
          </p>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <Badge
            variant={dataset.format === 'brightrun-lora-v4' ? 'default' : 'secondary'}
            className={dataset.format === 'brightrun-lora-v4' ? 'bg-green-500 hover:bg-green-600' : ''}
          >
            {dataset.format}
          </Badge>

          <div className="flex items-center gap-1.5">
            <FileText className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {dataset.totalTrainingPairs.toLocaleString()} training pairs
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Star className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              Quality: 
              <span className={`ml-1 px-2 py-0.5 rounded-md ${getQualityColor(dataset.qualityScore)}`}>
                {dataset.qualityScore.toFixed(1)}/5.0
              </span>
            </span>
          </div>
        </div>

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            This dataset will be used for LoRA fine-tuning. All configuration settings below
            will be applied to this dataset.
          </p>
        </div>
      </div>
    </Card>
  );
}
