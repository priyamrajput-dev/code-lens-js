import GithubService from "../services/github.service.js";
import AppResponse from "../utils/response.js";
import { saveInstallationSchema, getReposQuerySchema } from "../validations/github.validation.js";
import { ValidationError, UnauthorizedError } from "../utils/app-error.js";
import { getZodFieldErrors } from "../utils/zod-error.js";
import { auth } from "../services/auth.service.js";
import { fromNodeHeaders } from "better-auth/node";

class GithubController {
  constructor(githubService) {
    this.githubService = githubService;
  }

  parseSaveBody(body) {
    const parsed = saveInstallationSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Validation failed", getZodFieldErrors(parsed.error));
    }
    return parsed.data;
  }

  parseReposQuery(query) {
    const parsed = getReposQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new ValidationError("Invalid query parameters", getZodFieldErrors(parsed.error));
    }
    return parsed.data;
  }

  async getStatus(req, res) {
    if (!req.session?.user?.id) throw new UnauthorizedError();
    const status = await this.githubService.getInstallationStatus(req.session.user.id);
    AppResponse.ok(res, "GitHub status retrieved", status);
  }

  async saveInstallation(req, res) {
    if (!req.session?.user?.id) throw new UnauthorizedError();
    const { installationId } = this.parseSaveBody(req.body);
    const installation = await this.githubService.saveInstallation(req.session.user.id, installationId);
    AppResponse.created(res, "GitHub installation saved", installation);
  }

  async deleteInstallation(req, res) {
    if (!req.session?.user?.id) throw new UnauthorizedError();
    await this.githubService.deleteInstallation(req.session.user.id);
    AppResponse.ok(res, "GitHub installation removed");
  }

  async listRepos(req, res) {
    if (!req.session?.user?.id) throw new UnauthorizedError();
    const { page } = this.parseReposQuery(req.query);
    const reposPage = await this.githubService.getRepos(req.session.user.id, page);
    AppResponse.ok(res, "Repositories retrieved", reposPage);
  }

  async handleCallback(req, res) {
    const installationId = req.query.installation_id ? Number(req.query.installation_id) : null;

    let userId = req.session?.user?.id || null;
    if (!userId) {
      try {
        const session = await auth.api.getSession({
          headers: fromNodeHeaders(req.headers),
        });
        if (session?.user?.id) {
          userId = session.user.id;
        }
      } catch (err) {
        console.warn("Could not retrieve session in handleCallback:", err);
      }
    }

    const proto = req.get("x-forwarded-proto") || req.protocol;
    const host = req.get("x-forwarded-host") || req.get("host");
    const baseUrl = host
      ? `${proto}://${host}`
      : process.env.BETTER_AUTH_URL || process.env.CLIENT_URL || "http://localhost:3000";

    if (installationId && userId) {
      try {
        await this.githubService.saveInstallation(userId, installationId);
        return res.redirect(`${baseUrl}/dashboard/github?installed=true`);
      } catch (err) {
        console.error("Failed to save installation from callback:", err);
      }
    }

    return res.redirect(
      `${baseUrl}/dashboard/github${installationId ? `?installation_id=${installationId}` : ""}`
    );
  }
}

export default GithubController;
