/**
 * Export File Cleanup Cron Endpoint
 * 
 * GET /api/cron/export-file-cleanup
 * 
 * Scheduled endpoint for deleting expired export files.
 * Called by Vercel Cron daily at 2am UTC.
 * 
 * Schedule: 0 2 * * * (Daily at 2am UTC)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthOrCron } from '@/lib/supabase-server';
import { exportFileCleanup } from '@/lib/cron/export-file-cleanup';

export async function GET(request: NextRequest) {
  const { response } = await requireAuthOrCron(request);
  if (response) return response;

  try {
    console.log('[Cron] Starting export file cleanup job...');

    const result = await exportFileCleanup();

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    }, { status: 200 });

  } catch (error) {
    console.error('[Cron] Export file cleanup job failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
