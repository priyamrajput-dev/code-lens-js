import { RepoSync } from "../models/repo-sync.model.js";

class RepoSyncRepository {
  async findByRepoFullName(repoFullName) {
    return await RepoSync.findOne({ repoFullName }).lean();
  }

  async findByRepoFullNames(repoFullNames) {
    if (repoFullNames.length === 0) return [];
    return await RepoSync.find({ repoFullName: { $in: repoFullNames } }).lean();
  }

  async upsertRepoSync(installationId, repoFullName, branch, status = "pending") {
    return await RepoSync.findOneAndUpdate(
      { repoFullName },
      { $set: { installationId, branch, status } },
      { upsert: true, new: true, lean: true }
    );
  }

  async updateSyncStatus(id, status, chunkCount, syncedAt) {
    const update = { status };
    if (chunkCount !== undefined) update.chunkCount = chunkCount;
    if (syncedAt) update.syncedAt = syncedAt;

    return await RepoSync.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
  }
}

export default RepoSyncRepository;
