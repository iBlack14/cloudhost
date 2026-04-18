import type { Request, Response } from "express";
import * as migrationService from "../../services/whm/migration.service.js";
import { z } from "zod";

export const exportAccountHandler = async (req: Request, res: Response): Promise<Response> => {
   const schema = z.object({ username: z.string() });
   const parsed = schema.safeParse(req.params);
   if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });

   try {
     const path = await migrationService.exportAccount(parsed.data.username);
     return res.status(200).json({ success: true, data: { downloadUrl: `/api/v1/whm/migrations/download?path=${encodeURIComponent(path)}` } });
   } catch (error) {
     return res.status(500).json({ success: false, error: { message: "Error al exportar la cuenta completa" }});
   }
};

export const downloadMigrationHandler = async (req: Request, res: Response): Promise<void> => {
   const filePath = req.query.path as string;
   if (!filePath || !filePath.includes("/odisea_backups/")) {
      res.status(403).json({ success: false, error: { message: "Ruta prohibida." }});
      return;
   }
   res.download(filePath);
};

export const importAccountHandler = async (req: Request, res: Response): Promise<Response> => {
   try {
     // A Multer hook could place the file on disk temporarily. Let's assume it did via req.file.
     if (!req.file) throw new Error("No backup archive sent.");
     await migrationService.importAccount(req.file.path);
     return res.status(200).json({ success: true, message: "Cuenta importada correctamente al sistema." });
   } catch (error) {
     return res.status(500).json({ success: false, error: { message: "Error procesando el .tar.gz de cPanel/Odin" }});
   }
};

export const sshMigrateHandler = async (req: Request, res: Response): Promise<Response> => {
   try {
     const { host, pass, user } = req.body;
     await migrationService.migrateViaSsh(host, pass, user);
     return res.status(200).json({ success: true });
   } catch (error) {
     return res.status(500).json({ success: false, error: { message: error instanceof Error ? error.message : "SSH Migration failed." }});
   }
};
