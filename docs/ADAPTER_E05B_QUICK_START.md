# Adapter Application Module - E05B Quick Start Guide

**Version:** 1.0  
**Date:** January 17, 2026  
**Audience:** Developers using the adapter testing UI components  

---

## Overview

This guide shows you how to use the adapter testing components in your application. All components are production-ready and fully integrated with the E04B React Query hooks.

---

## Quick Component Reference

### 1. DeployAdapterButton

**Purpose:** Button to deploy adapter endpoints  
**Location:** Results page header  

```typescript
import { DeployAdapterButton } from '@/components/pipeline';

<DeployAdapterButton 
  jobId={job.id} 
  disabled={!job.adapterFilePath} 
/>
```

**Behavior:**
- Shows "Deploy & Test Adapter" initially
- Shows "Deploying Endpoints..." with spinner during deployment
- Shows "Test Adapter" when ready → navigates to test page
- Shows "Retry Deployment" on failure

---

### 2. EndpointStatusBanner

**Purpose:** Visual deployment status display  
**Location:** Top of test page  

```typescript
import { EndpointStatusBanner } from '@/components/pipeline';
import { useAdapterWorkflow } from '@/hooks';

const workflow = useAdapterWorkflow(jobId);

<EndpointStatusBanner
  controlEndpoint={workflow.controlEndpoint}
  adaptedEndpoint={workflow.adaptedEndpoint}
  bothReady={workflow.bothReady}
/>
```

**States:**
- **Deploying**: Yellow/orange with progress bar
- **Ready**: Green with success message
- **Failed**: Red with error details

---

### 3. ABTestingPanel

**Purpose:** Main testing interface  
**Location:** Test page "Run Test" tab  

```typescript
import { ABTestingPanel } from '@/components/pipeline';

<ABTestingPanel 
  jobId={jobId} 
  endpointsReady={workflow.bothReady} 
/>
```

**Features:**
- System prompt editor
- User prompt input
- Example prompt buttons
- Claude evaluation toggle
- Auto-displays latest result
- Disabled state when endpoints not ready

---

### 4. TestResultComparison

**Purpose:** Side-by-side response comparison  
**Location:** Below ABTestingPanel (auto-displayed), or in history detail view  

```typescript
import { TestResultComparison } from '@/components/pipeline';
import { type TestResult } from '@/hooks';

<TestResultComparison 
  result={testResult} 
  jobId={jobId} 
/>
```

**Displays:**
- Claude-as-Judge verdict (if enabled)
- Control vs Adapted responses
- Generation time and token usage
- Evaluation scores
- Rating interface

---

### 5. TestHistoryTable

**Purpose:** Paginated test history  
**Location:** Test page "History" tab  

```typescript
import { TestHistoryTable } from '@/components/pipeline';
import { type TestResult } from '@/hooks';

const [selectedTest, setSelectedTest] = useState<TestResult | null>(null);

<TestHistoryTable 
  jobId={jobId} 
  onSelectTest={setSelectedTest} 
/>

{selectedTest && (
  <TestResultComparison result={selectedTest} jobId={jobId} />
)}
```

**Features:**
- Pagination (20 per page)
- Sortable columns
- Click to view details
- AI verdict badges
- User rating icons

---

## Complete Page Example

Here's how to build a complete test page:

```typescript
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAdapterWorkflow, type TestResult } from '@/hooks';
import {
  ABTestingPanel,
  EndpointStatusBanner,
  TestHistoryTable,
  TestResultComparison,
} from '@/components/pipeline';

export default function AdapterTestPage() {
  const params = useParams();
  const jobId = params.jobId as string;
  
  const workflow = useAdapterWorkflow(jobId);
  const [selectedTest, setSelectedTest] = useState<TestResult | null>(null);

  return (
    <div className="container py-8">
      {/* Status Banner */}
      <EndpointStatusBanner
        controlEndpoint={workflow.controlEndpoint}
        adaptedEndpoint={workflow.adaptedEndpoint}
        bothReady={workflow.bothReady}
      />

      {/* Tabs */}
      <Tabs defaultValue="test">
        <TabsList>
          <TabsTrigger value="test">Run Test</TabsTrigger>
          <TabsTrigger value="history">
            History
            {workflow.historyCount > 0 && (
              <Badge className="ml-2">{workflow.historyCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Run Test Tab */}
        <TabsContent value="test">
          <ABTestingPanel 
            jobId={jobId} 
            endpointsReady={workflow.bothReady} 
          />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <TestHistoryTable 
            jobId={jobId} 
            onSelectTest={setSelectedTest} 
          />
          
          {selectedTest && (
            <TestResultComparison 
              result={selectedTest} 
              jobId={jobId} 
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## Hook Usage Patterns

### Pattern 1: Simple Deployment

For just showing deployment status:

```typescript
import { useAdapterDeployment } from '@/hooks';

const { deploy, isDeploying, bothReady } = useAdapterDeployment(jobId);

<Button onClick={deploy} disabled={isDeploying || bothReady}>
  {isDeploying ? 'Deploying...' : 'Deploy'}
</Button>
```

### Pattern 2: Testing Only

For just running tests (endpoints already deployed):

```typescript
import { useAdapterTesting } from '@/hooks';

const { runTest, isRunning, latestResult } = useAdapterTesting(jobId);

<Button onClick={() => runTest({ jobId, userPrompt: '...' })}>
  Run Test
</Button>

{latestResult && <div>{latestResult.controlResponse}</div>}
```

### Pattern 3: Complete Workflow

For full deployment + testing + history:

```typescript
import { useAdapterWorkflow } from '@/hooks';

const workflow = useAdapterWorkflow(jobId);

// Access everything:
workflow.controlEndpoint     // Endpoint info
workflow.adaptedEndpoint     // Endpoint info
workflow.bothReady           // Boolean status
workflow.deploy()            // Deploy function
workflow.runTest()           // Test function
workflow.rateTest()          // Rating function
workflow.history             // All test history
workflow.historyCount        // Total count
```

---

## Common Use Cases

### Use Case 1: Results Page Integration

Add deploy button to existing results page:

```typescript
// Import
import { DeployAdapterButton } from '@/components/pipeline';

// In JSX (header actions section)
{job.adapterFilePath && (
  <div className="flex gap-2">
    <Button asChild variant="outline">
      <a href={`/api/pipeline/jobs/${job.id}/download`} download>
        <Download className="h-4 w-4 mr-2" />
        Download
      </a>
    </Button>
    <DeployAdapterButton jobId={job.id} />
  </div>
)}
```

### Use Case 2: Standalone Testing Page

Create a new test page:

```typescript
// File: src/app/(dashboard)/pipeline/jobs/[jobId]/test/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { useAdapterWorkflow } from '@/hooks';
import { ABTestingPanel, EndpointStatusBanner } from '@/components/pipeline';

export default function TestPage() {
  const params = useParams();
  const jobId = params.jobId as string;
  const workflow = useAdapterWorkflow(jobId);

  return (
    <div className="container py-8">
      <EndpointStatusBanner {...workflow} />
      <ABTestingPanel jobId={jobId} endpointsReady={workflow.bothReady} />
    </div>
  );
}
```

### Use Case 3: Embedded Testing Widget

Embed testing in another page:

```typescript
import { useState } from 'react';
import { useAdapterTesting } from '@/hooks';
import { TestResultComparison } from '@/components/pipeline';

function EmbeddedTester({ jobId }: { jobId: string }) {
  const [prompt, setPrompt] = useState('');
  const { runTest, isRunning, latestResult } = useAdapterTesting(jobId);

  return (
    <div>
      <textarea 
        value={prompt} 
        onChange={(e) => setPrompt(e.target.value)} 
      />
      <button 
        onClick={() => runTest({ jobId, userPrompt: prompt })}
        disabled={isRunning}
      >
        Test
      </button>
      
      {latestResult && (
        <TestResultComparison result={latestResult} jobId={jobId} />
      )}
    </div>
  );
}
```

---

## Styling Customization

All components use Tailwind CSS and shadcn/ui. You can customize:

### Theme Colors

```typescript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {...},      // Affects badges, buttons
        secondary: {...},    // Affects secondary elements
        destructive: {...},  // Affects error states
      }
    }
  }
}
```

### Component Overrides

```typescript
// Custom wrapper with modified styles
function CustomTestPanel({ jobId }: { jobId: string }) {
  return (
    <div className="custom-container bg-gray-50 p-4 rounded-lg">
      <ABTestingPanel jobId={jobId} endpointsReady={true} />
    </div>
  );
}
```

---

## Error Handling

All components handle errors gracefully:

### Deployment Errors

```typescript
const { deployError, hasAnyFailed } = useAdapterDeployment(jobId);

if (deployError) {
  // Show custom error UI
  return <div>Deployment failed: {deployError.message}</div>;
}
```

### Test Execution Errors

```typescript
const { runError } = useAdapterTesting(jobId);

if (runError) {
  // Show custom error UI
  return <Alert variant="destructive">{runError.message}</Alert>;
}
```

### Network Errors

React Query automatically handles:
- Retries (3 attempts)
- Exponential backoff
- Cache invalidation
- Error boundaries

---

## Performance Tips

### Tip 1: Pagination

Always paginate history for large datasets:

```typescript
const { history } = useAdapterTesting(jobId, {
  limit: 20,
  offset: page * 20,
});
```

### Tip 2: Conditional Polling

Stop polling when not needed:

```typescript
const { data } = useEndpointStatus(jobId, {
  // Only poll if not ready
  refetchInterval: (data) => {
    return data?.data?.bothReady ? false : 5000;
  },
});
```

### Tip 3: Optimistic Updates

Use optimistic updates for better UX:

```typescript
const { rateTest } = useAdapterTesting(jobId);

// Rating updates immediately, then syncs
await rateTest({ testId, rating: 'adapted' });
```

---

## Testing Components

### Unit Testing

```typescript
import { render, screen } from '@testing-library/react';
import { DeployAdapterButton } from '@/components/pipeline';

test('shows deploy button', () => {
  render(<DeployAdapterButton jobId="test-123" />);
  expect(screen.getByText('Deploy & Test Adapter')).toBeInTheDocument();
});
```

### Integration Testing

```typescript
import { renderHook } from '@testing-library/react-hooks';
import { useAdapterDeployment } from '@/hooks';

test('deployment hook works', async () => {
  const { result } = renderHook(() => useAdapterDeployment('test-123'));
  
  await result.current.deploy();
  
  expect(result.current.isDeploying).toBe(true);
});
```

---

## Troubleshooting

### Issue: Components Not Rendering

**Check:**
1. Imports are correct: `from '@/components/pipeline'`
2. JobId is valid string
3. Parent has proper React Query provider

### Issue: Hooks Not Working

**Check:**
1. `QueryClientProvider` in app root
2. Hooks imported from `@/hooks`
3. API routes are accessible

### Issue: Types Not Found

**Check:**
1. TypeScript version ≥ 4.5
2. Types exported from `@/hooks`
3. Run `npx tsc --noEmit` to verify

### Issue: Styling Looks Wrong

**Check:**
1. Tailwind CSS is configured
2. shadcn/ui components installed
3. Dark mode provider (if using dark mode)

---

## API Reference

### DeployAdapterButton Props

```typescript
interface DeployAdapterButtonProps {
  jobId: string;
  disabled?: boolean;
}
```

### EndpointStatusBanner Props

```typescript
interface EndpointStatusBannerProps {
  controlEndpoint: InferenceEndpoint | null;
  adaptedEndpoint: InferenceEndpoint | null;
  bothReady: boolean;
}
```

### ABTestingPanel Props

```typescript
interface ABTestingPanelProps {
  jobId: string;
  endpointsReady: boolean;
}
```

### TestResultComparison Props

```typescript
interface TestResultComparisonProps {
  result: TestResult;
  jobId: string;
}
```

### TestHistoryTable Props

```typescript
interface TestHistoryTableProps {
  jobId: string;
  onSelectTest?: (test: TestResult) => void;
}
```

---

## Further Reading

- **E04B Hooks Guide**: `docs/ADAPTER_E04_QUICK_START.md`
- **Complete Implementation**: `docs/ADAPTER_E05B_COMPLETE.md`
- **API Routes**: `docs/ADAPTER_E03_COMPLETE.md`
- **Database Schema**: `docs/ADAPTER_E01_COMPLETE.md`

---

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the complete documentation
3. Check TypeScript/linter errors
4. Test with React Query DevTools

---

**Document Version:** 1.0  
**Last Updated:** January 17, 2026
