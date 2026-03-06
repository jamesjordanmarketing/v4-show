## Agent Instructions

**Before starting any work, you MUST:**

1. **Read this entire document** — it contains pre-verified facts and explicit instructions
2. **Read the codebase** at `C:\Users\james\Master\BrightHub\BRun\v4-show\src\` to confirm file locations referenced below
3. **Execute the instructions and specifications as written** — do not re-investigate what has already been verified

---

## Platform Overview

**Bright Run LoRA Training Data Platform** — Next.js 14 (App Router) application with two product paths:

| Path | Status | Flow |
|------|--------|------|
| **LoRA Training** | Complete | Generate Conversations → Enrich → Training Files → Train LoRA → Deploy → Test & Evaluate |
| **RAG Frontier** | Active development | Upload Document → 6-Pass Ingestion (Inngest) → Expert Q&A → Semantic Search → Chat with Citations → Quality Eval |

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router), TypeScript |
| Database | Supabase Pro (PostgreSQL + pgvector, HNSW indexes) |
| Storage | Supabase Storage |
| AI — Ingestion | Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) × 4 passes, Haiku 4.5 (`claude-haiku-4-5-20251001`) × 1 pass, Opus 4.6 (`claude-opus-4-6`) × 1 pass |
| AI — Retrieval | Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) for HyDE, response gen, self-eval, reranking |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dims) |
| UI | shadcn/UI + Tailwind CSS |
| State | React Query v5 (TanStack Query) |
| Background Jobs | Inngest |
| Deployment | Vercel (frontend + API routes) |
| Inference | RunPod Pods + vLLM (Mistral-7B + LoRA adapter) |
| DB Operations | **SAOL (mandatory)** — see below |

### Codebase Structure

```
v4-show//
├── src/
│   ├── app/                          # App Router pages + API routes
│   │   ├── (dashboard)/              # Dashboard pages (pipeline/, rag/)
│   │   └── api/                      # API routes (pipeline/, rag/)
│   ├── components/                   # React components
│   │   ├── rag/                      # RAG Frontier components
│   │   ├── pipeline/                 # Pipeline components
│   │   └── ui/                       # shadcn/UI base components
│   ├── hooks/                        # Custom React hooks
│   ├── lib/
│   │   ├── rag/                      # RAG services, providers, config
│   │   ├── services/                 # Business logic (inference, multi-turn)
│   │   ├── file-processing/          # Text extraction (pdf-parse, mammoth)
│   │   └── supabase/                 # Supabase client
│   ├── inngest/functions/            # Background job pipelines
│   └── types/                        # TypeScript type definitions
├── pmc/                              # Product Management & Control
│   ├── product/_mapping/             # Feature specifications
│   └── system/plans/                 # Planning & context documents
├── supa-agent-ops/                   # SAOL library
├── scripts/                          # Utility & migration scripts
└── supabase/                         # Supabase config
```

---

## SAOL — Mandatory for All Database Operations

**You MUST use the Supabase Agent Ops Library (SAOL) for ALL database operations.**

Full guide: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\workfiles\supabase-agent-ops-library-use-instructions.md`

```javascript
// Schema changes (DDL)
await agentExecuteDDL({
  sql: 'ALTER TABLE ... ;',
  transport: 'pg',
  transaction: true,
  dryRun: true,  // ALWAYS dry-run first, then set false to apply
});
```

**Rules:**
1. **Service Role Key** — all operations require `SUPABASE_SERVICE_ROLE_KEY`
2. **Dry-run first** — always `dryRun: true` then `dryRun: false`
3. **Transport: 'pg'** — always use pg transport for DDL
4. **Transaction: true** — wrap schema changes in transactions
5. **No raw SQL** — do not use `supabase-js` or direct PostgreSQL for schema changes

---

## Operating Principles

- **Do not re-investigate pre-verified facts** — this document and the task spec below contain verified codebase state
- **Do not make assumptions** — if something is ambiguous, ask
- **All code changes must include exact file paths** and line references
- **Human action steps** must be clearly delineated and copy-paste ready
- **The codebase may have evolved** since the specifications were written — confirm file locations exist before editing

---

<!-- TASK-SPECIFIC CONTENT BEGINS BELOW -->
