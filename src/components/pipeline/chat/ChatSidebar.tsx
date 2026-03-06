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
