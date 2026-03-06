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
  
  // NEW: Dual inputs
  controlInput: string;
  onControlInputChange: (value: string) => void;
  adaptedInput: string;
  onAdaptedInputChange: (value: string) => void;
  
  onSend: (controlMessage?: string, adaptedMessage?: string) => Promise<void>;
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
  controlInput,
  onControlInputChange,
  adaptedInput,
  onAdaptedInputChange,
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
    <div className="flex flex-col h-full min-h-0">
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
        controlInput={controlInput}
        onControlInputChange={onControlInputChange}
        adaptedInput={adaptedInput}
        onAdaptedInputChange={onAdaptedInputChange}
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
