# Adapter Application Module - Section E05: UI Components & Pages

**Version:** 1.0  
**Date:** January 17, 2026  
**Section:** E05 - User Interface Layer (FINAL SECTION)  
**Prerequisites:** E01, E02, E03, E04 must be complete  
**Builds Upon:** Complete foundation from previous sections  

---

## Overview

This prompt implements the complete user interface for adapter testing. This is the FINAL section that brings everything together into a working application.

**What This Section Creates:**
1. Five new React components for adapter testing UI
2. New test page at `/pipeline/jobs/[jobId]/test`
3. Updates to existing results page
4. Component exports and integration
5. Complete end-to-end testing workflow

**What This Section Completes:**
- The entire Adapter Application Module
- Full user workflow from deployment to testing to rating

---

## Critical Instructions

### UI Component Patterns

Follow existing patterns from:
- `src/components/pipeline/` - Existing component patterns
- Use shadcn/ui components for consistency
- Implement proper loading states
- Handle errors gracefully with user-friendly messages

### Styling

Use Tailwind CSS classes following existing patterns. Components should match the visual style of existing pipeline components.

### Codebase Integration

**Target Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src`

**Follow existing patterns from:**
- `src/components/pipeline/TrainingQualityEvaluation.tsx` - Component patterns
- `src/app/(dashboard)/pipeline/jobs/[jobId]/results/page.tsx` - Page patterns

---

## Reference Documents

- Full Spec: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\adapter-build-implementation-spec_v1.md`

---

========================

# EXECUTION PROMPT E05 - UI COMPONENTS & PAGES

## Context

You are implementing the complete user interface for the Adapter Application Module. This is the FINAL section that creates all UI components and pages needed for adapter testing.

**User Workflow:**
1. User completes training → adapter stored in Supabase
2. User clicks "Deploy & Test Adapter" on results page
3. System deploys Control and Adapted endpoints (5-30s cold start)
4. User enters test prompts and compares responses side-by-side
5. Optional: Claude-as-Judge provides automated evaluation
6. User rates which response was better
7. All tests saved for later review

---

## Task 1: Deploy Adapter Button Component

This button appears on the results page and initiates deployment.

### File: `src/components/pipeline/DeployAdapterButton.tsx`

```typescript
/**
 * Deploy Adapter Button
 *
 * Button that initiates adapter deployment and shows deployment status
 */

'use client';

import { useRouter } from 'next/navigation';
import { Rocket, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDeployAdapter, useEndpointStatus } from '@/hooks/useAdapterTesting';

interface DeployAdapterButtonProps {
  jobId: string;
  disabled?: boolean;
}

export function DeployAdapterButton({ jobId, disabled }: DeployAdapterButtonProps) {
  const router = useRouter();
  const { data: statusData, isLoading: isLoadingStatus } = useEndpointStatus(jobId);
  const deployMutation = useDeployAdapter();

  const endpointStatus = statusData?.data;
  const bothReady = endpointStatus?.bothReady;
  const isDeploying = endpointStatus?.controlEndpoint?.status === 'deploying' ||
                     endpointStatus?.adaptedEndpoint?.status === 'deploying';

  const handleDeploy = async () => {
    try {
      await deployMutation.mutateAsync(jobId);
    } catch (error) {
      console.error('Deploy failed:', error);
    }
  };

  const handleGoToTest = () => {
    router.push(`/pipeline/jobs/${jobId}/test`);
  };

  // If endpoints are ready, show "Go to Testing" button
  if (bothReady) {
    return (
      <Button onClick={handleGoToTest} className="gap-2">
        <CheckCircle2 className="h-4 w-4" />
        Test Adapter
      </Button>
    );
  }

  // If deploying, show status
  if (isDeploying || deployMutation.isPending) {
    return (
      <Button disabled className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Deploying Endpoints...
      </Button>
    );
  }

  // If failed, show retry
  if (endpointStatus?.controlEndpoint?.status === 'failed' ||
      endpointStatus?.adaptedEndpoint?.status === 'failed') {
    return (
      <Button
        onClick={handleDeploy}
        variant="destructive"
        className="gap-2"
        disabled={disabled}
      >
        <XCircle className="h-4 w-4" />
        Retry Deployment
      </Button>
    );
  }

  // Default: show deploy button
  return (
    <Button
      onClick={handleDeploy}
      className="gap-2"
      disabled={disabled || isLoadingStatus}
    >
      <Rocket className="h-4 w-4" />
      Deploy & Test Adapter
    </Button>
  );
}
```

---

## Task 2: Endpoint Status Banner Component

This banner shows deployment status on the test page.

### File: `src/components/pipeline/EndpointStatusBanner.tsx`

```typescript
/**
 * Endpoint Status Banner
 *
 * Shows deployment status for Control and Adapted endpoints
 */

'use client';

import { CheckCircle2, Loader2, XCircle, Server } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { InferenceEndpoint, EndpointStatus } from '@/types/pipeline-adapter';

interface EndpointStatusBannerProps {
  controlEndpoint: InferenceEndpoint | null;
  adaptedEndpoint: InferenceEndpoint | null;
}

function StatusIcon({ status }: { status: EndpointStatus | undefined }) {
  switch (status) {
    case 'ready':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'deploying':
    case 'pending':
      return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Server className="h-4 w-4 text-muted-foreground" />;
  }
}

function StatusBadge({ status }: { status: EndpointStatus | undefined }) {
  const variants: Record<EndpointStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    ready: 'default',
    deploying: 'secondary',
    pending: 'outline',
    failed: 'destructive',
    terminated: 'outline',
  };

  return (
    <Badge variant={variants[status || 'pending']}>
      {status || 'Unknown'}
    </Badge>
  );
}

export function EndpointStatusBanner({
  controlEndpoint,
  adaptedEndpoint
}: EndpointStatusBannerProps) {
  const bothReady = controlEndpoint?.status === 'ready' && adaptedEndpoint?.status === 'ready';
  const anyFailed = controlEndpoint?.status === 'failed' || adaptedEndpoint?.status === 'failed';

  if (bothReady) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">Endpoints Ready</AlertTitle>
        <AlertDescription className="text-green-700">
          Both inference endpoints are deployed and ready for testing.
        </AlertDescription>
      </Alert>
    );
  }

  if (anyFailed) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Deployment Failed</AlertTitle>
        <AlertDescription>
          {controlEndpoint?.errorMessage || adaptedEndpoint?.errorMessage ||
           'One or more endpoints failed to deploy. Please try again.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert>
      <Loader2 className="h-4 w-4 animate-spin" />
      <AlertTitle>Deploying Endpoints</AlertTitle>
      <AlertDescription>
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <StatusIcon status={controlEndpoint?.status} />
              Control Endpoint
            </span>
            <StatusBadge status={controlEndpoint?.status} />
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <StatusIcon status={adaptedEndpoint?.status} />
              Adapted Endpoint
            </span>
            <StatusBadge status={adaptedEndpoint?.status} />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Cold start typically takes 30-60 seconds. This page will update automatically.
        </p>
      </AlertDescription>
    </Alert>
  );
}
```

---

## Task 3: A/B Testing Panel Component

This is the main testing interface.

### File: `src/components/pipeline/ABTestingPanel.tsx`

```typescript
/**
 * A/B Testing Panel
 *
 * Main interface for running A/B tests between Control and Adapted models
 */

'use client';

import { useState } from 'react';
import { Send, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRunTest } from '@/hooks/useAdapterTesting';
import { TestResultComparison } from './TestResultComparison';
import { TestResult } from '@/types/pipeline-adapter';

interface ABTestingPanelProps {
  jobId: string;
  endpointsReady: boolean;
}

const DEFAULT_SYSTEM_PROMPT = `You are Elena Morales, CFP and founder of Pathways Financial Planning. You specialize in helping people navigate complex financial decisions with warmth, empathy, and clarity. Your approach always starts by acknowledging the person's feelings before providing practical advice.`;

export function ABTestingPanel({ jobId, endpointsReady }: ABTestingPanelProps) {
  const [userPrompt, setUserPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [enableEvaluation, setEnableEvaluation] = useState(false);
  const [latestResult, setLatestResult] = useState<TestResult | null>(null);

  const runTestMutation = useRunTest();

  const handleRunTest = async () => {
    if (!userPrompt.trim()) return;

    try {
      const result = await runTestMutation.mutateAsync({
        jobId,
        userPrompt: userPrompt.trim(),
        systemPrompt: systemPrompt.trim() || undefined,
        enableEvaluation,
      });

      if (result.data) {
        setLatestResult(result.data);
      }
    } catch (error) {
      console.error('Test failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Run A/B Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!endpointsReady && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Endpoints are still deploying. Please wait for both endpoints to be ready.
              </AlertDescription>
            </Alert>
          )}

          {/* System Prompt */}
          <div className="space-y-2">
            <Label htmlFor="system-prompt">System Prompt</Label>
            <Textarea
              id="system-prompt"
              placeholder="Enter system prompt (defines the AI persona)..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
          </div>

          {/* User Prompt */}
          <div className="space-y-2">
            <Label htmlFor="user-prompt">User Prompt</Label>
            <Textarea
              id="user-prompt"
              placeholder="Enter a user message to test... (e.g., 'I'm confused about whether I should pay off my student loans or start investing')"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              rows={3}
            />
          </div>

          {/* Options */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="enable-eval"
                checked={enableEvaluation}
                onCheckedChange={setEnableEvaluation}
              />
              <Label htmlFor="enable-eval">
                Enable Claude-as-Judge Evaluation
                <span className="text-muted-foreground text-xs ml-2">
                  (adds ~$0.02 per test)
                </span>
              </Label>
            </div>

            <Button
              onClick={handleRunTest}
              disabled={!endpointsReady || !userPrompt.trim() || runTestMutation.isPending}
              className="gap-2"
            >
              {runTestMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Run Test
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {latestResult && (
        <TestResultComparison result={latestResult} />
      )}
    </div>
  );
}
```

---

## Task 4: Test Result Comparison Component

This component displays side-by-side comparison of Control vs Adapted responses.

### File: `src/components/pipeline/TestResultComparison.tsx`

```typescript
/**
 * Test Result Comparison
 *
 * Side-by-side comparison of Control vs Adapted responses
 */

'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Clock, Zap, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useRateTest } from '@/hooks/useAdapterTesting';
import { TestResult, UserRating } from '@/types/pipeline-adapter';

interface TestResultComparisonProps {
  result: TestResult;
}

export function TestResultComparison({ result }: TestResultComparisonProps) {
  const [userNotes, setUserNotes] = useState('');
  const rateMutation = useRateTest();

  const handleRate = async (rating: UserRating) => {
    try {
      await rateMutation.mutateAsync({
        testId: result.id,
        rating,
        notes: userNotes || undefined,
      });
    } catch (error) {
      console.error('Rating failed:', error);
    }
  };

  const evalComparison = result.evaluationComparison;

  return (
    <div className="space-y-6">
      {/* Evaluation Summary (if available) */}
      {evalComparison && (
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5" />
              Claude-as-Judge Verdict
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge
                variant={evalComparison.winner === 'adapted' ? 'default' : 'secondary'}
                className="text-base px-4 py-1"
              >
                Winner: {evalComparison.winner === 'tie' ? 'Tie' :
                  evalComparison.winner === 'adapted' ? 'Adapted Model' : 'Control Model'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Score: {evalComparison.controlOverallScore.toFixed(1)} vs {evalComparison.adaptedOverallScore.toFixed(1)}
                ({evalComparison.scoreDifference > 0 ? '+' : ''}{evalComparison.scoreDifference.toFixed(1)})
              </span>
            </div>
            <p className="mt-2 text-sm">{evalComparison.summary}</p>

            {evalComparison.improvements.length > 0 && (
              <div className="mt-3">
                <span className="text-xs font-medium text-green-600">Improvements: </span>
                <span className="text-xs text-muted-foreground">
                  {evalComparison.improvements.join(', ')}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Side-by-side Responses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Control Response */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span>Control (Base Model)</span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {result.controlGenerationTimeMs}ms
                <Zap className="h-3 w-3 ml-2" />
                {result.controlTokensUsed} tokens
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap text-sm">
                {result.controlResponse || 'No response generated'}
              </p>
            </div>

            {result.controlEvaluation && (
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    Empathy: <strong>{result.controlEvaluation.empathyEvaluation.empathyScore}/5</strong>
                  </div>
                  <div>
                    Voice: <strong>{result.controlEvaluation.voiceConsistency.voiceScore}/5</strong>
                  </div>
                  <div>
                    Quality: <strong>{result.controlEvaluation.conversationQuality.qualityScore}/5</strong>
                  </div>
                  <div>
                    Overall: <strong>{result.controlEvaluation.overallEvaluation.overallScore}/5</strong>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Adapted Response */}
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                Adapted (With LoRA)
                {evalComparison?.winner === 'adapted' && (
                  <Badge variant="outline" className="text-xs">Winner</Badge>
                )}
              </span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {result.adaptedGenerationTimeMs}ms
                <Zap className="h-3 w-3 ml-2" />
                {result.adaptedTokensUsed} tokens
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap text-sm">
                {result.adaptedResponse || 'No response generated'}
              </p>
            </div>

            {result.adaptedEvaluation && (
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    Empathy: <strong>{result.adaptedEvaluation.empathyEvaluation.empathyScore}/5</strong>
                  </div>
                  <div>
                    Voice: <strong>{result.adaptedEvaluation.voiceConsistency.voiceScore}/5</strong>
                  </div>
                  <div>
                    Quality: <strong>{result.adaptedEvaluation.conversationQuality.qualityScore}/5</strong>
                  </div>
                  <div>
                    Overall: <strong>{result.adaptedEvaluation.overallEvaluation.overallScore}/5</strong>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Rating */}
      {!result.userRating && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Your Rating</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleRate('control')}
                disabled={rateMutation.isPending}
                className="flex-1"
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                Control Better
              </Button>
              <Button
                variant="outline"
                onClick={() => handleRate('adapted')}
                disabled={rateMutation.isPending}
                className="flex-1"
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                Adapted Better
              </Button>
              <Button
                variant="outline"
                onClick={() => handleRate('tie')}
                disabled={rateMutation.isPending}
              >
                Tie
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleRate('neither')}
                disabled={rateMutation.isPending}
              >
                <ThumbsDown className="h-4 w-4" />
              </Button>
            </div>

            <Textarea
              placeholder="Optional notes about your rating..."
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              rows={2}
            />
          </CardContent>
        </Card>
      )}

      {/* Show existing rating */}
      {result.userRating && (
        <div className="text-center text-sm text-muted-foreground">
          You rated: <Badge variant="outline">{result.userRating}</Badge>
          {result.userNotes && <span className="ml-2">"{result.userNotes}"</span>}
        </div>
      )}
    </div>
  );
}
```

---

## Task 5: Test History Table Component

This component displays previous tests.

### File: `src/components/pipeline/TestHistoryTable.tsx`

```typescript
/**
 * Test History Table
 *
 * Displays previous A/B test results for an adapter
 */

'use client';

import { formatDistanceToNow } from 'date-fns';
import { Clock, Trophy, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTestHistory } from '@/hooks/useAdapterTesting';
import { TestResult, UserRating } from '@/types/pipeline-adapter';

interface TestHistoryTableProps {
  jobId: string;
  onSelectTest?: (test: TestResult) => void;
}

function RatingIcon({ rating }: { rating: UserRating | null }) {
  switch (rating) {
    case 'control':
      return <ThumbsUp className="h-4 w-4 text-blue-500" />;
    case 'adapted':
      return <ThumbsUp className="h-4 w-4 text-green-500" />;
    case 'tie':
      return <Minus className="h-4 w-4 text-yellow-500" />;
    case 'neither':
      return <ThumbsDown className="h-4 w-4 text-red-500" />;
    default:
      return <span className="text-muted-foreground text-xs">—</span>;
  }
}

export function TestHistoryTable({ jobId, onSelectTest }: TestHistoryTableProps) {
  const { data, isLoading } = useTestHistory(jobId, { limit: 20 });

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading history...</div>;
  }

  if (!data?.data?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No tests run yet. Use the panel above to run your first A/B test.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Time</TableHead>
          <TableHead>Prompt</TableHead>
          <TableHead>AI Verdict</TableHead>
          <TableHead>Your Rating</TableHead>
          <TableHead>Gen Time</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.data.map((test) => (
          <TableRow key={test.id}>
            <TableCell className="text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(test.createdAt), { addSuffix: true })}
              </div>
            </TableCell>
            <TableCell className="max-w-xs truncate">
              {test.userPrompt}
            </TableCell>
            <TableCell>
              {test.evaluationComparison ? (
                <Badge variant={
                  test.evaluationComparison.winner === 'adapted' ? 'default' :
                  test.evaluationComparison.winner === 'control' ? 'secondary' :
                  'outline'
                }>
                  <Trophy className="h-3 w-3 mr-1" />
                  {test.evaluationComparison.winner}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">No eval</span>
              )}
            </TableCell>
            <TableCell>
              <RatingIcon rating={test.userRating} />
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              C: {test.controlGenerationTimeMs}ms
              <br />
              A: {test.adaptedGenerationTimeMs}ms
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSelectTest?.(test)}
              >
                View
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

---

## Task 6: Update Component Index

Update the component exports.

### File: `src/components/pipeline/index.ts`

Add to existing exports:

```typescript
// Existing exports
export { TrainingDataSummaryCard } from './TrainingDataSummaryCard';
export { TrainingParameterSlider } from './TrainingParameterSlider';
export { EngineFeaturesPanel } from './EngineFeaturesPanel';
export { TrainingProgressPanel } from './TrainingProgressPanel';
export { TrainingQualityEvaluation } from './TrainingQualityEvaluation';
export { PostTrainingEvaluationInfo } from './PostTrainingEvaluationInfo';
export { CostEstimateCard } from './CostEstimateCard';
export { DatasetSelectorModal } from './DatasetSelectorModal';

// NEW: Adapter testing exports
export { DeployAdapterButton } from './DeployAdapterButton';
export { ABTestingPanel } from './ABTestingPanel';
export { TestResultComparison } from './TestResultComparison';
export { EndpointStatusBanner } from './EndpointStatusBanner';
export { TestHistoryTable } from './TestHistoryTable';
```

---

## Task 7: Create Test Page

This is the main testing interface page.

### File: `src/app/(dashboard)/pipeline/jobs/[jobId]/test/page.tsx`

```typescript
/**
 * Adapter Testing Page
 *
 * A/B testing interface for comparing Control vs Adapted model responses
 */

'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePipelineJob } from '@/hooks/usePipelineJobs';
import { useEndpointStatus } from '@/hooks/useAdapterTesting';
import {
  ABTestingPanel,
  EndpointStatusBanner,
  TestHistoryTable,
  TestResultComparison,
} from '@/components/pipeline';
import { TestResult } from '@/types/pipeline-adapter';

export default function AdapterTestPage() {
  const params = useParams();
  const jobId = params.jobId as string;

  const { data: jobData, isLoading: jobLoading } = usePipelineJob(jobId);
  const { data: statusData, isLoading: statusLoading } = useEndpointStatus(jobId);

  const [selectedTest, setSelectedTest] = useState<TestResult | null>(null);

  const job = jobData?.data;
  const endpointStatus = statusData?.data;

  if (jobLoading || statusLoading) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold mb-2">Job Not Found</h2>
          <Link href="/pipeline/jobs">
            <Button variant="outline">Back to Jobs</Button>
          </Link>
        </div>
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
        <div>
          <h1 className="text-2xl font-bold">Test Adapter</h1>
          <p className="text-muted-foreground">{job.jobName}</p>
        </div>
      </div>

      {/* Endpoint Status */}
      <div className="mb-6">
        <EndpointStatusBanner
          controlEndpoint={endpointStatus?.controlEndpoint || null}
          adaptedEndpoint={endpointStatus?.adaptedEndpoint || null}
        />
      </div>

      {/* Main Content */}
      <Tabs defaultValue="test" className="space-y-6">
        <TabsList>
          <TabsTrigger value="test">Run Test</TabsTrigger>
          <TabsTrigger value="history">Test History</TabsTrigger>
        </TabsList>

        <TabsContent value="test">
          <ABTestingPanel
            jobId={jobId}
            endpointsReady={endpointStatus?.bothReady || false}
          />
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Previous Tests</CardTitle>
            </CardHeader>
            <CardContent>
              <TestHistoryTable
                jobId={jobId}
                onSelectTest={setSelectedTest}
              />
            </CardContent>
          </Card>

          {/* Selected Test Detail */}
          {selectedTest && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Test Details</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTest(null)}
                >
                  Close
                </Button>
              </div>
              <TestResultComparison result={selectedTest} />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## Task 8: Update Results Page

Add the Deploy button to the existing results page.

### File: `src/app/(dashboard)/pipeline/jobs/[jobId]/results/page.tsx`

Find the section with the Download button and add the Deploy button next to it:

```typescript
// Add import at top
import { DeployAdapterButton } from '@/components/pipeline';

// Find the header section with the Download button and update it:
{job.adapterFilePath && (
  <div className="flex gap-2">
    <Button asChild variant="outline">
      <a href={`/api/pipeline/jobs/${job.id}/download`} download>
        <Download className="h-4 w-4 mr-2" />
        Download
      </a>
    </Button>
    <DeployAdapterButton jobId={job.id} />
  </div>
)}
```

---

## Task 9: Verification & End-to-End Testing

After creating all files, verify the complete implementation:

### 1. Verify TypeScript Compilation

```bash
# Verify TypeScript compiles
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && npx tsc --noEmit --project tsconfig.json
```

### 2. Verify All Components Exist

```bash
# Check component files
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && ls -la src/components/pipeline/DeployAdapterButton.tsx src/components/pipeline/ABTestingPanel.tsx src/components/pipeline/TestResultComparison.tsx src/components/pipeline/EndpointStatusBanner.tsx src/components/pipeline/TestHistoryTable.tsx
```

### 3. Start Development Server

```bash
# Start Next.js dev server
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && npm run dev
```

### 4. End-to-End Test Workflow

Test the complete workflow:

1. Navigate to a completed training job's results page
2. Click "Deploy & Test Adapter" button
3. Wait for endpoints to deploy (30-60s)
4. Navigate to test page
5. Enter a test prompt
6. Verify both responses appear side-by-side
7. Rate the responses
8. Check test history tab
9. Verify test appears in history

---

## Success Criteria

Verify ALL criteria are met:

- [ ] All 5 component files created
- [ ] Component exports updated
- [ ] Test page created at correct route
- [ ] Results page updated with Deploy button
- [ ] TypeScript compiles without errors
- [ ] All components use correct hooks
- [ ] Loading states implemented
- [ ] Error handling implemented
- [ ] Responsive design (mobile + desktop)
- [ ] Polling works for endpoint status
- [ ] Side-by-side comparison displays correctly
- [ ] Rating buttons work
- [ ] Test history displays
- [ ] Navigation between pages works
- [ ] Complete workflow tested end-to-end

---

## Files Created/Modified

### New Files
| File | Purpose |
|------|---------|
| `src/components/pipeline/DeployAdapterButton.tsx` | Deploy button component |
| `src/components/pipeline/EndpointStatusBanner.tsx` | Status banner component |
| `src/components/pipeline/ABTestingPanel.tsx` | Main testing interface |
| `src/components/pipeline/TestResultComparison.tsx` | Side-by-side comparison |
| `src/components/pipeline/TestHistoryTable.tsx` | Test history display |
| `src/app/(dashboard)/pipeline/jobs/[jobId]/test/page.tsx` | Test page |

### Modified Files
| File | Changes |
|------|---------|
| `src/components/pipeline/index.ts` | Added adapter component exports |
| `src/app/(dashboard)/pipeline/jobs/[jobId]/results/page.tsx` | Added Deploy button |

---

## Complete Implementation Checklist

### E01: Database & Types ✓
- [x] Tables created in Supabase
- [x] TypeScript types defined
- [x] Database mapping utilities

### E02: Service Layer ✓
- [x] Inference service (RunPod integration)
- [x] Test service (A/B testing + Claude)

### E03: API Routes ✓
- [x] Deploy endpoint
- [x] Test endpoint
- [x] Status endpoint
- [x] Rate endpoint

### E04: React Query Hooks ✓
- [x] Adapter testing hooks
- [x] Query key management
- [x] Cache invalidation

### E05: UI Components & Pages ✓
- [x] Deploy button
- [x] Status banner
- [x] Testing panel
- [x] Result comparison
- [x] History table
- [x] Test page
- [x] Results page update

---

## Troubleshooting

### If endpoints fail to deploy:
1. Check RUNPOD_API_KEY is set
2. Verify RunPod account has credits
3. Check Supabase Storage adapter path is valid
4. Review error messages in endpoint records

### If tests fail to run:
1. Verify endpoints are ready (status === 'ready')
2. Check ANTHROPIC_API_KEY for evaluation
3. Review browser console for errors
4. Check API route logs

### If UI doesn't update:
1. Check polling is working (every 5s during deployment)
2. Verify cache invalidation is triggering
3. Hard refresh browser (Ctrl+Shift+R)

---

## Next Steps

After completing E05, the Adapter Application Module is COMPLETE!

**Post-Implementation:**
1. Run complete end-to-end test
2. Test with real training jobs
3. Monitor RunPod costs
4. Collect user feedback
5. Iterate on UI/UX improvements

---

**END OF E05 PROMPT - IMPLEMENTATION COMPLETE**

+++++++++++++++++



