import { toNodeHandler } from "better-auth/node";
import express from "express";
import cors from "cors";
import { auth } from "./services/auth.service.js";
import { env } from "./config/env.js";
import { githubRoutes } from "./routes/github.routes.js";
import { repoSyncRoutes } from "./routes/repo-sync.routes.js";
import { reviewRoutes } from "./routes/reviews.routes.js";
import { billingRoutes } from "./routes/billing.routes.js";
import { settingsRoutes } from "./routes/settings.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { requestId } from "./middleware/request-id.middleware.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApplication() {
  const app = express();

  app.use(requestId);

  app.use(
    cors({
      origin: [
        env.CLIENT_URL,
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://localhost:8080",
        /^http:\/\/localhost(:\d+)?$/,
        /^http:\/\/127\.0\.0\.1(:\d+)?$/,
        "https://slaw-walnut-showy.ngrok-free.dev",
      ],
      credentials: true,
    })
  );

  // Better Auth handler for Express 5
  app.all("/api/auth/*path", toNodeHandler(auth));

  app.use(express.json());

  // Feature Module Routes
  app.use("/api/github", githubRoutes);
  app.use("/api/repo-sync", repoSyncRoutes);
  app.use("/api/reviews", reviewRoutes);
  app.use("/api/billing", billingRoutes);
  app.use("/api/settings", settingsRoutes);

  // Serve frontend client dist if available
  const clientDistPath = path.resolve(__dirname, "../../client/dist");
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.get("*path", (req, res, next) => {
      if (req.path.startsWith("/api")) {
        return next();
      }
      res.sendFile(path.join(clientDistPath, "index.html"));
    });
  }

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
