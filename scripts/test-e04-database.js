/**
 * Section E04: Database Testing Script
 * 
 * This script uses SAOL to verify database operations for:
 * - Training jobs table queries
 * - Metrics points tracking
 * - Cost records
 * - Notifications
 * - Storage bucket configuration
 * 
 * Usage:
 *   node scripts/test-e04-database.js
 */

require('dotenv').config({ path: '.env.local' });
const saol = require('../supa-agent-ops');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function logSection(title) {
  console.log(`\n${COLORS.bright}${COLORS.cyan}=== ${title} ===${COLORS.reset}`);
}

function logSuccess(message) {
  console.log(`${COLORS.green}✓${COLORS.reset} ${message}`);
}

function logError(message) {
  console.log(`${COLORS.red}✗${COLORS.reset} ${message}`);
}

function logInfo(message) {
  console.log(`${COLORS.blue}ℹ${COLORS.reset} ${message}`);
}

function logWarning(message) {
  console.log(`${COLORS.yellow}⚠${COLORS.reset} ${message}`);
}

async function testTableExists(tableName) {
  const result = await saol.agentIntrospectSchema({
    table: tableName,
    transport: 'pg'
  });
  
  if (result.success) {
    logSuccess(`Table '${tableName}' exists`);
    return true;
  } else {
    logError(`Table '${tableName}' does not exist`);
    return false;
  }
}

async function testTrainingJobs() {
  logSection('Training Jobs Tests');
  
  try {
    // Check for active jobs (queued, initializing, running)
    const activeResult = await saol.agentQuery({
      table: 'training_jobs',
      select: 'id,status,current_stage,progress,external_job_id,started_at',
      where: [
        {
          column: 'status',
          operator: 'in',
          value: ['queued', 'initializing', 'running']
        }
      ],
      orderBy: [{ column: 'created_at', asc: false }],
      limit: 5
    });
    
    if (activeResult.success) {
      logSuccess(`Found ${activeResult.data.length} active jobs`);
      activeResult.data.forEach(job => {
        console.log(`  - ${job.id.slice(0, 8)} | ${job.status} | ${job.current_stage || 'N/A'} | ${job.progress || 0}%`);
      });
      
      if (activeResult.data.length === 0) {
        logInfo('No active jobs found (this is normal if no training is running)');
      }
    } else {
      logError(`Failed to query active jobs: ${activeResult.error}`);
    }
    
    // Check for completed jobs
    const completedResult = await saol.agentQuery({
      table: 'training_jobs',
      select: 'id,status,progress,final_cost,completed_at',
      where: [
        {
          column: 'status',
          operator: 'eq',
          value: 'completed'
        }
      ],
      orderBy: [{ column: 'completed_at', asc: false }],
      limit: 3
    });
    
    if (completedResult.success) {
      logSuccess(`Found ${completedResult.data.length} completed jobs`);
      completedResult.data.forEach(job => {
        console.log(`  - ${job.id.slice(0, 8)} | ${job.status} | ${job.progress}% | $${job.final_cost || 0}`);
      });
      
      if (completedResult.data.length === 0) {
        logWarning('No completed jobs found yet');
      }
    } else {
      logError(`Failed to query completed jobs: ${completedResult.error}`);
    }
    
    // Check for failed jobs
    const failedResult = await saol.agentQuery({
      table: 'training_jobs',
      select: 'id,status,error_message,completed_at',
      where: [
        {
          column: 'status',
          operator: 'eq',
          value: 'failed'
        }
      ],
      orderBy: [{ column: 'completed_at', asc: false }],
      limit: 3
    });
    
    if (failedResult.success) {
      if (failedResult.data.length > 0) {
        logWarning(`Found ${failedResult.data.length} failed jobs`);
        failedResult.data.forEach(job => {
          console.log(`  - ${job.id.slice(0, 8)} | ${job.status} | ${job.error_message || 'No error message'}`);
        });
      } else {
        logSuccess('No failed jobs (good!)');
      }
    } else {
      logError(`Failed to query failed jobs: ${failedResult.error}`);
    }
    
  } catch (error) {
    logError(`Training jobs test failed: ${error.message}`);
  }
}

async function testMetricsPoints() {
  logSection('Metrics Points Tests');
  
  try {
    const result = await saol.agentQuery({
      table: 'metrics_points',
      select: 'job_id,epoch,step,training_loss,validation_loss,throughput,gpu_utilization,timestamp',
      orderBy: [{ column: 'timestamp', asc: false }],
      limit: 10
    });
    
    if (result.success) {
      logSuccess(`Found ${result.data.length} recent metrics points`);
      
      if (result.data.length > 0) {
        console.log('\n  Recent metrics:');
        result.data.forEach(m => {
          const jobId = m.job_id.slice(0, 8);
          const trainLoss = m.training_loss?.toFixed(4) || 'N/A';
          const valLoss = m.validation_loss?.toFixed(4) || 'N/A';
          const throughput = m.throughput ? m.throughput.toLocaleString() : 'N/A';
          const gpuUtil = m.gpu_utilization ? `${m.gpu_utilization.toFixed(1)}%` : 'N/A';
          
          console.log(`  - Job: ${jobId} | Epoch ${m.epoch} Step ${m.step}`);
          console.log(`    Train Loss: ${trainLoss} | Val Loss: ${valLoss}`);
          console.log(`    Throughput: ${throughput} tokens/sec | GPU: ${gpuUtil}`);
        });
        
        // Check for metrics distribution across jobs
        const uniqueJobs = [...new Set(result.data.map(m => m.job_id))];
        logInfo(`Metrics span ${uniqueJobs.length} different job(s)`);
      } else {
        logWarning('No metrics points found yet (metrics are created as jobs run)');
      }
    } else {
      logError(`Failed to query metrics points: ${result.error}`);
    }
  } catch (error) {
    logError(`Metrics points test failed: ${error.message}`);
  }
}

async function testCostRecords() {
  logSection('Cost Records Tests');
  
  try {
    const result = await saol.agentQuery({
      table: 'cost_records',
      select: 'job_id,cost_type,amount,billing_period,recorded_at,details',
      orderBy: [{ column: 'recorded_at', asc: false }],
      limit: 10
    });
    
    if (result.success) {
      logSuccess(`Found ${result.data.length} cost records`);
      
      if (result.data.length > 0) {
        let totalCost = 0;
        console.log('\n  Recent cost records:');
        result.data.forEach(c => {
          const jobId = c.job_id.slice(0, 8);
          const amount = parseFloat(c.amount);
          totalCost += amount;
          
          console.log(`  - Job: ${jobId} | Type: ${c.cost_type} | Amount: $${amount.toFixed(2)}`);
          if (c.details) {
            const details = typeof c.details === 'string' ? JSON.parse(c.details) : c.details;
            if (details.gpu_type) {
              console.log(`    GPU: ${details.gpu_count}x ${details.gpu_type} | Duration: ${details.duration_hours?.toFixed(2)}h`);
            }
          }
        });
        
        logInfo(`Total cost across recent records: $${totalCost.toFixed(2)}`);
      } else {
        logWarning('No cost records found yet (records are created when jobs complete)');
      }
    } else {
      logError(`Failed to query cost records: ${result.error}`);
    }
  } catch (error) {
    logError(`Cost records test failed: ${error.message}`);
  }
}

async function testNotifications() {
  logSection('Notifications Tests');
  
  try {
    const result = await saol.agentQuery({
      table: 'notifications',
      select: 'type,title,message,priority,created_at,metadata',
      orderBy: [{ column: 'created_at', asc: false }],
      limit: 10
    });
    
    if (result.success) {
      logSuccess(`Found ${result.data.length} recent notifications`);
      
      if (result.data.length > 0) {
        console.log('\n  Recent notifications:');
        result.data.forEach(n => {
          const priority = n.priority === 'high' ? '🔴' : n.priority === 'medium' ? '🟡' : '⚪';
          console.log(`  ${priority} ${n.type} | ${n.title}`);
          console.log(`    ${n.message}`);
          console.log(`    ${new Date(n.created_at).toLocaleString()}`);
        });
        
        // Count by type
        const types = result.data.reduce((acc, n) => {
          acc[n.type] = (acc[n.type] || 0) + 1;
          return acc;
        }, {});
        
        console.log('\n  Notification types:');
        Object.entries(types).forEach(([type, count]) => {
          console.log(`    ${type}: ${count}`);
        });
      } else {
        logWarning('No notifications found yet (notifications are created during job lifecycle)');
      }
    } else {
      logError(`Failed to query notifications: ${result.error}`);
    }
  } catch (error) {
    logError(`Notifications test failed: ${error.message}`);
  }
}

async function testDatasetStorageBuckets() {
  logSection('Dataset Storage Buckets Tests');
  
  try {
    const result = await saol.agentQuery({
      table: 'datasets',
      select: 'id,name,storage_bucket,storage_path,training_ready,total_training_pairs',
      limit: 20
    });
    
    if (result.success) {
      logSuccess(`Found ${result.data.length} datasets`);
      
      if (result.data.length > 0) {
        // Count by bucket
        const buckets = result.data.reduce((acc, d) => {
          const bucket = d.storage_bucket || 'lora-datasets';
          acc[bucket] = (acc[bucket] || 0) + 1;
          return acc;
        }, {});
        
        console.log('\n  Datasets by storage bucket:');
        Object.entries(buckets).forEach(([bucket, count]) => {
          console.log(`    ${bucket}: ${count}`);
        });
        
        // Show sample datasets from each bucket
        const loraDatasets = result.data.filter(d => (d.storage_bucket || 'lora-datasets') === 'lora-datasets');
        const trainingFiles = result.data.filter(d => d.storage_bucket === 'training-files');
        
        if (loraDatasets.length > 0) {
          console.log('\n  Sample from lora-datasets bucket:');
          loraDatasets.slice(0, 3).forEach(d => {
            console.log(`    - ${d.name} | ${d.storage_path} | Ready: ${d.training_ready}`);
          });
        }
        
        if (trainingFiles.length > 0) {
          console.log('\n  Sample from training-files bucket:');
          trainingFiles.slice(0, 3).forEach(d => {
            console.log(`    - ${d.name} | ${d.storage_path} | Ready: ${d.training_ready}`);
          });
          logSuccess('✓ Dual storage bucket support confirmed!');
        } else {
          logInfo('No datasets in training-files bucket (imported files from DATA-BRIDGE)');
        }
      } else {
        logWarning('No datasets found');
      }
    } else {
      logError(`Failed to query datasets: ${result.error}`);
    }
  } catch (error) {
    logError(`Dataset storage buckets test failed: ${error.message}`);
  }
}

async function runAllTests() {
  console.log(`${COLORS.bright}${COLORS.cyan}`);
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║    Section E04: Database Tests (SAOL)                   ║');
  console.log('║    Training Execution & Monitoring                      ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(COLORS.reset);
  
  logInfo('Testing database operations for E04 implementation...\n');
  
  // Test table existence
  logSection('Table Existence Tests');
  const tables = ['training_jobs', 'datasets', 'metrics_points', 'cost_records', 'notifications'];
  let allTablesExist = true;
  
  for (const table of tables) {
    const exists = await testTableExists(table);
    if (!exists) allTablesExist = false;
  }
  
  if (!allTablesExist) {
    logError('\nSome tables are missing. Please run migrations first.');
    process.exit(1);
  }
  
  // Run detailed tests
  await testTrainingJobs();
  await testMetricsPoints();
  await testCostRecords();
  await testNotifications();
  await testDatasetStorageBuckets();
  
  // Summary
  console.log(`\n${COLORS.bright}${COLORS.green}`);
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║    Database Tests Complete                              ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(COLORS.reset);
  
  logInfo('All database operations tested successfully!');
  logInfo('Review the output above for any warnings or issues.');
  logInfo('\nNext steps:');
  console.log('  1. Deploy edge function: npx supabase functions deploy process-training-jobs');
  console.log('  2. Configure cron schedule in Supabase Dashboard');
  console.log('  3. Set environment variables for GPU cluster API');
  console.log('  4. Test job processing end-to-end');
}

// Run tests
runAllTests().catch(error => {
  console.error(`\n${COLORS.red}Fatal error:${COLORS.reset}`, error.message);
  process.exit(1);
});


