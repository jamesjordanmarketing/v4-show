/**
 * Test History Table
 *
 * Displays previous A/B test results with pagination support.
 * Uses useAdapterTesting hook for history data.
 */

'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Clock, Trophy, ThumbsUp, ThumbsDown, Minus, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAdapterTesting, type TestResult, type UserRating } from '@/hooks';

interface TestHistoryTableProps {
  jobId: string;
  onSelectTest?: (test: TestResult) => void;
}

function RatingIcon({ rating }: { rating: UserRating | null }) {
  switch (rating) {
    case 'control':
      return (
        <div className="flex items-center gap-1 text-blue-600">
          <ThumbsUp className="h-4 w-4" />
          <span className="text-xs">Control</span>
        </div>
      );
    case 'adapted':
      return (
        <div className="flex items-center gap-1 text-green-600">
          <ThumbsUp className="h-4 w-4" />
          <span className="text-xs">Adapted</span>
        </div>
      );
    case 'tie':
      return (
        <div className="flex items-center gap-1 text-yellow-600">
          <Minus className="h-4 w-4" />
          <span className="text-xs">Tie</span>
        </div>
      );
    case 'neither':
      return (
        <div className="flex items-center gap-1 text-red-600">
          <ThumbsDown className="h-4 w-4" />
          <span className="text-xs">Neither</span>
        </div>
      );
    default:
      return <span className="text-muted-foreground text-xs">Not rated</span>;
  }
}

export function TestHistoryTable({ jobId, onSelectTest }: TestHistoryTableProps) {
  const [page, setPage] = useState(0);
  const limit = 20;

  const {
    history,
    historyCount,
    isLoadingHistory,
    currentPage,
    totalPages,
  } = useAdapterTesting(jobId, {
    limit,
    offset: page * limit,
  });

  if (isLoadingHistory) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center gap-2 text-muted-foreground">
          <div className="h-4 w-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
          Loading test history...
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex flex-col items-center gap-2">
          <div className="text-muted-foreground text-sm">
            No tests run yet
          </div>
          <div className="text-xs text-muted-foreground">
            Use the panel above to run your first A/B test
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Time</TableHead>
              <TableHead>Prompt</TableHead>
              <TableHead className="w-[140px]">AI Verdict</TableHead>
              <TableHead className="w-[140px]">Your Rating</TableHead>
              <TableHead className="w-[120px]">Gen Time</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((test) => (
              <TableRow key={test.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell className="text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(test.createdAt), { addSuffix: true })}
                  </div>
                </TableCell>
                <TableCell className="max-w-xs">
                  <div className="truncate">{test.userPrompt}</div>
                </TableCell>
                <TableCell>
                  {test.evaluationComparison ? (
                    <Badge
                      variant={
                        test.evaluationComparison.winner === 'adapted'
                          ? 'default'
                          : test.evaluationComparison.winner === 'control'
                          ? 'secondary'
                          : 'outline'
                      }
                      className="capitalize"
                    >
                      <Trophy className="h-3 w-3 mr-1" />
                      {test.evaluationComparison.winner}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">No eval</span>
                  )}
                </TableCell>
                <TableCell>
                  <RatingIcon rating={test.userRating} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  <div>C: {test.controlGenerationTimeMs}ms</div>
                  <div>A: {test.adaptedGenerationTimeMs}ms</div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelectTest?.(test)}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {page * limit + 1}-{Math.min((page + 1) * limit, historyCount)} of{' '}
            {historyCount} tests
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="text-sm">
              Page {currentPage + 1} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
