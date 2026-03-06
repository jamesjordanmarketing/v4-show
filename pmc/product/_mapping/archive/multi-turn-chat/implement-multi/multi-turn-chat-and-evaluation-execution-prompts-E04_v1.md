# Multi-Turn Chat Implementation - Section E04: React Hooks & UI Components

**Version:** 1.0  
**Date:** January 29, 2026  
**Section:** E04 - React Hooks & UI Components  
**Prerequisites:** E01-E03 (Database, Types, Service, API) must be complete  
**Builds Upon:** API routes from E03  

---

## Overview

This prompt implements the React hooks and UI components for the multi-turn chat module.

**What This Section Creates:**
1. React Hook: `src/hooks/useDualChat.ts` (~300 lines)
2. Hook Export: Update `src/hooks/index.ts`
3. Install Chatscope UI kit
4. UI Components (11 files in `src/components/pipeline/chat/`)

**What This Section Does NOT Create:**
- Page route (E05)
- Navigation integration (E05)

---

## Prerequisites from E03

Before starting, verify E03 is complete:

```bash
cd C:\Users\james\Master\BrightHub\BRun\v4-show && npm run build
```

Verify API routes exist:
- `src/app/api/pipeline/conversations/route.ts`
- `src/app/api/pipeline/conversations/[id]/route.ts`
- `src/app/api/pipeline/conversations/[id]/turn/route.ts`
- `src/app/api/pipeline/conversations/[id]/complete/route.ts`

---

## Critical Instructions

### Dependencies to Install

```bash
npm install @chatscope/chat-ui-kit-react @chatscope/chat-ui-kit-styles
```

### Chatscope Styles

Add to `src/app/globals.css`:

```css
@import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
```

### Component Structure

```
src/components/pipeline/chat/
├── MultiTurnChat.tsx           # Main container
├── ChatSidebar.tsx             # Conversation list
├── ChatMain.tsx                # Main chat area
├── ChatHeader.tsx              # Header with controls
├── ChatMessageList.tsx         # Scrollable messages
├── ChatTurn.tsx                # Single turn display
├── ChatInput.tsx               # Input with evaluator dropdown
├── DualResponsePanel.tsx       # Side-by-side responses
├── TokenUsageBar.tsx           # Token usage indicator
├── ArcProgressionBar.tsx       # Arc progression display
└── index.ts                    # Barrel export
```

### Existing Patterns

Follow patterns from:
- `src/hooks/useAdapterTesting.ts` — React Query patterns
- `src/components/pipeline/ABTestingPanel.tsx` — A/B display patterns

---

## Reference Documents

- Full Spec: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi\workfiles\multi-turn-chat-and-evaluation_v1.md` (Sections 8-9)
- Existing Hooks: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\hooks\`
- Existing Components: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\pipeline\`

---

========================


## EXECUTION PROMPT E04

You are implementing React hooks and UI components for a multi-turn A/B testing chat module.

### Context

This module provides:
- Sidebar with conversation list
- Main chat area with dual responses (control vs adapted)
- Optional per-turn evaluation with arc progression display
- Multi-turn evaluator dropdown selection

### Prerequisites

E01-E03 must be complete. All API routes must exist.

### Task 1: Install Dependencies

```bash
cd C:\Users\james\Master\BrightHub\BRun\v4-show
npm install @chatscope/chat-ui-kit-react @chatscope/chat-ui-kit-styles
```

### Task 2: Add Chatscope Styles

Add to `src/app/globals.css`:

```css
@import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
```

### Task 3: Create useDualChat Hook

Create file: `src/hooks/useDualChat.ts`

```typescript
/**
 * useDualChat Hook
 * 
 * Manages state for multi-turn A/B testing chat interface with arc evaluation
 */

'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Conversation,
  ConversationTurn,
  ConversationWithTurns,
  CreateConversationRequest,
  AddTurnRequest,
  TokenUsage,
  CONVERSATION_CONSTANTS,
} from '@/types/conversation';

// Query keys
const conversationKeys = {
  all: ['conversations'] as const,
  list: (jobId: string) => [...conversationKeys.all, 'list', jobId] as const,
  detail: (id: string) => [...conversationKeys.all, 'detail', id] as const,
};

// API functions
async function fetchConversations(jobId: string): Promise<Conversation[]> {
  const res = await fetch(`/api/pipeline/conversations?jobId=${jobId}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

async function fetchConversation(id: string): Promise<ConversationWithTurns> {
  const res = await fetch(`/api/pipeline/conversations/${id}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

async function createConversationApi(request: CreateConversationRequest): Promise<Conversation> {
  const res = await fetch('/api/pipeline/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

async function addTurnApi(conversationId: string, request: AddTurnRequest): Promise<ConversationTurn> {
  const res = await fetch(`/api/pipeline/conversations/${conversationId}/turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

async function completeConversationApi(id: string): Promise<Conversation> {
  const res = await fetch(`/api/pipeline/conversations/${id}/complete`, {
    method: 'POST',
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

async function deleteConversationApi(id: string): Promise<void> {
  const res = await fetch(`/api/pipeline/conversations/${id}`, {
    method: 'DELETE',
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
}

// Hook return type
export interface UseDualChatReturn {
  // Conversation list
  conversations: Conversation[];
  isLoadingConversations: boolean;
  
  // Current conversation
  conversation: ConversationWithTurns | null;
  isLoadingConversation: boolean;
  
  // Turns
  turns: ConversationTurn[];
  
  // Input state
  input: string;
  setInput: (value: string) => void;
  
  // Evaluation settings
  enableEvaluation: boolean;
  setEnableEvaluation: (value: boolean) => void;
  selectedEvaluatorId: string | undefined;
  setSelectedEvaluatorId: (id: string | undefined) => void;
  
  // Loading states
  isSending: boolean;
  isCreating: boolean;
  
  // Error state
  error: Error | null;
  
  // Token tracking
  tokenUsage: TokenUsage;
  
  // Actions
  sendMessage: (message?: string) => Promise<void>;
  startNewConversation: (name?: string, systemPrompt?: string) => Promise<void>;
  selectConversation: (conversationId: string) => void;
  endConversation: () => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  
  // Status
  canSendMessage: boolean;
  isAtMaxTurns: boolean;
}

export function useDualChat(jobId: string, initialConversationId?: string): UseDualChatReturn {
  const [selectedId, setSelectedId] = useState<string | null>(initialConversationId || null);
  const [input, setInput] = useState('');
  const [enableEvaluation, setEnableEvaluation] = useState(false);
  const [selectedEvaluatorId, setSelectedEvaluatorId] = useState<string | undefined>();
  const queryClient = useQueryClient();
  
  // Fetch conversations list
  const {
    data: conversations = [],
    isLoading: isLoadingConversations,
  } = useQuery({
    queryKey: conversationKeys.list(jobId),
    queryFn: () => fetchConversations(jobId),
    enabled: !!jobId,
  });
  
  // Fetch selected conversation with turns
  const {
    data: conversation,
    isLoading: isLoadingConversation,
    error,
  } = useQuery({
    queryKey: conversationKeys.detail(selectedId || ''),
    queryFn: () => fetchConversation(selectedId!),
    enabled: !!selectedId,
  });
  
  // Create conversation mutation
  const createMutation = useMutation({
    mutationFn: createConversationApi,
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.list(jobId) });
      setSelectedId(newConversation.id);
    },
  });
  
  // Add turn mutation
  const addTurnMutation = useMutation({
    mutationFn: ({ conversationId, request }: { conversationId: string; request: AddTurnRequest }) =>
      addTurnApi(conversationId, request),
    onSuccess: () => {
      if (selectedId) {
        queryClient.invalidateQueries({ queryKey: conversationKeys.detail(selectedId) });
      }
      setInput('');
    },
  });
  
  // Complete conversation mutation
  const completeMutation = useMutation({
    mutationFn: completeConversationApi,
    onSuccess: () => {
      if (selectedId) {
        queryClient.invalidateQueries({ queryKey: conversationKeys.detail(selectedId) });
        queryClient.invalidateQueries({ queryKey: conversationKeys.list(jobId) });
      }
    },
  });
  
  // Delete conversation mutation
  const deleteMutation = useMutation({
    mutationFn: deleteConversationApi,
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.list(jobId) });
      if (selectedId === deletedId) {
        setSelectedId(null);
      }
    },
  });
  
  // Computed values
  const turns = conversation?.turns || [];
  
  const tokenUsage: TokenUsage = {
    controlTokens: conversation?.controlTotalTokens || 0,
    adaptedTokens: conversation?.adaptedTotalTokens || 0,
    totalTokens: (conversation?.controlTotalTokens || 0) + (conversation?.adaptedTotalTokens || 0),
    percentageUsed: 0,
    isNearLimit: false,
  };
  
  const isAtMaxTurns = (conversation?.turnCount || 0) >= CONVERSATION_CONSTANTS.MAX_TURNS;
  
  const canSendMessage = 
    !!selectedId && 
    conversation?.status === 'active' && 
    !isAtMaxTurns &&
    !addTurnMutation.isPending &&
    input.trim().length > 0;
  
  // Actions
  const sendMessage = useCallback(async (message?: string) => {
    if (!selectedId) return;
    
    const messageToSend = message || input;
    if (!messageToSend.trim()) return;
    
    await addTurnMutation.mutateAsync({
      conversationId: selectedId,
      request: {
        userMessage: messageToSend.trim(),
        enableEvaluation,
        evaluationPromptId: enableEvaluation ? selectedEvaluatorId : undefined,
      },
    });
  }, [selectedId, input, enableEvaluation, selectedEvaluatorId, addTurnMutation]);
  
  const startNewConversation = useCallback(async (name?: string, systemPrompt?: string) => {
    await createMutation.mutateAsync({
      jobId,
      name,
      systemPrompt,
    });
  }, [jobId, createMutation]);
  
  const selectConversation = useCallback((conversationId: string) => {
    setSelectedId(conversationId);
    setInput('');
  }, []);
  
  const endConversation = useCallback(async () => {
    if (!selectedId) return;
    await completeMutation.mutateAsync(selectedId);
  }, [selectedId, completeMutation]);
  
  const handleDeleteConversation = useCallback(async (id: string) => {
    await deleteMutation.mutateAsync(id);
  }, [deleteMutation]);
  
  return {
    conversations,
    isLoadingConversations,
    conversation: conversation || null,
    isLoadingConversation,
    turns,
    input,
    setInput,
    enableEvaluation,
    setEnableEvaluation,
    selectedEvaluatorId,
    setSelectedEvaluatorId,
    isSending: addTurnMutation.isPending,
    isCreating: createMutation.isPending,
    error: error as Error | null,
    tokenUsage,
    sendMessage,
    startNewConversation,
    selectConversation,
    endConversation,
    deleteConversation: handleDeleteConversation,
    canSendMessage,
    isAtMaxTurns,
  };
}
```

### Task 4: Export Hook

Add to `src/hooks/index.ts`:

```typescript
export { useDualChat } from './useDualChat';
export type { UseDualChatReturn } from './useDualChat';
```

### Task 5: Create UI Components

#### 5.1 MultiTurnChat.tsx (Main Container)

Create file: `src/components/pipeline/chat/MultiTurnChat.tsx`

```typescript
/**
 * MultiTurnChat Component
 * Main container for multi-turn A/B testing chat interface
 */

'use client';

import { useState } from 'react';
import { useDualChat } from '@/hooks';
import { useEvaluators } from '@/hooks/useAdapterTesting';
import { ChatSidebar } from './ChatSidebar';
import { ChatMain } from './ChatMain';
import { Card } from '@/components/ui/card';

interface MultiTurnChatProps {
  jobId: string;
  initialConversationId?: string;
}

export function MultiTurnChat({ jobId, initialConversationId }: MultiTurnChatProps) {
  const chat = useDualChat(jobId, initialConversationId);
  const [systemPrompt, setSystemPrompt] = useState('');
  const { data: evaluatorsData } = useEvaluators();
  const evaluators = evaluatorsData?.data || [];
  
  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[600px] gap-4">
      {/* Sidebar */}
      <Card className="w-64 flex-shrink-0 overflow-hidden">
        <ChatSidebar
          conversations={chat.conversations}
          selectedId={chat.conversation?.id || null}
          onSelect={chat.selectConversation}
          onNewChat={() => chat.startNewConversation(undefined, systemPrompt)}
          onDelete={chat.deleteConversation}
          isLoading={chat.isLoadingConversations}
          isCreating={chat.isCreating}
        />
      </Card>
      
      {/* Main Chat Area */}
      <Card className="flex-1 overflow-hidden">
        <ChatMain
          conversation={chat.conversation}
          turns={chat.turns}
          input={chat.input}
          onInputChange={chat.setInput}
          onSend={chat.sendMessage}
          onEndConversation={chat.endConversation}
          isSending={chat.isSending}
          canSend={chat.canSendMessage}
          isAtMaxTurns={chat.isAtMaxTurns}
          tokenUsage={chat.tokenUsage}
          isLoading={chat.isLoadingConversation}
          error={chat.error}
          systemPrompt={systemPrompt}
          onSystemPromptChange={setSystemPrompt}
          enableEvaluation={chat.enableEvaluation}
          onEnableEvaluationChange={chat.setEnableEvaluation}
          selectedEvaluatorId={chat.selectedEvaluatorId}
          onEvaluatorChange={chat.setSelectedEvaluatorId}
          evaluators={evaluators}
        />
      </Card>
    </div>
  );
}
```

#### 5.2 ChatSidebar.tsx

Create file: `src/components/pipeline/chat/ChatSidebar.tsx`

```typescript
/**
 * ChatSidebar Component
 * Conversation list with new chat button
 */

'use client';

import { Conversation } from '@/types/conversation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, MessageSquare, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatSidebarProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => Promise<void>;
  isLoading: boolean;
  isCreating: boolean;
}

export function ChatSidebar({
  conversations,
  selectedId,
  onSelect,
  onNewChat,
  onDelete,
  isLoading,
  isCreating,
}: ChatSidebarProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <Button 
          onClick={onNewChat} 
          className="w-full" 
          size="sm"
          disabled={isCreating}
        >
          <Plus className="h-4 w-4 mr-2" />
          {isCreating ? 'Creating...' : 'New Chat'}
        </Button>
      </div>
      
      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            <div className="text-center text-sm text-muted-foreground py-4">
              Loading...
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-4">
              No conversations yet
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  'group flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-accent',
                  selectedId === conv.id && 'bg-accent'
                )}
                onClick={() => onSelect(conv.id)}
              >
                {conv.status === 'completed' ? (
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                ) : (
                  <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">
                    {conv.name || `Chat ${conv.id.slice(0, 8)}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {conv.turnCount}/{conv.maxTurns} turns
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conv.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
```

#### 5.3 ChatMain.tsx

Create file: `src/components/pipeline/chat/ChatMain.tsx`

```typescript
/**
 * ChatMain Component
 * Main chat area with header, messages, and input
 */

'use client';

import { ConversationWithTurns, ConversationTurn, TokenUsage } from '@/types/conversation';
import { ChatHeader } from './ChatHeader';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface ChatMainProps {
  conversation: ConversationWithTurns | null;
  turns: ConversationTurn[];
  input: string;
  onInputChange: (value: string) => void;
  onSend: (message?: string) => Promise<void>;
  onEndConversation: () => Promise<void>;
  isSending: boolean;
  canSend: boolean;
  isAtMaxTurns: boolean;
  tokenUsage: TokenUsage;
  isLoading: boolean;
  error: Error | null;
  systemPrompt: string;
  onSystemPromptChange: (value: string) => void;
  enableEvaluation: boolean;
  onEnableEvaluationChange: (value: boolean) => void;
  selectedEvaluatorId: string | undefined;
  onEvaluatorChange: (id: string | undefined) => void;
  evaluators: any[];
}

export function ChatMain({
  conversation,
  turns,
  input,
  onInputChange,
  onSend,
  onEndConversation,
  isSending,
  canSend,
  isAtMaxTurns,
  tokenUsage,
  isLoading,
  error,
  systemPrompt,
  onSystemPromptChange,
  enableEvaluation,
  onEnableEvaluationChange,
  selectedEvaluatorId,
  onEvaluatorChange,
  evaluators,
}: ChatMainProps) {
  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a conversation or start a new chat
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading conversation...
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      <ChatHeader
        conversation={conversation}
        onEndConversation={onEndConversation}
        isAtMaxTurns={isAtMaxTurns}
      />
      
      {error && (
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}
      
      <ChatMessageList turns={turns} />
      
      <ChatInput
        input={input}
        onInputChange={onInputChange}
        onSend={onSend}
        isSending={isSending}
        canSend={canSend}
        isAtMaxTurns={isAtMaxTurns}
        isCompleted={conversation.status === 'completed'}
        enableEvaluation={enableEvaluation}
        onEnableEvaluationChange={onEnableEvaluationChange}
        selectedEvaluatorId={selectedEvaluatorId}
        onEvaluatorChange={onEvaluatorChange}
        evaluators={evaluators}
      />
    </div>
  );
}
```

#### 5.4 ChatHeader.tsx

Create file: `src/components/pipeline/chat/ChatHeader.tsx`

```typescript
/**
 * ChatHeader Component
 * Header with conversation info and controls
 */

'use client';

import { ConversationWithTurns } from '@/types/conversation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';

interface ChatHeaderProps {
  conversation: ConversationWithTurns;
  onEndConversation: () => Promise<void>;
  isAtMaxTurns: boolean;
}

export function ChatHeader({ conversation, onEndConversation, isAtMaxTurns }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div>
        <h3 className="font-medium">
          {conversation.name || `Conversation ${conversation.id.slice(0, 8)}`}
        </h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{conversation.turnCount}/{conversation.maxTurns} turns</span>
          {conversation.status === 'completed' && (
            <Badge variant="secondary">Completed</Badge>
          )}
          {isAtMaxTurns && conversation.status === 'active' && (
            <Badge variant="destructive">Max Turns Reached</Badge>
          )}
        </div>
      </div>
      
      {conversation.status === 'active' && (
        <Button variant="outline" size="sm" onClick={onEndConversation}>
          <CheckCircle className="h-4 w-4 mr-2" />
          End Conversation
        </Button>
      )}
    </div>
  );
}
```

#### 5.5 ChatMessageList.tsx

Create file: `src/components/pipeline/chat/ChatMessageList.tsx`

```typescript
/**
 * ChatMessageList Component
 * Scrollable list of chat turns
 */

'use client';

import { useRef, useEffect } from 'react';
import { ConversationTurn } from '@/types/conversation';
import { ChatTurn } from './ChatTurn';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChatMessageListProps {
  turns: ConversationTurn[];
}

export function ChatMessageList({ turns }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns.length]);
  
  if (turns.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Start the conversation by sending a message
      </div>
    );
  }
  
  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-6">
        {turns.map((turn) => (
          <ChatTurn key={turn.id} turn={turn} />
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
```

#### 5.6 ChatTurn.tsx

Create file: `src/components/pipeline/chat/ChatTurn.tsx`

```typescript
/**
 * ChatTurn Component
 * Single turn with user message and dual responses
 */

'use client';

import { ConversationTurn } from '@/types/conversation';
import { DualResponsePanel } from './DualResponsePanel';
import { ArcProgressionBar } from './ArcProgressionBar';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';

interface ChatTurnProps {
  turn: ConversationTurn;
}

export function ChatTurn({ turn }: ChatTurnProps) {
  return (
    <div className="space-y-3">
      {/* User Message */}
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">You</span>
            <Badge variant="outline" className="text-xs">Turn {turn.turnNumber}</Badge>
          </div>
          <p className="text-sm">{turn.userMessage}</p>
        </div>
      </div>
      
      {/* Dual Responses */}
      <DualResponsePanel turn={turn} />
      
      {/* Human Emotional State (if multi-turn evaluation) */}
      {turn.humanEmotionalState && (
        <div className="ml-11 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
          <div className="font-medium text-blue-700 dark:text-blue-300 mb-1">
            Human Emotional State (Turn {turn.humanEmotionalState.turnNumber})
          </div>
          <div className="text-blue-600 dark:text-blue-400 space-y-1">
            <div>
              <strong>Primary:</strong> {turn.humanEmotionalState.primaryEmotion} ({turn.humanEmotionalState.valence})
            </div>
            <div>
              <strong>Intensity:</strong> {(turn.humanEmotionalState.intensity * 100).toFixed(0)}%
            </div>
            {turn.humanEmotionalState.secondaryEmotions.length > 0 && (
              <div>
                <strong>Secondary:</strong> {turn.humanEmotionalState.secondaryEmotions.join(', ')}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Arc Progression */}
      {turn.arcProgression && (
        <div className="ml-11">
          <ArcProgressionBar 
            arcName={turn.arcProgression.detectedArc}
            progressionPercentage={turn.arcProgression.progressionPercentage}
            onTrack={turn.arcProgression.onTrack}
          />
        </div>
      )}
    </div>
  );
}
```

#### 5.7 ChatInput.tsx

Create file: `src/components/pipeline/chat/ChatInput.tsx`

```typescript
/**
 * ChatInput Component
 * Message input with send button and evaluation controls
 */

'use client';

import { KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSend: (message?: string) => Promise<void>;
  isSending: boolean;
  canSend: boolean;
  isAtMaxTurns: boolean;
  isCompleted: boolean;
  enableEvaluation: boolean;
  onEnableEvaluationChange: (value: boolean) => void;
  selectedEvaluatorId: string | undefined;
  onEvaluatorChange: (id: string | undefined) => void;
  evaluators: any[];
}

export function ChatInput({
  input,
  onInputChange,
  onSend,
  isSending,
  canSend,
  isAtMaxTurns,
  isCompleted,
  enableEvaluation,
  onEnableEvaluationChange,
  selectedEvaluatorId,
  onEvaluatorChange,
  evaluators,
}: ChatInputProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) {
        onSend();
      }
    }
  };
  
  const isDisabled = isCompleted || isAtMaxTurns;
  
  return (
    <div className="p-4 border-t space-y-3">
      {/* Evaluation Controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            id="enableEvaluation"
            checked={enableEvaluation}
            onCheckedChange={onEnableEvaluationChange}
            disabled={isDisabled}
          />
          <Label htmlFor="enableEvaluation" className="text-sm">
            Enable Evaluation
          </Label>
        </div>
        
        {enableEvaluation && (
          <Select
            value={selectedEvaluatorId}
            onValueChange={onEvaluatorChange}
            disabled={isDisabled}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select evaluator" />
            </SelectTrigger>
            <SelectContent>
              {evaluators.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.displayName || e.display_name}
                  {e.name?.includes('multi_turn') && (
                    <span className="ml-2 text-xs text-green-600">(Multi-Turn)</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      
      {/* Input Area */}
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isCompleted 
              ? 'Conversation completed'
              : isAtMaxTurns 
                ? 'Maximum turns reached'
                : 'Type your message...'
          }
          disabled={isDisabled}
          className="min-h-[60px] resize-none"
        />
        <Button
          onClick={() => onSend()}
          disabled={!canSend || isSending}
          className="self-end"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
```

#### 5.8 DualResponsePanel.tsx

Create file: `src/components/pipeline/chat/DualResponsePanel.tsx`

```typescript
/**
 * DualResponsePanel Component
 * Side-by-side control and adapted responses
 */

'use client';

import { ConversationTurn } from '@/types/conversation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, CheckCircle } from 'lucide-react';

interface DualResponsePanelProps {
  turn: ConversationTurn;
}

export function DualResponsePanel({ turn }: DualResponsePanelProps) {
  const winner = turn.evaluationComparison?.winner;
  
  return (
    <div className="ml-11 grid grid-cols-2 gap-4">
      {/* Control Response */}
      <Card className={winner === 'control' ? 'ring-2 ring-green-500' : ''}>
        <CardHeader className="py-2 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Control (Base)
              {winner === 'control' && (
                <Badge variant="default" className="ml-2 bg-green-500">Winner</Badge>
              )}
            </CardTitle>
            {turn.controlGenerationTimeMs && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                {(turn.controlGenerationTimeMs / 1000).toFixed(1)}s
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="py-2 px-4 text-sm">
          {turn.controlError ? (
            <div className="flex items-center text-destructive">
              <AlertCircle className="h-4 w-4 mr-2" />
              {turn.controlError}
            </div>
          ) : turn.controlResponse ? (
            <p className="whitespace-pre-wrap">{turn.controlResponse}</p>
          ) : (
            <span className="text-muted-foreground">Generating...</span>
          )}
        </CardContent>
      </Card>
      
      {/* Adapted Response */}
      <Card className={winner === 'adapted' ? 'ring-2 ring-green-500' : ''}>
        <CardHeader className="py-2 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Adapted (LoRA)
              {winner === 'adapted' && (
                <Badge variant="default" className="ml-2 bg-green-500">Winner</Badge>
              )}
            </CardTitle>
            {turn.adaptedGenerationTimeMs && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                {(turn.adaptedGenerationTimeMs / 1000).toFixed(1)}s
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="py-2 px-4 text-sm">
          {turn.adaptedError ? (
            <div className="flex items-center text-destructive">
              <AlertCircle className="h-4 w-4 mr-2" />
              {turn.adaptedError}
            </div>
          ) : turn.adaptedResponse ? (
            <p className="whitespace-pre-wrap">{turn.adaptedResponse}</p>
          ) : (
            <span className="text-muted-foreground">Generating...</span>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

#### 5.9 TokenUsageBar.tsx

Create file: `src/components/pipeline/chat/TokenUsageBar.tsx`

```typescript
/**
 * TokenUsageBar Component
 * Token usage indicator
 */

'use client';

import { TokenUsage } from '@/types/conversation';
import { Progress } from '@/components/ui/progress';

interface TokenUsageBarProps {
  tokenUsage: TokenUsage;
}

export function TokenUsageBar({ tokenUsage }: TokenUsageBarProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Token Usage</span>
        <span>{tokenUsage.totalTokens.toLocaleString()} tokens</span>
      </div>
      <Progress 
        value={tokenUsage.percentageUsed * 100} 
        className={tokenUsage.isNearLimit ? '[&>div]:bg-yellow-500' : ''}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Control: {tokenUsage.controlTokens.toLocaleString()}</span>
        <span>Adapted: {tokenUsage.adaptedTokens.toLocaleString()}</span>
      </div>
    </div>
  );
}
```

#### 5.10 ArcProgressionBar.tsx

Create file: `src/components/pipeline/chat/ArcProgressionBar.tsx`

```typescript
/**
 * ArcProgressionBar Component
 * Displays visual arc progression for multi-turn evaluation
 */

'use client';

import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface ArcProgressionBarProps {
  arcName: string | null;
  progressionPercentage: number;
  onTrack: boolean;
}

export function ArcProgressionBar({ arcName, progressionPercentage, onTrack }: ArcProgressionBarProps) {
  if (!arcName || arcName === 'none') {
    return (
      <div className="text-sm text-muted-foreground">
        No clear arc trajectory detected
      </div>
    );
  }
  
  // Format arc name for display
  const displayName = arcName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' → ')
    .replace('To', '→');
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{displayName}</span>
        <Badge variant={onTrack ? 'default' : 'secondary'}>
          {onTrack ? 'On Track' : 'Off Track'}
        </Badge>
      </div>
      <Progress 
        value={progressionPercentage} 
        className={`h-2 ${onTrack ? '[&>div]:bg-green-500' : '[&>div]:bg-yellow-500'}`}
      />
      <div className="text-xs text-muted-foreground text-right">
        {progressionPercentage}% complete
      </div>
    </div>
  );
}
```

#### 5.11 index.ts (Barrel Export)

Create file: `src/components/pipeline/chat/index.ts`

```typescript
export { MultiTurnChat } from './MultiTurnChat';
export { ChatSidebar } from './ChatSidebar';
export { ChatMain } from './ChatMain';
export { ChatHeader } from './ChatHeader';
export { ChatMessageList } from './ChatMessageList';
export { ChatTurn } from './ChatTurn';
export { ChatInput } from './ChatInput';
export { DualResponsePanel } from './DualResponsePanel';
export { TokenUsageBar } from './TokenUsageBar';
export { ArcProgressionBar } from './ArcProgressionBar';
```

### Task 6: Verify TypeScript Build

```bash
cd C:\Users\james\Master\BrightHub\BRun\v4-show && npm run build
```

**Success Criteria:** Build completes with no TypeScript errors.

---

## Success Criteria

- [ ] `@chatscope/chat-ui-kit-react` installed
- [ ] Chatscope styles imported in globals.css
- [ ] `src/hooks/useDualChat.ts` created
- [ ] `src/hooks/index.ts` exports useDualChat
- [ ] All 11 UI components created in `src/components/pipeline/chat/`
- [ ] TypeScript builds without errors


+++++++++++++++++



---

## Files Created

| File | Purpose |
|------|---------|
| `src/hooks/useDualChat.ts` | React hook for chat state |
| `src/components/pipeline/chat/MultiTurnChat.tsx` | Main container |
| `src/components/pipeline/chat/ChatSidebar.tsx` | Conversation list |
| `src/components/pipeline/chat/ChatMain.tsx` | Main chat area |
| `src/components/pipeline/chat/ChatHeader.tsx` | Header controls |
| `src/components/pipeline/chat/ChatMessageList.tsx` | Message container |
| `src/components/pipeline/chat/ChatTurn.tsx` | Turn display |
| `src/components/pipeline/chat/ChatInput.tsx` | Input with evaluator |
| `src/components/pipeline/chat/DualResponsePanel.tsx` | A/B responses |
| `src/components/pipeline/chat/TokenUsageBar.tsx` | Token indicator |
| `src/components/pipeline/chat/ArcProgressionBar.tsx` | Arc progress |
| `src/components/pipeline/chat/index.ts` | Barrel export |

---

**END OF E04 PROMPT**
