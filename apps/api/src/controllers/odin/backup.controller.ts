import type { Request, Response } from "express";
import { getUserId } from "../../utils/get-user-id.js";
import { db } from "../../config/db.js";
import path from "node:path";
import fs from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import { createWriteStream } from "node:fs";

const require = createRequire(import.meta.url);
// archiver is a CJS module — use require() to avoid ESM interop issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ArchiverFactory = (format: string, opts?: Record<string, unknown>) => any;
const archiverModule = require("archiver") as ArchiverFactory | { default: ArchiverFactory };
const archiverFactory: ArchiverFactory = typeof archiverModule === "function"
  ? archiverModule
  : archiverModule.default;

const execAsync = promisify(exec);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getBaseUserPath = async (userId: string): Promise<string> => {
  const userResult = await db.query("SELECT username FROM users WHERE id = $1", [userId]);
  if (userResult.rowCount === 0) throw new Error("Usuario no encontrado");
  const username = userResult.rows[0].username.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  if (process.platform === "win32") {
    return path.join(process.cwd(), ".odin-home", username);
  }
  return path.join("/home", username);
};

const getBackupsDir = async (userId: string): Promise<string> => {
  const basePath = await getBaseUserPath(userId);
  const backupsDir = path.join(basePath, ".backups");
  await fs.mkdir(backupsDir, { recursive: true });
  return backupsDir;
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Create a .tar.gz of `sourceDir` and write it to `destFile`.
 * Falls back to archiver (Node.js) when `tar` is not available (e.g. Windows dev).
 */
const createTarGz = async (sourceDir: string, destFile: string): Promise<void> => {
  // Try native tar first (Linux / macOS)
  try {
    const parentDir = path.dirname(sourceDir);
    const baseName  = path.basename(sourceDir);
    await execAsync(
      `tar -czf "${destFile}" -C "${parentDir}" "${baseName}"`,
      { timeout: 300_000 }
    );
    return;
  } catch {
    // Fall through to archiver on Windows / missing tar
  }

  // Fallback: Node.js archiver
  await new Promise<void>((resolve, reject) => {
    const output  = createWriteStream(destFile);
    const archive = archiverFactory("tar", { gzip: true });

    output.on("close", resolve);
    archive.on("error", reject);

    archive.pipe(output);
    archive.directory(sourceDir, path.basename(sourceDir));
    archive.finalize();
  });
};

// ─── Handlers ────────────────────────────────────────────────────────────────

/** GET /backups — list existing backup files */
export const listBackupsHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId    = await getUserId(req);
    const backupDir = await getBackupsDir(userId);

    const entries = await fs.readdir(backupDir, { withFileTypes: true });
    const backups = await Promise.all(
      entries
        .filter((e) => e.isFile() && (e.name.endsWith(".tar.gz") || e.name.endsWith(".zip")))
        .map(async (e) => {
          const fullPath = path.join(backupDir, e.name);
          const stat     = await fs.stat(fullPath);
          // Parse name: backup_<scope>_<timestamp>.tar.gz
          const parts = e.name.replace(/\.(tar\.gz|zip)$/, "").split("_");
          const scope = parts[1] ?? "completo";
          return {
            name:       e.name,
            scope,
            size:       stat.size,
            sizeLabel:  formatBytes(stat.size),
            createdAt:  stat.mtime.toISOString(),
          };
        })
    );

    // Most recent first
    backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return res.status(200).json({ success: true, data: backups });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: error instanceof Error ? error.message : "Error al listar backups" } });
  }
};

/** POST /backups — create a new backup (full or per domain) */
export const createBackupHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId   = await getUserId(req);
    const basePath = await getBaseUserPath(userId);
    const backupDir = await getBackupsDir(userId);

    const { scope } = req.body as { scope?: string };  // "full" | domainName
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);

    let sourceDir: string;
    let label: string;

    if (!scope || scope === "full") {
      sourceDir = basePath;
      label     = "completo";
    } else {
      // Per-domain backup
      const domainDir = path.join(basePath, scope);
      const stat = await fs.stat(domainDir).catch(() => null);
      if (!stat?.isDirectory()) {
        return res.status(404).json({ success: false, error: { message: `Directorio del dominio no encontrado: ${scope}` } });
      }
      sourceDir = domainDir;
      label     = scope.replace(/\./g, "_");
    }

    const fileName = `backup_${label}_${timestamp}.tar.gz`;
    const destFile  = path.join(backupDir, fileName);

    await createTarGz(sourceDir, destFile);

    const stat = await fs.stat(destFile);
    return res.status(201).json({
      success: true,
      data: {
        name:      fileName,
        scope:     label,
        size:      stat.size,
        sizeLabel: formatBytes(stat.size),
        createdAt: stat.mtime.toISOString(),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: error instanceof Error ? error.message : "Error al crear backup" } });
  }
};

/** GET /backups/download?name=backup_xxx.tar.gz — stream the backup file */
export const downloadBackupHandler = async (req: Request, res: Response) => {
  try {
    const userId    = await getUserId(req);
    const backupDir = await getBackupsDir(userId);
    const name      = req.query.name as string;

    if (!name || name.includes("..") || name.includes("/")) {
      return res.status(400).json({ success: false, error: { message: "Nombre de archivo inválido" } });
    }

    const filePath = path.join(backupDir, name);
    if (!existsSync(filePath)) {
      return res.status(404).json({ success: false, error: { message: "Backup no encontrado" } });
    }

    const stat = await fs.stat(filePath);
    res.setHeader("Content-Type", "application/gzip");
    res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
    res.setHeader("Content-Length", stat.size);

    createReadStream(filePath).pipe(res);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: "Error al descargar backup" } });
  }
};

/** DELETE /backups?name=backup_xxx.tar.gz — delete a backup file */
export const deleteBackupHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId    = await getUserId(req);
    const backupDir = await getBackupsDir(userId);
    const name      = req.query.name as string;

    if (!name || name.includes("..") || name.includes("/")) {
      return res.status(400).json({ success: false, error: { message: "Nombre de archivo inválido" } });
    }

    const filePath = path.join(backupDir, name);
    await fs.rm(filePath, { force: true });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "Error al eliminar backup" } });
  }
};
