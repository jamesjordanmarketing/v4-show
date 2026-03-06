'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
  SkipForward,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

type TrainingSetStatus = 'processing' | 'ready' | 'failed';

interface TrainingSet {
  id: string;
  name: string;
  status: TrainingSetStatus;
  conversationCount: number;
  trainingPairCount: number;
  jsonlPath: string | null;
  datasetId: string | null;
  lastBuildError: string | null;
  failedConversationIds: string[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<
  TrainingSetStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive'; icon: React.ReactNode }
> = {
  ready: { label: 'Ready', variant: 'default', icon: <CheckCircle2 className="h-3 w-3" /> },
  processing: {
    label: 'Processing',
    variant: 'secondary',
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  failed: { label: 'Failed', variant: 'destructive', icon: <AlertCircle className="h-3 w-3" /> },
};

export default function TrainingSetsPage() {
  const params = useParams();
  const router = useRouter();
  const workbaseId = params.id as string;
  const queryClient = useQueryClient();

  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());
  const [bypassTarget, setBypassTarget] = useState<TrainingSet | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrainingSet | null>(null);

  const {
    data: trainingSets,
    isLoading,
    refetch,
  } = useQuery<TrainingSet[]>({
    queryKey: ['training-sets', workbaseId],
    queryFn: async () => {
      const res = await fetch(`/api/workbases/${workbaseId}/training-sets`);
      if (!res.ok) throw new Error('Failed to fetch training sets');
      const json = await res.json();
      return (json.data || []) as TrainingSet[];
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasProcessing = (data || []).some((ts) => ts.status === 'processing');
      return hasProcessing ? 5000 : false;
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (tsId: string) => {
      const res = await fetch(
        `/api/workbases/${workbaseId}/training-sets/${tsId}/reset`,
        { method: 'POST' }
      );
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error);
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Reset to ${data.data?.status}. You can now add more conversations.`);
      queryClient.invalidateQueries({ queryKey: ['training-sets', workbaseId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const bypassMutation = useMutation({
    mutationFn: async ({ tsId, idsToSkip }: { tsId: string; idsToSkip: string[] }) => {
      const res = await fetch(
        `/api/workbases/${workbaseId}/training-sets/${tsId}/bypass`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationIdsToSkip: idsToSkip }),
        }
      );
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error);
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(
        `Bypass started. ${data.data?.skippedCount} conversations skipped. Rebuilding with ${data.data?.remainingCount}…`
      );
      setBypassTarget(null);
      queryClient.invalidateQueries({ queryKey: ['training-sets', workbaseId] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setBypassTarget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (tsId: string) => {
      const res = await fetch(
        `/api/workbases/${workbaseId}/training-sets/${tsId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error);
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Training set deleted.');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['training-sets', workbaseId] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setDeleteTarget(null);
    },
  });

  const totalConversations = (trainingSets || []).reduce(
    (sum, ts) => sum + ts.conversationCount,
    0
  );

  const toggleError = (id: string) => {
    setExpandedErrors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isStuckProcessing = (ts: TrainingSet) =>
    ts.status === 'processing' &&
    Date.now() - new Date(ts.updatedAt || 0).getTime() > 5 * 60 * 1000;

  return (
    <div className="p-8 max-w-4xl mx-auto bg-background min-h-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <button
          onClick={() =>
            router.push(`/workbase/${workbaseId}/fine-tuning/conversations`)
          }
          className="hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Conversations
        </button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Training Sets</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage training data builds for this Work Base
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary bar */}
      {!isLoading && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Total Sets</p>
              <p className="text-2xl font-bold text-foreground">
                {trainingSets?.length || 0}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Total Conversations</p>
              <p className="text-2xl font-bold text-foreground">{totalConversations}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Ready Sets</p>
              <p className="text-2xl font-bold text-foreground">
                {(trainingSets || []).filter((ts) => ts.status === 'ready').length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (!trainingSets || trainingSets.length === 0) && (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No training sets yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Select conversations and click &quot;Build Training Set&quot; to create one.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() =>
                router.push(`/workbase/${workbaseId}/fine-tuning/conversations`)
              }
            >
              Go to Conversations
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Training Set cards */}
      <div className="space-y-4">
        {(trainingSets || []).map((ts) => {
          const cfg = STATUS_CONFIG[ts.status] || STATUS_CONFIG.failed;
          const stuck = isStuckProcessing(ts);
          const errorExpanded = expandedErrors.has(ts.id);

          return (
            <Card key={ts.id} className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-foreground text-base">{ts.name}</CardTitle>
                      <Badge variant={cfg.variant} className="flex items-center gap-1">
                        {cfg.icon}
                        {stuck ? 'Stuck' : cfg.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      ID: <code className="font-mono">{ts.id}</code>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {ts.status === 'ready' && ts.datasetId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(`/workbase/${workbaseId}/fine-tuning/launch`)
                        }
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Launch
                      </Button>
                    )}
                    {ts.status === 'processing' && stuck && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resetMutation.mutate(ts.id)}
                        disabled={resetMutation.isPending}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Reset Stuck
                      </Button>
                    )}
                    {ts.status === 'failed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBypassTarget(ts)}
                        disabled={ts.failedConversationIds.length === 0}
                      >
                        <SkipForward className="h-3 w-3 mr-1" />
                        Bypass &amp; Rebuild
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(ts)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                  <div>
                    <p className="text-muted-foreground text-xs">Conversations</p>
                    <p className="font-medium text-foreground">{ts.conversationCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Training Pairs</p>
                    <p className="font-medium text-foreground">
                      {ts.trainingPairCount || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Last Updated</p>
                    <p className="font-medium text-foreground">
                      {new Date(ts.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {ts.status === 'processing' && !stuck && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-md p-3 mt-2">
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <span>Building JSONL file in background — auto-refreshing…</span>
                  </div>
                )}

                {ts.status === 'failed' && (
                  <div className="mt-2">
                    <Alert variant="destructive" className="mb-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex items-start justify-between">
                          <span className="font-medium">Build failed</span>
                          <button
                            className="text-xs underline ml-2 shrink-0"
                            onClick={() => toggleError(ts.id)}
                          >
                            {errorExpanded ? (
                              <span className="flex items-center gap-1">
                                <ChevronUp className="h-3 w-3" />
                                Hide details
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <ChevronDown className="h-3 w-3" />
                                Show details
                              </span>
                            )}
                          </button>
                        </div>
                      </AlertDescription>
                    </Alert>

                    {errorExpanded && (
                      <div className="bg-muted rounded-md p-4 text-xs space-y-3">
                        {ts.failedConversationIds.length > 0 && (
                          <div>
                            <p className="font-semibold text-foreground mb-1">
                              {ts.failedConversationIds.length} conversation
                              {ts.failedConversationIds.length !== 1 ? 's' : ''} blocked
                              the build:
                            </p>
                            <ul className="space-y-1">
                              {ts.failedConversationIds.map((cid) => (
                                <li
                                  key={cid}
                                  className="font-mono text-destructive flex items-center gap-1"
                                >
                                  <AlertCircle className="h-3 w-3 shrink-0" />
                                  {cid}
                                </li>
                              ))}
                            </ul>
                            <p className="text-muted-foreground mt-2">
                              These conversations have{' '}
                              <code>enrichment_status ≠ &apos;completed&apos;</code> or a missing{' '}
                              <code>enriched_file_path</code>. They must be enriched before
                              inclusion in a training set.
                            </p>
                          </div>
                        )}

                        {ts.failedConversationIds.length > 0 && (
                          <div className="border-t border-border pt-3">
                            <p className="font-semibold text-foreground mb-1">
                              What &quot;Bypass &amp; Rebuild&quot; will do:
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                              <li>
                                Remove {ts.failedConversationIds.length} unenriched conversation
                                {ts.failedConversationIds.length !== 1 ? 's' : ''} from this set
                              </li>
                              <li>
                                Rebuild the JSONL with the remaining{' '}
                                {ts.conversationCount - ts.failedConversationIds.length}{' '}
                                conversations
                              </li>
                              <li>
                                Skipped conversations are NOT deleted — they remain in the
                                Conversations library and can be added again once enriched
                              </li>
                              <li>
                                This set will be set to <code>processing</code>, then{' '}
                                <code>ready</code> if the rebuild succeeds
                              </li>
                            </ul>
                          </div>
                        )}

                        {ts.lastBuildError && (
                          <div className="border-t border-border pt-3">
                            <p className="font-semibold text-foreground mb-1">
                              Raw error log:
                            </p>
                            <pre className="text-muted-foreground whitespace-pre-wrap break-all overflow-auto max-h-48">
                              {ts.lastBuildError}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Bypass Confirmation Dialog */}
      <AlertDialog
        open={!!bypassTarget}
        onOpenChange={(open) => {
          if (!open) setBypassTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bypass &amp; Rebuild Training Set?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  The following {bypassTarget?.failedConversationIds.length} conversation
                  {bypassTarget?.failedConversationIds.length !== 1 ? 's' : ''} will be{' '}
                  <strong>permanently removed</strong> from this training set:
                </p>
                <ul className="font-mono text-xs space-y-1 bg-muted p-3 rounded-md max-h-40 overflow-auto">
                  {(bypassTarget?.failedConversationIds || []).map((cid) => (
                    <li key={cid} className="text-destructive">
                      {cid}
                    </li>
                  ))}
                </ul>
                <p>
                  The training set will be rebuilt with the remaining{' '}
                  <strong>
                    {(bypassTarget?.conversationCount || 0) -
                      (bypassTarget?.failedConversationIds.length || 0)}
                  </strong>{' '}
                  conversations.
                </p>
                <p className="text-muted-foreground">
                  Skipped conversations are NOT deleted — they remain in the Conversations
                  library and can be enriched and added to a new training set later.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (bypassTarget) {
                  bypassMutation.mutate({
                    tsId: bypassTarget.id,
                    idsToSkip: bypassTarget.failedConversationIds,
                  });
                }
              }}
            >
              Bypass &amp; Rebuild
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Training Set?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> and its
              associated dataset record. The source conversations will NOT be deleted. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
