import type { Request, Response } from "express";
import { getUserId } from "../../utils/get-user-id.js";
import * as nodejsService from "../../services/odin/nodejs.service.js";
import { z } from "zod";

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

export const listAppsHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    const apps = await nodejsService.getAppsQuery(userId);
    return res.status(200).json({ success: true, data: apps });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: getErrorMessage(error, "Error al listar las aplicaciones Node.js") } });
  }
};

export const createAppHandler = async (req: Request, res: Response): Promise<Response> => {
  const schema = z.object({
     name: z.string().min(1),
     version: z.string(),
     path: z.string(),
     script: z.string(),
     domain: z.string().min(1),
     port: z.number().int().min(1024).max(65535),
     githubRepo:   z.string().optional(),
     githubBranch: z.string().optional(),
     installCmd:   z.string().optional(),
     buildCmd:     z.string().optional(),
     startCmd:     z.string().optional(),
     linkedDomain: z.string().optional(),
     envVars: z.record(z.string()).optional(),
     autoStart: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });

  try {
    const userId = await getUserId(req);
    const app = await nodejsService.createAppQuery(userId, parsed.data);
    return res.status(201).json({ success: true, data: app });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: getErrorMessage(error, "Error al registrar la aplicación.") } });
  }
};

export const deleteAppHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    await nodejsService.deleteAppQuery(userId, req.params.id as string);
    return res.status(200).json({ success: true, message: "Aplicación y proceso PM2 removidos." });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: getErrorMessage(error, "Error al eliminar app") } });
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
    return res.status(500).json({ success: false, error: { message: getErrorMessage(error, "Error en el comando PM2") } });
  }
};

export const getAppLogsHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    const logs = await nodejsService.getAppLogs(userId, req.params.id as string);
    return res.status(200).json({ success: true, data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: getErrorMessage(error, "No se pudieron obtener los logs de PM2") } });
  }
};

export const updateAppEnvHandler = async (req: Request, res: Response): Promise<Response> => {
   const schema = z.object({
      envs: z.record(z.string()),
      restart: z.boolean().optional()
   });
   const parsed = schema.safeParse(req.body);
   if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });

   try {
     const userId = await getUserId(req);
     await nodejsService.updateAppEnv(userId, req.params.id as string, parsed.data.envs, parsed.data.restart ?? true);
     return res.status(200).json({
        success: true,
        message: parsed.data.restart === false
          ? "Variables de entorno actualizadas."
          : "Variables de entorno actualizadas y aplicación reiniciada."
     });
   } catch (error) {
     return res.status(500).json({ success: false, error: { message: getErrorMessage(error, "Failed updating envs") } });
   }
};

export const runNpmInstallHandler = async (req: Request, res: Response): Promise<Response> => {
   try {
      const userId = await getUserId(req);
      const result = await nodejsService.runNpmInstall(userId, req.params.id as string);
      return res.status(200).json({ success: true, message: result.message, data: { output: result.output } });
   } catch (error) {
      return res.status(500).json({ success: false, error: { message: getErrorMessage(error, "Fallo ejecución npm install") }});
   }
};

export const getPackageScriptsHandler = async (req: Request, res: Response): Promise<Response> => {
   try {
      const userId = await getUserId(req);
      const data = await nodejsService.getPackageScripts(userId, req.params.id as string);
      return res.status(200).json({ success: true, data });
   } catch (error) {
      return res.status(500).json({ success: false, error: { message: getErrorMessage(error, "No se pudieron leer los scripts") } });
   }
};

export const runPackageScriptHandler = async (req: Request, res: Response): Promise<Response> => {
   const schema = z.object({ script: z.string().min(1) });
   const parsed = schema.safeParse(req.body);
   if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });

   try {
      const userId = await getUserId(req);
      const result = await nodejsService.runPackageScript(userId, req.params.id as string, parsed.data.script);
      return res.status(200).json({ success: true, message: result.message, data: { output: result.output } });
   } catch (error) {
      return res.status(500).json({ success: false, error: { message: getErrorMessage(error, "Fallo al ejecutar el script") } });
   }
};

export const redeployAppHandler = async (req: Request, res: Response): Promise<Response> => {
   try {
      const userId = await getUserId(req);
      const result = await nodejsService.redeployApp(userId, req.params.id as string);
      return res.status(200).json({ success: true, message: result.message, data: { logs: result.logs } });
   } catch (error) {
      return res.status(500).json({ success: false, error: { message: getErrorMessage(error, "Fallo en el redeploy") } });
   }
};
