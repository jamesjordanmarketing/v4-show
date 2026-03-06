'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, FileText, MessageSquare, Zap, BookOpen } from 'lucide-react';
import { useRAGDocumentDetail } from '@/hooks/useRAGDocuments';
import { DocumentDetail } from '@/components/rag/DocumentDetail';
import { DocumentStatusBadge } from '@/components/rag/DocumentStatusBadge';
import { ExpertQAPanel } from '@/components/rag/ExpertQAPanel';
import { RAGChat } from '@/components/rag/RAGChat';
import { DiagnosticTestPanel } from '@/components/rag/DiagnosticTestPanel';

export default function WorkbaseDocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workbaseId = params.id as string;
  const docId = params.docId as string;
  const [activeTab, setActiveTab] = useState('detail');

  const { data, isLoading, error } = useRAGDocumentDetail(docId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => router.push(`/workbase/${workbaseId}/fact-training/documents`)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Documents
        </Button>
        <p className="text-destructive">
          {error?.message || 'Document not found'}
        </p>
      </div>
    );
  }

  const document = data.document;

  return (
    <div className="p-8 max-w-6xl mx-auto bg-background min-h-full">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 text-muted-foreground hover:text-foreground"
        onClick={() => router.push(`/workbase/${workbaseId}/fact-training/documents`)}
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Documents
      </Button>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-xl font-bold text-foreground">{document.fileName}</h1>
            <p className="text-sm text-muted-foreground">
              {document.fileType.toUpperCase()} · {document.sectionCount} sections · {document.factCount} facts
            </p>
          </div>
        </div>
        <DocumentStatusBadge status={document.status} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="detail" className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            Detail
          </TabsTrigger>
          <TabsTrigger value="diagnostics" className="flex items-center gap-1">
            <Zap className="h-4 w-4" />
            Diagnostics
            {(document.status === 'processing' || document.status === 'error') && (
              <span className="ml-1 w-2 h-2 rounded-full bg-yellow-500" />
            )}
          </TabsTrigger>
          <TabsTrigger value="qa" className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            Expert Q&amp;A
            {document.status === 'awaiting_questions' && (
              <span className="ml-1 w-2 h-2 rounded-full bg-orange-500" />
            )}
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="detail" className="mt-4">
          <DocumentDetail documentId={docId} />
        </TabsContent>

        <TabsContent value="diagnostics" className="mt-4">
          <DiagnosticTestPanel documentId={docId} />
        </TabsContent>

        <TabsContent value="qa" className="mt-4">
          <ExpertQAPanel documentId={docId} documentStatus={document.status} />
          {document.status !== 'awaiting_questions' && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Expert Q&amp;A is available when document status is &ldquo;awaiting_questions&rdquo;.
              Current status: {document.status}
            </p>
          )}
        </TabsContent>

        <TabsContent value="chat" className="mt-4">
          {document.status === 'ready' ? (
            <RAGChat documentId={docId} documentName={document.fileName} />
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Chat is available after document processing is complete and verified.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
