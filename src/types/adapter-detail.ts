/**
 * Types for Adapter Detail Page features:
 * - DeploymentLog: JSONB stored in pipeline_training_jobs.deployment_log
 * - EndpointRestartLog: DB record in endpoint_restart_log table
 * - AdapterPingResult: Response from GET /api/pipeline/adapters/[jobId]/ping
 */

// ============================================================
// Deployment Log
// ============================================================

export interface DeploymentLog {
  adapter_name: string;              // "adapter-e8fa481f"
  hf_path: string;                   // "BrightHub2/lora-emotional-intelligence-e8fa481f"
  hf_commit_oid: string | null;      // Git commit OID from HuggingFace
  hf_files_uploaded: string[];       // ["adapter_model.safetensors", "adapter_config.json", ...]

  runpod_endpoint_id: string;        // "780tauhj7c126b"
  runpod_save_success: boolean;
  runpod_lora_modules_after: Array<{ name: string; path: string }>;

  worker_refresh: {
    scale_down_at: string;
    workers_terminated_at: string;
    scale_up_at: string;
    workers_ready_at: string;
    verification_result: 'verified' | 'unverified' | 'skipped';
    verification_error: string | null;
  } | null;

  deployed_at: string;
  total_duration_ms: number;
}

// ============================================================
// Endpoint Restart Log
// ============================================================

export type RestartStatus =
  | 'initiated'
  | 'scaling_down'
  | 'workers_terminated'
  | 'scaling_up'
  | 'workers_ready'
  | 'verifying'
  | 'completed'
  | 'failed';

export type RestartTrigger = 'auto' | 'manual';

export interface EndpointRestartLog {
  id: string;
  workbaseId: string;
  jobId: string;
  adapterName: string;
  runpodEndpointId: string;
  triggerSource: RestartTrigger;
  status: RestartStatus;
  initiatedAt: string;
  scaleDownAt: string | null;
  workerTerminatedAt: string | null;
  scaleUpAt: string | null;
  workersReadyAt: string | null;
  verificationAt: string | null;
  completedAt: string | null;
  totalDurationMs: number | null;
  scaleDownSuccess: boolean | null;
  scaleUpSuccess: boolean | null;
  adapterVerified: boolean | null;
  adapterInLoraModules: boolean | null;
  loraModulesSnapshot: Array<{ name: string; path: string }> | null;
  workerStateAfter: {
    ready: number;
    idle: number;
    running: number;
    initializing: number;
  } | null;
  errorMessage: string | null;
  errorStep: string | null;
}

// ============================================================
// Adapter Ping Result
// ============================================================

export interface AdapterPingResult {
  adapterId: string;
  hfPath: string | null;
  registeredInLoraModules: boolean;
  loraModulesSnapshot: Array<{ name: string; path: string }>;
  inferenceAvailable: boolean;
  inferenceLatencyMs: number | null;
  inferenceError: string | null;
  workerStatus: {
    ready: number;
    idle: number;
    running: number;
    initializing: number;
  };
  endpointDbStatus: 'pending' | 'deploying' | 'ready' | 'failed' | 'terminated' | null;
  checkedAt: string;
}

// ============================================================
// Restart Verdict (computed from EndpointRestartLog)
// ============================================================

export type VerdictSeverity = 'success' | 'warning' | 'error';

export interface RestartVerdict {
  verdict: 'SUCCESS' | 'FAILED' | 'PARTIAL' | 'TIMING_ERROR' | 'IN_PROGRESS';
  reason: string;
  severity: VerdictSeverity;
  action?: string;
}

export function getRestartVerdict(log: EndpointRestartLog): RestartVerdict {
  const inProgressStatuses: RestartStatus[] = [
    'initiated', 'scaling_down', 'workers_terminated', 'scaling_up', 'workers_ready', 'verifying'
  ];

  if (inProgressStatuses.includes(log.status)) {
    return { verdict: 'IN_PROGRESS', reason: 'Restart is currently in progress', severity: 'warning' };
  }

  if (log.status === 'failed') {
    return {
      verdict: 'FAILED',
      reason: `Restart failed at step: ${log.errorStep || 'unknown'}`,
      severity: 'error',
    };
  }

  if (!log.adapterInLoraModules) {
    return {
      verdict: 'TIMING_ERROR',
      reason: 'Adapter was not in LORA_MODULES when restart began — deploy may not have completed',
      severity: 'warning',
      action: 'Check Deployment Report. If deployment is complete, restart again.',
    };
  }

  if (log.adapterVerified) {
    return {
      verdict: 'SUCCESS',
      reason: 'Adapter is active and verified on inference endpoint',
      severity: 'success',
    };
  }

  return {
    verdict: 'PARTIAL',
    reason: 'Restart completed but adapter inference verification failed',
    severity: 'warning',
    action: 'Workers may still be loading the adapter. Wait 60s and use "Adapter Status Ping" to re-check.',
  };
}

// ============================================================
// DB Row Mappers
// ============================================================

export function mapDbRowToRestartLog(row: Record<string, unknown>): EndpointRestartLog {
  return {
    id: row.id as string,
    workbaseId: row.workbase_id as string,
    jobId: row.job_id as string,
    adapterName: row.adapter_name as string,
    runpodEndpointId: row.runpod_endpoint_id as string,
    triggerSource: row.trigger_source as RestartTrigger,
    status: row.status as RestartStatus,
    initiatedAt: row.initiated_at as string,
    scaleDownAt: row.scale_down_at as string | null,
    workerTerminatedAt: row.workers_terminated_at as string | null,
    scaleUpAt: row.scale_up_at as string | null,
    workersReadyAt: row.workers_ready_at as string | null,
    verificationAt: row.verification_at as string | null,
    completedAt: row.completed_at as string | null,
    totalDurationMs: row.total_duration_ms as number | null,
    scaleDownSuccess: row.scale_down_success as boolean | null,
    scaleUpSuccess: row.scale_up_success as boolean | null,
    adapterVerified: row.adapter_verified as boolean | null,
    adapterInLoraModules: row.adapter_in_lora_modules as boolean | null,
    loraModulesSnapshot: row.lora_modules_snapshot as Array<{ name: string; path: string }> | null,
    workerStateAfter: row.worker_state_after as EndpointRestartLog['workerStateAfter'],
    errorMessage: row.error_message as string | null,
    errorStep: row.error_step as string | null,
  };
}
