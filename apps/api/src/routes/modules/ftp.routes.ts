import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { 
  listFtpAccountsHandler,
  createFtpAccountHandler,
  deleteFtpAccountHandler,
  updateFtpPasswordHandler
} from "../../controllers/odin/ftp.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", listFtpAccountsHandler);
router.post("/", createFtpAccountHandler);
router.delete("/:id", deleteFtpAccountHandler);
router.put("/:id/password", updateFtpPasswordHandler);

export { router as ftpRouter };
