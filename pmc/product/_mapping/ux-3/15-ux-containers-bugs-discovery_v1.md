# Bug Discovery & Fix Specification — Conversations Module
**Document:** `15-ux-containers-bugs-discovery_v1.md`
**Written:** 2026-03-02
**Status:** Ready for implementation
**Implementing agent prerequisite:** Read `src/` codebase at `C:\Users\james\Master\BrightHub\BRun\v4-show\src\` before making any changes.

---

## 1. Background Context

### Platform
**Bright Run LoRA Training Data Platform** — Next.js 14 (App Router), TypeScript, Supabase (PostgreSQL + Storage), Claude AI, deployed at `https://v4-show.vercel.app`.

### Work Base Architecture (current)
All operations are scoped to a `workbase` entity. Every feature lives under `/workbase/[id]/`. The relevant routes for this spec:
- `/workbase/[id]/fine-tuning/conversations` — Conversation library + training sets
- `/workbase/[id]/fine-tuning/conversations/[convId]` — Conversation detail (view-only)

### Active Workbases
| Name | ID |
|------|----|
| `rag-KB-v2_v1` | `232bea74-b987-4629-afbc-a21180fe6e84` |
| `Sun Chip Policy Doc #30` | `4fc8fa25-0b5d-4dbb-9db4-6bd70fb84303` |

### Key files this spec touches
| File | Role |
|------|------|
| `src/hooks/use-conversations.ts` | React Query hook for conversation list |
| `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx` | Workbase conversations page |
| `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/generate/page.tsx` | **NEW FILE** — workbase-scoped bulk generator |
| `src/app/api/conversations/generate-batch/route.ts` | Batch generation API route |
| `src/lib/services/batch-generation-service.ts` | Batch generation service |
| `src/app/(dashboard)/bulk-generator/page.tsx` | Original bulk generator (read-only reference — DO NOT MODIFY) |

### SAOL (Mandatory for all agent DB operations)
Location: `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops`

```javascript
// Standard SAOL setup for all script operations:
require('dotenv').config({ path: '../.env.local' });
const saol = require('.');
```

Rules:
- **Always** `dryRun: true` first, then `dryRun: false` to apply
- **Always** use `agentPreflight({ table })` before modifying data
- **Never** use raw `supabase-js` or psql directly from scripts
- Application code (API routes) uses `createServerSupabaseAdminClient()` — NOT SAOL

---

## 2. Discovery: Three Bugs Found

### Bug A — CRITICAL: API Response Shape Mismatch (Conversations Never Appear)

**Symptom:** The workbase conversations page (`/workbase/[id]/fine-tuning/conversations`) always shows an empty conversation list, even when conversations exist in the DB for that workbase.

**Root cause — confirmed by code inspection:**

The hook `useConversations` (called by the workbase conversations page) calls `fetchConversations()`, which makes a `GET /api/conversations?workbaseId=...` request and then reads:
```typescript
// src/hooks/use-conversations.ts, line 117
return data.data || [];  // ← BUG
```

But `GET /api/conversations` returns a `StorageConversationListResponse` object, whose shape is:
```typescript
{
  conversations: StorageConversation[],  // ← key is "conversations", NOT "data"
  total: number,
  page: number,
  limit: number,
  totalPages: number
}
```

Because `data.data` is always `undefined`, `fetchConversations` always returns `[]`. The React Query hook then passes `[]` as the conversation list.

**Note:** The old `/conversations` page (`src/app/(dashboard)/conversations/page.tsx`) reads `data.conversations` directly and works correctly. This mismatch is isolated to `use-conversations.ts`.

**DB verification:** 51 conversations have `workbase_id = '232bea74-b987-4629-afbc-a21180fe6e84'`. The DB query and API are correct. Only the hook's data extraction is wrong.

---

### Bug B — Bulk Generator Does Not Associate Conversations with a Work Base

**Symptom:** Conversations generated via `/bulk-generator` (the `POST /api/conversations/generate-batch` endpoint) are stored with `workbase_id = NULL`. They are orphaned — invisible in all workbase conversations pages.

**Root cause — confirmed by code inspection:**

1. `src/app/(dashboard)/bulk-generator/page.tsx` — The `handleSubmit` function does not include `workbaseId` in the batch request body.
2. `src/app/api/conversations/generate-batch/route.ts` — The `BatchGenerateRequestSchema` (Zod schema) has no `workbaseId` field.
3. `src/lib/services/batch-generation-service.ts` — The `BatchGenerationRequest` interface has no `workbaseId` field. The `startBatchGeneration()` method never writes `workbase_id` to any generated conversation.

**DB evidence:** 10 conversations created on 2026-03-02 have `workbase_id = NULL`. These are recent batch-generated conversations that went missing.

---

### Bug C — "New Conversation" Sheet in Workbase Page is Non-Functional

**Symptom:** Clicking "+ New Conversation" on the workbase conversations page opens a side Sheet that:
- Requires selecting a "template" from `/api/templates?limit=50` (the legacy template-based system)
- Has only a `tier` selector (template/scenario/edge_case) — no persona, arc, or topic selection
- Has no mechanism to select the rich parameters (personas × arcs × topics) that actual conversation quality depends on
- Even if templates load, the resulting single conversation often fails because the legacy template system is not aligned with the current generation pipeline

**Root cause:** The Sheet generator in `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx` (lines 95–365) was built for a legacy template-select flow. The real conversation generation system uses the personas/emotional-arcs/training-topics scaffolding, which lives in the `bulk-generator` page.

**The correct generation flow is the bulk generator** (`/bulk-generator`), which:
- Fetches from `/api/scaffolding/personas`, `/api/scaffolding/emotional-arcs`, `/api/scaffolding/training-topics`
- Lets users select any combination of personas × arcs × topics
- Submits to `/api/conversations/generate-batch`
- Is confirmed 100% operational

---

## 3. Decision: What to Do With the 10 Orphaned Conversations

**Current state:**
- 51 conversations → `workbase_id = '232bea74-b987-4629-afbc-a21180fe6e84'` (rag-KB-v2_v1) ✅
- 10 conversations → `workbase_id = NULL` (orphaned) ❌

**Recommendation: Assign the 10 null-workbase conversations to workbase `232bea74`.**

Rationale:
- These 10 conversations were generated today while testing the pipeline — they have real content and should not be deleted
- The `232bea74` workbase already has 51 conversations; these 10 belong with that set
- No data migration is needed — just a simple UPDATE
- Once Bug A is fixed, all 61 conversations will be visible in the `232bea74` workbase

Do NOT assign them to `4fc8fa25` (Sun Chip Policy Doc #30) — that workbase is for a different use case.

---

## 4. Answer to Pre-Build Question: Has the Bulk Generator Been Converted to Work Base?

**Short answer: No, it has not.**

The bulk generator (`/bulk-generator`) still operates as a standalone page with zero workbase awareness. It submits batches with a hardcoded `userId: '00000000-0000-0000-0000-000000000000'` placeholder (the API ignores this and uses the authenticated user ID) and no `workbaseId`. All conversations it generates land with `workbase_id = NULL`.

The single-conversation generator in the workbase conversations page Sheet DOES pass `workbaseId` to `/api/conversations/generate`, and the API DOES patch `workbase_id` after creation. However, as noted in Bug C, that Sheet is non-functional in practice because it relies on the broken template-select system.

**Conclusion:** The generate-batch pathway needs to be made workbase-aware as part of this spec. The solution is a new workbase-scoped generator page (see Task C below).

---

## 5. Implementation Plan

### TASK 1 — Fix the API Response Shape Mismatch (Bug A)
**Priority: CRITICAL — do this first**

**File:** `src/hooks/use-conversations.ts`
**Line:** 117

**Change:**
```typescript
// BEFORE (line 117):
return data.data || [];

// AFTER:
return data.conversations || [];
```

That is the complete fix for Bug A. One line change.

**Verification:** After this change, visiting `/workbase/232bea74-b987-4629-afbc-a21180fe6e84/fine-tuning/conversations` should display all 51 (or 61 after Task 2) conversations.

---

### TASK 2 — Assign 10 Orphaned Conversations to Workbase 232bea74 (SAOL)

Run this script from `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\`:

```javascript
// scripts/assign-orphaned-conversations.js
require('dotenv').config({ path: '../.env.local' });
const saol = require('.');

const TARGET_WORKBASE_ID = '232bea74-b987-4629-afbc-a21180fe6e84';

(async () => {
  // Step 1: Preflight
  const preflight = await saol.agentPreflight({ table: 'conversations' });
  console.log('Preflight:', JSON.stringify(preflight, null, 2));

  // Step 2: Count null rows
  const nullRows = await saol.agentQuery({
    table: 'conversations',
    where: [{ column: 'workbase_id', operator: 'is', value: null }],
    select: 'id, conversation_id, created_at',
    limit: 100
  });
  console.log(`Found ${nullRows.data?.length} null-workbase conversations:`, JSON.stringify(nullRows.data, null, 2));

  // Step 3: Dry run update
  const dryResult = await saol.agentUpdate({
    table: 'conversations',
    where: [{ column: 'workbase_id', operator: 'is', value: null }],
    data: { workbase_id: TARGET_WORKBASE_ID },
    dryRun: true
  });
  console.log('Dry run result:', JSON.stringify(dryResult, null, 2));

  // Step 4: Apply (uncomment when ready)
  // const applyResult = await saol.agentUpdate({
  //   table: 'conversations',
  //   where: [{ column: 'workbase_id', operator: 'is', value: null }],
  //   data: { workbase_id: TARGET_WORKBASE_ID },
  //   dryRun: false
  // });
  // console.log('Apply result:', JSON.stringify(applyResult, null, 2));
})();
```

**Instructions for implementing agent:**
1. Run with Step 4 commented out first. Verify the dry-run output shows exactly 10 rows will be updated.
2. Uncomment Step 4 and run again to apply.

---

### TASK 3 — Add workbaseId to the Batch Generation API

**This task creates the plumbing so that conversations generated via the batch API get `workbase_id` set.**

#### 3a. Update `BatchGenerationRequest` interface

**File:** `src/lib/services/batch-generation-service.ts`
**Section:** `BatchGenerationRequest` interface (lines 31–65)

Add the following field to the interface:
```typescript
/** Work Base ID to associate all generated conversations with */
workbaseId?: string;
```

The full updated interface should include this field after `priority`:
```typescript
export interface BatchGenerationRequest {
  name: string;
  conversationIds?: string[];
  sharedParameters?: Record<string, any>;
  tier?: TierType;
  concurrentProcessing?: number;
  errorHandling?: 'stop' | 'continue';
  userId: string;
  priority?: 'low' | 'normal' | 'high';
  templateId?: string;
  parameterSets?: Array<{
    templateId: string;
    parameters: Record<string, any>;
    tier: TierType;
  }>;
  workbaseId?: string;  // ← ADD THIS
}
```

#### 3b. Patch workbase_id after each generated conversation in startBatchGeneration

**File:** `src/lib/services/batch-generation-service.ts`
**Function:** `startBatchGeneration()`

The batch generation service generates each conversation by calling `getConversationGenerationService().generateSingleConversation()`. After each successful generation, the `conversation_id` (UUID) is known. Add a `workbase_id` patch at that point.

Locate the section inside `startBatchGeneration()` where a single conversation result is processed after `generateSingleConversation()` returns success. Add:

```typescript
// After successful generation, patch workbase_id if provided
if (request.workbaseId && result.conversation?.id) {
  try {
    const supabase = createServerSupabaseAdminClient();
    await supabase
      .from('conversations')
      .update({ workbase_id: request.workbaseId })
      .eq('conversation_id', result.conversation.id)
      .eq('user_id', request.userId);
  } catch (err) {
    // Non-fatal — log and continue
    console.error('[BatchGeneration] Failed to set workbase_id:', err);
  }
}
```

Note: `createServerSupabaseAdminClient` is already imported in this file (line 22).

#### 3c. Update the API route schema

**File:** `src/app/api/conversations/generate-batch/route.ts`

Add `workbaseId` to `BatchGenerateRequestSchema`:
```typescript
const BatchGenerateRequestSchema = z.object({
  name: z.string().min(1, 'Batch name is required'),
  tier: z.enum(['template', 'scenario', 'edge_case']).optional(),
  conversationIds: z.array(z.string().uuid()).optional(),
  templateId: z.string().uuid().optional(),
  parameterSets: z.array(z.object({
    templateId: z.string().uuid(),
    parameters: z.record(z.string(), z.any()),
    tier: z.enum(['template', 'scenario', 'edge_case']),
  })).optional(),
  sharedParameters: z.record(z.string(), z.any()).optional(),
  concurrentProcessing: z.number().min(1).max(10).optional().default(3),
  errorHandling: z.enum(['stop', 'continue']).optional().default('continue'),
  userId: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high']).optional().default('normal'),
  workbaseId: z.string().uuid().optional(),  // ← ADD THIS
});
```

Pass it through to the `batchRequest` object:
```typescript
const batchRequest: BatchGenerationRequest = {
  name: validated.name,
  conversationIds: validated.conversationIds,
  parameterSets: validated.parameterSets,
  templateId: validated.templateId,
  tier: validated.tier,
  sharedParameters: validated.sharedParameters,
  concurrentProcessing: validated.concurrentProcessing,
  errorHandling: validated.errorHandling,
  userId,
  priority: validated.priority,
  workbaseId: validated.workbaseId,  // ← ADD THIS
};
```

---

### TASK 4 — Replace Sheet Generator with Navigation to New Workbase-Scoped Generator

#### 4a. Simplify the workbase conversations page

**File:** `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx`

**Remove all Sheet-related code:**
- Remove the Sheet import and component (`Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription`)
- Remove state variables: `showGenerator`, `templates`, `selectedTemplateId`, `selectedTier`, `isGenerating`
- Remove the `useEffect` that fetches `/api/templates`
- Remove the `handleGenerateConversation` function
- Remove the Select imports used only by the Sheet
- Remove the entire `<Sheet>` JSX block (lines 309–365)
- Remove the `Wand2` import from lucide-react

**Change the "+ New Conversation" button** to navigate to the new generator page:

```tsx
// BEFORE:
<Button size="sm" onClick={() => setShowGenerator(true)}>
  <Plus className="h-4 w-4 mr-2" />
  New Conversation
</Button>

// AFTER:
<Button size="sm" onClick={() => router.push(`/workbase/${workbaseId}/fine-tuning/conversations/generate`)}>
  <Plus className="h-4 w-4 mr-2" />
  New Conversation
</Button>
```

**Also update the inline "Generate your first conversation" link:**
```tsx
// BEFORE:
<button
  className="underline text-duck-blue hover:text-duck-blue/80"
  onClick={() => setShowGenerator(true)}
>
  Generate your first conversation.
</button>

// AFTER:
<button
  className="underline text-duck-blue hover:text-duck-blue/80"
  onClick={() => router.push(`/workbase/${workbaseId}/fine-tuning/conversations/generate`)}
>
  Generate your first conversation.
</button>
```

**Final import list for the cleaned-up page** (remove unused imports):
Keep: `useState`, `useParams`, `useRouter`, `useConversations`, `useTrainingSets`, `useCreateTrainingSet`, `Button`, `Card/CardContent/CardHeader/CardTitle`, `Badge`, `Input`, `Checkbox`, `toast`, `Plus`, `Package`, `ArrowRight`, `Search`, `Loader2`

Remove: `useEffect`, `Sheet`/`SheetContent`/`SheetHeader`/`SheetTitle`/`SheetDescription`, `Select`/`SelectContent`/`SelectItem`/`SelectTrigger`/`SelectValue`, `Wand2`

#### 4b. Create the new Workbase-Scoped Bulk Generator Page

**File to create:** `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/generate/page.tsx`

**Note:** This page automatically inherits the workbase sidebar nav because it lives inside `workbase/[id]/layout.tsx`. No sidebar code is needed in this file.

**Design principles:**
- Visual design: Same token-based palette as all other workbase pages (`bg-background`, `text-foreground`, `bg-card`, `border-border`, etc.)
- The back button navigates to `/workbase/[id]/fine-tuning/conversations`
- After successful batch submission, redirects to `/workbase/[id]/fine-tuning/conversations` (NOT `/batch-jobs/`)
- The `workbaseId` is read from `useParams()` and injected into every request
- Do NOT import or reference `src/app/(dashboard)/bulk-generator/page.tsx` — build this fresh from scratch based on the spec below

**Complete implementation:**

```tsx
'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, Zap, AlertTriangle, ArrowLeft, Layers, Users, Heart, BookOpen } from 'lucide-react';
import { useScaffoldingData } from '@/hooks/use-scaffolding-data';
import { toast } from 'sonner';
import type { ParameterSet } from '@/lib/types/bulk-generator.types';

const AVG_COST_PER_CONVERSATION = 0.45;
const AVG_TIME_PER_CONVERSATION = 60;
const CONCURRENCY = 3;
const DEFAULT_TEMPLATE_ID = '00000000-0000-0000-0000-000000000000';

export default function WorkbaseGeneratorPage() {
  const params = useParams();
  const router = useRouter();
  const workbaseId = params.id as string;

  const { personas, coreArcs, edgeArcs, topics, loading, error } = useScaffoldingData();

  const [category, setCategory] = useState<'core' | 'edge'>('core');
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<string[]>([]);
  const [selectedArcIds, setSelectedArcIds] = useState<string[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const availableArcs = category === 'core' ? coreArcs : edgeArcs;

  const handleCategoryChange = (newCategory: 'core' | 'edge') => {
    setCategory(newCategory);
    setSelectedArcIds([]);
  };

  const estimate = useMemo(() => {
    const count = selectedPersonaIds.length * selectedArcIds.length * selectedTopicIds.length;
    const effectiveTime = (count / CONCURRENCY) * AVG_TIME_PER_CONVERSATION;
    return {
      conversationCount: count,
      formula: `${selectedPersonaIds.length} persona${selectedPersonaIds.length !== 1 ? 's' : ''} × ${selectedArcIds.length} arc${selectedArcIds.length !== 1 ? 's' : ''} × ${selectedTopicIds.length} topic${selectedTopicIds.length !== 1 ? 's' : ''}`,
      estimatedTimeMinutes: Math.ceil(effectiveTime / 60),
      estimatedCostUSD: count * AVG_COST_PER_CONVERSATION,
    };
  }, [selectedPersonaIds.length, selectedArcIds.length, selectedTopicIds.length]);

  const generateParameterSets = (): ParameterSet[] => {
    const sets: ParameterSet[] = [];
    for (const personaId of selectedPersonaIds) {
      for (const arcId of selectedArcIds) {
        for (const topicId of selectedTopicIds) {
          sets.push({
            templateId: DEFAULT_TEMPLATE_ID,
            parameters: {
              persona_id: personaId,
              emotional_arc_id: arcId,
              training_topic_id: topicId,
            },
            tier: category === 'edge' ? 'edge_case' : 'template',
          });
        }
      }
    }
    return sets;
  };

  const handleSubmit = async () => {
    if (estimate.conversationCount === 0) {
      setSubmitError('Please select at least one persona, arc, and topic');
      return;
    }
    try {
      setSubmitting(true);
      setSubmitError(null);

      const parameterSets = generateParameterSets();

      const response = await fetch('/api/conversations/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${category === 'core' ? 'Core' : 'Edge Case'} Batch — ${new Date().toLocaleString()}`,
          parameterSets,
          concurrentProcessing: CONCURRENCY,
          errorHandling: 'continue',
          workbaseId,  // ← Key addition: scopes all generated conversations to this workbase
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit batch');
      }

      toast.success(`Batch of ${estimate.conversationCount} conversations submitted — generation running in background`);
      router.push(`/workbase/${workbaseId}/fine-tuning/conversations`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit batch');
      setSubmitting(false);
    }
  };

  const togglePersona = (id: string) =>
    setSelectedPersonaIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  const toggleArc = (id: string) =>
    setSelectedArcIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  const toggleTopic = (id: string) =>
    setSelectedTopicIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));

  const selectAllPersonas = () =>
    selectedPersonaIds.length === personas.length
      ? setSelectedPersonaIds([])
      : setSelectedPersonaIds(personas.map((p) => p.id));
  const selectAllArcs = () =>
    selectedArcIds.length === availableArcs.length
      ? setSelectedArcIds([])
      : setSelectedArcIds(availableArcs.map((a) => a.id));
  const selectAllTopics = () =>
    selectedTopicIds.length === topics.length
      ? setSelectedTopicIds([])
      : setSelectedTopicIds(topics.map((t) => t.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading scaffolding data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-destructive font-medium">Error loading scaffolding data</p>
        <p className="text-muted-foreground text-sm max-w-md text-center">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto bg-background min-h-full">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/workbase/${workbaseId}/fine-tuning/conversations`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Generate Conversations</h1>
          <p className="text-muted-foreground mt-1">
            Select parameters to generate multiple training conversations for this Work Base.
          </p>
        </div>
      </div>

      {/* Conversation Category */}
      <Card className="mb-6 bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Layers className="h-5 w-5 text-duck-blue" />
            Conversation Category
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Choose the type of conversations to generate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={category}
            onValueChange={(v) => handleCategoryChange(v as 'core' | 'edge')}
            className="space-y-3"
          >
            <div className="flex items-start space-x-3 p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="core" id="core" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="core" className="font-medium cursor-pointer text-foreground">Core Conversations</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Standard emotional journeys (Confusion → Clarity, Fear → Confidence, etc.)
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="edge" id="edge" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="edge" className="font-medium cursor-pointer text-foreground">Edge Case Conversations</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Boundary and crisis scenarios (Crisis → Referral, Hostility → Boundary, etc.)
                </p>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Personas */}
      <Card className="mb-6 bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Users className="h-5 w-5 text-duck-blue" />
              Personas
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {personas.length} available • {selectedPersonaIds.length} selected
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={selectAllPersonas}>
            {selectedPersonaIds.length === personas.length ? 'Deselect All' : 'Select All'}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {personas.map((persona) => (
              <div
                key={persona.id}
                className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={`persona-${persona.id}`}
                  checked={selectedPersonaIds.includes(persona.id)}
                  onCheckedChange={() => togglePersona(persona.id)}
                />
                <Label htmlFor={`persona-${persona.id}`} className="flex-1 cursor-pointer text-foreground">
                  <span className="font-medium">{persona.name}</span>
                  {persona.archetype && (
                    <span className="text-muted-foreground ml-2 text-sm">— {persona.archetype}</span>
                  )}
                </Label>
              </div>
            ))}
            {personas.length === 0 && (
              <p className="text-muted-foreground text-sm py-4 text-center">
                No personas found. Please check your database setup.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Emotional Arcs */}
      <Card className="mb-6 bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Heart className="h-5 w-5 text-duck-blue" />
              {category === 'core' ? 'Emotional Arcs' : 'Edge Case Arcs'}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {availableArcs.length} available • {selectedArcIds.length} selected
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={selectAllArcs}
            disabled={availableArcs.length === 0}
          >
            {selectedArcIds.length === availableArcs.length && availableArcs.length > 0
              ? 'Deselect All'
              : 'Select All'}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {availableArcs.map((arc) => (
              <div
                key={arc.id}
                className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={`arc-${arc.id}`}
                  checked={selectedArcIds.includes(arc.id)}
                  onCheckedChange={() => toggleArc(arc.id)}
                />
                <Label htmlFor={`arc-${arc.id}`} className="flex-1 cursor-pointer text-foreground">
                  <span className="font-medium">{arc.name}</span>
                  {arc.arc_strategy && (
                    <span className="text-muted-foreground ml-2 text-sm">— {arc.arc_strategy}</span>
                  )}
                </Label>
              </div>
            ))}
            {availableArcs.length === 0 && (
              <p className="text-muted-foreground text-sm py-4 text-center">
                No {category === 'core' ? 'core' : 'edge case'} arcs found.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Training Topics */}
      <Card className="mb-6 bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <BookOpen className="h-5 w-5 text-duck-blue" />
              Training Topics
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {topics.length} available • {selectedTopicIds.length} selected
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={selectAllTopics}
            disabled={topics.length === 0}
          >
            {selectedTopicIds.length === topics.length && topics.length > 0
              ? 'Deselect All'
              : 'Select All'}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[350px] overflow-y-auto pr-2">
            {topics.map((topic) => (
              <div
                key={topic.id}
                className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={`topic-${topic.id}`}
                  checked={selectedTopicIds.includes(topic.id)}
                  onCheckedChange={() => toggleTopic(topic.id)}
                />
                <Label htmlFor={`topic-${topic.id}`} className="flex-1 cursor-pointer text-sm text-foreground">
                  <span className="font-medium">{topic.name}</span>
                  {topic.category && (
                    <span className="text-muted-foreground block text-xs">{topic.category}</span>
                  )}
                </Label>
              </div>
            ))}
            {topics.length === 0 && (
              <p className="text-muted-foreground text-sm py-4 text-center col-span-2">
                No training topics found.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Batch Summary */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Zap className="h-5 w-5 text-primary" />
            Batch Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Conversations to Generate</p>
              <p className="text-4xl font-bold tracking-tight text-foreground">{estimate.conversationCount}</p>
              <p className="text-xs text-muted-foreground">{estimate.formula}</p>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Estimated Time</p>
                <p className="text-xl font-semibold text-foreground">
                  ~{estimate.estimatedTimeMinutes}{' '}
                  {estimate.estimatedTimeMinutes === 1 ? 'minute' : 'minutes'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estimated Cost</p>
                <p className="text-xl font-semibold text-foreground">${estimate.estimatedCostUSD.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {submitError && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <Separator />

          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => router.push(`/workbase/${workbaseId}/fine-tuning/conversations`)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || estimate.conversationCount === 0}
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting Batch...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Generate {estimate.conversationCount} Conversations
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 6. Implementation Order

Implement these tasks in this exact order:

| Order | Task | Files Changed | Risk |
|-------|------|---------------|------|
| 1 | Fix `data.data` → `data.conversations` | `src/hooks/use-conversations.ts` (1 line) | Zero risk |
| 2 | Run SAOL script to assign 10 orphaned conversations | DB only | Low |
| 3 | Add `workbaseId` to `BatchGenerationRequest` interface | `src/lib/services/batch-generation-service.ts` | Low |
| 4 | Patch workbase_id after each generation in `startBatchGeneration` | `src/lib/services/batch-generation-service.ts` | Low |
| 5 | Add `workbaseId` to API route Zod schema and pass to service | `src/app/api/conversations/generate-batch/route.ts` | Low |
| 6 | Remove Sheet generator from workbase conversations page, replace button with navigation link | `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx` | Medium |
| 7 | Create new workbase-scoped generator page | `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/generate/page.tsx` (NEW) | Medium |

---

## 7. Build Verification

After all tasks are complete:

```bash
cd c:/Users/james/Master/BrightHub/BRun/v4-show
npm run build
```

Expected result: zero compilation errors.

---

## 8. QA Checklist

After deploying to Vercel:

- [ ] `/workbase/232bea74-.../fine-tuning/conversations` — shows 61 conversations (51 backfilled + 10 orphans reassigned)
- [ ] `/workbase/4fc8fa25-.../fine-tuning/conversations` — shows 0 conversations (correct — none assigned to this workbase yet)
- [ ] "+ New Conversation" button on conversations page — navigates to `/workbase/[id]/fine-tuning/conversations/generate`
- [ ] New generator page loads correctly — shows personas, arcs, topics from scaffolding API
- [ ] Selecting personas/arcs/topics → count updates in Batch Summary
- [ ] Submitting batch → success toast → redirect back to conversations page
- [ ] After redirect, conversations page shows the new conversations (with correct `workbase_id`)
- [ ] The old `/bulk-generator` still works independently (do not break it)
- [ ] `npm run build` passes with zero errors

---

## 9. Files NOT to Modify

| File | Reason |
|------|--------|
| `src/app/(dashboard)/bulk-generator/page.tsx` | Backup — keep operational as-is |
| `src/app/(dashboard)/conversations/page.tsx` | Legacy page — still used for raw data access |
| `src/app/api/conversations/generate/route.ts` | Single-conversation generate is already workbase-aware |
| `src/lib/types/conversations.ts` | `FilterConfig` already has `workbaseId?: string` — no changes needed |
| All `globals.css`, `tailwind.config.js`, `polish.css`, or any Session 11 design token files | Design palette is complete — do not touch |

---

## 10. Important Notes for Implementing Agent

1. **The `batch-generation-service.ts` is complex** — read it fully before editing. The `startBatchGeneration()` method manages concurrency internally. The workbase_id patch should happen immediately after `generateSingleConversation()` returns a successful result for each conversation item. Look for the loop that processes each `ParameterSet` and the result handling after `generationResult.success === true`.

2. **`use-conversations.ts` exports many hooks** — only the `fetchConversations` function (line ~34–118) needs to change. Do not alter any mutation hooks or other query hooks.

3. **The new generator page inherits the sidebar** because it lives inside `src/app/(dashboard)/workbase/[id]/` — the `layout.tsx` at that level wraps all children with the sidebar nav. No sidebar code is needed in the new page.

4. **Do not add the generate page to the sidebar nav items** in `layout.tsx` — it is a sub-page of conversations, not a top-level nav item.

5. **SAOL rules**: Run the orphaned conversation script with `dryRun: true` first. Verify it targets exactly 10 rows before setting `dryRun: false`.

6. **Design tokens**: All new code must use semantic design tokens (`bg-background`, `text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`, `bg-muted`, `bg-primary`, `text-duck-blue`, etc.). Zero hardcoded `zinc-*` or `gray-*` color classes permitted.
