'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, FileText, MessageSquare, BarChart3, BookOpen, Zap } from 'lucide-react';
import { useRAGDocumentDetail } from '@/hooks/useRAGDocuments';
import { DocumentDetail } from '@/components/rag/DocumentDetail';
import { DocumentStatusBadge } from '@/components/rag/DocumentStatusBadge';
import { ExpertQAPanel } from '@/components/rag/ExpertQAPanel';
import { RAGChat } from '@/components/rag/RAGChat';
import { DiagnosticTestPanel } from '@/components/rag/DiagnosticTestPanel';

export default function RAGDocumentPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;
  const [activeTab, setActiveTab] = useState('detail');

  const { data, isLoading, error } = useRAGDocumentDetail(documentId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => router.push('/rag')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to RAG
          </Button>
          <p className="text-destructive mt-4">
            {error?.message || 'Document not found'}
          </p>
        </div>
      </div>
    );
  }

  const document = data.document;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="sm" onClick={() => router.push('/rag')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="h-6 w-6" />
              <div>
                <h1 className="text-xl font-bold">{document.fileName}</h1>
                <p className="text-sm text-muted-foreground">
                  {document.fileType.toUpperCase()} · {document.sectionCount} sections · {document.factCount} facts
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DocumentStatusBadge status={document.status} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/rag/${documentId}/quality`)}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Quality
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
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
              Expert Q&A
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
            <DocumentDetail documentId={documentId} />
          </TabsContent>

          <TabsContent value="diagnostics" className="mt-4">
            <DiagnosticTestPanel documentId={documentId} />
          </TabsContent>

          <TabsContent value="qa" className="mt-4">
            <ExpertQAPanel documentId={documentId} documentStatus={document.status} />
            {document.status !== 'awaiting_questions' && (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Expert Q&A is available when document status is &quot;awaiting_questions&quot;.
                Current status: {document.status}
              </p>
            )}
          </TabsContent>

          <TabsContent value="chat" className="mt-4">
            {document.status === 'ready' ? (
              <RAGChat documentId={documentId} documentName={document.fileName} />
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Chat is available after document processing is complete and verified.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
