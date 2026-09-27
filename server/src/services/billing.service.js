import crypto from "crypto";
import Razorpay from "razorpay";
import BillingRepository, { FREE_MONTHLY_LIMIT } from "../repositories/billing.repository.js";
import { env } from "../config/env.js";
import { BadRequestError, NotFoundError } from "../utils/app-error.js";

let razorpayInstance = null;

function getRazorpay() {
  if (!razorpayInstance) {
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay credentials not configured.");
    }
    razorpayInstance = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
}


class BillingService {
  constructor(billingRepository) {
    this.billingRepository = billingRepository;
  }

  async getUserSubscription(userId) {
    const user = await this.billingRepository.findUserById(userId);
    if (!user) {
      return { plan: "free", status: "active", renewsAt: null };
    }

    const renewsAt = user.subscriptionRenewsAt?.toISOString?.() ?? null;

    if (user.plan !== "pro") {
      return { plan: "free", status: "active", renewsAt };
    }

    if (user.subscriptionStatus === "pending") {
      return { plan: "free", status: "trialing", renewsAt };
    }

    if (user.subscriptionStatus === "canceled") {
      const stillActive = user.subscriptionRenewsAt !== null && user.subscriptionRenewsAt > new Date();
      if (stillActive) {
        return { plan: "pro", status: "active", renewsAt };
      }
      return { plan: "free", status: "canceled", renewsAt };
    }

    if (user.subscriptionStatus === "active") {
      return { plan: "pro", status: "active", renewsAt };
    }

    return { plan: "free", status: "canceled", renewsAt };
  }

  async getUsageSummary(userId) {
    const subscription = await this.getUserSubscription(userId);
    const used = await this.billingRepository.getReviewsThisMonth(userId);

    if (subscription.plan === "pro" && subscription.status === "active") {
      return { used, limit: null };
    }

    return { used, limit: FREE_MONTHLY_LIMIT };
  }

  async createProSubscription(userId) {
    const subscription = await this.getUserSubscription(userId);
    if (subscription.plan === "pro" && subscription.status === "active") {
      throw new BadRequestError("You already have an active Pro subscription.");
    }

    const planId = env.RAZORPAY_PRO_PLAN_ID || "plan_dummy_id";
    const razorpay = getRazorpay();

    const razorpaySubscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12,
      customer_notify: 1,
      notes: { userId: String(userId) },
    });

    await this.billingRepository.updateUserSubscription(userId, {
      razorpaySubscriptionId: razorpaySubscription.id,
      subscriptionStatus: "pending",
    });

    return {
      subscriptionId: razorpaySubscription.id,
      keyId: env.RAZORPAY_KEY_ID,
    };
  }

  async cancelProSubscription(userId) {
    const user = await this.billingRepository.findUserById(userId);
    if (!user?.razorpaySubscriptionId) {
      throw new NotFoundError("No active subscription found.");
    }

    const razorpay = getRazorpay();
    await razorpay.subscriptions.cancel(user.razorpaySubscriptionId, false);

    await this.billingRepository.updateUserSubscription(userId, {
      subscriptionStatus: "canceled",
    });

    return { success: true };
  }

  verifyWebhookSignature(body, signature) {
    if (!signature || !env.RAZORPAY_WEBHOOK_SECRET) return false;
    const expectedSignature = crypto
      .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest("hex");
    return expectedSignature === signature;
  }

  async handleWebhook(event) {
    const subscription = event.payload?.subscription?.entity;
    if (!subscription) return;

    let user = subscription.notes?.userId
      ? await this.billingRepository.findUserById(subscription.notes.userId)
      : await this.billingRepository.findUserByRazorpaySubscriptionId(subscription.id);

    if (!user) return;

    const userId = user._id || user.id;

    if (event.event === "subscription.charged" || event.event === "subscription.activated") {
      const renewsAt = subscription.current_end ? new Date(subscription.current_end * 1000) : null;
      await this.billingRepository.updateUserSubscription(userId, {
        plan: "pro",
        subscriptionStatus: "active",
        subscriptionRenewsAt: renewsAt,
      });
    } else if (event.event === "subscription.cancelled") {
      await this.billingRepository.updateUserSubscription(userId, {
        subscriptionStatus: "canceled",
      });
    }
  }
}

export default BillingService;
