import type { Request, Response } from "express";
import { z } from "zod";
import * as fileService from "../../services/odin/file.service.js";
import { getUserId } from "../../utils/get-user-id.js";
import { db } from "../../config/db.js";
import path from "node:path";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import { INDEX_TEMPLATE, ERROR_404_TEMPLATE, ERROR_500_TEMPLATE, ERROR_503_TEMPLATE } from "../../utils/html-templates.js";

// We require multer for file uploads if needed, but for simplicity we can do raw byte upload or base64 
// if it's small, but typical file managers use multipart. Let's assume multer in the router.
const pathSchema = z.object({
  path: z.string().default("/")
});

const getBaseUserPath = async (userId: string): Promise<string> => {
  const userResult = await db.query("SELECT username FROM users WHERE id = $1", [userId]);
  if (userResult.rowCount === 0) throw new Error("Usuario no encontrado");
  const username = userResult.rows[0].username.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  if (process.platform === "win32") {
    return path.join(process.cwd(), ".odin-home", username);
  }

  return path.join("/home", username);
};

/**
 * One-shot provisioner: writes default placeholder files + required folders ONLY
 * the very first time this user's home is set up.
 *
 * Detection strategy (in order of priority):
 *  1. If a `.provisioned` sentinel already exists → skip entirely (fastest path).
 *  2. If public_html already has any content (WP, static site, etc.) → write sentinel
 *     and skip writing template files (never overwrite existing sites).
 *  3. Otherwise (brand new account) → write folders + template files + sentinel.
 *
 * This fixes:
 *  - "Ghost folders" that re-appeared on every GET /files request.
 *  - WordPress sites reverting to the placeholder after the cron cycle, because
 *    the old guard only checked for `index.html` while WP uses `index.php`.
 */
async function ensureDefaultUserFiles(basePath: string) {
  try {
    const sentinelPath = path.join(basePath, ".provisioned");

    // Fast path: already provisioned
    const alreadyProvisioned = await fs.stat(sentinelPath).then(() => true).catch(() => false);
    if (alreadyProvisioned) return;

    const pubHtml = path.join(basePath, "public_html");

    // Check if public_html already has ANY content (WP files, uploaded site, etc.)
    let pubHtmlHasContent = false;
    try {
      const entries = await fs.readdir(pubHtml);
      pubHtmlHasContent = entries.length > 0;
    } catch {
      // public_html doesn't exist yet — treat as empty
    }

    if (!pubHtmlHasContent) {
      // Brand-new account: create default structure + placeholder pages
      await fs.mkdir(pubHtml, { recursive: true }).catch(() => {});
      await fs.mkdir(path.join(basePath, "mail"), { recursive: true }).catch(() => {});
      await fs.mkdir(path.join(basePath, "logs"), { recursive: true }).catch(() => {});
      await fs.mkdir(path.join(basePath, "tmp"),  { recursive: true }).catch(() => {});

      await fs.writeFile(path.join(pubHtml, "index.html"), INDEX_TEMPLATE,     "utf8");
      await fs.writeFile(path.join(pubHtml, "404.html"),   ERROR_404_TEMPLATE, "utf8");
      await fs.writeFile(path.join(pubHtml, "500.html"),   ERROR_500_TEMPLATE, "utf8");
      await fs.writeFile(path.join(pubHtml, "503.html"),   ERROR_503_TEMPLATE, "utf8");
    }

    // Write sentinel so this block NEVER runs again for this user
    await fs.writeFile(sentinelPath, new Date().toISOString(), "utf8").catch(() => {});
  } catch (err) {
    console.error("Error provisioning default files:", err);
  }
}

export const listFilesHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    const basePath = await getBaseUserPath(userId);
    const p = req.query.path as string || "/";
    
    // Ensure base directory exists just in case
    await fs.mkdir(basePath, { recursive: true }).catch(() => {});
    await ensureDefaultUserFiles(basePath);

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

export const copyPathHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    const basePath = await getBaseUserPath(userId);
    const { sourcePath, destPath } = req.body;
    
    await fileService.copyPath(basePath, sourcePath, destPath);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "Error al copiar archivo" }});
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

    // Dynamic quota check
    const totalBytes = files.reduce((acc, f) => acc + f.size, 0);
    const totalMb = totalBytes / 1024 / 1024;

    const planRes = await db.query(`
      SELECT COALESCE(p.disk_quota_mb, 1024) as disk_quota_mb, COALESCE(ha.disk_used_mb, 0) as disk_used_mb
      FROM users u
      LEFT JOIN plans p ON p.id = u.plan_id
      LEFT JOIN hosting_accounts ha ON ha.user_id = u.id
      WHERE u.id = $1
    `, [userId]);

    const quotaMb = Number(planRes.rows[0]?.disk_quota_mb ?? 1024);
    const usedMb  = Number(planRes.rows[0]?.disk_used_mb ?? 0);
    const freeMb  = Math.max(0, quotaMb - usedMb);

    if (totalMb > freeMb) {
      for (const file of files) {
        await fs.rm(file.path, { force: true }).catch(() => {});
      }
      return res.status(400).json({
        success: false,
        error: { message: `Espacio de disco insuficiente. Intentas subir ${totalMb.toFixed(2)} MB, pero solo te quedan ${freeMb.toFixed(2)} MB disponibles en tu cuenta.` }
      });
    }

    const results: { name: string; extracted: boolean }[] = [];

    for (const file of files) {
      // multer diskStorage writes to a tmp path.
      // Pass the path directly to the service so it can use streaming/copying instead of loading into RAM.
      const result = await fileService.saveUploadedFile(
        basePath,
        destUserDir,
        file.originalname,
        file.path,
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

// ── Disk Usage Handler ───────────────────────────────────────────────────────
import { exec } from "node:child_process";
import { promisify } from "node:util";
const execAsync2 = promisify(exec);

interface DiskUsageCacheEntry {
  data: {
    totalBytes: number;
    totalMb: number;
    diskLimit: number;
    diskPercent: number;
    basePath: string;
    breakdown: { name: string; bytes: number; mb: number }[];
  };
  timestamp: number;
}

const diskUsageCache = new Map<string, DiskUsageCacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const diskUsageHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);

    // Check cache
    const now = Date.now();
    const cached = diskUsageCache.get(userId);
    if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
      return res.status(200).json({
        success: true,
        data: cached.data
      });
    }

    const basePath = await getBaseUserPath(userId);

    // Ensure directory exists
    await fs.mkdir(basePath, { recursive: true }).catch(() => {});

    let totalBytes = 0;
    const breakdown: { name: string; bytes: number; mb: number }[] = [];

    if (process.platform === "win32") {
      // Windows: walk dirs recursively using node:fs
      const walkDir = async (dir: string): Promise<number> => {
        let size = 0;
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          for (const e of entries) {
            const full = path.join(dir, e.name);
            if (e.isDirectory()) {
              size += await walkDir(full);
            } else {
              const stat = await fs.stat(full).catch(() => null);
              size += stat?.size ?? 0;
            }
          }
        } catch {}
        return size;
      };

      // Get top-level subdirectory sizes
      const topEntries = await fs.readdir(basePath, { withFileTypes: true }).catch(() => []);
      for (const e of topEntries) {
        if (e.isDirectory()) {
          const bytes = await walkDir(path.join(basePath, e.name));
          breakdown.push({ name: e.name, bytes, mb: Math.round(bytes / 1024 / 1024 * 10) / 10 });
          totalBytes += bytes;
        } else {
          const stat = await fs.stat(path.join(basePath, e.name)).catch(() => null);
          totalBytes += stat?.size ?? 0;
        }
      }
    } else {
      // Linux: use `du -sb` for accurate disk usage
      try {
        // Total usage
        const { stdout: totalOut } = await execAsync2(`du -sb "${basePath}" 2>/dev/null || echo "0"`);
        totalBytes = parseInt(totalOut.trim().split(/\s+/)[0] ?? "0", 10);

        // Per-subdirectory breakdown
        const { stdout: subOut } = await execAsync2(
          `du -sb "${basePath}"/* 2>/dev/null | sort -rn | head -20 || true`
        );
        for (const line of subOut.trim().split("\n")) {
          if (!line.trim()) continue;
          const parts = line.trim().split(/\s+/);
          const bytes = parseInt(parts[0] ?? "0", 10);
          const fullPath = parts.slice(1).join(" ");
          const name = fullPath.replace(basePath + "/", "");
          if (name && bytes > 0) {
            breakdown.push({ name, bytes, mb: Math.round(bytes / 1024 / 1024 * 10) / 10 });
          }
        }
      } catch {
        totalBytes = 0;
      }
    }

    const totalMb = Math.round(totalBytes / 1024 / 1024 * 10) / 10;

    // Persist real disk usage back to hosting_accounts so dashboard stays accurate
    await db.query(
      `UPDATE hosting_accounts SET disk_used_mb = $1 WHERE user_id = $2`,
      [Math.ceil(totalMb), userId]
    ).catch(() => {}); // non-fatal

    // Also fetch plan quota
    const planRes = await db.query(`
      SELECT p.disk_quota_mb
      FROM users u
      LEFT JOIN plans p ON p.id = u.plan_id
      WHERE u.id = $1
    `, [userId]);
    const diskLimit = Number(planRes.rows[0]?.disk_quota_mb ?? 1024);
    const diskPercent = diskLimit > 0 ? Math.round((totalMb / diskLimit) * 100 * 10) / 10 : 0;

    const responseData = {
      totalBytes,
      totalMb,
      diskLimit,
      diskPercent,
      basePath,
      breakdown: breakdown.sort((a, b) => b.bytes - a.bytes)
    };

    diskUsageCache.set(userId, {
      data: responseData,
      timestamp: now
    });

    return res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: error instanceof Error ? error.message : "Error al calcular uso de disco" }
    });
  }
};

export const runFilesNpmInstallHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    const basePath = await getBaseUserPath(userId);
    const { path: p } = req.body;
    
    if (!p) {
      return res.status(400).json({ success: false, error: { message: "Ruta del directorio requerida" } });
    }

    const message = await fileService.runNpmInstall(basePath, p);
    return res.status(200).json({ success: true, message });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message || "Error al ejecutar npm install" } });
  }
};

export const runFilesJsScriptHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    const basePath = await getBaseUserPath(userId);
    const { path: p } = req.body;

    if (!p) {
      return res.status(400).json({ success: false, error: { message: "Ruta del script requerida" } });
    }

    const output = await fileService.runJsScript(basePath, p);
    return res.status(200).json({ success: true, output });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message || "Error al ejecutar script de JS" } });
  }
};


