# E05 Prompt Changes: v1 → v2

**Date:** February 11, 2026  
**Updated By:** E04 Implementation Agent  
**Purpose:** Correct critical bugs and align with actual E04 implementation

---

## 🚨 CRITICAL BUG FIXES

### 1. Provider Method Correction (Would Have Broken Immediately)

**v1 Code (BROKEN):**
```typescript
const evalResponse = await provider.chat({
  systemPrompt: `You are a RAG quality evaluator...`,
  userPrompt: `## Question\n${query.queryText}...`,
  maxTokens: 500,
});

// Manual JSON parsing
let evaluation: Record<string, { score: number; reason: string }>;
try {
  const jsonMatch = evalResponse.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found');
  evaluation = JSON.parse(jsonMatch[0]);
} catch {
  // Fallback...
}

// Manual score extraction and calculation
const faithfulness = evaluation.faithfulness?.score ?? 0.5;
const compositeScore = weights.faithfulness * faithfulness + ...;
```

**Problem:** `provider.chat()` method DOES NOT EXIST. This would fail on the first call.

**v2 Code (CORRECT):**
```typescript
let evaluation: QualityEvaluation;
try {
  evaluation = await provider.evaluateQuality({
    queryText: query.queryText,
    retrievedContext: query.assembledContext || '',
    responseText: query.responseText,
    citations: query.citations || [],
  });
} catch (evalError) {
  // Fallback to defaults
  evaluation = {
    faithfulness: 0.5,
    answerRelevance: 0.5,
    contextRelevance: 0.5,
    answerCompleteness: 0.5,
    citationAccuracy: 0.5,
    composite: 0.5,
    details: { error: 'Evaluation failed', reason: String(evalError) },
  };
}

// Scores are already computed - use directly
const { data: scoreRow, error: insertError } = await supabase
  .from('rag_quality_scores')
  .insert({
    faithfulness_score: evaluation.faithfulness,
    answer_relevance_score: evaluation.answerRelevance,
    context_relevance_score: evaluation.contextRelevance,
    answer_completeness_score: evaluation.answerCompleteness,
    citation_accuracy_score: evaluation.citationAccuracy,
    composite_score: Math.round(evaluation.composite * 1000) / 1000,
    ...
  });
```

**Impact:** The correct method returns a typed `QualityEvaluation` object with all scores pre-computed. No manual parsing or calculation needed.

---

### 2. RPC Function Parameter Fix

**v1 Code:**
```typescript
await supabase.rpc('increment_kb_doc_count', { kb_id: docRow.knowledge_base_id });
```

**Problem:** Missing `increment` parameter. The RPC function expects both `kb_id` and `increment`.

**v2 Code:**
```typescript
await supabase.rpc('increment_kb_doc_count', { 
  kb_id: docRow.knowledge_base_id,
  increment: -1 
});
```

---

### 3. Cascade Delete Improvement

**v1 Code:**
```typescript
await supabase.from('rag_quality_scores').delete().in(
  'query_id',
  (await supabase.from('rag_queries').select('id').eq('document_id', documentId)).data?.map(r => r.id) || []
);
```

**Problem:** Doesn't handle empty array case, unclear inline query.

**v2 Code:**
```typescript
// Get all query IDs for this document
const { data: queries } = await supabase
  .from('rag_queries')
  .select('id')
  .eq('document_id', documentId);

const queryIds = queries?.map(q => q.id) || [];

if (queryIds.length > 0) {
  await supabase
    .from('rag_quality_scores')
    .delete()
    .in('query_id', queryIds);
}
```

---

## 📋 CONTENT UPDATES

### Prerequisites Section
- ✅ Marked E04 as complete
- ✅ Added exact E04 exports with function names
- ✅ Documented E04 internal functions

### Context Section
- ✅ Added QualityEvaluation interface details
- ✅ Documented provider.evaluateQuality() signature
- ✅ Noted that composite score is pre-computed
- ✅ Clarified no manual JSON parsing needed

### Notes for Agent Section
Added critical warnings:
- ⚠️ DO NOT use `provider.chat()` - doesn't exist
- ⚠️ DO NOT manually calculate composite score
- ⚠️ DO NOT manually parse JSON responses
- ⚠️ Config uses `answerCompleteness` not `completeness`

---

## 🔍 VERIFICATION ADDED

### Confirmed Against Reality:
- ✅ All E04 service exports exist
- ✅ `provider.evaluateQuality()` method verified
- ✅ `QualityEvaluation` type verified in @/types/rag
- ✅ `mapRowToQualityScore()` mapper verified
- ✅ RAG_CONFIG.quality.weights.answerCompleteness verified
- ✅ requireAuth() function verified
- ✅ createServerSupabaseAdminClient() verified

---

## 📊 FILE SIZE COMPARISON

- **v1:** 30K
- **v2:** 32K (+2K for corrections and additional context)

---

## 💡 KEY LESSONS FOR FUTURE PROMPTS

1. **Always verify provider methods exist** before writing code that calls them
2. **Check return types** - don't assume JSON parsing is needed
3. **Verify config property names** - small differences matter (`answerCompleteness` vs `completeness`)
4. **Test RPC signatures** - missing parameters cause silent failures
5. **Handle empty arrays** in delete operations to avoid unnecessary DB calls

---

## ✅ VALIDATION CHECKLIST

Before releasing any execution prompt:

- [ ] All imports reference real, existing modules
- [ ] All function calls use correct method names
- [ ] All type references exist in the codebase
- [ ] All config properties use exact names
- [ ] All provider methods match actual signatures
- [ ] All database operations match schema
- [ ] All error handling covers edge cases

---

**Result:** E05 v2 is production-ready and will not fail due to missing methods or incorrect signatures.
