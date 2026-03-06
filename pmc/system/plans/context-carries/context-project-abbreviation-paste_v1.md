```md
# Tutorial Complete

I’ve written comprehensive testing instructions here:

- **File:** `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\implement-rag\rag-frontier-execution-prompt-E11-tutorial_v1.md`

---

## What’s in the Tutorial

### Part 1: Upload a Document to RAG

- Navigate to **RAG Frontier**
- Create a **knowledge base**
- Upload a document (**PDF / DOCX / TXT**)
- Answer expert questions
- Chat with the document

### Part 2: Push RAG to LoRA Model ⚠️ NOT IMPLEMENTED

- Mode selector exists but doesn’t work
- `queryRAG()` always uses Claude and ignores the `mode` parameter
- No integration between RAG retrieval and LoRA inference

### Part 3: Deploy LoRA Model to RunPod (Separate System)

- Train model on dataset
- Deploy adapter to RunPod serverless
- Test inference endpoints  
- **Note:** Cannot combine with RAG

### Part 4: Quality Dashboard

- View RAG query evaluation metrics

---

## Critical Finding: RAG + LoRA Integration Missing

### What Exists

- ✅ RAG system (document upload, processing, chat with Claude)
- ✅ LoRA training pipeline (train models, create adapters)
- ✅ LoRA deployment (RunPod serverless endpoints)
- ✅ UI mode selector (**"RAG Only"**, **"LoRA Only"**, **"RAG + LoRA"**)

### What’s Missing

- ❌ Wire-up between RAG retrieval and LoRA inference
- ❌ Model selection UI in RAG chat
- ❌ Service layer integration

---

## Files That Need Changes

- `src/lib/rag/services/rag-retrieval-service.ts` *(line 273–402)*
- `src/components/rag/RAGChat.tsx`
- `src/hooks/useRAGChat.ts`
- `src/app/api/rag/query/route.ts`

---

## 10 Additional Functionality Omissions Listed

**Critical**

- ⚠️ RAG + LoRA integration *(critical)*
- ⚠️ Model selection in RAG *(critical)*

**Other omissions**

- Knowledge base sharing
- Bulk document upload
- Document versioning
- Cross-document search *(backend exists, UI missing)*
- Export chat history
- Auto-verify documents
- Semantic document search UI
- Deployment status in models page

---

The tutorial provides step-by-step testing instructions and debugging tips.
```
