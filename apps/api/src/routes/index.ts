import { Router } from "express";

import { authRouter } from "./modules/auth.routes.js";
import { whmRouter } from "./modules/whm.routes.js";
import { odinRouter } from "./modules/odin.routes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/whm", whmRouter);
apiRouter.use("/odin-panel", odinRouter);
