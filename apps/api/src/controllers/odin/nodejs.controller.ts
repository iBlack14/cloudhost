import type { Request, Response } from "express";
import { getUserId } from "../../utils/get-user-id.js";
import * as nodejsService from "../../services/odin/nodejs.service.js";
import { z } from "zod";

export const listAppsHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    const apps = await nodejsService.getAppsQuery(userId);
    return res.status(200).json({ success: true, data: apps });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "Error al listar las aplicaciones Node.js" } });
  }
};

export const createAppHandler = async (req: Request, res: Response): Promise<Response> => {
  const schema = z.object({
     name: z.string(),
     version: z.string(),
     path: z.string(),
     script: z.string(),
     domain: z.string(),
     port: z.number().int().min(1024).max(65535)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });

  try {
    const userId = await getUserId(req);
    const app = await nodejsService.createAppQuery(userId, parsed.data);
    return res.status(201).json({ success: true, data: app });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "Error al registrar la aplicación." } });
  }
};

export const deleteAppHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    await nodejsService.deleteAppQuery(userId, req.params.id as string);
    return res.status(200).json({ success: true, message: "Aplicación y proceso PM2 removidos." });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "Error al eliminar app" } });
  }
};

export const manageAppHandler = async (req: Request, res: Response): Promise<Response> => {
  const schema = z.object({ action: z.enum(["start", "stop", "restart"]) });
  const parsed = schema.safeParse(req.params);
  if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });

  try {
    const userId = await getUserId(req);
    await nodejsService.manageAppQuery(userId, req.params.id as string, parsed.data.action);
    return res.status(200).json({ success: true, message: `Successfully executed: pm2 ${parsed.data.action}` });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "Error en el comando PM2" } });
  }
};

export const getAppLogsHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    const logs = await nodejsService.getAppLogs(userId, req.params.id as string);
    return res.status(200).json({ success: true, data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "No se pudieron obtener los logs de PM2" } });
  }
};

export const updateAppEnvHandler = async (req: Request, res: Response): Promise<Response> => {
   const schema = z.object({ envs: z.record(z.string()) });
   const parsed = schema.safeParse(req.body);
   if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });

   try {
     const userId = await getUserId(req);
     await nodejsService.updateAppEnv(userId, req.params.id as string, parsed.data.envs);
     return res.status(200).json({ success: true, message: "Variables de Entorno actualizadas. Requiere reinicio." });
   } catch {
     return res.status(500).json({ success: false, error: { message: "Failed updating envs" } });
   }
};

export const runNpmInstallHandler = async (req: Request, res: Response): Promise<Response> => {
   try {
      const userId = await getUserId(req);
      const msg = await nodejsService.runNpmInstall(userId, req.params.id as string);
      return res.status(200).json({ success: true, message: msg });
   } catch {
      return res.status(500).json({ success: false, error: { message: "Fallo ejecución npm install" }});
   }
}
