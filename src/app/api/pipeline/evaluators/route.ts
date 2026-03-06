/**
 * Evaluators API
 *
 * GET /api/pipeline/evaluators
 * Retrieve available evaluation prompts for the UI dropdown
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getAvailableEvaluators } from '@/lib/services';

export async function GET(request: NextRequest) {
    try {
        // Authenticate user
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const result = await getAvailableEvaluators();

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json(result, { status: 200 });

    } catch (error) {
        console.error('GET /api/pipeline/evaluators error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error. Please try again later.'
            },
            { status: 500 }
        );
    }
}
