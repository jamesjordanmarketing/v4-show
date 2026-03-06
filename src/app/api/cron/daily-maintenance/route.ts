import { NextRequest, NextResponse } from 'next/server';
import { requireAuthOrCron } from '@/lib/supabase-server';
import { dailyMaintenance } from '@/lib/cron/performance-monitoring';

/**
 * Daily Maintenance Cron Endpoint
 * 
 * Triggers daily database maintenance tasks including:
 * - Unused index detection
 * - High bloat table identification
 * - Performance report generation
 * 
 * Configure in vercel.json:
 * ```json
 * {
 *   "crons": [{
 *     "path": "/api/cron/daily-maintenance",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 * ```
 */
export async function GET(request: NextRequest) {
  const { response } = await requireAuthOrCron(request);
  if (response) return response;

  try {
    await dailyMaintenance();
    return NextResponse.json({ 
      success: true, 
      message: 'Daily maintenance completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Daily maintenance failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Daily maintenance failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
