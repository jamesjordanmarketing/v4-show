'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConversationTable } from '@/components/conversations/ConversationTable';
import { ConversationDetailModal } from '@/components/conversations/ConversationDetailModal';
import { ConfirmationDialog } from '@/components/conversations/ConfirmationDialog';
import type { StorageConversation, Conversation, ConversationStatus } from '@/lib/types/conversations';
import { Plus, ListTodo, Layers } from 'lucide-react';

/**
 * Transform StorageConversation (snake_case from API) to Conversation (camelCase for components).
 * Mirrors the identical function in src/app/(dashboard)/conversations/page.tsx.
 */
function transformStorageToConversation(
  storage: StorageConversation
): Conversation & Partial<Pick<StorageConversation, 'enrichment_status' | 'raw_response_path' | 'enriched_file_path'>> {
  const statusMap: Record<StorageConversation['status'], ConversationStatus> = {
    pending_review: 'pending_review',
    approved: 'approved',
    rejected: 'rejected',
    archived: 'none',
  };

  return {
    id: storage.id,
    conversationId: storage.conversation_id,
    title: storage.conversation_name || undefined,
    persona: storage.persona_key || '',
    emotion: storage.starting_emotion || '',
    tier: storage.tier,
    status: statusMap[storage.status],
    category: storage.category ? [storage.category] : [],
    qualityScore: storage.quality_score || undefined,
    turnCount: storage.turn_count,
    totalTokens: 0,
    parameters: {},
    reviewHistory: [],
    retryCount: 0,
    createdAt: storage.created_at,
    updatedAt: storage.updated_at,
    createdBy: storage.created_by || '',
    enrichment_status: storage.enrichment_status,
    raw_response_path: storage.raw_response_path,
    enriched_file_path: storage.enriched_file_path,
  };
}

export default function WorkbaseConversationsPage() {
  const params = useParams();
  const router = useRouter();
  const workbaseId = params.id as string;

  const [conversations, setConversations] = useState<StorageConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    tier: 'all',
    quality_min: 'all',
    enrichment_status: 'all',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
  });
  const [serverSort, setServerSort] = useState<{
    sortBy: string;
    sortDirection: 'asc' | 'desc';
  }>({ sortBy: 'created_at', sortDirection: 'desc' });

  useEffect(() => {
    loadConversations();
  }, [filters, pagination.page, pagination.limit, serverSort, workbaseId]);

  async function loadConversations() {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        workbaseId,
        sortBy: serverSort.sortBy,
        sortDirection: serverSort.sortDirection,
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.tier !== 'all' && { tier: filters.tier }),
        ...(filters.quality_min !== 'all' && { quality_min: filters.quality_min }),
        ...(filters.enrichment_status !== 'all' && { enrichment_status: filters.enrichment_status }),
      });

      const response = await fetch(`/api/conversations?${queryParams}`);
      const data = await response.json();

      setConversations(data.conversations || []);
      setPagination((prev) => ({ ...prev, total: data.total || 0 }));
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }

  const transformedConversations = conversations.map(transformStorageToConversation);

  const handleServerSort = (column: string) => {
    setServerSort((prev) => ({
      sortBy: column,
      sortDirection:
        prev.sortBy === column && prev.sortDirection === 'asc' ? 'desc' : 'asc',
    }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <div className="p-6 bg-background min-h-full">
      {/* Page Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Conversations</h1>
          <p className="text-muted-foreground mt-1">
            Manage training conversations for this Work Base
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              router.push(`/workbase/${workbaseId}/fine-tuning/conversations/batch`)
            }
          >
            <ListTodo className="h-4 w-4 mr-2" />
            Batch Jobs
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              router.push(`/workbase/${workbaseId}/fine-tuning/training-sets`)
            }
          >
            <Layers className="h-4 w-4 mr-2" />
            Training Sets
          </Button>
          <Button
            size="sm"
            onClick={() =>
              router.push(`/workbase/${workbaseId}/fine-tuning/conversations/generate`)
            }
          >
            <Plus className="h-4 w-4 mr-2" />
            New Conversation
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4 flex-wrap">
        <Select
          value={filters.status}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, status: value }))
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.tier}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, tier: value }))
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="template">Template</SelectItem>
            <SelectItem value="scenario">Scenario</SelectItem>
            <SelectItem value="edge_case">Edge Case</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.quality_min}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, quality_min: value }))
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Min quality score" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Quality</SelectItem>
            <SelectItem value="8.0">8.0+ (Excellent)</SelectItem>
            <SelectItem value="7.0">7.0+ (Good)</SelectItem>
            <SelectItem value="6.0">6.0+ (Fair)</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.enrichment_status}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, enrichment_status: value }))
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by enrichment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Enrichment</SelectItem>
            <SelectItem value="not_started">Not Enriched</SelectItem>
            <SelectItem value="enrichment_in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Enriched</SelectItem>
            <SelectItem value="failed">Enrichment Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Full-Featured Conversation Table */}
      <ConversationTable
        conversations={transformedConversations}
        isLoading={loading}
        compactActions={false}
        workbaseId={workbaseId}
        serverSortBy={serverSort.sortBy}
        serverSortDirection={serverSort.sortDirection}
        onServerSort={handleServerSort}
      />

      {/* Modals — must be mounted for store-driven state to render */}
      <ConversationDetailModal />
      <ConfirmationDialog />

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            {pagination.total > 0
              ? `Showing ${(pagination.page - 1) * pagination.limit + 1}–${Math.min(
                  pagination.page * pagination.limit,
                  pagination.total
                )} of ${pagination.total} conversations`
              : loading
              ? 'Loading...'
              : 'No conversations found'}
          </div>
          {/* Page size selector */}
          <Select
            value={pagination.limit.toString()}
            onValueChange={(value) => {
              setPagination((prev) => ({ ...prev, limit: parseInt(value), page: 1 }));
            }}
          >
            <SelectTrigger className="w-[110px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
              <SelectItem value="75">75 per page</SelectItem>
              <SelectItem value="100">100 per page</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={pagination.page === 1 || loading}
            onClick={() =>
              setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
            }
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={
              pagination.page * pagination.limit >= pagination.total || loading
            }
            onClick={() =>
              setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
            }
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
