'use client';

import { useState } from 'react';
import { useTrainingJobs } from '@/hooks/useTrainingConfig';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Activity,
    TrendingUp,
    DollarSign,
    Clock,
    CheckCircle2,
    XCircle,
    Loader2,
    Plus
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { TrainingJob } from '@/lib/types/lora-training';

/**
 * Training Jobs List Page
 * From Section E04 - Training Execution & Monitoring
 * Route: /training/jobs
 */
export default function TrainingJobsPage() {
    const router = useRouter();
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const { data, isLoading, error } = useTrainingJobs({
        status: statusFilter === 'all' ? undefined : statusFilter,
    });

    // Loading state
    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-12 w-full" />
                <div className="grid grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-24" />
                    ))}
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-48" />
                    ))}
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="text-center py-12">
                <XCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Failed to load jobs</h3>
                <p className="text-gray-500 mb-4">
                    {error instanceof Error ? error.message : 'An error occurred'}
                </p>
                <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
        );
    }

    const jobs: TrainingJob[] = data?.data?.jobs || [];

    // Status badge configuration
    const statusConfig: Record<string, { color: string; icon: typeof Clock; label: string }> = {
        queued: { color: 'bg-gray-500', icon: Clock, label: 'Queued' },
        initializing: { color: 'bg-blue-500', icon: Loader2, label: 'Initializing' },
        running: { color: 'bg-yellow-500', icon: Activity, label: 'Running' },
        completed: { color: 'bg-green-500', icon: CheckCircle2, label: 'Completed' },
        failed: { color: 'bg-red-500', icon: XCircle, label: 'Failed' },
        cancelled: { color: 'bg-gray-400', icon: XCircle, label: 'Cancelled' },
    };

    // Calculate stats
    const stats = {
        total: jobs.length,
        running: jobs.filter(j => j.status === 'running').length,
        completed: jobs.filter(j => j.status === 'completed').length,
        failed: jobs.filter(j => j.status === 'failed').length,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold">Training Jobs</h1>
                    <p className="text-gray-500 mt-1">Monitor all your training jobs</p>
                </div>
                <Button onClick={() => router.push('/training/configure')}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Training Job
                </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="queued">Queued</SelectItem>
                        <SelectItem value="running">Running</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Stats */}
            {jobs.length > 0 && (
                <div className="grid grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-sm text-gray-600">Total Jobs</div>
                            <div className="text-2xl font-bold">{stats.total}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-sm text-gray-600">Running</div>
                            <div className="text-2xl font-bold text-yellow-600">{stats.running}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-sm text-gray-600">Completed</div>
                            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-sm text-gray-600">Failed</div>
                            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Jobs Grid */}
            {jobs.length === 0 ? (
                <div className="text-center py-12">
                    <TrendingUp className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No training jobs yet</h3>
                    <p className="text-gray-500 mb-4">
                        Start your first training job to see it here
                    </p>
                    <Button onClick={() => router.push('/training/configure')}>
                        Configure Training
                    </Button>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2">
                    {jobs.map((job) => {
                        const config = statusConfig[job.status] || statusConfig.queued;
                        const StatusIcon = config.icon;

                        return (
                            <Card
                                key={job.id}
                                className="hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => router.push(`/training/jobs/${job.id}`)}
                            >
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-lg">
                                                {job.preset_id.charAt(0).toUpperCase() + job.preset_id.slice(1)} Training
                                            </CardTitle>
                                            <div className="text-sm text-gray-500 mt-1">
                                                {new Date(job.queued_at).toLocaleString()}
                                            </div>
                                        </div>
                                        <Badge className={`${config.color} text-white flex items-center gap-1`}>
                                            <StatusIcon className={`h-3 w-3 ${job.status === 'initializing' || job.status === 'running' ? 'animate-spin' : ''}`} />
                                            {config.label}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {/* Progress */}
                                    {job.status === 'running' && (
                                        <div className="mb-3">
                                            <div className="flex justify-between text-sm mb-1">
                                                <span>Progress</span>
                                                <span>{job.progress?.toFixed(0) || 0}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-blue-600 h-2 rounded-full transition-all"
                                                    style={{ width: `${job.progress || 0}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Metrics */}
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <div className="text-gray-600">GPU</div>
                                            <div className="font-medium">{job.gpu_config?.gpu_type || 'N/A'}</div>
                                        </div>
                                        <div>
                                            <div className="text-gray-600">Cost</div>
                                            <div className="font-medium flex items-center">
                                                <DollarSign className="h-3 w-3" />
                                                {job.status === 'completed'
                                                    ? job.final_cost?.toFixed(2)
                                                    : job.current_cost?.toFixed(2) || '0.00'}
                                            </div>
                                        </div>
                                        {job.status === 'running' && (
                                            <>
                                                <div>
                                                    <div className="text-gray-600">Epoch</div>
                                                    <div className="font-medium">
                                                        {job.current_epoch}/{job.total_epochs}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-600">Step</div>
                                                    <div className="font-medium">
                                                        {job.current_step?.toLocaleString()}/{job.total_steps?.toLocaleString() || '—'}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Error message */}
                                    {job.status === 'failed' && job.error_message && (
                                        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700 truncate">
                                            {job.error_message}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
