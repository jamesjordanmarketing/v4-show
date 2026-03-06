'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWorkbase } from '@/hooks/useWorkbases';
import { DocumentUploader } from '@/components/rag/DocumentUploader';
import { DocumentList } from '@/components/rag/DocumentList';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import type { RAGDocument } from '@/types/rag';

export default function DocumentsPage() {
  const params = useParams();
  const router = useRouter();
  const workbaseId = params.id as string;
  const { data: workbase } = useWorkbase(workbaseId);
  const [selectedDocId, setSelectedDocId] = useState<string | undefined>();

  const hasDocs = (workbase?.documentCount || 0) > 0;

  function handleSelectDocument(doc: RAGDocument) {
    setSelectedDocId(doc.id);
    router.push(`/workbase/${workbaseId}/fact-training/documents/${doc.id}`);
  }

  function handleChatWithAll() {
    router.push(`/workbase/${workbaseId}/fact-training/chat`);
  }

  return (
    <div className="p-8 max-w-5xl mx-auto bg-background min-h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload documents to teach your AI about your business.
          </p>
        </div>
        {hasDocs && (
          <Button onClick={() => router.push(`/workbase/${workbaseId}/fact-training/chat`)}>
            Chat with Documents
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>

      <div className="mb-8">
        <DocumentUploader workbaseId={workbaseId} />
      </div>

      {hasDocs ? (
        <DocumentList
          workbaseId={workbaseId}
          onSelectDocument={handleSelectDocument}
          onChatWithAll={handleChatWithAll}
          selectedId={selectedDocId}
        />
      ) : (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground">Upload documents to get started.</p>
        </div>
      )}
    </div>
  );
}
