import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TrainingSet } from '@/types/workbase';

export const trainingSetKeys = {
  all: ['training-sets'] as const,
  list: (workbaseId: string) => [...trainingSetKeys.all, 'list', workbaseId] as const,
  detail: (id: string) => [...trainingSetKeys.all, 'detail', id] as const,
};

export function useTrainingSets(workbaseId: string | null) {
  return useQuery({
    queryKey: trainingSetKeys.list(workbaseId!),
    queryFn: async () => {
      const res = await fetch(`/api/workbases/${workbaseId}/training-sets`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as TrainingSet[];
    },
    enabled: !!workbaseId,
    staleTime: 30_000,
  });
}

export function useCreateTrainingSet(workbaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name?: string; conversationIds: string[] }) => {
      const res = await fetch(`/api/workbases/${workbaseId}/training-sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as TrainingSet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingSetKeys.list(workbaseId) });
    },
  });
}

export function useDeleteTrainingSet(workbaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (trainingSetId: string) => {
      const res = await fetch(`/api/workbases/${workbaseId}/training-sets/${trainingSetId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingSetKeys.list(workbaseId) });
    },
  });
}
