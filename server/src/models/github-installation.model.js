import mongoose from "mongoose";

const githubInstallationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    installationId: { type: Number, required: true },
    accountLogin: { type: String },
    accountType: { type: String },
  },
  { timestamps: true }
);

githubInstallationSchema.index({ installationId: 1 });

export const GithubInstallation = mongoose.model("GithubInstallation", githubInstallationSchema);
