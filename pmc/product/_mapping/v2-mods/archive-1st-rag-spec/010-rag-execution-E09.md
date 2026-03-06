# Frontier RAG Module - Execution Prompt E09: Quality Measurement System

**Version:** 1.0
**Date:** February 10, 2026
**Section:** E09 - Quality Measurement System
**Prerequisites:** E01-E08 complete (full stack exists, quality service is the last backend piece)
**Status:** Ready for Execution

---

## Overview

This prompt creates the Quality Measurement service -- the Claude-as-Judge evaluation system that scores every RAG response across 5 metrics. This is what makes the system measurable and improvable from day one.

## Critical Instructions

### SAOL for Database Operations

Use SAOL for all database operations:

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'rag_quality_scores',limit:1});console.log(JSON.stringify(r,null,2));})();"
```

### Environment

**Codebase:** `C:\Users\james\Master\BrightHub\brun\v4-show\src`
**SAOL Path:** `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops`

---

## Reference Documents

- **Specification:** `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\008-rag-frontier-rag-detailed-spec_v1-section-9.md`
- **SAOL Guide:** `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops\QUICK_START.md`

---

========================


# EXECUTION PROMPT E09: Quality Measurement - Claude-as-Judge, 5 Metrics, Mode Comparison

## Your Mission

You are creating the quality measurement service for a Frontier RAG module. This service evaluates every RAG response using Claude as an automated judge, scoring across 5 metrics with weighted composite scoring.

You will create 1 new file:
- `src/lib/services/rag/rag-quality-service.ts` -- 4 exported functions

The service implements:
1. **`evaluateResponseQuality()`** -- Claude-as-Judge evaluation with 5 metrics (faithfulness, answer_relevance, context_relevance, answer_completeness, citation_accuracy)
2. **`computeCompositeScore()`** -- Weighted average: `0.30*faith + 0.25*relevance + 0.20*context + 0.15*completeness + 0.10*citation`
3. **`getAggregatedQuality()`** + **`getQueryHistory()`** -- Dashboard aggregation queries
4. **`getModeComparison()`** -- The hero feature: compare quality across RAG/LoRA/RAG+LoRA modes

**Do NOT modify any existing files. Only create new files.**

---

## Step 0: Read the Specification and Codebase

Read these files completely before writing any code:

1. **The specification** (contains the COMPLETE implementation code):
   `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\008-rag-frontier-rag-detailed-spec_v1-section-9.md`

2. **Existing retrieval service** (quality evaluation is called after retrieval generates a response):
   `C:\Users\james\Master\BrightHub\brun\v4-show\src\lib\services\rag\rag-retrieval-service.ts`

3. **Provider files** (quality evaluation uses the LLM provider for Claude-as-Judge):
   `C:\Users\james\Master\BrightHub\brun\v4-show\src\lib\providers\index.ts`

---

## Step 1: Verify Prerequisites

Check that these files exist:
- `src/types/rag.ts` (should include `QualityEvaluation`, `QualityMetrics`, quality weight constants)
- `src/lib/providers/index.ts` (getLLMProvider)
- Database tables `rag_queries` and `rag_quality_scores` exist

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const tables=['rag_queries','rag_quality_scores'];for(const t of tables){const r=await saol.agentIntrospectSchema({table:t,includeColumns:false,transport:'pg'});console.log(t+':',r.tables[0]?.exists?'EXISTS':'MISSING');}})();"
```

---

## Step 2: Create the Quality Service

Create `src/lib/services/rag/rag-quality-service.ts` with the complete implementation from the specification.

Key things to verify in the code:

### evaluateResponseQuality()
- Sends query, context, response, and citations to Claude Haiku via `llmProvider.evaluateQuality()`
- Includes detailed rubrics for each metric with anchor scores (0.00, 0.25, 0.50, 0.75, 1.00)
- Robust JSON parsing (handles markdown code fences, invalid JSON with neutral fallback scores of 0.5)
- On evaluation failure, stores fallback record so evaluation failures don't block user responses
- Stores results in `rag_quality_scores` table

### computeCompositeScore()
- Weights: `faithfulness: 0.30, answer_relevance: 0.25, context_relevance: 0.20, answer_completeness: 0.15, citation_accuracy: 0.10`
- Returns 0-1, rounded to 2 decimal places

### getAggregatedQuality()
- Joins `rag_quality_scores` with `rag_queries`
- Computes per-metric averages, per-mode breakdowns, daily trend data
- Supports filtering by knowledgeBaseId, mode, date range

### getModeComparison()
- Groups quality scores by mode (rag_only, lora_only, rag_lora)
- Computes per-mode averages
- Identifies the best mode
- Calculates improvement percentages

---

## Step 3: Verify TypeScript Build

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/src" && npm run build
```

**Expected:** Build succeeds with exit code 0.

---

## Success Criteria

- [ ] `src/lib/services/rag/rag-quality-service.ts` exists with all 4 exported functions
- [ ] `npm run build` succeeds with zero TypeScript errors
- [ ] Quality weights sum to 1.0 (0.30 + 0.25 + 0.20 + 0.15 + 0.10 = 1.00)
- [ ] Evaluation failure produces fallback scores (0.5 for each metric), not a thrown error
- [ ] Claude Haiku is used for evaluation (fast and cheap), not Sonnet
- [ ] `getModeComparison()` calculates improvement percentages between modes

---

## If Something Goes Wrong

### Type Errors for Quality Types
- The specification defines additional types (`QualityMetrics`, `ModeBreakdown`, etc.) that may need to be added to `src/types/rag.ts`
- If these types are missing from E02, add them now

### LLM Provider Method Missing
- The quality service calls `llmProvider.evaluateQuality()` which should exist from E02
- If the method signature doesn't match, adapt the call to match the provider interface

### Aggregation Query Errors
- The SQL joins may need adjustment based on actual column names
- Use SAOL to verify `rag_queries` and `rag_quality_scores` column names

---

## What's Next

**E10** will delete the old chunks module, update navigation, and run the integration verification checklist.

---

**End of E09 Prompt**


+++++++++++++++++
