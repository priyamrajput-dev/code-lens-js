import { Router } from "express";
import ReviewsController from "../controllers/reviews.controller.js";
import ReviewsService from "../services/reviews.service.js";
import ReviewsRepository from "../repositories/reviews.repository.js";
import GithubRepository from "../repositories/github.repository.js";
import BillingRepository from "../repositories/billing.repository.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const reviewRoutes = Router();

const reviewsRepository = new ReviewsRepository();
const githubRepository = new GithubRepository();
const billingRepository = new BillingRepository();
const reviewsService = new ReviewsService(reviewsRepository, githubRepository, billingRepository);
const reviewsController = new ReviewsController(reviewsService);

reviewRoutes.get(
  "/",
  requireAuth,
  asyncHandler(reviewsController.listReviews.bind(reviewsController))
);
reviewRoutes.post(
  "/analyze",
  asyncHandler(reviewsController.analyzeSnippet.bind(reviewsController))
);
reviewRoutes.post(
  "/trigger",
  requireAuth,
  asyncHandler(reviewsController.triggerReview.bind(reviewsController))
);
