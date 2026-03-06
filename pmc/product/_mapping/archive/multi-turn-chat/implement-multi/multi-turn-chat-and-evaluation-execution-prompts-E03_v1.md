# Multi-Turn Chat Implementation - Section E03: API Routes

**Version:** 1.0  
**Date:** January 29, 2026  
**Section:** E03 - API Routes  
**Prerequisites:** E01 (Database & Types), E02 (Service Layer) must be complete  
**Builds Upon:** Service layer functions from E02  

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

---

## Prerequisites from E02

Before starting, verify E02 is complete:

```bash
cd C:\Users\james\Master\BrightHub\BRun\v4-show && npm run build
```

Verify `src/lib/services/conversation-service.ts` exists and exports all functions.

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
- `src/app/api/pipeline/jobs/route.ts` — List/Create pattern
- `src/app/api/pipeline/jobs/[id]/route.ts` — Dynamic route pattern

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
- Database tables exist
- `src/types/conversation.ts` exists
- `src/lib/services/conversation-service.ts` exists

### Task 1: Create Main Conversations Route

Create file: `src/app/api/pipeline/conversations/route.ts`

```typescript
/**
 * API Route: /api/pipeline/conversations
 * 
 * GET  - List conversations for a job
 * POST - Create new conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createConversation, listConversations } from '@/lib/services';
import { CreateConversationRequest } from '@/types/conversation';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');
    
    if (!jobId) {
      return NextResponse.json({ success: false, error: 'jobId is required' }, { status: 400 });
    }
    
    const result = await listConversations(user.id, jobId);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('GET /api/pipeline/conversations error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const body: CreateConversationRequest = await req.json();
    
    if (!body.jobId) {
      return NextResponse.json({ success: false, error: 'jobId is required' }, { status: 400 });
    }
    
    const result = await createConversation(user.id, body);
    return NextResponse.json(result, { status: result.success ? 201 : 400 });
  } catch (error) {
    console.error('POST /api/pipeline/conversations error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
```

### Task 2: Create Single Conversation Route

Create file: `src/app/api/pipeline/conversations/[id]/route.ts`

```typescript
/**
 * API Route: /api/pipeline/conversations/[id]
 * 
 * GET    - Get conversation with all turns
 * DELETE - Delete conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getConversation, deleteConversation } from '@/lib/services';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const result = await getConversation(user.id, params.id);
    return NextResponse.json(result, { status: result.success ? 200 : 404 });
  } catch (error) {
    console.error('GET /api/pipeline/conversations/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const result = await deleteConversation(user.id, params.id);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('DELETE /api/pipeline/conversations/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
```

### Task 3: Create Add Turn Route

Create file: `src/app/api/pipeline/conversations/[id]/turn/route.ts`

```typescript
/**
 * API Route: /api/pipeline/conversations/[id]/turn
 * 
 * POST - Add a new turn to the conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { addTurn } from '@/lib/services';
import { AddTurnRequest } from '@/types/conversation';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const body: AddTurnRequest = await req.json();
    
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
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
```

### Task 4: Create Complete Conversation Route

Create file: `src/app/api/pipeline/conversations/[id]/complete/route.ts`

```typescript
/**
 * API Route: /api/pipeline/conversations/[id]/complete
 * 
 * POST - Mark conversation as completed
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { completeConversation } from '@/lib/services';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const result = await completeConversation(user.id, params.id);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('POST /api/pipeline/conversations/[id]/complete error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
```

### Task 5: Verify TypeScript Build

```bash
cd C:\Users\james\Master\BrightHub\BRun\v4-show && npm run build
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

- [ ] All 4 route files created
- [ ] Directory structure matches specification
- [ ] TypeScript builds without errors


+++++++++++++++++



---

## Files Created

| File | Purpose |
|------|---------|
| `src/app/api/pipeline/conversations/route.ts` | List + Create |
| `src/app/api/pipeline/conversations/[id]/route.ts` | Get + Delete |
| `src/app/api/pipeline/conversations/[id]/turn/route.ts` | Add Turn |
| `src/app/api/pipeline/conversations/[id]/complete/route.ts` | Complete |

---

**END OF E03 PROMPT**
