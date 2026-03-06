# Test Results Browser & Conversations Collation - Page Specification

**Version:** 1.0  
**Date:** January 26, 2026  
**Status:** Draft Specification  
**Purpose:** Complete implementation specification for Test Results Browser and Conversations Collation pages

---

## Executive Summary

This specification defines two interconnected features:

1. **Test Results Browser** (`/pipeline/results`) - A centralized view of all A/B test results across all adapter jobs for the current user
2. **Conversations Collation** (`/pipeline/collations`) - A page for managing and downloading collated conversation datasets

These pages enable users to:
- View all submitted prompts with status indicators
- Select multiple tests for batch collation
- Download structured JSON datasets for evaluation
- Build multi-turn conversation analysis files

---

## Part 1: Test Results Browser Page

### 1.1 Route & Location

```
Route: /pipeline/results
File: src/app/(dashboard)/pipeline/results/page.tsx
```

### 1.2 Page Components

#### Header Section
```
┌─────────────────────────────────────────────────────────────────────┐
│ Test Results Browser                                                │
│ Browse and collate all A/B test results from your adapter tests    │
│                                                                     │
│ [Filter: All Jobs ▼] [Filter: Date Range ▼] [🔍 Search prompts...] │
└─────────────────────────────────────────────────────────────────────┘
```

#### Results Table

| Column | Description | Width |
|--------|-------------|-------|
| ☐ | Selection checkbox | 40px |
| Job Name | Link to job, badge with job status | 180px |
| User Prompt | Truncated (first 60 chars with tooltip) | 300px |
| Control | ✓ if present, ⏳ if pending, ✗ if failed | 80px |
| Adapter | ✓ if present, ⏳ if pending, ✗ if failed | 80px |
| Claude Judge | Score (e.g., "4.2 vs 3.8") or "—" if disabled | 120px |
| Winner | Badge: "Adapter" / "Control" / "Tie" / "—" | 100px |
| Your Rating | Badge: "Adapter" / "Control" / "Tie" / "—" | 100px |
| Created | Relative time (e.g., "2 hours ago") | 120px |
| Actions | View button | 80px |

#### Selection Actions Bar
When 1+ rows are selected:
```
┌─────────────────────────────────────────────────────────────────────┐
│ ☑ 5 tests selected    [Select All (23)]  [Clear Selection]         │
│                                                                     │
│ [📥 Collate Selected]              [Export CSV]                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 Data Model

```typescript
interface TestResultRow {
  id: string;                          // test_results.id
  jobId: string;
  jobName: string;
  userPrompt: string;
  systemPrompt: string | null;
  
  // Response status
  controlResponse: string | null;
  adaptedResponse: string | null;
  status: 'pending' | 'generating' | 'evaluating' | 'completed' | 'failed';
  
  // Evaluation data
  evaluationEnabled: boolean;
  controlEvaluation: ClaudeEvaluation | null;
  adaptedEvaluation: ClaudeEvaluation | null;
  evaluationComparison: EvaluationComparison | null;
  
  // User feedback
  userRating: 'control' | 'adapted' | 'tie' | 'neither' | null;
  userNotes: string | null;
  
  // Timestamps
  createdAt: string;
  completedAt: string | null;
}
```

### 1.4 Filtering & Pagination

**Filters:**
- Job filter (dropdown of user's jobs)
- Date range (preset: Today, Last 7 days, Last 30 days, Custom)
- Status filter (Completed, Pending, Failed)
- Has Claude Evaluation (Yes/No/All)
- Search (searches userPrompt text)

**Pagination:**
- Default page size: 25
- Options: 10, 25, 50, 100
- Offset-based pagination with total count

### 1.5 View Action

Clicking "View" navigates to the existing test detail page:
```
/pipeline/jobs/[jobId]/test?highlight=[testId]
```

The test page will be updated to:
1. Accept `highlight` query param to auto-scroll to and expand that test
2. Add copy buttons for each field (see Part 2)

---

## Part 2: Test Page Updates

### 2.1 Copy Functionality

Add copy buttons to the existing `/pipeline/jobs/[jobId]/test` page for each response section:

```
┌─────────────────────────────────────────────────────────────────────┐
│ User Prompt                                              [📋 Copy] │
├─────────────────────────────────────────────────────────────────────┤
│ I'm 45 years old and embarrassed to admit I only have...          │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ System Prompt (optional)                                 [📋 Copy] │
├─────────────────────────────────────────────────────────────────────┤
│ You are an emotionally intelligent financial advisor...            │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────┬──────────────────────────────────┐
│ Control Response        [📋 Copy]│ Adapter Response        [📋 Copy]│
├──────────────────────────────────┼──────────────────────────────────┤
│ Based on your situation...       │ I hear the frustration in...     │
└──────────────────────────────────┴──────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Claude-as-Judge Evaluation                    [📋 Copy Full JSON]  │
├─────────────────────────────────────────────────────────────────────┤
│ Control Score: 3.8  |  Adapter Score: 4.2  |  Winner: Adapter      │
│ [Expand Details ▼]                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Updates

**File to modify:** `src/components/pipeline/TestResultComparison.tsx`

Add copy utility:
```typescript
const copyToClipboard = async (text: string, label: string) => {
  await navigator.clipboard.writeText(text);
  toast.success(`${label} copied to clipboard`);
};
```

---

## Part 3: Collation Workflow

### 3.1 Collation Process

When user clicks "Collate Selected":

1. **Modal appears** with options:
   ```
   ┌──────────────────────────────────────────────────────────────────┐
   │ Create Conversation Collation                                   │
   │                                                                  │
   │ Name: [My Evaluation Set - Jan 26 2026___________________]      │
   │                                                                  │
   │ Include:                                                        │
   │ ☑ User prompts                                                  │
   │ ☑ System prompts                                                │
   │ ☑ Control responses                                             │
   │ ☑ Adapter responses                                             │
   │ ☑ Claude-as-Judge evaluations                                   │
   │ ☑ Your ratings and notes                                        │
   │ ☐ Timing metrics (generation time, tokens)                      │
   │                                                                  │
   │ Format:                                                         │
   │ ○ Conversations Evaluation Collation Dataset (JSON)             │
   │ ○ CSV (flat export)                                             │
   │                                                                  │
   │                              [Cancel]  [Create Collation]       │
   └──────────────────────────────────────────────────────────────────┘
   ```

2. **API creates collation record**:
   ```typescript
   POST /api/pipeline/collations
   {
     name: string;
     testResultIds: string[];
     includeOptions: CollationOptions;
     format: 'json' | 'csv';
   }
   ```

3. **Redirect to Collations page** with new collation highlighted

### 3.2 Database Schema

```sql
-- New table: conversation_collations
CREATE TABLE conversation_collations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Metadata
  name TEXT NOT NULL,
  description TEXT,
  
  -- Content
  test_result_ids UUID[] NOT NULL,  -- Array of test_result IDs
  collation_data JSONB NOT NULL,    -- The full collated dataset
  
  -- Options used
  include_options JSONB NOT NULL,
  format TEXT NOT NULL DEFAULT 'json',
  
  -- Stats
  conversation_count INTEGER NOT NULL,
  total_tokens INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_collations_user_id ON conversation_collations(user_id);
CREATE INDEX idx_collations_created_at ON conversation_collations(created_at DESC);
```

---

## Part 4: Conversations Collation Page

### 4.1 Route & Location

```
Route: /pipeline/collations
File: src/app/(dashboard)/pipeline/collations/page.tsx
```

### 4.2 Page Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ Conversations Collations                                            │
│ Download and manage your collated conversation datasets             │
│                                                                     │
│ [🔍 Search...]                               [Filter: Date Range ▼] │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ ☐ │ Name                    │ Conversations │ Format │ Created     │
├───┼─────────────────────────┼───────────────┼────────┼─────────────┤
│ ☐ │ Emotional Arc Eval Set  │ 20            │ JSON   │ 2 hours ago │
│ ☐ │ Quick Test Batch        │ 5             │ JSON   │ Yesterday   │
│ ☐ │ Full EI Comparison      │ 50            │ JSON   │ Jan 24      │
└─────────────────────────────────────────────────────────────────────┘

Selection: [Merge Selected Collations]  [Download Selected]  [Delete]
```

### 4.3 Actions

**Download Single:** Click on row downloads the JSON/CSV file directly

**Merge Selected Collations:** Creates a new "meta-collation" that wraps multiple collations:

```json
{
  "_meta": {
    "type": "merged_collation",
    "version": "1.0.0",
    "created_at": "2026-01-26T20:22:01Z",
    "source_collations": [
      { "id": "uuid-1", "name": "Emotional Arc Eval Set", "count": 20 },
      { "id": "uuid-2", "name": "Quick Test Batch", "count": 5 }
    ],
    "total_conversations": 25
  },
  "collations": [
    { /* full collation 1 */ },
    { /* full collation 2 */ }
  ]
}
```

---

## Part 5: API Endpoints

### 5.1 Test Results List

```typescript
// GET /api/pipeline/test-results
// Returns all test results for current user across all jobs

interface TestResultsListParams {
  jobId?: string;           // Filter by job
  status?: string;          // Filter by status
  hasEvaluation?: boolean;  // Filter by evaluation enabled
  search?: string;          // Search prompt text
  dateFrom?: string;        // ISO date
  dateTo?: string;          // ISO date
  page?: number;
  pageSize?: number;
}

interface TestResultsListResponse {
  success: boolean;
  data: TestResultRow[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}
```

### 5.2 Create Collation

```typescript
// POST /api/pipeline/collations
interface CreateCollationRequest {
  name: string;
  description?: string;
  testResultIds: string[];
  includeOptions: {
    userPrompts: boolean;
    systemPrompts: boolean;
    controlResponses: boolean;
    adaptedResponses: boolean;
    claudeEvaluations: boolean;
    userRatings: boolean;
    timingMetrics: boolean;
  };
  format: 'json' | 'csv';
}

interface CreateCollationResponse {
  success: boolean;
  data: {
    id: string;
    name: string;
    conversationCount: number;
    downloadUrl: string;
  };
}
```

### 5.3 List Collations

```typescript
// GET /api/pipeline/collations
interface CollationsListResponse {
  success: boolean;
  data: {
    id: string;
    name: string;
    description: string | null;
    conversationCount: number;
    format: 'json' | 'csv';
    createdAt: string;
  }[];
}
```

### 5.4 Download Collation

```typescript
// GET /api/pipeline/collations/[id]/download
// Returns the collation_data as downloadable JSON or CSV file
```

### 5.5 Merge Collations

```typescript
// POST /api/pipeline/collations/merge
interface MergeCollationsRequest {
  name: string;
  collationIds: string[];
}

interface MergeCollationsResponse {
  success: boolean;
  data: {
    id: string;
    name: string;
    totalConversations: number;
    downloadUrl: string;
  };
}
```

---

## Part 6: File Structure

### New Files to Create

```
src/
├── app/
│   └── (dashboard)/
│       └── pipeline/
│           ├── results/
│           │   └── page.tsx              # Test Results Browser
│           └── collations/
│               └── page.tsx              # Collations Manager
│
├── components/
│   └── pipeline/
│       ├── TestResultsTable.tsx          # Results table component
│       ├── TestResultRow.tsx             # Individual row component
│       ├── CollationModal.tsx            # Create collation modal
│       ├── CollationsTable.tsx           # Collations list table
│       └── MergeCollationsModal.tsx      # Merge modal
│
├── lib/
│   └── services/
│       └── collation-service.ts          # Collation business logic
│
├── types/
│   └── collation.ts                      # Collation type definitions
│
└── app/
    └── api/
        └── pipeline/
            ├── test-results/
            │   └── route.ts              # List all test results
            └── collations/
                ├── route.ts              # List/create collations
                ├── [id]/
                │   ├── route.ts          # Get/delete collation
                │   └── download/
                │       └── route.ts      # Download collation
                └── merge/
                    └── route.ts          # Merge collations
```

### Files to Modify

```
src/components/pipeline/TestResultComparison.tsx  # Add copy buttons
src/app/(dashboard)/pipeline/jobs/[jobId]/test/page.tsx  # Add highlight support
```

---

## Part 7: Navigation Integration

### Sidebar Updates

Add new navigation items to the pipeline section:

```typescript
// In navigation config
{
  title: "Test Results",
  href: "/pipeline/results",
  icon: FileSearch,
  description: "Browse all A/B test results"
},
{
  title: "Collations",
  href: "/pipeline/collations", 
  icon: Archive,
  description: "Manage conversation datasets"
}
```

---

## Part 8: Implementation Priority

### Phase 1: Core Functionality
1. Create Test Results Browser page with basic table
2. Implement test results list API endpoint
3. Add selection checkboxes and bulk actions

### Phase 2: Collation System
1. Create collation modal and API
2. Implement Collations page
3. Add download functionality

### Phase 3: Enhancements
1. Add copy buttons to test page
2. Implement collation merging
3. Add CSV export option
4. Add filtering and search

### Phase 4: Polish
1. Add keyboard shortcuts
2. Implement optimistic UI updates
3. Add loading skeletons
4. Performance optimization for large result sets

---

## Verification Plan

### Automated Tests
```bash
# Run existing test suite to ensure no regressions
npm run test

# Add new tests for:
# - collation-service.ts functions
# - API route handlers
```

### Manual Testing
1. Create 10+ test results across multiple jobs
2. Use Test Results Browser to filter and select results
3. Create collation and verify JSON structure
4. Download and validate in external tools
5. Merge multiple collations and verify meta-wrapper

---

**Document Control:**
| Field | Value |
|-------|-------|
| Document ID | SPEC-RESULTS-COLLATION-v1 |
| Author | Gemini Agent |
| Created | January 26, 2026 |
| Related | conversations-evaluation-collation-dataset-JSON_v1.json |
