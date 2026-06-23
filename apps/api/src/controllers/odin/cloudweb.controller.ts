import type { Request, Response } from "express";
import { getUserId } from "../../utils/get-user-id.js";
import * as cloudwebService from "../../services/odin/cloudweb.service.js";
import { z } from "zod";

const getErrorMessage = (error: unknown, fallback: string): string => {
   if (error instanceof Error && error.message) {
      if (error.message === "DISK_LIMIT_EXCEEDED") {
         return "Requieres más espacio. Has alcanzado el límite de almacenamiento de tu plan; por favor, comunícate con soporte técnico.";
      }
      return error.message;
   }
   return fallback;
};

const getErrorStatus = (error: unknown): number => {
   if (error instanceof Error && error.message === "DISK_LIMIT_EXCEEDED") {
      return 413; // Payload Too Large / Out of Disk Space
   }
   return 500;
};

export const listAppsHandler = async (req: Request, res: Response): Promise<Response> => {
   try {
      const userId = await getUserId(req);
      const apps = await cloudwebService.listApps(userId);
      return res.status(200).json({ success: true, data: apps });
   } catch (error) {
      return res.status(500).json({ 
         success: false, 
         error: { message: getErrorMessage(error, "Error al listar las aplicaciones Cloud Web") } 
      });
   }
};

export const deployAppHandler = async (req: Request, res: Response): Promise<Response> => {
   const schema = z.object({
      name: z.string(),
      githubRepo: z.string(),
      githubBranch: z.string().optional(),
      domain: z.string(),
      port: z.number().int().min(80).max(65535),
      buildType: z.enum(["nixpacks", "dockerfile", "railpack", "heroku buildpacks", "paketo buildpacks", "static"]).default("nixpacks"),
      envVars: z.record(z.string()).optional()
   });

   const parsed = schema.safeParse(req.body);
   if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });

   try {
      const userId = await getUserId(req);
      const app = await cloudwebService.deployApp(userId, parsed.data);
      return res.status(201).json({ success: true, data: app });
   } catch (error) {
      const status = getErrorStatus(error);
      const msg = getErrorMessage(error, "Error al desplegar la aplicación.");
      return res.status(status).json({ 
         success: false, 
         error: { 
            message: msg,
            code: error instanceof Error ? error.message : "DEPLOY_FAILED"
         } 
      });
   }
};

export const deleteAppHandler = async (req: Request, res: Response): Promise<Response> => {
   try {
      const userId = await getUserId(req);
      await cloudwebService.deleteApp(userId, req.params.id as string);
      return res.status(200).json({ success: true, message: "Aplicación Cloud Web eliminada correctamente." });
   } catch (error) {
      return res.status(500).json({ 
         success: false, 
         error: { message: getErrorMessage(error, "Error al eliminar la aplicación.") } 
      });
   }
};

export const manageAppHandler = async (req: Request, res: Response): Promise<Response> => {
   const schema = z.object({ action: z.enum(["start", "stop", "restart"]) });
   const parsed = schema.safeParse(req.params);
   if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });

   try {
      const userId = await getUserId(req);
      await cloudwebService.manageApp(userId, req.params.id as string, parsed.data.action);
      return res.status(200).json({ success: true, message: `Comando Docker ${parsed.data.action} ejecutado.` });
   } catch (error) {
      return res.status(500).json({ 
         success: false, 
         error: { message: getErrorMessage(error, "Error al cambiar el estado del contenedor Docker.") } 
      });
   }
};

export const getAppLogsHandler = async (req: Request, res: Response): Promise<Response> => {
   try {
      const userId = await getUserId(req);
      const logs = await cloudwebService.getAppLogs(userId, req.params.id as string);
      return res.status(200).json({ success: true, data: logs });
   } catch (error) {
      return res.status(500).json({ 
         success: false, 
         error: { message: getErrorMessage(error, "Error al obtener los logs de Docker.") } 
      });
   }
};

export const updateAppEnvHandler = async (req: Request, res: Response): Promise<Response> => {
   const schema = z.object({ envs: z.record(z.string()) });
   const parsed = schema.safeParse(req.body);
   if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });

   try {
      const userId = await getUserId(req);
      await cloudwebService.updateAppEnv(userId, req.params.id as string, parsed.data.envs);
      return res.status(200).json({ success: true, message: "Variables de entorno actualizadas. El contenedor ha sido reiniciado." });
   } catch (error) {
      return res.status(500).json({ 
         success: false, 
         error: { message: getErrorMessage(error, "Error al actualizar las variables de entorno.") } 
      });
   }
};
