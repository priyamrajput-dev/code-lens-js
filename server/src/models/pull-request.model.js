import mongoose from "mongoose";

const pullRequestSchema = new mongoose.Schema(
  {
    installationId: { type: Number, required: true },
    repoFullName: { type: String, required: true },
    prNumber: { type: Number, required: true },
    title: { type: String, required: true },
    authorLogin: { type: String },
    headSha: { type: String, required: true },
    baseBranch: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "processing", "reviewed", "failed", "rate_limited"],
      default: "pending",
    },
    reviewComment: { type: String },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

pullRequestSchema.index({ repoFullName: 1, prNumber: 1 }, { unique: true });
pullRequestSchema.index({ installationId: 1 });

export const PullRequest = mongoose.model("PullRequest", pullRequestSchema);
