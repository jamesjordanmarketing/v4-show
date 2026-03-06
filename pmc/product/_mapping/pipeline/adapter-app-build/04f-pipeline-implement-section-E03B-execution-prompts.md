# Adapter Application Module - Section E03: API Routes Implementation

**Version:** 2.0 (Revised)  
**Date:** January 17, 2026  
**Section:** E03 - API Layer  
**Prerequisites:** E01 (Database Schema & Types) ✅ COMPLETE, E02 (Service Layer) ✅ COMPLETE  
**Builds Upon:** E01 and E02 foundation  

---

## Overview

This prompt implements the API routes for the adapter testing infrastructure. This section creates RESTful API endpoints that expose the E02 service layer to the frontend, enabling deployment, testing, and evaluation of LoRA adapters.

**What This Section Creates:**
1. **Deploy API** - Deploy control and adapted inference endpoints (`POST /api/pipeline/adapters/deploy`)
2. **Test API** - Run A/B tests and retrieve history (`POST/GET /api/pipeline/adapters/test`)
3. **Status API** - Check endpoint deployment status (`GET /api/pipeline/adapters/status`)
4. **Rating API** - Submit user ratings for test results (`POST /api/pipeline/adapters/rate`)

**What This Section Does NOT Create:**
- UI components (E05)
- React Query hooks (E04)
- Service layer logic (E02 - already complete)

---

## Critical Instructions

### Supabase Client Pattern (IMPORTANT!)

**Use the correct Supabase client from E02:**

```typescript
import { createServerSupabaseClient } from '@/lib/supabase-server';

// In your route handler
const supabase = await createServerSupabaseClient();
const { data: { user } } = await supabase.auth.getUser();
```

**DO NOT use** `createClient()` - use `createServerSupabaseClient()` which was established in E02.

### API Route Architecture

**Next.js 14 App Router patterns:**
- All routes in `src/app/api/pipeline/adapters/` directory
- Use `NextRequest` and `NextResponse` from `next/server`
- Validate authentication on ALL routes
- Call E02 service functions (never access database directly)
- Return standardized `{ success, data?, error? }` format
- Use proper HTTP status codes

### Error Handling Strategy

```typescript
// 401 - Unauthorized (no valid user)
// 400 - Bad Request (validation error, service returned error)
// 404 - Not Found (resource doesn't exist)
// 500 - Internal Server Error (unexpected exception)
```

### Type Safety

Import types from E01:

```typescript
import {
  RunTestRequest,
  DeployAdapterResponse,
  EndpointStatusResponse,
  TestResultListResponse,
  UserRating,
} from '@/types/pipeline-adapter';
```

---

## Reference Documents

**Completed Implementations:**
- E01 Complete: `docs/ADAPTER_E01_COMPLETE.md`
- E02 Complete: `docs/ADAPTER_E02_COMPLETE.md`
- E02 Quick Start: `docs/ADAPTER_E02_QUICK_START.md`

**Service Layer Functions (E02):**
- `deployAdapterEndpoints(userId, jobId)` - Deploy endpoints
- `getEndpointStatus(jobId)` - Check status
- `runABTest(userId, request)` - Run test
- `getTestHistory(jobId, options)` - Get history
- `rateTestResult(testId, userId, rating, notes)` - Save rating

---

========================

# EXECUTION PROMPT E03 - API ROUTES IMPLEMENTATION

## Context

You are implementing the API layer for the Adapter Application Module. This layer exposes the E02 service functions through RESTful HTTP endpoints.

**Architecture Principles:**
1. **Thin Controllers:** API routes validate input and call services only
2. **Authentication Required:** All routes require valid user authentication
3. **Service Delegation:** All business logic delegated to E02 services
4. **Consistent Responses:** Standardized `{ success, data?, error? }` format
5. **Proper Status Codes:** Use appropriate HTTP status codes for all scenarios

**Implementation Strategy:**
- Create 4 API route files
- Follow established patterns from E02
- Add comprehensive error handling
- Include input validation
- Maintain type safety throughout

---

## Task 1: Deploy Adapter Endpoints API

This endpoint deploys control and adapted inference endpoints to RunPod.

### File: `src/app/api/pipeline/adapters/deploy/route.ts`

```typescript
/**
 * Deploy Adapter Endpoints API
 *
 * POST /api/pipeline/adapters/deploy
 * 
 * Deploys Control (base model) and Adapted (base + LoRA) inference endpoints
 * to RunPod Serverless for A/B testing.
 * 
 * Request Body:
 * {
 *   jobId: string  // Training job ID (must be completed)
 * }
 * 
 * Response:
 * {
 *   success: boolean;
 *   data?: {
 *     controlEndpoint: InferenceEndpoint;
 *     adaptedEndpoint: InferenceEndpoint;
 *   };
 *   error?: string;
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { deployAdapterEndpoints } from '@/lib/services';
import { DeployAdapterResponse } from '@/types/pipeline-adapter';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.jobId || typeof body.jobId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'jobId is required and must be a string' },
        { status: 400 }
      );
    }

    // Call service layer (E02)
    const result: DeployAdapterResponse = await deployAdapterEndpoints(
      user.id,
      body.jobId
    );

    // Handle service errors
    if (!result.success) {
      const statusCode = result.error?.includes('not found') ? 404 : 400;
      return NextResponse.json(
        { success: false, error: result.error },
        { status: statusCode }
      );
    }

    // Return success response
    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('POST /api/pipeline/adapters/deploy error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error. Please try again later.'
      },
      { status: 500 }
    );
  }
}
```

---

## Task 2: Endpoint Status API

This endpoint checks the deployment status of inference endpoints.

### File: `src/app/api/pipeline/adapters/status/route.ts`

```typescript
/**
 * Endpoint Status API
 *
 * GET /api/pipeline/adapters/status?jobId={jobId}
 * 
 * Checks the deployment status of control and adapted endpoints.
 * Polls RunPod for current status and updates database accordingly.
 * 
 * Query Parameters:
 * - jobId: string (required) - Training job ID
 * 
 * Response:
 * {
 *   success: boolean;
 *   data?: {
 *     controlEndpoint: InferenceEndpoint | null;
 *     adaptedEndpoint: InferenceEndpoint | null;
 *     bothReady: boolean;
 *   };
 *   error?: string;
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getEndpointStatus } from '@/lib/services';
import { EndpointStatusResponse } from '@/types/pipeline-adapter';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'jobId query parameter is required' },
        { status: 400 }
      );
    }

    // Call service layer (E02)
    const result: EndpointStatusResponse = await getEndpointStatus(jobId);

    // Handle service errors
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Return success response
    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('GET /api/pipeline/adapters/status error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error. Please try again later.'
      },
      { status: 500 }
    );
  }
}
```

---

## Task 3: A/B Test API

This endpoint runs A/B tests and retrieves test history.

### File: `src/app/api/pipeline/adapters/test/route.ts`

```typescript
/**
 * A/B Testing API
 *
 * POST /api/pipeline/adapters/test
 * Run an A/B test between control and adapted models with optional Claude-as-Judge evaluation
 * 
 * GET /api/pipeline/adapters/test?jobId={jobId}&limit={limit}&offset={offset}
 * Retrieve test history for a job with pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { runABTest, getTestHistory } from '@/lib/services';
import {
  RunTestRequest,
  RunTestResponse,
  TestResultListResponse,
} from '@/types/pipeline-adapter';

// ============================================
// POST - Run A/B Test
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let body: Partial<RunTestRequest>;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.jobId || typeof body.jobId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'jobId is required and must be a string' },
        { status: 400 }
      );
    }

    if (!body.userPrompt || typeof body.userPrompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'userPrompt is required and must be a string' },
        { status: 400 }
      );
    }

    if (body.userPrompt.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'userPrompt cannot be empty' },
        { status: 400 }
      );
    }

    // Validate optional fields
    if (body.systemPrompt !== undefined && typeof body.systemPrompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'systemPrompt must be a string' },
        { status: 400 }
      );
    }

    if (body.enableEvaluation !== undefined && typeof body.enableEvaluation !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'enableEvaluation must be a boolean' },
        { status: 400 }
      );
    }

    // Build request object
    const testRequest: RunTestRequest = {
      jobId: body.jobId,
      userPrompt: body.userPrompt.trim(),
      systemPrompt: body.systemPrompt,
      enableEvaluation: body.enableEvaluation ?? false,
    };

    // Call service layer (E02)
    const result: RunTestResponse = await runABTest(user.id, testRequest);

    // Handle service errors
    if (!result.success) {
      const statusCode = result.error?.includes('not ready') ? 400 : 400;
      return NextResponse.json(
        { success: false, error: result.error },
        { status: statusCode }
      );
    }

    // Return success response
    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('POST /api/pipeline/adapters/test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error. Please try again later.'
      },
      { status: 500 }
    );
  }
}

// ============================================
// GET - Retrieve Test History
// ============================================

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'jobId query parameter is required' },
        { status: 400 }
      );
    }

    // Parse pagination parameters with defaults
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    let limit = 20; // Default limit
    let offset = 0;  // Default offset

    if (limitParam) {
      limit = parseInt(limitParam, 10);
      if (isNaN(limit) || limit < 1 || limit > 100) {
        return NextResponse.json(
          { success: false, error: 'limit must be between 1 and 100' },
          { status: 400 }
        );
      }
    }

    if (offsetParam) {
      offset = parseInt(offsetParam, 10);
      if (isNaN(offset) || offset < 0) {
        return NextResponse.json(
          { success: false, error: 'offset must be 0 or greater' },
          { status: 400 }
        );
      }
    }

    // Call service layer (E02)
    const result: TestResultListResponse = await getTestHistory(jobId, {
      limit,
      offset,
    });

    // Handle service errors
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Return success response
    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('GET /api/pipeline/adapters/test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error. Please try again later.'
      },
      { status: 500 }
    );
  }
}
```

---

## Task 4: Rating API

This endpoint allows users to rate test results.

### File: `src/app/api/pipeline/adapters/rate/route.ts`

```typescript
/**
 * Test Result Rating API
 *
 * POST /api/pipeline/adapters/rate
 * 
 * Allows users to rate test results and provide feedback notes.
 * 
 * Request Body:
 * {
 *   testId: string;               // Test result ID
 *   rating: UserRating;           // 'control' | 'adapted' | 'tie' | 'neither'
 *   notes?: string;               // Optional feedback notes
 * }
 * 
 * Response:
 * {
 *   success: boolean;
 *   error?: string;
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { rateTestResult } from '@/lib/services';
import { UserRating } from '@/types/pipeline-adapter';

// Valid rating values
const VALID_RATINGS: UserRating[] = ['control', 'adapted', 'tie', 'neither'];

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let body: { testId?: string; rating?: string; notes?: string };
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.testId || typeof body.testId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'testId is required and must be a string' },
        { status: 400 }
      );
    }

    if (!body.rating || typeof body.rating !== 'string') {
      return NextResponse.json(
        { success: false, error: 'rating is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate rating value
    if (!VALID_RATINGS.includes(body.rating as UserRating)) {
      return NextResponse.json(
        {
          success: false,
          error: `rating must be one of: ${VALID_RATINGS.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Validate notes if provided
    if (body.notes !== undefined) {
      if (typeof body.notes !== 'string') {
        return NextResponse.json(
          { success: false, error: 'notes must be a string' },
          { status: 400 }
        );
      }
      if (body.notes.length > 1000) {
        return NextResponse.json(
          { success: false, error: 'notes must be 1000 characters or less' },
          { status: 400 }
        );
      }
    }

    // Call service layer (E02)
    const result = await rateTestResult(
      body.testId,
      user.id,
      body.rating as UserRating,
      body.notes
    );

    // Handle service errors
    if (!result.success) {
      const statusCode = result.error?.includes('not found') ? 404 : 400;
      return NextResponse.json(
        { success: false, error: result.error },
        { status: statusCode }
      );
    }

    // Return success response
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('POST /api/pipeline/adapters/rate error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error. Please try again later.'
      },
      { status: 500 }
    );
  }
}
```

---

## Task 5: Verification & Testing

After creating all files, verify the implementation.

### 1. Verify File Structure

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show"

# Check all API routes exist
ls -la src/app/api/pipeline/adapters/deploy/route.ts
ls -la src/app/api/pipeline/adapters/status/route.ts
ls -la src/app/api/pipeline/adapters/test/route.ts
ls -la src/app/api/pipeline/adapters/rate/route.ts
```

### 2. Verify TypeScript Compilation

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/src"
npx tsc --noEmit --project tsconfig.json
```

**Expected:** Exit code 0, no errors

### 3. Check for Linter Errors

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show"
npx eslint src/app/api/pipeline/adapters/**/*.ts
```

### 4. Start Development Server

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show"
npm run dev
```

**Verify:** Server starts on `http://localhost:3000`

### 5. Test API Routes (Manual Testing)

**Prerequisites:**
- Development server running
- Valid Supabase authentication token
- Completed training job with adapter

**Test Deploy Endpoint:**

```bash
# Deploy endpoints
curl -X POST http://localhost:3000/api/pipeline/adapters/deploy \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jobId": "your-job-uuid"}'

# Expected Response:
# {
#   "success": true,
#   "data": {
#     "controlEndpoint": { ... },
#     "adaptedEndpoint": { ... }
#   }
# }
```

**Test Status Endpoint:**

```bash
# Check endpoint status
curl "http://localhost:3000/api/pipeline/adapters/status?jobId=your-job-uuid" \
  -H "Cookie: sb-access-token=YOUR_TOKEN"

# Expected Response:
# {
#   "success": true,
#   "data": {
#     "controlEndpoint": { "status": "deploying" },
#     "adaptedEndpoint": { "status": "deploying" },
#     "bothReady": false
#   }
# }
```

**Test A/B Test Endpoint:**

```bash
# Run A/B test (without evaluation)
curl -X POST http://localhost:3000/api/pipeline/adapters/test \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "your-job-uuid",
    "userPrompt": "I'\''m worried about my retirement savings",
    "systemPrompt": "You are Elena Morales, CFP",
    "enableEvaluation": false
  }'

# Expected Response:
# {
#   "success": true,
#   "data": {
#     "id": "test-result-uuid",
#     "controlResponse": "...",
#     "adaptedResponse": "...",
#     ...
#   }
# }
```

**Test History Endpoint:**

```bash
# Get test history
curl "http://localhost:3000/api/pipeline/adapters/test?jobId=your-job-uuid&limit=10&offset=0" \
  -H "Cookie: sb-access-token=YOUR_TOKEN"

# Expected Response:
# {
#   "success": true,
#   "data": [ ... ],
#   "count": 5
# }
```

**Test Rating Endpoint:**

```bash
# Rate a test result
curl -X POST http://localhost:3000/api/pipeline/adapters/rate \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testId": "test-result-uuid",
    "rating": "adapted",
    "notes": "Much better empathy and emotional awareness"
  }'

# Expected Response:
# {
#   "success": true
# }
```

### 6. Test Error Scenarios

**Test Unauthorized Access:**

```bash
# Without auth token
curl http://localhost:3000/api/pipeline/adapters/status?jobId=test

# Expected: 401 Unauthorized
```

**Test Invalid Input:**

```bash
# Missing required field
curl -X POST http://localhost:3000/api/pipeline/adapters/test \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jobId": "test"}'

# Expected: 400 Bad Request (userPrompt is required)
```

**Test Invalid Rating:**

```bash
# Invalid rating value
curl -X POST http://localhost:3000/api/pipeline/adapters/rate \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testId": "test-uuid",
    "rating": "invalid-value"
  }'

# Expected: 400 Bad Request (invalid rating)
```

---

## Success Criteria

Verify ALL criteria are met:

### Implementation ✅
- [ ] Deploy API route created: `src/app/api/pipeline/adapters/deploy/route.ts`
- [ ] Status API route created: `src/app/api/pipeline/adapters/status/route.ts`
- [ ] Test API route created: `src/app/api/pipeline/adapters/test/route.ts` (with POST and GET)
- [ ] Rating API route created: `src/app/api/pipeline/adapters/rate/route.ts`

### Code Quality ✅
- [ ] All routes use `createServerSupabaseClient()` from E02 pattern
- [ ] All routes import types from `@/types/pipeline-adapter` (E01)
- [ ] All routes call E02 service functions (not database directly)
- [ ] All routes validate authentication before processing
- [ ] All routes validate input data with clear error messages
- [ ] All routes use proper HTTP status codes (401, 400, 404, 500)
- [ ] All routes return standardized `{ success, data?, error? }` format

### Type Safety ✅
- [ ] TypeScript compiles without errors
- [ ] No `any` types used
- [ ] All request/response types properly defined
- [ ] Type imports from E01 used correctly

### Error Handling ✅
- [ ] Try-catch blocks in all route handlers
- [ ] Descriptive error messages for validation failures
- [ ] Console logging for debugging
- [ ] Graceful handling of service errors

### Testing ✅
- [ ] Development server starts successfully
- [ ] Deploy endpoint tested manually
- [ ] Status endpoint tested manually
- [ ] Test endpoint (POST) tested manually
- [ ] Test endpoint (GET) tested manually
- [ ] Rating endpoint tested manually
- [ ] Unauthorized access returns 401
- [ ] Invalid input returns 400 with clear error

---

## Files Created

### API Routes

| File | Lines | Purpose |
|------|-------|---------|
| `src/app/api/pipeline/adapters/deploy/route.ts` | ~110 | Deploy control and adapted endpoints |
| `src/app/api/pipeline/adapters/status/route.ts` | ~60 | Check endpoint deployment status |
| `src/app/api/pipeline/adapters/test/route.ts` | ~250 | Run A/B tests and get history |
| `src/app/api/pipeline/adapters/rate/route.ts` | ~120 | Rate test results |

**Total:** ~540 lines of production-ready API code

### Directory Structure

```
src/app/api/pipeline/adapters/
├── deploy/
│   └── route.ts       # POST - Deploy endpoints
├── status/
│   └── route.ts       # GET - Check status
├── test/
│   └── route.ts       # POST - Run test, GET - Get history
└── rate/
    └── route.ts       # POST - Rate result
```

---

## API Documentation

### POST /api/pipeline/adapters/deploy

**Purpose:** Deploy control and adapted inference endpoints to RunPod  
**Auth:** Required  
**Content-Type:** `application/json`

**Request Body:**
```typescript
{
  jobId: string;  // Training job ID (must be completed)
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    controlEndpoint: InferenceEndpoint;
    adaptedEndpoint: InferenceEndpoint;
  };
}
```

**Error Responses:**
- `401` - Unauthorized (no valid user)
- `400` - Bad request (validation error, job not found/completed)
- `404` - Job not found
- `500` - Internal server error

---

### GET /api/pipeline/adapters/status

**Purpose:** Check deployment status of inference endpoints  
**Auth:** Required

**Query Parameters:**
- `jobId` (string, required) - Training job ID

**Response (200):**
```typescript
{
  success: true;
  data: {
    controlEndpoint: InferenceEndpoint | null;
    adaptedEndpoint: InferenceEndpoint | null;
    bothReady: boolean;  // true if both endpoints are ready
  };
}
```

**Error Responses:**
- `401` - Unauthorized
- `400` - Missing or invalid jobId
- `500` - Internal server error

---

### POST /api/pipeline/adapters/test

**Purpose:** Run A/B test between control and adapted models  
**Auth:** Required  
**Content-Type:** `application/json`

**Request Body:**
```typescript
{
  jobId: string;                // Training job ID
  userPrompt: string;           // User prompt to test (required, non-empty)
  systemPrompt?: string;        // Optional system prompt
  enableEvaluation?: boolean;   // Enable Claude-as-Judge (default: false)
}
```

**Response (200):**
```typescript
{
  success: true;
  data: TestResult;  // Complete test result with responses and optional evaluation
}
```

**Error Responses:**
- `401` - Unauthorized
- `400` - Validation error, endpoints not ready
- `500` - Internal server error

---

### GET /api/pipeline/adapters/test

**Purpose:** Retrieve test history with pagination  
**Auth:** Required

**Query Parameters:**
- `jobId` (string, required) - Training job ID
- `limit` (number, optional) - Results per page (default: 20, max: 100)
- `offset` (number, optional) - Pagination offset (default: 0)

**Response (200):**
```typescript
{
  success: true;
  data: TestResult[];  // Array of test results
  count: number;       // Total count for pagination
}
```

**Error Responses:**
- `401` - Unauthorized
- `400` - Invalid parameters
- `500` - Internal server error

---

### POST /api/pipeline/adapters/rate

**Purpose:** Submit user rating for a test result  
**Auth:** Required  
**Content-Type:** `application/json`

**Request Body:**
```typescript
{
  testId: string;               // Test result ID
  rating: UserRating;           // 'control' | 'adapted' | 'tie' | 'neither'
  notes?: string;               // Optional feedback (max 1000 chars)
}
```

**Response (200):**
```typescript
{
  success: true;
}
```

**Error Responses:**
- `401` - Unauthorized
- `400` - Validation error, invalid rating
- `404` - Test result not found
- `500` - Internal server error

---

## Integration with E02 Services

**Service Functions Called:**

| API Route | E02 Service Function | Purpose |
|-----------|---------------------|---------|
| `POST /adapters/deploy` | `deployAdapterEndpoints(userId, jobId)` | Deploy endpoints |
| `GET /adapters/status` | `getEndpointStatus(jobId)` | Check status |
| `POST /adapters/test` | `runABTest(userId, request)` | Run test |
| `GET /adapters/test` | `getTestHistory(jobId, options)` | Get history |
| `POST /adapters/rate` | `rateTestResult(testId, userId, rating, notes)` | Save rating |

**All service functions return standardized format:**
```typescript
{
  success: boolean;
  data?: T;
  error?: string;
}
```

---

## Performance Considerations

### Response Times (Typical)

- **Deploy:** 2-5 seconds (creates database records, calls RunPod)
- **Status:** 500ms - 2 seconds (database + RunPod poll)
- **Test (no eval):** 2-4 seconds (parallel inference)
- **Test (with eval):** 4-8 seconds (parallel inference + evaluation)
- **History:** 100-500ms (database query with pagination)
- **Rate:** 50-200ms (database update)

### Optimization Tips

1. **Status Polling:** Frontend should poll status every 5-10 seconds, not continuously
2. **Test History:** Use pagination to limit result sets
3. **Evaluation:** Make optional to reduce costs and latency for rapid testing
4. **Caching:** Consider caching endpoint status for 5 seconds in production

---

## Security Considerations

### Authentication
- ✅ All routes require valid user authentication
- ✅ User ID extracted from authenticated session
- ✅ Authorization checked before service calls

### Input Validation
- ✅ All required fields validated
- ✅ Type checking on all inputs
- ✅ String length limits enforced
- ✅ Enum values validated

### Error Messages
- ✅ No sensitive data exposed in errors
- ✅ Generic "Internal server error" for exceptions
- ✅ Specific validation errors for user feedback

### Rate Limiting (Future Enhancement)
Consider adding rate limiting in production:
- Deploy: 5 requests per hour per user
- Test: 50 requests per hour per user
- Status: 100 requests per hour per user

---

## Next Steps

### E04: React Query Hooks (Next Phase)

**Create frontend data fetching hooks:**

1. `useAdapterDeployment(jobId)` - Deploy and monitor endpoints
2. `useEndpointStatus(jobId)` - Poll endpoint status
3. `useRunTest(jobId)` - Run A/B tests
4. `useTestHistory(jobId)` - Fetch test history with pagination
5. `useRateTest()` - Submit ratings with optimistic updates

**Features:**
- Automatic refetching
- Optimistic updates
- Error handling
- Loading states
- Cache invalidation

**Implementation Timeline:** 1-2 hours

---

### E05: UI Components (After E04)

**Build user interface:**

1. Deployment Panel - Deploy and monitor endpoints
2. Test Runner - Input prompts and run tests
3. Comparison View - Side-by-side response display
4. Evaluation Display - Claude scores and feedback
5. Test History Table - Browse past tests with filters
6. Rating Interface - Rate and provide feedback

**Implementation Timeline:** 3-4 hours

---

## Troubleshooting Guide

### "Unauthorized" Error
**Cause:** No valid Supabase session  
**Fix:** Ensure user is logged in and session is active

### "Endpoints not ready" Error
**Cause:** Trying to test before endpoints are deployed  
**Fix:** Call status endpoint until `bothReady: true`

### TypeScript Compilation Errors
**Cause:** Missing type imports or incorrect usage  
**Fix:** Verify all types imported from E01 `@/types/pipeline-adapter`

### 500 Internal Server Error
**Cause:** Unexpected exception in route handler  
**Fix:** Check server logs, verify E02 services are working

### Service Returns Error
**Cause:** Business logic error in E02 layer  
**Fix:** Check service implementation, verify database state

---

## Documentation Generated

After implementation, create:

- [ ] `docs/ADAPTER_E03_COMPLETE.md` - Implementation summary
- [ ] `docs/ADAPTER_E03_CHECKLIST.md` - Verification checklist
- [ ] `docs/ADAPTER_E03_API_REFERENCE.md` - Complete API documentation

---

## Success Metrics

**When E03 is complete, you should have:**

- ✅ 4 production-ready API routes
- ✅ ~540 lines of type-safe TypeScript
- ✅ Complete integration with E02 services
- ✅ Comprehensive input validation
- ✅ Proper error handling throughout
- ✅ All routes tested manually
- ✅ TypeScript compiles without errors
- ✅ Zero linter warnings

---

**Status:** Ready for Implementation  
**Estimated Time:** 1-2 hours  
**Complexity:** Medium  
**Dependencies:** E01 ✅ E02 ✅  

**Next Phase:** E04 - React Query Hooks

---

**END OF E03B EXECUTION PROMPT**
