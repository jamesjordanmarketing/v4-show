/**
 * Generation Integration Types
 * 
 * Type definitions that bridge chunks, dimensions, and conversation generation
 */

// ============================================================================
// Chunk Reference Types (for Generation Context)
// ============================================================================

/**
 * Lightweight chunk reference for prompt injection
 * Contains essential chunk data without full database record
 */
export interface ChunkReference {
  id: string;
  chunkId: string;
  documentId: string;
  documentTitle?: string;
  content: string;
  sectionHeading?: string;
  pageStart?: number;
  pageEnd?: number;
  tokenCount: number;
  chunkType: string;
}


// ============================================================================
// Dimension Source Types (for Parameter Mapping)
// ============================================================================

/**
 * Semantic dimensions extracted from chunk content
 * Used to inform conversation generation parameters
 */
export interface SemanticDimensions {
  persona?: string[]; // Suggested personas from tone_voice_tags/brand_persona_tags
  emotion?: string[]; // Emotions from tone_voice_tags
  complexity?: number; // 0-1 scale derived from content analysis
  domain?: string[]; // Domain tags from chunk dimensions
  audience?: string; // Target audience
  intent?: string; // Communication intent
}

/**
 * Dimension source with confidence and metadata
 */
export interface DimensionSource {
  chunkId: string;
  runId: string;
  semanticDimensions: SemanticDimensions;
  confidence: number; // Overall dimension confidence (0-1)
  generationModel?: string;
  generatedAt: string;
}


// ============================================================================
// Conversation Context Types
// ============================================================================

/**
 * Extended generation params with chunk context
 */
export interface ChunkAwareGenerationParams {
  parentChunkId?: string;
  explicitParams?: boolean; // True if params manually set (don't override)
  promptTemplate?: string; // Template with placeholders
}

/**
 * Context data built for prompt injection
 */
export interface PromptContext {
  chunkContent: string;
  chunkMetadata: string;
  dimensionContext?: string;
}

/**
 * Multi-chunk support (FR requirement: up to 3 chunks per conversation)
 */
export interface MultiChunkContext {
  chunks: ChunkReference[];
  primaryChunkId: string;
  combinedContext: PromptContext;
}

