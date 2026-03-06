# Build Section E06

**Product**: PIPELINE  
**Section**: 6 - Cost Tracking & Notifications  
**Generated**: 2025-12-26  
**Source**: 04e-pipeline-integrated-extension-spec_v1.md

---

## SECTION 6: Cost Tracking & Notifications - INTEGRATED

**Extension Status**: ✅ Transformed to use existing infrastructure  
**Original Infrastructure**: Separate notification service, external analytics  
**Actual Infrastructure**: Database tables with React Query polling, in-app notifications

---

### Overview (from original spec)

Track training costs in real-time and notify users of important events throughout the training lifecycle.

**User Value**: Transparent cost tracking and timely notifications keep users informed and in control

---

### Dependencies

**Codebase Prerequisites** (MUST exist before this section):
- ✅ Section 1: `lora_cost_records` and `lora_notifications` tables
- ✅ Section 4: Cost tracking integrated into job processing

**Previous Section Prerequisites**:
- Sections 4-5: Cost records and notifications already being created

---

### Features & Requirements (INTEGRATED)

#### FR-6.1: Cost Dashboard API

**Type**: API Endpoint

**Description**: Aggregate cost data for analytics and budget tracking.

**Implementation Strategy**: EXTENSION (using existing Supabase patterns)

---

**File**: `src/app/api/costs/route.ts`

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

---

#### FR-6.2: Notifications API

**Type**: API Endpoints

**Description**: Fetch and manage user notifications.

**Implementation Strategy**: EXTENSION (using existing patterns)

---

**File**: `src/app/api/notifications/route.ts`

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

**File**: `src/app/api/notifications/[id]/read/route.ts`

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

---

### Section Summary

**What Was Added**:
- API route: `GET /api/costs` (cost analytics with aggregation)
- API route: `GET /api/notifications` (list notifications with unread count)
- API route: `PATCH /api/notifications/[id]/read` (mark as read)

**What Was Reused**:
- Cost tracking already integrated in Section 4
- Notifications already being created throughout the system
- Existing API patterns and authentication

**Integration Points**:
- Sections 3-5: Cost records created during training
- Sections 3-5: Notifications created for all key events
- Database: `lora_cost_records` and `lora_notifications` tables

**Note**: UI components for cost dashboard and notifications bell are intentionally minimal in this spec. These can be implemented as simple additions to the existing dashboard layout.

---
