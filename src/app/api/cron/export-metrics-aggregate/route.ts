/**
 * Export Metrics Aggregation Cron Endpoint
 * 
 * GET /api/cron/export-metrics-aggregate
 * 
 * Scheduled endpoint for aggregating export metrics.
 * Called by Vercel Cron hourly to generate summary statistics.
 * 
 * Schedule: 0 * * * * (Hourly)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthOrCron, createServerSupabaseClient } from '@/lib/supabase-server';
import { createExportMetricsService } from '@/lib/monitoring/export-metrics';

export async function GET(request: NextRequest) {
  const { response } = await requireAuthOrCron(request);
  if (response) return response;

  try {
    console.log('[Cron] Starting export metrics aggregation...');

    const supabase = await createServerSupabaseClient();
    const metricsService = createExportMetricsService(supabase);

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 60 * 60 * 1000);

    const metrics = await metricsService.aggregateMetrics(startDate, endDate, 'hourly');

    const failureAlert = await metricsService.checkFailureRate(60);

    console.log('[Cron] Export metrics aggregation complete:', {
      total_exports: metrics.total_exports,
      success_rate: (metrics.success_rate * 100).toFixed(2) + '%',
      alert: failureAlert?.alert || false,
    });

    return NextResponse.json({
      success: true,
      metrics,
      failure_alert: failureAlert,
      timestamp: new Date().toISOString(),
    }, { status: 200 });

  } catch (error) {
    console.error('[Cron] Export metrics aggregation failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
