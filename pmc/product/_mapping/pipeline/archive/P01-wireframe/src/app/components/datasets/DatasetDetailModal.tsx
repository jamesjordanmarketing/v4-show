import React, { useState } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, ChevronRight, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import type { Dataset } from '../../data/datasetMockData';
import { PERSONAS, EMOTIONAL_ARCS, SAMPLE_CONVERSATIONS } from '../../data/datasetMockData';

interface DatasetDetailModalProps {
  dataset: Dataset | null;
  isOpen: boolean;
  onClose: () => void;
  onStartTraining: (dataset: Dataset) => void;
}

export function DatasetDetailModal({
  dataset,
  isOpen,
  onClose,
  onStartTraining,
}: DatasetDetailModalProps) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!dataset) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPersonaColor = (personaId: string) => {
    return PERSONAS.find(p => p.id === personaId)?.color || '#6B7280';
  };

  const getPersonaName = (personaId: string) => {
    return PERSONAS.find(p => p.id === personaId)?.name || personaId;
  };

  // Group scaffolding by persona and arc
  const scaffoldingByPersona = PERSONAS.map(persona => {
    const arcs = EMOTIONAL_ARCS.map(arc => {
      const data = dataset.scaffoldingDistribution.find(
        s => s.persona === persona.id && s.arc === arc
      );
      return {
        arc,
        count: data?.count || 0,
        topics: data?.topics || 0,
      };
    });
    const total = arcs.reduce((sum, a) => sum + a.count, 0);
    return {
      persona,
      arcs,
      total,
    };
  });

  const readinessCriteria = [
    {
      label: 'Format compatible',
      status: dataset.format === 'brightrun-lora-v4',
      message: dataset.format === 'brightrun-lora-v4' 
        ? 'brightrun-lora-v4 format' 
        : 'Legacy v3 format - upgrade recommended',
    },
    {
      label: 'Sufficient volume',
      status: dataset.totalTrainingPairs >= 500,
      message: dataset.totalTrainingPairs >= 500
        ? `${dataset.totalTrainingPairs} pairs (exceeds 500 minimum)`
        : `${dataset.totalTrainingPairs} pairs (below 500 minimum)`,
    },
    {
      label: 'Quality score acceptable',
      status: dataset.qualityScore >= 3.0,
      message: `${dataset.qualityScore.toFixed(1)}/5.0 ${dataset.qualityScore >= 3.0 ? '(acceptable)' : '(below 3.0 threshold)'}`,
    },
    {
      label: 'Human review',
      status: true, // Always acceptable for PoC
      message: `${dataset.humanReviewPercent}% reviewed (optional for PoC)`,
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1 mr-4">
              <DialogTitle className="text-2xl mb-2">{dataset.name}</DialogTitle>
              <DialogDescription className="text-base">
                {dataset.vertical} • {dataset.consultantName}, {dataset.consultantTitle}
              </DialogDescription>
            </div>
            <Badge
              variant={dataset.format === 'brightrun-lora-v4' ? 'default' : 'secondary'}
              className={dataset.format === 'brightrun-lora-v4' ? 'bg-green-500 hover:bg-green-600' : ''}
            >
              {dataset.format}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <div className="px-6 pt-4">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="scaffolding">Scaffolding</TabsTrigger>
              <TabsTrigger value="conversations">Conversations</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="h-[50vh]">
            <div className="p-6">
              <TabsContent value="overview" className="mt-0 space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Conversations</p>
                    <p className="text-2xl font-semibold">{dataset.totalConversations.toLocaleString()}</p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Training Pairs</p>
                    <p className="text-2xl font-semibold">{dataset.totalTrainingPairs.toLocaleString()}</p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Quality Score</p>
                    <p className="text-2xl font-semibold">{dataset.qualityScore.toFixed(1)}/5.0</p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">File Size</p>
                    <p className="text-2xl font-semibold">
                      {(dataset.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                </div>

                {/* Training Readiness */}
                <div>
                  <h3 className="font-semibold mb-3">Training Readiness</h3>
                  <div className="space-y-2">
                    {readinessCriteria.map((criterion, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-md">
                        {criterion.status ? (
                          <CheckCircle className="size-5 text-green-600 mt-0.5 shrink-0" />
                        ) : (
                          <XCircle className="size-5 text-red-600 mt-0.5 shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{criterion.label}</p>
                          <p className="text-sm text-muted-foreground">{criterion.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Created</p>
                    <p className="font-medium">{formatDate(dataset.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Last Modified</p>
                    <p className="font-medium">{formatDate(dataset.lastModified)}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="scaffolding" className="mt-0 space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Distribution by Persona & Emotional Arc</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Shows how training pairs are distributed across {PERSONAS.length} personas and {EMOTIONAL_ARCS.length} emotional arcs
                  </p>
                </div>

                {scaffoldingByPersona.map(({ persona, arcs, total }) => (
                  <div key={persona.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="size-3 rounded-full"
                          style={{ backgroundColor: persona.color }}
                        />
                        <h4 className="font-semibold">{persona.name}</h4>
                      </div>
                      <Badge variant="outline">{total} pairs</Badge>
                    </div>
                    <div className="space-y-2">
                      {arcs.map(arc => {
                        const percentage = total > 0 ? (arc.count / total) * 100 : 0;
                        return (
                          <div key={arc.arc}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-muted-foreground">
                                {arc.arc.replace(/_/g, ' ')}
                              </span>
                              <span className="font-medium">{arc.count} pairs</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full transition-all"
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: persona.color,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="conversations" className="mt-0 space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Sample Conversations</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Preview of conversations in this dataset (showing 3 of {dataset.totalConversations})
                  </p>
                </div>

                {SAMPLE_CONVERSATIONS.map(conv => (
                  <div key={conv.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">{conv.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {conv.turnCount} turns
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <div
                          className="size-2 rounded-full"
                          style={{ backgroundColor: getPersonaColor(conv.persona) }}
                        />
                        <span>{getPersonaName(conv.persona)}</span>
                      </div>
                      <span>•</span>
                      <span>{conv.arc.replace(/_/g, ' ')}</span>
                      <span>•</span>
                      <span>{formatDate(conv.createdAt)}</span>
                    </div>
                  </div>
                ))}

                <Button variant="outline" className="w-full">
                  View All Conversations ({dataset.totalConversations})
                </Button>
              </TabsContent>

              <TabsContent value="metadata" className="mt-0 space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">File Information</h3>
                  <div className="bg-muted p-4 rounded-lg space-y-2 text-sm font-mono">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Storage Path:</span>
                      <span>{dataset.fileStoragePath}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">File Size:</span>
                      <span>{(dataset.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Format Version:</span>
                      <span>{dataset.format}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Dataset Metadata (JSON)</h3>
                  <ScrollArea className="h-64 border rounded-lg">
                    <pre className="p-4 text-xs font-mono">
                      {JSON.stringify(
                        {
                          id: dataset.id,
                          name: dataset.name,
                          format: dataset.format,
                          totalConversations: dataset.totalConversations,
                          totalTrainingPairs: dataset.totalTrainingPairs,
                          qualityScore: dataset.qualityScore,
                          vertical: dataset.vertical,
                          consultant: {
                            name: dataset.consultantName,
                            title: dataset.consultantTitle,
                          },
                          trainingReady: dataset.trainingReady,
                          readinessIssues: dataset.readinessIssues,
                          humanReviewPercent: dataset.humanReviewPercent,
                          created: dataset.createdAt,
                          lastModified: dataset.lastModified,
                        },
                        null,
                        2
                      )}
                    </pre>
                  </ScrollArea>
                </div>

                <Button variant="outline" className="w-full">
                  <Download className="size-4 mr-2" />
                  Export Metadata
                </Button>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        {/* Footer Actions */}
        <div className="border-t p-6 flex items-center justify-between">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={() => {
              onStartTraining(dataset);
              onClose();
            }}
            disabled={!dataset.trainingReady}
            size="lg"
          >
            Start Training
            <ChevronRight className="size-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
