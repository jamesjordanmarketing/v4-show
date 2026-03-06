// scripts/test-adapter-integration.js
require('dotenv').config({ path: '.env.local' });
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const tests = [
  {
    name: 'Environment Variables',
    test: () => {
      const required = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'RUNPOD_API_KEY',
      ];
      return required.every(key => !!process.env[key]);
    }
  },
  {
    name: 'TypeScript Compilation',
    test: () => {
      try {
        execSync('npx tsc --noEmit', { 
          stdio: 'pipe',
          cwd: path.join(__dirname, '../src')
        });
        return true;
      } catch {
        return false;
      }
    }
  },
  {
    name: 'Database Types Exist',
    test: () => {
      return fs.existsSync(path.join(__dirname, '../src/types/pipeline-adapter.ts'));
    }
  },
  {
    name: 'Service Layer Exists',
    test: () => {
      return fs.existsSync(path.join(__dirname, '../src/lib/services/inference-service.ts')) &&
             fs.existsSync(path.join(__dirname, '../src/lib/services/test-service.ts'));
    }
  },
  {
    name: 'API Routes Exist',
    test: () => {
      const routes = [
        'src/app/api/pipeline/adapters/deploy/route.ts',
        'src/app/api/pipeline/adapters/test/route.ts',
        'src/app/api/pipeline/adapters/status/route.ts',
        'src/app/api/pipeline/adapters/rate/route.ts',
      ];
      return routes.every(r => fs.existsSync(path.join(__dirname, '..', r)));
    }
  },
  {
    name: 'React Query Hooks Exist',
    test: () => {
      return fs.existsSync(path.join(__dirname, '../src/hooks/useAdapterTesting.ts'));
    }
  },
  {
    name: 'UI Components Exist',
    test: () => {
      const components = [
        'src/components/pipeline/DeployAdapterButton.tsx',
        'src/components/pipeline/EndpointStatusBanner.tsx',
        'src/components/pipeline/ABTestingPanel.tsx',
        'src/components/pipeline/TestResultComparison.tsx',
        'src/components/pipeline/TestHistoryTable.tsx',
      ];
      return components.every(c => fs.existsSync(path.join(__dirname, '..', c)));
    }
  },
  {
    name: 'Test Page Exists',
    test: () => {
      return fs.existsSync(path.join(__dirname, '../src/app/(dashboard)/pipeline/jobs/[jobId]/test/page.tsx'));
    }
  },
  {
    name: 'Components Exported',
    test: () => {
      const indexContent = fs.readFileSync(path.join(__dirname, '../src/components/pipeline/index.ts'), 'utf8');
      return indexContent.includes('DeployAdapterButton') &&
             indexContent.includes('ABTestingPanel') &&
             indexContent.includes('TestResultComparison');
    }
  },
  {
    name: 'Hooks Exported',
    test: () => {
      const indexContent = fs.readFileSync(path.join(__dirname, '../src/hooks/index.ts'), 'utf8');
      return indexContent.includes('useAdapterTesting') &&
             indexContent.includes('useAdapterDeployment') &&
             indexContent.includes('useAdapterWorkflow');
    }
  },
  {
    name: 'Documentation Complete',
    test: () => {
      return fs.existsSync(path.join(__dirname, '../docs/ADAPTER_E05B_COMPLETE.md')) &&
             fs.existsSync(path.join(__dirname, '../docs/ADAPTER_MODULE_COMPLETE.md'));
    }
  },
];

(async () => {
  console.log('Adapter Application Module - Integration Tests');
  console.log('==============================================\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const { name, test } of tests) {
    process.stdout.write(`Testing: ${name}... `);
    try {
      const result = await test();
      if (result) {
        console.log('✓ PASS');
        passed++;
      } else {
        console.log('✗ FAIL');
        failed++;
      }
    } catch (error) {
      console.log(`✗ ERROR: ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n==============================================');
  console.log(`Results: ${passed}/${tests.length} passed`);
  
  if (failed === 0) {
    console.log('✓ All integration tests passed!');
    process.exit(0);
  } else {
    console.log(`✗ ${failed} test(s) failed`);
    process.exit(1);
  }
})();
