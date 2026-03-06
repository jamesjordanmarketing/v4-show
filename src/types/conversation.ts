/**
 * Multi-Turn Conversation Types
 * 
 * Types for the multi-turn A/B testing chat module with arc-aware evaluation
 */

// ============================================
// Status Types
// ============================================

export type ConversationStatus = 'active' | 'completed' | 'abandoned';

export type TurnStatus = 'pending' | 'generating' | 'completed' | 'failed';

// ============================================
// Core Entity Types
// ============================================

export interface Conversation {
  id: string;
  jobId: string;
  userId: string;
  
  // Metadata
  name: string | null;
  systemPrompt: string | null;
  status: ConversationStatus;
  
  // Turn tracking
  turnCount: number;
  maxTurns: number;
  
  // Token tracking
  controlTotalTokens: number;
  adaptedTotalTokens: number;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ConversationTurn {
  id: string;
  conversationId: string;
  turnNumber: number;
  
  // User input (DEPRECATED: Legacy single message field)
  userMessage: string;
  
  // NEW: Separate messages per endpoint (enables dual-input A/B testing)
  controlUserMessage: string | null;
  adaptedUserMessage: string | null;
  
  // Control response
  controlResponse: string | null;
  controlGenerationTimeMs: number | null;
  controlTokensUsed: number | null;
  controlError: string | null;
  
  // Adapted response
  adaptedResponse: string | null;
  adaptedGenerationTimeMs: number | null;
  adaptedTokensUsed: number | null;
  adaptedError: string | null;
  
  // Evaluation
  evaluationEnabled: boolean;
  evaluationPromptId: string | null;
  controlEvaluation: import('./pipeline-adapter').ClaudeEvaluation | null;
  adaptedEvaluation: import('./pipeline-adapter').ClaudeEvaluation | null;
  evaluationComparison: import('./pipeline-adapter').EvaluationComparison | MultiTurnEvaluationComparison | null;
  
  // NEW: Separate human emotional state tracking for each conversation
  controlHumanEmotionalState: HumanEmotionalState | null;
  adaptedHumanEmotionalState: HumanEmotionalState | null;
  
  // NEW: Separate arc progression for each conversation
  controlArcProgression: ArcProgression | null;
  adaptedArcProgression: ArcProgression | null;
  
  // NEW: Winner declaration
  conversationWinner: ConversationWinnerDeclaration | null;
  
  // DEPRECATED: These are now split into control/adapted versions above
  // Kept for backward compatibility with existing data
  humanEmotionalState: HumanEmotionalState | null;
  arcProgression: ArcProgression | null;
  
  // Status
  status: TurnStatus;
  
  // Timestamps
  createdAt: string;
  completedAt: string | null;
}

// Conversation with turns populated
export interface ConversationWithTurns extends Conversation {
  turns: ConversationTurn[];
}

// ============================================
// Multi-Turn Arc Evaluation Types
// ============================================

export interface HumanEmotionalState {
  turnNumber: number;
  primaryEmotion: string;
  secondaryEmotions: string[];
  intensity: number;  // 0.0-1.0
  valence: 'negative' | 'mixed' | 'neutral' | 'positive';
  confidence: number;  // 0.0-1.0
  evidenceQuotes: string[];
  stateNotes: string;
}

export interface ArcProgression {
  detectedArc: string;  // arc_key or 'none'
  arcMatchConfidence: number;  // 0.0-1.0
  progressionPercentage: number;  // 0-100
  onTrack: boolean;
  progressionNotes: string;
}

export interface AdvisorFacilitation {
  emotionsAcknowledged: boolean;
  acknowledgmentQuality: number;  // 1-5
  movementFacilitated: boolean;
  facilitationScore: number;  // 1-5
  facilitationNotes: string;
}

export interface MultiTurnTurnEvaluation {
  humanProgressedEmotionally: boolean;
  advisorHelpedProgression: boolean;
  turnQualityScore: number;  // 1-5
  cumulativeArcProgress: number;  // 1-5
  keyStrengths: string[];
  areasForImprovement: string[];
  summary: string;
}

export interface MultiTurnEvaluationComparison {
  winner: 'control' | 'adapted' | 'tie';
  controlTurnScore: number;
  adaptedTurnScore: number;
  scoreDifference: number;
  controlArcProgress: number;
  adaptedArcProgress: number;
  improvements: string[];
  regressions: string[];
  summary: string;
}

export interface ConversationWinnerDeclaration {
  winner: 'control' | 'adapted' | 'tie';
  controlProgressPercentage: number;
  adaptedProgressPercentage: number;
  reason: string;
  controlArcName: string | null;
  adaptedArcName: string | null;
}

// ============================================
// Response Quality Evaluator (RQE) Types
// ============================================

export interface RQEDimensionScore {
  score: number;        // 1-10 integer
  evidence: string;     // Specific quotes or observations from the response
}

export interface RQEResponseQuality {
  d1_emotionalAttunement: RQEDimensionScore;
  d2_empathicDepth: RQEDimensionScore;
  d3_psychologicalSafety: RQEDimensionScore;
  d4_facilitationEmpowerment: RQEDimensionScore;
  d5_practicalGuidance: RQEDimensionScore;
  d6_conversationalContinuity: RQEDimensionScore;
}

export interface RQEPredictedArcImpact {
  score: number;        // 0-100
  reasoning: string;
}

export interface RQETurnSummary {
  keyStrengths: string[];
  areasForImprovement: string[];
  summary: string;
}

/** Full evaluation result from the response_quality_multi_turn_v1 evaluator */
export interface RQEEvaluation {
  responseQuality: RQEResponseQuality;
  predictedArcImpact: RQEPredictedArcImpact;
  responseQualityScore: number;   // Claude's computed composite (1.0-10.0)
  turnSummary: RQETurnSummary;
}

/** Pairwise comparison result from response_quality_pairwise_v1 */
export interface RQEPairwiseResult {
  preferred: 'A' | 'B' | 'tie';
  confidence: number;             // 0.0-1.0
  reasoning: string;
  dimensionAdvantages: {
    A: string[];
    B: string[];
  };
}

/** Extended pairwise result with de-randomized mapping */
export interface RQEPairwiseComparison extends RQEPairwiseResult {
  mappedPreferred: 'control' | 'adapted' | 'tie';
  aWas: 'control' | 'adapted';
}

/** RQE-based winner declaration (replaces ConversationWinnerDeclaration for new evaluator) */
export interface RQEWinnerDeclaration {
  winner: 'control' | 'adapted' | 'tie';
  controlRQS: number;
  adaptedRQS: number;
  controlPAI: number;
  adaptedPAI: number;
  reason: string;
  determinedBy: 'pai' | 'rqs' | 'pairwise' | 'tie';
}

/** Dimension weights for computing Response Quality Score */
export const RQE_WEIGHTS = {
  d1_emotionalAttunement: 0.20,
  d2_empathicDepth: 0.20,
  d3_psychologicalSafety: 0.15,
  d4_facilitationEmpowerment: 0.20,
  d5_practicalGuidance: 0.10,
  d6_conversationalContinuity: 0.15,
} as const;

/** Compute the weighted RQS from dimension scores */
export function computeRQS(dimensions: RQEResponseQuality): number {
  const rqs =
    RQE_WEIGHTS.d1_emotionalAttunement * dimensions.d1_emotionalAttunement.score +
    RQE_WEIGHTS.d2_empathicDepth * dimensions.d2_empathicDepth.score +
    RQE_WEIGHTS.d3_psychologicalSafety * dimensions.d3_psychologicalSafety.score +
    RQE_WEIGHTS.d4_facilitationEmpowerment * dimensions.d4_facilitationEmpowerment.score +
    RQE_WEIGHTS.d5_practicalGuidance * dimensions.d5_practicalGuidance.score +
    RQE_WEIGHTS.d6_conversationalContinuity * dimensions.d6_conversationalContinuity.score;
  return Math.round(rqs * 10) / 10; // One decimal place
}

// ============================================
// API Request/Response Types
// ============================================

export interface CreateConversationRequest {
  jobId: string;
  name?: string;
  systemPrompt?: string;
}

export interface CreateConversationResponse {
  success: boolean;
  data?: Conversation;
  error?: string;
}

// AddTurnRequest supports BOTH legacy and new formats for backward compatibility
export interface AddTurnRequest {
  // Legacy format (single message for both endpoints)
  userMessage?: string;
  
  // NEW: Dual-message format (separate messages per endpoint)
  controlUserMessage?: string;
  adaptedUserMessage?: string;
  
  // Common fields
  enableEvaluation?: boolean;
  evaluationPromptId?: string;  // For arc-aware evaluation
}

export interface AddTurnResponse {
  success: boolean;
  data?: ConversationTurn;
  error?: string;
}

export interface GetConversationResponse {
  success: boolean;
  data?: ConversationWithTurns;
  error?: string;
}

export interface ListConversationsResponse {
  success: boolean;
  data?: Conversation[];
  count?: number;
  error?: string;
}

export interface CompleteConversationResponse {
  success: boolean;
  data?: Conversation;
  error?: string;
}

// ============================================
// Message Format for Inference
// ============================================

// OpenAI-compatible message format (used for inference calls)
export interface InferenceMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ============================================
// Token Tracking Types
// ============================================

export interface TokenUsage {
  controlTokens: number;
  adaptedTokens: number;
  totalTokens: number;
  percentageUsed: number;  // Based on context window
  isNearLimit: boolean;     // True if > 80% used
}

// ============================================
// Constants
// ============================================

export const CONVERSATION_CONSTANTS = {
  MAX_TURNS: 10,
  TOKEN_WARNING_THRESHOLD: 0.8,  // Warn at 80% of context window
  DEFAULT_CONTEXT_WINDOW: 8192,  // Conservative default
} as const;

// ============================================
// Helper Functions for Dual Messages
// ============================================

/**
 * Get the user message for a specific endpoint from a turn
 * Handles both new dual-message format and legacy single-message format
 */
export function getUserMessageForEndpoint(
  turn: ConversationTurn,
  endpointType: 'control' | 'adapted'
): string {
  if (endpointType === 'control') {
    return turn.controlUserMessage || turn.userMessage;
  } else {
    return turn.adaptedUserMessage || turn.userMessage;
  }
}

/**
 * Check if a turn uses dual messages (new format) or single message (legacy)
 */
export function turnUsesDualMessages(turn: ConversationTurn): boolean {
  return turn.controlUserMessage !== null || turn.adaptedUserMessage !== null;
}

/**
 * Check if control and adapted received the same message
 */
export function turnMessagesAreIdentical(turn: ConversationTurn): boolean {
  if (!turnUsesDualMessages(turn)) {
    return true; // Legacy turns always have same message
  }
  return turn.controlUserMessage === turn.adaptedUserMessage;
}
