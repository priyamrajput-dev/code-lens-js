import { CodeChunk } from "../models/code-chunk.model.js";

/**
 * Vector repository handles MongoDB Atlas Vector Search operations.
 *
 * Requires an Atlas Vector Search index named "code_chunks_vector_index"
 * on the codeChunks collection with the following definition:
 *
 * {
 *   "fields": [{
 *     "type": "vector",
 *     "path": "embedding",
 *     "numDimensions": 768,
 *     "similarity": "cosine"
 *   }]
 * }
 */
class VectorRepository {
  async upsertChunks(namespace, chunks) {
    const operations = chunks.map((chunk) => ({
      updateOne: {
        filter: { namespace, chunkId: chunk.id },
        update: {
          $set: {
            namespace,
            chunkId: chunk.id,
            filePath: chunk.filePath,
            content: chunk.text,
            embedding: chunk.embedding || [],
          },
        },
        upsert: true,
      },
    }));

    if (operations.length > 0) {
      await CodeChunk.bulkWrite(operations);
    }
  }

  async deleteNamespace(namespace) {
    await CodeChunk.deleteMany({ namespace });
  }

  /**
   * Perform MongoDB Atlas Vector Search.
   * Requires a vector search index on the 'embedding' field.
   */
  async searchSimilar(namespace, queryEmbedding, topK = 10) {
    try {
      const results = await CodeChunk.aggregate([
        {
          $vectorSearch: {
            index: "code_chunks_vector_index",
            path: "embedding",
            queryVector: queryEmbedding,
            numCandidates: topK * 10,
            limit: topK,
            filter: { namespace },
          },
        },
        {
          $project: {
            filePath: 1,
            content: 1,
            chunkId: 1,
            score: { $meta: "vectorSearchScore" },
          },
        },
      ]);

      return results;
    } catch (error) {
      console.warn("Vector search failed (index may not exist):", error.message);
      return [];
    }
  }
}

export default VectorRepository;
