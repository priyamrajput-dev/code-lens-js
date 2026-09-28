import { Router } from "express";
import GithubController from "../controllers/github.controller.js";
import GithubService from "../services/github.service.js";
import GithubRepository from "../repositories/github.repository.js";
import ReviewsController from "../controllers/reviews.controller.js";
import ReviewsService from "../services/reviews.service.js";
import ReviewsRepository from "../repositories/reviews.repository.js";
import BillingRepository from "../repositories/billing.repository.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const githubRoutes = Router();

const githubRepository = new GithubRepository();
const githubService = new GithubService(githubRepository);
const githubController = new GithubController(githubService);

const reviewsRepository = new ReviewsRepository();
const billingRepository = new BillingRepository();
const reviewsService = new ReviewsService(reviewsRepository, githubRepository, billingRepository);
const reviewsController = new ReviewsController(reviewsService, githubRepository);

githubRoutes.post(
  "/webhook",
  asyncHandler(reviewsController.handleWebhook.bind(reviewsController))
);

githubRoutes.get(
  "/status",
  requireAuth,
  asyncHandler(githubController.getStatus.bind(githubController))
);
githubRoutes.post(
  "/installation",
  requireAuth,
  asyncHandler(githubController.saveInstallation.bind(githubController))
);
githubRoutes.delete(
  "/installation",
  requireAuth,
  asyncHandler(githubController.deleteInstallation.bind(githubController))
);
githubRoutes.get(
  "/repos",
  requireAuth,
  asyncHandler(githubController.listRepos.bind(githubController))
);
githubRoutes.get(
  ["/callback", "/callback{*path}"],
  asyncHandler(githubController.handleCallback.bind(githubController))
);
