/**
 * Pipeline Jobs Hooks
 * 
 * React Query hooks for pipeline job operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  PipelineTrainingJob, 
  CreatePipelineJobRequest,
  PipelineJobListResponse,
  PipelineJobResponse,
} from '@/types/pipeline';

// ============================================
// Query Keys
// ============================================

export const pipelineKeys = {
  all: ['pipeline'] as const,
  jobs: () => [...pipelineKeys.all, 'jobs'] as const,
  jobList: (filters?: { status?: string; limit?: number }) => 
    [...pipelineKeys.jobs(), 'list', filters] as const,
  job: (id: string) => [...pipelineKeys.jobs(), 'detail', id] as const,
  jobMetrics: (id: string) => [...pipelineKeys.jobs(), 'metrics', id] as const,
  engines: () => [...pipelineKeys.all, 'engines'] as const,
};

// ============================================
// API Functions
// ============================================

async function fetchPipelineJobs(options?: { 
  limit?: number; 
  offset?: number; 
  status?: string;
  workbaseId?: string;
}): Promise<PipelineJobListResponse> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.offset) params.set('offset', options.offset.toString());
  if (options?.status) params.set('status', options.status);
  if (options?.workbaseId) params.set('workbaseId', options.workbaseId);
  
  const response = await fetch(`/api/pipeline/jobs?${params}`);
  if (!response.ok) throw new Error('Failed to fetch pipeline jobs');
  return response.json();
}

async function fetchPipelineJob(jobId: string): Promise<PipelineJobResponse> {
  const response = await fetch(`/api/pipeline/jobs/${jobId}`);
  if (!response.ok) throw new Error('Failed to fetch pipeline job');
  return response.json();
}

async function fetchPipelineJobMetrics(jobId: string) {
  const response = await fetch(`/api/pipeline/jobs/${jobId}/metrics`);
  if (!response.ok) throw new Error('Failed to fetch pipeline job metrics');
  return response.json();
}

async function createPipelineJob(
  request: CreatePipelineJobRequest
): Promise<PipelineJobResponse> {
  const response = await fetch('/api/pipeline/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    let errorMessage = 'Failed to create pipeline job';
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
    } catch {
      // Response body was not JSON (empty body, HTML error page, etc.)
      errorMessage = `Training job request failed (HTTP ${response.status})`;
    }
    throw new Error(errorMessage);
  }
  try {
    return await response.json();
  } catch {
    throw new Error('Server returned an invalid response. The job may have been created — check the jobs list.');
  }
}

async function cancelPipelineJob(jobId: string): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`/api/pipeline/jobs/${jobId}/cancel`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to cancel pipeline job');
  return response.json();
}

async function fetchEngineInfo() {
  const response = await fetch('/api/pipeline/engines');
  if (!response.ok) throw new Error('Failed to fetch engine info');
  return response.json();
}

// ============================================
// Hooks
// ============================================

export function usePipelineJobs(options?: { 
  limit?: number; 
  offset?: number; 
  status?: string;
  workbaseId?: string;
}) {
  return useQuery({
    queryKey: pipelineKeys.jobList(options),
    queryFn: () => fetchPipelineJobs(options),
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function usePipelineJob(jobId: string | null) {
  return useQuery({
    queryKey: pipelineKeys.job(jobId || ''),
    queryFn: () => fetchPipelineJob(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      // Poll every 5s if job is running
      const runningStatuses = ['pending', 'queued', 'initializing', 'running'];
      const data = query.state.data;
      if (data?.data && runningStatuses.includes(data.data.status)) {
        return 5000;
      }
      return false;
    },
  });
}

export function usePipelineJobMetrics(jobId: string | null) {
  return useQuery({
    queryKey: pipelineKeys.jobMetrics(jobId || ''),
    queryFn: () => fetchPipelineJobMetrics(jobId!),
    enabled: !!jobId,
    refetchInterval: 10000, // Poll every 10s during training
  });
}

export function useCreatePipelineJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createPipelineJob,
    onSuccess: () => {
      // Invalidate job list to show new job
      queryClient.invalidateQueries({ queryKey: pipelineKeys.jobs() });
    },
  });
}

export function useCancelPipelineJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: cancelPipelineJob,
    onSuccess: (_, jobId) => {
      // Invalidate specific job and list
      queryClient.invalidateQueries({ queryKey: pipelineKeys.job(jobId) });
      queryClient.invalidateQueries({ queryKey: pipelineKeys.jobs() });
    },
  });
}

export function useEngineInfo() {
  return useQuery({
    queryKey: pipelineKeys.engines(),
    queryFn: fetchEngineInfo,
    staleTime: 60 * 60 * 1000, // 1 hour - engine doesn't change at runtime
  });
}
