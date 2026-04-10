import { Router } from "express";

export const odinRouter = Router();

odinRouter.get("/dashboard", (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      account: { plan: "Starter", diskUsed: 1536, diskLimit: 5120 },
      services: { domains: 2, emails: 5, databases: 3, apps: 1 }
    }
  });
});
