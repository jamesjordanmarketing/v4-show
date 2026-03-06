/**
 * Pipeline Adapter Testing Types
 *
 * Types for the adapter deployment and A/B testing system
 */

// ============================================
// Inference Endpoint Types
// ============================================

export type EndpointType = 'control' | 'adapted';

export type EndpointStatus =
  | 'pending'
  | 'deploying'
  | 'ready'
  | 'failed'
  | 'terminated';

export interface InferenceEndpoint {
  id: string;
  jobId: string;
  userId: string;

  // Endpoint identity
  endpointType: EndpointType;
  runpodEndpointId: string | null;

  // Model configuration
  baseModel: string;
  adapterPath: string | null;

  // Status
  status: EndpointStatus;
  healthCheckUrl: string | null;
  lastHealthCheck: string | null;

  // Cost tracking
  idleTimeoutSeconds: number;
  estimatedCostPerHour: number | null;

  // Timestamps
  createdAt: string;
  readyAt: string | null;
  terminatedAt: string | null;
  updatedAt: string;

  // Error handling
  errorMessage: string | null;
  errorDetails: Record<string, unknown> | null;
}

// ============================================
// Test Result Types
// ============================================

export type TestResultStatus =
  | 'pending'
  | 'generating'
  | 'evaluating'
  | 'completed'
  | 'failed';

export type UserRating = 'control' | 'adapted' | 'tie' | 'neither';

export interface TestResult {
  id: string;
  jobId: string;
  userId: string;

  // Test input
  systemPrompt: string | null;
  userPrompt: string;

  // Responses
  controlResponse: string | null;
  controlGenerationTimeMs: number | null;
  controlTokensUsed: number | null;

  adaptedResponse: string | null;
  adaptedGenerationTimeMs: number | null;
  adaptedTokensUsed: number | null;

  // Evaluation
  evaluationEnabled: boolean;
  evaluationPromptId: string | null;  // NEW: Track which evaluator was used
  controlEvaluation: ClaudeEvaluation | null;
  adaptedEvaluation: ClaudeEvaluation | null;
  evaluationComparison: EvaluationComparison | null;

  // User rating
  userRating: UserRating | null;
  userNotes: string | null;

  // Status
  status: TestResultStatus;

  // Timestamps
  createdAt: string;
  completedAt: string | null;

  // Error handling
  errorMessage: string | null;
}

// ============================================
// Claude-as-Judge Evaluation Types
// ============================================

export interface EmotionalState {
  primaryEmotion: string;
  intensity: number;  // 0.0 - 1.0
}

export interface ClaudeEvaluation {
  emotionalProgression: {
    startState: EmotionalState;
    endState: EmotionalState;
    arcCompleted: boolean;
    progressionQuality: number;  // 1-5
    progressionNotes: string;
  };

  empathyEvaluation: {
    emotionsAcknowledged: boolean;
    acknowledgmentInFirstSentence: boolean;
    validationProvided: boolean;
    empathyScore: number;  // 1-5
    empathyNotes: string;
  };

  voiceConsistency: {
    warmthPresent: boolean;
    judgmentFree: boolean;
    specificNumbersUsed: boolean;
    jargonExplained: boolean;
    voiceScore: number;  // 1-5
    voiceNotes: string;
  };

  conversationQuality: {
    helpfulToUser: boolean;
    actionableGuidance: boolean;
    appropriateDepth: boolean;
    naturalFlow: boolean;
    qualityScore: number;  // 1-5
    qualityNotes: string;
  };

  overallEvaluation: {
    wouldUserFeelHelped: boolean;
    overallScore: number;  // 1-5
    keyStrengths: string[];
    areasForImprovement: string[];
    summary: string;
  };
}

export interface EvaluationComparison {
  winner: 'control' | 'adapted' | 'tie';
  controlOverallScore: number;
  adaptedOverallScore: number;
  scoreDifference: number;
  improvements: string[];
  regressions: string[];
  summary: string;
}

// ============================================
// Base Model Types
// ============================================

export interface BaseModel {
  id: string;
  modelId: string;
  displayName: string;
  parameterCount: string;
  contextLength: number;
  license: string;
  dockerImage: string;
  minGpuMemoryGb: number;
  recommendedGpuType: string;
  supportsLora: boolean;
  supportsQuantization: boolean;
  isActive: boolean;
}

// ============================================
// API Request/Response Types
// ============================================

export interface DeployAdapterRequest {
  jobId: string;
  forceRedeploy?: boolean;
}

export interface DeployAdapterResponse {
  success: boolean;
  data?: {
    controlEndpoint: InferenceEndpoint;
    adaptedEndpoint: InferenceEndpoint;
  };
  error?: string;
}

export interface RunTestRequest {
  jobId: string;
  userPrompt: string;
  systemPrompt?: string;
  enableEvaluation?: boolean;
  evaluationPromptId?: string;  // NEW: Optional evaluator selection
}

export interface RunTestResponse {
  success: boolean;
  data?: TestResult;
  error?: string;
}

export interface TestResultListResponse {
  success: boolean;
  data?: TestResult[];
  count?: number;
  error?: string;
}

export interface EndpointStatusResponse {
  success: boolean;
  data?: {
    controlEndpoint: InferenceEndpoint | null;
    adaptedEndpoint: InferenceEndpoint | null;
    bothReady: boolean;
  };
  error?: string;
}

export interface RateTestRequest {
  testId: string;
  rating: UserRating;
  notes?: string;
}

// ============================================
// Arc-Aware Evaluation Types (NEW)
// ============================================

// Enhanced emotional state for arc-aware evaluation
export interface ExtendedEmotionalState {
  primaryEmotion: string;
  secondaryEmotion?: string;
  intensity: number;
  valence: 'negative' | 'neutral' | 'positive';
}

export interface EmotionalMovement {
  valenceShift: 'improved' | 'maintained' | 'worsened';
  intensityChange: 'reduced' | 'unchanged' | 'increased';
  movementQuality: number;  // 1-5
  movementNotes: string;
}

export interface ArcAlignment {
  detectedArc: string;  // arc_key or "none"
  arcMatchConfidence: number;  // 0.0-1.0
  alignmentNotes: string;
}

// Evaluator metadata for UI dropdown
export interface EvaluatorOption {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  isDefault: boolean;
}

export interface EvaluatorsResponse {
  success: boolean;
  data?: EvaluatorOption[];
  error?: string;
}
