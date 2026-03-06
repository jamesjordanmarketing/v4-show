'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Pause,
  Ban,
  AlertTriangle,
  List,
} from 'lucide-react';

interface BatchJobSummary {
  id: string;
  name: string;
  status: 'queued' | 'processing' | 'paused' | 'completed' | 'failed' | 'cancelled';
  totalItems: number;
  completedItems: number;
  successfulItems: number;
  failedItems: number;
  startedAt: string | null;
  completedAt: string | null;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; icon: React.ElementType; spin?: boolean }
> = {
  queued:     { label: 'Queued',     badgeClass: 'bg-yellow-100 text-yellow-700', icon: Clock },
  processing: { label: 'Processing', badgeClass: 'bg-blue-100 text-blue-700',    icon: Loader2, spin: true },
  paused:     { label: 'Paused',     badgeClass: 'bg-yellow-100 text-yellow-700', icon: Pause },
  completed:  { label: 'Completed',  badgeClass: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  failed:     { label: 'Failed',     badgeClass: 'bg-red-100 text-red-700',      icon: XCircle },
  cancelled:  { label: 'Cancelled',  badgeClass: 'bg-gray-100 text-gray-700',    icon: Ban },
};

export default function WorkbaseBatchJobsListPage() {
  const params = useParams();
  const router = useRouter();
  const workbaseId = params.id as string;

  const [jobs, setJobs] = useState<BatchJobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`/api/batch-jobs?workbaseId=${workbaseId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch batch jobs');
      }
      setJobs(data.jobs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch batch jobs');
    } finally {
      setLoading(false);
    }
  }, [workbaseId]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString();
  };

  const getProgressPercentage = (job: BatchJobSummary) => {
    if (job.totalItems === 0) return 0;
    return Math.round((job.completedItems / job.totalItems) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto bg-background min-h-full">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 mb-2 text-muted-foreground hover:text-foreground"
            onClick={() =>
              router.push(`/workbase/${workbaseId}/fine-tuning/conversations`)
            }
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Conversations
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Batch Jobs</h1>
          <p className="text-muted-foreground mt-1">
            Generation jobs for this Work Base
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLoading(true);
            fetchJobs();
          }}
          disabled={loading}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Jobs List */}
      {jobs.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <List className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No batch jobs found for this Work Base.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() =>
                router.push(
                  `/workbase/${workbaseId}/fine-tuning/conversations/generate`
                )
              }
            >
              Generate Conversations
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const config = STATUS_CONFIG[job.status] || STATUS_CONFIG.queued;
            const StatusIcon = config.icon;
            const pct = getProgressPercentage(job);

            return (
              <Card
                key={job.id}
                className="bg-card border-border hover:border-duck-blue/40 transition-colors cursor-pointer"
                onClick={() =>
                  router.push(
                    `/workbase/${workbaseId}/fine-tuning/conversations/batch/${job.id}`
                  )
                }
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-foreground truncate">
                          {job.name}
                        </p>
                        <Badge className={`${config.badgeClass} shrink-0`}>
                          <StatusIcon
                            className={`h-3 w-3 mr-1 ${config.spin ? 'animate-spin' : ''}`}
                          />
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        {job.id.slice(0, 8)}...
                      </p>

                      {/* Progress bar */}
                      {job.totalItems > 0 && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>
                              {job.completedItems} / {job.totalItems} items
                            </span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-duck-blue rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {(job.successfulItems > 0 || job.failedItems > 0) && (
                            <div className="flex gap-3 mt-1 text-xs">
                              {job.successfulItems > 0 && (
                                <span className="text-green-700">
                                  {job.successfulItems} successful
                                </span>
                              )}
                              {job.failedItems > 0 && (
                                <span className="text-red-700">
                                  {job.failedItems} failed
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="text-right text-xs text-muted-foreground shrink-0">
                      {job.completedAt ? (
                        <span>Completed {formatDate(job.completedAt)}</span>
                      ) : job.startedAt ? (
                        <span>Started {formatDate(job.startedAt)}</span>
                      ) : (
                        <span>Queued</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
