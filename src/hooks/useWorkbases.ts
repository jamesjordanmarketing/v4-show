import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Workbase, CreateWorkbaseRequest, UpdateWorkbaseRequest } from '@/types/workbase';

export const workbaseKeys = {
  all: ['workbases'] as const,
  list: () => [...workbaseKeys.all, 'list'] as const,
  detail: (id: string) => [...workbaseKeys.all, 'detail', id] as const,
};

async function fetchWorkbases(): Promise<Workbase[]> {
  const res = await fetch('/api/workbases');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch workbases');
  return json.data;
}

async function fetchWorkbase(id: string): Promise<Workbase> {
  const res = await fetch(`/api/workbases/${id}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Workbase not found');
  return json.data;
}

export function useWorkbases() {
  return useQuery({
    queryKey: workbaseKeys.list(),
    queryFn: fetchWorkbases,
    staleTime: 30_000,
  });
}

export function useWorkbase(id: string | null) {
  return useQuery({
    queryKey: workbaseKeys.detail(id!),
    queryFn: () => fetchWorkbase(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useCreateWorkbase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateWorkbaseRequest) => {
      const res = await fetch('/api/workbases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as Workbase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workbaseKeys.all });
    },
  });
}

export function useUpdateWorkbase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateWorkbaseRequest }) => {
      const res = await fetch(`/api/workbases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as Workbase;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workbaseKeys.all });
      queryClient.setQueryData(workbaseKeys.detail(data.id), data);
    },
  });
}

export function useWorkbasesArchived() {
  return useQuery({
    queryKey: [...workbaseKeys.list(), 'archived'],
    queryFn: async () => {
      const res = await fetch('/api/workbases?includeArchived=true');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch workbases');
      return (json.data as Workbase[]).filter(wb => wb.status === 'archived');
    },
    staleTime: 30_000,
  });
}

export function useRestoreWorkbase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/workbases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to restore');
      return json.data as Workbase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workbaseKeys.list() });
    },
  });
}
