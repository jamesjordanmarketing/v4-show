/**
 * Pipeline Engines API
 * 
 * GET - Get current loaded engine info
 * 
 * Note: Single engine architecture - this returns the currently loaded engine
 * There is no engine selection UI; this is for display purposes only.
 */

import { NextResponse } from 'next/server';
import { getCurrentEngine } from '@/lib/services/pipeline-service';

export async function GET() {
  try {
    const engine = getCurrentEngine();
    
    return NextResponse.json({
      success: true,
      data: {
        currentEngine: engine,
        // Single engine architecture - no list of engines
        message: 'Single engine architecture: only one engine loaded at a time',
      },
    });
  } catch (error) {
    console.error('GET /api/pipeline/engines error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
