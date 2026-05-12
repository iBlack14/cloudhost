import { Request, Response } from "express";
import { db } from "../config/db.js";
import { whmCreateAccountSchema } from "@odisea/types";
import { createWhmAccount as createWhmAccountService } from "../services/whm/account.service.js";

/**
 * Publicly list hosting plans for the Billing platform.
 * Includes pricing and features.
 */
export const listPublicPlansHandler = async (_req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT 
        id, name, disk_quota_mb, bandwidth_mb, 
        price_usd, price_pen, description, features, type, is_popular
      FROM plans 
      ORDER BY price_usd ASC
    `);

    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error("[public:plans:error]", error);
    res.status(500).json({
      success: false,
      error: { code: "FETCH_ERROR", message: "No se pudieron obtener los planes" }
    });
  }
};

/**
 * Public registration for Hosting accounts from the Billing platform.
 * Protected by API KEY.
 */
export const registerHostingHandler = async (req: Request, res: Response) => {
  const apiKey = req.headers["x-api-key"];
  
  if (apiKey !== process.env.ODISEA_API_KEY) {
    return res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Clave de API inválida" }
    });
  }

  const parsed = whmCreateAccountSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(422).json({
      success: false,
      error: { 
        code: "VALIDATION_ERROR", 
        message: "Datos de registro inválidos", 
        details: parsed.error.flatten() 
      }
    });
  }

  try {
    const data = await createWhmAccountService(parsed.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    console.error("[public:register:error]", error);
    return res.status(500).json({
      success: false,
      error: { code: "PROVISION_ERROR", message: "No se pudo aprovisionar el servicio" }
    });
  }
};
