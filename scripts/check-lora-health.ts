/**
 * Quick health check for LoRA Training Platform
 * Run: npx tsx scripts/check-lora-health.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(color: keyof typeof colors, message: string) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkHealth() {
  log('blue', '\n🏥 LoRA Platform Health Check');
  log('blue', '='.repeat(40) + '\n');

  if (!supabaseUrl || !supabaseServiceKey) {
    log('red', '❌ Environment variables not set');
    log('red', '   Missing: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY\n');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Check 1: Database connection
  try {
    const { error: dbError } = await supabase
      .from('datasets')
      .select('id')
      .limit(1);

    if (dbError) {
      log('red', '❌ Database Connection Failed');
      console.error('   Error:', dbError.message);
    } else {
      log('green', '✅ Database Connection');
    }
  } catch (error: any) {
    log('red', '❌ Database Connection Error');
    console.error('   Error:', error.message);
  }

  // Check 2: Queue depth
  try {
    const { count, error } = await supabase
      .from('training_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'queued');

    if (error) {
      log('yellow', '⚠️  Could not check queue depth');
      console.error('   Error:', error.message);
    } else {
      const queueCount = count ?? 0;
      const status = queueCount > 50 ? 'red' : queueCount > 10 ? 'yellow' : 'green';
      const icon = queueCount > 50 ? '❌' : queueCount > 10 ? '⚠️' : '✅';
      log(status, `${icon} Queue Depth: ${queueCount} jobs`);
    }
  } catch (error: any) {
    log('yellow', '⚠️  Could not check queue depth');
    console.error('   Error:', error.message);
  }

  // Check 3: Failed jobs (last 24h)
  try {
    const { count: failedCount, error } = await supabase
      .from('training_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      log('yellow', '⚠️  Could not check failed jobs');
      console.error('   Error:', error.message);
    } else {
      const failed = failedCount ?? 0;
      const status = failed > 5 ? 'red' : failed > 0 ? 'yellow' : 'green';
      const icon = failed > 5 ? '❌' : failed > 0 ? '⚠️' : '✅';
      log(status, `${icon} Failed Jobs (24h): ${failed}`);
    }
  } catch (error: any) {
    log('yellow', '⚠️  Could not check failed jobs');
    console.error('   Error:', error.message);
  }

  // Check 4: Active training jobs
  try {
    const { count, error } = await supabase
      .from('training_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'training');

    if (error) {
      log('yellow', '⚠️  Could not check active jobs');
    } else {
      log('blue', `📊 Active Training Jobs: ${count ?? 0}`);
    }
  } catch (error: any) {
    log('yellow', '⚠️  Could not check active jobs');
  }

  // Check 5: Storage buckets
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      log('red', '❌ Storage Buckets Check Failed');
      console.error('   Error:', error.message);
    } else {
      const hasDatasets = buckets?.some(b => b.name === 'lora-datasets');
      const hasModels = buckets?.some(b => b.name === 'lora-models');

      log(hasDatasets ? 'green' : 'red',
        `${hasDatasets ? '✅' : '❌'} lora-datasets bucket`);
      log(hasModels ? 'green' : 'red',
        `${hasModels ? '✅' : '❌'} lora-models bucket`);
    }
  } catch (error: any) {
    log('red', '❌ Storage Buckets Check Error');
    console.error('   Error:', error.message);
  }

  // Check 6: Recent dataset uploads
  try {
    const { count, error } = await supabase
      .from('datasets')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (!error) {
      log('blue', `📦 Datasets Uploaded (24h): ${count ?? 0}`);
    }
  } catch (error: any) {
    // Skip if error
  }

  // Check 7: Recent model artifacts
  try {
    const { count, error } = await supabase
      .from('model_artifacts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (!error) {
      log('blue', `🎯 Models Created (24h): ${count ?? 0}`);
    }
  } catch (error: any) {
    // Skip if error
  }

  log('blue', '\n' + '='.repeat(40));
  log('green', '✓ Health check complete\n');
}

// Run health check
checkHealth().catch((error) => {
  log('red', `\n❌ Health check error: ${error.message}\n`);
  console.error(error.stack);
  process.exit(1);
});

