import BillingService from "../services/billing.service.js";
import AppResponse from "../utils/response.js";
import { UnauthorizedError, BadRequestError } from "../utils/app-error.js";

class BillingController {
  constructor(billingService) {
    this.billingService = billingService;
  }

  async getSubscription(req, res) {
    if (!req.session?.user?.id) throw new UnauthorizedError();
    const subscription = await this.billingService.getUserSubscription(req.session.user.id);
    AppResponse.ok(res, "Subscription retrieved", subscription);
  }

  async getUsage(req, res) {
    if (!req.session?.user?.id) throw new UnauthorizedError();
    const usage = await this.billingService.getUsageSummary(req.session.user.id);
    AppResponse.ok(res, "Usage summary retrieved", usage);
  }

  async createSubscription(req, res) {
    if (!req.session?.user?.id) throw new UnauthorizedError();
    const data = await this.billingService.createProSubscription(req.session.user.id);
    AppResponse.created(res, "Pro subscription created", data);
  }

  async cancelSubscription(req, res) {
    if (!req.session?.user?.id) throw new UnauthorizedError();
    const data = await this.billingService.cancelProSubscription(req.session.user.id);
    AppResponse.ok(res, "Subscription canceled successfully", data);
  }

  async handleWebhook(req, res) {
    const signature = req.headers["x-razorpay-signature"];
    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

    if (signature && !this.billingService.verifyWebhookSignature(rawBody, signature)) {
      throw new BadRequestError("Invalid signature");
    }

    const event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    await this.billingService.handleWebhook(event);

    AppResponse.ok(res, "Webhook processed");
  }
}

export default BillingController;
