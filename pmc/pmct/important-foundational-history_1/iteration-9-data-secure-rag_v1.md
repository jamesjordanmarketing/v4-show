# Iteration 9: Data Secure RAG Implementation Specification

## Overview
This specification details the transition from public API LLM endpoints (Anthropic/OpenAI) to purely private, data-secure LLM infrastructure for the BRun RAG pipeline. This guarantees to enterprise customers that their proprietary documents are never exposed to public model training telemetry.

## Security Posture & Recommendations

### Option 1: True "Air-Gapped" Silo (Open-Weight Models on Vendor VPC)
For absolute data sovereignty (e.g., highly regulated, defense, or strict internal compliance), the system will utilize Open-Weight models hosted on private compute infrastructure (e.g., RunPod dedicated instances or AWS EC2 via vLLM).
*   **Ingestion/Reasoning (Replacing Claude):** Llama-3.1-70B-Instruct or Mixtral 8x22B. These models possess the necessary sophisticated instruction-following capabilities to handle the 6-pass RAG extraction prompts currently utilizing Claude.
*   **Embeddings (Replacing OpenAI):** `nomic-embed-text-v1.5` or `bge-large-en-v1.5`. These open-weight embedding models match or exceed OpenAI's `text-embedding-3-small` performance and can be hosted locally via TEI (Text Embeddings Inference).

### Option 2: Enterprise Cloud Silo (AWS Bedrock / Azure OpenAI)
For enterprise compliance (SOC2, HIPAA) without sacrificing frontier intelligence, the system will route requests through enterprise cloud silos.
*   **AWS Bedrock (Claude 3.5):** AWS explicitly guarantees via standard terms of service that customer data (prompts and completions) is **never** used to train Anthropic base models. The data remains entirely within the customer's AWS environment boundary.
*   **Azure OpenAI:** Provides zero-data-retention (ZDR) policies for approved enterprise customers, ensuring even Microsoft/OpenAI operators cannot view the data.

**Recommendation:** Implement a provider-agnostic factory pattern. Default to **AWS Bedrock (Claude 3.5 Sonnet)** for the best balance of frontier intelligence and enterprise legal guarantees. Offer **RunPod (Llama-3.1-70B + Nomic)** as a premium "Zero-Trust Private Compute" tier.

---

## 1. Codebase Changes

### 1.1 Provider Abstraction Layer (`src/lib/rag/providers/`)
The current system hardcodes API SDKs in `ClaudeLLMProvider` and `OpenAIEmbeddingProvider`. We will implement a factory pattern to dynamically route requests based on environment or tenant configuration.

**New Files Needed:**
*   `src/lib/rag/providers/bedrock-llm-provider.ts` (Uses `@aws-sdk/client-bedrock-runtime`)
*   `src/lib/rag/providers/vllm-llm-provider.ts` (Uses standard OpenAI-compatible REST API targeting RunPod/vLLM)
*   `src/lib/rag/providers/local-embedding-provider.ts` (Targets a self-hosted TEI or Ollama container)
*   `src/lib/rag/providers/provider-factory.ts` (Factory logic to instantiate providers based on `RAG_CONFIG` or tenant DB flags)

### 1.2 Configuration Updates (`src/lib/rag/config.ts`)
Update the configuration to support routing to secure silos:

```typescript
export const RAG_CONFIG = {
  llm: {
    // 'anthropic_public' | 'aws_bedrock' | 'vllm_private'
    provider: process.env.RAG_LLM_PROVIDER || 'aws_bedrock',
    models: {
      reasoning: process.env.RAG_MODEL_REASONING || 'anthropic.claude-3-5-sonnet-20240620-v1:0', // Bedrock ARN
      fast: process.env.RAG_MODEL_FAST || 'anthropic.claude-3-haiku-20240307-v1:0',
    }
  },
  embedding: {
    // 'openai_public' | 'tei_private'
    provider: process.env.RAG_EMBEDDING_PROVIDER || 'tei_private',
    model: process.env.RAG_EMBEDDING_MODEL || 'nomic-embed-text',
    endpoint: process.env.RAG_EMBEDDING_ENDPOINT || 'http://localhost:8080/embed',
    dimensions: 768, // Nomic default (OpenAI is 1536)
  }
}
```

### 1.3 Adapting Prompts for Open-Weight Models
If routing to Llama-3 (via vLLM), the `prompt-engineering` techniques currently optimized for Anthropic's XML-tag-heavy format will need translation. VLLM provides an OpenAI-compatible endpoint, but the internal system prompts in `process-rag-document.ts` should dynamically switch based on the detected provider.
*   **Anthropic:** Responds well to `<tag>` formatting.
*   **Llama-3:** Responds better to strict Markdown headers and JSON-schema forced outputs.

---

## 2. Database Modifications (SAOL Compliant)

We need to track which provider/model combination was used for data auditing and compliance tracing. We will add telemetry columns to the `rag_documents` and `rag_embedding_runs` tables.

### 2.1 SAOL Migration Script
To be executed via `agentExecuteDDL` in SAOL.

```sql
-- Migration: Add private compute telemetry to RAG tables
ALTER TABLE rag_documents 
  ADD COLUMN IF NOT EXISTS compute_provider TEXT DEFAULT 'anthropic_public',
  ADD COLUMN IF NOT EXISTS compute_region TEXT;

ALTER TABLE rag_embedding_runs
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'openai_public',
  ADD COLUMN IF NOT EXISTS endpoint_url TEXT;

-- Create indexes for compliance auditing
CREATE INDEX IF NOT EXISTS idx_rag_docs_compute_provider ON rag_documents(compute_provider);
```

### 2.2 Updating Insert Logic (`src/lib/rag/services/rag-ingestion-service.ts`)
When instantiating the pipeline in `processRAGDocument`, the factory must inject the active provider's metadata into the DB inserts.

```typescript
// Example update to step 12 finalize
await supabase
  .from('rag_documents')
  .update({
    status: finalStatus,
    compute_provider: provider.getProviderCode(), // e.g., 'aws_bedrock_us_east_1'
    processing_completed_at: new Date().toISOString(),
    // ...
  })
```

---

## 3. Implementation Plan

1. **Phase 1: Bedrock Integration (Low friction, High Intelligence)**
   - Install AWS SDKs.
   - Implement `BedrockLLMProvider` satisfying the `LLMProvider` interface.
   - Requires setting up AWS AIM credentials in the Vercel environment.
2. **Phase 2: Private Embeddings (Significant cost/privacy win)**
   - Deploy Text Embeddings Inference (TEI) on a RunPod instance running `nomic-embed-text-v1.5`.
   - Implement `LocalEmbeddingProvider` targeting the RunPod URL.
3. **Phase 3: Open-Weight LLM Fallback (Zero-Trust tier)**
   - Deploy vLLM on RunPod with Llama-3.1-70B.
   - Implement `VLLMLLMProvider`.
4. **Phase 4: SAOL Migrations & Telemetry**
   - Run the DDL script via SAOL to track compute providers.
   - Update `rag-ingestion-service.ts` to log the provider.


## Input Prompt:
ok another question about the LLMs

Examine our current codebase here:
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src` to answer these questions.

One of the features  our company offers is fully private AI. Meaning we can use any LLM that is hosted privately or in our own cloud silo (like Runpod).

I have assumed that we cannot use Claude or OpenAI frontier models via their API, as that would expose our data to the LLM context (even though they say it doesn't...I believe they use anonymous data for training, despite the promise, which still exposes our data)

We are using frontier models for embedding and Claude ingestion prompts.

Given the sophistication of our current prompts is there an Open Weight LLM that we can requisition to our RunPod account (or we can switch hosting providers if need be).  We don't need absolutism or perfection...we can embed using "not frontier" models if need be.

What would be your recommendation to assuring our customers that their data is truly private? 

Are there open weight models sophisticated enough to handle our current claude and openAI prompts? Cost is not an issue.

I know very little about it, but can we access frontier models like Claude in our own silo, like on the Amazon platform.

write a detailed, complete, accurate, precise, and comprehensive specification that will implement these requirements and code changes necessary to implement into our 

Use SAOL if database access is needed to answer these questions: **ALL database operations MUST use SAOL.** Do not use raw `supabase-js` or PostgreSQL scripts directly.
Reference: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi\workfiles\supabase-agent-ops-library-use-instructions.md`

Write this detailed, complete, accurate, precise, and comprehensive specification here: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\pmct\iteration-9-data-secure-rag_v1.md`

## Summary Answers

Here are the answers to your questions regarding data privacy and LLMs:

1. Are there open-weight models sophisticated enough to handle our current Claude and OpenAI prompts? Yes. Open-weight models like Llama-3.1-70B-Instruct or Mixtral 8x22B are highly capable of handling the complex reasoning required for your 6-pass extraction pipeline (structure, policies, tables, narrative facts). For vector embeddings, open-weight models like nomic-embed-text-v1.5 or bge-large-en-v1.5 actually out-perform OpenAI's text-embedding-3-small on RAG benchmarks. You can host these securely on your own RunPod account using inference servers like vLLM and TEI (Text Embeddings Inference).

2. Can we access frontier models like Claude in our own silo on platforms like Amazon? Yes, absolutely. You can access Claude 3.5 Sonnet and Haiku via AWS Bedrock. When you use Bedrock, Anthropic does not get access to your data. AWS guarantees via their enterprise Terms of Service that customer prompts and documents are never used to train base models. The data remains strictly within your secure AWS account boundary. Similarly, Microsoft Azure offers the same siloed, zero-training guarantees for OpenAI models.

3. What is my recommendation for assuring customers their data is truly private? I recommend a two-tiered approach to data privacy:

Recommendation 1 (The "Enterprise Cloud" approach): Switch your current public API calls to AWS Bedrock (Claude) and Azure OpenAI. This gives you the industry-best "frontier" intelligence while legally guaranteeing to your customers (via SOC2/HIPAA compliant platforms) that their data is not used for model training and never leaves your cloud tenant.
Recommendation 2 (The "Zero-Trust Airgap" approach): For highly sensitive clients (e.g., defense, strictly regulated finance), offer a premium option that uses your own RunPod instances running Llama-3.1-70B and Nomic-Embed. In this scenario, the data literally never leaves the servers you rent.