import mongoose from "mongoose";
import { env } from "../config/env.js";

export const VECTOR_INDEX_SPEC = {
  name: "code_chunks_vector_index",
  type: "vectorSearch",
  definition: {
    fields: [
      { type: "vector", path: "embedding", numDimensions: 768, similarity: "cosine" },
      { type: "filter", path: "namespace" },
    ],
  },
};

export async function ensureIndexes() {
  console.log("=== MongoDB Atlas Vector Search Index ===");
  console.log(JSON.stringify(VECTOR_INDEX_SPEC, null, 2));

  try {
    const conn = await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 4000 });
    const collection = conn.connection.db.collection("codechunks");
    const existing = await collection.listSearchIndexes().toArray();
    if (!existing.some((i) => i.name === VECTOR_INDEX_SPEC.name)) {
      await collection.createSearchIndex(VECTOR_INDEX_SPEC);
      console.log(`\nCreated index "${VECTOR_INDEX_SPEC.name}" on Atlas.`);
    } else {
      console.log(`\nIndex "${VECTOR_INDEX_SPEC.name}" already exists on Atlas.`);
    }
    await mongoose.disconnect();
  } catch (err) {
    console.warn(`\nNote: Auto-create skipped (${err.message.split("\n")[0]}).`);
    console.log("To create manually: Atlas UI > Database > Search > Create Search Index > JSON Editor.");
  }
}

if (process.argv[1]?.endsWith("indexes.js")) {
  ensureIndexes().then(() => process.exit(0));
}
