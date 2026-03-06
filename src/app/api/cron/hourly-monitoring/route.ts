import { NextRequest, NextResponse } from 'next/server';
import { requireAuthOrCron } from '@/lib/supabase-server';
import { hourlyMonitoring } from '@/lib/cron/performance-monitoring';

/**
 * Hourly Performance Monitoring Cron Endpoint
 * 
 * Triggers hourly database performance monitoring including:
 * - Index usage snapshot capture
 * - Table bloat measurement
 * - Query performance analysis
 * 
 * Configure in vercel.json:
 * ```json
 * {
 *   "crons": [{
 *     "path": "/api/cron/hourly-monitoring",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 * ```
 */
export async function GET(request: NextRequest) {
  const { response } = await requireAuthOrCron(request);
  if (response) return response;

  try {
    await hourlyMonitoring();
    return NextResponse.json({ 
      success: true, 
      message: 'Hourly monitoring completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Hourly monitoring failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Hourly monitoring failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
