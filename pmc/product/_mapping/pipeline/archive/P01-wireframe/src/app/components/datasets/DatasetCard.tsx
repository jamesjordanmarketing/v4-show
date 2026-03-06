import React from 'react';
import { MessageSquare, FileText, Star, CheckCircle, AlertTriangle, ChevronRight } from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import type { Dataset } from '../../data/datasetMockData';
import { PERSONAS } from '../../data/datasetMockData';

interface DatasetCardProps {
  dataset: Dataset;
  onViewDetails: (dataset: Dataset) => void;
  onStartTraining: (dataset: Dataset) => void;
}

export function DatasetCard({ dataset, onViewDetails, onStartTraining }: DatasetCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getQualityColor = (score: number) => {
    if (score >= 4) return 'text-green-600';
    if (score >= 3) return 'text-blue-600';
    if (score >= 2) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityBgColor = (score: number) => {
    if (score >= 4) return 'bg-green-50';
    if (score >= 3) return 'bg-blue-50';
    if (score >= 2) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  // Calculate scaffolding distribution percentages by persona
  const personaDistribution = PERSONAS.map(persona => {
    const count = dataset.scaffoldingDistribution
      .filter(s => s.persona === persona.id)
      .reduce((sum, s) => sum + s.count, 0);
    const percentage = (count / dataset.totalTrainingPairs) * 100;
    return { ...persona, count, percentage };
  });

  return (
    <Card className="p-6 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 mr-2">
          <h3 className="font-semibold text-lg truncate mb-1" title={dataset.name}>
            {dataset.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            Created {formatDate(dataset.createdAt)}
          </p>
        </div>
        <Badge
          variant={dataset.format === 'brightrun-lora-v4' ? 'default' : 'secondary'}
          className={dataset.format === 'brightrun-lora-v4' ? 'bg-green-500 hover:bg-green-600' : ''}
        >
          {dataset.format === 'brightrun-lora-v4' ? 'v4' : 'v3'}
        </Badge>
      </div>

      {/* Metrics Row 1 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Conversations</p>
            <p className="font-semibold">{dataset.totalConversations.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Training Pairs</p>
            <p className="font-semibold">{dataset.totalTrainingPairs.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Star className={`size-4 ${getQualityColor(dataset.qualityScore)}`} />
          <div>
            <p className="text-xs text-muted-foreground">Quality</p>
            <p className={`font-semibold ${getQualityColor(dataset.qualityScore)}`}>
              {dataset.qualityScore.toFixed(1)}/5.0
            </p>
          </div>
        </div>
      </div>

      {/* Vertical & Consultant */}
      <div className="mb-4 space-y-2">
        <Badge variant="outline" className="text-xs">
          {dataset.vertical}
        </Badge>
        <p className="text-sm text-muted-foreground">
          {dataset.consultantName}, {dataset.consultantTitle}
        </p>
      </div>

      {/* Training Readiness */}
      <div className="mb-4">
        {dataset.trainingReady ? (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-md border border-green-200">
            <CheckCircle className="size-4" />
            <span className="text-sm font-medium">Ready for Training</span>
          </div>
        ) : (
          <div className="flex items-start gap-2 text-yellow-600 bg-yellow-50 px-3 py-2 rounded-md border border-yellow-200">
            <AlertTriangle className="size-4 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium mb-1">Review Recommended</p>
              <ul className="text-xs space-y-1">
                {dataset.readinessIssues.map((issue, i) => (
                  <li key={i}>• {issue}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Scaffolding Preview */}
      <div className="mb-4">
        <p className="text-xs text-muted-foreground mb-2">Scaffolding Distribution</p>
        <div className="flex h-4 rounded-full overflow-hidden bg-muted">
          {personaDistribution.map((persona, index) => (
            <div
              key={persona.id}
              className="transition-all hover:opacity-80"
              style={{
                width: `${persona.percentage}%`,
                backgroundColor: persona.color,
              }}
              title={`${persona.name}: ${persona.count} pairs (${persona.percentage.toFixed(1)}%)`}
            />
          ))}
        </div>
        <div className="flex items-center gap-3 mt-2">
          {personaDistribution.map(persona => (
            <div key={persona.id} className="flex items-center gap-1.5">
              <div
                className="size-2 rounded-full"
                style={{ backgroundColor: persona.color }}
              />
              <span className="text-xs text-muted-foreground">{persona.name.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* File Info */}
      <div className="text-xs text-muted-foreground mb-4">
        {formatFileSize(dataset.fileSizeBytes)} • {dataset.humanReviewPercent}% human reviewed
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-auto">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => onViewDetails(dataset)}
        >
          View Details
        </Button>
        <Button
          className="flex-1"
          onClick={() => onStartTraining(dataset)}
          disabled={!dataset.trainingReady}
        >
          Start Training
          <ChevronRight className="size-4 ml-1" />
        </Button>
      </div>
    </Card>
  );
}
