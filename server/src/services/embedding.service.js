import { env } from "../config/env.js";

/**
 * Embedding service abstracts the embedding provider.
 *
 * Currently uses Google's embedding model via the Gemini API.
 * Falls back to zero-vectors if no API key is configured (development mode).
 *
 * Replace the provider implementation here to switch embedding backends.
 */
class EmbeddingService {
  constructor() {
    this.dimensions = 768;
  }

  async generateEmbedding(text) {
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      // Return zero-vector in development when no key is configured
      return new Array(this.dimensions).fill(0);
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/text-embedding-004",
            content: { parts: [{ text: text.slice(0, 2048) }] },
          }),
        }
      );

      const data = await response.json();
      if (data.embedding?.values) {
        return data.embedding.values;
      }

      console.warn("Embedding API returned no values, using zero-vector");
      return new Array(this.dimensions).fill(0);
    } catch (error) {
      console.warn("Embedding generation failed:", error.message);
      return new Array(this.dimensions).fill(0);
    }
  }

  async generateEmbeddings(texts) {
    return Promise.all(texts.map((t) => this.generateEmbedding(t)));
  }
}

export default EmbeddingService;
