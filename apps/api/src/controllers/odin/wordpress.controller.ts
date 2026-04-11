import type { Request, Response } from "express";
import { z } from "zod";
import { installWordPress, listUserWpSites } from "../../services/odin/wordpress.service.js";

const installWpSchema = z.object({
  domain: z.string().min(3),
  directory: z.string().optional(),
  siteTitle: z.string().min(1),
  adminUser: z.string().min(3),
  adminPass: z.string().min(3)
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
    // In dev mode, if no user is provided, we fetch the first one from the DB
    let userId = req.headers["x-user-id"] as string;
    
    if (!userId) {
      const { db } = await import("../../config/db.js");
      const userRes = await db.query("SELECT id FROM users LIMIT 1");
      if (userRes.rowCount > 0) {
        userId = userRes.rows[0].id;
      } else {
        // Fallback to a random UUID if no users exist (will still fail FK, but handled)
        userId = "00000000-0000-0000-0000-000000000000";
      }
    }
    
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
    let userId = req.headers["x-user-id"] as string;
    
    if (!userId) {
      const { db } = await import("../../config/db.js");
      const userRes = await db.query("SELECT id FROM users LIMIT 1");
      userId = userRes.rowCount > 0 ? userRes.rows[0].id : "00000000-0000-0000-0000-000000000000";
    }

    const sites = await listUserWpSites(userId);
    return res.status(200).json({ success: true, data: sites });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "No se pudieron listar los sitios" }
    });
  }
};
