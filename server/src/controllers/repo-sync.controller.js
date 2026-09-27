import RepoSyncService from "../services/repo-sync.service.js";
import AppResponse from "../utils/response.js";
import { triggerRepoSyncSchema, getRepoSyncStatusSchema } from "../validations/repo-sync.validation.js";
import { ValidationError, UnauthorizedError } from "../utils/app-error.js";
import { getZodFieldErrors } from "../utils/zod-error.js";

class RepoSyncController {
  constructor(repoSyncService) {
    this.repoSyncService = repoSyncService;
  }

  parseTriggerBody(body) {
    const parsed = triggerRepoSyncSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Validation failed", getZodFieldErrors(parsed.error));
    }
    return parsed.data;
  }

  parseStatusQuery(query) {
    const parsed = getRepoSyncStatusSchema.safeParse(query);
    if (!parsed.success) {
      throw new ValidationError("Invalid query parameters", getZodFieldErrors(parsed.error));
    }
    return parsed.data;
  }

  async triggerSync(req, res) {
    if (!req.session?.user?.id) throw new UnauthorizedError();
    const input = this.parseTriggerBody(req.body);
    const syncRecord = await this.repoSyncService.triggerSync(
      req.session.user.id,
      input.repoFullName,
      input.branch,
      input.installationId
    );
    AppResponse.ok(res, "Repository sync triggered", syncRecord);
  }

  async getStatuses(req, res) {
    const { repos } = this.parseStatusQuery(req.query);
    const statuses = await this.repoSyncService.getStatuses(repos);
    AppResponse.ok(res, "Sync statuses retrieved", statuses);
  }
}

export default RepoSyncController;
