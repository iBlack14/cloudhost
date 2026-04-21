import type { Request, Response } from "express";
import * as dbService from "../../services/whm/database.service.js";
import { issueDatabaseSsoLink } from "../../services/database-sso.service.js";
import { z } from "zod";

export const listAllDatabasesHandler = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const dbs = await dbService.listAllDatabases();
    return res.status(200).json({ success: true, data: dbs });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "Error fetcing global databases" }});
  }
};

export const repairDatabaseHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    await dbService.repairDatabase(req.params.dbName as string);
    return res.status(200).json({ success: true, message: "Database repaired successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "Error repairing database" }});
  }
};

export const optimizeDatabaseHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    await dbService.optimizeDatabase(req.params.dbName as string);
    return res.status(200).json({ success: true, message: "Database optimized successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "Error optimizing database" }});
  }
};

export const generateDbSsoHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const protocol = req.get("x-forwarded-proto") ?? req.protocol;
    const host = req.get("host");
    const publicBaseUrl = `${protocol}://${host}${req.baseUrl.replace(/\/whm$/, "")}`;
    const data = await issueDatabaseSsoLink({
      dbName: req.params.dbName as string,
      publicBaseUrl
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error starting SSO session";
    return res.status(400).json({ success: false, error: { message }});
  }
};

export const resetPasswordHandler = async (req: Request, res: Response): Promise<Response> => {
  const schema = z.object({ newPassword: z.string().min(8) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });

  try {
    await dbService.resetDbUserPassword(req.params.dbUser as string, parsed.data.newPassword);
    return res.status(200).json({ success: true, message: "Database user password reset" });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "Error resetting db user password" }});
  }
};
