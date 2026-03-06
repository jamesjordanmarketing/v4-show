/**
 * Export Log Cleanup Cron Endpoint
 * 
 * GET /api/cron/export-log-cleanup
 * 
 * Scheduled endpoint for deleting old export logs.
 * Called by Vercel Cron monthly on the first day at 3am UTC.
 * 
 * Schedule: 0 3 1 * * (Monthly on 1st at 3am UTC)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthOrCron } from '@/lib/supabase-server';
import { exportLogCleanup } from '@/lib/cron/export-log-cleanup';

export async function GET(request: NextRequest) {
  const { response } = await requireAuthOrCron(request);
  if (response) return response;

  try {
    console.log('[Cron] Starting export log cleanup job...');

    const result = await exportLogCleanup();

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    }, { status: 200 });

  } catch (error) {
    console.error('[Cron] Export log cleanup job failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
