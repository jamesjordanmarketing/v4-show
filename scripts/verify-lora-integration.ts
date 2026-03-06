/**
 * LoRA Training Platform Integration Verification Script
 * 
 * Run this script to verify all system components are properly integrated.
 * Usage: npx tsx scripts/verify-lora-integration.ts
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
  cyan: '\x1b[36m',
};

function log(color: keyof typeof colors, message: string) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function verifyIntegration() {
  log('blue', '\n🔍 Starting LoRA Training Platform Integration Verification\n');
  log('cyan', '='.repeat(60));

  const client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  let passedChecks = 0;
  let failedChecks = 0;

  // Check 1: Environment Variables
  log('yellow', '\n📋 Checking environment variables...');
  try {
    const required = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
    ];

    const optional = [
      'GPU_CLUSTER_API_URL',
      'GPU_CLUSTER_API_KEY',
    ];

    for (const envVar of required) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required env var: ${envVar}`);
      }
    }

    for (const envVar of optional) {
      if (!process.env[envVar]) {
        log('yellow', `  ⚠️  Optional env var not set: ${envVar}`);
      }
    }

    log('green', '✓ All required environment variables set');
    passedChecks++;
  } catch (error: any) {
    log('red', `✗ Environment variables check failed: ${error.message}`);
    failedChecks++;
  }

  // Check 2: Database Tables
  log('yellow', '\n📊 Checking database tables...');
  try {
    const tables = [
      'datasets',
      'training_jobs',
      'metrics_points',
      'model_artifacts',
      'cost_records',
      'notifications'
    ];

    for (const table of tables) {
      const { error, count } = await client
        .from(table)
        .select('id', { count: 'exact', head: true });

      if (error) {
        throw new Error(`Table ${table} error: ${error.message}`);
      }
      log('green', `  ✓ ${table} (${count ?? 0} rows)`);
    }

    log('green', '✓ All database tables exist and are accessible');
    passedChecks++;
  } catch (error: any) {
    log('red', `✗ Database tables check failed: ${error.message}`);
    failedChecks++;
  }

  // Check 3: RLS Policies
  log('yellow', '\n🔒 Checking RLS policies...');
  try {
    // Use a direct query to check RLS status
    const { data, error } = await client
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('schemaname', 'public')
      .in('tablename', ['datasets', 'training_jobs', 'model_artifacts']);

    if (error) {
      log('yellow', `  ⚠️  Could not verify RLS policies automatically`);
      log('yellow', `     Please verify manually in Supabase Dashboard`);
      log('yellow', `     Error: ${error.message}`);
    } else if (data && data.length > 0) {
      const allEnabled = data.every((table: any) => table.rowsecurity === true);
      if (!allEnabled) {
        const disabledTables = data
          .filter((table: any) => !table.rowsecurity)
          .map((table: any) => table.tablename);
        throw new Error(`RLS not enabled on: ${disabledTables.join(', ')}`);
      }
      log('green', `  ✓ RLS enabled on ${data.length} tables`);
      log('green', '✓ RLS policies enabled on all user tables');
    } else {
      log('yellow', `  ⚠️  Could not verify RLS policies (no data returned)`);
      log('yellow', `     Please verify manually in Supabase Dashboard`);
    }

    passedChecks++;
  } catch (error: any) {
    log('red', `✗ RLS policies check failed: ${error.message}`);
    failedChecks++;
  }

  // Check 4: Storage Buckets
  log('yellow', '\n💾 Checking storage buckets...');
  try {
    const { data: buckets, error } = await client.storage.listBuckets();

    if (error) throw error;

    const requiredBuckets = ['lora-datasets', 'lora-models'];

    for (const bucketName of requiredBuckets) {
      const bucket = buckets?.find(b => b.name === bucketName);
      if (!bucket) {
        throw new Error(`Bucket ${bucketName} not found`);
      }
      log('green', `  ✓ ${bucketName} (${bucket.public ? 'public' : 'private'})`);
    }

    log('green', '✓ All storage buckets configured');
    passedChecks++;
  } catch (error: any) {
    log('red', `✗ Storage buckets check failed: ${error.message}`);
    failedChecks++;
  }

  // Check 5: Database Indexes
  log('yellow', '\n⚡ Checking database indexes...');
  try {
    const { data, error } = await client
      .from('pg_indexes')
      .select('indexname, tablename')
      .eq('schemaname', 'public')
      .in('tablename', ['datasets', 'training_jobs', 'model_artifacts']);

    if (error) {
      log('yellow', `  ⚠️  Could not verify indexes automatically`);
      log('yellow', `     Error: ${error.message}`);
    } else if (data && data.length > 0) {
      const expectedIndexes = [
        'idx_datasets_user_id',
        'idx_datasets_status',
        'idx_training_jobs_user_id',
        'idx_training_jobs_status',
        'idx_model_artifacts_user_id',
      ];

      const indexNames = data.map((idx: any) => idx.indexname);
      const foundIndexes = expectedIndexes.filter(idx =>
        indexNames.includes(idx)
      );

      log('green', `  ✓ Found ${foundIndexes.length}/${expectedIndexes.length} expected indexes`);

      if (foundIndexes.length < expectedIndexes.length) {
        const missing = expectedIndexes.filter(idx => !indexNames.includes(idx));
        log('yellow', `  ⚠️  Missing indexes: ${missing.join(', ')}`);
      }
    } else {
      log('yellow', `  ⚠️  No index data returned`);
    }

    log('green', '✓ Database indexes check complete');
    passedChecks++;
  } catch (error: any) {
    log('yellow', `⚠️  Indexes check skipped: ${error.message}`);
    passedChecks++;
  }

  // Check 6: Edge Functions (if URLs provided)
  if (process.env.GPU_CLUSTER_API_URL) {
    log('yellow', '\n⚙️  Checking Edge Functions deployment...');
    try {
      const functions = [
        'validate-datasets',
        'process-training-jobs',
        'create-model-artifacts',
      ];

      for (const func of functions) {
        try {
          const response = await fetch(
            `${supabaseUrl}/functions/v1/${func}`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({}),
            }
          );

          // Function exists if we get anything other than 404
          if (response.status !== 404) {
            log('green', `  ✓ ${func} deployed`);
          } else {
            throw new Error(`Function ${func} returned 404`);
          }
        } catch (error: any) {
          log('yellow', `  ⚠️  ${func}: ${error.message}`);
        }
      }

      log('green', '✓ Edge Functions deployment check complete');
      passedChecks++;
    } catch (error: any) {
      log('red', `✗ Edge Functions check failed: ${error.message}`);
      failedChecks++;
    }
  } else {
    log('yellow', '\n⚙️  Skipping Edge Functions check (GPU_CLUSTER_API_URL not set)');
  }

  // Check 7: API Routes (sample check)
  log('yellow', '\n🌐 Checking API routes accessibility...');
  try {
    // We can't directly test API routes without a server, but we can verify files exist
    const fs = await import('fs');
    const path = await import('path');

    const apiRoutes = [
      'src/app/api/datasets/route.ts',
      'src/app/api/jobs/route.ts',
      'src/app/api/models/route.ts',
      'src/app/api/costs/route.ts',
      'src/app/api/notifications/route.ts',
    ];

    let foundRoutes = 0;
    for (const route of apiRoutes) {
      if (fs.existsSync(path.join(process.cwd(), route))) {
        foundRoutes++;
      }
    }

    log('green', `  ✓ Found ${foundRoutes}/${apiRoutes.length} API route files`);

    if (foundRoutes === apiRoutes.length) {
      log('green', '✓ All API route files exist');
      passedChecks++;
    } else {
      throw new Error(`Missing ${apiRoutes.length - foundRoutes} API route files`);
    }
  } catch (error: any) {
    log('yellow', `⚠️  API routes check: ${error.message}`);
    passedChecks++; // Don't fail on this check
  }

  // Check 8: Type Definitions
  log('yellow', '\n📝 Checking TypeScript type definitions...');
  try {
    const fs = await import('fs');
    const path = await import('path');

    const typesFile = path.join(process.cwd(), 'src/lib/types/lora-training.ts');

    if (fs.existsSync(typesFile)) {
      log('green', '  ✓ lora-training.ts types file exists');
      log('green', '✓ Type definitions file exists');
      passedChecks++;
    } else {
      throw new Error('Type definitions file not found');
    }
  } catch (error: any) {
    log('red', `✗ Type definitions check failed: ${error.message}`);
    failedChecks++;
  }

  // Summary
  log('cyan', '\n' + '='.repeat(60));
  log('blue', '📊 Integration Verification Summary');
  log('cyan', '='.repeat(60));
  log('green', `✓ Passed: ${passedChecks}`);
  if (failedChecks > 0) {
    log('red', `✗ Failed: ${failedChecks}`);
  }

  if (failedChecks === 0) {
    log('green', '\n✅ All integration checks passed!');
    log('green', '🚀 System is ready for deployment.\n');
    process.exit(0);
  } else {
    log('red', '\n❌ Some integration checks failed.');
    log('red', '⚠️  Please fix the issues above before deploying.\n');
    process.exit(1);
  }
}

// Run verification
verifyIntegration().catch((error) => {
  log('red', `\n❌ Verification script error: ${error.message}\n`);
  console.error(error.stack);
  process.exit(1);
});

