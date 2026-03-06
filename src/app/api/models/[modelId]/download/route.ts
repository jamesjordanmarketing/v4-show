import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient, createServerSupabaseAdminClient } from '@/lib/supabase-server';

/**
 * POST /api/models/[modelId]/download - Generate signed download URLs
 * 
 * Request body:
 * - files?: string[] (optional - download specific files, or all if not provided)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { modelId: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const supabase = await createServerSupabaseClient();
    const supabaseAdmin = createServerSupabaseAdminClient();
    const { modelId } = params;

    // Verify model belongs to user
    const { data: model, error: modelError } = await supabase
      .from('model_artifacts')
      .select('artifacts, name')
      .eq('id', modelId)
      .eq('user_id', user.id)
      .single();

    if (modelError || !model) {
      return NextResponse.json(
        { error: 'Model not found or access denied' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const requestedFiles = body.files || Object.keys(model.artifacts);

    // Generate signed URLs for each file (valid for 1 hour)
    const downloadUrls: Record<string, string> = {};

    for (const fileName of requestedFiles) {
      const storagePath = model.artifacts[fileName];
      
      if (!storagePath) {
        console.warn(`File ${fileName} not found in artifact`);
        continue;
      }

      const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
        .from('lora-models')
        .createSignedUrl(storagePath, 3600); // 1 hour expiry

      if (urlError || !signedUrlData) {
        console.error(`Failed to generate URL for ${fileName}:`, urlError);
        continue;
      }

      downloadUrls[fileName] = signedUrlData.signedUrl;
    }

    if (Object.keys(downloadUrls).length === 0) {
      return NextResponse.json(
        { error: 'No download URLs could be generated' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        model_id: modelId,
        model_name: model.name,
        download_urls: downloadUrls,
        expires_in_seconds: 3600,
      },
    });
  } catch (error: any) {
    console.error('Download URL generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate download URLs', details: error.message },
      { status: 500 }
    );
  }
}

