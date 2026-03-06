# RAG Frontier - Execution Prompt E09: UI Components Part 2

**Version:** 1.0
**Date:** February 10, 2026
**Section:** E09 - UI Components Part 2
**Prerequisites:** E01-E08 complete
**Status:** Ready for Execution

---

## Overview

This prompt creates the remaining UI components: Expert Q&A panel, RAG chat interface, source citations, and quality dashboard.

**What This Section Creates:**
1. `src/components/rag/ExpertQAPanel.tsx` — Question list, answer form, skip, verify document
2. `src/components/rag/SourceCitation.tsx` — Inline citation display with source references
3. `src/components/rag/RAGChat.tsx` — Chat interface for querying documents
4. `src/components/rag/ModeSelector.tsx` — RAG/LoRA/Both mode toggle
5. `src/components/rag/QualityDashboard.tsx` — Quality scores with per-metric breakdown

**What This Section Does NOT Change:**
- No database, types, services, API routes, or hooks
- No E08 components
- No pages or navigation (E10)

---

## Critical Instructions

### Environment
**Codebase:** `C:\Users\james\Master\BrightHub\brun\v4-show\src`

---

========================


# EXECUTION PROMPT E09: UI Components Part 2

## Your Mission

Create the remaining UI components for the RAG Frontier module in a Next.js 14 / TypeScript application using shadcn/ui + Tailwind CSS. These components cover expert Q&A, chat, citations, and quality visualization.

---

## Context: Current State

### What Exists (from E01-E08)
- **Types**: `src/types/rag.ts` — `RAGExpertQuestion`, `RAGQuery`, `RAGQualityScore`, `RAGCitation`, `RAGQueryMode`, `RAG_MODE_DISPLAY`, `IMPACT_LEVEL_DISPLAY`
- **Hooks**:
  - `src/hooks/useExpertQA.ts` — `useExpertQuestions(docId)`, `useSubmitAnswer(docId)`, `useSkipQuestion(docId)`, `useVerifyDocument()`
  - `src/hooks/useRAGChat.ts` — `useRAGQuery()`, `useRAGQueryHistory(docId)`
  - `src/hooks/useRAGQuality.ts` — `useRAGQualityScores(docId)`, `useRAGQualitySummary(docId)`, `useEvaluateQuery()`
- **Components (E08)**: `src/components/rag/` — KnowledgeBaseDashboard, CreateKnowledgeBaseDialog, DocumentUploader, DocumentList, DocumentStatusBadge, DocumentDetail

### Component Patterns (same as E08)
- `'use client'` directive, named exports
- shadcn/ui from `@/components/ui/`, icons from `lucide-react`, toast from `sonner`
- Props interface: `{ComponentName}Props`
- Loading/error/empty states in every data-fetching component

---

## Phase 1: Expert Q&A Panel

### Task 1: Create Expert Q&A Panel

**File:** `src/components/rag/ExpertQAPanel.tsx`

```typescript
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
  critical: 'bg-red-600 text-white',
  high: 'bg-orange-600 text-white',
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
```

**Pattern Source**: `src/components/pipeline/` — Interactive form pattern

---

## Phase 2: Citation & Mode Components

### Task 2: Create Source Citation Component

**File:** `src/components/rag/SourceCitation.tsx`

```typescript
'use client';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BookOpen } from 'lucide-react';
import type { RAGCitation } from '@/types/rag';

interface SourceCitationProps {
  citations: RAGCitation[];
}

export function SourceCitation({ citations }: SourceCitationProps) {
  if (!citations || citations.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t">
      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
        <BookOpen className="h-3 w-3" />
        Sources ({citations.length})
      </p>
      <div className="flex flex-wrap gap-1">
        <TooltipProvider>
          {citations.map((citation, i) => (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="text-xs cursor-help hover:bg-muted"
                >
                  [{i + 1}] {citation.sourceType === 'section' ? 'Section' : 'Fact'}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-sm">
                <p className="text-xs">{citation.text.slice(0, 200)}{citation.text.length > 200 ? '...' : ''}</p>
                <p className="text-xs text-muted-foreground mt-1">Relevance: {(citation.relevance * 100).toFixed(0)}%</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>
    </div>
  );
}
```

**Pattern Source**: `src/components/` — Tooltip usage pattern

---

### Task 3: Create Mode Selector

**File:** `src/components/rag/ModeSelector.tsx`

```typescript
'use client';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { RAGQueryMode } from '@/types/rag';

interface ModeSelectorProps {
  value: RAGQueryMode;
  onChange: (mode: RAGQueryMode) => void;
}

const modeOptions: Array<{ value: RAGQueryMode; label: string; description: string }> = [
  { value: 'rag_only', label: 'RAG', description: 'Document knowledge only' },
  { value: 'lora_only', label: 'LoRA', description: 'Fine-tuned model only' },
  { value: 'rag_plus_lora', label: 'RAG + LoRA', description: 'Combined approach' },
];

export function ModeSelector({ value, onChange }: ModeSelectorProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">Query Mode</p>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => { if (v) onChange(v as RAGQueryMode); }}
        className="justify-start"
      >
        {modeOptions.map((opt) => (
          <ToggleGroupItem
            key={opt.value}
            value={opt.value}
            className="text-xs px-3"
            title={opt.description}
          >
            {opt.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
```

**Pattern Source**: `src/components/` — ToggleGroup pattern

---

## Phase 3: RAG Chat

### Task 4: Create RAG Chat Interface

**File:** `src/components/rag/RAGChat.tsx`

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, MessageCircle, Bot, User, ThumbsUp, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { useRAGQuery, useRAGQueryHistory } from '@/hooks/useRAGChat';
import { useEvaluateQuery } from '@/hooks/useRAGQuality';
import { SourceCitation } from './SourceCitation';
import { ModeSelector } from './ModeSelector';
import type { RAGQuery, RAGQueryMode } from '@/types/rag';

interface RAGChatProps {
  documentId: string;
  documentName?: string;
}

export function RAGChat({ documentId, documentName }: RAGChatProps) {
  const [queryText, setQueryText] = useState('');
  const [mode, setMode] = useState<RAGQueryMode>('rag_only');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const ragQuery = useRAGQuery();
  const { data: history, isLoading: historyLoading } = useRAGQueryHistory(documentId);
  const evaluateQuery = useEvaluateQuery();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryText.trim() || ragQuery.isPending) return;

    try {
      await ragQuery.mutateAsync({
        queryText: queryText.trim(),
        documentId,
        mode,
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

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Chat with {documentName || 'Document'}
        </CardTitle>
        <ModeSelector value={mode} onChange={setMode} />
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
            <p>Ask a question about this document.</p>
            <p className="text-xs mt-1">The RAG system will search the document and generate a cited answer.</p>
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
            placeholder="Ask a question about this document..."
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            className="min-h-[40px] max-h-[120px] resize-none"
          />
          <Button type="submit" size="icon" disabled={ragQuery.isPending || !queryText.trim()}>
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
```

**Pattern Source**: `src/components/` — Chat/message pattern with shadcn/ui

---

## Phase 4: Quality Dashboard

### Task 5: Create Quality Dashboard

**File:** `src/components/rag/QualityDashboard.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BarChart3, TrendingUp } from 'lucide-react';
import { useRAGQualitySummary, useRAGQualityScores } from '@/hooks/useRAGQuality';

interface QualityDashboardProps {
  documentId: string;
}

const metricLabels: Record<string, string> = {
  faithfulness: 'Faithfulness',
  answerRelevance: 'Answer Relevance',
  contextRelevance: 'Context Relevance',
  completeness: 'Completeness',
  citationAccuracy: 'Citation Accuracy',
};

const metricWeights: Record<string, number> = {
  faithfulness: 0.30,
  answerRelevance: 0.25,
  contextRelevance: 0.20,
  completeness: 0.15,
  citationAccuracy: 0.10,
};

function ScoreBar({ label, score, weight }: { label: string; score: number; weight: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? 'bg-green-600' : pct >= 60 ? 'bg-yellow-600' : 'bg-red-600';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>{label} <span className="text-xs text-muted-foreground">({(weight * 100).toFixed(0)}%)</span></span>
        <span className="font-mono font-medium">{pct}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function QualityDashboard({ documentId }: QualityDashboardProps) {
  const { data: summary, isLoading: summaryLoading } = useRAGQualitySummary(documentId);
  const { data: scores, isLoading: scoresLoading } = useRAGQualityScores(documentId);

  const isLoading = summaryLoading || scoresLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading quality data...</span>
      </div>
    );
  }

  if (!summary || summary.queryCount === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No quality evaluations yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Chat with the document and evaluate responses to see quality metrics.</p>
        </CardContent>
      </Card>
    );
  }

  const compositePct = Math.round(summary.averageComposite * 100);
  const compositeColor = compositePct >= 80 ? 'text-green-600' : compositePct >= 60 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="space-y-4">
      {/* Composite Score */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            RAG Quality Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className={`text-4xl font-bold font-mono ${compositeColor}`}>
              {compositePct}%
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Composite score across {summary.queryCount} evaluated queries</p>
              <p className="text-xs mt-1">
                Weighted: 30% Faithfulness · 25% Answer Relevance · 20% Context Relevance · 15% Completeness · 10% Citation Accuracy
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-Metric Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Metric Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(summary.breakdown).map(([key, score]) => (
            <ScoreBar
              key={key}
              label={metricLabels[key] || key}
              score={score}
              weight={metricWeights[key] || 0}
            />
          ))}
        </CardContent>
      </Card>

      {/* Recent Evaluations */}
      {scores && scores.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recent Evaluations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {scores.slice(0, 10).map((score) => (
                <div key={score.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                  <span className="text-muted-foreground">
                    {new Date(score.evaluatedAt).toLocaleDateString()}
                  </span>
                  <span className="font-mono font-medium">
                    {Math.round(score.compositeScore * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

**Pattern Source**: `src/components/pipeline/` — Dashboard/metrics display pattern

---

## Verification

### Step 1: TypeScript Build

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show" && npx tsc --noEmit
```

**Expected:** Exit code 0, no TypeScript errors.

### Step 2: Verify All Component Files Exist

```bash
ls -la src/components/rag/
```

Confirm 11 total files (6 from E08 + 5 from E09):
- E08: KnowledgeBaseDashboard, CreateKnowledgeBaseDialog, DocumentUploader, DocumentList, DocumentStatusBadge, DocumentDetail
- E09: ExpertQAPanel, SourceCitation, ModeSelector, RAGChat, QualityDashboard

---

## Success Criteria

- [ ] `ExpertQAPanel.tsx` — Shows questions, accepts answers, supports skip, verify
- [ ] `SourceCitation.tsx` — Displays citations with tooltips
- [ ] `ModeSelector.tsx` — Toggle between RAG/LoRA/Both modes
- [ ] `RAGChat.tsx` — Full chat interface with message history, citations, evaluation
- [ ] `QualityDashboard.tsx` — Composite score, per-metric breakdown, recent evaluations
- [ ] All 5 components use `'use client'`, named exports, shadcn/ui
- [ ] TypeScript build succeeds with zero errors

---

## What's Next

**E10** will create the pages, update navigation/sidebar, and remove chunks module references.

---

## If Something Goes Wrong

### Missing shadcn/ui Components
- ToggleGroup: `npx shadcn-ui@latest add toggle-group`
- Tooltip: `npx shadcn-ui@latest add tooltip`

### Chat Scroll Issues
- The `scrollToBottom` uses `scrollIntoView({ behavior: 'smooth' })` — ensure the container has `overflow-y-auto`

---

## Notes for Agent

1. **Create ALL 5 component files** in `src/components/rag/`.
2. **RAGChat uses Enter to send, Shift+Enter for newline** — standard chat UX.
3. **ExpertQAPanel only renders when document status is `awaiting_questions`** — it returns `null` otherwise.
4. **QualityDashboard gracefully handles zero evaluations** with an empty state.
5. **Do NOT create pages** — those are E10.

---

**End of E09 Prompt**


+++++++++++++++++
