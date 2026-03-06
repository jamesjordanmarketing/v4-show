// ============================================
// Embedding Provider Interface
// ============================================
// Abstract interface for embedding generation.
// Phase 1: OpenAI text-embedding-3-small.
// Phase 2+: Self-hosted BGE-M3 or other models.

export interface EmbeddingProvider {
  /**
   * Generate an embedding vector for a single text input.
   */
  embed(text: string): Promise<number[]>;

  /**
   * Generate embeddings for multiple texts in a batch.
   * More efficient than calling embed() in a loop.
   */
  embedBatch(texts: string[]): Promise<number[][]>;

  /**
   * Get the model name for tracking purposes.
   */
  getModelName(): string;

  /**
   * Get the embedding dimensions.
   */
  getDimensions(): number;
}
