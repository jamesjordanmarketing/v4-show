'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageSquare, SkipForward, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useExpertQuestions, useSubmitAnswer, useSkipQuestion, useVerifyDocument } from '@/hooks/useExpertQA';
import type { RAGExpertQuestion, RAGImpactLevel } from '@/types/rag';

interface ExpertQAPanelProps {
  documentId: string;
  documentStatus: string;
}

const impactColors: Record<RAGImpactLevel, string> = {
  high: 'bg-red-600 text-white',
  medium: 'bg-yellow-600 text-white',
  low: 'bg-gray-500 text-white',
};

export function ExpertQAPanel({ documentId, documentStatus }: ExpertQAPanelProps) {
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');

  const { data: questions, isLoading, error } = useExpertQuestions(documentId);
  const submitAnswer = useSubmitAnswer(documentId);
  const skipQuestion = useSkipQuestion(documentId);
  const verifyDoc = useVerifyDocument();

  const handleSubmit = async (questionId: string) => {
    if (!answerText.trim()) {
      toast.error('Please enter an answer');
      return;
    }
    try {
      await submitAnswer.mutateAsync({ questionId, answerText: answerText.trim() });
      toast.success('Answer submitted');
      setAnswerText('');
      setActiveQuestionId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit');
    }
  };

  const handleSkip = async (questionId: string) => {
    try {
      await skipQuestion.mutateAsync(questionId);
      toast.info('Question skipped');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to skip');
    }
  };

  const handleVerify = async () => {
    try {
      await verifyDoc.mutateAsync(documentId);
      toast.success('Document verified! Knowledge base updated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to verify');
    }
  };

  if (documentStatus !== 'awaiting_questions') {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading questions...</span>
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive py-4">Failed to load questions: {error.message}</p>;
  }

  const unanswered = questions || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Expert Q&A ({unanswered.length} question{unanswered.length !== 1 ? 's' : ''} remaining)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {unanswered.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto mb-3" />
            <p className="font-medium">All questions answered!</p>
            <p className="text-sm text-muted-foreground mt-1">Verify the document to finalize knowledge refinement.</p>
            <Button onClick={handleVerify} className="mt-4" disabled={verifyDoc.isPending}>
              {verifyDoc.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Verify & Finalize
            </Button>
          </div>
        ) : (
          <>
            {unanswered.map((q) => (
              <div key={q.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium">{q.questionText}</p>
                    {q.questionReason && (
                      <p className="text-sm text-muted-foreground flex items-start gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        {q.questionReason}
                      </p>
                    )}
                  </div>
                  <Badge className={impactColors[q.impactLevel]}>{q.impactLevel}</Badge>
                </div>

                {activeQuestionId === q.id ? (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Type your expert answer..."
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSubmit(q.id)}
                        disabled={submitAnswer.isPending || !answerText.trim()}
                      >
                        {submitAnswer.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                        Submit Answer
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setActiveQuestionId(null); setAnswerText(''); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setActiveQuestionId(q.id)}>
                      Answer
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSkip(q.id)}
                      disabled={skipQuestion.isPending}
                    >
                      <SkipForward className="h-3 w-3 mr-1" />
                      Skip
                    </Button>
                  </div>
                )}
              </div>
            ))}

            <div className="pt-2 border-t">
              <Button onClick={handleVerify} variant="outline" className="w-full" disabled={verifyDoc.isPending}>
                {verifyDoc.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Skip Remaining & Verify
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
