'use client';

import { useState } from 'react';
import { useDatasets, useDeleteDataset } from '@/hooks/use-datasets';
import { DatasetCard } from '@/components/datasets/DatasetCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Database, Download } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Dataset } from '@/lib/types/lora-training';

/**
 * Datasets Page - Display user's datasets with search and filters
 * From Section E02 - Dataset Management
 * Pattern Source: Infrastructure Inventory Section 5 - Component Library
 */

export default function DatasetsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data, isLoading, error } = useDatasets({
    search: search || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });
  const { mutate: deleteDataset } = useDeleteDataset();

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <Database className="h-12 w-12 mx-auto text-red-400 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Failed to load datasets</h3>
        <p className="text-gray-500 mb-4">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </p>
        <Button onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  const router = useRouter();
  const datasets = data?.data?.datasets || [];

  // Handle dataset selection (view details)
  const handleSelectDataset = (dataset: Dataset) => {
    router.push(`/datasets/${dataset.id}`);
  };

  // Handle start training
  const handleStartTraining = (dataset: Dataset) => {
    router.push(`/pipeline/configure?datasetId=${dataset.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Datasets</h1>
          <p className="text-gray-500 mt-1">
            Manage your training datasets
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/datasets/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Upload Dataset
            </Button>
          </Link>
          <Link href="/datasets/import">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Import from Training File
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search datasets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="uploading">Uploading</SelectItem>
            <SelectItem value="validating">Validating</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Summary */}
      {datasets.length > 0 && (
        <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-500">Total Datasets</p>
            <p className="text-2xl font-bold">{datasets.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Ready for Training</p>
            <p className="text-2xl font-bold text-green-600">
              {datasets.filter((d: Dataset) => d.training_ready).length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Validating</p>
            <p className="text-2xl font-bold text-yellow-600">
              {datasets.filter((d: Dataset) => d.status === 'validating').length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Errors</p>
            <p className="text-2xl font-bold text-red-600">
              {datasets.filter((d: Dataset) => d.status === 'error').length}
            </p>
          </div>
        </div>
      )}

      {/* Dataset Grid or Empty State */}
      {datasets.length === 0 ? (
        <div className="text-center py-12">
          <Database className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No datasets yet</h3>
          <p className="text-gray-500 mb-4">
            {search || (statusFilter && statusFilter !== 'all')
              ? 'No datasets match your filters. Try adjusting your search criteria.'
              : 'Upload your first dataset to start training LoRA models.'}
          </p>
          {!search && (!statusFilter || statusFilter === 'all') && (
            <Link href="/datasets/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Upload Dataset
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {datasets.map((dataset: Dataset) => (
            <DatasetCard
              key={dataset.id}
              dataset={dataset}
              onSelect={handleSelectDataset}
              onStartTraining={handleStartTraining}
              onDelete={deleteDataset}
            />
          ))}
        </div>
      )}

      {/* Pagination (if needed) */}
      {data?.data?.totalPages && data.data.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={data.data.page === 1}
            onClick={() => {
              // Pagination will be handled by React Query params
              // TODO: Implement pagination state
            }}
          >
            Previous
          </Button>
          <div className="flex items-center px-4 text-sm text-gray-600">
            Page {data.data.page} of {data.data.totalPages}
          </div>
          <Button
            variant="outline"
            disabled={data.data.page === data.data.totalPages}
            onClick={() => {
              // TODO: Implement pagination state
            }}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

