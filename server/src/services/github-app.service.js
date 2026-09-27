import { App } from "octokit";
import { env } from "../config/env.js";

let githubApp = null;

export function getGithubApp() {
  if (!githubApp) {
    const privateKey = env.GITHUB_PRIVATE_KEY || env.GITHUB_APP_PRIVATE_KEY;
    if (!env.GITHUB_APP_ID || !privateKey) {
      throw new Error(
        "GitHub App credentials (GITHUB_APP_ID, GITHUB_PRIVATE_KEY / GITHUB_APP_PRIVATE_KEY) are not configured."
      );
    }

    githubApp = new App({
      appId: env.GITHUB_APP_ID,
      privateKey: privateKey.replace(/\\n/g, "\n"),
      webhooks: {
        secret: env.GITHUB_WEBHOOK_SECRET || "default_secret",
      },
    });
  }

  return githubApp;
}

export function getGithubInstallUrl(userId) {
  const appSlug = env.GITHUB_APP_SLUG || "chaicode-pr-review";
  const url = new URL(`https://github.com/apps/${appSlug}/installations/new`);
  url.searchParams.set("state", String(userId));
  return url.toString();
}
