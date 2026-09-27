import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    emailVerified: { type: Boolean, default: false },
    image: { type: String },
    plan: { type: String, enum: ["free", "pro"], default: "free" },
    razorpaySubscriptionId: { type: String },
    subscriptionStatus: { type: String, enum: ["active", "canceled", "trialing", "pending", null] },
    subscriptionRenewsAt: { type: Date },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
