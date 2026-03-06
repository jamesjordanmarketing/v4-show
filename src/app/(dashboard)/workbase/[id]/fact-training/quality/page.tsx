'use client';

import { useParams, useRouter } from 'next/navigation';
import { useRAGDocuments } from '@/hooks/useRAGDocuments';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DocumentStatusBadge } from '@/components/rag/DocumentStatusBadge';
import { BarChart3, FileText, ArrowRight } from 'lucide-react';

export default function QualityPage() {
  const params = useParams();
  const router = useRouter();
  const workbaseId = params.id as string;

  const { data: documents = [], isLoading } = useRAGDocuments(workbaseId);

  const readyDocs = documents.filter((d) => d.status === 'ready');

  return (
    <div className="p-8 max-w-5xl mx-auto bg-background min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Quality</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Quality metrics are tracked per document. Select a document to view its quality scores.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-duck-blue" />
        </div>
      ) : documents.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">
              No documents yet. Upload documents and run queries to see quality metrics.
            </p>
            <Button
              variant="outline"
              onClick={() => router.push(`/workbase/${workbaseId}/fact-training/documents`)}
            >
              Go to Documents
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <Card
              key={doc.id}
              className="bg-card border-border cursor-pointer hover:border-duck-blue transition-colors"
              onClick={() =>
                router.push(`/workbase/${workbaseId}/fact-training/documents/${doc.id}`)
              }
            >
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{doc.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.sectionCount} sections · {doc.factCount} facts
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <DocumentStatusBadge status={doc.status} />
                  {doc.status === 'ready' && (
                    <Button size="sm" variant="ghost" className="text-muted-foreground">
                      View Quality
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {readyDocs.length === 0 && documents.length > 0 && (
            <p className="text-sm text-muted-foreground text-center pt-4">
              Process your documents to completion to access quality metrics.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
