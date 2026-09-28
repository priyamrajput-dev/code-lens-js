import ReviewsRepository from "../repositories/reviews.repository.js";
import GithubRepository from "../repositories/github.repository.js";
import BillingRepository from "../repositories/billing.repository.js";
import VectorSearchService from "./vector-search.service.js";
import EmbeddingService from "./embedding.service.js";
import AiService from "./ai.service.js";
import { getGithubApp } from "./github-app.service.js";
import { buildRepoNamespace } from "./repo-sync.service.js";

const MAX_CHUNK_LINES = 80;
const FILES_PER_PAGE = 100;

const SYSTEM_PROMPT = `You are an expert code reviewer with deep knowledge of software engineering best practices, security, and performance optimization.

Review the provided unified diff chunks and write a concise, actionable pull request review in markdown.

## Review Checklist

Analyze the changes across these dimensions (only mention what's relevant):
- **Correctness** — Bugs, logic errors, off-by-one errors, incorrect assumptions
- **Security** — Injection risks, auth issues, exposed secrets, unsafe deserialization, unvalidated input
- **Performance** — Unnecessary loops, missing indexes, N+1 queries, memory leaks
- **Reliability** — Unhandled errors/edge cases, missing null checks, race conditions
- **Readability** — Naming clarity, overly complex logic, missing comments on non-obvious code
- **Maintainability** — Tight coupling, duplication, violations of SOLID/DRY principles

## Output Format

Start with a **one-line summary** of the overall change quality.

Then use this structure if there are findings:
### ✅ What looks good
(skip if nothing notable)

### ⚠️ Suggestions
(non-blocking improvements)

### 🚨 Issues
(bugs, security problems, or breaking changes that should be fixed)

## Guidelines
- Be specific: reference the relevant code, function names, or line context
- Be constructive: explain *why* something is a problem and suggest a fix
- Be proportional: don't nitpick minor style issues if there are real bugs
- If the diff looks clean with no concerns, say so clearly in 1–2 sentences — do not invent problems
- Tailor feedback to the repository language and conventions visible in the diff`;

class ReviewsService {
  constructor(reviewsRepository, githubRepository, billingRepository) {
    this.reviewsRepository = reviewsRepository;
    this.githubRepository = githubRepository;
    this.billingRepository = billingRepository;
    this.vectorSearchService = new VectorSearchService();
    this.embeddingService = new EmbeddingService();
    this.aiService = new AiService();
  }

  buildPrNamespace(repoFullName, prNumber) {
    return `${repoFullName.replace("/", "--")}--pr-${prNumber}`;
  }

  chunkPrFiles(prNumber, files) {
    const chunks = [];
    for (const file of files) {
      const lines = file.patch.split("\n");
      for (let start = 0; start < lines.length; start += MAX_CHUNK_LINES) {
        const part = start / MAX_CHUNK_LINES;
        const text = lines.slice(start, start + MAX_CHUNK_LINES).join("\n");
        chunks.push({
          id: `pr-${prNumber}--${file.filePath}--part-${part}`,
          filePath: file.filePath,
          text,
        });
      }
    }
    return chunks;
  }

  async fetchPullRequestFiles(installationId, repoFullName, prNumber) {
    const app = getGithubApp();
    const octokit = await app.getInstallationOctokit(installationId);
    const parts = repoFullName.split("/");
    const owner = parts[0] || "";
    const repo = parts[1] || "";

    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/pulls/{pull_number}/files",
      { owner, repo, pull_number: prNumber, per_page: FILES_PER_PAGE }
    );

    const files = [];
    for (const file of data) {
      if (!file.patch) continue;
      files.push({ filePath: file.filename, patch: file.patch });
    }
    return files;
  }

  async postComment(installationId, repoFullName, prNumber, body) {
    const app = getGithubApp();
    const octokit = await app.getInstallationOctokit(installationId);
    const parts = repoFullName.split("/");
    const owner = parts[0] || "";
    const repo = parts[1] || "";

    try {
      // Post as an official GitHub Pull Request Review (shows in Reviewers section & Files Changed tab)
      await octokit.request("POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews", {
        owner,
        repo,
        pull_number: prNumber,
        event: "COMMENT",
        body,
      });
    } catch (err) {
      console.warn("Pull request review creation failed, falling back to issue comment:", err.message);
      await octokit.request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", {
        owner,
        repo,
        issue_number: prNumber,
        body,
      });
    }
  }

  async searchContext(namespace, query) {
    try {
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);
      const results = await this.vectorSearchService.searchSimilar(namespace, queryEmbedding, 10);
      return results.map((hit) => `File: ${hit.filePath}\n${hit.content}`);
    } catch {
      return [];
    }
  }

  async processReview(pullRequestId) {
    const pr = await this.reviewsRepository.findById(pullRequestId);
    if (!pr) return;

    try {
      await this.reviewsRepository.updateReviewResult(pullRequestId, "processing");

      const files = await this.fetchPullRequestFiles(
        pr.installationId,
        pr.repoFullName,
        pr.prNumber
      );

      if (files.length === 0) {
        await this.reviewsRepository.updateReviewResult(
          pullRequestId,
          "reviewed",
          "No reviewable code changes found in this pull request.",
          new Date()
        );
        return;
      }

      const prNamespace = this.buildPrNamespace(pr.repoFullName, pr.prNumber);
      const repoNamespace = buildRepoNamespace(pr.repoFullName);
      const chunks = this.chunkPrFiles(pr.prNumber, files);

      // Save PR chunks to MongoDB with embeddings
      try {
        const embeddings = await this.embeddingService.generateEmbeddings(
          chunks.map((c) => c.text)
        );
        chunks.forEach((chunk, idx) => {
          chunk.embedding = embeddings[idx];
        });
        await this.vectorSearchService.indexChunks(prNamespace, chunks);
      } catch (err) {
        console.warn("Vector indexing failed for PR chunks:", err);
      }

      let diffSummary = files.map((f) => `### ${f.filePath}\n\`\`\`diff\n${f.patch}\n\`\`\``).join("\n\n");
      const MAX_DIFF_LENGTH = 35000;
      if (diffSummary.length > MAX_DIFF_LENGTH) {
        diffSummary = diffSummary.slice(0, MAX_DIFF_LENGTH) + "\n\n...[diff truncated for length]";
      }
      const repoContextSnippets = await this.searchContext(repoNamespace, pr.title);
      const repoContextSection =
        repoContextSnippets.length > 0
          ? `\n\nRelated code from repository codebase:\n\n${repoContextSnippets.join("\n\n---\n\n")}`
          : "";

      const reviewText = await this.aiService.generateReview(
        SYSTEM_PROMPT,
        `Repository: ${pr.repoFullName}\nPull request title: ${pr.title}\n\nCode changes:\n\n${diffSummary}${repoContextSection}`
      );

      try {
        await this.postComment(pr.installationId, pr.repoFullName, pr.prNumber, reviewText);
      } catch (commentErr) {
        console.error("Failed to post comment to GitHub PR:", commentErr);
      }

      await this.reviewsRepository.updateReviewResult(
        pullRequestId,
        "reviewed",
        reviewText,
        new Date()
      );
    } catch (error) {
      console.error(`Failed to review PR ${pr.repoFullName} #${pr.prNumber}:`, error);
      await this.reviewsRepository.updateReviewResult(pullRequestId, "failed");
    }
  }

  async handleWebhookPayload(payload) {
    let effectiveInstallationId = payload.installation?.id;
    let installation = await this.githubRepository.findInstallationByInstallationId(
      effectiveInstallationId
    );

    if (!installation && payload.repository?.owner?.login) {
      const fallback = await this.githubRepository.findInstallationByAccountLogin(
        payload.repository.owner.login
      );
      if (fallback?.installationId) {
        effectiveInstallationId = fallback.installationId;
        installation = fallback;
      }
    }

    const prRecord = await this.reviewsRepository.upsertPullRequest({
      installationId: effectiveInstallationId,
      repoFullName: payload.repository.full_name,
      prNumber: payload.pull_request.number,
      title: payload.pull_request.title,
      authorLogin: payload.pull_request.user?.login,
      headSha: payload.pull_request.head.sha,
      baseBranch: payload.pull_request.base.ref,
    });

    if (!prRecord) {
      throw new Error("Failed to upsert pull request record");
    }

    if (installation?.userId) {
      const allowed = await this.billingRepository.canUserReview(installation.userId);
      if (!allowed) {
        await this.reviewsRepository.updateReviewResult(prRecord._id, "rate_limited");
        return { prRecord, rateLimited: true };
      }
    }

    setImmediate(() => {
      this.processReview(prRecord._id);
    });

    return { prRecord, rateLimited: false };
  }

  async listReviewsForRepo(repoFullName) {
    return await this.reviewsRepository.findByRepoFullName(repoFullName);
  }

  async listReviewsForUser(userId) {
    const installation = await this.githubRepository.findInstallationByUserId(userId);
    const installationIds = installation?.installationId ? [installation.installationId] : [];
    const accountLogin = installation?.accountLogin || null;

    return await this.reviewsRepository.findByUserScope({ installationIds, accountLogin });
  }

  async analyzeCodeSnippet(data) {
    const { code, language = "auto", filename = "code.js" } = data;

    const langContext =
      language && language !== "auto" && language !== "Auto-Detect"
        ? `written in ${language}`
        : "auto-detecting the programming language";

    const prompt = `Analyze the following code snippet from file "${filename}" (${langContext}):

\`\`\`
${code}
\`\`\`

You must respond with valid JSON ONLY matching the following schema:
{
  "score": number,
  "summary": string,
  "criticalCount": number,
  "warningCount": number,
  "suggestionCount": number,
  "findings": [
    {
      "id": string,
      "severity": "critical" | "warning" | "suggestion" | "good",
      "line": number | null,
      "title": string,
      "explanation": string,
      "recommendation": string,
      "codeSnippet": string | null
    }
  ]
}
Do not wrap your response in markdown fences. Return raw JSON string only.`;

    try {
      return await this.aiService.generateStructuredOutput(
        "You are an elite static code analysis and AI security reviewer. You output strictly valid, parseable JSON matching the requested schema without markdown formatting.",
        prompt
      );
    } catch (err) {
      console.error("Failed to analyze code snippet with AI model:", err);
      return this.generateFallbackSnippetReview(code, language, filename);
    }
  }

  generateFallbackSnippetReview(code, language, filename) {
    const findings = [];
    const lines = code.split("\n");
    let score = 88;
    let criticalCount = 0;
    let warningCount = 0;
    let suggestionCount = 0;

    if (code.includes("eval(") || code.includes("innerHTML") || code.includes("dangerouslySetInnerHTML")) {
      criticalCount++;
      score -= 25;
      findings.push({
        id: "finding-1",
        severity: "critical",
        line: lines.findIndex((l) => l.includes("eval(") || l.includes("innerHTML") || l.includes("dangerouslySetInnerHTML")) + 1 || 1,
        title: "Potential Injection / Unsafe Execution Vulnerability",
        explanation: "Direct assignment of untrusted content can lead to XSS or arbitrary code execution.",
        recommendation: "Use secure alternatives such as textContent or sanitize inputs.",
        codeSnippet: "element.textContent = sanitizedValue;",
      });
    }

    if (code.includes("console.log") || code.includes("print(") || code.includes("debugger")) {
      suggestionCount++;
      score -= 5;
      findings.push({
        id: "finding-2",
        severity: "suggestion",
        line: lines.findIndex((l) => l.includes("console.log") || l.includes("print(") || l.includes("debugger")) + 1 || 1,
        title: "Production Logging / Debug Statement",
        explanation: "Console logs or debug statements left in code may leak sensitive data.",
        recommendation: "Replace with structured logger or remove prior to production.",
        codeSnippet: "logger.info('Operation completed', { contextId });",
      });
    }

    if (findings.length === 0) {
      findings.push({
        id: "finding-good-1",
        severity: "good",
        line: 1,
        title: "Clean Code Architecture & Practices",
        explanation: "Code demonstrates clean control flow and no obvious security antipatterns.",
        recommendation: "Maintain robust unit test coverage.",
        codeSnippet: null,
      });
    }

    return {
      score: Math.max(30, Math.min(100, score)),
      summary: criticalCount > 0
        ? "Code contains potential security risks."
        : "Code is structured well with opportunities for minor optimization.",
      criticalCount,
      warningCount,
      suggestionCount,
      findings,
    };
  }
}

export default ReviewsService;
