import mongoose from "mongoose";

const accountSchema = new mongoose.Schema(
  {
    accountId: { type: String, required: true },
    providerId: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    accessToken: { type: String },
    refreshToken: { type: String },
    idToken: { type: String },
    accessTokenExpiresAt: { type: Date },
    refreshTokenExpiresAt: { type: Date },
    scope: { type: String },
    password: { type: String },
  },
  { timestamps: true }
);

accountSchema.index({ userId: 1 });

export const Account = mongoose.model("Account", accountSchema);
