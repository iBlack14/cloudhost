import type { Request, Response } from "express";
import { z } from "zod";
import * as fileService from "../../services/odin/file.service.js";
import { getUserId } from "../../utils/get-user-id.js";
import { db } from "../../config/db.js";
import path from "node:path";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";

// We require multer for file uploads if needed, but for simplicity we can do raw byte upload or base64 
// if it's small, but typical file managers use multipart. Let's assume multer in the router.
const pathSchema = z.object({
  path: z.string().default("/")
});

const getBaseUserPath = async (userId: string): Promise<string> => {
  const userResult = await db.query("SELECT username FROM users WHERE id = $1", [userId]);
  if (userResult.rowCount === 0) throw new Error("Usuario no encontrado");
  const username = userResult.rows[0].username.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  return `/home/${username}`;
};

export const listFilesHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    const basePath = await getBaseUserPath(userId);
    const p = req.query.path as string || "/";
    
    // Ensure base directory exists just in case
    await fs.mkdir(basePath, { recursive: true }).catch(() => {});

    const files = await fileService.listFiles(basePath, p);
    return res.status(200).json({ success: true, data: files });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: error instanceof Error ? error.message : "Error al listar archivos" }});
  }
};

export const createFolderHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    const basePath = await getBaseUserPath(userId);
    const { path: dirPath } = req.body;
    
    await fileService.createFolder(basePath, dirPath);
    return res.status(201).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "Error al crear carpeta" }});
  }
};

export const deletePathHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    const basePath = await getBaseUserPath(userId);
    const p = req.query.path as string;
    
    await fileService.deletePath(basePath, p);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "Error al eliminar" }});
  }
};

export const renamePathHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    const basePath = await getBaseUserPath(userId);
    const { oldPath, newPath } = req.body;
    
    await fileService.renamePath(basePath, oldPath, newPath);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "Error al renombrar" }});
  }
};

export const readFileHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    const basePath = await getBaseUserPath(userId);
    const p = req.query.path as string;
    
    const content = await fileService.readFileContent(basePath, p);
    return res.status(200).json({ success: true, data: content });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "Error al leer archivo" }});
  }
};

export const writeFileHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    const basePath = await getBaseUserPath(userId);
    const { path: p, content } = req.body;
    
    await fileService.writeFileContent(basePath, p, content);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "Error al escribir archivo" }});
  }
};

export const compressHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    const basePath = await getBaseUserPath(userId);
    const { targetPath, zipName } = req.body;
    
    await fileService.compressPath(basePath, targetPath, zipName);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "Error al comprimir" }});
  }
};

export const extractHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    const basePath = await getBaseUserPath(userId);
    // Accept both 'zipPath' (legacy) and 'archivePath'
    const archivePath = req.body.archivePath ?? req.body.zipPath;
    const destPath    = req.body.destPath ?? req.body.destUserDir;
    
    await fileService.extractArchive(basePath, archivePath, destPath);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: error instanceof Error ? error.message : "Error al extraer" }});
  }
};

export const chmodHandler = async (req: Request, res: Response): Promise<Response> => {
  const schema = z.object({
    path:      z.string().min(1),
    octal:     z.string().regex(/^[0-7]{3,4}$/, "Permisos octales inválidos (ej: 644, 755)"),
    recursive: z.boolean().optional().default(false),
  });

  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    return res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: parse.error.issues[0]?.message } });
  }

  try {
    const userId   = await getUserId(req);
    const basePath = await getBaseUserPath(userId);
    await fileService.changePermissions(basePath, parse.data.path, parse.data.octal, parse.data.recursive);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "Error al cambiar permisos" }});
  }
};

export const downloadFileHandler = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    const basePath = await getBaseUserPath(userId);
    const p = req.query.path as string;
    
    const targetFile = path.resolve(basePath, p.replace(/^\//, ""));
    if (!targetFile.startsWith(basePath)) {
      return res.status(403).send("Acceso denegado");
    }
    
    res.download(targetFile);
  } catch (error) {
    res.status(500).send("Error al descargar");
  }
};

export const uploadFileHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    const basePath = await getBaseUserPath(userId);
    const destUserDir = req.body.path as string || "/";
    const autoExtract = req.body.autoExtract === "true" || req.body.autoExtract === true;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: { message: "No se proporcionaron archivos" } });
    }

    const results: { name: string; extracted: boolean }[] = [];

    for (const file of files) {
      // multer diskStorage writes to a tmp path — read it as buffer, then hand off to service
      const buffer = await fs.readFile(file.path);
      const result = await fileService.saveUploadedFile(
        basePath,
        destUserDir,
        file.originalname,
        buffer,
        autoExtract
      );
      // Clean up tmp file
      await fs.rm(file.path, { force: true }).catch(() => {});
      results.push({ name: file.originalname, extracted: result.extracted });
    }

    return res.status(200).json({ success: true, data: results });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: error instanceof Error ? error.message : "Error al subir" },
    });
  }
};

