# Frontier RAG Module - Execution Prompt E07: React Hooks & State Management

**Version:** 1.0
**Date:** February 10, 2026
**Section:** E07 - React Hooks & State Management
**Prerequisites:** E01-E06 complete (database, types, providers, services, API routes)
**Status:** Ready for Execution

---

## Overview

This prompt creates all React hooks and the Zustand store for the RAG module. These hooks bridge the API routes (E06) and the UI components (E08). They follow the existing React Query v5 patterns established in the codebase.

## Critical Instructions

### SAOL for Database Operations

Use SAOL for all database operations:

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'rag_documents',limit:1});console.log(JSON.stringify(r,null,2));})();"
```

### Environment

**Codebase:** `C:\Users\james\Master\BrightHub\brun\v4-show\src`
**SAOL Path:** `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops`

---

## Reference Documents

- **Specification:** `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\008-rag-frontier-rag-detailed-spec_v1-section-7.md`
- **SAOL Guide:** `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops\QUICK_START.md`

---

========================


# EXECUTION PROMPT E07: React Hooks & Zustand Store

## Your Mission

You are creating the client-side data layer for a Frontier RAG module in an existing Next.js 14 + React Query v5 + Zustand application. You will create 5 new files:

1. `src/hooks/use-rag-documents.ts` -- Document CRUD operations (list, detail, upload, process, delete)
2. `src/hooks/use-expert-qa.ts` -- Expert Q&A flow (questions, submit answers, verification)
3. `src/hooks/use-rag-chat.ts` -- RAG chat with mode selection and message management
4. `src/hooks/use-rag-quality.ts` -- Quality metrics and query history
5. `src/stores/rag-store.ts` -- Zustand store for RAG UI state

**Do NOT modify any existing files. Only create new files.**

---

## Step 0: Read the Specification and Codebase

Read these files completely before writing any code:

1. **The specification** (contains ALL hook and store implementations):
   `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\008-rag-frontier-rag-detailed-spec_v1-section-7.md`

2. **Existing hook patterns** (follow these conventions for query keys, staleTime, mutations, cache invalidation, toast notifications):
   `C:\Users\james\Master\BrightHub\brun\v4-show\src\hooks\use-datasets.ts`
   `C:\Users\james\Master\BrightHub\brun\v4-show\src\hooks\use-conversations.ts`

3. **Existing Zustand store pattern** (follow this for devtools, persist middleware, partialize):
   `C:\Users\james\Master\BrightHub\brun\v4-show\src\stores\conversation-store.ts`

---

## Step 1: Verify Prerequisites

Verify that the API routes from E06 exist:
- `src/app/api/rag/documents/route.ts`
- `src/app/api/rag/query/route.ts`
- `src/app/api/rag/quality/route.ts`

If missing, STOP and inform the user to run E06 first.

---

## Step 2: Create All 4 Hook Files

Create each hook file exactly as specified. Key patterns to follow:

### Query Key Factory Pattern
Every hook file should define a query key factory at the top:
```typescript
export const ragDocumentKeys = {
  all: ['ragDocuments'] as const,
  lists: () => [...ragDocumentKeys.all, 'list'] as const,
  list: (filters: any) => [...ragDocumentKeys.lists(), filters] as const,
  details: () => [...ragDocumentKeys.all, 'detail'] as const,
  detail: (id: string) => [...ragDocumentKeys.details(), id] as const,
}
```

### Mutation Pattern
```typescript
const mutation = useMutation({
  mutationFn: async (data) => {
    const res = await fetch('/api/rag/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed')
    }
    return res.json()
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ragDocumentKeys.all })
    toast.success('Success message')
  },
  onError: (error: Error) => {
    toast.error(error.message)
  },
})
```

### Important Conventions
- Import `toast` from `sonner`
- Import `useQuery`, `useMutation`, `useQueryClient` from `@tanstack/react-query`
- Use `staleTime: 30 * 1000` (30 seconds) for standard queries
- Use `staleTime: 60 * 1000` (60 seconds) for expensive aggregation queries (quality metrics)
- Cross-invalidate related query keys when mutations succeed (e.g., submitting answers invalidates both questions and document detail)

---

## Step 3: Create the Zustand Store

Create `src/stores/rag-store.ts` exactly as specified. Key patterns:
- Use `devtools` + `persist` middleware (matching `conversation-store.ts`)
- Only persist user preferences (`chatMode`, `sidebarView`), NOT session state
- Export individual selector hooks for optimized re-rendering
- DevTools enabled in development only

---

## Step 4: Verify TypeScript Build

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/src" && npm run build
```

**Expected:** Build succeeds with exit code 0.

---

## Step 5: Verify File Structure

```
src/hooks/use-rag-documents.ts  (NEW)
src/hooks/use-expert-qa.ts      (NEW)
src/hooks/use-rag-chat.ts       (NEW)
src/hooks/use-rag-quality.ts    (NEW)
src/stores/rag-store.ts         (NEW)
```

---

## Success Criteria

- [ ] All 4 hook files and 1 store file created
- [ ] Every hook follows the query key factory pattern
- [ ] Mutations invalidate the correct cache keys on success
- [ ] Toast notifications on success and error (using `sonner`)
- [ ] Zustand store uses devtools + persist middleware
- [ ] Only user preferences are persisted (not session state)
- [ ] `npm run build` succeeds with zero TypeScript errors
- [ ] `useRAGChat` manages local message state (ephemeral per session)

---

## If Something Goes Wrong

### React Query Import Errors
- Verify `@tanstack/react-query` is in `package.json` (should already be installed)
- Import from `@tanstack/react-query` not `react-query`

### Sonner Import Errors
- `toast` is imported from `sonner` (not `react-hot-toast` or `react-toastify`)
- Verify `sonner` is in `package.json`

### Zustand Middleware Errors
- Import `create` from `zustand`
- Import `devtools`, `persist` from `zustand/middleware`
- If `persist` causes SSR issues, wrap with `typeof window !== 'undefined'` check

### Type Errors in Hooks
- Hook return types should match what the API routes return
- If the API response shape differs from what the spec assumes, adjust the hook's fetch parsing

---

## What's Next

**E08** will create all UI components and pages that consume these hooks.

---

**End of E07 Prompt**


+++++++++++++++++
