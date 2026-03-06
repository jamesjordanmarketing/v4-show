/**
 * A/B Testing Panel
 *
 * Main interface for running A/B tests between Control and Adapted models.
 * Uses useAdapterTesting hook for test execution and result management.
 */

'use client';

import { useState } from 'react';
import { Send, Loader2, Sparkles, AlertCircle, Info, XCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdapterTesting, useEvaluators } from '@/hooks';
import { TestResultComparison } from './TestResultComparison';

interface ABTestingPanelProps {
  jobId: string;
  endpointsReady: boolean;
}

const DEFAULT_SYSTEM_PROMPT = `You are a helpful financial advisor.`;

const EXAMPLE_PROMPTS = [
  "I'm confused about whether I should pay off my student loans or start investing for retirement.",
  "My spouse and I can't agree on how much to spend on our wedding. We're fighting about money.",
  "I just inherited $50,000 and I'm overwhelmed. What should I do?",
];

export function ABTestingPanel({ jobId, endpointsReady }: ABTestingPanelProps) {
  const [userPrompt, setUserPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [enableEvaluation, setEnableEvaluation] = useState(false);
  const [selectedEvaluatorId, setSelectedEvaluatorId] = useState<string | undefined>(undefined);

  const {
    runTest,
    isRunning,
    runError,
    latestResult,
  } = useAdapterTesting(jobId);

  // Fetch available evaluators for the dropdown (NEW)
  const { data: evaluatorsData, isLoading: isLoadingEvaluators } = useEvaluators({
    enabled: enableEvaluation,
  });
  const evaluators = evaluatorsData?.data || [];

  const handleRunTest = async () => {
    if (!userPrompt.trim()) return;

    try {
      await runTest({
        jobId,
        userPrompt: userPrompt.trim(),
        systemPrompt: systemPrompt.trim() || undefined,
        enableEvaluation,
        evaluationPromptId: enableEvaluation ? selectedEvaluatorId : undefined,  // NEW: Pass selected evaluator
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
                <div className="ml-6 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Adds automated evaluation metrics (~$0.02 per test)
                  </p>

                  {/* Evaluator Selection Dropdown (NEW) */}
                  <div className="flex items-center gap-2">
                    <Label htmlFor="evaluator-select" className="text-sm">
                      Evaluation Method:
                    </Label>
                    <Select
                      value={selectedEvaluatorId || 'default'}
                      onValueChange={(value) => setSelectedEvaluatorId(value === 'default' ? undefined : value)}
                      disabled={isLoadingEvaluators}
                    >
                      <SelectTrigger id="evaluator-select" className="w-64">
                        <SelectValue placeholder="Select evaluator..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">
                          Use Default Evaluator
                        </SelectItem>
                        {evaluators.map((evaluator) => (
                          <SelectItem key={evaluator.id} value={evaluator.id}>
                            {evaluator.displayName}
                            {evaluator.isDefault && ' (Default)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
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
