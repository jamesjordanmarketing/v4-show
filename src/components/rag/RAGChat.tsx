'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, MessageCircle, Bot, User, BarChart3, Cpu, ThumbsUp, ThumbsDown, Database, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useRAGQuery, useRAGQueryHistory, useDeployedModels } from '@/hooks/useRAGChat';
import { useEvaluateQuery } from '@/hooks/useRAGQuality';
import { SourceCitation } from './SourceCitation';
import { ModeSelector } from './ModeSelector';
import type { RAGQuery, RAGQueryMode } from '@/types/rag';

interface RAGChatProps {
  documentId?: string;
  workbaseId?: string;
  documentName?: string;
}

export function RAGChat({ documentId, workbaseId, documentName }: RAGChatProps) {
  const [queryText, setQueryText] = useState('');
  const [mode, setMode] = useState<RAGQueryMode>('rag_only');
  const [selectedModelJobId, setSelectedModelJobId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const ragQuery = useRAGQuery();
  const { data: history, isLoading: historyLoading } = useRAGQueryHistory(documentId, workbaseId);
  const evaluateQuery = useEvaluateQuery();
  const { data: deployedModels, isLoading: modelsLoading } = useDeployedModels();

  // Check if current mode requires a model selection
  const needsModel = mode === 'lora_only' || mode === 'rag_and_lora';
  const canSubmit = queryText.trim() && !ragQuery.isPending && (!needsModel || selectedModelJobId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    if (needsModel && !selectedModelJobId) {
      toast.error('Please select a LoRA model before querying.');
      return;
    }

    try {
      await ragQuery.mutateAsync({
        queryText: queryText.trim(),
        documentId,
        workbaseId,
        mode,
        modelJobId: needsModel ? (selectedModelJobId ?? undefined) : undefined,
      });
      setQueryText('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Query failed');
    }
  };

  const handleEvaluate = async (queryId: string) => {
    try {
      await evaluateQuery.mutateAsync(queryId);
      toast.success('Quality evaluation complete');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Evaluation failed');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  function getConfidenceDisplay(score: number | null): {
    label: string;
    color: 'green' | 'amber' | 'red' | '';
    showBadge: boolean;
  } {
    if (score === null) return { label: '', color: '', showBadge: false };
    if (score > 0.8) return { label: '', color: 'green', showBadge: false };
    if (score >= 0.5) return {
      label: 'Based on available information...',
      color: 'amber',
      showBadge: true,
    };
    return {
      label: "I couldn't find a confident answer. Here's what I found...",
      color: 'red',
      showBadge: true,
    };
  }

  async function submitFeedback(queryId: string, feedback: 'positive' | 'negative') {
    try {
      const res = await fetch('/api/rag/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryId, feedback }),
      });
      if (res.ok) {
        toast.success(feedback === 'positive' ? 'Thanks for the feedback!' : 'Thanks — we\'ll work on improving.');
      }
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    }
  }

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Chat with {documentName || 'Documents'}
        </CardTitle>
        {!documentId && workbaseId && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Database className="h-3 w-3" />
            Searching across all documents in knowledge base
          </p>
        )}
        {documentId && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <FileText className="h-3 w-3" />
            Searching: {documentName || 'Selected document'}
          </p>
        )}
        <ModeSelector value={mode} onChange={(m) => { setMode(m); if (m === 'rag_only') setSelectedModelJobId(null); }} />

        {/* Model Selector — only visible for LoRA modes */}
        {needsModel && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Cpu className="h-3 w-3" />
              LoRA Model
            </p>
            {modelsLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading models...
              </div>
            ) : !deployedModels || deployedModels.length === 0 ? (
              <p className="text-xs text-orange-600 py-1">
                No deployed models found. Train and deploy a LoRA adapter first.
              </p>
            ) : (
              <select
                value={selectedModelJobId || ''}
                onChange={(e) => setSelectedModelJobId(e.target.value || null)}
                className="w-full text-xs border rounded px-2 py-1.5 bg-background"
              >
                <option value="">Select a model...</option>
                {deployedModels.map((model) => (
                  <option key={model.jobId} value={model.jobId}>
                    {model.jobName || model.jobId.slice(0, 8)} — {model.baseModel.split('/').pop()} {model.datasetName ? `(${model.datasetName})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-y-auto space-y-4 pb-0">
        {historyLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (!history || history.length === 0) ? (
          <div className="text-center py-12 text-muted-foreground">
            <Bot className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Ask a question about {documentName ? 'this document' : 'your documents'}.</p>
            <p className="text-xs mt-1">The RAG system will search and generate a cited answer.</p>
          </div>
        ) : (
          [...history].reverse().map((query) => (
            <div key={query.id} className="space-y-2">
              {/* User message */}
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2 max-w-[85%]">
                  <p className="text-sm">{query.queryText}</p>
                </div>
              </div>

              {/* Bot response */}
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-full bg-green-600/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-green-600" />
                </div>
                <div className="bg-card border rounded-lg px-3 py-2 max-w-[85%]">
                  {/* Confidence qualifier — DISABLED (Spec 33: comment badges turned off; generation logic preserved) */}
                  {/* {(() => {
                    const confidence = getConfidenceDisplay(query.selfEvalScore);
                    if (!confidence.showBadge) return null;
                    return (
                      <div className={cn(
                        'mb-2 px-3 py-1.5 rounded-md text-sm font-medium',
                        confidence.color === 'amber' && 'bg-amber-50 text-amber-700 border border-amber-200',
                        confidence.color === 'red' && 'bg-red-50 text-red-700 border border-red-200',
                      )}>
                        {confidence.label}
                      </div>
                    );
                  })()} */}
                  <p className="text-sm whitespace-pre-wrap">{query.responseText}</p>
                  <SourceCitation citations={query.citations || []} />
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                    {query.selfEvalScore !== null && (
                      <span className="text-xs text-muted-foreground">
                        Self-eval: {(query.selfEvalScore * 100).toFixed(0)}%
                        {query.selfEvalPassed ? ' ✓' : ' ✗'}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => handleEvaluate(query.id)}
                      disabled={evaluateQuery.isPending}
                      title="Run quality evaluation"
                    >
                      <BarChart3 className="h-3 w-3 mr-1" />
                      Evaluate
                    </Button>
                    {/* Feedback buttons */}
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => submitFeedback(query.id, 'positive')}
                        className={cn(
                          'p-1 rounded-md hover:bg-green-50 transition-colors',
                          query.userFeedback === 'positive' && 'bg-green-100 text-green-700',
                        )}
                        title="Helpful"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => submitFeedback(query.id, 'negative')}
                        className={cn(
                          'p-1 rounded-md hover:bg-red-50 transition-colors',
                          query.userFeedback === 'negative' && 'bg-red-100 text-red-700',
                        )}
                        title="Not helpful"
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {query.responseTimeMs && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        {(query.responseTimeMs / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      {/* Input */}
      <div className="p-4 border-t shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            placeholder="Ask a question..."
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            className="min-h-[40px] max-h-[120px] resize-none"
          />
          <Button type="submit" size="icon" disabled={!canSubmit}>
            {ragQuery.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
}
