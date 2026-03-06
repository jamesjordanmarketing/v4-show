/**
 * MultiTurnChat Component
 * Main container for multi-turn A/B testing chat interface
 */

'use client';

import { useState } from 'react';
import { useDualChat, useEvaluators } from '@/hooks';
import { useWorkbase } from '@/hooks/useWorkbases';
import { ChatSidebar } from './ChatSidebar';
import { ChatMain } from './ChatMain';

interface MultiTurnChatProps {
  jobId?: string;
  workbaseId?: string;
  initialConversationId?: string;
}

export function MultiTurnChat({ jobId, workbaseId, initialConversationId }: MultiTurnChatProps) {
  const { data: workbase } = useWorkbase(workbaseId || null);
  const effectiveJobId = jobId || workbase?.activeAdapterJobId || null;

  if (!effectiveJobId) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No adapter available. Launch tuning to activate a model.
      </div>
    );
  }

  return <MultiTurnChatInner jobId={effectiveJobId} initialConversationId={initialConversationId} />;
}

interface InnerProps {
  jobId: string;
  initialConversationId?: string;
}

function MultiTurnChatInner({ jobId, initialConversationId }: InnerProps) {
  const chat = useDualChat(jobId, initialConversationId);
  const [systemPrompt, setSystemPrompt] = useState('');
  const { data: evaluatorsData } = useEvaluators();
  const evaluators = evaluatorsData?.data || [];

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-4 border rounded-lg">
      {/* Sidebar */}
      <div className="w-64 border-r bg-card overflow-y-auto">
        <ChatSidebar
          conversations={chat.conversations}
          selectedId={chat.conversation?.id || null}
          onSelect={chat.selectConversation}
          onNewChat={() => chat.startNewConversation(undefined, systemPrompt)}
          onDelete={chat.deleteConversation}
          isLoading={chat.isLoadingConversations}
          isCreating={chat.isCreating}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0">
        <ChatMain
          conversation={chat.conversation}
          turns={chat.turns}
          controlInput={chat.controlInput}
          onControlInputChange={chat.setControlInput}
          adaptedInput={chat.adaptedInput}
          onAdaptedInputChange={chat.setAdaptedInput}
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
      </div>
    </div>
  );
}
