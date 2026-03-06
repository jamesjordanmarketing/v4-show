# PIPELINE - Section E06: Cost Tracking & Notifications - Execution Prompts

**Product:** PIPELINE  
**Section:** 6 - Cost Tracking & Notifications  
**Generated:** 2025-12-26  
**Total Prompts:** 1  
**Estimated Total Time:** 4 hours  
**Source Section File:** 04f-pipeline-build-section-E06.md

---

## Section Overview

Track training costs in real-time and notify users of important events throughout the training lifecycle.

**User Value**: Transparent cost tracking and timely notifications keep users informed and in control

**What This Section Implements**:
- Cost analytics API with aggregation by type and time period
- Notifications API for fetching and managing user notifications
- Integration with existing cost records and notifications created in previous sections

**Key Insight**: Cost tracking and notifications have already been integrated throughout Sections 3-5. This section adds APIs to **query** and **manage** that data, not create it.

---

## Prompt Sequence for This Section

This section has been divided into **1 progressive prompt**:

1. **Prompt P01: Cost & Notifications APIs** (4h)
   - Features: FR-6.1 (Cost Dashboard API), FR-6.2 (Notifications API)
   - Key Deliverables: 3 API routes for cost analytics and notification management
   - Dependencies: Sections E01-E05 (database tables and existing cost/notification creation)

---

## Integration Context

### Dependencies from Previous Sections

#### Section E01: Foundation & Authentication
- Table: `lora_cost_records` (already created)
- Table: `lora_notifications` (already created)
- Auth pattern: `requireAuth()` from `@/lib/supabase-server`
- Database client: `createServerSupabaseClient()`

#### Section E02-E05: Cost & Notification Creation
- **Cost records** are being created during:
  - Section 3: Job creation (estimated cost)
  - Section 4: Job execution (current cost tracking)
  - Section 4: Job completion (final cost)
- **Notifications** are being created during:
  - Section 3: Job queued
  - Section 4: Job started, job failed, progress milestones
  - Section 5: Model artifact ready

### Provides for Next Sections

This is primarily a **read-only querying layer** for existing data:
- Cost analytics API can be consumed by future dashboard UI enhancements
- Notifications API enables future real-time notification features
- Both APIs follow existing patterns and can be extended

---

## Dependency Flow (This Section)

```
Section E01 (Database)
  ↓
  lora_cost_records table
  lora_notifications table
  ↓
Sections E03-E05 (Data Creation)
  ↓
  Cost records inserted during training lifecycle
  Notifications inserted for all key events
  ↓
Section E06 - P01 (This Section)
  ↓
  GET /api/costs (aggregate and analyze)
  GET /api/notifications (fetch with filters)
  PATCH /api/notifications/[id]/read (mark as read)
```

---

# PROMPT 1: Cost & Notifications APIs

**Generated:** 2025-12-26  
**Section:** 6 - Cost Tracking & Notifications  
**Prompt:** 1 of 1 in this section  
**Estimated Time:** 4 hours  
**Prerequisites:** Sections E01-E05 complete (database tables exist, cost/notification records being created)

---

## 🎯 Mission Statement

Implement read-only API endpoints for querying cost analytics and managing notifications. These APIs provide aggregated cost data for budget tracking and enable users to view and mark notifications as read. This completes the training lifecycle by giving users visibility into costs incurred and important system events.

---

## 📦 Section Context

### This Section's Goal

Enable transparent cost tracking and timely notifications to keep users informed and in control throughout the training process.

### This Prompt's Scope

This is **Prompt 1 of 1** in Section E06. It implements:
- **FR-6.1**: Cost Dashboard API (GET /api/costs)
- **FR-6.2**: Notifications API (GET /api/notifications, PATCH /api/notifications/[id]/read)

**Note**: This section is **read-only** - it queries existing data created by previous sections. Cost records and notifications are already being created throughout the training lifecycle in Sections 3-5.

---

## 🔗 Integration with Previous Work

### From Previous Sections

#### Section E01: Foundation & Authentication

**Database Tables We'll Query:**
- `lora_cost_records` - Cost tracking table
  - Columns: `id`, `user_id`, `job_id`, `cost_type`, `amount`, `details`, `billing_period`, `recorded_at`
  - Already populated by training job execution
  
- `lora_notifications` - User notifications table
  - Columns: `id`, `user_id`, `type`, `title`, `message`, `priority`, `read`, `action_url`, `metadata`, `created_at`
  - Already populated throughout training lifecycle

**Authentication Pattern We'll Use:**
- `requireAuth()` from `@/lib/supabase-server` - Existing auth middleware
- `createServerSupabaseClient()` - Database client pattern

**Type Definitions Available:**
```typescript
// From @/lib/types/lora-training.ts (Section E01)
interface CostRecord {
  id: string;
  user_id: string;
  job_id: string | null;
  cost_type: string;
  amount: number;
  details: any;
  billing_period: string;
  recorded_at: string;
}

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  read: boolean;
  action_url: string | null;
  metadata: any;
  created_at: string;
}
```

#### Sections E03-E05: Cost & Notification Creation

**Where Cost Records Are Created:**
- Section 3 (`POST /api/jobs`): Initial `estimated_total_cost` stored in job
- Section 4 (Edge Function): `current_cost` updated during training
- Section 4 (Edge Function): `final_cost` recorded on completion
- Cost records inserted into `lora_cost_records` throughout job lifecycle

**Where Notifications Are Created:**
- Section 3: "Training Job Queued" notification
- Section 4: "Training Started" notification
- Section 4: "Training Failed" notification (on errors)
- Section 5: "Model Ready for Download" notification

**Integration Pattern:**
All notifications inserted with:
```typescript
await supabase.from('lora_notifications').insert({
  user_id: job.user_id,
  type: 'job_started', // or other type
  title: 'Training Started',
  message: 'Your training job has started...',
  priority: 'medium',
  action_url: `/training/jobs/${job.id}`,
  metadata: { job_id: job.id },
});
```

### From Previous Prompts (This Section)

This is the first (and only) prompt in Section E06. No previous prompts in this section.

---

## 🎯 Implementation Requirements

### Feature FR-6.1: Cost Dashboard API

**Type:** API Endpoint  
**Strategy:** EXTENSION - using existing Supabase patterns and database tables

#### Description

Aggregate cost data for analytics and budget tracking. Query `lora_cost_records` table with flexible date range filtering and provide aggregated views by cost type and date.

#### What Already Exists (Don't Rebuild)

- ✅ `lora_cost_records` table (Section E01)
- ✅ Cost records being created during training (Sections E03-E05)
- ✅ Authentication pattern (`requireAuth()`)
- ✅ API response format (`{ success: true, data }`)

#### What We're Building (New in This Prompt)

- 🆕 `src/app/api/costs/route.ts` - Cost analytics API endpoint

#### Implementation Details

**File:** `src/app/api/costs/route.ts`

**Endpoint:** `GET /api/costs`

**Query Parameters:**
- `period`: `week` | `month` | `year` (default: `month`)
- `start_date`: ISO date string (optional, overrides period)
- `end_date`: ISO date string (optional, overrides period)

**Response Schema:**
```typescript
{
  success: true,
  data: {
    total_cost: number,           // Sum of all costs in period
    cost_by_type: {               // Costs aggregated by type
      [cost_type: string]: number
    },
    chart_data: Array<{           // Daily cost data for charts
      date: string,
      amount: number
    }>,
    records: Array<CostRecord>    // Raw cost records
  }
}
```

**Implementation:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/costs - Get cost analytics with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const period = searchParams.get('period') || 'month'; // month, week, year
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Calculate date range
    let dateFilter;
    if (startDate && endDate) {
      dateFilter = { gte: startDate, lte: endDate };
    } else {
      const now = new Date();
      if (period === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = { gte: weekAgo.toISOString() };
      } else if (period === 'year') {
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        dateFilter = { gte: yearAgo.toISOString() };
      } else {
        // month (default)
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFilter = { gte: monthAgo.toISOString() };
      }
    }

    // Fetch cost records
    const { data: costs, error } = await supabase
      .from('lora_cost_records')
      .select('*')
      .eq('user_id', user.id)
      .gte('recorded_at', dateFilter.gte)
      .order('recorded_at', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch costs', details: error.message },
        { status: 500 }
      );
    }

    // Calculate aggregates
    const totalCost = costs?.reduce((sum, record) => sum + parseFloat(record.amount), 0) || 0;
    const byType = costs?.reduce((acc: any, record) => {
      acc[record.cost_type] = (acc[record.cost_type] || 0) + parseFloat(record.amount);
      return acc;
    }, {});

    // Group by day for chart data
    const byDay = costs?.reduce((acc: any, record) => {
      const date = record.recorded_at.split('T')[0];
      acc[date] = (acc[date] || 0) + parseFloat(record.amount);
      return acc;
    }, {});

    const chartData = Object.entries(byDay || {}).map(([date, amount]) => ({
      date,
      amount,
    }));

    return NextResponse.json({
      success: true,
      data: {
        total_cost: parseFloat(totalCost.toFixed(2)),
        cost_by_type: byType,
        chart_data: chartData,
        records: costs || [],
      },
    });
  } catch (error: any) {
    console.error('Costs fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch costs', details: error.message },
      { status: 500 }
    );
  }
}
```

**Pattern Source**: Infrastructure Inventory Section 4 (API Architecture)

**Key Points:**
- Uses: `requireAuth()` for authentication (from Section E01)
- Queries: `lora_cost_records` table (created in Section E01)
- Aggregates: Total cost, cost by type, daily costs for charts
- Supports: Flexible date range filtering (predefined periods or custom ranges)
- Returns: Standard API response format (`{ success, data }`)

---

### Feature FR-6.2: Notifications API

**Type:** API Endpoints  
**Strategy:** EXTENSION - using existing Supabase patterns

#### Description

Fetch and manage user notifications. Provide endpoints to list notifications (with optional unread-only filter) and mark individual notifications as read.

#### What Already Exists (Don't Rebuild)

- ✅ `lora_notifications` table (Section E01)
- ✅ Notifications being created throughout training lifecycle (Sections E03-E05)
- ✅ Authentication pattern (`requireAuth()`)
- ✅ API response format

#### What We're Building (New in This Prompt)

- 🆕 `src/app/api/notifications/route.ts` - List notifications endpoint
- 🆕 `src/app/api/notifications/[id]/read/route.ts` - Mark as read endpoint

#### Implementation Details

**File 1:** `src/app/api/notifications/route.ts`

**Endpoint:** `GET /api/notifications`

**Query Parameters:**
- `unread`: `true` | `false` (optional, filter unread only)
- `limit`: number (optional, default: 20)

**Response Schema:**
```typescript
{
  success: true,
  data: {
    notifications: Array<Notification>,
    unread_count: number
  }
}
```

**Implementation:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/notifications - Get user notifications
 */
export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');

    let query = supabase
      .from('lora_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data: notifications, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch notifications', details: error.message },
        { status: 500 }
      );
    }

    // Count unread
    const { count: unreadCount } = await supabase
      .from('lora_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);

    return NextResponse.json({
      success: true,
      data: {
        notifications: notifications || [],
        unread_count: unreadCount || 0,
      },
    });
  } catch (error: any) {
    console.error('Notifications fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications', details: error.message },
      { status: 500 }
    );
  }
}
```

**Pattern Source**: Infrastructure Inventory Section 4 (API Architecture)

**Key Points:**
- Uses: `requireAuth()` for authentication
- Queries: `lora_notifications` table
- Returns: List of notifications + unread count
- Filters: Optional unread-only mode
- Limits: Configurable result limit (default 20)

---

**File 2:** `src/app/api/notifications/[id]/read/route.ts`

**Endpoint:** `PATCH /api/notifications/[id]/read`

**Request Body:** None

**Response Schema:**
```typescript
{
  success: true
}
```

**Implementation:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * PATCH /api/notifications/[id]/read - Mark notification as read
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('lora_notifications')
      .update({ read: true })
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update notification', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Notification update error:', error);
    return NextResponse.json(
      { error: 'Failed to update notification', details: error.message },
      { status: 500 }
    );
  }
}
```

**Pattern Source**: Infrastructure Inventory Section 4 (API Architecture)

**Key Points:**
- Uses: `requireAuth()` for authentication
- Updates: `lora_notifications` table (`read = true`)
- Security: Verifies `user_id` matches to prevent unauthorized access
- Returns: Simple success response
- Idempotent: Safe to call multiple times

---

## ✅ Acceptance Criteria

### Functional Requirements

**FR-6.1: Cost Dashboard API**
- [ ] `GET /api/costs` returns cost data for authenticated users
- [ ] Supports `period` parameter: `week`, `month`, `year`
- [ ] Supports custom date ranges via `start_date` and `end_date`
- [ ] Returns aggregated total cost
- [ ] Returns cost breakdown by type
- [ ] Returns daily chart data for visualization
- [ ] Returns raw cost records

**FR-6.2: Notifications API**
- [ ] `GET /api/notifications` returns user's notifications
- [ ] Supports `unread=true` filter for unread-only
- [ ] Supports `limit` parameter for pagination
- [ ] Returns unread count separately
- [ ] Orders notifications by most recent first
- [ ] `PATCH /api/notifications/[id]/read` marks notification as read
- [ ] Update endpoint enforces user ownership (security)

### Technical Requirements

- [ ] No TypeScript errors
- [ ] No linter warnings
- [ ] Follows existing API patterns from Sections E02-E05
- [ ] All imports resolve correctly
- [ ] Code matches specification exactly
- [ ] Uses existing `requireAuth()` pattern consistently
- [ ] Uses existing `createServerSupabaseClient()` pattern
- [ ] Response format matches existing APIs (`{ success, data }`)

### Integration Requirements

- [ ] Successfully queries `lora_cost_records` table (from Section E01)
- [ ] Successfully queries `lora_notifications` table (from Section E01)
- [ ] Returns cost records created during training (Sections E03-E05)
- [ ] Returns notifications created during training (Sections E03-E05)
- [ ] Authentication works with existing Supabase Auth system
- [ ] RLS policies automatically enforce user data isolation

---

## 🧪 Testing & Validation

### Manual Testing Steps

1. **Cost API Testing**

   Test with default period (month):
   ```bash
   curl http://localhost:3000/api/costs \
     -H "Cookie: [auth-cookie]"
   ```
   
   Expected response:
   ```json
   {
     "success": true,
     "data": {
       "total_cost": 45.23,
       "cost_by_type": {
         "compute": 42.50,
         "storage": 2.73
       },
       "chart_data": [
         { "date": "2025-12-20", "amount": 15.20 },
         { "date": "2025-12-21", "amount": 18.50 },
         { "date": "2025-12-22", "amount": 11.53 }
       ],
       "records": [...]
     }
   }
   ```

   Test with custom date range:
   ```bash
   curl "http://localhost:3000/api/costs?start_date=2025-12-01&end_date=2025-12-31" \
     -H "Cookie: [auth-cookie]"
   ```

   Test with different periods:
   ```bash
   # Week
   curl "http://localhost:3000/api/costs?period=week" \
     -H "Cookie: [auth-cookie]"
   
   # Year
   curl "http://localhost:3000/api/costs?period=year" \
     -H "Cookie: [auth-cookie]"
   ```

2. **Notifications API Testing**

   Test list all notifications:
   ```bash
   curl http://localhost:3000/api/notifications \
     -H "Cookie: [auth-cookie]"
   ```
   
   Expected response:
   ```json
   {
     "success": true,
     "data": {
       "notifications": [
         {
           "id": "...",
           "user_id": "...",
           "type": "job_started",
           "title": "Training Started",
           "message": "Your training job has started...",
           "priority": "medium",
           "read": false,
           "action_url": "/training/jobs/...",
           "metadata": { "job_id": "..." },
           "created_at": "2025-12-26T10:30:00Z"
         }
       ],
       "unread_count": 5
     }
   }
   ```

   Test unread-only filter:
   ```bash
   curl "http://localhost:3000/api/notifications?unread=true" \
     -H "Cookie: [auth-cookie]"
   ```

   Test with custom limit:
   ```bash
   curl "http://localhost:3000/api/notifications?limit=10" \
     -H "Cookie: [auth-cookie]"
   ```

   Test mark as read:
   ```bash
   curl -X PATCH http://localhost:3000/api/notifications/[notification-id]/read \
     -H "Cookie: [auth-cookie]"
   ```
   
   Expected response:
   ```json
   {
     "success": true
   }
   ```

3. **Database Verification**

   Verify cost records exist:
   ```sql
   SELECT 
     count(*) as total_records,
     sum(amount) as total_cost,
     cost_type
   FROM lora_cost_records
   WHERE user_id = '[user-id]'
   GROUP BY cost_type;
   ```

   Verify notifications exist:
   ```sql
   SELECT 
     count(*) as total_notifications,
     sum(case when read = false then 1 else 0 end) as unread_count,
     type
   FROM lora_notifications
   WHERE user_id = '[user-id]'
   GROUP BY type;
   ```

4. **Integration Testing**

   Complete flow test:
   ```bash
   # 1. Create training job (Section 3)
   curl -X POST http://localhost:3000/api/jobs -d '{"dataset_id":"...","preset_id":"balanced",...}'
   
   # 2. Wait for job to start (Section 4 creates notifications)
   
   # 3. Check notifications
   curl http://localhost:3000/api/notifications?unread=true
   # Should see "Training Started" notification
   
   # 4. Wait for job to complete
   
   # 5. Check costs
   curl http://localhost:3000/api/costs?period=week
   # Should see compute and storage costs
   
   # 6. Mark notification as read
   curl -X PATCH http://localhost:3000/api/notifications/[id]/read
   
   # 7. Verify unread count decreased
   curl http://localhost:3000/api/notifications
   # unread_count should be lower
   ```

### Expected Outputs

After completing this prompt, you should have:
- [ ] All 3 API route files created at specified paths
- [ ] Application runs without errors
- [ ] All API endpoints return expected response formats
- [ ] Cost aggregation calculations are accurate
- [ ] Notification filtering works correctly
- [ ] Mark-as-read functionality updates database
- [ ] User data isolation enforced by RLS policies

---

## 📦 Deliverables Checklist

### New Files Created

- [ ] `src/app/api/costs/route.ts` - Cost analytics API
- [ ] `src/app/api/notifications/route.ts` - Notifications list API
- [ ] `src/app/api/notifications/[id]/read/route.ts` - Mark notification as read

### Existing Files Modified

No existing files need modification. This section only adds new API routes.

### Database Changes

No database changes required. This section uses existing tables:
- `lora_cost_records` (already exists from Section E01)
- `lora_notifications` (already exists from Section E01)

### API Endpoints

- [ ] `GET /api/costs` - Cost analytics with date filtering
- [ ] `GET /api/notifications` - List notifications with filters
- [ ] `PATCH /api/notifications/[id]/read` - Mark notification as read

---

## 🔜 What's Next

### For Next Prompt in This Section

**Section Complete:** This is the final (and only) prompt in Section E06.

### For Next Section

**Next Section:** E07 (if applicable) or complete integration testing

The APIs created in this section enable:
- Future dashboard UI enhancements for cost visualization
- Real-time notification features (WebSocket upgrades, etc.)
- Budget tracking and cost alerting features
- Notification center UI components

**Key Deliverables from This Section (available for use):**
- Cost analytics API for budget tracking
- Notifications API for user engagement
- Complete data access layer for cost and notification management

---

## ⚠️ Important Reminders

1. **Follow the Spec Exactly:** All code provided in this prompt comes from the integrated specification. Implement it as written.

2. **Reuse Existing Infrastructure:** Don't recreate what already exists. Import and use:
   - Supabase Auth via `requireAuth()` from `@/lib/supabase-server`
   - Supabase Client via `createServerSupabaseClient()`
   - Existing API response format: `{ success: true, data }` or `{ error, details }`

3. **Read-Only Nature:** This section is primarily read-only. It queries data created by previous sections:
   - Cost records created in Sections 3-4 during training execution
   - Notifications created in Sections 3-5 throughout lifecycle
   - Don't try to create new cost/notification records here

4. **Pattern Consistency:** Match existing patterns from previous sections:
   - API structure follows Section E02-E05 patterns
   - Authentication uses same `requireAuth()` pattern
   - Response format matches existing APIs
   - Error handling follows established conventions

5. **Security:** RLS policies on tables automatically enforce user data isolation. Always include `.eq('user_id', user.id)` in queries for defense in depth.

6. **Testing:** Verify that APIs return data created by previous sections. If no data appears, ensure:
   - Training jobs have been created (Section 3)
   - Jobs have run (Section 4)
   - Cost records and notifications were inserted during execution

---

## 📚 Reference Materials

### Files from Previous Work

#### Section E01: Foundation & Authentication
- `src/lib/supabase-server.ts` - Authentication helpers (`requireAuth()`, `createServerSupabaseClient()`)
- `src/lib/types/lora-training.ts` - Type definitions (can add CostRecord and Notification interfaces if needed)
- `supabase/migrations/20241223_create_lora_training_tables.sql` - Database schema reference

#### Sections E02-E05: API Patterns
- `src/app/api/datasets/route.ts` - Example of GET list endpoint with filtering
- `src/app/api/jobs/route.ts` - Example of POST create and GET list endpoints
- Pattern to follow: Authentication → Query → Aggregate → Return

### Infrastructure Patterns

**Authentication:**
```typescript
const { user, response } = await requireAuth(request);
if (response) return response;
```

**Database Query:**
```typescript
const supabase = createServerSupabaseClient();
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('user_id', user.id);
```

**API Response Success:**
```typescript
return NextResponse.json({
  success: true,
  data: { ... },
});
```

**API Response Error:**
```typescript
return NextResponse.json(
  { error: 'Error message', details: error.message },
  { status: 500 }
);
```

### Database Schema Reference

**lora_cost_records table:**
```sql
CREATE TABLE lora_cost_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES lora_training_jobs(id) ON DELETE SET NULL,
  cost_type VARCHAR(50) NOT NULL,        -- 'compute', 'storage', etc.
  amount DECIMAL(10, 2) NOT NULL,
  details JSONB,
  billing_period DATE NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
```

**lora_notifications table:**
```sql
CREATE TABLE lora_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,              -- 'job_queued', 'job_started', etc.
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium',  -- 'low', 'medium', 'high'
  read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

**Ready to implement Section E06, Prompt P01!**

---

## Section Completion Checklist

After completing this prompt (and this section):

### Implementation Complete
- [ ] All 3 API routes created
- [ ] All routes follow existing patterns
- [ ] TypeScript compiles without errors
- [ ] No linter warnings

### Functionality Verified
- [ ] Cost API returns aggregated data
- [ ] Cost API supports date filtering
- [ ] Cost API calculates totals correctly
- [ ] Notifications API returns user's notifications
- [ ] Notifications API supports unread filter
- [ ] Mark-as-read endpoint updates notification
- [ ] All endpoints enforce authentication

### Integration Tested
- [ ] Cost API returns records from Sections 3-5
- [ ] Notifications API returns notifications from Sections 3-5
- [ ] RLS policies enforce user data isolation
- [ ] API responses match expected format
- [ ] Error handling works for edge cases

### Ready for Next Steps
- [ ] APIs can be consumed by future UI components
- [ ] Cost data ready for dashboard visualization
- [ ] Notification system ready for real-time features
- [ ] Section E06 complete and ready to proceed

---

**End of Section E06 Execution Prompts**
