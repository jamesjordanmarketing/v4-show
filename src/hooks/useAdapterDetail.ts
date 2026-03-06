import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DeploymentLog, AdapterPingResult, EndpointRestartLog } from '@/types/adapter-detail';

// ============================================================
// Query Keys
// ============================================================

export const adapterDetailKeys = {
  all: ['adapter-detail'] as const,
  deployment: (jobId: string) => ['adapter-detail', 'deployment', jobId] as const,
  ping: (jobId: string) => ['adapter-detail', 'ping', jobId] as const,
  restartStatus: (jobId: string) => ['adapter-detail', 'restart-status', jobId] as const,
};

// ============================================================
// Hook: useDeploymentLog
// ============================================================

/**
 * Fetch deployment_log JSONB for a job.
 * Returns null if no deployment log exists yet (adapter not yet deployed,
 * or deployed before spec 26 was implemented — graceful null handling).
 */
export function useDeploymentLog(jobId: string | null) {
  return useQuery({
    queryKey: adapterDetailKeys.deployment(jobId || ''),
    queryFn: async (): Promise<DeploymentLog | null> => {
      const res = await fetch(`/api/pipeline/jobs/${jobId}/deployment-log`);
      if (!res.ok) throw new Error('Failed to fetch deployment log');
      const json = await res.json();
      return json.data;
    },
    enabled: !!jobId,
    staleTime: 30 * 1000,
  });
}

// ============================================================
// Hook: useAdapterPing
// ============================================================

/**
 * Live adapter status ping.
 * enabled: false — NEVER auto-runs. Call refetch() to trigger.
 * Each ping triggers a live GPU inference job (~$0.01–$0.02).
 */
export function useAdapterPing(jobId: string | null) {
  return useQuery({
    queryKey: adapterDetailKeys.ping(jobId || ''),
    queryFn: async (): Promise<AdapterPingResult> => {
      const res = await fetch(`/api/pipeline/adapters/${jobId}/ping`);
      if (!res.ok) throw new Error('Failed to ping adapter');
      const json = await res.json();
      return json.data;
    },
    enabled: false, // user-triggered only — DO NOT change this
    staleTime: 0,   // always re-fetch when triggered
    retry: false,
  });
}

// ============================================================
// Hook: useRestartStatus
// ============================================================

/**
 * Fetch latest restart status for a job.
 * Pass refetchInterval for polling during active restarts.
 */
export function useRestartStatus(
  jobId: string | null,
  options?: { refetchInterval?: number | false }
) {
  return useQuery({
    queryKey: adapterDetailKeys.restartStatus(jobId || ''),
    queryFn: async (): Promise<(EndpointRestartLog & { adapterId: string; hfPath: string | null }) | null> => {
      const res = await fetch(`/api/pipeline/adapters/${jobId}/restart-status`);
      if (!res.ok) throw new Error('Failed to fetch restart status');
      const json = await res.json();
      if (!json.data) return null;
      return json.data;
    },
    enabled: !!jobId,
    refetchInterval: options?.refetchInterval ?? false,
    staleTime: 5 * 1000,
  });
}

// ============================================================
// Hook: useTriggerRestart
// ============================================================

/**
 * Trigger a manual endpoint restart.
 * Returns restartLogId for polling via useRestartStatus.
 */
export function useTriggerRestart(jobId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ data: { restartLogId: string; adapterId: string; status: string; message: string } }> => {
      const res = await fetch(`/api/pipeline/adapters/${jobId}/restart`, { method: 'POST' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to trigger restart');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adapterDetailKeys.restartStatus(jobId || '') });
    },
  });
}

// ============================================================
// Hook: useRemoveAdapter
// ============================================================

/**
 * Remove adapter from RunPod LORA_MODULES.
 * Marks the job as superseded in DB.
 */
export function useRemoveAdapter(jobId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ data: { adapterId: string; removed: boolean; loraModulesRemaining: number; message: string } }> => {
      const res = await fetch(`/api/pipeline/adapters/${jobId}/remove`, { method: 'POST' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to remove adapter');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adapterDetailKeys.ping(jobId || '') });
    },
  });
}
