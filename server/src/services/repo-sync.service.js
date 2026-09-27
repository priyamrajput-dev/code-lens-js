import RepoSyncRepository from "../repositories/repo-sync.repository.js";
import GithubRepository from "../repositories/github.repository.js";
import VectorSearchService from "./vector-search.service.js";
import EmbeddingService from "./embedding.service.js";
import { getGithubApp } from "./github-app.service.js";
import { NotFoundError } from "../utils/app-error.js";

const MAX_FILE_SIZE_BYTES = 100_000;
const MAX_FILES = 300;
const MAX_CHUNK_LINES = 80;
const MAX_CHUNK_CHARS = 6000;
const UPSERT_BATCH_SIZE = 50;

const CODE_EXTENSIONS = [
  ".js", ".jsx", ".ts", ".tsx", ".py", ".go", ".rs", ".java", ".rb", ".php",
  ".c", ".cpp", ".h", ".hpp", ".cs", ".swift", ".kt", ".scala", ".vue",
  ".svelte", ".astro", ".md", ".mdx", ".json", ".yaml", ".yml", ".toml",
  ".sql", ".graphql", ".proto", ".sh", ".bash", ".zsh", ".dockerfile",
  ".tf", ".hcl", ".prisma",
];

const SKIPPED_FOLDERS = [
  "node_modules", ".git", "dist", "build", ".next", "__pycache__",
  "vendor", "target", ".cache", ".turbo", "coverage", ".vscode",
];

export function buildRepoNamespace(repoFullName) {
  return `${repoFullName.replace("/", "--")}--codebase`;
}

async function mapConcurrent(items, limit, fn) {
  const results = new Array(items.length);
  let index = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index++;
      const item = items[current];
      if (item !== undefined) {
        results[current] = await fn(item);
      }
    }
  });

  await Promise.all(workers);
  return results;
}

class RepoSyncService {
  constructor(repoSyncRepository, githubRepository) {
    this.repoSyncRepository = repoSyncRepository;
    this.githubRepository = githubRepository;
    this.vectorSearchService = new VectorSearchService();
    this.embeddingService = new EmbeddingService();
  }

  isIndexableFile(entry) {
    if (entry.type !== "blob" || !entry.path || !entry.sha) return false;
    if (entry.size && entry.size > MAX_FILE_SIZE_BYTES) return false;
    if (SKIPPED_FOLDERS.some((folder) => entry.path.includes(folder))) return false;
    if (entry.path.endsWith(".min.js") || entry.path.endsWith(".min.css") || entry.path.endsWith(".map")) {
      return false;
    }
    return CODE_EXTENSIONS.some((ext) => entry.path.endsWith(ext));
  }

  chunkRepoFiles(files) {
    const chunks = [];
    for (const file of files) {
      const lines = file.content.split("\n");
      for (let start = 0; start < lines.length; start += MAX_CHUNK_LINES) {
        const part = Math.floor(start / MAX_CHUNK_LINES);
        const text = lines.slice(start, start + MAX_CHUNK_LINES).join("\n").slice(0, MAX_CHUNK_CHARS);
        if (text.trim().length === 0) continue;
        chunks.push({
          id: `repo--${file.filePath}--part-${part}`,
          filePath: file.filePath,
          text,
        });
      }
    }
    return chunks;
  }

  async fetchRepoFiles(installationId, repoFullName, branch) {
    const startFetch = Date.now();
    const app = getGithubApp();
    const octokit = await app.getInstallationOctokit(installationId);
    const parts = repoFullName.split("/");
    const owner = parts[0] || "";
    const repo = parts[1] || "";

    const { data: tree } = await octokit.request(
      "GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
      { owner, repo, tree_sha: branch, recursive: "1" }
    );

    const entries = tree.tree.filter(this.isIndexableFile.bind(this)).slice(0, MAX_FILES);

    const rawFiles = await mapConcurrent(entries, 12, async (entry) => {
      try {
        const { data: blob } = await octokit.request(
          "GET /repos/{owner}/{repo}/git/blobs/{file_sha}",
          { owner, repo, file_sha: entry.sha }
        );
        const content = Buffer.from(blob.content, "base64").toString("utf-8");
        return { filePath: entry.path, content };
      } catch (err) {
        console.warn(`Failed to fetch blob for ${entry.path}:`, err);
        return null;
      }
    });

    const files = rawFiles.filter((f) => f !== null);
    console.log(`[RepoSync] Fetched ${files.length} files for ${repoFullName} in ${Date.now() - startFetch}ms`);
    return files;
  }

  async processSync(repoSyncId, installationId, repoFullName, branch) {
    const startTotal = Date.now();
    console.log(`[RepoSync] Starting sync for ${repoFullName} (syncId: ${repoSyncId})`);
    try {
      await this.repoSyncRepository.updateSyncStatus(repoSyncId, "syncing");
      const files = await this.fetchRepoFiles(installationId, repoFullName, branch);
      const chunks = this.chunkRepoFiles(files);
      const namespace = buildRepoNamespace(repoFullName);

      // Clean up previous namespace
      try {
        await this.vectorSearchService.deleteNamespace(namespace);
      } catch {
        // namespace might not exist yet
      }

      // Generate embeddings for chunks in batches
      for (let i = 0; i < chunks.length; i += UPSERT_BATCH_SIZE) {
        const batch = chunks.slice(i, i + UPSERT_BATCH_SIZE);
        const embeddings = await this.embeddingService.generateEmbeddings(
          batch.map((c) => c.text)
        );
        batch.forEach((chunk, idx) => {
          chunk.embedding = embeddings[idx];
        });
      }

      try {
        await this.vectorSearchService.indexChunks(namespace, chunks);
      } catch (err) {
        console.warn(`Vector indexing skipped/failed for ${repoFullName}:`, err);
      }

      await this.repoSyncRepository.updateSyncStatus(repoSyncId, "synced", chunks.length, new Date());
      console.log(`[RepoSync] Successfully synced ${repoFullName} (${chunks.length} chunks) in ${Date.now() - startTotal}ms`);
    } catch (error) {
      console.error(`Repo sync failed for ${repoFullName} after ${Date.now() - startTotal}ms:`, error);
      await this.repoSyncRepository.updateSyncStatus(repoSyncId, "failed");
    }
  }

  async triggerSync(userId, repoFullName, branch = "main", installationId) {
    let resolvedInstallationId = installationId;
    if (!resolvedInstallationId) {
      const installation = await this.githubRepository.findInstallationByUserId(userId);
      if (!installation) {
        throw new NotFoundError("GitHub App not installed for this user.");
      }
      resolvedInstallationId = installation.installationId;
    }

    const record = await this.repoSyncRepository.upsertRepoSync(
      resolvedInstallationId,
      repoFullName,
      branch,
      "pending"
    );

    if (!record) {
      throw new Error("Failed to create repo sync record");
    }

    setImmediate(() => {
      this.processSync(record._id, resolvedInstallationId, repoFullName, branch);
    });

    return record;
  }

  async getStatuses(repoFullNames) {
    const records = await this.repoSyncRepository.findByRepoFullNames(repoFullNames);
    const statusMap = {};
    for (const item of records) {
      statusMap[item.repoFullName] = item.status;
    }
    return statusMap;
  }
}

export default RepoSyncService;
