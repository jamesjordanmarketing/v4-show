/**
 * Dataset Selector Modal
 * 
 * Modal dialog for selecting existing datasets for pipeline training jobs.
 * Fetches datasets with training_ready=true and allows user selection.
 */

'use client';

import { useState } from 'react';
import { useDatasets } from '@/hooks/use-datasets';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Database,
  CheckCircle2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import type { Dataset } from '@/lib/types/lora-training';

interface DatasetSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (dataset: Dataset) => void;
  selectedDatasetId?: string | null;
}

export function DatasetSelectorModal({
  open,
  onOpenChange,
  onSelect,
  selectedDatasetId,
}: DatasetSelectorModalProps) {
  const [search, setSearch] = useState('');
  
  const { data, isLoading, error } = useDatasets({
    search: search || undefined,
    status: 'ready', // Only show ready datasets
  });

  const datasets = data?.data?.datasets || [];
  
  // Filter to only training-ready datasets
  const trainingReadyDatasets = datasets.filter(
    (d: Dataset) => d.training_ready === true
  );

  const handleSelect = (dataset: Dataset) => {
    onSelect(dataset);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Select Training Dataset
          </DialogTitle>
          <DialogDescription>
            Choose a validated dataset to use for training your AI model.
            Only datasets that are ready for training are shown.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search datasets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Dataset List */}
        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
              <h3 className="font-semibold mb-2">Failed to load datasets</h3>
              <p className="text-muted-foreground text-sm">
                {error instanceof Error ? error.message : 'An error occurred'}
              </p>
            </div>
          ) : trainingReadyDatasets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Database className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No training-ready datasets</h3>
              <p className="text-muted-foreground text-sm">
                {search
                  ? 'No datasets match your search. Try a different term.'
                  : 'Upload and validate a dataset first, or import from a training file.'}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  onOpenChange(false);
                  window.location.href = '/datasets';
                }}
              >
                Go to Datasets
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {trainingReadyDatasets.map((dataset: Dataset) => (
                <DatasetCard
                  key={dataset.id}
                  dataset={dataset}
                  isSelected={dataset.id === selectedDatasetId}
                  onSelect={() => handleSelect(dataset)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {trainingReadyDatasets.length} dataset{trainingReadyDatasets.length !== 1 ? 's' : ''} available
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Internal DatasetCard component for the modal
interface DatasetCardProps {
  dataset: Dataset;
  isSelected: boolean;
  onSelect: () => void;
}

function DatasetCard({ dataset, isSelected, onSelect }: DatasetCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`w-full p-4 rounded-lg border text-left transition-all hover:border-primary/50 hover:bg-accent/50 ${
        isSelected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : 'border-border'
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isSelected
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {isSelected ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <FileText className="h-5 w-5" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium truncate">{dataset.name}</h4>
            <Badge variant="secondary" className="flex-shrink-0">
              {dataset.format}
            </Badge>
          </div>

          {dataset.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
              {dataset.description}
            </p>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
            {dataset.total_training_pairs && (
              <span>{dataset.total_training_pairs.toLocaleString()} training pairs</span>
            )}
            {dataset.total_tokens && (
              <span>{dataset.total_tokens.toLocaleString()} tokens</span>
            )}
            {dataset.avg_turns_per_conversation && (
              <span>~{dataset.avg_turns_per_conversation.toFixed(1)} turns/conv</span>
            )}
          </div>
        </div>

        {isSelected && (
          <Badge className="flex-shrink-0 bg-primary text-primary-foreground">
            Selected
          </Badge>
        )}
      </div>
    </button>
  );
}
