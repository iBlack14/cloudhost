import type { Request, Response } from "express";
import { z } from "zod";

import type { MailFolder } from "@odisea/types";

import {
  exchangeMailSsoToken,
  getMailIdentity,
  getMailMessage,
  listMailFolders,
  listMailMessages,
  loginMailAccount,
  moveMailMessage,
  sendMailMessage,
  updateMailMessageRead,
  updateMailMessageStar
} from "../services/mail.service.js";
import { verifyAuthToken, type MailSessionTokenPayload } from "../utils/jwt.js";

const loginSchema = z.object({
  address: z.string().email("Ingresa un correo válido"),
  password: z.string().min(1, "Ingresa tu contraseña")
});

const ssoExchangeSchema = z.object({
  token: z.string().min(1, "Token requerido")
});

const folderSchema = z.enum(["INBOX", "SENT", "TRASH", "STARRED"]).default("INBOX");

const sendSchema = z.object({
  to: z.array(z.string().email()).min(1, "Ingresa al menos un destinatario"),
  subject: z.string().min(1, "Ingresa un asunto"),
  body: z.string().min(1, "Ingresa el contenido del mensaje")
});

const readSchema = z.object({
  read: z.boolean()
});

const starSchema = z.object({
  starred: z.boolean()
});

const moveSchema = z.object({
  folder: z.enum(["INBOX", "SENT", "TRASH"])
});

const getMailSession = (req: Request): MailSessionTokenPayload => {
  if (!req.auth || req.auth.tokenType !== "mail_session") {
    throw new Error("MAIL_AUTH_REQUIRED");
  }

  return req.auth;
};

export const loginMailHandler = async (req: Request, res: Response): Promise<Response> => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Payload inválido" }
    });
  }

  try {
    const data = await loginMailAccount(parsed.data.address, parsed.data.password);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && error.message === "MAIL_AUTH_FAILED") {
      return res.status(401).json({
        success: false,
        error: { code: "MAIL_AUTH_FAILED", message: "Correo o contraseña incorrectos" }
      });
    }

    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "No se pudo iniciar sesión en webmail" }
    });
  }
};

export const exchangeMailSsoHandler = async (req: Request, res: Response): Promise<Response> => {
  const parsed = ssoExchangeSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Token SSO inválido" }
    });
  }

  try {
    const payload = verifyAuthToken(parsed.data.token);

    if (payload.tokenType !== "mail_sso") {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_TOKEN_TYPE", message: "Se requiere un token SSO de mail" }
      });
    }

    const data = await exchangeMailSsoToken(payload);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && (error.message === "MAIL_SSO_INVALID" || error.message === "MAILBOX_NOT_FOUND")) {
      return res.status(401).json({
        success: false,
        error: { code: "MAIL_SSO_INVALID", message: "Token SSO inválido, expirado o ya consumido" }
      });
    }

    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "No se pudo abrir la sesión SSO" }
    });
  }
};

export const logoutMailHandler = async (_req: Request, res: Response): Promise<Response> => {
  return res.status(200).json({ success: true, data: { success: true } });
};

export const getMailMeHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const data = await getMailIdentity(getMailSession(req));
    return res.status(200).json({ success: true, data });
  } catch {
    return res.status(401).json({
      success: false,
      error: { code: "MAIL_AUTH_REQUIRED", message: "Sesión de mail requerida" }
    });
  }
};

export const listMailFoldersHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const data = await listMailFolders(getMailSession(req));
    return res.status(200).json({ success: true, data });
  } catch {
    return res.status(401).json({
      success: false,
      error: { code: "MAIL_AUTH_REQUIRED", message: "Sesión de mail requerida" }
    });
  }
};

export const listMailMessagesHandler = async (req: Request, res: Response): Promise<Response> => {
  const parsedFolder = folderSchema.safeParse(req.query.folder);

  if (!parsedFolder.success) {
    return res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Folder inválido" }
    });
  }

  try {
    const data = await listMailMessages(getMailSession(req), parsedFolder.data as MailFolder);
    return res.status(200).json({ success: true, data });
  } catch {
    return res.status(401).json({
      success: false,
      error: { code: "MAIL_AUTH_REQUIRED", message: "Sesión de mail requerida" }
    });
  }
};

export const getMailMessageHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const data = await getMailMessage(getMailSession(req), String(req.params.messageId));
    return res.status(200).json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && error.message === "MAIL_MESSAGE_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        error: { code: "MAIL_MESSAGE_NOT_FOUND", message: "Mensaje no encontrado" }
      });
    }

    return res.status(401).json({
      success: false,
      error: { code: "MAIL_AUTH_REQUIRED", message: "Sesión de mail requerida" }
    });
  }
};

export const sendMailMessageHandler = async (req: Request, res: Response): Promise<Response> => {
  const parsed = sendSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Payload inválido" }
    });
  }

  try {
    await sendMailMessage(getMailSession(req), parsed.data);
    return res.status(200).json({ success: true, data: { success: true } });
  } catch {
    return res.status(401).json({
      success: false,
      error: { code: "MAIL_AUTH_REQUIRED", message: "Sesión de mail requerida" }
    });
  }
};

export const updateMailMessageReadHandler = async (req: Request, res: Response): Promise<Response> => {
  const parsed = readSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Payload inválido" }
    });
  }

  await updateMailMessageRead(getMailSession(req), String(req.params.messageId), parsed.data.read);
  return res.status(200).json({ success: true, data: { success: true } });
};

export const updateMailMessageStarHandler = async (req: Request, res: Response): Promise<Response> => {
  const parsed = starSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Payload inválido" }
    });
  }

  await updateMailMessageStar(getMailSession(req), String(req.params.messageId), parsed.data.starred);
  return res.status(200).json({ success: true, data: { success: true } });
};

export const moveMailMessageHandler = async (req: Request, res: Response): Promise<Response> => {
  const parsed = moveSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Payload inválido" }
    });
  }

  await moveMailMessage(getMailSession(req), String(req.params.messageId), parsed.data.folder);
  return res.status(200).json({ success: true, data: { success: true } });
};
