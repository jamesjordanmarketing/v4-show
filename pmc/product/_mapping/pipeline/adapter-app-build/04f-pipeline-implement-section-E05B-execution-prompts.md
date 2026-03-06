# Adapter Application Module - Section E05B: UI Components & Pages

**Version:** 2.0 (Revised)  
**Date:** January 17, 2026  
**Section:** E05B - User Interface Layer (FINAL SECTION)  
**Prerequisites:** E01 ✅ COMPLETE, E02 ✅ COMPLETE, E03 ✅ COMPLETE, E04B ✅ COMPLETE  
**Builds Upon:** Complete foundation from E01-E04B  

---

## Overview

This prompt implements the complete user interface for adapter testing. This is the FINAL section that brings everything together into a working application.

**What This Section Creates:**
1. **5 React Components** - Deploy button, status banner, testing panel, comparison view, history table
2. **Test Page** - New page at `/pipeline/jobs/[jobId]/test`
3. **Results Page Update** - Add deploy button to existing results page
4. **Component Integration** - Export and wire up all components
5. **End-to-End Workflow** - Complete user journey from deployment to testing

**What This Section Completes:**
- The entire Adapter Application Module
- Full user workflow: Deploy → Test → Rate → Review
- Production-ready adapter testing interface

---

## Critical Instructions

### Use E04B Hooks (IMPORTANT!)

**All components MUST use the hooks from E04B:**

```typescript
import {
  // Combined hooks (recommended)
  useAdapterDeployment,
  useAdapterTesting,
  useAdapterWorkflow,
  
  // Individual hooks (if needed)
  useEndpointStatus,
  useTestHistory,
  useDeployAdapter,
  useRunTest,
  useRateTest,
  
  // Types
  type TestResult,
  type UserRating,
  type InferenceEndpoint,
} from '@/hooks';
```

**Why Combined Hooks?**
- Less boilerplate
- Better performance (shared queries)
- Cleaner code
- Automatic cache management

### UI Component Patterns

**Follow existing patterns from:**
- `src/components/pipeline/` - Component structure
- Use shadcn/ui components for consistency
- Implement proper loading states
- Handle errors gracefully with user-friendly messages
- Use Tailwind CSS for styling

### Type Safety

**All components must be fully typed:**
- Import types from `@/types/pipeline-adapter` or `@/hooks`
- No `any` types
- Proper prop interfaces
- Type guards for nullable values

---

## Reference Documents

**E04B Hooks Implementation:**
- Complete Guide: `docs/ADAPTER_E04_COMPLETE.md`
- Quick Start: `docs/ADAPTER_E04_QUICK_START.md`
- Implementation Summary: `docs/ADAPTER_E04_IMPLEMENTATION_SUMMARY.md`

**Previous Sections:**
- E01 Complete: `docs/ADAPTER_E01_COMPLETE.md`
- E02 Complete: `docs/ADAPTER_E02_COMPLETE.md`
- E03 Complete: `docs/ADAPTER_E03_COMPLETE.md`

**Existing Patterns:**
- Component patterns: `src/components/pipeline/TrainingQualityEvaluation.tsx`
- Page patterns: `src/app/(dashboard)/pipeline/jobs/[jobId]/results/page.tsx`

---

========================

# EXECUTION PROMPT E05B - UI COMPONENTS & PAGES IMPLEMENTATION

## Context

You are implementing the complete user interface for the Adapter Application Module. This is the FINAL section that creates all UI components and pages needed for adapter testing.

**Architecture Principles:**
1. **Use E04B Hooks** - Leverage the React Query hooks just implemented
2. **Type Safety** - All components fully typed
3. **Loading States** - Proper skeleton/loading UI
4. **Error Handling** - User-friendly error messages
5. **Responsive Design** - Mobile + desktop support
6. **Polling UI** - Show deployment progress automatically

**User Workflow:**
1. User completes training → adapter stored in Supabase ✅
2. User clicks "Deploy & Test Adapter" on results page → NEW
3. System deploys Control and Adapted endpoints (auto-polling) → NEW
4. User enters test prompts and compares responses side-by-side → NEW
5. Optional: Claude-as-Judge provides automated evaluation → NEW
6. User rates which response was better → NEW
7. All tests saved for later review → NEW

---

## Task 1: Deploy Adapter Button Component

This button appears on the results page and handles deployment with auto-status checking.

### File: `src/components/pipeline/DeployAdapterButton.tsx`

**Key Features:**
- Uses `useAdapterDeployment` hook
- Auto-updates during deployment (polling)
- Navigates to test page when ready
- Shows retry on failure

```typescript
/**
 * Deploy Adapter Button
 *
 * Initiates adapter deployment and shows real-time deployment status.
 * Uses useAdapterDeployment hook for automatic status polling.
 */

'use client';

import { useRouter } from 'next/navigation';
import { Rocket, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdapterDeployment } from '@/hooks';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DeployAdapterButtonProps {
  jobId: string;
  disabled?: boolean;
}

export function DeployAdapterButton({ jobId, disabled }: DeployAdapterButtonProps) {
  const router = useRouter();
  const {
    deploy,
    isDeploying,
    bothReady,
    isControlReady,
    isAdaptedReady,
    hasAnyFailed,
    status,
    deployError,
    statusError,
  } = useAdapterDeployment(jobId);

  const handleDeploy = async () => {
    try {
      await deploy();
    } catch (error) {
      console.error('Deploy failed:', error);
      // Error is already exposed via deployError
    }
  };

  const handleGoToTest = () => {
    router.push(`/pipeline/jobs/${jobId}/test`);
  };

  // If endpoints are ready, show "Test Adapter" button
  if (bothReady) {
    return (
      <Button onClick={handleGoToTest} className="gap-2">
        <CheckCircle2 className="h-4 w-4" />
        Test Adapter
      </Button>
    );
  }

  // If deploying, show deployment status with tooltip
  if (isDeploying || status) {
    const isAnyDeploying = !bothReady && !hasAnyFailed;
    
    if (isAnyDeploying) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button disabled className="gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Deploying Endpoints...
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1 text-xs">
                <div>Control: {isControlReady ? '✓ Ready' : '⏳ Deploying'}</div>
                <div>Adapted: {isAdaptedReady ? '✓ Ready' : '⏳ Deploying'}</div>
                <div className="text-muted-foreground mt-2">
                  Auto-updating every 5 seconds
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
  }

  // If failed, show retry with error info
  if (hasAnyFailed) {
    const errorMsg = status?.controlEndpoint?.errorMessage || 
                     status?.adaptedEndpoint?.errorMessage;
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleDeploy}
              variant="destructive"
              className="gap-2"
              disabled={disabled}
            >
              <XCircle className="h-4 w-4" />
              Retry Deployment
            </Button>
          </TooltipTrigger>
          {errorMsg && (
            <TooltipContent>
              <div className="max-w-xs text-xs">
                {errorMsg}
              </div>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Show error state if deployment mutation failed
  if (deployError) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleDeploy}
              variant="outline"
              className="gap-2 border-red-300 text-red-700"
              disabled={disabled}
            >
              <AlertCircle className="h-4 w-4" />
              Deploy Failed - Retry
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="max-w-xs text-xs">
              {deployError.message}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Default: show deploy button
  return (
    <Button
      onClick={handleDeploy}
      className="gap-2"
      disabled={disabled}
    >
      <Rocket className="h-4 w-4" />
      Deploy & Test Adapter
    </Button>
  );
}
```

---

## Task 2: Endpoint Status Banner Component

This banner shows deployment status on the test page with real-time updates.

### File: `src/components/pipeline/EndpointStatusBanner.tsx`

**Key Features:**
- Clear visual status indicators
- Deployment progress display
- Error messages
- Estimated time info

```typescript
/**
 * Endpoint Status Banner
 *
 * Displays deployment status for Control and Adapted endpoints
 * with real-time updates via polling.
 */

'use client';

import { CheckCircle2, Loader2, XCircle, Server, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { type InferenceEndpoint, type EndpointStatus } from '@/hooks';

interface EndpointStatusBannerProps {
  controlEndpoint: InferenceEndpoint | null;
  adaptedEndpoint: InferenceEndpoint | null;
  bothReady: boolean;
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
    case 'terminated':
      return <Server className="h-4 w-4 text-gray-400" />;
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
    <Badge variant={variants[status || 'pending']} className="capitalize">
      {status || 'Unknown'}
    </Badge>
  );
}

export function EndpointStatusBanner({
  controlEndpoint,
  adaptedEndpoint,
  bothReady,
}: EndpointStatusBannerProps) {
  const anyFailed = controlEndpoint?.status === 'failed' || adaptedEndpoint?.status === 'failed';
  const controlReady = controlEndpoint?.status === 'ready';
  const adaptedReady = adaptedEndpoint?.status === 'ready';
  
  // Calculate progress (0-100)
  const progress = bothReady ? 100 : 
                   (controlReady && adaptedReady ? 100 :
                    controlReady || adaptedReady ? 50 : 
                    25);

  // Both ready - success state
  if (bothReady) {
    return (
      <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertTitle className="text-green-800 dark:text-green-300">
          Endpoints Ready
        </AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-400">
          Both inference endpoints are deployed and ready for testing.
        </AlertDescription>
      </Alert>
    );
  }

  // Any failed - error state
  if (anyFailed) {
    const errorMsg = controlEndpoint?.errorMessage || adaptedEndpoint?.errorMessage;
    
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Deployment Failed</AlertTitle>
        <AlertDescription>
          <p className="mb-2">
            {errorMsg || 'One or more endpoints failed to deploy. Please try again.'}
          </p>
          <div className="mt-3 space-y-1 text-xs">
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
        </AlertDescription>
      </Alert>
    );
  }

  // Deploying - progress state
  return (
    <Alert>
      <Loader2 className="h-4 w-4 animate-spin" />
      <AlertTitle>Deploying Endpoints</AlertTitle>
      <AlertDescription>
        <div className="space-y-3">
          {/* Progress bar */}
          <Progress value={progress} className="h-2" />
          
          {/* Endpoint statuses */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm">
                <StatusIcon status={controlEndpoint?.status} />
                Control Endpoint
              </span>
              <StatusBadge status={controlEndpoint?.status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm">
                <StatusIcon status={adaptedEndpoint?.status} />
                Adapted Endpoint
              </span>
              <StatusBadge status={adaptedEndpoint?.status} />
            </div>
          </div>
          
          {/* Time estimate */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3 pt-3 border-t">
            <Clock className="h-3 w-3" />
            <span>
              Cold start typically takes 30-60 seconds. 
              This page updates automatically every 5 seconds.
            </span>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
```

---

## Task 3: A/B Testing Panel Component

This is the main testing interface where users input prompts and run tests.

### File: `src/components/pipeline/ABTestingPanel.tsx`

**Key Features:**
- Uses `useAdapterTesting` hook
- Form validation
- Loading states
- Evaluation toggle
- Auto-displays results

```typescript
/**
 * A/B Testing Panel
 *
 * Main interface for running A/B tests between Control and Adapted models.
 * Uses useAdapterTesting hook for test execution and result management.
 */

'use client';

import { useState } from 'react';
import { Send, Loader2, Sparkles, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAdapterTesting } from '@/hooks';
import { TestResultComparison } from './TestResultComparison';

interface ABTestingPanelProps {
  jobId: string;
  endpointsReady: boolean;
}

const DEFAULT_SYSTEM_PROMPT = `You are Elena Morales, CFP and founder of Pathways Financial Planning. You specialize in helping people navigate complex financial decisions with warmth, empathy, and clarity. Your approach always starts by acknowledging the person's feelings before providing practical advice.`;

const EXAMPLE_PROMPTS = [
  "I'm confused about whether I should pay off my student loans or start investing for retirement.",
  "My spouse and I can't agree on how much to spend on our wedding. We're fighting about money.",
  "I just inherited $50,000 and I'm overwhelmed. What should I do?",
];

export function ABTestingPanel({ jobId, endpointsReady }: ABTestingPanelProps) {
  const [userPrompt, setUserPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [enableEvaluation, setEnableEvaluation] = useState(false);

  const {
    runTest,
    isRunning,
    runError,
    latestResult,
  } = useAdapterTesting(jobId);

  const handleRunTest = async () => {
    if (!userPrompt.trim()) return;

    try {
      await runTest({
        jobId,
        userPrompt: userPrompt.trim(),
        systemPrompt: systemPrompt.trim() || undefined,
        enableEvaluation,
      });
    } catch (error) {
      console.error('Test failed:', error);
      // Error is already exposed via runError
    }
  };

  const handleUseExample = (example: string) => {
    setUserPrompt(example);
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
          <CardDescription>
            Compare how the base model and adapted model respond to the same prompt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Endpoints not ready warning */}
          {!endpointsReady && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Endpoints are still deploying. Please wait for both endpoints to be ready.
              </AlertDescription>
            </Alert>
          )}

          {/* Run error display */}
          {runError && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Test Failed:</strong> {runError.message}
              </AlertDescription>
            </Alert>
          )}

          {/* System Prompt */}
          <div className="space-y-2">
            <Label htmlFor="system-prompt" className="flex items-center gap-2">
              System Prompt
              <span className="text-xs text-muted-foreground font-normal">
                (defines the AI persona and behavior)
              </span>
            </Label>
            <Textarea
              id="system-prompt"
              placeholder="Enter system prompt..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
          </div>

          {/* User Prompt */}
          <div className="space-y-2">
            <Label htmlFor="user-prompt" className="flex items-center justify-between">
              <span>User Prompt *</span>
              {userPrompt.length > 0 && (
                <span className="text-xs text-muted-foreground font-normal">
                  {userPrompt.length} characters
                </span>
              )}
            </Label>
            <Textarea
              id="user-prompt"
              placeholder="Enter a user message to test..."
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              rows={3}
              required
            />
            
            {/* Example prompts */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground">Examples:</span>
              {EXAMPLE_PROMPTS.map((example, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => handleUseExample(example)}
                  className="text-xs h-7"
                >
                  Example {idx + 1}
                </Button>
              ))}
            </div>
          </div>

          {/* Options and Submit */}
          <div className="flex items-center justify-between pt-2">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="enable-eval"
                  checked={enableEvaluation}
                  onCheckedChange={setEnableEvaluation}
                  disabled={!endpointsReady}
                />
                <Label htmlFor="enable-eval" className="flex items-center gap-2">
                  <span>Enable Claude-as-Judge Evaluation</span>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </Label>
              </div>
              {enableEvaluation && (
                <p className="text-xs text-muted-foreground ml-6">
                  Adds automated evaluation metrics (~$0.02 per test)
                </p>
              )}
            </div>

            <Button
              onClick={handleRunTest}
              disabled={!endpointsReady || !userPrompt.trim() || isRunning}
              className="gap-2"
              size="lg"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running Test...
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
        <TestResultComparison result={latestResult} jobId={jobId} />
      )}
    </div>
  );
}
```

---

## Task 4: Test Result Comparison Component

This component displays side-by-side comparison with evaluation and rating.

### File: `src/components/pipeline/TestResultComparison.tsx`

**Key Features:**
- Side-by-side response comparison
- Claude evaluation display (if enabled)
- Rating interface with optimistic updates
- Generation time and token usage stats

```typescript
/**
 * Test Result Comparison
 *
 * Side-by-side comparison of Control vs Adapted responses
 * with evaluation metrics and rating interface.
 */

'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Clock, Zap, Trophy, Minus, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAdapterTesting, type TestResult, type UserRating } from '@/hooks';

interface TestResultComparisonProps {
  result: TestResult;
  jobId: string;
}

export function TestResultComparison({ result, jobId }: TestResultComparisonProps) {
  const [userNotes, setUserNotes] = useState(result.userNotes || '');
  const { rateTest, isRating } = useAdapterTesting(jobId);

  const handleRate = async (rating: UserRating) => {
    try {
      await rateTest({
        testId: result.id,
        rating,
        notes: userNotes || undefined,
      });
    } catch (error) {
      console.error('Rating failed:', error);
    }
  };

  const evalComparison = result.evaluationComparison;
  const hasRating = result.userRating !== null;

  return (
    <div className="space-y-6">
      {/* Claude-as-Judge Evaluation (if available) */}
      {evalComparison && (
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-amber-500" />
              Claude-as-Judge Verdict
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Winner and Score */}
            <div className="flex items-center gap-4">
              <Badge
                variant={evalComparison.winner === 'adapted' ? 'default' : 
                        evalComparison.winner === 'control' ? 'secondary' : 'outline'}
                className="text-base px-4 py-1"
              >
                {evalComparison.winner === 'tie' ? 'Tie' :
                 evalComparison.winner === 'adapted' ? '🏆 Adapted Model Wins' :
                 '🏆 Control Model Wins'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Score: <strong>{evalComparison.controlOverallScore.toFixed(1)}</strong> vs{' '}
                <strong>{evalComparison.adaptedOverallScore.toFixed(1)}</strong>
                <span className={evalComparison.scoreDifference > 0 ? 'text-green-600' : 'text-red-600'}>
                  {' '}({evalComparison.scoreDifference > 0 ? '+' : ''}
                  {evalComparison.scoreDifference.toFixed(1)})
                </span>
              </span>
            </div>

            {/* Summary */}
            <p className="text-sm">{evalComparison.summary}</p>

            {/* Improvements */}
            {evalComparison.improvements.length > 0 && (
              <div className="bg-green-50 dark:bg-green-950 p-3 rounded-md">
                <p className="text-xs font-medium text-green-800 dark:text-green-300 mb-1">
                  ✓ Improvements:
                </p>
                <ul className="text-xs text-green-700 dark:text-green-400 space-y-1">
                  {evalComparison.improvements.map((improvement, idx) => (
                    <li key={idx}>• {improvement}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Regressions */}
            {evalComparison.regressions.length > 0 && (
              <div className="bg-red-50 dark:bg-red-950 p-3 rounded-md">
                <p className="text-xs font-medium text-red-800 dark:text-red-300 mb-1">
                  ⚠ Regressions:
                </p>
                <ul className="text-xs text-red-700 dark:text-red-400 space-y-1">
                  {evalComparison.regressions.map((regression, idx) => (
                    <li key={idx}>• {regression}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Side-by-side Responses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Control Response */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span>Control (Base Model)</span>
              <div className="flex items-center gap-3 text-xs text-muted-foreground font-normal">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {result.controlGenerationTimeMs}ms
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {result.controlTokensUsed} tokens
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Response */}
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <p className="whitespace-pre-wrap text-sm">
                {result.controlResponse || 'No response generated'}
              </p>
            </div>

            {/* Evaluation Scores */}
            {result.controlEvaluation && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Evaluation Scores
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span>Empathy:</span>
                      <strong>{result.controlEvaluation.empathyEvaluation.empathyScore}/5</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Voice:</span>
                      <strong>{result.controlEvaluation.voiceConsistency.voiceScore}/5</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Quality:</span>
                      <strong>{result.controlEvaluation.conversationQuality.qualityScore}/5</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Overall:</span>
                      <strong>{result.controlEvaluation.overallEvaluation.overallScore}/5</strong>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Adapted Response */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                Adapted (With LoRA)
                {evalComparison?.winner === 'adapted' && (
                  <Badge variant="outline" className="text-xs bg-amber-100 dark:bg-amber-950 border-amber-300">
                    Winner
                  </Badge>
                )}
              </span>
              <div className="flex items-center gap-3 text-xs text-muted-foreground font-normal">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {result.adaptedGenerationTimeMs}ms
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {result.adaptedTokensUsed} tokens
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Response */}
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <p className="whitespace-pre-wrap text-sm">
                {result.adaptedResponse || 'No response generated'}
              </p>
            </div>

            {/* Evaluation Scores */}
            {result.adaptedEvaluation && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Evaluation Scores
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span>Empathy:</span>
                      <strong>{result.adaptedEvaluation.empathyEvaluation.empathyScore}/5</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Voice:</span>
                      <strong>{result.adaptedEvaluation.voiceConsistency.voiceScore}/5</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Quality:</span>
                      <strong>{result.adaptedEvaluation.conversationQuality.qualityScore}/5</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Overall:</span>
                      <strong>{result.adaptedEvaluation.overallEvaluation.overallScore}/5</strong>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Rating Section */}
      {!hasRating ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your Rating</CardTitle>
            <p className="text-sm text-muted-foreground">
              Which response better achieved the goal?
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Rating Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => handleRate('control')}
                disabled={isRating}
                className="flex-1 min-w-[140px]"
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                Control Better
              </Button>
              <Button
                variant="outline"
                onClick={() => handleRate('adapted')}
                disabled={isRating}
                className="flex-1 min-w-[140px]"
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                Adapted Better
              </Button>
              <Button
                variant="outline"
                onClick={() => handleRate('tie')}
                disabled={isRating}
                className="min-w-[100px]"
              >
                <Minus className="h-4 w-4 mr-2" />
                Tie
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleRate('neither')}
                disabled={isRating}
                className="min-w-[100px]"
              >
                <ThumbsDown className="h-4 w-4 mr-2" />
                Neither
              </Button>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="rating-notes">
                Notes (optional)
              </Label>
              <Textarea
                id="rating-notes"
                placeholder="Add notes about your rating (e.g., why you preferred one over the other)..."
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                rows={2}
                disabled={isRating}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-600" />
              <span className="font-medium">You rated this test:</span>
              <Badge variant="outline" className="capitalize">
                {result.userRating}
              </Badge>
              {result.userNotes && (
                <span className="text-muted-foreground ml-2">
                  "{result.userNotes}"
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

## Task 5: Test History Table Component

This component displays previous tests with filtering and pagination.

### File: `src/components/pipeline/TestHistoryTable.tsx`

**Key Features:**
- Uses `useTestHistory` hook (from `useAdapterTesting`)
- Pagination support
- Click to view test details
- Rating and evaluation indicators

```typescript
/**
 * Test History Table
 *
 * Displays previous A/B test results with pagination support.
 * Uses useAdapterTesting hook for history data.
 */

'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Clock, Trophy, ThumbsUp, ThumbsDown, Minus, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { useAdapterTesting, type TestResult, type UserRating } from '@/hooks';

interface TestHistoryTableProps {
  jobId: string;
  onSelectTest?: (test: TestResult) => void;
}

function RatingIcon({ rating }: { rating: UserRating | null }) {
  switch (rating) {
    case 'control':
      return (
        <div className="flex items-center gap-1 text-blue-600">
          <ThumbsUp className="h-4 w-4" />
          <span className="text-xs">Control</span>
        </div>
      );
    case 'adapted':
      return (
        <div className="flex items-center gap-1 text-green-600">
          <ThumbsUp className="h-4 w-4" />
          <span className="text-xs">Adapted</span>
        </div>
      );
    case 'tie':
      return (
        <div className="flex items-center gap-1 text-yellow-600">
          <Minus className="h-4 w-4" />
          <span className="text-xs">Tie</span>
        </div>
      );
    case 'neither':
      return (
        <div className="flex items-center gap-1 text-red-600">
          <ThumbsDown className="h-4 w-4" />
          <span className="text-xs">Neither</span>
        </div>
      );
    default:
      return <span className="text-muted-foreground text-xs">Not rated</span>;
  }
}

export function TestHistoryTable({ jobId, onSelectTest }: TestHistoryTableProps) {
  const [page, setPage] = useState(0);
  const limit = 20;

  const {
    history,
    historyCount,
    isLoadingHistory,
    currentPage,
    totalPages,
  } = useAdapterTesting(jobId, {
    limit,
    offset: page * limit,
  });

  if (isLoadingHistory) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center gap-2 text-muted-foreground">
          <div className="h-4 w-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
          Loading test history...
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex flex-col items-center gap-2">
          <div className="text-muted-foreground text-sm">
            No tests run yet
          </div>
          <div className="text-xs text-muted-foreground">
            Use the panel above to run your first A/B test
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Time</TableHead>
              <TableHead>Prompt</TableHead>
              <TableHead className="w-[140px]">AI Verdict</TableHead>
              <TableHead className="w-[140px]">Your Rating</TableHead>
              <TableHead className="w-[120px]">Gen Time</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((test) => (
              <TableRow key={test.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell className="text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(test.createdAt), { addSuffix: true })}
                  </div>
                </TableCell>
                <TableCell className="max-w-xs">
                  <div className="truncate">{test.userPrompt}</div>
                </TableCell>
                <TableCell>
                  {test.evaluationComparison ? (
                    <Badge
                      variant={
                        test.evaluationComparison.winner === 'adapted'
                          ? 'default'
                          : test.evaluationComparison.winner === 'control'
                          ? 'secondary'
                          : 'outline'
                      }
                      className="capitalize"
                    >
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
                  <div>C: {test.controlGenerationTimeMs}ms</div>
                  <div>A: {test.adaptedGenerationTimeMs}ms</div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelectTest?.(test)}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {page * limit + 1}-{Math.min((page + 1) * limit, historyCount)} of{' '}
            {historyCount} tests
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="text-sm">
              Page {currentPage + 1} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Task 6: Update Component Index

Add all new components to the pipeline component exports.

### File: `src/components/pipeline/index.ts`

**Action:** Add to existing exports (don't remove existing exports)

```typescript
// Existing exports (keep all of these)
export { TrainingDataSummaryCard } from './TrainingDataSummaryCard';
export { TrainingParameterSlider } from './TrainingParameterSlider';
export { EngineFeaturesPanel } from './EngineFeaturesPanel';
export { TrainingProgressPanel } from './TrainingProgressPanel';
export { TrainingQualityEvaluation } from './TrainingQualityEvaluation';
export { PostTrainingEvaluationInfo } from './PostTrainingEvaluationInfo';
export { CostEstimateCard } from './CostEstimateCard';
export { DatasetSelectorModal } from './DatasetSelectorModal';

// NEW: Adapter testing component exports
export { DeployAdapterButton } from './DeployAdapterButton';
export { ABTestingPanel } from './ABTestingPanel';
export { TestResultComparison } from './TestResultComparison';
export { EndpointStatusBanner } from './EndpointStatusBanner';
export { TestHistoryTable } from './TestHistoryTable';
```

---

## Task 7: Create Test Page

Create the main adapter testing page.

### File: `src/app/(dashboard)/pipeline/jobs/[jobId]/test/page.tsx`

**Key Features:**
- Uses `useAdapterWorkflow` hook (most comprehensive)
- Tabbed interface (Run Test / History)
- Auto-updates with polling
- Mobile responsive

```typescript
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
import { ArrowLeft, Loader2, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
```

---

## Task 8: Update Results Page

Add the Deploy button to the existing results page.

### File: `src/app/(dashboard)/pipeline/jobs/[jobId]/results/page.tsx`

**Action:** Find the section with the Download button and add the Deploy button next to it.

**Add import at top:**
```typescript
import { DeployAdapterButton } from '@/components/pipeline';
```

**Find and update the header actions section:**

Look for code similar to:
```typescript
{job.adapterFilePath && (
  <Button asChild variant="outline">
    <a href={`/api/pipeline/jobs/${job.id}/download`} download>
      <Download className="h-4 w-4 mr-2" />
      Download
    </a>
  </Button>
)}
```

**Replace with:**
```typescript
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

## Task 9: Verification & Testing

After creating all files, verify the complete implementation.

### 1. Verify File Structure

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show"

# Check component files
ls -la src/components/pipeline/DeployAdapterButton.tsx
ls -la src/components/pipeline/EndpointStatusBanner.tsx
ls -la src/components/pipeline/ABTestingPanel.tsx
ls -la src/components/pipeline/TestResultComparison.tsx
ls -la src/components/pipeline/TestHistoryTable.tsx

# Check test page
ls -la "src/app/(dashboard)/pipeline/jobs/[jobId]/test/page.tsx"

# Check component index
cat src/components/pipeline/index.ts | grep -E "(DeployAdapter|ABTesting|TestResult|EndpointStatus|TestHistory)"
```

### 2. Verify TypeScript Compilation

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/src"
npx tsc --noEmit --project tsconfig.json
```

**Expected:** Exit code 0, no errors

### 3. Check for Linter Errors

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/src"
npx eslint components/pipeline/DeployAdapterButton.tsx components/pipeline/ABTestingPanel.tsx components/pipeline/TestResultComparison.tsx --max-warnings=0
```

### 4. Verify Hook Imports

Check that all components import from the correct location:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show"
grep -r "from '@/hooks'" src/components/pipeline/*.tsx | grep -E "(DeployAdapter|ABTesting|TestResult|EndpointStatus|TestHistory)"
```

**Expected:** All imports should use `@/hooks`

### 5. Count Lines of Code

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show"
wc -l src/components/pipeline/DeployAdapterButton.tsx \
      src/components/pipeline/EndpointStatusBanner.tsx \
      src/components/pipeline/ABTestingPanel.tsx \
      src/components/pipeline/TestResultComparison.tsx \
      src/components/pipeline/TestHistoryTable.tsx \
      "src/app/(dashboard)/pipeline/jobs/[jobId]/test/page.tsx"
```

---

## Success Criteria

Verify ALL criteria are met:

### Implementation ✅
- [ ] All 5 component files created
- [ ] Component index updated with exports
- [ ] Test page created at correct route
- [ ] Results page updated with Deploy button
- [ ] All imports use `@/hooks` (not relative paths)

### Code Quality ✅
- [ ] TypeScript compiles without errors
- [ ] No linter warnings
- [ ] All components fully typed (no `any`)
- [ ] Proper prop interfaces defined
- [ ] Error boundaries implemented

### E04B Hook Usage ✅
- [ ] DeployAdapterButton uses `useAdapterDeployment`
- [ ] EndpointStatusBanner receives props from hooks
- [ ] ABTestingPanel uses `useAdapterTesting`
- [ ] TestResultComparison uses `useAdapterTesting` for rating
- [ ] TestHistoryTable uses `useAdapterTesting` for history
- [ ] Test page uses `useAdapterWorkflow`

### UI/UX Features ✅
- [ ] Loading states implemented (spinners, skeletons)
- [ ] Error handling implemented (user-friendly messages)
- [ ] Polling works (status updates every 5s)
- [ ] Responsive design (mobile + desktop)
- [ ] Tooltips for additional info
- [ ] Progress indicators
- [ ] Optimistic updates for ratings

### Functionality ✅
- [ ] Deploy button appears on results page
- [ ] Deploy button shows deployment status
- [ ] Status banner updates automatically
- [ ] Test panel validates input
- [ ] Side-by-side comparison displays correctly
- [ ] Claude evaluation displays when enabled
- [ ] Rating buttons work with optimistic updates
- [ ] Test history displays with pagination
- [ ] Navigation between pages works

### End-to-End Testing ✅
- [ ] Complete workflow tested:
  1. Navigate to completed job results
  2. Click "Deploy & Test Adapter"
  3. Watch endpoints deploy (auto-updates)
  4. Enter test prompt
  5. Run test with evaluation
  6. View side-by-side comparison
  7. Rate the result (optimistic update)
  8. Check test history
  9. View previous test details

---

## Files Created/Modified

### New Files (6)

| File | Lines | Purpose |
|------|-------|---------|
| `src/components/pipeline/DeployAdapterButton.tsx` | ~130 | Deploy button with status |
| `src/components/pipeline/EndpointStatusBanner.tsx` | ~170 | Status banner with progress |
| `src/components/pipeline/ABTestingPanel.tsx` | ~180 | Main testing interface |
| `src/components/pipeline/TestResultComparison.tsx` | ~260 | Side-by-side comparison |
| `src/components/pipeline/TestHistoryTable.tsx` | ~200 | History table with pagination |
| `src/app/(dashboard)/pipeline/jobs/[jobId]/test/page.tsx` | ~160 | Test page |

**Total New Code:** ~1,100 lines

### Modified Files (2)

| File | Changes |
|------|---------|
| `src/components/pipeline/index.ts` | Added 5 component exports |
| `src/app/(dashboard)/pipeline/jobs/[jobId]/results/page.tsx` | Added DeployAdapterButton import and usage |

---

## Complete Implementation Checklist

### E01: Database & Types ✅ COMPLETE
- [x] Tables created in Supabase
- [x] TypeScript types defined
- [x] Database mapping utilities

### E02: Service Layer ✅ COMPLETE
- [x] Inference service (RunPod integration)
- [x] Test service (A/B testing + Claude evaluation)

### E03: API Routes ✅ COMPLETE
- [x] Deploy endpoint
- [x] Test endpoint
- [x] Status endpoint (with pagination)
- [x] Rate endpoint

### E04B: React Query Hooks ✅ COMPLETE
- [x] Query hooks (status, history)
- [x] Mutation hooks (deploy, test, rate)
- [x] Combined hooks (deployment, testing, workflow)
- [x] Query key management
- [x] Cache invalidation
- [x] Optimistic updates
- [x] Automatic polling

### E05B: UI Components & Pages ✅ COMPLETE
- [x] Deploy button component
- [x] Status banner component
- [x] Testing panel component
- [x] Result comparison component
- [x] History table component
- [x] Test page
- [x] Results page update
- [x] Component exports

**🎉 ADAPTER APPLICATION MODULE COMPLETE!**

---

## Troubleshooting

### Endpoints fail to deploy

**Symptoms:** Deployment stuck in "pending" or fails immediately

**Solutions:**
1. Check `RUNPOD_API_KEY` environment variable is set
2. Verify RunPod account has credits
3. Check Supabase Storage adapter path is valid
4. Review error messages in `inference_endpoints` table
5. Check RunPod dashboard for GPU availability

### Tests fail to run

**Symptoms:** Test button does nothing or shows error

**Solutions:**
1. Verify both endpoints have `status = 'ready'`
2. Check `ANTHROPIC_API_KEY` for evaluation feature
3. Review browser console for JavaScript errors
4. Check API route logs in terminal
5. Verify user prompt is not empty

### UI doesn't update during deployment

**Symptoms:** Status banner shows "deploying" but never updates

**Solutions:**
1. Check polling is working (Network tab → should see requests every 5s)
2. Verify `useEndpointStatus` hook is being called
3. Check React Query DevTools (if enabled)
4. Hard refresh browser (Ctrl+Shift+R)
5. Check for JavaScript errors in console

### Rating doesn't save

**Symptoms:** Rating buttons clicked but no feedback

**Solutions:**
1. Check optimistic update is working (should update immediately)
2. Verify `useRateTest` mutation is being called
3. Check API route response in Network tab
4. Review test result ID is valid
5. Check database permissions

### TypeScript errors

**Symptoms:** Build fails with type errors

**Solutions:**
1. Verify all types imported from `@/hooks` or `@/types/pipeline-adapter`
2. Check prop interfaces are defined correctly
3. Run `npx tsc --noEmit` to see all errors
4. Ensure no `any` types used
5. Check nullable value handling with type guards

---

## Performance Optimization

### Automatic Polling
- Endpoint status polls every 5s during deployment
- Stops automatically when both endpoints ready
- Uses React Query's smart refetching

### Cache Management
- Test history cached for 30s
- Endpoint status cached for 10s
- Optimistic updates for instant feedback
- Automatic cache invalidation on mutations

### Bundle Size
- All components tree-shakeable
- Icons imported individually
- No large dependencies added
- Total added: ~30KB gzipped

---

## Next Steps (Post-Implementation)

### 1. End-to-End Testing
- [ ] Test complete workflow with real training job
- [ ] Verify polling behavior
- [ ] Test error scenarios
- [ ] Check mobile responsiveness
- [ ] Validate evaluation feature

### 2. Monitoring
- [ ] Track RunPod deployment success rate
- [ ] Monitor test execution times
- [ ] Track Claude evaluation costs
- [ ] Monitor user rating patterns

### 3. User Feedback
- [ ] Collect feedback on UI/UX
- [ ] Identify pain points
- [ ] Track feature usage
- [ ] Gather improvement suggestions

### 4. Potential Enhancements
- [ ] Export test results to CSV
- [ ] Compare multiple tests side-by-side
- [ ] Test result analytics dashboard
- [ ] Batch testing capabilities
- [ ] Custom evaluation criteria

---

## Documentation Generated

After implementation, create completion docs:

- [ ] `docs/ADAPTER_E05B_COMPLETE.md` - Implementation summary
- [ ] `docs/ADAPTER_E05B_CHECKLIST.md` - Verification checklist
- [ ] `docs/ADAPTER_E05B_QUICK_START.md` - Component usage guide
- [ ] `docs/ADAPTER_MODULE_COMPLETE.md` - Final module summary

---

## Success Metrics

**When E05B is complete, you should have:**

- ✅ 5 production-ready React components (~1,100 lines)
- ✅ Complete test page with tabs
- ✅ Updated results page with deploy button
- ✅ Full integration with E04B hooks
- ✅ TypeScript compiles without errors
- ✅ Zero linter warnings
- ✅ Responsive mobile + desktop UI
- ✅ Complete end-to-end workflow functional

**Total Implementation Stats:**
- **E01:** Database & Types (~400 lines)
- **E02:** Service Layer (~800 lines)
- **E03:** API Routes (~600 lines)
- **E04B:** React Query Hooks (~840 lines)
- **E05B:** UI Components (~1,100 lines)

**Grand Total:** ~3,740 lines of production code

**🎉 ADAPTER APPLICATION MODULE 100% COMPLETE!**

---

**Status:** Ready for Implementation  
**Estimated Time:** 2-3 hours  
**Complexity:** Medium  
**Dependencies:** E01 ✅ E02 ✅ E03 ✅ E04B ✅  

**This is the FINAL section!**

---

**END OF E05B EXECUTION PROMPT**
