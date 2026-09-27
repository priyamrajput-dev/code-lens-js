import { Router } from "express";
import SettingsController from "../controllers/settings.controller.js";
import SettingsService from "../services/settings.service.js";
import GithubService from "../services/github.service.js";
import GithubRepository from "../repositories/github.repository.js";
import BillingService from "../services/billing.service.js";
import BillingRepository from "../repositories/billing.repository.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const settingsRoutes = Router();

const githubRepository = new GithubRepository();
const githubService = new GithubService(githubRepository);
const billingRepository = new BillingRepository();
const billingService = new BillingService(billingRepository);
const settingsService = new SettingsService(githubService, billingService, billingRepository);
const settingsController = new SettingsController(settingsService);

settingsRoutes.get(
  "/",
  requireAuth,
  asyncHandler(settingsController.getSettings.bind(settingsController))
);
