/**
 * Pipeline Evaluation Types
 * 
 * Types for Claude-as-Judge evaluation system
 */

// ============================================
// Test Scenario Types
// ============================================

export type EmotionalArcType =
  | 'confusion_to_clarity'
  | 'anxiety_to_confidence'
  | 'shame_to_acceptance'
  | 'couple_conflict_to_alignment'
  | 'overwhelm_to_empowerment'
  | 'grief_to_healing'
  | 'crisis_to_stability';

export type PersonaType =
  | 'anxious_planner'
  | 'overwhelmed_avoider'
  | 'pragmatic_optimist'
  | 'skeptical_researcher'
  | 'emotional_processor';

export interface TestScenario {
  id: string;
  arcType: EmotionalArcType;
  persona: PersonaType;
  topic: string;
  initialContext: {
    userName: string;
    userBackground: string;
    emotionalState: {
      primaryEmotion: string;
      intensity: number;
      secondaryEmotions: string[];
    };
    situation: string;
  };
  openingMessage: string;
  targetArc: {
    sourceEmotion: string;
    targetEmotion: string;
    expectedTurns: number;
  };
  heldOut: boolean;
  createdDate: string;
}

// ============================================
// Evaluation Run Types
// ============================================

export type EvaluationType = 'baseline' | 'trained';
export type EvaluationStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface EvaluationRun {
  id: string;
  jobId: string;
  evaluationType: EvaluationType;
  modelId: string;
  adapterPath: string | null;
  totalScenarios: number;
  completedScenarios: number;
  failedScenarios: number;
  
  // Aggregate metrics
  arcCompletionRate: number | null;
  avgProgressionQuality: number | null;
  empathyFirstRate: number | null;
  avgEmpathyScore: number | null;
  avgVoiceScore: number | null;
  helpfulRate: number | null;
  avgQualityScore: number | null;
  avgOverallScore: number | null;
  
  // Per-arc breakdown
  perArcMetrics: Record<EmotionalArcType, {
    completionRate: number;
    avgScore: number;
    scenarioCount: number;
  }> | null;
  
  status: EvaluationStatus;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  createdAt: string;
}

// ============================================
// Evaluation Result Types (Claude Response Structure)
// ============================================

export interface EmotionalProgressionResult {
  startState: { primaryEmotion: string; intensity: number };
  endState: { primaryEmotion: string; intensity: number };
  arcCompleted: boolean;
  progressionQuality: number; // 1-5
  progressionNotes: string;
}

export interface EmpathyEvaluationResult {
  emotionsAcknowledged: boolean;
  acknowledgmentInFirstSentence: boolean;
  validationProvided: boolean;
  empathyScore: number; // 1-5
  empathyNotes: string;
}

export interface VoiceConsistencyResult {
  warmthPresent: boolean;
  judgmentFree: boolean;
  specificNumbersUsed: boolean;
  jargonExplained: boolean;
  voiceScore: number; // 1-5
  voiceNotes: string;
}

export interface ConversationQualityResult {
  helpfulToUser: boolean;
  actionableGuidance: boolean;
  appropriateDepth: boolean;
  naturalFlow: boolean;
  qualityScore: number; // 1-5
  qualityNotes: string;
}

export interface OverallEvaluationResult {
  wouldUserFeelHelped: boolean;
  overallScore: number; // 1-5
  keyStrengths: string[];
  areasForImprovement: string[];
  summary: string;
}

export interface EvaluationResult {
  id: string;
  runId: string;
  scenarioId: string;
  conversationTurns: Array<{ role: string; content: string }>;
  totalTokens: number | null;
  generationTimeMs: number | null;
  
  emotionalProgression: EmotionalProgressionResult | null;
  empathyEvaluation: EmpathyEvaluationResult | null;
  voiceConsistency: VoiceConsistencyResult | null;
  conversationQuality: ConversationQualityResult | null;
  overallEvaluation: OverallEvaluationResult | null;
  
  claudeModelUsed: string | null;
  evaluationTokens: number | null;
  rawResponse: string | null;
  evaluatedAt: string;
}

// ============================================
// Comparison Report Types
// ============================================

export interface ComparisonMetric {
  baseline: number;
  trained: number;
  absoluteImprovement: number;
  percentImprovement: number;
  meetsTarget: boolean;
}

export interface ComparisonReport {
  id: string;
  generatedAt: string;
  baselineRunId: string;
  trainedRunId: string;
  trainingJobId: string;
  
  improvements: {
    arcCompletion: ComparisonMetric;
    empathyFirst: ComparisonMetric;
    voiceConsistency: ComparisonMetric;
    overallScore: ComparisonMetric;
  };
  
  trainingSuccessful: boolean;
  successCriteriaMet: string[];
  successCriteriaMissed: string[];
  recommendation: string;
}

// ============================================
// Success Criteria Constants
// ============================================

export const SUCCESS_CRITERIA = {
  arcCompletionRate: { target: 0.40, description: 'Arc Completion Rate >= 40%' },
  empathyFirstRate: { target: 0.85, description: 'Empathy First Rate >= 85%' },
  voiceConsistency: { target: 0.90, description: 'Voice Consistency >= 90%' },
  overallScore: { target: 4.0, description: 'Overall Score >= 4.0' },
} as const;
