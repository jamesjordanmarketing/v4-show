'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Trash2, Eye, RefreshCw, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useRAGDocuments, useDeleteDocument, useReprocessDocument } from '@/hooks/useRAGDocuments';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import type { RAGDocument } from '@/types/rag';

interface DocumentListProps {
  workbaseId: string;
  onSelectDocument: (doc: RAGDocument) => void;
  onChatWithAll?: () => void;
  selectedId?: string;
}

export function DocumentList({ workbaseId, onSelectDocument, onChatWithAll, selectedId }: DocumentListProps) {
  const { data: documents, isLoading, error } = useRAGDocuments(workbaseId);
  const deleteMutation = useDeleteDocument(workbaseId);
  const reprocessMutation = useReprocessDocument();

  const handleDelete = async (e: React.MouseEvent, doc: RAGDocument) => {
    e.stopPropagation();
    if (!confirm(`Delete "${doc.fileName}"? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync(doc.id);
      toast.success(`"${doc.fileName}" deleted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleReprocess = async (e: React.MouseEvent, doc: RAGDocument) => {
    e.stopPropagation();
    try {
      await reprocessMutation.mutateAsync(doc.id);
      toast.success(`Reprocessing "${doc.fileName}"...`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reprocess');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading documents...</span>
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive py-4">Failed to load documents: {error.message}</p>;
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p>No documents yet. Upload one above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.filter(d => d.status === 'ready').length >= 2 && onChatWithAll && (
        <Card
          className="cursor-pointer transition-colors hover:border-primary/50 border-dashed"
          onClick={onChatWithAll}
        >
          <CardContent className="flex items-center gap-3 py-3 px-4">
            <MessageCircle className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-primary">Chat with all documents</p>
              <p className="text-xs text-muted-foreground">
                Search across {documents.filter(d => d.status === 'ready').length} ready documents
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      {documents.map((doc) => (
        <Card
          key={doc.id}
          className={`cursor-pointer transition-colors hover:border-primary/50 ${selectedId === doc.id ? 'border-primary bg-primary/5' : ''}`}
          onClick={() => onSelectDocument(doc)}
        >
          <CardContent className="flex items-center justify-between py-3 px-4">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="font-medium truncate">{doc.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.sectionCount ?? 0} sections · {doc.factCount ?? 0} facts
                  {doc.description && ` · ${doc.description}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <DocumentStatusBadge status={doc.status} />
              {doc.status === 'error' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleReprocess(e, doc)}
                  disabled={reprocessMutation.isPending}
                  title="Retry processing"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => handleDelete(e, doc)}
                disabled={deleteMutation.isPending}
                title="Delete document"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
