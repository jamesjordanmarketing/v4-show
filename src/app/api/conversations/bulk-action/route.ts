/**
 * API Route: /api/conversations/bulk-action
 * 
 * Handles bulk operations on conversations
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClientFromRequest } from '@/lib/supabase-server';
import { conversationService } from '@/lib/conversation-service';
import { AppError } from '@/lib/types/errors';
import { z } from 'zod';

const BulkActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'delete', 'update']),
  conversationIds: z.array(z.string().uuid()).min(1, 'At least one conversation ID is required'),
  reason: z.string().optional(),
  updates: z.record(z.string(), z.any()).optional(),
});

/**
 * POST /api/conversations/bulk-action
 * Perform bulk actions on multiple conversations
 */
export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  try {
    const body = await request.json();

    // Validate input
    const validatedData = BulkActionSchema.parse(body);
    const { action, conversationIds, reason, updates } = validatedData;

    // Filter to only conversations owned by the authenticated user
    const { supabase } = createServerSupabaseClientFromRequest(request);
    const { data: ownedConvs } = await supabase
      .from('conversations')
      .select('id')
      .in('id', conversationIds)
      .eq('created_by', user.id);

    const ownedIds = new Set((ownedConvs || []).map((c: { id: string }) => c.id));
    const filteredIds = conversationIds.filter(id => ownedIds.has(id));
    const skippedCount = conversationIds.length - filteredIds.length;

    if (filteredIds.length === 0) {
      return NextResponse.json(
        { message: 'No owned conversations found', count: 0, skipped: skippedCount },
        { status: 200 }
      );
    }

    let result;

    switch (action) {
      case 'approve':
        result = await conversationService.bulkApprove(filteredIds, user.id);
        return NextResponse.json(
          {
            message: `Successfully approved ${result} conversations`,
            count: result,
            skipped: skippedCount,
          },
          { status: 200 }
        );

      case 'reject':
        if (!reason) {
          return NextResponse.json(
            { error: 'Validation Error', message: 'reason is required for reject action' },
            { status: 400 }
          );
        }
        result = await conversationService.bulkReject(filteredIds, user.id, reason);
        return NextResponse.json(
          {
            message: `Successfully rejected ${result} conversations`,
            count: result,
            skipped: skippedCount,
          },
          { status: 200 }
        );

      case 'delete':
        result = await conversationService.bulkDelete(filteredIds);
        return NextResponse.json(
          {
            message: `Successfully deleted ${result} conversations`,
            count: result,
            skipped: skippedCount,
          },
          { status: 200 }
        );

      case 'update':
        if (!updates || Object.keys(updates).length === 0) {
          return NextResponse.json(
            { error: 'Validation Error', message: 'updates object is required for update action' },
            { status: 400 }
          );
        }
        result = await conversationService.bulkUpdate(filteredIds, updates);
        return NextResponse.json(
          {
            message: `Successfully updated ${result} conversations`,
            count: result,
            skipped: skippedCount,
          },
          { status: 200 }
        );

      default:
        return NextResponse.json(
          { error: 'Validation Error', message: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in POST /api/conversations/bulk-action:', error);
    
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }

    // Zod validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json(
        { error: 'Validation Error', message: 'Invalid input data', details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to perform bulk action' },
      { status: 500 }
    );
  }
}
