import type { Request, Response } from "express";
import { z } from "zod";
import { installWordPress, listUserWpSites, getWpSiteById } from "../../services/odin/wordpress.service.js";
import { getUserId } from "../../utils/get-user-id.js";

const installWpSchema = z.object({
  domain: z.string().min(3),
  directory: z.string().optional(),
  siteTitle: z.string().min(1),
  adminUser: z.string().min(3),
  adminPass: z.string().min(3)
});

const siteIdParamSchema = z.object({
  id: z.string().uuid()
});

export const installWpHandler = async (req: Request, res: Response): Promise<Response> => {
  const parsed = installWpSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(422).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Datos de instalación inválidos",
        details: parsed.error.flatten()
      }
    });
  }

  try {
    // FIX: Usar utility en vez de fallback inválido
    const userId = await getUserId(req);
    
    const result = await installWordPress({
      ...parsed.data,
      userId
    });

    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "No se pudo iniciar la instalación" }
    });
  }
};

export const listWpSitesHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    // FIX: Usar utility en vez de fallback inválido
    const userId = await getUserId(req);
    const sites = await listUserWpSites(userId);
    return res.status(200).json({ success: true, data: sites });
  } catch (error) {
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
    // FIX: Usar utility en vez de fallback inválido
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
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "No se pudo obtener el sitio" }
    });
  }
};
