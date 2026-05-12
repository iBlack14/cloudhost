import { Router } from "express";
import { listPublicPlansHandler, registerHostingHandler } from "../../controllers/public.controller.js";

export const publicRouter = Router();

// This route is NOT protected by requireAuth, it's public for the Billing platform
publicRouter.get("/plans", listPublicPlansHandler);
publicRouter.post("/register-hosting", registerHostingHandler);
