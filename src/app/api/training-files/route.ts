/**
 * Training Files API - List and Create
 * 
 * GET /api/training-files - List all training files
 * POST /api/training-files - Create new training file
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { createTrainingFileService } from '@/lib/services/training-file-service';
import { z, ZodError } from 'zod';

const CreateTrainingFileSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  conversation_ids: z.array(z.string().uuid()).min(1).max(80),
});

/**
 * GET /api/training-files
 * List all training files
 */
export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    // Use ADMIN client for database operations to bypass RLS
    const supabaseAdmin = createServerSupabaseAdminClient();
    const service = createTrainingFileService(supabaseAdmin);
    const files = await service.listTrainingFiles({ status: 'active', created_by: user.id });

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error listing training files:', error);
    return NextResponse.json(
      { error: 'Failed to list training files' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/training-files
 * Create new training file
 */
export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const body = await request.json();
    
    // 🔍 DEBUG: Log raw request body
    console.log('[CREATE-TRAINING-FILE API] 📥 Received request body:', {
      name: body.name,
      description: body.description,
      conversation_ids_count: body.conversation_ids?.length,
      conversation_ids: body.conversation_ids
    });
    
    const validated = CreateTrainingFileSchema.parse(body);
    
    console.log('[CREATE-TRAINING-FILE API] ✅ Validated:', validated.conversation_ids.length, 'conversation IDs');

    // Use ADMIN client for database operations to bypass RLS
    // (conversations may be created by system user, not the current user)
    const supabaseAdmin = createServerSupabaseAdminClient();
    const service = createTrainingFileService(supabaseAdmin);
    const trainingFile = await service.createTrainingFile({
      name: validated.name,
      description: validated.description,
      conversation_ids: validated.conversation_ids,
      created_by: user.id,
    });

    console.log('[CREATE-TRAINING-FILE API] ✅ Successfully created training file:', trainingFile.id);

    return NextResponse.json({ trainingFile }, { status: 201 });
  } catch (error) {
    console.error('[CREATE-TRAINING-FILE API] ❌ Error creating training file:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create training file' },
      { status: 500 }
    );
  }
}

