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
  
  // NEW: Dual input state
  controlInput: string;
  setControlInput: (value: string) => void;
  adaptedInput: string;
  setAdaptedInput: (value: string) => void;
  
  // DEPRECATED: Legacy single input (kept for compatibility)
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
  sendMessage: (controlMessage?: string, adaptedMessage?: string) => Promise<void>;
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
  
  // NEW: Dual input state
  const [controlInput, setControlInput] = useState('');
  const [adaptedInput, setAdaptedInput] = useState('');
  
  // DEPRECATED: Legacy single input (keep for backward compat)
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
      // NEW: Clear both inputs
      setControlInput('');
      setAdaptedInput('');
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
  
  // NEW: Can send if BOTH inputs have content
  const canSendMessage = 
    !!selectedId && 
    conversation?.status === 'active' && 
    !isAtMaxTurns &&
    !addTurnMutation.isPending &&
    controlInput.trim().length > 0 &&
    adaptedInput.trim().length > 0;
  
  // Actions
  const sendMessage = useCallback(async (controlMessage?: string, adaptedMessage?: string) => {
    if (!selectedId) return;
    
    const controlToSend = controlMessage || controlInput;
    const adaptedToSend = adaptedMessage || adaptedInput;
    
    if (!controlToSend.trim() || !adaptedToSend.trim()) return;
    
    await addTurnMutation.mutateAsync({
      conversationId: selectedId,
      request: {
        controlUserMessage: controlToSend.trim(),
        adaptedUserMessage: adaptedToSend.trim(),
        enableEvaluation,
        evaluationPromptId: enableEvaluation ? selectedEvaluatorId : undefined,
      },
    });
  }, [selectedId, controlInput, adaptedInput, enableEvaluation, selectedEvaluatorId, addTurnMutation]);
  
  const startNewConversation = useCallback(async (name?: string, systemPrompt?: string) => {
    await createMutation.mutateAsync({
      jobId,
      name,
      systemPrompt,
    });
  }, [jobId, createMutation]);
  
  const selectConversation = useCallback((conversationId: string) => {
    setSelectedId(conversationId);
    setControlInput('');
    setAdaptedInput('');
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
    
    // NEW: Dual inputs
    controlInput,
    setControlInput,
    adaptedInput,
    setAdaptedInput,
    
    // DEPRECATED: Legacy input
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
