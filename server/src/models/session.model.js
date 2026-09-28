import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    expiresAt: { type: Date, required: true },
    token: { type: String, required: true, unique: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

sessionSchema.index({ userId: 1 });
export const Session = mongoose.model("Session", sessionSchema, "session");
