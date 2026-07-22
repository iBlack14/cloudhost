import fs from "node:fs/promises";
import { createWriteStream, createReadStream } from "node:fs";
import path from "node:path";
import mime from "mime-types";
import { createRequire } from "node:module";
import type { Archiver } from "archiver";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { pipeline } from "node:stream/promises";

const execAsync = promisify(exec);
const require = createRequire(import.meta.url);
// archiver is CommonJS. Loading it with require avoids NodeNext/ESM interop
// differences that can otherwise make the imported namespace non-callable.
const archiverFactory = require("archiver") as (
  format: string,
  options?: Record<string, unknown>
) => Archiver;

export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  lastModified: Date;
  mimeType?: string;
  permissions: string;
}

// ─── Path Security ────────────────────────────────────────────────────────────

export const resolveSafePath = (basePath: string, userPath: string): string => {
  const resolvedBasePath = path.resolve(basePath);
  const resolvedPath = path.resolve(resolvedBasePath, userPath.replace(/^[\\/]+/, ""));

  if (resolvedPath !== resolvedBasePath && !resolvedPath.startsWith(resolvedBasePath + path.sep)) {
    throw new Error("Acceso denegado: Fuera del directorio base");
  }
  return resolvedPath;
};

const getPermissionsString = (mode: number): string => {
  return "0" + (mode & parseInt("777", 8)).toString(8);
};

// ─── List ─────────────────────────────────────────────────────────────────────

// Internal system files that should never be shown to users in the file manager
const HIDDEN_ENTRIES = new Set([".provisioned"]);

export const listFiles = async (basePath: string, userDir: string): Promise<FileItem[]> => {
  const targetPath = resolveSafePath(basePath, userDir);

  const files = await fs.readdir(targetPath, { withFileTypes: true });
  const result: FileItem[] = [];

  for (const file of files) {
    // Hide internal system sentinel files
    if (HIDDEN_ENTRIES.has(file.name)) continue;

    const fullPath = path.join(targetPath, file.name);
    try {
      const stats = await fs.stat(fullPath);
      result.push({
        name: file.name,
        path: path.join(userDir, file.name).replace(/\\/g, "/"),
        isDirectory: stats.isDirectory(),
        size: stats.size,
        lastModified: stats.mtime,
        mimeType: stats.isDirectory()
          ? "directory"
          : (mime.lookup(fullPath) || "application/octet-stream"),
        permissions: getPermissionsString(stats.mode),
      });
    } catch {
      // ignore unreadable entries (broken symlinks, etc.)
    }
  }

  return result.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
};

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const createFolder = async (basePath: string, userPath: string): Promise<void> => {
  const targetPath = resolveSafePath(basePath, userPath);
  await fs.mkdir(targetPath, { recursive: true });
};

export const deletePath = async (basePath: string, userPath: string): Promise<void> => {
  const targetPath = resolveSafePath(basePath, userPath);
  await fs.rm(targetPath, { recursive: true, force: true });
};

export const renamePath = async (
  basePath: string,
  oldUserPath: string,
  newUserPath: string
): Promise<void> => {
  const source = resolveSafePath(basePath, oldUserPath);
  const dest = resolveSafePath(basePath, newUserPath);
  await fs.rename(source, dest);
};

export const readFileContent = async (basePath: string, userPath: string): Promise<string> => {
  const targetPath = resolveSafePath(basePath, userPath);
  const stats = await fs.stat(targetPath);

  // Hard limit: 10 MB for in-browser editing
  const MAX_EDIT_BYTES = 10 * 1024 * 1024;
  if (stats.size > MAX_EDIT_BYTES) {
    throw new Error(
      `Archivo demasiado grande para editar en el navegador (${Math.round(stats.size / 1024 / 1024)} MB). Máximo: 10 MB`
    );
  }

  return fs.readFile(targetPath, "utf8");
};

export const writeFileContent = async (
  basePath: string,
  userPath: string,
  content: string
): Promise<void> => {
  const targetPath = resolveSafePath(basePath, userPath);

  // Auto-backup before overwriting (keep .bak next to file)
  try {
    await fs.copyFile(targetPath, `${targetPath}.bak`);
  } catch {
    // If file doesn't exist yet, no backup needed
  }

  await fs.writeFile(targetPath, content, "utf8");
};

// ─── Compress / Extract ───────────────────────────────────────────────────────

export const compressPath = async (
  basePath: string,
  userPath: string,
  destZipName: string
): Promise<void> => {
  const targetPath = resolveSafePath(basePath, userPath);
  const destZipPath = resolveSafePath(basePath, destZipName);

  const stats = await fs.stat(targetPath);
  if (targetPath === destZipPath) {
    throw new Error("El archivo de destino no puede ser el mismo que el origen");
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const output  = createWriteStream(destZipPath);
      const archive = archiverFactory("zip", { zlib: { level: 6 } });

      output.on("close", resolve);
      output.on("error", reject);
      archive.on("error", reject);
      archive.pipe(output);

      if (stats.isDirectory()) {
        archive.directory(targetPath, path.basename(targetPath));
      } else {
        archive.file(targetPath, { name: path.basename(targetPath) });
      }
      void archive.finalize().catch(reject);
    });
  } catch (error) {
    // Do not leave a corrupt/partial ZIP after a stream or archive failure.
    await fs.unlink(destZipPath).catch(() => undefined);
    throw error;
  }
};

/**
 * Detects archive type from filename extension and extracts accordingly.
 * Supports: .zip | .tar | .tar.gz | .tgz | .tar.bz2 | .tar.xz
 */
export const extractArchive = async (
  basePath: string,
  archiveUserPath: string,
  destUserDir: string
): Promise<void> => {
  const archivePath = resolveSafePath(basePath, archiveUserPath);
  const destPath = resolveSafePath(basePath, destUserDir);

  // Ensure destination directory exists
  await fs.mkdir(destPath, { recursive: true });

  const name = archiveUserPath.toLowerCase();

  if (name.endsWith(".zip")) {
    await execAsync(`unzip -o "${archivePath}" -d "${destPath}"`);
  } else if (
    name.endsWith(".tar.gz") ||
    name.endsWith(".tgz")
  ) {
    await execAsync(`tar -xzf "${archivePath}" -C "${destPath}"`);
  } else if (name.endsWith(".tar.bz2")) {
    await execAsync(`tar -xjf "${archivePath}" -C "${destPath}"`);
  } else if (name.endsWith(".tar.xz")) {
    await execAsync(`tar -xJf "${archivePath}" -C "${destPath}"`);
  } else if (name.endsWith(".tar")) {
    await execAsync(`tar -xf "${archivePath}" -C "${destPath}"`);
  } else {
    throw new Error(
      "Formato de archivo no soportado. Usa: .zip, .tar, .tar.gz, .tgz, .tar.bz2, .tar.xz"
    );
  }
};

/** @deprecated Use extractArchive instead — kept for backward compatibility */
export const extractZip = extractArchive;

// ─── Chmod ────────────────────────────────────────────────────────────────────

export const changePermissions = async (
  basePath: string,
  userPath: string,
  octal: string,
  recursive: boolean = false
): Promise<void> => {
  // Validate octal: must be 3-4 digits, each 0-7
  if (!/^[0-7]{3,4}$/.test(octal)) {
    throw new Error("Permisos inválidos. Usa formato octal: 644, 755, etc.");
  }

  const targetPath = resolveSafePath(basePath, userPath);
  const flag = recursive ? "-R" : "";
  await execAsync(`chmod ${flag} ${octal} "${targetPath}"`);
};

// ─── Upload helpers ───────────────────────────────────────────────────────────

/**
 * Saves an uploaded buffer to disk and optionally auto-extracts archives.
 */
export const saveUploadedFile = async (
  basePath: string,
  destUserDir: string,
  originalName: string,
  tmpFilePath: string,
  autoExtract: boolean = false
): Promise<{ savedPath: string; extracted: boolean }> => {
  const destDir = resolveSafePath(basePath, destUserDir);
  await fs.mkdir(destDir, { recursive: true });

  const sanitizedName = path.basename(originalName).replace(/[^\w.\-]/g, "_");
  const destFilePath = path.join(destDir, sanitizedName);

  // Use fs.copyFile instead of loading into RAM.
  // This supports 5GB+ files effortlessly.
  await fs.copyFile(tmpFilePath, destFilePath);

  const relativeSaved = path.join(destUserDir, sanitizedName).replace(/\\/g, "/");
  const relativeDir = destUserDir;

  const archiveExts = [".zip", ".tar.gz", ".tgz", ".tar.bz2", ".tar.xz", ".tar"];
  const isArchive = archiveExts.some((ext) => sanitizedName.toLowerCase().endsWith(ext));

  if (autoExtract && isArchive) {
    await extractArchive(basePath, relativeSaved, relativeDir);
    return { savedPath: relativeSaved, extracted: true };
  }

  return { savedPath: relativeSaved, extracted: false };
};

// ─── Copy Path ────────────────────────────────────────────────────────────────
export const copyPath = async (
  basePath: string,
  sourceUserPath: string,
  destUserPath: string
): Promise<void> => {
  const source = resolveSafePath(basePath, sourceUserPath);
  const dest = resolveSafePath(basePath, destUserPath);
  
  // Use Node's native fs.cp which supports recursive copying of files/directories
  await fs.cp(source, dest, { recursive: true });
};

// ─── Exec Commands ────────────────────────────────────────────────────────────
export const runNpmInstall = async (basePath: string, folderUserPath: string): Promise<string> => {
  const targetDir = resolveSafePath(basePath, folderUserPath);
  const packageJson = path.join(targetDir, "package.json");

  const exists = await fs.stat(packageJson).then(s => s.isFile()).catch(() => false);
  if (!exists) {
    throw new Error("No se encontró package.json en el directorio especificado");
  }

  // Run npm install in targetDir
  const cmd = process.platform === "win32" ? "npm.cmd install" : "npm install";
  await execAsync(cmd, { cwd: targetDir });
  return "Dependencias instaladas correctamente.";
};

export const runJsScript = async (basePath: string, scriptUserPath: string): Promise<string> => {
  const targetScript = resolveSafePath(basePath, scriptUserPath);
  const targetDir = path.dirname(targetScript);
  const scriptName = path.basename(targetScript);

  const exists = await fs.stat(targetScript).then(s => s.isFile()).catch(() => false);
  if (!exists) {
    throw new Error("No se encontró el script especificado");
  }

  // Run JS script in its parent directory
  const cmd = `node ${scriptName}`;
  const { stdout, stderr } = await execAsync(cmd, { cwd: targetDir });
  
  if (stderr && stderr.trim()) {
    return `Salida: ${stdout}\nErrores: ${stderr}`;
  }
  return stdout || "Script ejecutado con éxito (sin salida).";
};


