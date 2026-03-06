'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Layers, Lightbulb, Tags } from 'lucide-react';
import { useRAGDocumentDetail } from '@/hooks/useRAGDocuments';
import { DocumentStatusBadge } from './DocumentStatusBadge';

interface DocumentDetailProps {
  documentId: string;
}

export function DocumentDetail({ documentId }: DocumentDetailProps) {
  const { data, isLoading, error } = useRAGDocumentDetail(documentId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-destructive py-4">Failed to load document details.</p>;
  }

  const { document: doc, sections, facts } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {doc.fileName}
          </h3>
          {doc.description && <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>}
        </div>
        <DocumentStatusBadge status={doc.status} />
      </div>

      {/* Summary */}
      {doc.documentSummary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Document Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{doc.documentSummary}</p>
          </CardContent>
        </Card>
      )}

      {/* Topics & Entities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {doc.topicTaxonomy && doc.topicTaxonomy.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                <Tags className="h-4 w-4" /> Topics
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1">
              {doc.topicTaxonomy.map((topic, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{topic}</Badge>
              ))}
            </CardContent>
          </Card>
        )}

        {doc.entityList && doc.entityList.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Key Entities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {doc.entityList.slice(0, 10).map((entity, i) => (
                <div key={i} className="text-sm">
                  <span className="font-medium">{entity.name}</span>
                  <span className="text-muted-foreground ml-1">({entity.type})</span>
                </div>
              ))}
              {doc.entityList.length > 10 && (
                <p className="text-xs text-muted-foreground">+{doc.entityList.length - 10} more</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sections */}
      {sections.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <Layers className="h-4 w-4" /> Sections ({sections.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sections.map((section) => (
              <div key={section.id} className="border-l-2 border-muted pl-3">
                <p className="font-medium text-sm">{section.title || `Section ${section.sectionIndex}`}</p>
                {section.summary && (
                  <p className="text-sm text-muted-foreground mt-1">{section.summary}</p>
                )}
                {section.contextualPreamble && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 italic">
                    Context: {section.contextualPreamble}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Facts */}
      {facts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <Lightbulb className="h-4 w-4" /> Facts ({facts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {facts.slice(0, 20).map((fact) => (
              <div key={fact.id} className="flex items-start gap-2 text-sm">
                <Badge variant="outline" className="text-xs shrink-0 mt-0.5">
                  {fact.factType.replace('_', ' ')}
                </Badge>
                <span>{fact.content}</span>
              </div>
            ))}
            {facts.length > 20 && (
              <p className="text-xs text-muted-foreground">+{facts.length - 20} more facts</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">File Type</p>
              <p className="font-medium">{doc.fileType.toUpperCase()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Sections</p>
              <p className="font-medium">{doc.sectionCount ?? 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Facts</p>
              <p className="font-medium">{doc.factCount ?? 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Questions</p>
              <p className="font-medium">{doc.questionCount ?? 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
