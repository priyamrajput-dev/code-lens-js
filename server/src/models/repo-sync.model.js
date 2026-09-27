import mongoose from "mongoose";

const repoSyncSchema = new mongoose.Schema(
  {
    installationId: { type: Number, required: true },
    repoFullName: { type: String, required: true, unique: true },
    branch: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "syncing", "synced", "failed"],
      default: "pending",
    },
    chunkCount: { type: Number, default: 0 },
    syncedAt: { type: Date },
  },
  { timestamps: true }
);

export const RepoSync = mongoose.model("RepoSync", repoSyncSchema);
