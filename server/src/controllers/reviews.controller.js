import ReviewsService from "../services/reviews.service.js";
import AppResponse from "../utils/response.js";
import { getGithubApp } from "../services/github-app.service.js";
import { UnauthorizedError, BadRequestError } from "../utils/app-error.js";
import GithubRepository from "../repositories/github.repository.js";

const REVIEWABLE_ACTIONS = ["opened", "synchronize", "reopened"];

class ReviewsController {
  constructor(reviewsService, githubRepository) {
    this.reviewsService = reviewsService;
    this.githubRepository = githubRepository;
  }

  async handleWebhook(req, res) {
    const rawPayload = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    const signature = req.headers["x-hub-signature-256"];
    const eventName = req.headers["x-github-event"];

    if (signature) {
      try {
        const app = getGithubApp();
        const isValid = await app.webhooks.verify(rawPayload, signature);
        if (!isValid) {
          throw new BadRequestError("Invalid webhook signature");
        }
      } catch (err) {
        throw new BadRequestError("Webhook verification failed");
      }
    }

    const event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    if (eventName === "installation" && event.action === "deleted" && event.installation?.id) {
      if (this.githubRepository) {
        await this.githubRepository.deleteInstallationByInstallationId(event.installation.id);
      }
      return AppResponse.ok(res, "Installation deleted webhook handled");
    }

    if (eventName !== "pull_request") {
      return AppResponse.ok(res, "Event ignored");
    }

    if (!REVIEWABLE_ACTIONS.includes(event.action)) {
      return AppResponse.ok(res, "Action not reviewable");
    }

    const result = await this.reviewsService.handleWebhookPayload(event);
    return AppResponse.ok(res, "Webhook processed", result);
  }

  async listReviews(req, res) {
    const repoFullName = req.query.repo;
    if (repoFullName) {
      const reviews = await this.reviewsService.listReviewsForRepo(repoFullName);
      return AppResponse.ok(res, "Reviews retrieved", reviews);
    }

    if (!req.session?.user?.id) throw new UnauthorizedError();
    const reviews = await this.reviewsService.listReviewsForUser(req.session.user.id);
    return AppResponse.ok(res, "User reviews retrieved", reviews);
  }

  async analyzeSnippet(req, res) {
    const { code, language = "javascript", filename = "code.js" } = req.body;

    if (!code || typeof code !== "string") {
      throw new BadRequestError("Code string is required");
    }

    const reviewResult = await this.reviewsService.analyzeCodeSnippet({
      code,
      language,
      filename,
    });

    return AppResponse.ok(res, "Code review generated", reviewResult);
  }

  async triggerReview(req, res) {
    if (!req.session?.user?.id) throw new UnauthorizedError();
    const { pullRequestId } = req.body;
    if (!pullRequestId) {
      throw new BadRequestError("pullRequestId is required");
    }

    await this.reviewsService.processReview(pullRequestId);
    AppResponse.ok(res, "Review triggered");
  }
}

export default ReviewsController;
