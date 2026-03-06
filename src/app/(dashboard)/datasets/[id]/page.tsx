'use client';

import { useParams, useRouter } from 'next/navigation';
import { useDataset, useDeleteDataset } from '@/hooks/use-datasets';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Database, ArrowLeft, Trash2, PlayCircle } from 'lucide-react';
import type { ValidationError } from '@/lib/types/lora-training';

/**
 * Dataset Detail Page
 * From Section E02 - Dataset Management
 * Route: /datasets/[id]
 */
export default function DatasetDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const router = useRouter();
    const { data, isLoading, error } = useDataset(id);
    const { mutate: deleteDataset, isPending: isDeleting } = useDeleteDataset();

    // Loading state
    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        );
    }

    // Error state
    if (error || !data?.success) {
        return (
            <div className="text-center py-12">
                <Database className="h-12 w-12 mx-auto text-red-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Failed to load dataset</h3>
                <p className="text-gray-500 mb-4">
                    {error instanceof Error ? error.message : 'Dataset not found'}
                </p>
                <Button onClick={() => router.push('/datasets')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Datasets
                </Button>
            </div>
        );
    }

    const dataset = data.data.dataset;

    // Status badge configuration
    const statusConfig: Record<string, { color: string; label: string }> = {
        uploading: { color: 'bg-blue-500', label: 'Uploading' },
        validating: { color: 'bg-yellow-500', label: 'Validating' },
        ready: { color: 'bg-green-500', label: 'Ready' },
        error: { color: 'bg-red-500', label: 'Error' },
    };

    const status = statusConfig[dataset.status] || statusConfig.error;

    const handleDelete = () => {
        if (confirm(`Delete dataset "${dataset.name}"? This cannot be undone.`)) {
            deleteDataset(dataset.id, {
                onSuccess: () => router.push('/datasets'),
            });
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/datasets')}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">{dataset.name}</h1>
                        <p className="text-gray-500 mt-1">{dataset.file_name}</p>
                    </div>
                </div>
                <Badge className={`${status.color} text-white`}>{status.label}</Badge>
            </div>

            {/* Description */}
            {dataset.description && (
                <Card>
                    <CardHeader>
                        <CardTitle>Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-700">{dataset.description}</p>
                    </CardContent>
                </Card>
            )}

            {/* Statistics */}
            {dataset.training_ready && (
                <Card>
                    <CardHeader>
                        <CardTitle>Dataset Statistics</CardTitle>
                        <CardDescription>Summary of training data</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <div className="text-sm text-gray-600">Training Pairs</div>
                                <div className="text-2xl font-bold">
                                    {dataset.total_training_pairs?.toLocaleString() || '—'}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-600">Validation Pairs</div>
                                <div className="text-2xl font-bold">
                                    {dataset.total_validation_pairs?.toLocaleString() || '—'}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-600">Total Tokens</div>
                                <div className="text-2xl font-bold">
                                    {dataset.total_tokens?.toLocaleString() || '—'}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-600">Avg Turns</div>
                                <div className="text-2xl font-bold">
                                    {dataset.avg_turns_per_conversation?.toFixed(1) || '—'}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Validation Errors */}
            {dataset.status === 'error' && dataset.validation_errors && dataset.validation_errors.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-red-600">Validation Errors</CardTitle>
                        <CardDescription>
                            {dataset.validation_errors.length} error(s) found
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {dataset.validation_errors.map((err: ValidationError, idx: number) => (
                                <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded">
                                    <div className="font-medium text-red-800">Line {err.line}</div>
                                    <div className="text-sm text-red-700">{err.error}</div>
                                    {err.suggestion && (
                                        <div className="text-sm text-red-600 mt-1">
                                            💡 {err.suggestion}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Sample Data Preview */}
            {dataset.sample_data && (
                <Card>
                    <CardHeader>
                        <CardTitle>Sample Data</CardTitle>
                        <CardDescription>Preview of dataset content</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96 text-sm">
                            {JSON.stringify(dataset.sample_data, null, 2)}
                        </pre>
                    </CardContent>
                </Card>
            )}

            {/* Metadata */}
            <Card>
                <CardHeader>
                    <CardTitle>Metadata</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-600">Format:</span>
                            <span className="ml-2 font-medium">{dataset.format}</span>
                        </div>
                        <div>
                            <span className="text-gray-600">File Size:</span>
                            <span className="ml-2 font-medium">
                                {(dataset.file_size / 1024 / 1024).toFixed(2)} MB
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-600">Created:</span>
                            <span className="ml-2 font-medium">
                                {new Date(dataset.created_at).toLocaleString()}
                            </span>
                        </div>
                        {dataset.validated_at && (
                            <div>
                                <span className="text-gray-600">Validated:</span>
                                <span className="ml-2 font-medium">
                                    {new Date(dataset.validated_at).toLocaleString()}
                                </span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-4">
                <Button
                    onClick={() => router.push('/datasets')}
                    variant="outline"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Datasets
                </Button>
                {dataset.status === 'ready' && (
                    <Button
                        onClick={() => router.push(`/training/configure?datasetId=${dataset.id}`)}
                    >
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Start Training
                    </Button>
                )}
                <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
            </div>
        </div>
    );
}
