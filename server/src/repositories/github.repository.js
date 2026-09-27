import { GithubInstallation } from "../models/github-installation.model.js";

class GithubRepository {
  async findInstallationByUserId(userId) {
    return await GithubInstallation.findOne({ userId }).lean();
  }

  async findInstallationByInstallationId(installationId) {
    return await GithubInstallation.findOne({ installationId }).lean();
  }

  async upsertInstallation(userId, installationId, accountLogin, accountType) {
    return await GithubInstallation.findOneAndUpdate(
      { userId },
      { $set: { userId, installationId, accountLogin, accountType } },
      { upsert: true, new: true, lean: true }
    );
  }

  async deleteInstallationByUserId(userId) {
    return await GithubInstallation.deleteOne({ userId });
  }

  async deleteInstallationByInstallationId(installationId) {
    return await GithubInstallation.deleteOne({ installationId });
  }
}

export default GithubRepository;
