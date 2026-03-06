# Adapter Application Module - E05B Implementation Checklist

**Version:** 1.0  
**Date:** January 17, 2026  
**Purpose:** Verification checklist for E05B implementation  

---

## Pre-Implementation Checklist

Before starting E05B, verify prerequisites are complete:

- [ ] **E01 Complete**: Database tables and types created
- [ ] **E02 Complete**: Service layer implemented
- [ ] **E03 Complete**: API routes functional
- [ ] **E04B Complete**: React Query hooks working
- [ ] **Environment**: All required env vars set
- [ ] **Database**: Migration applied successfully
- [ ] **Dependencies**: All npm packages installed

---

## Implementation Checklist

### Phase 1: Component Files

#### DeployAdapterButton.tsx
- [ ] File created at `src/components/pipeline/DeployAdapterButton.tsx`
- [ ] Imports `useAdapterDeployment` from `@/hooks`
- [ ] Shows "Deploy & Test Adapter" initially
- [ ] Shows "Deploying Endpoints..." during deployment
- [ ] Shows "Test Adapter" when ready
- [ ] Navigates to `/pipeline/jobs/[jobId]/test` on click
- [ ] Shows retry button on failure
- [ ] Tooltips display deployment status
- [ ] No TypeScript errors
- [ ] No linter warnings

#### EndpointStatusBanner.tsx
- [ ] File created at `src/components/pipeline/EndpointStatusBanner.tsx`
- [ ] Imports types from `@/hooks`
- [ ] Displays green success state when ready
- [ ] Displays yellow deploying state with progress bar
- [ ] Displays red error state with error message
- [ ] Shows "30-60 seconds" time estimate
- [ ] Status icons change based on state
- [ ] Responsive on mobile and desktop
- [ ] No TypeScript errors
- [ ] No linter warnings

#### ABTestingPanel.tsx
- [ ] File created at `src/components/pipeline/ABTestingPanel.tsx`
- [ ] Imports `useAdapterTesting` from `@/hooks`
- [ ] System prompt textarea with default value
- [ ] User prompt textarea with validation
- [ ] Example prompt buttons work
- [ ] Character counter displays
- [ ] Claude evaluation toggle works
- [ ] Run button disabled when endpoints not ready
- [ ] Shows loading state during test execution
- [ ] Displays `latestResult` automatically
- [ ] No TypeScript errors
- [ ] No linter warnings

#### TestResultComparison.tsx
- [ ] File created at `src/components/pipeline/TestResultComparison.tsx`
- [ ] Imports `useAdapterTesting` from `@/hooks`
- [ ] Claude-as-Judge verdict displays (if enabled)
- [ ] Winner badge shows correctly
- [ ] Score comparison displayed
- [ ] Improvements list shown
- [ ] Regressions list shown
- [ ] Side-by-side responses display
- [ ] Generation time shown
- [ ] Token usage shown
- [ ] Evaluation scores breakdown (if enabled)
- [ ] Rating buttons work (control/adapted/tie/neither)
- [ ] Notes textarea displays
- [ ] Rating saves with optimistic update
- [ ] Already-rated state shows correctly
- [ ] No TypeScript errors
- [ ] No linter warnings

#### TestHistoryTable.tsx
- [ ] File created at `src/components/pipeline/TestHistoryTable.tsx`
- [ ] Imports `useAdapterTesting` from `@/hooks`
- [ ] Displays test history in table
- [ ] Time column shows relative timestamps
- [ ] Prompt column truncates long text
- [ ] AI verdict badge displays
- [ ] User rating icons display
- [ ] Generation time comparison shows
- [ ] View details button works
- [ ] Pagination controls work
- [ ] "Page X of Y" displays correctly
- [ ] Empty state shows when no tests
- [ ] Loading state shows during fetch
- [ ] No TypeScript errors
- [ ] No linter warnings

### Phase 2: Component Integration

#### Component Index
- [ ] File `src/components/pipeline/index.ts` updated
- [ ] `DeployAdapterButton` exported
- [ ] `ABTestingPanel` exported
- [ ] `TestResultComparison` exported
- [ ] `EndpointStatusBanner` exported
- [ ] `TestHistoryTable` exported
- [ ] No TypeScript errors

#### Test Page
- [ ] File created at `src/app/(dashboard)/pipeline/jobs/[jobId]/test/page.tsx`
- [ ] Imports `useAdapterWorkflow` from `@/hooks`
- [ ] Imports all 5 components from `@/components/pipeline`
- [ ] Header displays job name
- [ ] Back button navigates to results page
- [ ] "Ready" badge shows when both endpoints ready
- [ ] `EndpointStatusBanner` displays
- [ ] Tabs component displays (Run Test / History)
- [ ] "Run Test" tab shows `ABTestingPanel`
- [ ] "History" tab shows `TestHistoryTable`
- [ ] History count badge displays
- [ ] Selected test detail view works
- [ ] Loading state shows while loading job
- [ ] "Job Not Found" state shows if invalid jobId
- [ ] "Training Not Complete" state shows if job not completed
- [ ] No TypeScript errors
- [ ] No linter warnings

#### Results Page Update
- [ ] File `src/app/(dashboard)/pipeline/jobs/[jobId]/results/page.tsx` updated
- [ ] `DeployAdapterButton` imported from `@/components/pipeline`
- [ ] Deploy button added next to Download button
- [ ] Buttons display in flex container with gap
- [ ] Download button changed to outline variant
- [ ] Deploy button only shows if `job.adapterFilePath` exists
- [ ] No TypeScript errors
- [ ] No linter warnings

### Phase 3: Verification

#### TypeScript Compilation
- [ ] Run `npx tsc --noEmit` in `src/` directory
- [ ] Exit code is 0 (success)
- [ ] No type errors displayed
- [ ] All imports resolve correctly
- [ ] All types are properly defined

#### Linter Check
- [ ] Run `npx eslint components/pipeline/*.tsx`
- [ ] Exit code is 0 (success)
- [ ] 0 errors reported
- [ ] 0 warnings reported
- [ ] All files pass linting

#### File Structure
- [ ] `src/components/pipeline/DeployAdapterButton.tsx` exists
- [ ] `src/components/pipeline/EndpointStatusBanner.tsx` exists
- [ ] `src/components/pipeline/ABTestingPanel.tsx` exists
- [ ] `src/components/pipeline/TestResultComparison.tsx` exists
- [ ] `src/components/pipeline/TestHistoryTable.tsx` exists
- [ ] `src/components/pipeline/index.ts` updated
- [ ] `src/app/(dashboard)/pipeline/jobs/[jobId]/test/page.tsx` exists
- [ ] `src/app/(dashboard)/pipeline/jobs/[jobId]/results/page.tsx` updated

#### Hook Imports
- [ ] All components import from `@/hooks` (not relative paths)
- [ ] `useAdapterDeployment` imported correctly
- [ ] `useAdapterTesting` imported correctly
- [ ] `useAdapterWorkflow` imported correctly
- [ ] Types imported correctly (`TestResult`, `UserRating`, etc.)

#### Component Exports
- [ ] `DeployAdapterButton` exported from index
- [ ] `ABTestingPanel` exported from index
- [ ] `TestResultComparison` exported from index
- [ ] `EndpointStatusBanner` exported from index
- [ ] `TestHistoryTable` exported from index

---

## Functional Testing Checklist

### Test Scenario 1: Initial Deployment

- [ ] Navigate to completed job results page
- [ ] "Deploy & Test Adapter" button is visible
- [ ] Click "Deploy & Test Adapter" button
- [ ] Button changes to "Deploying Endpoints..."
- [ ] Spinner icon appears
- [ ] Button is disabled during deployment
- [ ] Tooltip shows deployment status
- [ ] Page does NOT navigate yet

### Test Scenario 2: Deployment Progress

- [ ] Status updates automatically every 5 seconds
- [ ] Tooltip shows "Control: ⏳ Deploying"
- [ ] Tooltip shows "Adapted: ⏳ Deploying"
- [ ] "Auto-updating every 5 seconds" text displays
- [ ] After 30-60 seconds, endpoints become ready
- [ ] Button changes to "Test Adapter"
- [ ] Button is re-enabled

### Test Scenario 3: Navigate to Test Page

- [ ] Click "Test Adapter" button
- [ ] Browser navigates to `/pipeline/jobs/[jobId]/test`
- [ ] Test page loads successfully
- [ ] Job name displays in header
- [ ] "Ready" badge displays
- [ ] `EndpointStatusBanner` shows green success state
- [ ] "Both inference endpoints are deployed and ready" message
- [ ] Tabs display: "Run Test" and "Test History"

### Test Scenario 4: Run First Test

- [ ] "Run Test" tab is active by default
- [ ] System prompt textarea has default value
- [ ] User prompt textarea is empty
- [ ] Example buttons display (1, 2, 3)
- [ ] Click "Example 1" button
- [ ] User prompt textarea fills with example
- [ ] Character counter displays
- [ ] Claude evaluation toggle is OFF by default
- [ ] Toggle Claude evaluation ON
- [ ] "$0.02 per test" message displays
- [ ] Click "Run Test" button
- [ ] Button shows "Running Test..." with spinner
- [ ] Button is disabled
- [ ] After 2-5 seconds, test completes
- [ ] `TestResultComparison` component displays below

### Test Scenario 5: View Test Results

#### Claude-as-Judge Verdict
- [ ] Verdict card displays at top
- [ ] Winner badge shows (Adapted/Control/Tie)
- [ ] Score comparison shows (e.g., "4.2 vs 3.8 (+0.4)")
- [ ] Summary text displays
- [ ] Improvements list shows (if any)
- [ ] Regressions list shows (if any)

#### Side-by-Side Comparison
- [ ] Two cards display side-by-side (desktop) or stacked (mobile)
- [ ] Left card: "Control (Base Model)"
- [ ] Right card: "Adapted (With LoRA)"
- [ ] Control response text displays
- [ ] Adapted response text displays
- [ ] Generation time shows for both (e.g., "1234ms")
- [ ] Token usage shows for both (e.g., "567 tokens")
- [ ] Winner badge shows on adapted card (if it won)

#### Evaluation Scores
- [ ] "Evaluation Scores" section displays (if eval enabled)
- [ ] Empathy score shows (e.g., "4/5")
- [ ] Voice score shows (e.g., "5/5")
- [ ] Quality score shows (e.g., "4/5")
- [ ] Overall score shows (e.g., "4/5")
- [ ] Scores display for both control and adapted

#### Rating Interface
- [ ] "Your Rating" card displays
- [ ] Four buttons: "Control Better", "Adapted Better", "Tie", "Neither"
- [ ] Notes textarea displays
- [ ] All buttons are enabled
- [ ] Enter notes: "Adapted response was more empathetic"
- [ ] Click "Adapted Better" button
- [ ] Rating saves immediately (optimistic update)
- [ ] Card changes to "You rated this test: adapted"
- [ ] Notes display: "Adapted response was more empathetic"
- [ ] Green checkmark icon displays

### Test Scenario 6: Test History

- [ ] Click "Test History" tab
- [ ] Tab shows badge with count "1"
- [ ] History table displays
- [ ] One row displays with test data
- [ ] Time column shows "X minutes ago"
- [ ] Prompt column shows user prompt (truncated if long)
- [ ] AI Verdict column shows badge "Adapted" with trophy icon
- [ ] Your Rating column shows "Adapted" with thumbs up
- [ ] Gen Time column shows "C: 1234ms" and "A: 1456ms"
- [ ] Eye icon button displays in last column

### Test Scenario 7: View Test Detail

- [ ] Click eye icon button in history table
- [ ] "Test Details" section displays below table
- [ ] "Close" button displays
- [ ] `TestResultComparison` component displays
- [ ] Shows the same test from history
- [ ] Rating is already saved (not editable again)
- [ ] Click "Close" button
- [ ] Detail section closes

### Test Scenario 8: Run Multiple Tests

- [ ] Click "Run Test" tab
- [ ] Enter new prompt: "I'm stressed about retirement savings"
- [ ] Disable Claude evaluation (toggle OFF)
- [ ] Click "Run Test"
- [ ] Test runs and completes
- [ ] Results display
- [ ] No Claude verdict (because eval disabled)
- [ ] Side-by-side comparison shows
- [ ] Rate as "Tie"
- [ ] Click "Test History" tab
- [ ] Badge now shows "2"
- [ ] Two rows in history table
- [ ] Newest test at top (sorted by time)

### Test Scenario 9: Pagination

- [ ] Create 25+ tests (or mock data)
- [ ] History table shows only 20 rows
- [ ] "Showing 1-20 of 25 tests" text displays
- [ ] "Page 1 of 2" displays
- [ ] "Previous" button is disabled
- [ ] "Next" button is enabled
- [ ] Click "Next" button
- [ ] Table shows rows 21-25
- [ ] "Showing 21-25 of 25 tests" text displays
- [ ] "Page 2 of 2" displays
- [ ] "Previous" button is enabled
- [ ] "Next" button is disabled

### Test Scenario 10: Error Handling

#### Deployment Failure
- [ ] Simulate deployment failure (bad API key)
- [ ] Button shows "Retry Deployment" in red
- [ ] Error icon displays
- [ ] Tooltip shows error message
- [ ] Click "Retry Deployment"
- [ ] Deployment attempts again

#### Test Execution Failure
- [ ] Simulate test failure (endpoints down)
- [ ] Red error alert displays above form
- [ ] "Test Failed: [error message]" displays
- [ ] Form remains enabled
- [ ] Click "Run Test" again to retry

#### Empty States
- [ ] View history tab with 0 tests
- [ ] "No tests run yet" message displays
- [ ] "Use the panel above to run your first A/B test" displays
- [ ] No table displays

### Test Scenario 11: Responsive Design

#### Desktop (1920px)
- [ ] All components display correctly
- [ ] Side-by-side comparison uses 2 columns
- [ ] Tables show all columns
- [ ] Buttons have proper spacing

#### Tablet (768px)
- [ ] All components display correctly
- [ ] Side-by-side comparison may stack
- [ ] Tables remain usable
- [ ] Buttons wrap properly

#### Mobile (375px)
- [ ] All components display correctly
- [ ] Side-by-side comparison stacks vertically
- [ ] Tables scroll horizontally if needed
- [ ] Buttons stack vertically

### Test Scenario 12: Loading States

- [ ] Job loading shows spinner in center
- [ ] Endpoint status loading (handled by hooks)
- [ ] Test running shows spinner in button
- [ ] History loading shows spinner with text
- [ ] All loading states have proper text

### Test Scenario 13: Navigation

- [ ] Back button (←) navigates to results page
- [ ] "Test Adapter" button navigates to test page
- [ ] Browser back button works correctly
- [ ] Browser forward button works correctly
- [ ] Direct URL access works (`/pipeline/jobs/[jobId]/test`)

---

## Performance Checklist

### Polling Behavior
- [ ] Endpoint status polls every 5 seconds
- [ ] Polling stops when both endpoints ready
- [ ] Polling resumes if endpoints fail
- [ ] Polling respects browser tab visibility
- [ ] No memory leaks from polling

### Cache Management
- [ ] Test history cached for 30 seconds
- [ ] Endpoint status cached for 10 seconds
- [ ] Running test invalidates test history cache
- [ ] Rating test invalidates test history cache
- [ ] Deploying invalidates endpoint status cache

### Optimistic Updates
- [ ] Rating displays immediately on click
- [ ] Rating syncs to server in background
- [ ] Rating reverts if server fails
- [ ] User sees loading indicator during sync

### Bundle Size
- [ ] Components are tree-shakeable
- [ ] Icons imported individually (not `import * from 'lucide-react'`)
- [ ] No large dependencies added
- [ ] Total bundle increase < 50KB gzipped

---

## Code Quality Checklist

### TypeScript
- [ ] All components have proper prop interfaces
- [ ] All props are typed (no `any`)
- [ ] All function returns are typed (or inferred)
- [ ] All imports have correct types
- [ ] No `@ts-ignore` comments
- [ ] No `@ts-expect-error` comments

### React Best Practices
- [ ] All hooks called at top level
- [ ] All dependencies in `useEffect` arrays
- [ ] All event handlers use `useCallback` (if needed)
- [ ] All memoization uses `useMemo` (if needed)
- [ ] No inline object/array creation in render

### Accessibility
- [ ] All buttons have proper labels
- [ ] All form inputs have labels
- [ ] All icons have aria-labels (or hidden from screen readers)
- [ ] Keyboard navigation works
- [ ] Tab order is logical

### Error Boundaries
- [ ] Components handle null/undefined gracefully
- [ ] Components show error states
- [ ] Components don't crash on bad data
- [ ] User sees helpful error messages

---

## Documentation Checklist

- [ ] `ADAPTER_E05B_COMPLETE.md` created
- [ ] `ADAPTER_E05B_QUICK_START.md` created
- [ ] `ADAPTER_E05B_CHECKLIST.md` created (this file)
- [ ] Component JSDoc comments added
- [ ] Prop interfaces documented
- [ ] Complex logic has inline comments

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] TypeScript compiles
- [ ] Linter passes
- [ ] Environment variables set
- [ ] Database migration applied
- [ ] Vercel build succeeds

### Post-Deployment
- [ ] Test in production environment
- [ ] Verify API routes work
- [ ] Verify database writes work
- [ ] Verify RunPod integration works
- [ ] Verify Claude evaluation works (if enabled)
- [ ] Check error logging

---

## Success Criteria

✅ **E05B is complete when:**

- [ ] All 5 components created and working
- [ ] Test page created and functional
- [ ] Results page updated with deploy button
- [ ] TypeScript compiles without errors
- [ ] Linter passes without warnings
- [ ] All functional tests pass
- [ ] All performance checks pass
- [ ] All code quality checks pass
- [ ] Documentation complete
- [ ] End-to-end workflow functional

---

## Final Sign-Off

**Implementation Date:** _______________  
**Verified By:** _______________  
**Status:** ⬜ Complete ⬜ Incomplete  

**Notes:**
_______________________________________
_______________________________________
_______________________________________

---

**Document Version:** 1.0  
**Last Updated:** January 17, 2026
