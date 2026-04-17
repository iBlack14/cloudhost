import express, { type Application } from "express";
import cors from "cors";
import helmet from "helmet";

import { apiRouter } from "./routes/index.js";
import { errorHandler } from "./middleware/error-handler.js";
import { env } from "./config/env.js";

export const createApp = (): Application => {
  const app = express();

  app.use(helmet());
  
  const origins = env.CORS_ORIGIN === "*" ? "*" : env.CORS_ORIGIN.split(",");
  app.use(cors({ origin: origins }));
  
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.status(200).json({ success: true, data: { status: "ok" } });
  });

  app.use("/api/v1", apiRouter);
  app.use(errorHandler);

  return app;
};
