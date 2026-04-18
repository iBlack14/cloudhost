import fs from "node:fs/promises";
import { createWriteStream, createReadStream } from "node:fs";
import path from "node:path";
import mime from "mime-types";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { pipeline } from "node:stream/promises";

const execAsync = promisify(exec);

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
  const resolvedPath = path.resolve(basePath, userPath.replace(/^\//, ""));
  if (!resolvedPath.startsWith(basePath)) {
    throw new Error("Acceso denegado: Fuera del directorio base");
  }
  return resolvedPath;
};

const getPermissionsString = (mode: number): string => {
  return "0" + (mode & parseInt("777", 8)).toString(8);
};

// ─── List ─────────────────────────────────────────────────────────────────────

export const listFiles = async (basePath: string, userDir: string): Promise<FileItem[]> => {
  const targetPath = resolveSafePath(basePath, userDir);

  const files = await fs.readdir(targetPath, { withFileTypes: true });
  const result: FileItem[] = [];

  for (const file of files) {
    const fullPath = path.join(targetPath, file.name);
    try {
      const stats = await fs.stat(fullPath);
      result.push({
        name: file.name,
        path: path.join(userDir, file.name).replace(/\\/g, "/"),
        isDirectory: file.isDirectory(),
        size: stats.size,
        lastModified: stats.mtime,
        mimeType: file.isDirectory()
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
  const parentDir = path.dirname(targetPath);
  const baseName = path.basename(targetPath);

  await execAsync(`cd "${parentDir}" && zip -r "${destZipPath}" "${baseName}"`);
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
  buffer: Buffer,
  autoExtract: boolean = false
): Promise<{ savedPath: string; extracted: boolean }> => {
  const destDir = resolveSafePath(basePath, destUserDir);
  await fs.mkdir(destDir, { recursive: true });

  const sanitizedName = path.basename(originalName).replace(/[^\w.\-]/g, "_");
  const destFilePath = path.join(destDir, sanitizedName);

  await fs.writeFile(destFilePath, buffer);

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
