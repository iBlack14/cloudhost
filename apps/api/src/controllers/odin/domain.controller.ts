import type { Request, Response } from "express";
import { z } from "zod";
import { listUserDomains, addDomain, deleteDomain, listAllDomains } from "../../services/odin/domain.service.js";

const addDomainSchema = z.object({
  domainName: z.string().min(3)
});

export const listAllDomainsHandler = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const domains = await listAllDomains();
    return res.status(200).json({ success: true, data: domains });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "Error al listar todos los dominios" } });
  }
};

const getUserId = async (req: Request) => {
  let userId = req.headers["x-user-id"] as string;
  if (!userId) {
    const { db } = await import("../../config/db.js");
    const userRes = await db.query("SELECT id FROM users LIMIT 1");
    userId = userRes.rowCount > 0 ? userRes.rows[0].id : "00000000-0000-0000-0000-000000000000";
  }
  return userId;
};

export const listDomainsHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    const domains = await listUserDomains(userId);
    return res.status(200).json({ success: true, data: domains });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "Error al listar dominios" } });
  }
};

export const addDomainHandler = async (req: Request, res: Response): Promise<Response> => {
  const parsed = addDomainSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ success: false, error: parsed.error.flatten() });
  }
  try {
    const userId = await getUserId(req);
    const domain = await addDomain(userId, parsed.data.domainName);
    return res.status(201).json({ success: true, data: domain });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "Error al añadir dominio" } });
  }
};

export const deleteDomainHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    await deleteDomain(userId, req.params.id);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "Error al eliminar dominio" } });
  }
};
