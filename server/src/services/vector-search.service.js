import VectorRepository from "../repositories/vector.repository.js";

class VectorSearchService {
  constructor(vectorRepository) {
    this.vectorRepository = vectorRepository || new VectorRepository();
  }

  async indexChunks(namespace, chunks) {
    await this.vectorRepository.upsertChunks(namespace, chunks);
    console.log(`[VectorSearch] Indexed ${chunks.length} chunks in namespace "${namespace}"`);
  }

  async deleteNamespace(namespace) {
    await this.vectorRepository.deleteNamespace(namespace);
  }

  async searchSimilar(namespace, queryEmbedding, topK = 10) {
    const results = await this.vectorRepository.searchSimilar(namespace, queryEmbedding, topK);
    return results.map((hit) => ({
      filePath: hit.filePath,
      content: hit.content,
      score: hit.score,
    }));
  }
}

export default VectorSearchService;
