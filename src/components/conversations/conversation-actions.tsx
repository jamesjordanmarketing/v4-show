'use client';

/**
 * Conversation Actions Component
 * 
 * Provides action buttons for:
 * - Downloading raw minimal JSON
 * - Downloading enriched JSON (when available)
 * - Viewing validation report
 * 
 * Button states are determined by enrichment_status:
 * - Raw JSON: Always available (if raw_response_path exists)
 * - Enriched JSON: Only when enrichment_status = 'enriched' or 'completed'
 * - Validation Report: Always available
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Download, FileJson, FileText, AlertCircle, MoreVertical } from 'lucide-react';
import { ValidationReportDialog } from './validation-report-dialog';
import { toast } from 'sonner';

interface ConversationActionsProps {
  conversationId: string;
  enrichmentStatus: string;
  hasRawResponse: boolean;
  compact?: boolean; // If true, show as dropdown menu; if false, show as buttons
}

export function ConversationActions({
  conversationId,
  enrichmentStatus,
  hasRawResponse,
  compact = false,
}: ConversationActionsProps) {
  const [reportOpen, setReportOpen] = useState(false);
  const [downloading, setDownloading] = useState<'raw' | 'enriched' | null>(null);

  const isEnriched = enrichmentStatus === 'enriched' || enrichmentStatus === 'completed';
  const canTriggerEnrich = !isEnriched && hasRawResponse && enrichmentStatus !== 'processing';

  async function handleDownloadRaw() {
    if (!hasRawResponse) {
      toast.error('Raw JSON not available', {
        description: 'This conversation does not have a raw response stored.',
      });
      return;
    }

    setDownloading('raw');
    
    try {
      const response = await fetch(`/api/conversations/${conversationId}/download/raw`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get download URL');
      }
      
      const data = await response.json();
      
      // Open download URL in new tab
      window.open(data.download_url, '_blank');
      
      toast.success('Download started', {
        description: `Downloading ${data.filename}`,
      });
    } catch (error) {
      console.error('Error downloading raw JSON:', error);
      toast.error('Download failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setDownloading(null);
    }
  }

  async function handleDownloadEnriched() {
    if (!isEnriched && !canTriggerEnrich) {
      toast.error('Enriched JSON not available', {
        description: !hasRawResponse
          ? 'No raw response stored — cannot enrich this conversation.'
          : `Enrichment status: ${enrichmentStatus}.`,
      });
      return;
    }

    setDownloading('enriched');

    try {
      // If not yet enriched but raw response exists, trigger enrichment first
      if (!isEnriched && canTriggerEnrich) {
        toast.info('Enriching conversation…', {
          description: 'Running enrichment pipeline. This may take a moment.',
        });

        const enrichRes = await fetch(`/api/conversations/${conversationId}/enrich`, {
          method: 'POST',
        });

        if (!enrichRes.ok) {
          const enrichErr = await enrichRes.json();
          throw new Error(enrichErr.error || 'Enrichment failed');
        }

        toast.success('Enrichment complete', {
          description: 'Downloading enriched file now…',
        });
      }

      const response = await fetch(`/api/conversations/${conversationId}/download/enriched`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get download URL');
      }
      
      const data = await response.json();
      
      window.open(data.download_url, '_blank');
      
      toast.success('Download started', {
        description: `Downloading ${data.filename}`,
      });
    } catch (error) {
      console.error('Error downloading enriched JSON:', error);
      toast.error('Download failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setDownloading(null);
    }
  }

  if (compact) {
    // Compact dropdown menu for table rows
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={handleDownloadRaw}
              disabled={!hasRawResponse || downloading === 'raw'}
            >
              <FileJson className="w-4 h-4 mr-2" />
              Download Raw JSON
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDownloadEnriched}
              disabled={(!isEnriched && !canTriggerEnrich) || downloading === 'enriched'}
            >
              <FileText className="w-4 h-4 mr-2" />
              {canTriggerEnrich ? 'Enrich & Download JSON' : 'Download Enriched JSON'}
              {!isEnriched && !canTriggerEnrich && <span className="text-xs text-muted-foreground ml-2">(not ready)</span>}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setReportOpen(true)}>
              <AlertCircle className="w-4 h-4 mr-2" />
              View Validation Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ValidationReportDialog
          conversationId={conversationId}
          open={reportOpen}
          onClose={() => setReportOpen(false)}
        />
      </>
    );
  }

  // Full button layout for detail views
  // Buttons stack vertically on small screens (flex-col sm:flex-row)
  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownloadRaw}
        disabled={!hasRawResponse || downloading === 'raw'}
      >
        <Download className="w-4 h-4 mr-2" />
        Raw JSON
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleDownloadEnriched}
        disabled={(!isEnriched && !canTriggerEnrich) || downloading === 'enriched'}
      >
        <Download className="w-4 h-4 mr-2" />
        {canTriggerEnrich ? 'Enrich & Download' : 'Enriched JSON'}
        {!isEnriched && !canTriggerEnrich && (
          <span className="ml-2 text-xs text-muted-foreground">
            (Status: {enrichmentStatus})
          </span>
        )}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setReportOpen(true)}
      >
        <AlertCircle className="w-4 h-4 mr-2" />
        Validation Report
      </Button>

      <ValidationReportDialog
        conversationId={conversationId}
        open={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </div>
  );
}

