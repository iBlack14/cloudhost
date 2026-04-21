import { Router } from "express";

import { authRouter } from "./modules/auth.routes.js";
import { databaseSsoBridgeHandler } from "../controllers/database-sso.controller.js";
import { mailRouter } from "./modules/mail.routes.js";
import { whmRouter } from "./modules/whm.routes.js";
import { odinRouter } from "./modules/odin.routes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.get("/database-auth/sso", databaseSsoBridgeHandler);
apiRouter.use("/mail", mailRouter);
apiRouter.use("/whm", whmRouter);
apiRouter.use("/odin-panel", odinRouter);
