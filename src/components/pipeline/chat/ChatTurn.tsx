/**
 * ChatTurn Component
 * Single turn with user message(s) and dual responses
 */

'use client';

import { ConversationTurn, getUserMessageForEndpoint, turnMessagesAreIdentical } from '@/types/conversation';
import { DualResponsePanel } from './DualResponsePanel';
import { DualArcProgressionDisplay } from './DualArcProgressionDisplay';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';

interface ChatTurnProps {
  turn: ConversationTurn;
}

export function ChatTurn({ turn }: ChatTurnProps) {
  const showDualArcProgression = turn.controlArcProgression || turn.adaptedArcProgression;
  
  // NEW: Check if messages are different
  const messagesAreIdentical = turnMessagesAreIdentical(turn);
  const controlMessage = getUserMessageForEndpoint(turn, 'control');
  const adaptedMessage = getUserMessageForEndpoint(turn, 'adapted');
  
  return (
    <div className="space-y-3">
      {/* User Message(s) */}
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">You</span>
            <Badge variant="outline" className="text-xs">Turn {turn.turnNumber}</Badge>
          </div>
          
          {messagesAreIdentical ? (
            // Same message for both
            <p className="text-sm">{controlMessage}</p>
          ) : (
            // Different messages - show both
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-blue-600">Control: </span>
                <span>{controlMessage}</span>
              </div>
              <div>
                <span className="font-medium text-purple-600">Adapted: </span>
                <span>{adaptedMessage}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Dual Responses */}
      <DualResponsePanel turn={turn} />
      
      {/* Dual Arc Progression Display */}
      {showDualArcProgression && (
        <div className="ml-11 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
          <div className="font-medium text-sm mb-3">Conversation Arc Progression</div>
          <DualArcProgressionDisplay
            controlArcProgression={turn.controlArcProgression}
            adaptedArcProgression={turn.adaptedArcProgression}
            conversationWinner={turn.conversationWinner || null}
          />
        </div>
      )}
    </div>
  );
}
