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
