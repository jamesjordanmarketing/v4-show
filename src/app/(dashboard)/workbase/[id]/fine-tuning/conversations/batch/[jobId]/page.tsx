'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Pause,
  Ban,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

interface BatchJobStatus {
  jobId: string;
  status: 'queued' | 'processing' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total: number;
    completed: number;
    successful: number;
    failed: number;
    percentage: number;
  };
  estimatedTimeRemaining?: number;
  startedAt?: string;
  completedAt?: string;
}

export default function WorkbaseBatchJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workbaseId = params.id as string;
  const jobId = params.jobId as string;

  const [status, setStatus] = useState<BatchJobStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Enrichment state
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<{
    successful: number;
    failed: number;
    skipped: number;
    total: number;
  } | null>(null);

  // Auto-enrich tracking
  const autoEnrichTriggeredRef = useRef(false);

  // ─── Status fetching ───────────────────────────────────────────────────────

  const fetchStatus = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`/api/conversations/batch/${jobId}/status`, {
        signal: controller.signal,
        credentials: 'same-origin',
      });
      clearTimeout(timeoutId);

      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication required. Please sign in.');
      }
      if (response.redirected) {
        throw new Error('Session expired. Please sign in again.');
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch status');
      }

      setStatus(data);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. Please refresh the page.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch status');
      }
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  // ─── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Safety: force loading=false after 5s if still stuck
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError('Failed to load job status. Please try refreshing.');
      }
    }, 5000);
    return () => clearTimeout(safetyTimer);
  }, [loading]);

  // Poll status every 3 seconds while job is active
  useEffect(() => {
    const isActive =
      status?.status === 'queued' ||
      status?.status === 'processing';

    if (!isActive) return;

    const interval = setInterval(() => {
      fetchStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, [status?.status, fetchStatus]);

  // Auto-enrich when batch completes (fire-and-forget via Inngest)
  useEffect(() => {
    if (
      status?.status === 'completed' &&
      status.progress.successful > 0 &&
      !autoEnrichTriggeredRef.current &&
      !enriching &&
      !enrichResult
    ) {
      autoEnrichTriggeredRef.current = true;
      handleEnrichAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.status]);

  // ─── Job control actions ───────────────────────────────────────────────────

  const handleAction = async (action: 'cancel') => {
    try {
      setActionLoading(true);

      const response = await fetch(`/api/batch-jobs/${jobId}/cancel`, {
        method: 'POST',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel job');
      }

      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel job');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Bulk enrich ───────────────────────────────────────────────────────────

  const handleEnrichAll = async () => {
    if (!status || status.status !== 'completed') return;

    try {
      setEnriching(true);
      setEnrichResult(null);

      // Fetch all completed items to get conversation IDs
      const response = await fetch(
        `/api/conversations/batch/${jobId}/items?status=completed`
      );
      const items = await response.json();
      if (!response.ok) throw new Error(items.error || 'Failed to fetch batch items');

      const conversationIds =
        items.data
          ?.map((item: { conversation_id: string | null }) => item.conversation_id)
          .filter(Boolean) || [];

      if (conversationIds.length === 0) {
        setEnrichResult({ successful: 0, failed: 0, skipped: 0, total: 0 });
        return;
      }

      // Fire chunked Inngest events (no batch limit, no timeout risk)
      const enrichResponse = await fetch('/api/conversations/trigger-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationIds }),
      });

      const enrichData = await enrichResponse.json();
      if (!enrichResponse.ok) throw new Error(enrichData.error || 'Enrichment failed');

      setEnrichResult({
        successful: 0,
        failed: 0,
        skipped: 0,
        total: conversationIds.length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrichment failed');
    } finally {
      setEnriching(false);
    }
  };

  // ─── Formatters ────────────────────────────────────────────────────────────

  const formatTimeRemaining = (seconds?: number) => {
    if (seconds === undefined || seconds === null) return 'Calculating...';
    if (seconds <= 0) return '—';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${Math.floor(minutes % 60)}m`;
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString();
  };

  // ─── Render states ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="p-8 max-w-2xl mx-auto bg-background">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Error Loading Batch Job
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <div className="flex gap-3">
              <Button onClick={() => fetchStatus()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  router.push(
                    `/workbase/${workbaseId}/fine-tuning/conversations/batch`
                  )
                }
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                All Batch Jobs
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!status) return null;

  const isActive = status.status === 'processing' || status.status === 'queued';
  const isCompleted = status.status === 'completed';
  const isFailed = status.status === 'failed';
  const isPaused = status.status === 'paused';
  const isCancelled = status.status === 'cancelled';

  const statusBadgeClass: Record<string, string> = {
    completed:  'bg-green-100 text-green-700',
    failed:     'bg-red-100 text-red-700',
    processing: 'bg-blue-100 text-blue-700',
    paused:     'bg-yellow-100 text-yellow-700',
    cancelled:  'bg-gray-100 text-gray-700',
    queued:     'bg-muted text-muted-foreground',
  };

  // ─── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-2xl mx-auto bg-background min-h-full">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 mb-2 text-muted-foreground hover:text-foreground"
          onClick={() =>
            router.push(
              `/workbase/${workbaseId}/fine-tuning/conversations/batch`
            )
          }
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          All Batch Jobs
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Batch Job</h1>
            <p className="text-sm text-muted-foreground font-mono mt-1 break-all">
              {jobId}
            </p>
          </div>
          <Badge
            className={
              statusBadgeClass[status.status] ||
              'bg-muted text-muted-foreground'
            }
          >
            {status.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Progress Card */}
      <Card className="mb-6 bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            {isActive && (
              <Loader2 className="h-5 w-5 animate-spin text-duck-blue" />
            )}
            {isCompleted && (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            )}
            {isFailed && <XCircle className="h-5 w-5 text-red-600" />}
            {isPaused && <Pause className="h-5 w-5 text-yellow-600" />}
            {isCancelled && (
              <Ban className="h-5 w-5 text-muted-foreground" />
            )}
            Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">
                {status.progress.completed} / {status.progress.total} completed
              </span>
              <span className="font-medium text-foreground">
                {Math.round(status.progress.percentage)}%
              </span>
            </div>
            <Progress value={status.progress.percentage} className="h-3" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="p-3 rounded-lg bg-green-50 border border-green-100">
              <p className="text-2xl font-bold text-green-700">
                {status.progress.successful}
              </p>
              <p className="text-xs text-muted-foreground">Successful</p>
            </div>
            <div className="p-3 rounded-lg bg-red-50 border border-red-100">
              <p className="text-2xl font-bold text-red-700">
                {status.progress.failed}
              </p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
              <p className="text-2xl font-bold text-blue-700">
                {status.progress.total - status.progress.completed}
              </p>
              <p className="text-xs text-muted-foreground">Remaining</p>
            </div>
            <div className="p-3 rounded-lg bg-muted border border-border">
              <p className="text-2xl font-bold text-foreground">
                {status.progress.total}
              </p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Time Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {status.startedAt && (
              <div>
                <p className="text-muted-foreground">Started</p>
                <p className="font-medium text-foreground">
                  {formatDateTime(status.startedAt)}
                </p>
              </div>
            )}
            {isActive && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Estimated remaining</p>
                  <p className="font-medium text-foreground">
                    {formatTimeRemaining(status.estimatedTimeRemaining)}
                  </p>
                </div>
              </div>
            )}
            {status.completedAt && (
              <div>
                <p className="text-muted-foreground">Completed</p>
                <p className="font-medium text-foreground">
                  {formatDateTime(status.completedAt)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions Card */}
      <Card className="mb-6 bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {(status.status === 'processing' || status.status === 'queued') && (
            <Badge variant="secondary" className="animate-pulse">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Processing in background...
            </Badge>
          )}

          {isActive && (
            <Button
              variant="destructive"
              onClick={() => handleAction('cancel')}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Ban className="mr-2 h-4 w-4" />
              )}
              Cancel Job
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Completion Card */}
      {isCompleted && (
        <Card className="mb-6 bg-card border-border border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              Batch Complete!
            </CardTitle>
            <CardDescription className="text-green-600">
              Successfully generated {status.progress.successful} conversation
              {status.progress.successful !== 1 ? 's' : ''}
              {status.progress.failed > 0 &&
                ` (${status.progress.failed} failed)`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {enrichResult && (
              <div className="p-3 rounded-md bg-muted border border-border">
                <p className="text-sm font-medium text-foreground mb-1">
                  Enrichment Queued
                </p>
                <p className="text-xs text-muted-foreground">
                  {enrichResult.total} conversation{enrichResult.total !== 1 ? 's' : ''} queued for enrichment — processing in background
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {!enrichResult && status.progress.successful > 0 && (
                <Button
                  variant="secondary"
                  onClick={handleEnrichAll}
                  disabled={enriching}
                >
                  {enriching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enriching...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Enrich All
                    </>
                  )}
                </Button>
              )}
              <Button
                onClick={() =>
                  router.push(
                    `/workbase/${workbaseId}/fine-tuning/conversations`
                  )
                }
              >
                View Conversations
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  router.push(
                    `/workbase/${workbaseId}/fine-tuning/conversations/generate`
                  )
                }
              >
                Generate More
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failure Card */}
      {isFailed && (
        <Card className="mb-6 bg-card border-border border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <XCircle className="h-5 w-5" />
              Batch Failed
            </CardTitle>
            <CardDescription className="text-red-600">
              {status.progress.failed} conversation
              {status.progress.failed !== 1 ? 's' : ''} failed to generate
              {status.progress.successful > 0 &&
                ` (${status.progress.successful} succeeded)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {status.progress.successful > 0 && (
                <Button
                  onClick={() =>
                    router.push(
                      `/workbase/${workbaseId}/fine-tuning/conversations`
                    )
                  }
                >
                  View Successful Conversations
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() =>
                  router.push(
                    `/workbase/${workbaseId}/fine-tuning/conversations/generate`
                  )
                }
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancelled Card */}
      {isCancelled && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <Ban className="h-5 w-5" />
              Batch Cancelled
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Job was cancelled.{' '}
              {status.progress.successful > 0
                ? `${status.progress.successful} conversation${
                    status.progress.successful !== 1 ? 's were' : ' was'
                  } generated before cancellation.`
                : 'No conversations were generated.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {status.progress.successful > 0 && (
                <Button
                  onClick={() =>
                    router.push(
                      `/workbase/${workbaseId}/fine-tuning/conversations`
                    )
                  }
                >
                  View Conversations
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() =>
                  router.push(
                    `/workbase/${workbaseId}/fine-tuning/conversations/generate`
                  )
                }
              >
                Start New Batch
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
