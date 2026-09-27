import { User } from "../models/user.model.js";
import { GithubInstallation } from "../models/github-installation.model.js";
import { PullRequest } from "../models/pull-request.model.js";

export const FREE_MONTHLY_LIMIT = 5;

class BillingRepository {
  async findUserById(userId) {
    return await User.findById(userId)
      .select("plan razorpaySubscriptionId subscriptionStatus subscriptionRenewsAt")
      .lean();
  }

  async updateUserSubscription(userId, data) {
    return await User.findByIdAndUpdate(userId, { $set: data }, { new: true }).lean();
  }

  async findUserByRazorpaySubscriptionId(subscriptionId) {
    return await User.findOne({ razorpaySubscriptionId: subscriptionId }).lean();
  }

  async getReviewsThisMonth(userId) {
    const installation = await GithubInstallation.findOne({ userId })
      .select("installationId")
      .lean();

    if (!installation) return 0;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const count = await PullRequest.countDocuments({
      installationId: installation.installationId,
      status: "reviewed",
      reviewedAt: { $gte: startOfMonth },
    });

    return count;
  }

  async canUserReview(userId) {
    const userRecord = await this.findUserById(userId);
    if (!userRecord) return false;

    if (userRecord.plan === "pro" && userRecord.subscriptionStatus === "active") {
      return true;
    }

    const used = await this.getReviewsThisMonth(userId);
    return used < FREE_MONTHLY_LIMIT;
  }
}

export default BillingRepository;
