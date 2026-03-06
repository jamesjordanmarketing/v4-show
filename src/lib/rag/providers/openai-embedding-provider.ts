import type { EmbeddingProvider } from './embedding-provider';
import { RAG_CONFIG } from '../config';

// ============================================
// OpenAI Embedding Provider Implementation
// ============================================

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private apiKey: string;
  private model: string;
  private dimensions: number;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    
    // Validate API key is present
    if (!this.apiKey) {
      throw new Error(
        'OpenAI API key is missing. Please set OPENAI_API_KEY in your environment variables. ' +
        'For Vercel deployment: Go to Project Settings > Environment Variables > Add OPENAI_API_KEY. ' +
        'Get your API key from: https://platform.openai.com/account/api-keys'
      );
    }
    
    this.model = RAG_CONFIG.embedding.model;
    this.dimensions = RAG_CONFIG.embedding.dimensions;
  }

  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text]);
    return results[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: texts,
        model: this.model,
        dimensions: this.dimensions,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI embedding error (${response.status}): ${error}`);
    }

    const data = await response.json();
    // OpenAI returns embeddings sorted by index
    const sorted = data.data.sort((a: { index: number }, b: { index: number }) => a.index - b.index);
    return sorted.map((item: { embedding: number[] }) => item.embedding);
  }

  getModelName(): string {
    return this.model;
  }

  getDimensions(): number {
    return this.dimensions;
  }
}
