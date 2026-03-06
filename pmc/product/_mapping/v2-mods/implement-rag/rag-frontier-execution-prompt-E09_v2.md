# RAG Frontier - Execution Prompt E09: UI Components Part 2

**Version:** 2.0
**Date:** February 11, 2026
**Section:** E09 - UI Components Part 2
**Prerequisites:** E01-E08 complete ✅
**Status:** Ready for Execution
**Changes from v1:** Updated prerequisites status (E08 complete), verified all shadcn/ui components available, corrected RAGCitation interface properties (excerpt not text, relevanceScore not relevance, no sourceType), corrected RAGImpactLevel values (no 'critical', only high/medium/low), corrected RAGQueryMode value ('rag_and_lora' not 'rag_plus_lora'), added all E08 component exports

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

### Confirmed Infrastructure ✅
- **shadcn/ui components**: All required components already installed (tooltip, toggle-group, badge, textarea, card, button)
- **Icons**: lucide-react available
- **Toast**: sonner installed and working
- **React Query**: v5 configured in layout

---

========================


# EXECUTION PROMPT E09: UI Components Part 2

## Your Mission

Create the remaining UI components for the RAG Frontier module in a Next.js 14 / TypeScript application using shadcn/ui + Tailwind CSS. These components cover expert Q&A, chat, citations, and quality visualization.

---

## Context: Current State

### E08 Completion Status ✅

**Completed in Previous Session (February 11, 2026):**

#### All 6 Component Files Created in `src/components/rag/`:

1. **`DocumentStatusBadge.tsx`**
   - ✅ Named export: `DocumentStatusBadge`
   - ✅ Props: `{ status: RAGDocumentStatus }`
   - ✅ Color-coded badges for all 6 statuses (including 'archived')

2. **`KnowledgeBaseDashboard.tsx`**
   - ✅ Named export: `KnowledgeBaseDashboard`
   - ✅ Props: `{ onSelectKnowledgeBase: (kb: RAGKnowledgeBase) => void; selectedId?: string }`
   - ✅ Integrates CreateKnowledgeBaseDialog
   - ✅ Grid layout with empty states

3. **`CreateKnowledgeBaseDialog.tsx`**
   - ✅ Named export: `CreateKnowledgeBaseDialog`
   - ✅ Props: `{ open: boolean; onOpenChange: (open: boolean) => void }`
   - ✅ Form with name and description

4. **`DocumentUploader.tsx`**
   - ✅ Named export: `DocumentUploader`
   - ✅ Props: `{ knowledgeBaseId: string }`
   - ✅ Drag-and-drop with file validation
   - ✅ Two-step upload: create record → upload file

5. **`DocumentList.tsx`**
   - ✅ Named export: `DocumentList`
   - ✅ Props: `{ knowledgeBaseId: string; onSelectDocument: (doc: RAGDocument) => void; selectedId?: string }`
   - ✅ Delete and reprocess action buttons

6. **`DocumentDetail.tsx`**
   - ✅ Named export: `DocumentDetail`
   - ✅ Props: `{ documentId: string }`
   - ✅ Shows summary, topics, sections, facts, metadata

### E07 Completion Status ✅

**Hooks available from `src/hooks/`:**

1. **`src/hooks/useExpertQA.ts`**
   - ✅ `expertQAKeys` — Query key factory exported
   - ✅ `useExpertQuestions(documentId: string, includeAnswered?: boolean)` — Returns `{ data: RAGExpertQuestion[], isLoading, error }`
   - ✅ `useSubmitAnswer(documentId: string)` — Mutation hook, accepts `{ questionId: string; answerText: string }`
   - ✅ `useSkipQuestion(documentId: string)` — Mutation hook, accepts `questionId: string`
   - ✅ `useVerifyDocument()` — Mutation hook, accepts `documentId: string`

2. **`src/hooks/useRAGChat.ts`**
   - ✅ `ragChatKeys` — Query key factory exported
   - ✅ `useRAGQuery()` — Mutation hook, accepts `{ queryText: string; documentId?: string; knowledgeBaseId?: string; mode?: RAGQueryMode }`
   - ✅ `useRAGQueryHistory(documentId?: string, knowledgeBaseId?: string)` — Returns `{ data: RAGQuery[], isLoading, error }`

3. **`src/hooks/useRAGQuality.ts`**
   - ✅ `ragQualityKeys` — Query key factory exported
   - ✅ `useRAGQualityScores(documentId?: string)` — Returns `{ data: RAGQualityScore[], isLoading, error }`
   - ✅ `useRAGQualitySummary(documentId: string)` — Returns `{ data: QualitySummary, isLoading, error }`
     - **QualitySummary interface** (defined in hook file):
       ```typescript
       interface QualitySummary {
         averageComposite: number;
         queryCount: number;
         breakdown: Record<string, number>; // keys: faithfulness, answerRelevance, contextRelevance, completeness, citationAccuracy
       }
       ```
   - ✅ `useEvaluateQuery()` — Mutation hook, accepts `queryId: string`

### E02 Completion Status ✅

**Types available from `@/types/rag`:**

- ✅ `RAGExpertQuestion` — Interface with `id`, `questionText`, `questionReason`, `impactLevel`, `answerText`, `answeredAt`, `skipped`
- ✅ `RAGQuery` — Interface with `id`, `queryText`, `responseText`, `citations`, `selfEvalScore`, `selfEvalPassed`, `responseTimeMs`, `mode`, `createdAt`
- ✅ `RAGCitation` — Interface with:
  - **CRITICAL**: `sectionId: string`, `sectionTitle: string | null`, `excerpt: string`, `relevanceScore: number`
  - **NO** `sourceType`, `text`, or `relevance` properties
- ✅ `RAGQualityScore` — Interface with `id`, `queryId`, `faithfulnessScore`, `answerRelevanceScore`, `contextRelevanceScore`, `answerCompletenessScore`, `citationAccuracyScore`, `compositeScore`, `evaluatedAt`
- ✅ `RAGImpactLevel` — Type: `'high'` | `'medium'` | `'low'` (**NO** `'critical'` value)
- ✅ `RAGQueryMode` — Type: `'rag_only'` | `'lora_only'` | `'rag_and_lora'` (**NOT** `'rag_plus_lora'`)
- ✅ `RAG_MODE_DISPLAY` — Constant: `Record<RAGQueryMode, string>`
- ✅ `RAG_IMPACT_DISPLAY` — Constant: `Record<RAGImpactLevel, string>` (called `RAG_IMPACT_DISPLAY`, not `IMPACT_LEVEL_DISPLAY`)

### Existing Component Patterns (MUST follow exactly)

From existing components in `src/components/`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
```

**Key conventions:**
- `'use client'` directive on all components
- **Named exports** (not default)
- Props interface: `interface {ComponentName}Props { ... }`
- shadcn/ui imports from `@/components/ui/`
- Icons from `lucide-react`
- Toast from `sonner`
- Loading: `<Loader2 className="h-4 w-4 animate-spin" />`
- Tailwind only (no CSS modules)

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
```

**Pattern Source**: E08 components — Interactive form pattern

**Note**: The component only renders when `documentStatus === 'awaiting_questions'`, otherwise returns `null`.

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
                  [{i + 1}] {citation.sectionTitle || 'Section'}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-sm">
                <p className="text-xs">{citation.excerpt.slice(0, 200)}{citation.excerpt.length > 200 ? '...' : ''}</p>
                <p className="text-xs text-muted-foreground mt-1">Relevance: {(citation.relevanceScore * 100).toFixed(0)}%</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>
    </div>
  );
}
```

**Pattern Source**: E08 components — Badge and tooltip usage

**CRITICAL CORRECTION from v1**:
- RAGCitation has `excerpt` (not `text`)
- RAGCitation has `relevanceScore` (not `relevance`)
- RAGCitation has NO `sourceType` property — use `sectionTitle` for label instead

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
  { value: 'rag_and_lora', label: 'RAG + LoRA', description: 'Combined approach' },
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

**Pattern Source**: E08 components — Toggle pattern

**CRITICAL CORRECTION from v1**:
- RAGQueryMode value is `'rag_and_lora'` (NOT `'rag_plus_lora'`)

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
import { Loader2, Send, MessageCircle, Bot, User, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { useRAGQuery, useRAGQueryHistory } from '@/hooks/useRAGChat';
import { useEvaluateQuery } from '@/hooks/useRAGQuality';
import { SourceCitation } from './SourceCitation';
import { ModeSelector } from './ModeSelector';
import type { RAGQuery, RAGQueryMode } from '@/types/rag';

interface RAGChatProps {
  documentId?: string;
  knowledgeBaseId?: string;
  documentName?: string;
}

export function RAGChat({ documentId, knowledgeBaseId, documentName }: RAGChatProps) {
  const [queryText, setQueryText] = useState('');
  const [mode, setMode] = useState<RAGQueryMode>('rag_only');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const ragQuery = useRAGQuery();
  const { data: history, isLoading: historyLoading } = useRAGQueryHistory(documentId, knowledgeBaseId);
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
        knowledgeBaseId,
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
          Chat with {documentName || 'Documents'}
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
            placeholder="Ask a question..."
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

**Pattern Source**: E08 components — Chat/message pattern with shadcn/ui

**Note**: Supports both `documentId` and `knowledgeBaseId` — either can be provided. Enter to send, Shift+Enter for newline.

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
                    {Math.round((score.compositeScore || 0) * 100)}%
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

**Pattern Source**: E08 components — Dashboard/metrics display pattern

**Note**: The `summary.breakdown` object has keys matching the metric names (faithfulness, answerRelevance, etc.) from the QualitySummary interface defined in useRAGQuality.ts.

---

## Verification

### Step 1: Verify All Component Files Exist

```bash
ls -la src/components/rag/
```

**Expected 11 total files** (6 from E08 + 5 from E09):
- **E08**: DocumentStatusBadge, KnowledgeBaseDashboard, CreateKnowledgeBaseDialog, DocumentUploader, DocumentList, DocumentDetail
- **E09**: ExpertQAPanel, SourceCitation, ModeSelector, RAGChat, QualityDashboard

### Step 2: Check for Linter Errors

Since components won't be visible until pages are created in E10, but should have no linter errors.

---

## Success Criteria

- [ ] All 5 component files created in `src/components/rag/`
- [ ] `ExpertQAPanel.tsx` — Shows questions, accepts answers, supports skip, verify
- [ ] `SourceCitation.tsx` — Displays citations with tooltips (using `excerpt`, `relevanceScore`, `sectionTitle`)
- [ ] `ModeSelector.tsx` — Toggle between RAG/LoRA/Both modes (using `rag_and_lora` value)
- [ ] `RAGChat.tsx` — Full chat interface with message history, citations, evaluation
- [ ] `QualityDashboard.tsx` — Composite score, per-metric breakdown, recent evaluations
- [ ] All 5 components use `'use client'`, named exports, shadcn/ui
- [ ] No TypeScript or linter errors
- [ ] All imports from hooks match E07 exports exactly

---

## What's Next

**E10** will create the pages, update navigation/sidebar, and integrate all components.

---

## If Something Goes Wrong

### Missing shadcn/ui Components
- **SHOULD NOT HAPPEN** — All required components verified as installed: `tooltip`, `toggle-group`, `badge`, `textarea`, `card`, `button`
- If errors occur, list what's in `src/components/ui/` and verify imports

### Import Errors for Hooks
- Verify hook files from E07 exist in `src/hooks/`:
  - `useExpertQA.ts`
  - `useRAGChat.ts`
  - `useRAGQuality.ts`
- Check that hook exports match what components import

### Type Errors
- All types verified in `src/types/rag.ts`:
  - `RAGExpertQuestion`, `RAGQuery`, `RAGCitation`, `RAGQualityScore`
  - `RAGImpactLevel` (high/medium/low, NO 'critical')
  - `RAGQueryMode` ('rag_and_lora', NOT 'rag_plus_lora')
  - `RAG_MODE_DISPLAY`, `RAG_IMPACT_DISPLAY`

### RAGCitation Interface Mismatch
- E09_v1 had incorrect property names
- **FIXED in v2**: Use `excerpt` (not `text`), `relevanceScore` (not `relevance`), `sectionTitle` (not `sourceType`)

### Chat Scroll Issues
- The `scrollToBottom` uses `scrollIntoView({ behavior: 'smooth' })` — ensure the container has `overflow-y-auto`

---

## Notes for Agent

1. **Create ALL 5 component files** in `src/components/rag/`.
2. **RAGChat uses Enter to send, Shift+Enter for newline** — standard chat UX.
3. **ExpertQAPanel only renders when document status is `awaiting_questions`** — it returns `null` otherwise.
4. **QualityDashboard gracefully handles zero evaluations** with an empty state.
5. **Do NOT create pages** — those are E10.
6. **RAGCitation interface correction**: The actual interface has `excerpt`, `relevanceScore`, and `sectionTitle` (not `text`, `relevance`, or `sourceType` as shown in v1).
7. **RAGImpactLevel correction**: Only has 3 values (`'high'`, `'medium'`, `'low'`) — NO `'critical'` value as shown in v1.
8. **RAGQueryMode correction**: The third mode is `'rag_and_lora'` (NOT `'rag_plus_lora'` as shown in v1).
9. **QualitySummary interface** is defined in the hook file (`useRAGQuality.ts`), not in the types file.
10. **SourceCitation component** can use `sectionTitle` for the badge label instead of `sourceType` (which doesn't exist).
11. **All shadcn/ui components required for E09** are already installed: `tooltip`, `toggle-group`, `badge`, `textarea`, `card`, `button`.

---

**End of E09 Prompt v2**

+++++++++++++++++
