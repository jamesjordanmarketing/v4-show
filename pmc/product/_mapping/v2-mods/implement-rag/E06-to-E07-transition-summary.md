# E06 → E07 Transition Summary

**Date:** February 11, 2026  
**Session:** E06 Implementation Complete  
**Next Stage:** E07 v2 Ready for Execution  

---

## What Was Implemented in E06

### Files Created (4 API Routes)

#### 1. Expert Q&A Routes (2 files)

**`src/app/api/rag/documents/[id]/questions/route.ts`** (2,379 bytes)
- **GET**: List expert questions for a document
  - Query param: `?includeAnswered=true` (optional, defaults to false)
  - Returns: `{ success: boolean; data?: RAGExpertQuestion[]; error?: string }`
  - Uses: `getQuestionsForDocument()` from `rag-expert-qa-service`
  
- **POST**: Submit answer or skip question
  - Body: `{ questionId: string; answerText?: string; skip?: boolean }`
  - Logic: If `skip=true`, calls `skipQuestion()`, else validates `answerText` and calls `submitExpertAnswer()`
  - Returns: `{ success: boolean; data?: RAGExpertQuestion; error?: string }`

**`src/app/api/rag/documents/[id]/verify/route.ts`** (715 bytes)
- **POST**: Mark document as verified after expert Q&A workflow
  - No body required (uses `documentId` from URL params)
  - Returns: `{ success: boolean; data?: RAGDocument; error?: string }`
  - Uses: `markDocumentVerified()` from `rag-expert-qa-service`

#### 2. RAG Query Route (1 file)

**`src/app/api/rag/query/route.ts`** (2,329 bytes)
- **POST**: Query the RAG system (chat with documents)
  - Body: `{ queryText: string; documentId?: string; knowledgeBaseId?: string; mode?: RAGQueryMode }`
  - Validation: At least one of `documentId` or `knowledgeBaseId` required
  - Mode validation: Defaults to `'rag_only'` if invalid or missing
  - Valid modes: `'rag_only'`, `'lora_only'`, `'rag_and_lora'`
  - Returns: `{ success: boolean; data?: RAGQuery; error?: string }`
  - Uses: `queryRAG()` from `rag-retrieval-service`
  
- **GET**: Get query history
  - Query params: `?documentId=`, `?knowledgeBaseId=`, `?limit=` (default 50, max 100)
  - Returns: `{ success: boolean; data?: RAGQuery[]; error?: string }`
  - Uses: `getQueryHistory()` from `rag-retrieval-service`

#### 3. Quality Evaluation Route (1 file)

**`src/app/api/rag/quality/route.ts`** (1,683 bytes)
- **GET**: Get quality scores or summary
  - Mode 1 (list): `/api/rag/quality?documentId=xxx` (optional filter)
    - Returns: `{ success: boolean; data?: RAGQualityScore[]; error?: string }`
  - Mode 2 (summary): `/api/rag/quality?summary=true&documentId=xxx`
    - Returns: `{ success: boolean; data?: { averageComposite: number; queryCount: number; breakdown: Record<string, number> }; error?: string }`
  - Uses: `getQualityScores()` or `getAverageQuality()` from `rag-quality-service`
  
- **POST**: Evaluate a query's quality (Claude-as-Judge)
  - Body: `{ queryId: string }`
  - Returns: `{ success: boolean; data?: RAGQualityScore; error?: string }`
  - Uses: `evaluateQueryQuality()` from `rag-quality-service`

### Complete RAG API Structure (9 Routes Total)

```
src/app/api/rag/
├── documents/
│   ├── [id]/
│   │   ├── process/route.ts      (E05) — POST re-trigger processing
│   │   ├── questions/route.ts    (E06) ← NEW — GET list, POST answer/skip
│   │   ├── route.ts              (E05) — GET detail, DELETE document
│   │   ├── upload/route.ts       (E05) — POST upload file
│   │   └── verify/route.ts       (E06) ← NEW — POST mark verified
│   └── route.ts                  (E05) — GET list, POST create
├── knowledge-bases/route.ts      (E05) — GET list, POST create
├── quality/route.ts              (E06) ← NEW — GET scores/summary, POST evaluate
└── query/route.ts                (E06) ← NEW — POST query, GET history
```

### Architecture Patterns Confirmed

#### Consistent Auth Pattern (All E06 Routes)
```typescript
const { user, response } = await requireAuth(request);
if (response) return response;
```

#### Response Format (All E06 Routes)
```typescript
// Service result passthrough
return NextResponse.json(result, { status: result.success ? 200 : 500 });
```

#### Error Handling (All E06 Routes)
```typescript
try {
  // ... business logic ...
} catch (error) {
  console.error('METHOD /api/path error:', error);
  return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
}
```

#### Status Codes Used
- **200**: Success (GET, POST)
- **400**: Bad request (validation errors)
- **500**: Internal server error (catch block, service failures)

### Verification Results ✅

**File Check:**
```bash
find src/app/api/rag -name "route.ts" -type f | sort
```
Output confirmed all 9 routes present:
- ✅ `documents/[id]/process/route.ts`
- ✅ `documents/[id]/questions/route.ts` (NEW)
- ✅ `documents/[id]/route.ts`
- ✅ `documents/[id]/upload/route.ts`
- ✅ `documents/[id]/verify/route.ts` (NEW)
- ✅ `documents/route.ts`
- ✅ `knowledge-bases/route.ts`
- ✅ `quality/route.ts` (NEW)
- ✅ `query/route.ts` (NEW)

**Linter Check:**
```bash
ReadLints on all 4 new routes → No errors
```

---

## Key Implementation Details for E07

### 1. RAGQueryMode Values (Critical!)

**Correct values from `src/types/rag.ts` line 27:**
```typescript
export type RAGQueryMode = 'rag_only' | 'lora_only' | 'rag_and_lora';
```

**Used in query route validation (line 33):**
```typescript
const validModes: RAGQueryMode[] = ['rag_only', 'lora_only', 'rag_and_lora'];
const queryMode: RAGQueryMode = validModes.includes(mode) ? mode : 'rag_only';
```

⚠️ **Common mistake**: Using `'rag_plus_lora'` instead of `'rag_and_lora'` — TypeScript error!

### 2. Questions Route POST Body Variants

The questions POST route handles two distinct operations via the same endpoint:

**Variant A — Submit Answer:**
```typescript
{
  questionId: string;
  answerText: string;  // Required, must be non-empty
  skip?: false;         // Optional or omitted
}
```

**Variant B — Skip Question:**
```typescript
{
  questionId: string;
  skip: true;           // Must be true
  answerText?: string;  // Ignored if skip=true
}
```

**E07 Hook Implementation Note:**
- `useSubmitAnswer` hook should send: `{ questionId, answerText }`
- `useSkipQuestion` hook should send: `{ questionId, skip: true }`

### 3. Quality Route GET Modes

The quality GET route has conditional logic based on query params:

**Mode 1 — List Scores (default):**
```typescript
GET /api/rag/quality?documentId=xxx  // documentId optional
Response: { success: true, data: RAGQualityScore[] }
```

**Mode 2 — Summary:**
```typescript
GET /api/rag/quality?summary=true&documentId=xxx  // documentId required
Response: { 
  success: true, 
  data: { 
    averageComposite: number;
    queryCount: number;
    breakdown: Record<string, number>;
  }
}
```

**E07 Hook Implementation Note:**
- `useRAGQualityScores(documentId?)` → calls mode 1
- `useRAGQualitySummary(documentId)` → calls mode 2 (must pass `documentId`)

### 4. Query History Query String

Both `documentId` and `knowledgeBaseId` are optional for filtering:

```typescript
GET /api/rag/query?documentId=xxx&knowledgeBaseId=yyy&limit=50
```

**E07 Hook Implementation Note:**
- Query key should include both params: `ragChatKeys.history(documentId, knowledgeBaseId)`
- At least one must be truthy for the hook to be `enabled`

### 5. API Response Format (All Routes)

Every route returns the same structure:
```typescript
{
  success: boolean;
  data?: T;        // Present if success=true
  error?: string;  // Present if success=false
}
```

**E07 Hook Implementation Note:**
- Check both `!response.ok` AND `!json.success`
- Throw error with `json.error` message

---

## Key Corrections Made for E07 v2

### 1. Prerequisites Section Updated

**v1:**
```
**Prerequisites:** E01-E06 complete (database, types, services, all API routes)
```

**v2:**
```
**Prerequisites:** E01 (database) ✅, E02 (types & providers) ✅, E03 (ingestion & embedding) ✅, E04 (expert QA & retrieval) ✅, E05 (quality service & API routes Part 1) ✅, E06 (API routes Part 2) ✅ complete
```

### 2. Context Section Enhanced

**Added to v2:**

#### E06 Completion Status Section
- Exact routes created with file sizes
- All GET/POST method signatures
- Request/response body structures
- Query parameter documentation
- Service function references

#### E05 Completion Status Section
- All E05 routes with method signatures
- Request/response structures
- Status code usage (200, 201, 202, 400, 404, 500)

#### Existing Hook Patterns Section
- Extracted actual patterns from `src/hooks/usePipelineJobs.ts` (lines 1-150)
- Extracted toast pattern from `src/hooks/useModels.ts` (lines 40-62)
- Confirmed query key factory structure
- Confirmed no `'use client'` directive in existing hooks
- Confirmed staleTime format: `30 * 1000` (not `30_000`)

### 3. Infrastructure Verification

**Added to v2:**
```markdown
### Existing Infrastructure (Confirmed)
- ✅ **React Query Provider**: `ReactQueryProvider` is set up in `src/app/layout.tsx` (line 25)
- ✅ **Toast Notifications**: Sonner toaster available (line 32)
- ✅ **Auth Context**: `AuthProvider` wraps application (line 26)
```

**Why this matters:**
- Agent doesn't need to set up QueryClientProvider
- Agent knows toast is available (`import { toast } from 'sonner'`)
- Agent knows auth is handled globally

### 4. Code Examples Updated

**Query Key Factory:**
- Changed from generic example to exact pattern from `usePipelineJobs.ts`
- Included hierarchical key structure example
- Showed parameterized key factory pattern

**Fetch Functions:**
- Changed from generic example to exact pattern with error handling
- Showed URLSearchParams pattern from existing hooks
- Showed FormData upload pattern (not in v1)

**Toast Pattern:**
- Added actual example from `useModels.ts` line 56-60
- Clarified toast is optional (not required in all mutations)
- Showed `onError` handler pattern

### 5. Notes for Agent Enhanced

**Critical warnings added to v2:**

#### Warning #1: No 'use client' Directive
```markdown
3. **Do NOT add `'use client'` directive** — existing hooks in the codebase don't use it
```

#### Warning #2: StaleTime Format
```markdown
6. **Follow staleTime pattern** from existing hooks: Use `staleTime: 30 * 1000` (30 seconds) format, not just `30_000`.
```

#### Warning #3: Dual Success Check
```markdown
7. **All API routes return `{ success, data, error }`** — check both `!res.ok` and `!json.success`.
```

#### Warning #4: Query History Key Structure
```markdown
9. **Query history hook** needs both `documentId` and `knowledgeBaseId` in the key factory for proper cache discrimination.
```

#### Warning #5: FormData Upload
```markdown
**FormData Upload Issues** section added:
- Do NOT set `Content-Type` header (browser sets it automatically with boundary)
- File must be appended as: `formData.append('file', fileObject)`
```

### 6. Verification Section Updated

**v1:**
```bash
ls -la src/hooks/useRAG* src/hooks/useExpertQA.ts
```

**v2:**
```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show" && ls -la src/hooks/useRAG* src/hooks/useExpertQA.ts 2>/dev/null
```

**Improvements:**
- Uses actual Windows path
- Changes to correct directory first
- Suppresses errors with `2>/dev/null`
- Added TypeScript check with grep filter
- Added linter check with grep filter

### 7. Hook Implementation Details

**Added `DocumentDetail` interface:**
```typescript
interface DocumentDetail {
  document: RAGDocument;
  sections: RAGSection[];
  facts: RAGFact[];
}
```

**Added `QualitySummary` interface:**
```typescript
interface QualitySummary {
  averageComposite: number;
  queryCount: number;
  breakdown: Record<string, number>;
}
```

**Updated query key factories:**
- `ragChatKeys.history()` now takes both `documentId` and `knowledgeBaseId`
- More specific key structure for better cache discrimination

**Updated invalidation patterns:**
- `useRAGQuery` invalidates with both params: `ragChatKeys.history(data.documentId || undefined, data.knowledgeBaseId || undefined)`

---

## Files Size Comparison

- **E07 v1**: 18K (original)
- **E07 v2**: 27K (+50% more context and detail)

The additional 9K includes:
- Complete E06 route documentation with examples
- Exact hook patterns from existing codebase
- Infrastructure verification (QueryClientProvider, Toast, Auth)
- Detailed response format documentation
- Cross-hook import patterns
- FormData upload specifics
- Enhanced troubleshooting guidance

---

## What the Next Agent Will Know

When executing E07 v2, the agent will have:

1. ✅ **Exact API route signatures** for all 9 RAG endpoints
2. ✅ **Exact hook patterns** from existing codebase (`usePipelineJobs.ts`, `useModels.ts`)
3. ✅ **Confirmed infrastructure** (QueryClientProvider, Toast, Auth all set up)
4. ✅ **Correct type values** (RAGQueryMode confirmed)
5. ✅ **Cross-hook import pattern** (useExpertQA imports ragDocumentKeys)
6. ✅ **Query key structure** for proper cache invalidation
7. ✅ **FormData upload pattern** for file uploads
8. ✅ **Toast usage guidance** (optional, only in onError handlers)

---

## Critical Success Factors

### What Would Have Broken Without v2 Corrections

1. **Using `'use client'` directive** → Inconsistent with existing codebase, might cause SSR issues
2. **Wrong staleTime format** → Using `30_000` instead of `30 * 1000` (inconsistent style)
3. **Missing documentId/knowledgeBaseId in chat history key** → Cache invalidation wouldn't work correctly
4. **Setting Content-Type for FormData** → Upload would fail with boundary error
5. **Missing `!json.success` check** → Wouldn't catch service-level errors

### What v2 Prevents

- ❌ Style inconsistencies with existing hooks
- ❌ Cache invalidation bugs
- ❌ FormData upload failures
- ❌ Error handling gaps
- ❌ Missing query key exports

---

## Gotchas & Learnings

### 1. No 'use client' Directive in Hooks

**Discovery:** Existing hooks (`usePipelineJobs.ts`, `useModels.ts`) don't use `'use client'`

**Why:** Hooks are imported by components that have `'use client'`. The directive only needs to be on the boundary component, not every file.

**Action:** Removed `'use client'` from all E07 hook examples.

### 2. Toast in Hooks is Acceptable

**Discovery:** `useModels.ts` line 56-60 uses `toast.error()` in `onError` handler

**Why:** Toast is contextual error feedback, not business logic. It's acceptable in hooks when the error message provides value.

**Action:** Updated E07 to clarify toast is optional, typically in `onError` handlers.

### 3. Query Key Structure Matters for Cache Invalidation

**Discovery:** `ragChatKeys.history()` needs both `documentId` AND `knowledgeBaseId` in key

**Why:** If key only includes `documentId`, invalidation won't work when querying by `knowledgeBaseId`.

**Action:** Updated query key factory to: `history: (documentId?, knowledgeBaseId?) => [...]`

### 4. FormData Upload Pattern

**Discovery:** Upload route expects FormData with no Content-Type header

**Why:** Browser automatically sets `multipart/form-data` with correct boundary. Manual header causes failure.

**Action:** Added note in "If Something Goes Wrong" section and code comment.

### 5. Dual Success Check Required

**Discovery:** API routes return `{ success, data, error }` structure

**Why:** HTTP 200 doesn't guarantee success (service might have failed). Need to check both `!res.ok` AND `!json.success`.

**Action:** Added fetch wrapper pattern showing both checks.

---

## Recommendations for E08 (Components)

1. **Import hooks, not services** — Components should never import from `@/lib/rag/services`
2. **Use toast in components** — Not in hooks (except `onError` handlers)
3. **Handle loading states** — All hooks return `{ isLoading, isError, data, error }` from React Query
4. **Use query key exports** — For optimistic updates or manual invalidation
5. **Follow existing component patterns** — Check existing components in `src/components/` for style

---

## Test Checklist for E07

When E07 is complete, the agent should verify:

- [ ] All 5 hook files exist in `src/hooks/`
- [ ] No TypeScript compilation errors
- [ ] No ESLint errors
- [ ] All hooks export their query key factories
- [ ] All fetch functions check both `!res.ok` and `!json.success`
- [ ] All mutations have `onSuccess` cache invalidation
- [ ] `useUploadDocument` uses FormData correctly (no Content-Type header)
- [ ] `useRAGQuery` invalidates with both `documentId` and `knowledgeBaseId`
- [ ] No `'use client'` directives added
- [ ] `staleTime` uses `30 * 1000` format (not `30_000`)

---

**Prepared by:** E06 Implementation Agent  
**Verified against:** Actual codebase at `c:\Users\james\Master\BrightHub\brun\v4-show\src`  
**Ready for:** E07 Execution (February 11, 2026)
