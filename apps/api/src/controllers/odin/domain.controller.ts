import type { Request, Response } from "express";
import { z } from "zod";
import { listUserDomains, addDomain, deleteDomain, listAllDomains, verifyUserDomain } from "../../services/odin/domain.service.js";
import { getUserId } from "../../utils/get-user-id.js";

const addDomainSchema = z.object({
  domainName: z
    .string()
    .min(3, "Ingresa un dominio válido")
    .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, "Formato de dominio inválido (ej: ejemplo.com)")
});

const deleteDomainParamSchema = z.object({
  id: z.string().uuid()
});

export const listAllDomainsHandler = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const domains = await listAllDomains();
    return res.status(200).json({ success: true, data: domains });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "Error al listar todos los dominios" } });
  }
};

export const listDomainsHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    const domains = await listUserDomains(userId);
    return res.status(200).json({ success: true, data: domains });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return res.status(401).json({
        success: false,
        error: { code: "AUTH_REQUIRED", message: "Autenticación requerida" }
      });
    }

    return res.status(500).json({ success: false, error: { message: "Error al listar dominios" } });
  }
};

export const addDomainHandler = async (req: Request, res: Response): Promise<Response> => {
  const parsed = addDomainSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Dominio inválido"
      }
    });
  }
  try {
    const userId = await getUserId(req);
    const domain = await addDomain(userId, parsed.data.domainName);
    return res.status(201).json({ success: true, data: domain });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return res.status(401).json({
        success: false,
        error: { code: "AUTH_REQUIRED", message: "Autenticación requerida" }
      });
    }

    return res.status(500).json({ success: false, error: { message: "Error al añadir dominio" } });
  }
};

export const verifyDomainHandler = async (req: Request, res: Response): Promise<Response> => {
  const parsedParams = deleteDomainParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "ID de dominio inválido" }
    });
  }

  try {
    const userId = await getUserId(req);
    const domain = await verifyUserDomain(userId, parsedParams.data.id);

    if (!domain) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Dominio no encontrado" }
      });
    }

    return res.status(200).json({ success: true, data: domain });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return res.status(401).json({
        success: false,
        error: { code: "AUTH_REQUIRED", message: "Autenticación requerida" }
      });
    }

    return res.status(500).json({ success: false, error: { message: "No se pudo verificar el dominio" } });
  }
};

export const deleteDomainHandler = async (req: Request, res: Response): Promise<Response> => {
  const parsedParams = deleteDomainParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "ID de dominio inválido" }
    });
  }

  try {
    const userId = await getUserId(req);
    await deleteDomain(userId, parsedParams.data.id);
    return res.status(200).json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return res.status(401).json({
        success: false,
        error: { code: "AUTH_REQUIRED", message: "Autenticación requerida" }
      });
    }

    return res.status(500).json({ success: false, error: { message: "Error al eliminar dominio" } });
  }
};
