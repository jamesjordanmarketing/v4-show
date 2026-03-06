/**
 * API Route: /api/pipeline/conversations/[id]/turn
 * 
 * POST - Add a new turn to the conversation
 * 
 * This endpoint:
 * - Calls both control and adapted endpoints with siloed history
 * - Optionally evaluates responses with Claude-as-Judge
 * - Supports both single-turn and multi-turn arc evaluation
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { addTurn } from '@/lib/services';
import { AddTurnRequest } from '@/types/conversation';

// Legacy format for backward compatibility
interface LegacyAddTurnRequest {
  userMessage: string;
  enableEvaluation?: boolean;
  evaluationPromptId?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;
    
    const body = await request.json();
    
    // NEW: Support both new dual-message format and legacy single-message format
    let turnRequest: AddTurnRequest;
    
    if ('controlUserMessage' in body && 'adaptedUserMessage' in body) {
      // New format: separate messages
      turnRequest = body as AddTurnRequest;
      
      if (!turnRequest.controlUserMessage || turnRequest.controlUserMessage.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'controlUserMessage is required' },
          { status: 400 }
        );
      }
      
      if (!turnRequest.adaptedUserMessage || turnRequest.adaptedUserMessage.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'adaptedUserMessage is required' },
          { status: 400 }
        );
      }
    } else if ('userMessage' in body) {
      // Legacy format: single message (send same to both)
      const legacyBody = body as LegacyAddTurnRequest;
      
      if (!legacyBody.userMessage || legacyBody.userMessage.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'userMessage is required' },
          { status: 400 }
        );
      }
      
      // Convert to new format (same message for both endpoints)
      turnRequest = {
        controlUserMessage: legacyBody.userMessage,
        adaptedUserMessage: legacyBody.userMessage,
        enableEvaluation: legacyBody.enableEvaluation,
        evaluationPromptId: legacyBody.evaluationPromptId,
      };
    } else {
      return NextResponse.json(
        { success: false, error: 'Either userMessage (legacy) or controlUserMessage+adaptedUserMessage (new) are required' },
        { status: 400 }
      );
    }
    
    const result = await addTurn(user.id, params.id, turnRequest);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('POST /api/pipeline/conversations/[id]/turn error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
