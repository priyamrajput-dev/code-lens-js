/**
 * MongoDB Atlas Vector Search Index Setup
 *
 * This file documents the vector search index that must be created
 * manually in the MongoDB Atlas UI or via the Atlas Admin API.
 *
 * Collection: codeChunks (or codechunks)
 * Index Name: code_chunks_vector_index
 *
 * Index Definition:
 * {
 *   "fields": [
 *     {
 *       "type": "vector",
 *       "path": "embedding",
 *       "numDimensions": 768,
 *       "similarity": "cosine"
 *     },
 *     {
 *       "type": "filter",
 *       "path": "namespace"
 *     }
 *   ]
 * }
 *
 * Run: bun run db:seed-indexes
 * (Currently just logs the instructions — Atlas vector indexes
 *  must be created via the Atlas UI or Admin API)
 */

console.log("=== MongoDB Atlas Vector Search Index Setup ===");
console.log();
console.log("Create the following vector search index in your Atlas cluster:");
console.log();
console.log("Collection: codechunks");
console.log("Index Name: code_chunks_vector_index");
console.log();
console.log("Index Definition:");
console.log(JSON.stringify({
  fields: [
    {
      type: "vector",
      path: "embedding",
      numDimensions: 768,
      similarity: "cosine",
    },
    {
      type: "filter",
      path: "namespace",
    },
  ],
}, null, 2));
console.log();
console.log("This index must be created via the Atlas UI > Search > Create Search Index > JSON Editor");
process.exit(0);
