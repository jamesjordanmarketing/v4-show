'use client';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BookOpen } from 'lucide-react';
import type { RAGCitation } from '@/types/rag';

interface SourceCitationProps {
  citations: RAGCitation[];
}

export function SourceCitation({ citations }: SourceCitationProps) {
  if (!citations || citations.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t">
      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
        <BookOpen className="h-3 w-3" />
        Sources ({citations.length})
      </p>
      <div className="flex flex-wrap gap-1">
        <TooltipProvider>
          {citations.map((citation, i) => (
            <div key={i} className="flex flex-col items-start gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="text-xs cursor-help hover:bg-muted"
                  >
                    [{i + 1}] {citation.sectionTitle || 'Section'}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-sm">
                  <p className="text-xs">{citation.excerpt.slice(0, 200)}{citation.excerpt.length > 200 ? '...' : ''}</p>
                  <p className="text-xs text-muted-foreground mt-1">Relevance: {(citation.relevanceScore * 100).toFixed(0)}%</p>
                </TooltipContent>
              </Tooltip>
              {citation.documentName && (
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded ml-0.5">
                  📄 {citation.documentName}
                </span>
              )}
            </div>
          ))}
        </TooltipProvider>
      </div>
    </div>
  );
}
