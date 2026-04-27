import type { Request, Response } from "express";
import { z } from "zod";
import { getUserId } from "../../utils/get-user-id.js";
import * as pythonService from "../../services/odin/python.service.js";

export const listPythonAppsHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    const apps = await pythonService.getAppsQuery(userId);
    return res.status(200).json({ success: true, data: apps });
  } catch {
    return res.status(500).json({ success: false, error: { message: "Error al listar las aplicaciones Python" } });
  }
};

export const createPythonAppHandler = async (req: Request, res: Response): Promise<Response> => {
  const schema = z.object({
    name: z.string().min(1),
    version: z.string().min(1),
    path: z.string().min(1),
    entrypoint: z.string().min(1),
    domain: z.string().min(1),
    port: z.number().int().min(1024).max(65535)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ success: false, error: parsed.error.flatten() });
  }

  try {
    const userId = await getUserId(req);
    const app = await pythonService.createAppQuery(userId, parsed.data);
    return res.status(201).json({ success: true, data: app });
  } catch {
    return res.status(500).json({ success: false, error: { message: "Error al registrar la aplicación Python." } });
  }
};

export const managePythonAppHandler = async (req: Request, res: Response): Promise<Response> => {
  const schema = z.object({ action: z.enum(["start", "stop", "restart"]) });
  const parsed = schema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(422).json({ success: false, error: parsed.error.flatten() });
  }

  try {
    const userId = await getUserId(req);
    await pythonService.manageAppQuery(userId, req.params.id as string, parsed.data.action);
    return res.status(200).json({ success: true, message: `Successfully executed: pm2 ${parsed.data.action}` });
  } catch {
    return res.status(500).json({ success: false, error: { message: "Error en el comando PM2 para Python" } });
  }
};

export const deletePythonAppHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    await pythonService.deleteAppQuery(userId, req.params.id as string);
    return res.status(200).json({ success: true, message: "Aplicación Python removida." });
  } catch {
    return res.status(500).json({ success: false, error: { message: "Error al eliminar la app Python" } });
  }
};

export const getPythonAppLogsHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    const logs = await pythonService.getAppLogs(userId, req.params.id as string);
    return res.status(200).json({ success: true, data: logs });
  } catch {
    return res.status(500).json({ success: false, error: { message: "No se pudieron obtener los logs de Python" } });
  }
};

export const updatePythonAppEnvHandler = async (req: Request, res: Response): Promise<Response> => {
  const schema = z.object({ envs: z.record(z.string()) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ success: false, error: parsed.error.flatten() });
  }

  try {
    const userId = await getUserId(req);
    await pythonService.updateAppEnv(userId, req.params.id as string, parsed.data.envs);
    return res.status(200).json({ success: true, message: "Variables de entorno de Python actualizadas. Requiere reinicio." });
  } catch {
    return res.status(500).json({ success: false, error: { message: "Failed updating Python envs" } });
  }
};

