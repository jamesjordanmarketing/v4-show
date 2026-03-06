/**
 * Inngest Client Configuration
 * 
 * This file initializes the Inngest client used to:
 * 1. Define and register background functions
 * 2. Trigger events from API routes
 * 3. Handle webhooks from Inngest's infrastructure
 * 
 * Environment Variables Required:
 * - INNGEST_EVENT_KEY: For sending events to Inngest
 * - INNGEST_SIGNING_KEY: For securing the webhook endpoint
 */

import { Inngest } from 'inngest';

/**
 * Inngest Client Instance
 * 
 * This client is used throughout the application to:
 * - Send events from API routes (e.g., "rag/document.uploaded")
 * - Define background functions (e.g., processRAGDocument)
 * - Serve the Inngest webhook endpoint
 * 
 * The client automatically handles:
 * - Authentication with Inngest's servers
 * - Event serialization/deserialization
 * - Retry logic and error handling
 */
export const inngest = new Inngest({
  id: 'brighthub-rag-frontier',
  name: 'BrightHub RAG Frontier',
  
  // Event key is used for authentication when sending events
  eventKey: process.env.INNGEST_EVENT_KEY,
  
  // Optional: Configure retries and timeouts
  retryFunction: async (attempt) => ({
    // Exponential backoff: 2s, 4s, 8s, 16s, 32s
    delay: Math.min(1000 * Math.pow(2, attempt), 32000),
  }),
});

/**
 * Type-safe event payload definitions
 * 
 * These types ensure that event triggers and handlers use consistent data structures.
 */
export type InngestEvents = {
  /**
   * Triggered when a RAG document is uploaded and ready for processing
   * 
   * Payload:
   * - documentId: UUID of the document in rag_documents table
   * - userId: UUID of the user who uploaded the document
   * 
   * Handler: processRAGDocument (src/inngest/functions/process-rag-document.ts)
   */
  'rag/document.uploaded': {
    data: {
      documentId: string;
      userId: string;
    };
  };

  /**
   * Triggered when a pipeline training job is created and ready to dispatch to RunPod.
   *
   * Payload:
   * - jobId: UUID of the row in pipeline_training_jobs (status: 'pending')
   * - userId: UUID of the owning user (for ownership verification)
   *
   * Handler: dispatchTrainingJob (src/inngest/functions/dispatch-training-job.ts)
   */
  'pipeline/job.created': {
    data: {
      jobId: string;
      userId: string;
    };
  };

  /**
   * Triggered when a training job completes and the adapter tar.gz is in Supabase Storage.
   * Fired by: POST /api/webhooks/training-complete (receives Supabase DB webhook)
   * Handler: autoDeployAdapter (src/inngest/functions/auto-deploy-adapter.ts)
   *
   * Payload:
   * - jobId: UUID of the completed pipeline_training_jobs row
   * - userId: UUID of the job owner (used when creating pipeline_inference_endpoints)
   * - adapterFilePath: Storage path e.g. "lora-models/adapters/608fbb9b-...tar.gz"
   */
  'pipeline/adapter.ready': {
    data: {
      jobId: string;
      userId: string;
      adapterFilePath: string;
    };
  };

  /**
   * Fired after auto-deploy-adapter successfully updates LORA_MODULES on RunPod.
   * Triggers the refreshInferenceWorkers function to cycle workers so new
   * LORA_MODULES take effect.
   */
  'pipeline/adapter.deployed': {
    data: {
      jobId: string;
      adapterName: string;
      endpointId: string;
      originalWorkersMin: number;
      originalWorkersMax: number;
      workbaseId: string | null;
    };
  };

  /**
   * Fired by POST /api/pipeline/adapters/[jobId]/restart to manually trigger
   * a worker restart cycle. Consumed by restartInferenceWorkers.
   */
  'pipeline/endpoint.restart.requested': {
    data: {
      jobId: string;
      workbaseId: string | null;
      adapterName: string;
      restartLogId: string;
      endpointId: string;
      originalWorkersMin: number;
      originalWorkersMax: number;
    };
  };

  /**
   * Fired after a conversation is generated and saved to the database.
   * Triggers the autoEnrichConversation function (D8).
   */
  'conversation/generation.completed': {
    data: {
      conversationId: string;
      userId: string;
    };
  };

  /**
   * Fired after a training_sets row is created with status: 'processing'.
   * Triggers buildTrainingSet to aggregate JSONL and upload to Supabase Storage.
   */
  'training/set.created': {
    data: {
      trainingSetId: string;
      workbaseId: string;
      conversationIds: string[];
      userId: string;
    };
  };

  /**
   * Fired when a batch generation job is created and ready for processing.
   * Triggers the processBatchJob function to process all items server-side.
   */
  'batch/job.created': {
    data: {
      jobId: string;
      userId: string;
      workbaseId: string | null;
    };
  };

  /**
   * Fired to request cancellation of a running batch job.
   * The processBatchJob function's cancelOn config catches this.
   */
  'batch/job.cancel.requested': {
    data: {
      jobId: string;
      userId: string;
    };
  };

  /**
   * Fired to enrich a chunk of conversations (up to 25).
   * Each chunk is processed as a single Inngest function invocation.
   * Replaces per-conversation 'conversation/generation.completed' for batch enrichment.
   */
  'batch/enrich.requested': {
    data: {
      conversationIds: string[];
      userId: string;
      jobId: string | null;
    };
  };
};
