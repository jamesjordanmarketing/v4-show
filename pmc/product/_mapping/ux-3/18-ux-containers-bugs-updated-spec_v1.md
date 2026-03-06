# Implementation Specification — Workbase Conversations Page Upgrade
**Document:** `18-ux-containers-bugs-updated-spec_v1.md`
**Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\`
**Written:** 2026-03-02
**Status:** Ready for implementation — zero context agent

---

## 1. Platform Background (Read Before Implementing)

### What This Application Does

**Bright Run LoRA Training Data Platform** — a Next.js 14 (App Router) application that generates high-quality AI training conversations for fine-tuning large language models. The platform enables domain experts to generate conversation datasets, review and approve them, then export them as LoRA-ready training files.

**Tech Stack:**
- Framework: Next.js 14 with App Router (`src/app/`)
- Language: TypeScript (relaxed mode — no strict null checks required)
- Database: Supabase (PostgreSQL + Storage)
- UI: shadcn/ui components + Tailwind CSS
- State: React Query v5 (`@tanstack/react-query`) for server state, Zustand (`@/stores/`) for client UI state
- Icons: Lucide React

**Design Token Rules — Mandatory:**
- Backgrounds: `bg-background` (cream), `bg-card` (white), `bg-muted` (muted cream)
- Text: `text-foreground` (charcoal), `text-muted-foreground` (gray)
- Borders: `border-border`
- Brand accent: `text-duck-blue`, `bg-duck-blue` (sky blue `#3AA1EC`)
- Primary action: `bg-primary` (yellow), `text-primary-foreground`
- **Zero `zinc-*` or hardcoded `gray-*` color classes in any new or modified code**

### Work Base Architecture

Every operation is scoped to a **workbase** entity (`workbases` table, identified by UUID). Routes live under `/workbase/[id]/`. The sidebar navigation wraps all child pages via `src/app/(dashboard)/workbase/[id]/layout.tsx`.

The conversations sub-section lives at:
- **List page (the file we are modifying):** `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx`
- **Generator page (do not touch):** `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/generate/page.tsx`

### Conversation Data Layer

There are two conversation type shapes in this codebase:

| Type | Location | Field Convention | Where Used |
|------|----------|-----------------|------------|
| `StorageConversation` | `src/lib/types/conversations.ts` | `snake_case` — matches DB column names directly | Returned by `GET /api/conversations` |
| `Conversation` | `src/lib/types/conversations.ts` | `camelCase` — legacy/component convention | Required by `<ConversationTable>`, `<ConversationDetailModal>`, most UI components |

**The API always returns `StorageConversation[]`.** All UI components that display rich data expect `Conversation[]`. A `transformStorageToConversation()` function (defined in the legacy `/conversations` page) bridges the gap.

### Existing Components Being Imported (Do Not Modify These Files)

| Component | File | What It Does |
|-----------|------|-------------|
| `<ConversationTable>` | `src/components/conversations/ConversationTable.tsx` | Full-featured sortable table with 9 columns, actions dropdown (approve/reject/delete/enrich/download), "Create Training Files" bulk action, keyboard navigation |
| `<ConversationDetailModal>` | `src/components/conversations/ConversationDetailModal.tsx` | Store-driven modal for viewing full conversation detail; opened via `useConversationStore.openConversationDetail(id)` |
| `<ConfirmationDialog>` | `src/components/conversations/ConfirmationDialog.tsx` | Store-driven alert dialog used by `ConversationTable` delete action |

Both `<ConversationDetailModal>` and `<ConfirmationDialog>` are driven by `useConversationStore` (Zustand, `src/stores/conversation-store.ts`). They must be **mounted in the page** even though they are triggered from inside `<ConversationTable>`.

### The ConversationTable Props Interface

```typescript
interface ConversationTableProps {
  conversations: ConversationWithEnrichment[]; // Conversation & Partial<Pick<StorageConversation, 'enrichment_status' | 'raw_response_path' | 'enriched_file_path'>>
  isLoading: boolean;
  compactActions?: boolean; // false = show full buttons in Actions column (use this for the workbase page)
}
```

The table internally uses `useConversationStore` for selection management — it does NOT take `selectedIds` as a prop.

### SAOL Reference (for DB Verification Steps Only)

SAOL is used for **agent-side database verification and inspection only**. Application code calls API routes. SAOL scripts run from the terminal at `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\`.

```javascript
// Standard SAOL setup:
require('dotenv').config({ path: '../.env.local' });
const saol = require('.');

// Query:
await saol.agentQuery({ table: 'conversations', select: 'id, workbase_id, status', limit: 5 });

// SQL:
await saol.agentExecuteSQL({ sql: 'SELECT COUNT(*) FROM conversations WHERE workbase_id IS NOT NULL', transport: 'pg', transaction: false });
```

---

## 2. Problem Statement

The current workbase conversations page at `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx` was implemented as a minimal placeholder. It is missing critical functionality that exists in the legacy standalone `/conversations` page.

**What the current page has (minimal):**
- Text search (name, persona, emotion, topic)
- 5-column table: Checkbox, Title/ID, Persona, Emotion, Status
- "Build Training Set" bulk action (different API than what's needed)
- "New Conversation" button → navigates to `/generate`

**What the current page is missing (required):**
- Sortable column headers (click to sort any column)
- All 9 columns: Checkbox, Conversation (title + ID), Tier, Status, Quality Score, Turns, Enrichment Status, Created At, Actions
- Actions column per row: approve/reject/delete + enrichment/download pipeline actions
- "Create Training Files" bulk action with dropdown to create new or add to existing training file
- Status filter dropdown
- Tier filter dropdown
- Quality score minimum filter dropdown
- Pagination (Previous/Next with item count display)
- `<ConversationDetailModal>` mounted for store-driven conversation detail view
- `<ConfirmationDialog>` mounted for store-driven delete confirmation

---

## 3. Solution Summary

**Replace the body of** `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx` **completely** with a page that mirrors the legacy `/conversations` page pattern, scoped to the current `workbaseId`.

The only new piece of logic (vs. the legacy page) is passing `workbaseId` as a query param to the fetch. Everything else is already working in the legacy page and components.

---

## 4. The One File to Modify

**File:** `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx`

**Action:** Replace the entire file contents with the code specified in Section 5.

---

## 5. Complete New File Contents

Replace `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx` with exactly the following:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConversationTable } from '@/components/conversations/ConversationTable';
import { ConversationDetailModal } from '@/components/conversations/ConversationDetailModal';
import { ConfirmationDialog } from '@/components/conversations/ConfirmationDialog';
import type { StorageConversation, Conversation, ConversationStatus } from '@/lib/types/conversations';
import { Plus } from 'lucide-react';

/**
 * Transform StorageConversation (snake_case from API) to Conversation (camelCase for components).
 * Mirrors the identical function in src/app/(dashboard)/conversations/page.tsx.
 */
function transformStorageToConversation(
  storage: StorageConversation
): Conversation & Partial<Pick<StorageConversation, 'enrichment_status' | 'raw_response_path' | 'enriched_file_path'>> {
  const statusMap: Record<StorageConversation['status'], ConversationStatus> = {
    pending_review: 'pending_review',
    approved: 'approved',
    rejected: 'rejected',
    archived: 'none',
  };

  return {
    id: storage.id,
    conversationId: storage.conversation_id,
    title: storage.conversation_name || undefined,
    persona: storage.persona_key || '',
    emotion: storage.starting_emotion || '',
    tier: storage.tier,
    status: statusMap[storage.status],
    category: storage.category ? [storage.category] : [],
    qualityScore: storage.quality_score || undefined,
    turnCount: storage.turn_count,
    totalTokens: 0,
    parameters: {},
    reviewHistory: [],
    retryCount: 0,
    createdAt: storage.created_at,
    updatedAt: storage.updated_at,
    createdBy: storage.created_by || '',
    enrichment_status: storage.enrichment_status,
    raw_response_path: storage.raw_response_path,
    enriched_file_path: storage.enriched_file_path,
  };
}

export default function WorkbaseConversationsPage() {
  const params = useParams();
  const router = useRouter();
  const workbaseId = params.id as string;

  const [conversations, setConversations] = useState<StorageConversation[]>([]);
  const [loading, setLoading] = useState(true);
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
      const data = await response.json();

      setConversations(data.conversations || []);
      setPagination((prev) => ({ ...prev, total: data.total || 0 }));
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }

  const transformedConversations = conversations.map(transformStorageToConversation);

  return (
    <div className="p-6 bg-background min-h-full">
      {/* Page Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Conversations</h1>
          <p className="text-muted-foreground mt-1">
            Manage training conversations for this Work Base
          </p>
        </div>
        <Button
          size="sm"
          onClick={() =>
            router.push(`/workbase/${workbaseId}/fine-tuning/conversations/generate`)
          }
        >
          <Plus className="h-4 w-4 mr-2" />
          New Conversation
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4 flex-wrap">
        <Select
          value={filters.status}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, status: value }))
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.tier}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, tier: value }))
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="template">Template</SelectItem>
            <SelectItem value="scenario">Scenario</SelectItem>
            <SelectItem value="edge_case">Edge Case</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.quality_min}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, quality_min: value }))
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Min quality score" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Quality</SelectItem>
            <SelectItem value="8.0">8.0+ (Excellent)</SelectItem>
            <SelectItem value="7.0">7.0+ (Good)</SelectItem>
            <SelectItem value="6.0">6.0+ (Fair)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Full-Featured Conversation Table */}
      <ConversationTable
        conversations={transformedConversations}
        isLoading={loading}
        compactActions={false}
      />

      {/* Modals — must be mounted for store-driven state to render */}
      <ConversationDetailModal />
      <ConfirmationDialog />

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
    </div>
  );
}
```

---

## 6. What This Change Does (and Why)

### 6a. Removed from the old page
- `useConversations` React Query hook (replaced by direct `fetch()` with pagination)
- `useTrainingSets` and `useCreateTrainingSet` hooks (replaced by `ConversationTable`'s built-in "Create Training Files" feature)
- Minimal 5-column hand-written table
- Simple text search input
- "Training Sets" card below the table
- `StorageConversation` type cast workaround

### 6b. Added to the new page
- `transformStorageToConversation()` — maps `StorageConversation` (snake_case from API) to `Conversation` (camelCase for components). This is an exact copy of the same function in `src/app/(dashboard)/conversations/page.tsx`.
- Direct `fetch()` with `loadConversations()` — same pattern as the legacy page, with `workbaseId` added as a required query param.
- Status / Tier / Quality filter dropdowns — same set as the legacy page.
- `<ConversationTable conversations={...} isLoading={...} compactActions={false} />` — provides all 9 columns, sorting, actions column, and "Create Training Files" bulk action.
- `<ConversationDetailModal />` and `<ConfirmationDialog />` — mounted so that store-driven modals work (delete confirmation, detail view).
- Pagination controls with item count display.

### 6c. Key difference from the legacy page
The only functional difference from `src/app/(dashboard)/conversations/page.tsx` is `workbaseId` in the fetch params:
```typescript
workbaseId,  // ← scopes all data to this workbase
```
This is added to the `URLSearchParams` in `loadConversations()`. The `GET /api/conversations` route already supports and applies the `workbaseId` filter.

---

## 7. Files NOT to Touch

| File | Reason |
|------|--------|
| `src/app/(dashboard)/conversations/page.tsx` | Legacy page — must remain operational |
| `src/components/conversations/ConversationTable.tsx` | Already working — do not modify |
| `src/components/conversations/ConversationDetailModal.tsx` | Already working — do not modify |
| `src/components/conversations/ConfirmationDialog.tsx` | Already working — do not modify |
| `src/components/conversations/conversation-actions.tsx` | Already working — do not modify |
| `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/generate/page.tsx` | Already working — do not touch |
| `src/hooks/use-conversations.ts` | Hook used by legacy components — do not touch |
| `src/lib/types/conversations.ts` | Types already correct — do not touch |
| `src/stores/conversation-store.ts` | Store already correct — do not touch |
| All Session 11 design token files (`globals.css`, `tailwind.config.js`, `polish.css`) | Design palette is complete — do not touch |

---

## 8. Implementation Order

| Step | Action | Risk |
|------|--------|------|
| 1 | Read the current `conversations/page.tsx` file fully before making any changes | Zero |
| 2 | Replace the entire file contents with the code in Section 5 | Low |
| 3 | Run `npx tsc -p tsconfig.json --noEmit` from the workspace root to check for TypeScript errors | Zero |
| 4 | Run `ReadLints` on the modified file to check for lint errors | Zero |
| 5 | Fix any TypeScript or lint errors before committing | Low |

---

## 9. TypeScript Verification

After the file replacement, run from the workspace root:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show"
npx tsc -p tsconfig.json --noEmit
```

**Expected result:** Zero TypeScript errors. The types involved are:

- `transformStorageToConversation` returns `Conversation & Partial<Pick<StorageConversation, 'enrichment_status' | 'raw_response_path' | 'enriched_file_path'>>` — this is exactly the `ConversationWithEnrichment` type that `ConversationTable` expects.
- `ConversationTable` expects `ConversationWithEnrichment[]` — satisfies the above.
- `ConversationDetailModal` and `ConfirmationDialog` take no props.
- `filters` object uses plain `string` values — no type issues.

**If you see errors:** The most likely issue is an import path typo. Verify:
- `@/components/conversations/ConversationTable` exists at `src/components/conversations/ConversationTable.tsx`
- `@/components/conversations/ConversationDetailModal` exists at `src/components/conversations/ConversationDetailModal.tsx`
- `@/components/conversations/ConfirmationDialog` exists at `src/components/conversations/ConfirmationDialog.tsx`

---

## 10. SAOL Database Verification (Post-Deploy)

After deploying to Vercel, use SAOL from the terminal to verify the data layer is healthy.

### Verify conversations exist with workbase_id
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops"
node -e "
require('dotenv').config({ path: '../.env.local' });
const saol = require('.');
saol.agentExecuteSQL({
  sql: 'SELECT workbase_id, COUNT(*) as count FROM conversations GROUP BY workbase_id ORDER BY count DESC LIMIT 5',
  transport: 'pg',
  transaction: false
}).then(r => console.log(JSON.stringify(r.data, null, 2)));
"
```

### Verify API returns workbase-filtered conversations
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops"
node -e "
require('dotenv').config({ path: '../.env.local' });
const saol = require('.');
saol.agentQuery({
  table: 'conversations',
  select: 'id, conversation_name, status, workbase_id',
  filters: { workbase_id: '<YOUR_WORKBASE_ID_HERE>' },
  limit: 5
}).then(r => console.log(JSON.stringify(r, null, 2)));
"
```

Replace `<YOUR_WORKBASE_ID_HERE>` with the actual workbase UUID you are testing against.

---

## 11. QA Checklist (Post-Deploy to Vercel)

Test on `https://v4-show.vercel.app` while logged in as the correct user for the workbase being tested.

### Core Functionality
- [ ] `/workbase/[id]/fine-tuning/conversations` loads without errors
- [ ] Conversations appear in the table (not empty unless no conversations exist for that workbase)
- [ ] Each conversation shows: Conversation name/ID, Tier badge, Status badge, Quality score, Turn count, Enrichment status, Created date
- [ ] "New Conversation" button navigates to `/workbase/[id]/fine-tuning/conversations/generate`

### Sorting
- [ ] Clicking the "Conversation" column header sorts by title
- [ ] Clicking the "Tier" column header sorts by tier
- [ ] Clicking the "Status" column header sorts by status
- [ ] Clicking the "Quality" column header sorts by quality score
- [ ] Clicking the "Created" column header sorts by created date
- [ ] Clicking the same header again reverses sort direction (asc → desc → asc)

### Filtering
- [ ] Status dropdown: selecting "Pending Review" shows only pending conversations
- [ ] Status dropdown: selecting "Approved" shows only approved conversations
- [ ] Tier dropdown: selecting "Template" shows only template-tier conversations
- [ ] Quality dropdown: selecting "8.0+" shows only conversations with quality ≥ 8.0
- [ ] Resetting all dropdowns back to "All" shows all conversations again

### Pagination
- [ ] If more than 25 conversations exist, only 25 are shown at a time
- [ ] "Previous" button is disabled on page 1
- [ ] "Next" button advances to the next page
- [ ] Item count (e.g., "Showing 1–25 of 66 conversations") is displayed correctly

### Row Actions
- [ ] Clicking the `⋮` (MoreVertical) menu on a row shows: Approve, Reject, Edit, Duplicate, Move to Review, Export, Delete
- [ ] Clicking "Approve" updates that conversation's status badge to "approved"
- [ ] Clicking "Reject" updates that conversation's status badge to "rejected"
- [ ] Clicking "Delete" opens a confirmation dialog before deleting

### Bulk Actions
- [ ] Checking a row's checkbox selects that conversation
- [ ] Checking the header checkbox selects all visible conversations
- [ ] When at least one conversation is selected, "Create Training Files" button appears
- [ ] "Create Training Files" dropdown shows: "Create New Training File" + any existing training files
- [ ] Clicking "Create New Training File" opens a dialog to name and describe the file
- [ ] Submitting the dialog creates a training file and clears the selection

### Modals
- [ ] `<ConfirmationDialog>` appears when Delete is clicked from the row action menu
- [ ] `<ConversationDetailModal>` can open (if triggered — may require a separate mechanism to open it)

### Scope Isolation
- [ ] Conversations from one workbase do NOT appear on another workbase's conversations page
- [ ] An empty workbase shows "No conversations found" in the table, not an error

---

## 12. Known Limitations (Not in Scope for This Spec)

| Limitation | Notes |
|-----------|-------|
| Row click does not open detail modal | `ConversationTable` does not fire `openConversationDetail` on row click. The modal is mount-ready but has no trigger. A future spec should add `onClick={() => openConversationDetail(conversation.conversationId)}` to `TableRow` in `ConversationTable.tsx`. |
| `statusColors` in ConversationTable uses some hardcoded color values | These are in the existing `ConversationTable.tsx` component which we are not allowed to modify. They are acceptable for now. |
| Text search removed | The old minimal page had a text search input. `ConversationTable` does not have an inline search. The `FilterConfig.searchQuery` API param can be added as a future enhancement with a search input above the table. |
| "Training Sets" card removed | The old page had a "Training Sets" section. It called `useCreateTrainingSet(workbaseId)` which creates a `training_sets` record. The new page's "Create Training Files" action calls `/api/training-files` instead. These are two different tables/features. If the `training_sets` table integration is needed, it should be addressed in a separate spec. |
