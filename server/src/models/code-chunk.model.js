import mongoose from "mongoose";

/**
 * CodeChunk stores code chunks for both repo-level and PR-level indexing.
 * The 'embedding' field is used by MongoDB Atlas Vector Search.
 *
 * To enable vector search, create an Atlas Search index named "code_chunks_vector_index"
 * on this collection with the embedding field configured for knnVector search.
 */
const codeChunkSchema = new mongoose.Schema(
  {
    namespace: { type: String, required: true, index: true },
    chunkId: { type: String, required: true },
    filePath: { type: String, required: true },
    content: { type: String, required: true },
    embedding: { type: [Number], default: [] },
  },
  { timestamps: true }
);

codeChunkSchema.index({ namespace: 1, chunkId: 1 }, { unique: true });

export const CodeChunk = mongoose.model("CodeChunk", codeChunkSchema);
