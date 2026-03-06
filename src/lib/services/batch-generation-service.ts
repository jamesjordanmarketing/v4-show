/**
 * Batch Generation Service
 *
 * Orchestrates batch conversation generation job CREATION and configuration.
 * Job PROCESSING is now handled by the Inngest `processBatchJob` function
 * (src/inngest/functions/process-batch-job.ts).
 *
 * Active methods:
 * - startBatchGeneration() — Creates batch_jobs + batch_items rows in DB
 * - getJobStatus() — Returns current job progress
 * - cancelJob() — Cancels a running job
 * - estimateCostAndTime() — Returns cost/time estimates (private)
 *
 * @deprecated The following methods have been removed (replaced by Inngest):
 *   - processJobInBackground (replaced by Inngest processBatchJob)
 *   - pauseJob, resumeJob (replaced by Inngest cancelOn)
 *   - processItem (extracted to batch-item-processor.ts)
 *   - autoSelectTemplate (extracted to batch-item-processor.ts)
 *
 * @module batch-generation-service
 */

import { batchJobService } from './batch-job-service';
import { conversationService } from './conversation-service';
import type { TierType } from '@/lib/types';

/**
 * Batch generation request parameters
 */
export interface BatchGenerationRequest {
  /** Batch job name */
  name: string;
  
  /** Array of conversation IDs to regenerate (optional) */
  conversationIds?: string[];
  
  /** Shared parameters applied to all conversations */
  sharedParameters?: Record<string, any>;
  
  /** Tier level (if not using conversation IDs) */
  tier?: TierType;
  
  /** Number of concurrent generations */
  concurrentProcessing?: number;
  
  /** Error handling strategy: 'stop' or 'continue' */
  errorHandling?: 'stop' | 'continue';
  
  /** User ID performing the generation */
  userId: string;
  
  /** Job priority */
  priority?: 'low' | 'normal' | 'high';
  
  /** Template ID (if generating new conversations) */
  templateId?: string;
  
  /** Array of parameter sets for new conversations */
  parameterSets?: Array<{
    templateId: string;
    parameters: Record<string, any>;
    tier: TierType;
  }>;

  /** Workbase ID to associate generated conversations with */
  workbaseId?: string;
}

/**
 * Batch job status response
 */
export interface BatchJobStatus {
  jobId: string;
  status: 'queued' | 'processing' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total: number;
    completed: number;
    successful: number;
    failed: number;
    percentage: number;
  };
  estimatedTimeRemaining?: number; // seconds
  estimatedCost?: number; // USD
  actualCost?: number; // USD
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Cost and time estimation
 */
interface CostEstimate {
  estimatedCost: number; // USD
  estimatedTime: number; // seconds
  itemCount: number;
}

/**
 * Batch Generation Service
 * 
 * Orchestrates batch conversation generation with concurrent processing
 */
export class BatchGenerationService {
  // Cost estimation constants (Claude Sonnet 3.5)
  private readonly COST_PER_1K_INPUT_TOKENS = 0.003;
  private readonly COST_PER_1K_OUTPUT_TOKENS = 0.015;
  private readonly AVG_INPUT_TOKENS_PER_CONVERSATION = 2000;
  private readonly AVG_OUTPUT_TOKENS_PER_CONVERSATION = 1500;
  private readonly AVG_TIME_PER_CONVERSATION_MS = 12000; // 12 seconds

  /**
   * Start a batch generation job
   * 
   * @param request - Batch generation request parameters
   * @returns Job ID and initial status
   */
  async startBatchGeneration(request: BatchGenerationRequest): Promise<{
    jobId: string;
    status: string;
    estimatedCost: number;
    estimatedTime: number;
  }> {
    console.log(`[BatchGeneration] Starting batch: ${request.name}`);
    
    // Step 1: Prepare batch items
    let items: Array<{
      templateId: string;
      parameters: Record<string, any>;
      tier: TierType;
      position: number;
    }> = [];
    
    if (request.conversationIds && request.conversationIds.length > 0) {
      // Regenerate existing conversations
      const conversations = await Promise.all(
        request.conversationIds.map(id => conversationService.getById(id))
      );
      
      items = conversations.map((conv, index) => ({
        templateId: conv.parentId || '',
        parameters: {
          ...conv.parameters,
          ...request.sharedParameters,
        },
        tier: conv.tier,
        position: index + 1,
      }));
    } else if (request.parameterSets && request.parameterSets.length > 0) {
      // Generate new conversations from parameter sets
      items = request.parameterSets.map((set, index) => ({
        templateId: set.templateId,
        parameters: {
          ...set.parameters,
          ...request.sharedParameters,
        },
        tier: set.tier,
        position: index + 1,
      }));
    } else if (request.templateId && request.tier) {
      // Single template with shared parameters
      items = [{
        templateId: request.templateId,
        parameters: request.sharedParameters || {},
        tier: request.tier,
        position: 1,
      }];
    } else {
      throw new Error('Must provide conversationIds, parameterSets, or templateId with tier');
    }
    
    // Step 2: Estimate cost and time
    const estimate = this.estimateCostAndTime(items.length);
    
    // Step 3: Create batch job
    const batchJob = await batchJobService.createJob(
      {
        name: request.name,
        priority: request.priority || 'normal',
        status: 'queued',
        createdBy: request.userId,
        workbaseId: request.workbaseId,
        configuration: {
          tier: request.tier,
          sharedParameters: {
            ...(request.sharedParameters || {}),
            ...(request.workbaseId ? { workbaseId: request.workbaseId } : {}),
          },
          concurrentProcessing: request.concurrentProcessing || 3,
          errorHandling: request.errorHandling || 'continue',
        },
      },
      items.map(item => ({
        position: item.position,
        topic: item.parameters.topic || 'Conversation',
        tier: item.tier,
        parameters: {
          templateId: item.templateId,
          ...item.parameters,
        },
        status: 'queued',
      }))
    );
    
    console.log(`[BatchGeneration] Created job ${batchJob.id} with ${items.length} items`);
    
    // Job created in DB with 'queued' status.
    // Processing is triggered by the generate-batch API route emitting
    // 'batch/job.created' Inngest event after this method returns.
    
    console.log(`[BatchGeneration] Job ${batchJob.id} created with ${items.length} items — awaiting Inngest event`);
    
    return {
      jobId: batchJob.id,
      status: 'queued',  // Changed from 'processing' to 'queued' since we're not starting yet
      estimatedCost: estimate.estimatedCost,
      estimatedTime: estimate.estimatedTime,
    };
  }

  /**
   * Get job status
   * 
   * @param jobId - Batch job UUID
   * @returns Current job status and progress
   */
  async getJobStatus(jobId: string): Promise<BatchJobStatus> {
    const job = await batchJobService.getJobById(jobId);
    
    console.log(`[BatchGenerationService.getJobStatus] Job data for ${jobId}:`, {
      status: job.status,
      totalItems: job.totalItems,
      completedItems: job.completedItems,
      successfulItems: job.successfulItems,
      failedItems: job.failedItems
    });
    
    const percentage = job.totalItems > 0 
      ? (job.completedItems / job.totalItems) * 100 
      : 0;
    
    return {
      jobId: job.id,
      status: job.status,
      progress: {
        total: job.totalItems,
        completed: job.completedItems,
        successful: job.successfulItems,
        failed: job.failedItems,
        percentage: Math.round(percentage * 10) / 10,
      },
      estimatedTimeRemaining: job.estimatedTimeRemaining,
      // estimatedCost: job.estimatedCost,
      // actualCost: job.actualCost,
      startedAt: job.startedAt || undefined,
      completedAt: job.completedAt || undefined,
      createdAt: undefined,
      updatedAt: undefined,
    };
  }

  /**
   * Cancel a job
   * 
   * @param jobId - Batch job UUID
   */
  async cancelJob(jobId: string): Promise<BatchJobStatus> {
    console.log(`[BatchGeneration] Cancelling job ${jobId}`);
    
    // Cancel job (this also updates all pending items to cancelled)
    await batchJobService.cancelJob(jobId);
    
    return this.getJobStatus(jobId);
  }

  /**
   * Estimate cost and time for batch generation
   * 
   * @param itemCount - Number of conversations to generate
   * @returns Cost and time estimates
   */
  private estimateCostAndTime(itemCount: number): CostEstimate {
    const inputCost = (this.AVG_INPUT_TOKENS_PER_CONVERSATION * itemCount / 1000) * this.COST_PER_1K_INPUT_TOKENS;
    const outputCost = (this.AVG_OUTPUT_TOKENS_PER_CONVERSATION * itemCount / 1000) * this.COST_PER_1K_OUTPUT_TOKENS;
    const estimatedCost = inputCost + outputCost;
    
    // Time estimate assumes some concurrency benefit
    const estimatedTime = Math.ceil((itemCount * this.AVG_TIME_PER_CONVERSATION_MS) / 3000); // Assuming 3 concurrent
    
    return {
      estimatedCost: Math.round(estimatedCost * 100) / 100,
      estimatedTime,
      itemCount,
    };
  }

}

/**
 * Singleton instance
 */
let serviceInstance: BatchGenerationService | null = null;

/**
 * Get or create singleton batch generation service
 */
export function getBatchGenerationService(): BatchGenerationService {
  if (!serviceInstance) {
    serviceInstance = new BatchGenerationService();
  }
  return serviceInstance;
}

/**
 * Reset singleton instance (useful for testing)
 */
export function resetBatchGenerationService(): void {
  serviceInstance = null;
}

