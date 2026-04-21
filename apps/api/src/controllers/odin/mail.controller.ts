import type { Request, Response } from "express";
import { z } from "zod";

import {
  createMailAccountForUser,
  getMailAccountForUser,
  issueMailSsoLinkForUser,
  listMailAccountsForUser
} from "../../services/mail.service.js";
import { getUserId } from "../../utils/get-user-id.js";

const createMailAccountSchema = z.object({
  domain: z.string().min(1, "Selecciona un dominio"),
  username: z
    .string()
    .min(1, "Ingresa un nombre de usuario")
    .regex(/^[a-z0-9._-]+$/i, "Usa solo letras, números, puntos, guiones o guiones bajos."),
  password: z.string().min(10, "La contraseña debe tener al menos 10 caracteres."),
  quotaMb: z.number().int().positive().nullable(),
  sendLoginLink: z.boolean().optional(),
  alternateEmail: z.string().email("Ingresa un email alterno válido.").or(z.literal("")),
  stayOnPage: z.boolean().optional()
});

const mailboxParamSchema = z.object({
  accountId: z.string().uuid("ID de buzón inválido")
});

export const listMailAccountsHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    const data = await listMailAccountsForUser(userId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return res.status(401).json({
        success: false,
        error: { code: "AUTH_REQUIRED", message: "Autenticación requerida" }
      });
    }

    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "No se pudieron listar los buzones" }
    });
  }
};

export const getMailAccountHandler = async (req: Request, res: Response): Promise<Response> => {
  const parsed = mailboxParamSchema.safeParse(req.params);

  if (!parsed.success) {
    return res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "ID de buzón inválido" }
    });
  }

  try {
    const userId = await getUserId(req);
    const data = await getMailAccountForUser(userId, parsed.data.accountId);

    if (!data) {
      return res.status(404).json({
        success: false,
        error: { code: "MAILBOX_NOT_FOUND", message: "Buzón no encontrado" }
      });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return res.status(401).json({
        success: false,
        error: { code: "AUTH_REQUIRED", message: "Autenticación requerida" }
      });
    }

    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "No se pudo obtener el buzón" }
    });
  }
};

export const createMailAccountHandler = async (req: Request, res: Response): Promise<Response> => {
  const parsed = createMailAccountSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Payload inválido" }
    });
  }

  try {
    const userId = await getUserId(req);
    const data = await createMailAccountForUser(userId, {
      domain: parsed.data.domain,
      username: parsed.data.username,
      password: parsed.data.password,
      quotaMb: parsed.data.quotaMb,
      alternateEmail: parsed.data.alternateEmail
    });

    return res.status(201).json({
      success: true,
      data: {
        created: data,
        result: {
          success: true,
          message: `Cuenta ${data.address} aprovisionada correctamente.`
        }
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return res.status(401).json({
        success: false,
        error: { code: "AUTH_REQUIRED", message: "Autenticación requerida" }
      });
    }

    if (error instanceof Error && error.message === "DOMAIN_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        error: { code: "DOMAIN_NOT_FOUND", message: "El dominio seleccionado no pertenece a esta cuenta" }
      });
    }

    const dbError = error as { code?: string };
    if (dbError.code === "23505") {
      return res.status(409).json({
        success: false,
        error: { code: "RESOURCE_CONFLICT", message: "La cuenta de correo ya existe en este dominio" }
      });
    }

    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "No se pudo crear la cuenta de correo" }
    });
  }
};

export const issueMailSsoHandler = async (req: Request, res: Response): Promise<Response> => {
  const parsed = mailboxParamSchema.safeParse(req.params);

  if (!parsed.success) {
    return res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "ID de buzón inválido" }
    });
  }

  try {
    const userId = await getUserId(req);
    const data = await issueMailSsoLinkForUser(userId, parsed.data.accountId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return res.status(401).json({
        success: false,
        error: { code: "AUTH_REQUIRED", message: "Autenticación requerida" }
      });
    }

    if (error instanceof Error && error.message === "MAILBOX_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        error: { code: "MAILBOX_NOT_FOUND", message: "Buzón no encontrado" }
      });
    }

    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "No se pudo generar el acceso directo al webmail" }
    });
  }
};
