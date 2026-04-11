import { Router } from "express";
import { installWpHandler, listWpSitesHandler } from "../../controllers/odin/wordpress.controller.js";

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

odinRouter.get("/wordpress", listWpSitesHandler);
odinRouter.post("/wordpress/install", installWpHandler);

