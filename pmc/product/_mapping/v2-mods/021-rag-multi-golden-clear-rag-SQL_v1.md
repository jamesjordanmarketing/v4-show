# 021 — RAG Module: Full Clear SQL

| Field | Value |
|-------|-------|
| **Date** | 2026-02-20 |
| **Purpose** | Wipe all RAG data from the database for a clean test cycle |
| **Run in** | Supabase SQL Editor (Dashboard → SQL Editor → New query) |
| **Safe to repeat** | Yes — all statements use `DELETE` not `DROP`, so the schema and tables are preserved |

---

## ⚠️ What this deletes

**Everything in the RAG module:**

| Step | Table | What it contains |
|------|-------|-----------------|
| 1 | `rag_quality_scores` | Self-eval and quality scores from prior queries |
| 2 | `rag_queries` | Every chat query, response, HyDE result, and self-eval stored |
| 3 | `rag_test_reports` | Saved golden test run reports |
| 4 | `rag_embedding_runs` | Embedding run metadata/history |
| 5 | `rag_embeddings` | All vector embeddings (largest table — may be millions of rows) |
| 6 | `rag_expert_questions` | LLM-generated expert Q&A pairs |
| 7 | `rag_facts` | All extracted facts from every document |
| 8 | `rag_sections` | All parsed sections from every document |
| 9 | `rag_documents` | All document upload records |
| 10 | `rag_knowledge_bases` | All knowledge base containers |

**What is NOT deleted:**
- The table schemas, indexes, RLS policies, and SQL functions — all preserved
- The `rag-documents` storage bucket files — **see Step 2 below** (must be cleared separately via the Storage dashboard)

---

## Step 1 — Run this SQL in the Supabase SQL Editor

Paste the entire block below into a **new query** in the SQL Editor and click **Run**.

```sql
-- ============================================================
-- RAG MODULE FULL CLEAR
-- Deletes all RAG data in FK-safe order (leaf tables first).
-- Tables and schema are preserved — only data is removed.
-- Run in Supabase SQL Editor.
-- ============================================================

-- 1. Quality scores (FK → rag_queries)
DELETE FROM rag_quality_scores;

-- 2. Queries (FK → rag_knowledge_bases, rag_documents)
DELETE FROM rag_queries;

-- 3. Test reports (no formal FK)
DELETE FROM rag_test_reports;

-- 4. Embedding run metadata (no formal FK)
DELETE FROM rag_embedding_runs;

-- 5. Embeddings — largest table (FK → rag_documents)
DELETE FROM rag_embeddings;

-- 6. Expert Q&A questions (FK → rag_documents)
DELETE FROM rag_expert_questions;

-- 7. Facts (FK → rag_documents, rag_sections)
DELETE FROM rag_facts;

-- 8. Sections (FK → rag_documents)
DELETE FROM rag_sections;

-- 9. Documents (FK → rag_knowledge_bases)
DELETE FROM rag_documents;

-- 10. Knowledge bases (root table)
DELETE FROM rag_knowledge_bases;
```

After running, the SQL Editor will show a result for each statement. All should report `DELETE N` (where N is the number of rows removed). A result of `DELETE 0` means that table was already empty — that is fine.

### Verify all tables are empty

Run this immediately after the delete block to confirm:

```sql
-- ============================================================
-- VERIFICATION — All counts should be 0
-- ============================================================
SELECT 'rag_quality_scores'  AS tbl, COUNT(*) AS rows FROM rag_quality_scores
UNION ALL
SELECT 'rag_queries',                 COUNT(*) FROM rag_queries
UNION ALL
SELECT 'rag_test_reports',            COUNT(*) FROM rag_test_reports
UNION ALL
SELECT 'rag_embedding_runs',          COUNT(*) FROM rag_embedding_runs
UNION ALL
SELECT 'rag_embeddings',              COUNT(*) FROM rag_embeddings
UNION ALL
SELECT 'rag_expert_questions',        COUNT(*) FROM rag_expert_questions
UNION ALL
SELECT 'rag_facts',                   COUNT(*) FROM rag_facts
UNION ALL
SELECT 'rag_sections',                COUNT(*) FROM rag_sections
UNION ALL
SELECT 'rag_documents',               COUNT(*) FROM rag_documents
UNION ALL
SELECT 'rag_knowledge_bases',         COUNT(*) FROM rag_knowledge_bases
ORDER BY tbl;
```

Expected output — every `rows` value must be `0`:

| tbl | rows |
|-----|------|
| rag_documents | 0 |
| rag_embedding_runs | 0 |
| rag_embeddings | 0 |
| rag_expert_questions | 0 |
| rag_facts | 0 |
| rag_knowledge_bases | 0 |
| rag_queries | 0 |
| rag_quality_scores | 0 |
| rag_sections | 0 |
| rag_test_reports | 0 |

---

## Step 2 — Clear the storage bucket (manual, Supabase dashboard)

The `rag-documents` bucket holds the original uploaded PDF/DOCX/MD files. SQL cannot delete storage bucket objects — this must be done in the Supabase Dashboard.

1. Go to **Supabase Dashboard → Storage → rag-documents**
2. Select all folders/files shown
3. Click **Delete**
4. Repeat for any sub-folders (the structure is `{user_id}/{document_id}/{filename}`)

**When is this necessary?** Only if you want to fully free storage space or prevent re-ingesting a stale file. If you are just wiping DB records to re-upload fresh, you can skip this step — the old storage files are orphaned and harmless.

---

## Notes

### Why this order?
PostgreSQL foreign key constraints require child rows to be deleted before parent rows. The order above follows the FK dependency chain leaf-to-root:

```
rag_quality_scores  →  rag_queries
rag_queries         →  rag_knowledge_bases, rag_documents
rag_embeddings      →  rag_documents
rag_expert_questions→  rag_documents
rag_facts           →  rag_sections, rag_documents
rag_sections        →  rag_documents
rag_documents       →  rag_knowledge_bases
rag_knowledge_bases    (root — deleted last)
```

If you run the statements out of order you will get a foreign key violation error. Paste the entire block to run them in the correct sequence.

### Alternative: run via script
If you prefer a terminal command, the same cleanup runs via:
```bash
cd supa-agent-ops && node ../scripts/rag-cleanup.js
```
This script also handles storage bucket clearing automatically.

---

*End of document.*
