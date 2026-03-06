/**
 * Adapter Testing Page
 *
 * A/B testing interface for comparing Control vs Adapted model responses.
 * Uses useAdapterWorkflow hook for complete workflow management.
 */

'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Loader2, Home, CheckCircle2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { usePipelineJob } from '@/hooks/usePipelineJobs';
import { useAdapterWorkflow, type TestResult } from '@/hooks';
import {
  ABTestingPanel,
  EndpointStatusBanner,
  TestHistoryTable,
  TestResultComparison,
} from '@/components/pipeline';

export default function AdapterTestPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const { data: jobData, isLoading: jobLoading } = usePipelineJob(jobId);
  const workflow = useAdapterWorkflow(jobId);

  const [selectedTest, setSelectedTest] = useState<TestResult | null>(null);
  const [activeTab, setActiveTab] = useState<'test' | 'history'>('test');

  const job = jobData?.data;

  // Loading state
  if (jobLoading || workflow.isLoadingStatus) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Job not found
  if (!job) {
    return (
      <div className="container max-w-6xl py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <h2 className="text-xl font-semibold mb-2">Job Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The requested job could not be found.
            </p>
            <Button asChild variant="outline">
              <Link href="/pipeline/jobs">
                <Home className="h-4 w-4 mr-2" />
                Back to Jobs
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Job not completed
  if (job.status !== 'completed') {
    return (
      <div className="container max-w-6xl py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <h2 className="text-xl font-semibold mb-2">Training Not Complete</h2>
            <p className="text-muted-foreground mb-4">
              This job must be completed before testing the adapter.
            </p>
            <Button asChild variant="outline">
              <Link href={`/pipeline/jobs/${jobId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Job
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/pipeline/jobs/${jobId}/results`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Test Adapter</h1>
          <p className="text-muted-foreground">{job.jobName}</p>
        </div>
        <Link href={`/pipeline/jobs/${jobId}/chat`}>
          <Button variant="outline">
            <MessageSquare className="h-4 w-4 mr-2" />
            Multi-Turn Chat
          </Button>
        </Link>
        {workflow.bothReady && (
          <Badge variant="outline" className="text-green-600 border-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Ready
          </Badge>
        )}
      </div>

      {/* Endpoint Status Banner */}
      <div className="mb-6">
        <EndpointStatusBanner
          controlEndpoint={workflow.controlEndpoint}
          adaptedEndpoint={workflow.adaptedEndpoint}
          bothReady={workflow.bothReady}
        />
      </div>

      {/* Error Display */}
      {workflow.statusError && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            Failed to load endpoint status: {workflow.statusError.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'test' | 'history')} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="test">Run Test</TabsTrigger>
          <TabsTrigger value="history">
            Test History
            {workflow.historyCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {workflow.historyCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Run Test Tab */}
        <TabsContent value="test">
          <ABTestingPanel jobId={jobId} endpointsReady={workflow.bothReady} />
        </TabsContent>

        {/* Test History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Previous Tests</CardTitle>
              <CardDescription>
                View and compare all A/B tests for this adapter
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TestHistoryTable jobId={jobId} onSelectTest={setSelectedTest} />
            </CardContent>
          </Card>

          {/* Selected Test Detail */}
          {selectedTest && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Test Details</h3>
                <Button variant="ghost" size="sm" onClick={() => setSelectedTest(null)}>
                  Close
                </Button>
              </div>
              <TestResultComparison result={selectedTest} jobId={jobId} />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
