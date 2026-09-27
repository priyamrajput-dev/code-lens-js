import mongoose from "mongoose";

const verificationSchema = new mongoose.Schema(
  {
    identifier: { type: String, required: true },
    value: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

verificationSchema.index({ identifier: 1 });

export const Verification = mongoose.model("Verification", verificationSchema);
