# Inference Storage & Rating System - Investigation & Solutions

**Date**: January 24, 2026  
**Document Version**: v1

---

## Question 1: Database Table for Prompt Responses

### ✅ Answer: YES - The `pipeline_test_results` Table Stores Everything

**Table Name**: `pipeline_test_results`

The database currently stores ALL prompt elements in a single relational table:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key - unique test result ID |
| `job_id` | UUID | Foreign key to `pipeline_training_jobs` - relates test to adapter |
| `user_id` | UUID | User who ran the test |
| `system_prompt` | TEXT | The system context prompt (optional) |
| `user_prompt` | TEXT | The user's input prompt |
| `control_response` | TEXT | Base model's response |
| `adapted_response` | TEXT | LoRA-adapted model's response |
| `control_generation_time_ms` | INTEGER | Base model response time |
| `adapted_generation_time_ms` | INTEGER | Adapted model response time |
| `control_tokens_used` | INTEGER | Tokens consumed by base model |
| `adapted_tokens_used` | INTEGER | Tokens consumed by adapted model |
| `status` | TEXT | `pending`, `generating`, `evaluating`, `completed`, `failed` |
| `created_at` | TIMESTAMP | When test was initiated |
| `completed_at` | TIMESTAMP | When test finished |
| `user_rating` | TEXT | `control`, `adapted`, `tie`, `neither` |
| `user_notes` | TEXT | Free-form rating notes |
| `control_evaluation` | JSONB | Claude-as-Judge evaluation (if enabled) |
| `adapted_evaluation` | JSONB | Claude-as-Judge evaluation (if enabled) |
| `evaluation_comparison` | JSONB | Winner + score comparison data |
| `error_message` | TEXT | Error details if test failed |

### Relational Structure

The table is **relational** through `job_id`:

```
pipeline_test_results.job_id → pipeline_training_jobs.id
```

This means:
- Each test result is linked to a specific training job (adapter)
- You can query all tests for a given adapter
- Both control and adapted responses are stored together in the same row

### Data Storage Code Location

**File**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\test-service.ts`

**Function**: `runABTest()` (lines 166-333)

**Storage Flow**:
1. Creates initial record with `status: 'generating'` and `user_prompt`/`system_prompt`
2. Runs sequential inference (control first, then adapted)
3. Updates record with both responses and timing data
4. If evaluation enabled, runs Claude-as-Judge and stores results
5. Sets `status: 'completed'`

---

## Question 2: "Your Rating" System Functionality

### ✅ Answer: YES - The Rating System is FULLY FUNCTIONAL

The "Your Rating" box with options **Control Better, Adapted Better, Tie, Neither** plus **Notes** is completely implemented and working.

### What It Does (Human Operations Level)

When you click one of the rating buttons:

1. **Your Selection is Recorded**: The rating value (`control`, `adapted`, `tie`, or `neither`) is stored in the `user_rating` column of the `pipeline_test_results` table

2. **Your Notes are Saved**: Any text in the Notes field is stored in the `user_notes` column

3. **UI Updates**: The rating section changes to show "You rated this test: [your choice]" with your notes displayed

4. **Data is Persistent**: Your rating is permanently stored in the database and associated with that specific test result

### Why This Matters

The rating feature allows you to:
- **Build ground truth data**: Your human judgment becomes training signal for future evaluations
- **Track adapter effectiveness**: Compare your assessment to Claude-as-Judge scores
- **Document observations**: Notes field captures qualitative feedback
- **Create audit trail**: All ratings are timestamped and linked to specific prompts

### Technical Implementation Details

| Layer | File | Function |
|-------|------|----------|
| **UI Component** | `src/components/pipeline/TestResultComparison.tsx` | Lines 235-318 - Rating buttons + notes textarea |
| **React Hook** | `src/hooks/useAdapterTesting.ts` | `rateTest()` mutation with optimistic updates |
| **API Route** | `src/app/api/pipeline/adapters/rate/route.ts` | POST handler with validation |
| **Service Layer** | `src/lib/services/test-service.ts` | `rateTestResult()` function (lines 372-398) |
| **Database** | `pipeline_test_results` table | `user_rating` and `user_notes` columns |

### Rating Type Definition

```typescript
export type UserRating = 'control' | 'adapted' | 'tie' | 'neither';
```

---

## Question 3: Future Requirements - Retrieval & Copy/Paste

### 3a. Job-Agnostic Retrieval Page

**Current State**: Test results are currently only viewable on the job-specific test page at:
```
/pipeline/jobs/[jobId]/test
```

**Proposed Solution**: Create a new **Test Results Browser** page.

#### Recommended Implementation

**New Route**: `/pipeline/test-results` (or `/pipeline/evaluations`)

**Features**:
1. **Date/Time Filter**: Query tests by date range with timestamp ordering
2. **Job Filter (Optional)**: Can filter by specific job or show all jobs
3. **Full Conversation Display**: 
   - Original prompt (system + user)
   - Control response
   - Adapted response
   - All in one view

**UI Mockup Concept**:
```
┌─────────────────────────────────────────────────────────────────┐
│ Test Results Browser                                    [Filter]│
├─────────────────────────────────────────────────────────────────┤
│ Date Range: [Jan 20, 2026] to [Jan 24, 2026]  Job: [All Jobs ▼] │
├─────────────────────────────────────────────────────────────────┤
│ ▼ Jan 24, 2026 - 7:35 PM - Job: emotional-intelligence         │
│   ┌───────────────────────────────────────────────────────────┐ │
│   │ ORIGINAL PROMPT                                   [📋 Copy]│ │
│   │ System: You are a helpful financial advisor...            │ │
│   │ User: I'm worried about my retirement savings...          │ │
│   ├───────────────────────────────────────────────────────────┤ │
│   │ CONTROL RESPONSE                                  [📋 Copy]│ │
│   │ I understand your concerns about retirement...            │ │
│   ├───────────────────────────────────────────────────────────┤ │
│   │ ADAPTED RESPONSE                                  [📋 Copy]│ │
│   │ I can really hear the worry in your question...           │ │
│   ├───────────────────────────────────────────────────────────┤ │
│   │                                          [📋 Copy All]    │ │
│   └───────────────────────────────────────────────────────────┘ │
│ ▶ Jan 24, 2026 - 6:22 PM - Job: emotional-intelligence         │
│ ▶ Jan 23, 2026 - 9:15 PM - Job: compliance-v2                  │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation Files Needed**:

1. **Page Component**: `src/app/(dashboard)/pipeline/test-results/page.tsx`
2. **API Route**: `src/app/api/pipeline/test-results/route.ts` (GET with date/job filters)
3. **Component**: `src/components/pipeline/TestResultBrowser.tsx`
4. **Service Function**: Add `getAllTestResults()` to `test-service.ts`

---

### 3b. Copy/Paste Functionality (Ctrl+C to Windows Clipboard)

**Problem**: Current UI displays responses in scrollable divs, but there's no easy way to copy entire content blocks.

**Proposed Solutions**:

#### Option A: Copy Buttons (Recommended - Easiest)

Add a "Copy" button to each section that uses the Clipboard API:

```typescript
const handleCopy = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  } catch {
    toast.error('Failed to copy to clipboard');
  }
};
```

**Buttons to Add**:
- "Copy Prompt" - Copies combined system + user prompt
- "Copy Control Response" 
- "Copy Adapted Response"
- "Copy All" - Copies entire test in a formatted block

#### Option B: Selectable Text Areas

Change the response display from styled divs to `<textarea readOnly>` elements that allow easy text selection.

#### Option C: "Export to Clipboard" Button

Single button that formats everything nicely:

```
=== ORIGINAL PROMPT ===
System: [system prompt here]
User: [user prompt here]

=== CONTROL (BASE MODEL) RESPONSE ===
[control response here]

=== ADAPTED (LORA) RESPONSE ===
[adapted response here]

=== METADATA ===
Test ID: abc123
Date: Jan 24, 2026 7:35 PM
Job: emotional-intelligence
Rating: Adapted Better
```

---

## Summary of Next Steps

| Priority | Task | Effort | Outcome |
|----------|------|--------|---------|
| **1** | Add Copy buttons to existing `TestResultComparison.tsx` | Low | Immediate copy/paste capability |
| **2** | Create `/pipeline/test-results` page | Medium | Job-agnostic browsing |
| **3** | Add "Copy All" formatted export | Low | Full conversation export |
| **4** | Add date range filter API | Medium | Historical browsing |

---

## Implementation Readiness

**Database**: ✅ Already stores all required fields  
**API**: ✅ `getTestHistory()` exists (needs expansion for cross-job queries)  
**Types**: ✅ `TestResult` interface fully defined  
**Service Layer**: ✅ Foundation exists, needs new query function  
**UI**: ⚠️ Needs new page component and copy functionality

---

**Document Created**: January 24, 2026  
**Author**: Gemini Agent  
**Related Files**:
- `src/lib/services/test-service.ts`
- `src/components/pipeline/TestResultComparison.tsx`
- `src/types/pipeline-adapter.ts`
- `src/app/api/pipeline/adapters/rate/route.ts`

---

## Question 4: Claude-as-Judge Evaluation Feature (Deep Dive)

**Date Added**: January 25, 2026

---

### What EXACTLY Does Claude-as-Judge Do? (Human Operations Level)

Claude-as-Judge is an **automated quality evaluation system** that uses Claude (Anthropic's AI) to score and compare both the control and adapted model responses on multiple dimensions.

**In simple terms**: After both models generate their responses to your prompt, Claude reads each response and grades it like a teacher grading an essay, using a detailed rubric.

**What happens when enabled**:

1. **You submit a test prompt** → Both models generate responses
2. **Claude reads Response #1 (Control)** → Produces structured evaluation with scores
3. **Claude reads Response #2 (Adapted)** → Produces structured evaluation with scores
4. **System compares both evaluations** → Determines winner, improvements, and regressions
5. **Results displayed in UI** → Shows verdict, scores, and detailed breakdown

**Cost**: ~$0.02 per test (two Claude API calls with ~2000 token responses each)

---

### How Is It Enabled?

**Yes, you must enable it BEFORE submitting** the prompt.

**Location**: On the test page, there is a **toggle switch** directly above the "Run Test" button:

```
┌─────────────────────────────────────────────────────────────┐
│  [Toggle Switch] Enable Claude-as-Judge Evaluation          │
│                  Adds automated evaluation metrics (~$0.02) │
│                                                             │
│                                      [Run Test] button      │
└─────────────────────────────────────────────────────────────┘
```

**Code Location**: `src/components/pipeline/ABTestingPanel.tsx` (lines 156-174)

```typescript
const [enableEvaluation, setEnableEvaluation] = useState(false);  // Default: OFF

<Switch
  id="enable-eval"
  checked={enableEvaluation}
  onCheckedChange={setEnableEvaluation}
/>
<Label>Enable Claude-as-Judge Evaluation</Label>
```

**Important Notes**:
- Default is **OFF** (to avoid unnecessary API costs)
- The toggle is **disabled** if endpoints aren't ready
- Once a test is submitted WITHOUT evaluation, you cannot retroactively run evaluation on those responses
- The `evaluation_enabled` flag is stored in the database with each test result

---

### Where Are the Results Shown?

**Location**: In the `TestResultComparison` component, displayed immediately after a test completes.

**UI Layout**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🏆 Claude-as-Judge Verdict                                              │
│                                                                         │
│ [🏆 Adapted Model Wins]   Score: 3.5 vs 4.2 (+0.7)                     │
│                                                                         │
│ "The adapted response performed better with a score difference of       │
│  0.7 points."                                                           │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ✓ Improvements:                                                     │ │
│ │   • Higher empathy score                                            │ │
│ │   • Better voice consistency                                        │ │
│ │   • Completed emotional arc                                         │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ⚠ Regressions:                                                      │ │
│ │   • Lower quality guidance                                          │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────┐ ┌─────────────────────────────────┐
│ Control (Base Model)            │ │ Adapted (With LoRA) [Winner]    │
│                                 │ │                                 │
│ [Response text...]              │ │ [Response text...]              │
│                                 │ │                                 │
│ ─────────────────────────────── │ │ ─────────────────────────────── │
│ Evaluation Scores               │ │ Evaluation Scores               │
│   Empathy:  3/5                 │ │   Empathy:  4/5                 │
│   Voice:    3/5                 │ │   Voice:    4/5                 │
│   Quality:  4/5                 │ │   Quality:  4/5                 │
│   Overall:  3.5/5               │ │   Overall:  4.2/5               │
└─────────────────────────────────┘ └─────────────────────────────────┘
```

**Code Location**: `src/components/pipeline/TestResultComparison.tsx` (lines 46-109 for verdict, lines 139-166 and 203-230 for individual scores)

---

### The Evaluation Algorithm (What Claude Is Judging)

**Location**: `src/lib/services/test-service.ts` (lines 28-81)

Claude is given a **structured prompt** that asks it to evaluate each response on **5 dimensions**:

#### Dimension 1: Emotional Progression
```json
{
  "startState": { "primaryEmotion": "anxiety", "intensity": 0.8 },
  "endState": { "primaryEmotion": "hope", "intensity": 0.6 },
  "arcCompleted": true,
  "progressionQuality": 4,
  "progressionNotes": "Successfully moved client from anxiety to cautious optimism"
}
```
**What it measures**: Did the response guide the user from a negative emotional state to a better one?

#### Dimension 2: Empathy Evaluation
```json
{
  "emotionsAcknowledged": true,
  "acknowledgmentInFirstSentence": true,
  "validationProvided": true,
  "empathyScore": 4,
  "empathyNotes": "Immediately validated user's worry before offering advice"
}
```
**What it measures**: Did the response acknowledge feelings? Was validation provided early?

#### Dimension 3: Voice Consistency
```json
{
  "warmthPresent": true,
  "judgmentFree": true,
  "specificNumbersUsed": true,
  "jargonExplained": true,
  "voiceScore": 4,
  "voiceNotes": "Warm tone, explained APR without assuming knowledge"
}
```
**What it measures**: Is the response warm, non-judgmental, and does it explain technical terms?

#### Dimension 4: Conversation Quality
```json
{
  "helpfulToUser": true,
  "actionableGuidance": true,
  "appropriateDepth": true,
  "naturalFlow": true,
  "qualityScore": 4,
  "qualityNotes": "Provided 3 clear next steps with specific amounts"
}
```
**What it measures**: Is the advice practical, actionable, and appropriately detailed?

#### Dimension 5: Overall Evaluation
```json
{
  "wouldUserFeelHelped": true,
  "overallScore": 4,
  "keyStrengths": ["Strong empathy", "Clear action items"],
  "areasForImprovement": ["Could add more specific timeline"],
  "summary": "Excellent empathetic response that addresses emotional needs while providing actionable guidance."
}
```
**What it measures**: Holistic assessment - would a real user feel helped?

---

### Winner Determination Algorithm

**Code Location**: `src/lib/services/test-service.ts` (lines 110-160)

```typescript
function compareEvaluations(controlEval, adaptedEval): EvaluationComparison {
  const controlScore = controlEval.overallEvaluation.overallScore;
  const adaptedScore = adaptedEval.overallEvaluation.overallScore;
  const scoreDiff = adaptedScore - controlScore;

  let winner: 'control' | 'adapted' | 'tie';
  if (scoreDiff > 0.5) winner = 'adapted';
  else if (scoreDiff < -0.5) winner = 'control';
  else winner = 'tie';
  
  // ... identify improvements and regressions
}
```

**Decision Logic**:
| Score Difference | Winner |
|------------------|--------|
| Adapted scores > 0.5 points higher | **Adapted Wins** |
| Control scores > 0.5 points higher | **Control Wins** |
| Difference within ±0.5 points | **Tie** |

**Improvement/Regression Detection**: The algorithm compares individual dimension scores (empathy, voice, quality, emotional arc) and lists any where the adapted model scored higher (improvements) or lower (regressions).

---

### Can You Change the Algorithm?

**Yes, with code changes**. The evaluation prompt is fully customizable.

**What you can change**:

1. **Evaluation Criteria** - Edit the prompt at lines 28-81 in `test-service.ts`
2. **Scoring Scales** - Currently 1-5; could change to 1-10, letter grades, etc.
3. **Dimensions Evaluated** - Add new dimensions or remove existing ones
4. **Winner Threshold** - Currently 0.5 points; adjust at lines 118-121
5. **Claude Model** - Currently `claude-sonnet-4-20250514`; could use Opus for more nuanced evaluation

**Example: Adding a new dimension (Compliance)**:

```typescript
// Add to the EVALUATION_PROMPT string:
"complianceEvaluation": {
  "regulatoryAccurate": <true/false>,
  "disclaimersPresent": <true/false>,
  "noisyAdvice": <true/false>,
  "complianceScore": <1-5>,
  "complianceNotes": "<brief explanation>"
}
```

**Example: Tightening the winner threshold**:

```typescript
// Before: requires > 0.5 difference
if (scoreDiff > 0.5) winner = 'adapted';

// After: requires > 1.0 difference (stricter)
if (scoreDiff > 1.0) winner = 'adapted';
```

---

### How Accurate Is Claude-as-Judge?

**Honest Assessment**: Claude-as-Judge is **a useful directional signal, not ground truth**.

#### Strengths ✅

| Strength | Why It Matters |
|----------|----------------|
| **Consistent evaluation** | Same prompt = same rubric applied to every test |
| **Structured output** | Forces systematic evaluation vs. vibes-based assessment |
| **Detailed reasoning** | Provides notes explaining each score |
| **Fast** | Evaluates in seconds vs. minutes for human review |
| **Cheap** | ~$0.02 per test enables high-volume testing |
| **No human bias fatigue** | Doesn't get tired after reviewing 50 responses |

#### Limitations ⚠️

| Limitation | What It Means |
|------------|---------------|
| **Domain blindness** | Claude doesn't know your specific business rules or compliance requirements |
| **Style preference** | May favor certain writing styles over others |
| **Prompt sensitivity** | Small changes to evaluation prompt can shift scores |
| **Self-similarity bias** | May favor responses that sound "Claude-like" |
| **No real user testing** | Can't predict actual user satisfaction |
| **Binary dimensions** | Some yes/no checks (was jargon explained?) may miss nuance |

#### Accuracy Calibration Tips

1. **Use alongside human ratings**: Compare Claude scores to your "Your Rating" selections over time
2. **Check edge cases**: Test with intentionally bad responses to verify low scores
3. **Review the notes**: Claude's reasoning matters more than raw scores
4. **Look at dimension breakdown**: Overall score may mask dimension-specific issues
5. **Don't over-optimize**: A test that scores perfectly on Claude may not be "perfect" for real users

#### When to Trust Claude-as-Judge

| Scenario | Trust Level |
|----------|-------------|
| Comparing two similar responses | **High** - relative ranking is reliable |
| Detecting obvious quality issues | **High** - catches missing empathy, jargon, etc. |
| Absolute quality assessment | **Medium** - a "4/5" doesn't mean objectively good |
| Specialized domain evaluation | **Low** - doesn't know your industry specifics |
| User satisfaction prediction | **Low** - need real user testing |

---

### What Else Should You Know?

#### 1. Evaluation Is Non-Blocking
If Claude evaluation fails (API error, rate limit), the test still completes with responses saved. Error is logged but doesn't prevent result display.

#### 2. Evaluation Cannot Be Retroactively Run
If you submit a test without evaluation enabled, you cannot later run evaluation on those responses. The responses are stored, but you'd need to manually submit them to a new evaluation.

#### 3. Historical Comparison
Since evaluations are stored as JSONB, you could write queries to track evaluation trends over time:
```sql
SELECT 
  created_at,
  evaluation_comparison->'winner' as winner,
  evaluation_comparison->'scoreDifference' as score_diff
FROM pipeline_test_results
WHERE evaluation_comparison IS NOT NULL
ORDER BY created_at;
```

#### 4. Evaluation Cost Tracking
At $0.02 per test, 100 tests = $2.00. Consider enabling evaluation selectively for important tests rather than every single one.

---

### Summary Table: Claude-as-Judge at a Glance

| Aspect | Detail |
|--------|--------|
| **Enable via** | Toggle switch on test page (before submitting) |
| **Cost** | ~$0.02 per test |
| **What it evaluates** | Empathy, Voice, Quality, Emotional Progression, Overall |
| **Scoring** | 1-5 scale per dimension |
| **Winner threshold** | > 0.5 point difference |
| **Stored in** | `control_evaluation`, `adapted_evaluation`, `evaluation_comparison` columns |
| **Displayed in** | Top of TestResultComparison component |
| **Customizable** | Yes, by editing prompt in `test-service.ts` |
| **Accuracy** | Good for relative comparison; limited for absolute quality |

---

**Section Added**: January 25, 2026  
**Author**: Gemini Agent
