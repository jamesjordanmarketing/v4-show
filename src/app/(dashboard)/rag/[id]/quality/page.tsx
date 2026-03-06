'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { QualityDashboard } from '@/components/rag/QualityDashboard';

export default function RAGQualityPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="sm" onClick={() => router.push(`/rag/${documentId}`)}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Document
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6" />
            <h1 className="text-xl font-bold">RAG Quality Dashboard</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <QualityDashboard documentId={documentId} />
      </div>
    </div>
  );
}
