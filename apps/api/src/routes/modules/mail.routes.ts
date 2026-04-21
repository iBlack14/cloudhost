import { Router } from "express";

import { requireMailAuth } from "../../middleware/mail-auth.js";
import {
  exchangeMailSsoHandler,
  getMailMeHandler,
  getMailMessageHandler,
  listMailFoldersHandler,
  listMailMessagesHandler,
  loginMailHandler,
  logoutMailHandler,
  moveMailMessageHandler,
  sendMailMessageHandler,
  updateMailMessageReadHandler,
  updateMailMessageStarHandler
} from "../../controllers/mail.controller.js";

export const mailRouter = Router();

mailRouter.post("/auth/login", loginMailHandler);
mailRouter.post("/auth/sso/exchange", exchangeMailSsoHandler);
mailRouter.post("/auth/logout", logoutMailHandler);

mailRouter.use(requireMailAuth);

mailRouter.get("/me", getMailMeHandler);
mailRouter.get("/folders", listMailFoldersHandler);
mailRouter.get("/messages", listMailMessagesHandler);
mailRouter.get("/messages/:messageId", getMailMessageHandler);
mailRouter.post("/messages/send", sendMailMessageHandler);
mailRouter.post("/messages/:messageId/read", updateMailMessageReadHandler);
mailRouter.post("/messages/:messageId/star", updateMailMessageStarHandler);
mailRouter.post("/messages/:messageId/move", moveMailMessageHandler);
