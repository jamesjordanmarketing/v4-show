/**
 * Pipeline Jobs List Page
 * 
 * Shows all user's pipeline training jobs
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePipelineJobs } from '@/hooks/usePipelineJobs';
import { PipelineJobStatus } from '@/types/pipeline';

const STATUS_ICONS: Record<PipelineJobStatus, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-yellow-500" />,
  queued: <Clock className="h-4 w-4 text-yellow-500" />,
  initializing: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
  running: <Loader2 className="h-4 w-4 text-green-500 animate-spin" />,
  completed: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  failed: <XCircle className="h-4 w-4 text-red-500" />,
  cancelled: <XCircle className="h-4 w-4 text-gray-500" />,
};

export default function PipelineJobsPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const { data, isLoading, error } = usePipelineJobs({ 
    limit: 20,
    status: statusFilter 
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="container max-w-6xl py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Training Jobs</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage your AI training jobs
          </p>
        </div>
        <Link href="/pipeline/configure">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Training Job
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center text-red-500 py-8">
          Failed to load jobs. Please try again.
        </div>
      ) : !data?.data?.length ? (
        <div className="text-center py-16 border rounded-lg bg-muted/50">
          <h3 className="text-lg font-medium mb-2">No training jobs yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first training job to get started
          </p>
          <Link href="/pipeline/configure">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Training Job
            </Button>
          </Link>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Job Name</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((job) => (
              <TableRow key={job.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {STATUS_ICONS[job.status]}
                    <span className="capitalize">{job.status}</span>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{job.jobName}</TableCell>
                <TableCell>
                  {job.status === 'running' ? (
                    <span>{job.progress}%</span>
                  ) : job.status === 'completed' ? (
                    <Badge variant="secondary">Complete</Badge>
                  ) : (
                    '--'
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(job.createdAt)}
                </TableCell>
                <TableCell>
                  ${(job.actualCost || job.estimatedCost || 0).toFixed(2)}
                </TableCell>
                <TableCell>
                  <Link href={`/pipeline/jobs/${job.id}`}>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
