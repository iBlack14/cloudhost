import type { Request, Response } from "express";
import { z } from "zod";
import { installWordPress, listUserWpSites, getWpSiteById, deleteWordPress } from "../../services/odin/wordpress.service.js";
import { getUserId } from "../../utils/get-user-id.js";

import { installWpSchema } from "@odisea/types";
const siteIdParamSchema = z.object({
  id: z.string().uuid()
});

export const installWpHandler = async (req: Request, res: Response): Promise<Response> => {
  const parsed = installWpSchema.safeParse(req.body);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return res.status(422).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: firstIssue?.message ?? "Datos de instalación inválidos",
        details: parsed.error.flatten()
      }
    });
  }

  try {
    const userId = await getUserId(req);
    
    const result = await installWordPress({
      ...parsed.data,
      userId
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error("[odin:wordpress:install:error]", error);

    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return res.status(401).json({
        success: false,
        error: { code: "AUTH_REQUIRED", message: "Autenticación requerida" }
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message:
          error instanceof Error && error.message
            ? `No se pudo iniciar la instalación: ${error.message}`
            : "No se pudo iniciar la instalación"
      }
    });
  }
};

export const listWpSitesHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    const sites = await listUserWpSites(userId);
    return res.status(200).json({ success: true, data: sites });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return res.status(401).json({
        success: false,
        error: { code: "AUTH_REQUIRED", message: "Autenticación requerida" }
      });
    }

    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "No se pudieron listar los sitios" }
    });
  }
};

export const getWpSiteByIdHandler = async (req: Request, res: Response): Promise<Response> => {
  const parsedParams = siteIdParamSchema.safeParse(req.params);
  
  if (!parsedParams.success) {
    return res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "ID de sitio inválido" }
    });
  }

  try {
    const userId = await getUserId(req);
    const site = await getWpSiteById(parsedParams.data.id, userId);
    
    if (!site) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Sitio no encontrado" }
      });
    }

    return res.status(200).json({ success: true, data: site });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return res.status(401).json({
        success: false,
        error: { code: "AUTH_REQUIRED", message: "Autenticación requerida" }
      });
    }

    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "No se pudo obtener el sitio" }
    });
  }
};

export const deleteWpSiteHandler = async (req: Request, res: Response): Promise<Response> => {
  const parsedParams = siteIdParamSchema.safeParse(req.params);
  
  if (!parsedParams.success) {
    return res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "ID de sitio inválido" }
    });
  }

  try {
    const userId = await getUserId(req);
    await deleteWordPress(parsedParams.data.id, userId);
    return res.status(200).json({ success: true, message: "Sitio eliminado correctamente" });
  } catch (error) {
    if (error instanceof Error && error.message === "Sitio no encontrado") {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Sitio no encontrado" }
      });
    }
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "No se pudo eliminar el sitio" }
    });
  }
};


export const generateSsoUrlHandler = async (req: Request, res: Response): Promise<Response> => {
  const parsedParams = siteIdParamSchema.safeParse(req.params);
  if (!parsedParams.success) return res.status(400).json({ success: false, error: { message: "ID no válido" } });

  try {
    const userId = await getUserId(req);
    const { generateSsoUrl } = await import("../../services/odin/wordpress.service.js");
    const ssoUrl = await generateSsoUrl(parsedParams.data.id, userId);
    
    return res.status(200).json({ success: true, data: { url: ssoUrl } });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: error instanceof Error ? error.message : "Error al generar SSO" } });
  }
};
