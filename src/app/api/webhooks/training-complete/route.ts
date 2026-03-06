/**
 * Webhook Route: Training Complete
 *
 * Route: POST /api/webhooks/training-complete
 *
 * Receives:
 *   Supabase Database Webhook for table=pipeline_training_jobs, event=UPDATE
 *
 * Behaviour:
 *   - Validates the request using a shared secret in the 'x-webhook-secret' header
 *   - Ignores updates where status !== 'completed' or adapter_file_path is null
 *   - Fires Inngest event 'pipeline/adapter.ready' for qualifying updates
 *
 * This triggers:
 *   autoDeployAdapter (src/inngest/functions/auto-deploy-adapter.ts)
 *   which orchestrates the full adapter deployment to HuggingFace + RunPod
 *
 * Supabase webhook payload format:
 * {
 *   "type": "UPDATE",
 *   "table": "pipeline_training_jobs",
 *   "schema": "public",
 *   "record": { ...updated row columns... },
 *   "old_record": { ...previous row values... }
 * }
 *
 * Security:
 *   The Supabase webhook is configured to send 'x-webhook-secret: <WEBHOOK_SECRET>'
 *   as a custom header. Requests without this exact secret are rejected.
 *   The WEBHOOK_SECRET env var must match the value configured in Supabase Dashboard.
 *
 * Note:
 *   Supabase Database Webhooks fire on ALL UPDATE events for the table.
 *   This route intentionally receives all of them and filters server-side.
 *   Only rows with status='completed' AND adapter_file_path IS NOT NULL trigger the event.
 */

import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/inngest/client';

export async function POST(request: NextRequest) {
  // ---- Security: validate shared secret ----
  const secret = process.env.WEBHOOK_SECRET;

  if (!secret) {
    console.error('[WebhookTrainingComplete] WEBHOOK_SECRET env var is not configured');
    return NextResponse.json(
      { error: 'Webhook not configured on server' },
      { status: 500 }
    );
  }

  const incomingSecret = request.headers.get('x-webhook-secret');

  if (incomingSecret !== secret) {
    console.warn('[WebhookTrainingComplete] Rejected request with invalid or missing webhook secret');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ---- Parse Supabase webhook payload ----
  let payload: {
    type?: string;
    table?: string;
    schema?: string;
    record?: Record<string, unknown>;
    old_record?: Record<string, unknown>;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const record = payload?.record;

  // Guard: log and ignore any update that does not represent a completed job with an adapter
  if (!record) {
    return NextResponse.json({ ok: true, message: 'Ignored — no record in payload' });
  }

  if (record.status !== 'completed' || !record.adapter_file_path) {
    return NextResponse.json({
      ok: true,
      message: 'Ignored — conditions not met (status or adapter_file_path)',
      receivedStatus: record.status,
      hasAdapterPath: Boolean(record.adapter_file_path),
    });
  }

  // Guard: require user_id (identity spine requirement — all records must have user_id)
  if (!record.user_id) {
    console.error(
      `[WebhookTrainingComplete] Job ${record.id} has no user_id — cannot fire adapter.ready event`
    );
    return NextResponse.json(
      { error: 'Record missing user_id — cannot dispatch event' },
      { status: 422 }
    );
  }

  // ---- Fire Inngest event ----
  try {
    await inngest.send({
      name: 'pipeline/adapter.ready',
      data: {
        jobId: record.id as string,
        userId: record.user_id as string,
        adapterFilePath: record.adapter_file_path as string,
      },
    });

    console.log(
      `[WebhookTrainingComplete] Fired pipeline/adapter.ready for job ${record.id}`
    );

    return NextResponse.json({
      ok: true,
      jobId: record.id,
      message: 'pipeline/adapter.ready event sent to Inngest',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[WebhookTrainingComplete] Failed to send Inngest event for job ${record.id}:`,
      message
    );
    return NextResponse.json(
      { error: 'Failed to send event to Inngest' },
      { status: 500 }
    );
  }
}
