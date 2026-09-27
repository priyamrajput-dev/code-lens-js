import { PullRequest } from "../models/pull-request.model.js";

class ReviewsRepository {
  async findById(id) {
    return await PullRequest.findById(id).lean();
  }

  async findByRepoAndPrNumber(repoFullName, prNumber) {
    return await PullRequest.findOne({ repoFullName, prNumber }).lean();
  }

  async findByRepoFullName(repoFullName) {
    return await PullRequest.find({ repoFullName })
      .sort({ createdAt: -1 })
      .lean();
  }

  async findByInstallationIds(installationIds) {
    if (installationIds.length === 0) return [];
    return await PullRequest.find({ installationId: { $in: installationIds } })
      .sort({ createdAt: -1 })
      .lean();
  }

  async upsertPullRequest(data) {
    return await PullRequest.findOneAndUpdate(
      { repoFullName: data.repoFullName, prNumber: data.prNumber },
      {
        $set: {
          installationId: data.installationId,
          title: data.title,
          authorLogin: data.authorLogin ?? null,
          headSha: data.headSha,
          baseBranch: data.baseBranch,
          status: data.status ?? "pending",
        },
      },
      { upsert: true, new: true, lean: true }
    );
  }

  async updateReviewResult(id, status, reviewComment, reviewedAt) {
    const update = { status };
    if (reviewComment !== undefined) update.reviewComment = reviewComment;
    if (reviewedAt) update.reviewedAt = reviewedAt;

    return await PullRequest.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
  }
}

export default ReviewsRepository;
