import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ConversationComment, CreateCommentRequest } from '@/types/workbase';

export const commentKeys = {
  all: ['conversation-comments'] as const,
  list: (conversationId: string) => [...commentKeys.all, conversationId] as const,
};

export function useConversationComments(conversationId: string | null) {
  return useQuery({
    queryKey: commentKeys.list(conversationId!),
    queryFn: async () => {
      const res = await fetch(`/api/conversations/${conversationId}/comments`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as ConversationComment[];
    },
    enabled: !!conversationId,
    staleTime: 15_000,
  });
}

export function useCreateComment(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateCommentRequest) => {
      const res = await fetch(`/api/conversations/${conversationId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as ConversationComment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.list(conversationId) });
    },
  });
}

export function useDeleteComment(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch(`/api/conversations/${conversationId}/comments/${commentId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.list(conversationId) });
    },
  });
}
