'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Clock, AlertTriangle, Zap } from 'lucide-react';

interface DiagnosticResult {
  step: string;
  success: boolean;
  responseText?: string;
  elapsedMs?: number;
  error?: string;
}

interface DiagnosticResponse {
  success: boolean;
  message?: string;
  results: DiagnosticResult[];
  totalElapsedMs: number;
  recommendation?: string;
}

export function DiagnosticTestPanel({ documentId }: { documentId: string }) {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults(null);
    setError(null);

    try {
      const response = await fetch(`/api/rag/documents/${documentId}/diagnostic-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      setResults(data);
      
      if (!data.success) {
        setError(data.message || 'Diagnostic tests failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run diagnostic tests');
    } finally {
      setIsRunning(false);
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    const mins = Math.floor(ms / 60000);
    const secs = ((ms % 60000) / 1000).toFixed(0);
    return `${mins}m ${secs}s`;
  };

  const getStepIcon = (result: DiagnosticResult) => {
    if (result.success) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    return <XCircle className="h-5 w-5 text-destructive" />;
  };

  const getStepTitle = (step: string) => {
    const titles: Record<string, string> = {
      connectivity_test: '1. Connectivity Test',
      estimation_test: '2. Document Analysis Estimation',
      model_verification: '3. Model Configuration Verification',
    };
    return titles[step] || step;
  };

  const getStepDescription = (step: string) => {
    const descriptions: Record<string, string> = {
      connectivity_test: 'Simple "are you awake" test to verify Claude API responds',
      estimation_test: 'Ask Claude to estimate how long full document analysis will take',
      model_verification: 'Verify model name and API key configuration',
    };
    return descriptions[step] || '';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Claude API Diagnostic Tests
          </CardTitle>
          <CardDescription>
            Run incremental tests to diagnose Claude API connectivity and performance issues.
            This will help identify if the API is working, slow, or misconfigured.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-semibold">Test Sequence:</h4>
            <ol className="text-sm space-y-1 list-decimal list-inside">
              <li><strong>Connectivity Test</strong> (2min timeout): Simple "are you awake?" message</li>
              <li><strong>Estimation Test</strong> (5min timeout): Ask Claude to estimate document analysis time</li>
              <li><strong>Model Verification</strong>: Check configuration</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-3">
              If tests pass, you can proceed with full document processing knowing the API is working.
            </p>
          </div>

          <Button 
            onClick={runDiagnostics} 
            disabled={isRunning}
            className="w-full"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running Diagnostics...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Run Diagnostic Tests
              </>
            )}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Diagnostic Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {results && (
            <div className="space-y-4 mt-6">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Total Time:</span>
                </div>
                <span className="text-sm font-mono font-bold">
                  {formatDuration(results.totalElapsedMs)}
                </span>
              </div>

              {results.success ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>All Tests Passed!</AlertTitle>
                  <AlertDescription>{results.message}</AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Tests Failed</AlertTitle>
                  <AlertDescription>{results.message}</AlertDescription>
                </Alert>
              )}

              {/* Individual Test Results */}
              <div className="space-y-3">
                {results.results.map((result, idx) => (
                  <Card key={idx} className={result.success ? 'border-green-200' : 'border-destructive'}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStepIcon(result)}
                          <CardTitle className="text-base">
                            {getStepTitle(result.step)}
                          </CardTitle>
                        </div>
                        {result.elapsedMs !== undefined && (
                          <span className="text-xs font-mono text-muted-foreground">
                            {formatDuration(result.elapsedMs)}
                          </span>
                        )}
                      </div>
                      <CardDescription className="text-xs">
                        {getStepDescription(result.step)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {result.success && result.responseText && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground">Response:</p>
                          <pre className="text-sm p-3 bg-muted rounded whitespace-pre-wrap font-mono">
                            {result.responseText}
                          </pre>
                        </div>
                      )}
                      {!result.success && result.error && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertDescription className="text-sm">
                            {result.error}
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {results.recommendation && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Recommendation</AlertTitle>
                  <AlertDescription className="text-sm">
                    {results.recommendation}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">What These Tests Tell Us</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-semibold mb-1">🟢 If Connectivity Test Passes:</p>
            <p className="text-muted-foreground">
              Claude API is working and responding. The model name is correct and API key is valid.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-1">🟢 If Estimation Test Passes:</p>
            <p className="text-muted-foreground">
              Claude can read your document and provide responses. Slow responses indicate the document 
              is large or Claude API is experiencing slowness.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-1">🔴 If Tests Fail:</p>
            <p className="text-muted-foreground">
              Indicates API connectivity issues, wrong model name, invalid API key, or Anthropic service problems.
            </p>
          </div>
          <div className="pt-2 border-t">
            <p className="font-semibold mb-1">Next Steps:</p>
            <ul className="text-muted-foreground list-disc list-inside space-y-1">
              <li>If tests pass: Document processing should work (may just be slow)</li>
              <li>If Test 1 fails: Check API key and model name</li>
              <li>If Test 2 times out: Document is too large, needs chunking strategy</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
