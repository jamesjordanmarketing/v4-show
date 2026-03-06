'use client';

import { useState } from 'react';
import { useCosts } from '@/hooks/use-costs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Download, TrendingUp } from 'lucide-react';

/**
 * Cost Analytics Page
 * From Section E06 - Cost Tracking
 * Route: /costs
 */
export default function CostsPage() {
    const [timeRange, setTimeRange] = useState<string>('30');

    // Calculate date range
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - parseInt(timeRange) * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

    const { data, isLoading, error } = useCosts({ startDate, endDate });

    // Loading state
    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-12 w-full" />
                <div className="grid gap-6 md:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-32" />
                    ))}
                </div>
                <Skeleton className="h-96" />
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="text-center py-12">
                <DollarSign className="h-12 w-12 mx-auto text-red-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Failed to load costs</h3>
                <p className="text-gray-500 mb-4">
                    {error instanceof Error ? error.message : 'An error occurred'}
                </p>
                <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
        );
    }

    const costs = data?.data?.records || [];
    const totalCost = data?.data?.total_cost || 0;
    const costByType = data?.data?.cost_by_type || {};

    // Calculate summary stats
    const jobCount = new Set(costs.filter(c => c.job_id).map(c => c.job_id)).size;
    const avgCostPerJob = jobCount > 0 ? totalCost / jobCount : 0;

    // Export to CSV
    const handleExportCSV = () => {
        const csv = [
            ['Date', 'Type', 'Amount', 'Job ID'].join(','),
            ...costs.map(c => [
                c.recorded_at,
                c.cost_type,
                c.amount,
                c.job_id || 'N/A'
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `costs-${startDate}-to-${endDate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold">Cost Analytics</h1>
                    <p className="text-gray-500 mt-1">Track your training costs</p>
                </div>
                <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-48">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7">Last 7 days</SelectItem>
                        <SelectItem value="30">Last 30 days</SelectItem>
                        <SelectItem value="90">Last 90 days</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            Total Spend
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold flex items-center">
                            <DollarSign className="h-6 w-6" />
                            {totalCost.toFixed(2)}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Last {timeRange} days
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            Training Jobs
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{jobCount}</div>
                        <p className="text-xs text-gray-500 mt-1">
                            Jobs with costs recorded
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            Avg per Job
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold flex items-center">
                            <DollarSign className="h-6 w-6" />
                            {avgCostPerJob.toFixed(2)}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Average cost
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Cost by Type */}
            {Object.keys(costByType).length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Cost by Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {Object.entries(costByType).map(([type, amount]) => (
                                <div key={type} className="p-3 bg-gray-50 rounded">
                                    <div className="text-sm text-gray-600 capitalize">
                                        {type.replace('_', ' ')}
                                    </div>
                                    <div className="text-xl font-bold flex items-center">
                                        <DollarSign className="h-4 w-4" />
                                        {(amount as number).toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Cost Breakdown Table */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Cost Records</CardTitle>
                            <CardDescription>Detailed cost breakdown</CardDescription>
                        </div>
                        {costs.length > 0 && (
                            <Button variant="outline" size="sm" onClick={handleExportCSV}>
                                <Download className="h-4 w-4 mr-2" />
                                Export CSV
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {costs.length === 0 ? (
                        <div className="text-center py-8">
                            <TrendingUp className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-500">No cost records in this time period</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Details</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {costs.map((cost) => (
                                    <TableRow key={cost.id}>
                                        <TableCell>
                                            {new Date(cost.recorded_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <span className="capitalize">
                                                {cost.cost_type.replace('_', ' ')}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {cost.details && (
                                                <div className="text-sm text-gray-600">
                                                    {cost.details.gpu_type && (
                                                        <>
                                                            {cost.details.gpu_type}
                                                            {cost.details.gpu_count && ` × ${cost.details.gpu_count}`}
                                                        </>
                                                    )}
                                                    {cost.details.duration_hours && (
                                                        <> ({cost.details.duration_hours.toFixed(1)}h)</>
                                                    )}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            ${cost.amount.toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
