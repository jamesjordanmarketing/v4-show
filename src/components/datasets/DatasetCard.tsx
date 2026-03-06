'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Database, Loader2 } from 'lucide-react';
import type { Dataset } from '@/lib/types/lora-training';

/**
 * DatasetCard component - Display dataset information with status and actions
 * From Section E02 - Dataset Management
 * Pattern Source: Infrastructure Inventory Section 5 - Component Library
 */

interface DatasetCardProps {
  dataset: Dataset;
  onSelect?: (dataset: Dataset) => void;
  onStartTraining?: (dataset: Dataset) => void;
  onDelete?: (id: string) => void;
}

export function DatasetCard({ dataset, onSelect, onStartTraining, onDelete }: DatasetCardProps) {
  // Status badge color mapping
  const statusConfig = {
    uploading: {
      color: 'bg-blue-500 hover:bg-blue-600',
      label: 'Uploading',
    },
    validating: {
      color: 'bg-yellow-500 hover:bg-yellow-600',
      label: 'Validating',
    },
    ready: {
      color: 'bg-green-500 hover:bg-green-600',
      label: 'Ready',
    },
    error: {
      color: 'bg-red-500 hover:bg-red-600',
      label: 'Error',
    },
  };

  const statusInfo = statusConfig[dataset.status] || statusConfig.error;

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // Format number with commas
  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-gray-500 flex-shrink-0" />
            <div>
              <CardTitle className="text-lg">{dataset.name}</CardTitle>
              <CardDescription className="text-sm">
                {dataset.file_name}
              </CardDescription>
            </div>
          </div>
          <Badge className={statusInfo.color}>
            {dataset.status === 'validating' && (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            )}
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Description */}
        {dataset.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {dataset.description}
          </p>
        )}

        {/* Statistics for ready datasets */}
        {dataset.training_ready && dataset.total_training_pairs && (
          <div className="mb-3 space-y-1 text-sm text-gray-600">
            <p>
              <span className="font-medium">Training pairs:</span>{' '}
              {formatNumber(dataset.total_training_pairs)}
            </p>
            {dataset.total_tokens && (
              <p>
                <span className="font-medium">Total tokens:</span>{' '}
                {formatNumber(dataset.total_tokens)}
              </p>
            )}
            {dataset.avg_turns_per_conversation && (
              <p>
                <span className="font-medium">Avg turns:</span>{' '}
                {dataset.avg_turns_per_conversation.toFixed(1)}
              </p>
            )}
          </div>
        )}

        {/* Error message */}
        {dataset.status === 'error' && dataset.error_message && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {dataset.error_message}
          </div>
        )}

        {/* File size */}
        <p className="text-xs text-gray-500 mb-3">
          {formatFileSize(dataset.file_size || 0)}
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={() => onSelect?.(dataset)}
            variant="outline"
            className="flex-1"
            size="sm"
          >
            View Details
          </Button>
          {dataset.status === 'ready' && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onStartTraining?.(dataset);
              }}
              className="flex-1"
              size="sm"
            >
              Start Training
            </Button>
          )}
          {dataset.status === 'error' && onDelete && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Delete this dataset?')) {
                  onDelete(dataset.id);
                }
              }}
              variant="destructive"
              size="sm"
            >
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

