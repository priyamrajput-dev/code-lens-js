import SettingsService from "../services/settings.service.js";
import AppResponse from "../utils/response.js";
import { UnauthorizedError } from "../utils/app-error.js";

class SettingsController {
  constructor(settingsService) {
    this.settingsService = settingsService;
  }

  async getSettings(req, res) {
    if (!req.session?.user?.id) throw new UnauthorizedError();
    const settings = await this.settingsService.getSettings(req.session.user.id);
    AppResponse.ok(res, "Settings retrieved", settings);
  }
}

export default SettingsController;
