'use client';

import { Badge } from '@/components/ui/badge';
import type { RAGDocumentStatus } from '@/types/rag';

interface DocumentStatusBadgeProps {
  status: RAGDocumentStatus;
}

const statusConfig: Record<RAGDocumentStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  uploading: { label: 'Uploading', variant: 'outline' },
  processing: { label: 'Processing', variant: 'secondary' },
  awaiting_questions: { label: 'Awaiting Q&A', variant: 'default' },
  ready: { label: 'Ready', variant: 'default' },
  error: { label: 'Error', variant: 'destructive' },
  archived: { label: 'Archived', variant: 'outline' },
};

export function DocumentStatusBadge({ status }: DocumentStatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: 'outline' as const };

  return (
    <Badge variant={config.variant} className={status === 'ready' ? 'bg-green-600 hover:bg-green-700' : status === 'processing' ? 'bg-blue-600 hover:bg-blue-700 text-white' : status === 'awaiting_questions' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}>
      {config.label}
    </Badge>
  );
}
