import { Router } from "express";
import RepoSyncController from "../controllers/repo-sync.controller.js";
import RepoSyncService from "../services/repo-sync.service.js";
import RepoSyncRepository from "../repositories/repo-sync.repository.js";
import GithubRepository from "../repositories/github.repository.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const repoSyncRoutes = Router();

const repoSyncRepository = new RepoSyncRepository();
const githubRepository = new GithubRepository();
const repoSyncService = new RepoSyncService(repoSyncRepository, githubRepository);
const repoSyncController = new RepoSyncController(repoSyncService);

repoSyncRoutes.post(
  "/trigger",
  requireAuth,
  asyncHandler(repoSyncController.triggerSync.bind(repoSyncController))
);
repoSyncRoutes.get(
  "/status",
  asyncHandler(repoSyncController.getStatuses.bind(repoSyncController))
);
