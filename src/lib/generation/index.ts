/**
 * Generation Module Index
 */

// Core services
export { promptContextBuilder } from './prompt-context-builder';
export { dimensionParameterMapper } from './dimension-parameter-mapper';

// Types
export type {
  ChunkReference,
  DimensionSource,
  SemanticDimensions,
  PromptContext,
  ChunkAwareGenerationParams,
  MultiChunkContext,
} from './types';

export type {
  ParameterSuggestions,
} from './dimension-parameter-mapper';

// Re-export classes for advanced usage
export { PromptContextBuilder } from './prompt-context-builder';
export { DimensionParameterMapper } from './dimension-parameter-mapper';
