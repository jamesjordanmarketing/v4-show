'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useConversation } from '@/hooks/use-conversations';
import {
  useConversationComments,
  useCreateComment,
  useDeleteComment,
} from '@/hooks/useConversationComments';
import type { ConversationTurn } from '@/lib/types/conversations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ChevronLeft, Trash2, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workbaseId = params.id as string;
  const convId = params.convId as string;

  const { data: conversation, isLoading } = useConversation(convId);
  const { data: comments = [] } = useConversationComments(convId);
  const createComment = useCreateComment(convId);
  const deleteComment = useDeleteComment(convId);

  const [commentText, setCommentText] = useState('');

  async function handleAddComment() {
    if (!commentText.trim()) return;
    try {
      await createComment.mutateAsync({ content: commentText.trim() });
      setCommentText('');
      toast.success('Comment added');
    } catch {
      toast.error('Failed to add comment');
    }
  }

  async function handleDeleteComment(commentId: string) {
    try {
      await deleteComment.mutateAsync(commentId);
      toast.success('Comment deleted');
    } catch {
      toast.error('Failed to delete comment');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Turns are included in the conversation response (includeTurns=true in the API fetch)
  const turns: ConversationTurn[] = (conversation as any)?.turns || [];

  return (
    <div className="p-8 max-w-4xl mx-auto bg-background min-h-full">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 text-muted-foreground hover:text-foreground"
        onClick={() => router.push(`/workbase/${workbaseId}/fine-tuning/conversations`)}
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Conversations
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {conversation?.title || conversation?.conversationId || 'Conversation Detail'}
        </h1>
        <div className="flex flex-wrap gap-2">
          {conversation?.persona && (
            <Badge variant="secondary">Persona: {conversation.persona}</Badge>
          )}
          {conversation?.emotion && (
            <Badge variant="secondary">Emotion: {conversation.emotion}</Badge>
          )}
          {conversation?.topic && <Badge variant="secondary">{conversation.topic}</Badge>}
          {conversation?.status && <Badge variant="outline">{conversation.status}</Badge>}
        </div>
      </div>

      {/* Conversation Thread */}
      <Card className="mb-8 bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">
            Conversation{turns.length > 0 ? ` (${turns.length} turns)` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {turns.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No turns found.</p>
          ) : (
            <div className="space-y-4">
              {turns
                .sort((a, b) => a.turnNumber - b.turnNumber)
                .map((turn) => (
                  <div
                    key={turn.id}
                    className={cn(
                      'flex',
                      turn.role === 'assistant' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[75%] rounded-lg px-4 py-3 text-sm',
                        turn.role === 'assistant'
                          ? 'bg-primary/20 text-foreground'
                          : 'bg-muted text-foreground'
                      )}
                    >
                      <p className="text-xs font-semibold mb-1 capitalize text-muted-foreground">
                        {turn.role}
                      </p>
                      <p className="whitespace-pre-wrap">{turn.content}</p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feedback Section (D9) */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Your Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-6">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add feedback about this conversation..."
              className="flex-1"
              rows={3}
            />
            <Button
              onClick={handleAddComment}
              disabled={!commentText.trim() || createComment.isPending}
              size="sm"
              className="self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center">No feedback yet.</p>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="flex items-start justify-between p-3 bg-muted rounded-md"
                >
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{comment.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(comment.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-muted-foreground hover:text-red-400 ml-2"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
