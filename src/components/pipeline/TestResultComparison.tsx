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
            <div className="min-h-[200px] max-h-[600px] overflow-y-scroll border rounded-md p-4 bg-muted/30">
              <div className="whitespace-pre-wrap text-sm leading-relaxed break-words">
                {result.controlResponse || 'No response generated'}
              </div>
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
            <div className="min-h-[200px] max-h-[600px] overflow-y-scroll border rounded-md p-4 bg-muted/30">
              <div className="whitespace-pre-wrap text-sm leading-relaxed break-words">
                {result.adaptedResponse || 'No response generated'}
              </div>
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
                  &ldquo;{result.userNotes}&rdquo;
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
