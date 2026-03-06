# Adapter Application Module - Section E03: API Routes

**Version:** 1.0  
**Date:** January 17, 2026  
**Section:** E03 - API Layer  
**Prerequisites:** E01 (Database), E02 (Services) must be complete  
**Builds Upon:** E01 and E02 foundation  

---

## Overview

This prompt implements the API routes for adapter testing infrastructure. This section creates four API endpoints that expose the service layer functionality to the frontend.

**What This Section Creates:**
1. Deploy endpoint route - Deploy Control and Adapted inference endpoints
2. Test endpoint route - Run A/B tests with optional evaluation
3. Endpoints status route - Check deployment status
4. Rate test route - Submit user ratings for test results

**What This Section Does NOT Create:**
- UI components (E05)
- React Query hooks (E04)
- Service layer logic (E02 - already done)

---

## Critical Instructions

### API Route Patterns

Follow Next.js 13+ App Router patterns:
- Use `createClient` from `@/lib/supabase-server` for auth
- Return `NextResponse.json()` for all responses
- Handle errors with proper status codes
- Validate user authentication on all routes

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://hqhtbxlgzysfbekexwku.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<configured in .env.local>
```

### Codebase Integration

**Target Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src`

**Follow existing patterns from:**
- `src/app/api/pipeline/jobs/[jobId]/route.ts` - Existing job API patterns
- `src/app/api/pipeline/evaluate/route.ts` - Existing evaluation API patterns

---

## Reference Documents

- Full Spec: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\adapter-build-implementation-spec_v1.md`

---

========================

# EXECUTION PROMPT E03 - API ROUTES

## Context

You are implementing the API layer for the Adapter Application Module. This layer exposes the service functions to the frontend through RESTful API endpoints.

**API Architecture:**
- All routes require authentication
- Services handle business logic (already implemented in E02)
- Routes validate input, call services, return responses
- Error handling with appropriate HTTP status codes

---

## Task 1: Deploy Adapter Endpoint

This endpoint deploys Control and Adapted inference endpoints for testing.

### File: `src/app/api/pipeline/jobs/[jobId]/deploy/route.ts`

```typescript
/**
 * Deploy Adapter Endpoints API
 *
 * POST - Deploy Control and Adapted inference endpoints for testing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { deployAdapterEndpoints } from '@/lib/services/inference-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await deployAdapterEndpoints(user.id, params.jobId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/pipeline/jobs/[jobId]/deploy error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## Task 2: Test Endpoint

This endpoint runs A/B tests and retrieves test history.

### File: `src/app/api/pipeline/jobs/[jobId]/test/route.ts`

```typescript
/**
 * A/B Test API
 *
 * POST - Run an A/B test with optional evaluation
 * GET - Get test history for a job
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { runABTest, getTestHistory } from '@/lib/services/test-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    if (!body.userPrompt || typeof body.userPrompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'userPrompt is required' },
        { status: 400 }
      );
    }

    const result = await runABTest(user.id, {
      jobId: params.jobId,
      userPrompt: body.userPrompt,
      systemPrompt: body.systemPrompt,
      enableEvaluation: body.enableEvaluation ?? false,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/pipeline/jobs/[jobId]/test error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await getTestHistory(params.jobId, { limit, offset });

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/pipeline/jobs/[jobId]/test error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## Task 3: Endpoint Status Route

This endpoint checks the status of inference endpoints.

### File: `src/app/api/pipeline/jobs/[jobId]/endpoints/route.ts`

```typescript
/**
 * Endpoint Status API
 *
 * GET - Get status of inference endpoints for a job
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getEndpointStatus } from '@/lib/services/inference-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await getEndpointStatus(params.jobId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/pipeline/jobs/[jobId]/endpoints error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## Task 4: Rate Test Route

This endpoint allows users to rate test results.

### File: `src/app/api/pipeline/test/[testId]/rate/route.ts`

```typescript
/**
 * Rate Test Result API
 *
 * POST - Submit user rating for a test result
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { rateTestResult } from '@/lib/services/test-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { testId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { rating, notes } = await request.json();

    if (!rating || !['control', 'adapted', 'tie', 'neither'].includes(rating)) {
      return NextResponse.json(
        { success: false, error: 'Valid rating required' },
        { status: 400 }
      );
    }

    const result = await rateTestResult(params.testId, user.id, rating, notes);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/pipeline/test/[testId]/rate error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## Task 5: Verification & Testing

After creating all files, verify the API implementation:

### 1. Verify File Structure

```bash
# Check all API routes exist
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && find src/app/api/pipeline -name "*.ts" -path "*deploy*" -o -path "*test*" -o -path "*endpoints*"
```

### 2. Verify TypeScript Compilation

```bash
# Verify TypeScript compiles
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && npx tsc --noEmit --project tsconfig.json
```

### 3. Test API Routes (Manual)

Test each route with curl or Postman (requires authentication):

```bash
# Deploy endpoint (requires auth token)
curl -X POST http://localhost:3000/api/pipeline/jobs/{jobId}/deploy \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Run test (requires auth token)
curl -X POST http://localhost:3000/api/pipeline/jobs/{jobId}/test \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userPrompt": "Test prompt", "enableEvaluation": false}'

# Get endpoint status (requires auth token)
curl http://localhost:3000/api/pipeline/jobs/{jobId}/endpoints \
  -H "Cookie: sb-access-token=YOUR_TOKEN"

# Get test history (requires auth token)
curl http://localhost:3000/api/pipeline/jobs/{jobId}/test?limit=10 \
  -H "Cookie: sb-access-token=YOUR_TOKEN"

# Rate test result (requires auth token)
curl -X POST http://localhost:3000/api/pipeline/test/{testId}/rate \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rating": "adapted", "notes": "Much better empathy"}'
```

---

## Success Criteria

Verify ALL criteria are met:

- [ ] Deploy endpoint route created at correct path
- [ ] Test endpoint route created with both POST and GET handlers
- [ ] Endpoints status route created
- [ ] Rate test route created
- [ ] All routes require authentication
- [ ] All routes validate input data
- [ ] All routes call service layer functions (not database directly)
- [ ] All routes return proper error responses
- [ ] TypeScript compiles without errors
- [ ] API routes follow Next.js App Router patterns
- [ ] Proper HTTP status codes used (401, 400, 500)

---

## Files Created/Modified

### New Files
| File | Purpose |
|------|---------|
| `src/app/api/pipeline/jobs/[jobId]/deploy/route.ts` | Deploy endpoints API |
| `src/app/api/pipeline/jobs/[jobId]/test/route.ts` | A/B testing API |
| `src/app/api/pipeline/jobs/[jobId]/endpoints/route.ts` | Endpoint status API |
| `src/app/api/pipeline/test/[testId]/rate/route.ts` | Rate test results API |

### Directory Structure Created
```
src/app/api/pipeline/
├── jobs/[jobId]/
│   ├── deploy/route.ts
│   ├── test/route.ts
│   └── endpoints/route.ts
└── test/[testId]/
    └── rate/route.ts
```

---

## API Documentation

### POST /api/pipeline/jobs/[jobId]/deploy
**Purpose:** Deploy Control and Adapted inference endpoints  
**Auth:** Required  
**Request:** Empty body  
**Response:** `{ success: boolean, data?: { controlEndpoint, adaptedEndpoint }, error?: string }`

### POST /api/pipeline/jobs/[jobId]/test
**Purpose:** Run A/B test  
**Auth:** Required  
**Request:** `{ userPrompt: string, systemPrompt?: string, enableEvaluation?: boolean }`  
**Response:** `{ success: boolean, data?: TestResult, error?: string }`

### GET /api/pipeline/jobs/[jobId]/test
**Purpose:** Get test history  
**Auth:** Required  
**Query Params:** `limit`, `offset`  
**Response:** `{ success: boolean, data?: TestResult[], count?: number, error?: string }`

### GET /api/pipeline/jobs/[jobId]/endpoints
**Purpose:** Get endpoint status  
**Auth:** Required  
**Response:** `{ success: boolean, data?: { controlEndpoint, adaptedEndpoint, bothReady }, error?: string }`

### POST /api/pipeline/test/[testId]/rate
**Purpose:** Rate test result  
**Auth:** Required  
**Request:** `{ rating: UserRating, notes?: string }`  
**Response:** `{ success: boolean, error?: string }`

---

## Next Steps

After completing E03:
- **E04:** React Query Hooks (useAdapterTesting)
- **E05:** UI Components & Pages

---

**END OF E03 PROMPT**

+++++++++++++++++



