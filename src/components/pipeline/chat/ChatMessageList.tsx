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
    <ScrollArea className="flex-1 p-4 overflow-auto">
      <div className="space-y-6">
        {turns.map((turn) => (
          <ChatTurn key={turn.id} turn={turn} />
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
