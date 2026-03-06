import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useModels(params?: { page?: number; limit?: number; sort?: string }) {
  return useQuery({
    queryKey: ['models', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.sort) searchParams.set('sort', params.sort);

      const response = await fetch(`/api/models?${searchParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }

      return response.json();
    },
  });
}

export function useModel(modelId: string | null) {
  return useQuery({
    queryKey: ['model', modelId],
    queryFn: async () => {
      const response = await fetch(`/api/models/${modelId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch model');
      }

      return response.json();
    },
    enabled: !!modelId,
  });
}

export function useDownloadModel() {
  return useMutation({
    mutationFn: async ({ modelId, files }: { modelId: string; files?: string[] }) => {
      const response = await fetch(`/api/models/${modelId}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to generate download URLs');
      }

      return response.json();
    },
    onError: (error: Error) => {
      toast.error('Download Error', {
        description: error.message,
      });
    },
  });
}
