# Multi-Turn Chat Implementation - Section E03: API Routes

**Version:** 2.0  
**Date:** January 29, 2026  
**Section:** E03 - API Routes  
**Prerequisites:** E01 (Database & Types), E02 (Service Layer) must be complete  
**Builds Upon:** Service layer functions from E02  
**Changes from v1:** Updated auth pattern to use `requireAuth`, clarified service file naming

---

## Overview

This prompt implements the API routes for the multi-turn chat module.

**What This Section Creates:**
1. Route: `src/app/api/pipeline/conversations/route.ts` (GET list, POST create)
2. Route: `src/app/api/pipeline/conversations/[id]/route.ts` (GET, DELETE)
3. Route: `src/app/api/pipeline/conversations/[id]/turn/route.ts` (POST)
4. Route: `src/app/api/pipeline/conversations/[id]/complete/route.ts` (POST)

**What This Section Does NOT Create:**
- React hooks (E04)
- UI components (E04)
- Page routes (E05)

**Key Changes from v1:**
- ✅ Updated auth pattern to use `requireAuth` helper (matches existing routes)
- ✅ Clarified service file is `multi-turn-conversation-service.ts`
- ✅ Verified imports match current codebase structure

---

## Prerequisites from E02

Before starting, verify E02 is complete:

```bash
cd C:\Users\james\Master\BrightHub\BRun\v4-show\src && npm run build
```

Verify these files exist:
- `src/lib/services/multi-turn-conversation-service.ts` (created in E02)
- `src/lib/services/index.ts` exports multi-turn service functions
- `src/types/conversation.ts` (created in E01)

---

## Critical Instructions

### Route Structure

```
src/app/api/pipeline/conversations/
├── route.ts                     # GET (list), POST (create)
└── [id]/
    ├── route.ts                 # GET (with turns), DELETE
    ├── turn/
    │   └── route.ts             # POST (add turn)
    └── complete/
        └── route.ts             # POST (mark completed)
```

### Existing Patterns

Follow patterns from these existing API routes:
- `src/app/api/pipeline/jobs/route.ts` — List/Create pattern with `requireAuth`
- `src/app/api/pipeline/jobs/[jobId]/route.ts` — Dynamic route pattern

**Auth Pattern:** Use `requireAuth` helper from `@/lib/supabase-server` (consistent with existing routes)

---

## Reference Documents

- Full Spec: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi\workfiles\multi-turn-chat-and-evaluation_v1.md` (Section 7)
- Existing API Routes: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\pipeline\`

---

========================


## EXECUTION PROMPT E03

You are implementing the API routes for a multi-turn A/B testing chat module.

### Context

These API routes provide:
- CRUD operations for multi-turn conversations
- Add turn endpoint that calls both inference endpoints
- Optional per-turn Claude-as-Judge evaluation

### Prerequisites

E01 and E02 must be complete:
- Database tables exist (`multi_turn_conversations`, `conversation_turns`)
- `src/types/conversation.ts` exists
- `src/lib/services/multi-turn-conversation-service.ts` exists
- Service functions exported from `src/lib/services/index.ts`

### Task 1: Create Main Conversations Route

**Create file:** `src/app/api/pipeline/conversations/route.ts`

```typescript
/**
 * API Route: /api/pipeline/conversations
 * 
 * GET  - List conversations for a job
 * POST - Create new conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { createConversation, listConversations } from '@/lib/services';
import { CreateConversationRequest } from '@/types/conversation';

export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;
    
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    
    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'jobId is required' },
        { status: 400 }
      );
    }
    
    const result = await listConversations(user.id, jobId);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('GET /api/pipeline/conversations error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;
    
    const body: CreateConversationRequest = await request.json();
    
    if (!body.jobId) {
      return NextResponse.json(
        { success: false, error: 'jobId is required' },
        { status: 400 }
      );
    }
    
    const result = await createConversation(user.id, body);
    return NextResponse.json(result, { status: result.success ? 201 : 400 });
  } catch (error) {
    console.error('POST /api/pipeline/conversations error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Task 2: Create Single Conversation Route

**Create file:** `src/app/api/pipeline/conversations/[id]/route.ts`

```typescript
/**
 * API Route: /api/pipeline/conversations/[id]
 * 
 * GET    - Get conversation with all turns
 * DELETE - Delete conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { getConversation, deleteConversation } from '@/lib/services';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;
    
    const result = await getConversation(user.id, params.id);
    return NextResponse.json(result, { status: result.success ? 200 : 404 });
  } catch (error) {
    console.error('GET /api/pipeline/conversations/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;
    
    const result = await deleteConversation(user.id, params.id);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('DELETE /api/pipeline/conversations/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Task 3: Create Add Turn Route

**Create file:** `src/app/api/pipeline/conversations/[id]/turn/route.ts`

```typescript
/**
 * API Route: /api/pipeline/conversations/[id]/turn
 * 
 * POST - Add a new turn to the conversation
 * 
 * This endpoint:
 * - Calls both control and adapted endpoints with siloed history
 * - Optionally evaluates responses with Claude-as-Judge
 * - Supports both single-turn and multi-turn arc evaluation
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { addTurn } from '@/lib/services';
import { AddTurnRequest } from '@/types/conversation';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;
    
    const body: AddTurnRequest = await request.json();
    
    if (!body.userMessage || body.userMessage.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'userMessage is required' },
        { status: 400 }
      );
    }
    
    const result = await addTurn(user.id, params.id, body);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('POST /api/pipeline/conversations/[id]/turn error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Task 4: Create Complete Conversation Route

**Create file:** `src/app/api/pipeline/conversations/[id]/complete/route.ts`

```typescript
/**
 * API Route: /api/pipeline/conversations/[id]/complete
 * 
 * POST - Mark conversation as completed
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { completeConversation } from '@/lib/services';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;
    
    const result = await completeConversation(user.id, params.id);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('POST /api/pipeline/conversations/[id]/complete error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Task 5: Verify Directory Structure

After creating all files, verify the structure:

```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\pipeline\conversations" && find . -type f -name "*.ts" 2>/dev/null || dir /s /b *.ts
```

Expected output:
```
.\route.ts
.\[id]\route.ts
.\[id]\turn\route.ts
.\[id]\complete\route.ts
```

### Task 6: Verify TypeScript Build

```bash
cd C:\Users\james\Master\BrightHub\BRun\v4-show\src && npm run build
```

**Success Criteria:** Build completes with no TypeScript errors.

---

## API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/pipeline/conversations?jobId=` | List conversations for a job |
| POST | `/api/pipeline/conversations` | Create new conversation |
| GET | `/api/pipeline/conversations/[id]` | Get conversation with turns |
| DELETE | `/api/pipeline/conversations/[id]` | Delete conversation |
| POST | `/api/pipeline/conversations/[id]/turn` | Add a new turn |
| POST | `/api/pipeline/conversations/[id]/complete` | Mark as completed |

---

## Success Criteria

- [ ] All 4 route files created in correct directories
- [ ] Directory structure matches specification
- [ ] All imports resolve correctly
- [ ] TypeScript builds without errors
- [ ] Auth pattern uses `requireAuth` helper


+++++++++++++++++


---

## Files Created

| File | Purpose |
|------|---------|
| `src/app/api/pipeline/conversations/route.ts` | List + Create conversations |
| `src/app/api/pipeline/conversations/[id]/route.ts` | Get + Delete conversation |
| `src/app/api/pipeline/conversations/[id]/turn/route.ts` | Add turn with A/B inference |
| `src/app/api/pipeline/conversations/[id]/complete/route.ts` | Complete conversation |

## Request/Response Examples

### Create Conversation
```typescript
// POST /api/pipeline/conversations
Request: {
  jobId: string;
  name?: string;
  systemPrompt?: string;
}

Response: {
  success: boolean;
  data?: Conversation;
  error?: string;
}
```

### Add Turn
```typescript
// POST /api/pipeline/conversations/[id]/turn
Request: {
  userMessage: string;
  enableEvaluation?: boolean;
  evaluationPromptId?: string;  // For multi-turn arc evaluation
}

Response: {
  success: boolean;
  data?: ConversationTurn;
  error?: string;
}
```

---

**END OF E03_v2 PROMPT**
