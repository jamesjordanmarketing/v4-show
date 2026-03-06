'use client';

import { useParams, useRouter } from 'next/navigation';
import { useWorkbase } from '@/hooks/useWorkbases';
import { RAGChat } from '@/components/rag/RAGChat';

export default function FactTrainingChatPage() {
  const params = useParams();
  const router = useRouter();
  const workbaseId = params.id as string;
  const { data: workbase, isLoading } = useWorkbase(workbaseId);

  const hasDocs = (workbase?.documentCount || 0) > 0;

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-xl font-semibold text-foreground">Chat</h1>
        <p className="text-sm text-muted-foreground">Chat with all documents in this Work Base</p>
      </div>

      {!isLoading && hasDocs ? (
        <div className="flex-1 overflow-hidden p-4">
          <RAGChat workbaseId={workbaseId} />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              Upload and process at least one document to start chatting.
            </p>
            <button
              className="text-duck-blue hover:underline text-sm"
              onClick={() => router.push(`/workbase/${workbaseId}/fact-training/documents`)}
            >
              Go to Documents →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
