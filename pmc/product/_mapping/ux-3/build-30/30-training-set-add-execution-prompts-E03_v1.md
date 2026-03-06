# Spec 30 — E03: Cross-Page Selection + Server-Side Sorting + Enrichment Filter

**Version:** 1.0  
**Date:** 2026-03-04  
**Section:** E03 — Selection, Sorting, and Filtering UX Improvements  
**Prerequisites:** E01 (DB + API), E02 (Training Sets page + UI navigation) must be complete  
**Builds Upon:** E01 + E02 changes  

---

## Overview

This prompt implements the final set of UX improvements: cross-page conversation selection that persists across pagination, a page size selector, server-side sorting for the enrichment column, an enrichment status filter, and the enrichment label fix.

**What This Prompt Creates/Modifies:**
1. `conversation-store.ts` — add `addConversationsToSelection` and `deselectConversations` actions
2. `ConversationTable.tsx` — update `handleSelectAll` for cross-page merge, add server sort props, add enrichment column sort header, update enrichment label, update selection banner
3. `conversations/page.tsx` — add page size selector, server sort state, enrichment filter, pass new props to table
4. `conversation-storage-service.ts` — add `enrichment_status` filter to `listConversations()`
5. `conversations/route.ts` (API) — extract and pass `enrichment_status` filter

**What This Prompt Does NOT Create:**
- Database changes (done in E01)
- Training Sets monitoring page (done in E02)
- Bypass API endpoint (done in E01)

---

========================


# E03 Execution Prompt — Cross-Page Selection + Server-Side Sorting + Enrichment Filter

## Agent Instructions

**Before starting any work, you MUST:**

1. **Read this entire prompt** — it contains pre-verified facts and exact code
2. **Verify file locations** by reading each file listed before editing
3. **Execute the instructions as written** — do not re-investigate what has been verified

---

## Platform Context

**Bright Run LoRA Training Data Platform** — Next.js 14 (App Router) deployed on Vercel.

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router), TypeScript |
| Database | Supabase Pro (PostgreSQL) |
| UI | shadcn/UI + Tailwind CSS |
| State | TanStack Query v5, Zustand (conversation-store) |
| Deployment | Vercel |

### Codebase Root
`C:\Users\james\Master\BrightHub\BRun\v4-show`

### Design Token Rules  
**MANDATORY:** Use `bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`. **NEVER** use `zinc-*`, `slate-*`, or hardcoded `gray-*`.

### Files to Modify
```
src/
├── app/
│   ├── api/
│   │   └── conversations/route.ts           ← MODIFY (Task 5) — pass enrichment_status
│   └── (dashboard)/workbase/[id]/fine-tuning/
│       └── conversations/page.tsx           ← MODIFY (Task 3) — page size, server sort, enrichment filter
├── components/
│   └── conversations/
│       └── ConversationTable.tsx            ← MODIFY (Task 2) — selection, sort props, label
├── lib/
│   ├── types/conversations.ts              ← MODIFY (Task 4) — add enrichment_status to filters interface
│   └── services/
│       └── conversation-storage-service.ts  ← MODIFY (Task 4) — add enrichment_status filter
└── stores/
    └── conversation-store.ts               ← MODIFY (Task 1) — new selection actions
```

---

## E01 + E02 Build Artifacts (Already Completed)

From E01:
- DB columns `last_build_error` and `failed_conversation_ids` on `training_sets`
- GET response includes `lastBuildError` and `failedConversationIds`
- Bypass + reset API endpoints operational

From E02:
- Training Sets monitoring page at `/workbase/[id]/fine-tuning/training-sets`
- "Training Sets" button in conversations page header
- ConversationTable dropdown handles `failed` training sets
- `ExternalLink` already added to lucide-react imports in ConversationTable
- `useRouter` available in ConversationTable (added in E02 if not already present)

---

## Operating Principles

- Read ALL files listed before writing any code
- Use exact file paths from this prompt
- Do not rename or restructure existing files
- Do not break existing sort behavior for non-enrichment columns

---

## Current Architecture — Important Context

### Conversation Store (`conversation-store.ts`)

The Zustand store has these selection-related actions:
```typescript
toggleConversationSelection: (id: string) =>
  set((state) => ({
    selectedConversationIds: state.selectedConversationIds.includes(id)
      ? state.selectedConversationIds.filter((sid) => sid !== id)
      : [...state.selectedConversationIds, id],
  }), false, 'toggleConversationSelection'),

selectAllConversations: (ids: string[]) =>
  set({ selectedConversationIds: ids }, false, 'selectAllConversations'),

clearSelection: () =>
  set({ selectedConversationIds: [] }, false, 'clearSelection'),
```

**Root cause:** `selectAllConversations(ids)` **replaces** the entire selection array. When "Select All" is clicked on page 2, all page 1 selections are erased.

### ConversationTable — Current Select All
```typescript
const allSelected = conversations.length > 0 && conversations.every(c => selectedConversationIds.includes(c.conversationId));
const someSelected = selectedConversationIds.length > 0 && !allSelected;

const handleSelectAll = () => {
  if (allSelected) {
    clearSelection();
  } else {
    selectAllConversations(conversations.map(c => c.conversationId));
  }
};
```

### ConversationTable — Current Sorting
- **Client-side only** — `sortColumn` and `sortDirection` are local `useState` in the table
- `sortedConversations` is a `useMemo` that sorts the current page's `conversations` prop in memory
- The parent page does NOT pass sort params to the API — sort is cosmetic on current page only
- The API and `listConversations()` service both accept `sortBy`/`sortDirection` but the frontend never sends them

### Conversations Page — Current Pagination Footer
```tsx
<div className="mt-4 flex items-center justify-between">
  <div className="text-sm text-muted-foreground">
    {pagination.total > 0
      ? `Showing ${(pagination.page - 1) * pagination.limit + 1}–${Math.min(
          pagination.page * pagination.limit,
          pagination.total
        )} of ${pagination.total} conversations`
      : loading
      ? 'Loading...'
      : 'No conversations found'}
  </div>
  <div className="flex gap-2">
    <Button variant="outline" disabled={pagination.page === 1 || loading}
      onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}>
      Previous
    </Button>
    <Button variant="outline"
      disabled={pagination.page * pagination.limit >= pagination.total || loading}
      onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}>
      Next
    </Button>
  </div>
</div>
```

### Conversations Page — Current Filters + loadConversations
```typescript
const [filters, setFilters] = useState({
  status: 'all',
  tier: 'all',
  quality_min: 'all',
});

// ...

useEffect(() => {
  loadConversations();
}, [filters, pagination.page, workbaseId]);

async function loadConversations() {
  setLoading(true);
  try {
    const queryParams = new URLSearchParams({
      page: pagination.page.toString(),
      limit: pagination.limit.toString(),
      workbaseId,
      ...(filters.status !== 'all' && { status: filters.status }),
      ...(filters.tier !== 'all' && { tier: filters.tier }),
      ...(filters.quality_min !== 'all' && { quality_min: filters.quality_min }),
    });
    const response = await fetch(`/api/conversations?${queryParams}`);
    // ...
```

### Conversations Page — Current Imports
```typescript
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ConversationTable } from '@/components/conversations/ConversationTable';
import { ConversationDetailModal } from '@/components/conversations/ConversationDetailModal';
import { ConfirmationDialog } from '@/components/conversations/ConfirmationDialog';
import type { StorageConversation, Conversation, ConversationStatus } from '@/lib/types/conversations';
import { Plus, ListTodo, Layers } from 'lucide-react';
```
(Note: `Layers` was added in E02.)

### ConversationTable — Current Imports
```typescript
'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { 
  MoreVertical, Eye, Edit, Copy, Download, Trash2,
  ArrowUpDown, ArrowUp, ArrowDown, Check, X,
  FileJson, Plus, AlertTriangle, RotateCcw, ExternalLink,
} from 'lucide-react';
// ... other imports
```
(Note: `ExternalLink` was added in E02.)

### ConversationTable — Current Props Interface
After E02, this should be:
```typescript
interface ConversationTableProps {
  conversations: ConversationWithEnrichment[];
  isLoading: boolean;
  compactActions?: boolean;
  workbaseId?: string;
}
```

### StorageConversationFilters — Current Interface
**File:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\types\conversations.ts`
```typescript
export interface StorageConversationFilters {
  status?: StorageConversation['status'];
  tier?: StorageConversation['tier'];
  persona_id?: string;
  emotional_arc_id?: string;
  training_topic_id?: string;
  created_by?: string;
  quality_min?: number;
  quality_max?: number;
  workbase_id?: string;
}
```

### Conversations API Route — Current GET Handler
**File:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\conversations\route.ts` (87 lines)
```typescript
export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as any;
    const tier = searchParams.get('tier') as any;
    const persona_id = searchParams.get('persona_id') || undefined;
    const emotional_arc_id = searchParams.get('emotional_arc_id') || undefined;
    const training_topic_id = searchParams.get('training_topic_id') || undefined;
    const workbase_id = searchParams.get('workbaseId') || undefined;
    const quality_min = searchParams.get('quality_min')
      ? parseFloat(searchParams.get('quality_min')!) : undefined;
    const quality_max = searchParams.get('quality_max')
      ? parseFloat(searchParams.get('quality_max')!) : undefined;

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortDirection = (searchParams.get('sortDirection') || 'desc') as 'asc' | 'desc';

    const service = getConversationStorageService();
    const result = await service.listConversations(
      { status, tier, persona_id, emotional_arc_id, training_topic_id,
        workbase_id, quality_min, quality_max, created_by: user.id },
      { page, limit, sortBy: sortBy as any, sortDirection }
    );

    return NextResponse.json(result);
  } catch (error) {
    // ...
```

### conversation-storage-service.ts — Current listConversations Filter Section
```typescript
    // Apply filters
    if (filters?.status)            query = query.eq('status', filters.status);
    if (filters?.tier)              query = query.eq('tier', filters.tier);
    if (filters?.persona_id)        query = query.eq('persona_id', filters.persona_id);
    if (filters?.emotional_arc_id)  query = query.eq('emotional_arc_id', filters.emotional_arc_id);
    if (filters?.training_topic_id) query = query.eq('training_topic_id', filters.training_topic_id);
    if (filters?.created_by)        query = query.eq('created_by', filters.created_by);
    if (filters?.workbase_id)       query = query.eq('workbase_id', filters.workbase_id);
    if (filters?.quality_min !== undefined) query = query.gte('quality_score', filters.quality_min);
    if (filters?.quality_max !== undefined) query = query.lte('quality_score', filters.quality_max);
```

---

## Task 1: Add New Actions to Conversation Store

**File:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\stores\conversation-store.ts`  
**Lines:** 342 total

Read this file in full before editing.

### 1a. Add new actions to the `ConversationState` interface

Find the `ConversationState` interface. After the existing selection action declarations:
```typescript
  /**
   * Toggle selection of a single conversation
   */
  toggleConversationSelection: (id: string) => void;
  
  /**
   * Select ALL conversations (replaces entire selection)
   */
  selectAllConversations: (ids: string[]) => void;
  
  /**
   * Clear all selections
   */
  clearSelection: () => void;
```

**Add these two new action declarations immediately after `clearSelection`:**
```typescript
  /**
   * Add multiple conversations to the existing selection (merge, do not replace).
   * Used by "Select All" on a page to preserve selections from other pages.
   */
  addConversationsToSelection: (ids: string[]) => void;

  /**
   * Remove specific conversations from the selection (deselect page without clearing other pages).
   * Used when un-checking "Select All" on a page to only remove that page's selections.
   */
  deselectConversations: (ids: string[]) => void;
```

### 1b. Add implementations inside `create()`

Find the existing selection action implementations:
```typescript
        toggleConversationSelection: (id: string) =>
          set((state) => ({
            selectedConversationIds: state.selectedConversationIds.includes(id)
              ? state.selectedConversationIds.filter((sid) => sid !== id)
              : [...state.selectedConversationIds, id],
          }), false, 'toggleConversationSelection'),
        
        selectAllConversations: (ids: string[]) =>
          set({ selectedConversationIds: ids }, false, 'selectAllConversations'),
        
        clearSelection: () =>
          set({ selectedConversationIds: [] }, false, 'clearSelection'),
```

**Add these two new implementations immediately after `clearSelection`:**
```typescript
        addConversationsToSelection: (ids: string[]) =>
          set((state) => ({
            selectedConversationIds: [
              ...state.selectedConversationIds,
              ...ids.filter((id) => !state.selectedConversationIds.includes(id)),
            ],
          }), false, 'addConversationsToSelection'),

        deselectConversations: (ids: string[]) =>
          set((state) => {
            const removeSet = new Set(ids);
            return {
              selectedConversationIds: state.selectedConversationIds.filter(
                (id) => !removeSet.has(id)
              ),
            };
          }, false, 'deselectConversations'),
```

---

## Task 2: Update ConversationTable — Cross-Page Selection + Server Sort + Label Fix

**File:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\conversations\ConversationTable.tsx`  
**Lines:** ~843 total (may be slightly longer after E02 changes)

Read this file in full before editing.

### 2a. Update the props interface to accept server sort props

Find the current `ConversationTableProps` interface:
```typescript
interface ConversationTableProps {
  conversations: ConversationWithEnrichment[];
  isLoading: boolean;
  compactActions?: boolean;
  workbaseId?: string;
}
```

**Replace with:**
```typescript
interface ConversationTableProps {
  conversations: ConversationWithEnrichment[];
  isLoading: boolean;
  compactActions?: boolean;
  workbaseId?: string;
  serverSortBy?: string;
  serverSortDirection?: 'asc' | 'desc';
  onServerSort?: (column: string) => void;
}
```

### 2b. Destructure the new props

Find the component function signature:
```typescript
export const ConversationTable = React.memo(function ConversationTable({ conversations, isLoading, compactActions = true, workbaseId }: ConversationTableProps) {
```

**Replace with:**
```typescript
export const ConversationTable = React.memo(function ConversationTable({
  conversations,
  isLoading,
  compactActions = true,
  workbaseId,
  serverSortBy,
  serverSortDirection,
  onServerSort,
}: ConversationTableProps) {
```

### 2c. Destructure new store actions

Find the store destructure:
```typescript
  const { 
    selectedConversationIds, 
    toggleConversationSelection,
    selectAllConversations,
    clearSelection,
    showConfirm,
  } = useConversationStore();
```

**Replace with (add two new actions):**
```typescript
  const { 
    selectedConversationIds, 
    toggleConversationSelection,
    selectAllConversations,
    addConversationsToSelection,
    deselectConversations,
    clearSelection,
    showConfirm,
  } = useConversationStore();
```

### 2d. Replace `handleSelectAll` for cross-page merge

Find the current `handleSelectAll`:
```typescript
  const handleSelectAll = () => {
    if (allSelected) {
      clearSelection();
    } else {
      selectAllConversations(conversations.map(c => c.conversationId));
    }
  };
```

**Replace with (merge instead of replace):**
```typescript
  const handleSelectAll = () => {
    const currentPageIds = conversations.map((c) => c.conversationId);
    if (allSelected) {
      // Deselect only the current page — keep selections on other pages
      deselectConversations(currentPageIds);
    } else {
      // Merge current page into existing selection — do not replace
      addConversationsToSelection(currentPageIds);
    }
  };
```

### 2e. Update selection banner text to show cross-page indicator

Find the selection banner (~line 524):
```tsx
          <span className="text-sm text-muted-foreground">
            {selectedConversationIds.length} conversation{selectedConversationIds.length !== 1 ? 's' : ''} selected
          </span>
```

**Replace with:**
```tsx
          <span className="text-sm text-muted-foreground">
            {selectedConversationIds.length} conversation
            {selectedConversationIds.length !== 1 ? 's' : ''} selected
            {selectedConversationIds.length > conversations.length && (
              <span className="text-xs ml-1 text-duck-blue">
                (across multiple pages)
              </span>
            )}
          </span>
```

### 2f. Fix enrichment status label — "Not Enriched" for `not_started`

Find the `formatEnrichmentStatus` function:
```typescript
  const formatEnrichmentStatus = (status: string): string => {
    if (!status || status === 'not_started') return 'Pending';
    return status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };
```

**Replace with:**
```typescript
  const formatEnrichmentStatus = (status: string): string => {
    if (!status || status === 'not_started') return 'Not Enriched';
    return status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };
```

### 2g. Add sort click handler and icon to Enrichment column header

Find the Enrichment column header in the `<TableHeader>` section:
```tsx
            <TableHead>Enrichment</TableHead>
```

**Replace with:**
```tsx
            <TableHead
              className={onServerSort ? 'cursor-pointer' : ''}
              onClick={() => onServerSort?.('enrichment_status')}
            >
              <div className="flex items-center gap-2">
                Enrichment
                {onServerSort && (
                  serverSortBy === 'enrichment_status'
                    ? (serverSortDirection === 'asc'
                        ? <ArrowUp className="h-4 w-4" />
                        : <ArrowDown className="h-4 w-4" />)
                    : <ArrowUpDown className="h-4 w-4" />
                )}
              </div>
            </TableHead>
```

**Note:** `ArrowUp`, `ArrowDown`, and `ArrowUpDown` are already imported in the lucide-react import line.

---

## Task 3: Update Conversations Page — Page Size + Server Sort + Enrichment Filter

**File:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\fine-tuning\conversations\page.tsx`  
**Lines:** ~244 total (may be slightly longer after E02 changes)

Read this file in full before editing.

### 3a. Add server sort state

Find the filters and pagination state:
```typescript
  const [filters, setFilters] = useState({
    status: 'all',
    tier: 'all',
    quality_min: 'all',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
  });
```

**Replace with (add enrichment_status filter + server sort state):**
```typescript
  const [filters, setFilters] = useState({
    status: 'all',
    tier: 'all',
    quality_min: 'all',
    enrichment_status: 'all',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
  });
  const [serverSort, setServerSort] = useState<{
    sortBy: string;
    sortDirection: 'asc' | 'desc';
  }>({ sortBy: 'created_at', sortDirection: 'desc' });
```

### 3b. Update the `useEffect` dependency array

Find the `useEffect`:
```typescript
  useEffect(() => {
    loadConversations();
  }, [filters, pagination.page, workbaseId]);
```

**Replace with (add `pagination.limit` and `serverSort`):**
```typescript
  useEffect(() => {
    loadConversations();
  }, [filters, pagination.page, pagination.limit, serverSort, workbaseId]);
```

### 3c. Update `loadConversations` to pass sort params and enrichment filter

Find `loadConversations`:
```typescript
  async function loadConversations() {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        workbaseId,
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.tier !== 'all' && { tier: filters.tier }),
        ...(filters.quality_min !== 'all' && { quality_min: filters.quality_min }),
      });
```

**Replace with (add sortBy, sortDirection, enrichment_status):**
```typescript
  async function loadConversations() {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        workbaseId,
        sortBy: serverSort.sortBy,
        sortDirection: serverSort.sortDirection,
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.tier !== 'all' && { tier: filters.tier }),
        ...(filters.quality_min !== 'all' && { quality_min: filters.quality_min }),
        ...(filters.enrichment_status !== 'all' && { enrichment_status: filters.enrichment_status }),
      });
```

### 3d. Add `onServerSort` callback and pass to ConversationTable

Add this function AFTER the `loadConversations` function (before the `return` statement):
```typescript
  const handleServerSort = (column: string) => {
    setServerSort((prev) => ({
      sortBy: column,
      sortDirection:
        prev.sortBy === column && prev.sortDirection === 'asc' ? 'desc' : 'asc',
    }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };
```

Find the `<ConversationTable>` JSX (likely around line 195-200):
```tsx
      <ConversationTable
        conversations={transformedConversations}
        isLoading={loading}
        compactActions={false}
        workbaseId={workbaseId}
      />
```

**Replace with (add server sort props):**
```tsx
      <ConversationTable
        conversations={transformedConversations}
        isLoading={loading}
        compactActions={false}
        workbaseId={workbaseId}
        serverSortBy={serverSort.sortBy}
        serverSortDirection={serverSort.sortDirection}
        onServerSort={handleServerSort}
      />
```

### 3e. Add enrichment status filter dropdown to the filters section

Find the filters section in the JSX — it has `<Select>` dropdowns for status, tier, and quality_min. After the last existing filter (quality_min), add the enrichment status filter:

```tsx
        <Select
          value={filters.enrichment_status}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, enrichment_status: value }))
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by enrichment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Enrichment</SelectItem>
            <SelectItem value="not_started">Not Enriched</SelectItem>
            <SelectItem value="enrichment_in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Enriched</SelectItem>
            <SelectItem value="failed">Enrichment Failed</SelectItem>
          </SelectContent>
        </Select>
```

### 3f. Replace pagination footer with page size selector

Find the current pagination footer:
```tsx
      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {pagination.total > 0
            ? `Showing ${(pagination.page - 1) * pagination.limit + 1}–${Math.min(
                pagination.page * pagination.limit,
                pagination.total
              )} of ${pagination.total} conversations`
            : loading
            ? 'Loading...'
            : 'No conversations found'}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={pagination.page === 1 || loading}
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}>
            Previous
          </Button>
          <Button variant="outline"
            disabled={pagination.page * pagination.limit >= pagination.total || loading}
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}>
            Next
          </Button>
        </div>
      </div>
```

**Replace with (add page size selector):**
```tsx
      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            {pagination.total > 0
              ? `Showing ${(pagination.page - 1) * pagination.limit + 1}–${Math.min(
                  pagination.page * pagination.limit,
                  pagination.total
                )} of ${pagination.total} conversations`
              : loading
              ? 'Loading...'
              : 'No conversations found'}
          </div>
          {/* Page size selector */}
          <Select
            value={pagination.limit.toString()}
            onValueChange={(value) => {
              setPagination((prev) => ({ ...prev, limit: parseInt(value), page: 1 }));
            }}
          >
            <SelectTrigger className="w-[110px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
              <SelectItem value="75">75 per page</SelectItem>
              <SelectItem value="100">100 per page</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={pagination.page === 1 || loading}
            onClick={() =>
              setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
            }
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={
              pagination.page * pagination.limit >= pagination.total || loading
            }
            onClick={() =>
              setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
            }
          >
            Next
          </Button>
        </div>
      </div>
```

---

## Task 4: Add `enrichment_status` Filter to Backend Service

### 4a. Update `StorageConversationFilters` interface

**File:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\types\conversations.ts`

Find the `StorageConversationFilters` interface:
```typescript
export interface StorageConversationFilters {
  status?: StorageConversation['status'];
  tier?: StorageConversation['tier'];
  persona_id?: string;
  emotional_arc_id?: string;
  training_topic_id?: string;
  created_by?: string;
  quality_min?: number;
  quality_max?: number;
  workbase_id?: string;
}
```

**Replace with (add `enrichment_status`):**
```typescript
export interface StorageConversationFilters {
  status?: StorageConversation['status'];
  tier?: StorageConversation['tier'];
  persona_id?: string;
  emotional_arc_id?: string;
  training_topic_id?: string;
  created_by?: string;
  quality_min?: number;
  quality_max?: number;
  workbase_id?: string;
  enrichment_status?: string;
}
```

### 4b. Add filter logic to `listConversations()`

**File:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\conversation-storage-service.ts`

Find the filter application section in `listConversations()`:
```typescript
    if (filters?.quality_min !== undefined) query = query.gte('quality_score', filters.quality_min);
    if (filters?.quality_max !== undefined) query = query.lte('quality_score', filters.quality_max);
```

**Add this line immediately after `quality_max` filter:**
```typescript
    if (filters?.enrichment_status) query = query.eq('enrichment_status', filters.enrichment_status);
```

---

## Task 5: Update Conversations API Route — Pass `enrichment_status` Filter

**File:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\conversations\route.ts`  
**Lines:** ~87 total

Read this file in full before editing.

Find the filter extraction section:
```typescript
    const quality_max = searchParams.get('quality_max')
      ? parseFloat(searchParams.get('quality_max')!) : undefined;
```

**Add this line immediately after `quality_max`:**
```typescript
    const enrichment_status = searchParams.get('enrichment_status') || undefined;
```

Find the `service.listConversations()` call:
```typescript
    const result = await service.listConversations(
      { status, tier, persona_id, emotional_arc_id, training_topic_id,
        workbase_id, quality_min, quality_max, created_by: user.id },
      { page, limit, sortBy: sortBy as any, sortDirection }
    );
```

**Replace with (add `enrichment_status`):**
```typescript
    const result = await service.listConversations(
      { status, tier, persona_id, emotional_arc_id, training_topic_id,
        workbase_id, quality_min, quality_max, enrichment_status, created_by: user.id },
      { page, limit, sortBy: sortBy as any, sortDirection }
    );
```

---

## Task 6: Validate TypeScript Compilation

After completing all changes, run:

```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show" && npx tsc --noEmit 2>&1 | head -60
```

Fix any TypeScript errors before proceeding.

---

## TypeScript Notes

1. When modifying `ConversationTable.tsx` for enrichment sorting, note that `sortColumn` state is typed as `keyof Conversation`. The `enrichment_status` field is NOT on the `Conversation` interface — it's on `ConversationWithEnrichment`. The enrichment sort is **server-side** so the local `sortedConversations` useMemo does not need to handle it. No type change to `sortColumn` is required.

2. The `addConversationsToSelection` and `deselectConversations` actions need to be added to both the `ConversationState` interface AND the `create()` implementation. Make sure both are in sync.

3. The `enrichment_status` filter type is `string` (not enum) because the API route receives it as a query param string.

---

## Verification Checklist

### Cross-Page Selection
- [ ] Selecting conversations on page 1 and navigating to page 2 retains page 1 selections
- [ ] Clicking "Select All" on page 2 ADDS page 2 conversations to the existing selection (does not replace page 1)
- [ ] Clicking "Select All" again on page 2 (when all page 2 are selected) removes page 2 selections only (page 1 still selected)
- [ ] Selection banner shows total across all pages, with "(across multiple pages)" indicator when > current page size
- [ ] "Build Training Set" includes all selected conversations across pages

### Page Size Selector
- [ ] Page size dropdown shows in the pagination footer with options: 25, 50, 75, 100
- [ ] Changing page size reloads the conversation list with the new limit and resets to page 1
- [ ] Pagination counter updates correctly (e.g. "Showing 1–50 of 200")

### Enrichment Column Sorting
- [ ] Enrichment column header shows sort icon (↕) when not sorted by enrichment
- [ ] Clicking Enrichment header triggers a server-side reload with `sortBy=enrichment_status`
- [ ] Sort cycles: first click = ascending (Not Enriched first), second click = descending
- [ ] Sort icon updates to ↑ or ↓ based on direction
- [ ] Sorting is across all pages — navigating to page 2 shows the next batch in sort order

### Enrichment Filter
- [ ] Enrichment filter dropdown shows in the filters row
- [ ] Selecting "Not Enriched" filters to conversations with `enrichment_status = 'not_started'`
- [ ] Selecting "Enrichment Failed" filters to conversations with `enrichment_status = 'failed'`
- [ ] Filter resets to page 1 on change

### Enrichment Label
- [ ] Conversations with `enrichment_status = 'not_started'` now display "Not Enriched" (was "Pending")
- [ ] All other enrichment statuses remain unchanged

### TypeScript
- [ ] TypeScript compiles without errors

---

## Complete File Change Summary (All 3 Prompts)

| File | E01 | E02 | E03 |
|------|-----|-----|-----|
| DB migration (SAOL) | ✓ Add columns | — | — |
| `rebuild-training-set.ts` | ✓ Catch + success | — | — |
| `build-training-set.ts` | ✓ Catch + success | — | — |
| `training-sets/route.ts` GET | ✓ Add fields | — | — |
| `bypass/route.ts` | ✓ New file | — | — |
| `training-sets/page.tsx` | — | ✓ New file | — |
| `conversations/page.tsx` | — | ✓ Training Sets button | ✓ Page size, sort, enrichment filter |
| `ConversationTable.tsx` | — | ✓ Failed dropdown | ✓ Selection, sort props, label |
| `conversation-store.ts` | — | — | ✓ New actions |
| `conversation-storage-service.ts` | — | — | ✓ Enrichment filter |
| `conversations.ts` (types) | — | — | ✓ Add enrichment_status to interface |
| `conversations/route.ts` (API) | — | — | ✓ Pass enrichment_status |

---

**END OF E03 PROMPT**

+++++++++++++++++



