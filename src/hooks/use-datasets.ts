import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Dataset, CreateDatasetInput } from '@/lib/types/lora-training';

/**
 * React Query hooks for dataset management
 * From Section E02 - Dataset Management
 * Pattern Source: Infrastructure Inventory Section 6 - State & Data Fetching
 */

interface DatasetsResponse {
  success: boolean;
  data: {
    datasets: Dataset[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface DatasetResponse {
  success: boolean;
  data: {
    dataset: Dataset;
  };
}

interface CreateDatasetResponse {
  success: boolean;
  data: {
    dataset: Dataset;
    uploadUrl: string;
    storagePath: string;
  };
}

/**
 * Fetch all datasets with optional filters
 */
export function useDatasets(filters?: { status?: string; search?: string }) {
  return useQuery<DatasetsResponse>({
    queryKey: ['datasets', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.search) params.set('search', filters.search);
      
      const response = await fetch(`/api/datasets?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch datasets');
      return response.json();
    },
    staleTime: 30 * 1000, // 30 seconds (existing pattern)
  });
}

/**
 * Fetch a single dataset by ID
 */
export function useDataset(id: string | null) {
  return useQuery<DatasetResponse>({
    queryKey: ['datasets', id],
    queryFn: async () => {
      const response = await fetch(`/api/datasets/${id}`);
      if (!response.ok) throw new Error('Failed to fetch dataset');
      return response.json();
    },
    enabled: !!id,
  });
}

/**
 * Create a new dataset and get presigned upload URL
 */
export function useCreateDataset() {
  const queryClient = useQueryClient();

  return useMutation<CreateDatasetResponse, Error, CreateDatasetInput>({
    mutationFn: async (data: CreateDatasetInput) => {
      const response = await fetch('/api/datasets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create dataset');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      toast.success('Dataset created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

/**
 * Confirm dataset upload and trigger validation
 */
export function useConfirmDatasetUpload() {
  const queryClient = useQueryClient();

  return useMutation<DatasetResponse, Error, string>({
    mutationFn: async (datasetId: string) => {
      const response = await fetch(`/api/datasets/${datasetId}/confirm`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to confirm upload');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      toast.success('Validation started');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

/**
 * Delete a dataset
 */
export function useDeleteDataset() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/datasets/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete dataset');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      toast.success('Dataset deleted');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

