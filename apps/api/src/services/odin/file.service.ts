import fs from "node:fs/promises";
import path from "node:path";
import mime from "mime-types";
import { exec } from "node:child_process";
import { promisify } from "node:util";

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

const resolveSafePath = (basePath: string, userPath: string) => {
  const resolvedPath = path.resolve(basePath, userPath.replace(/^\//, ""));
  if (!resolvedPath.startsWith(basePath)) {
    throw new Error("Acceso denegado: Fuera del directorio base");
  }
  return resolvedPath;
};

const getPermissionsString = (mode: number) => {
  return "0" + (mode & parseInt('777', 8)).toString(8);
};

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
        mimeType: file.isDirectory() ? "directory" : (mime.lookup(fullPath) || "application/octet-stream"),
        permissions: getPermissionsString(stats.mode)
      });
    } catch (e) {
      // Ignore files that can't be stat'd (symlink issues, etc)
    }
  }

  return result.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
};

export const createFolder = async (basePath: string, userPath: string) => {
  const targetPath = resolveSafePath(basePath, userPath);
  await fs.mkdir(targetPath, { recursive: true });
};

export const deletePath = async (basePath: string, userPath: string) => {
  const targetPath = resolveSafePath(basePath, userPath);
  await fs.rm(targetPath, { recursive: true, force: true });
};

export const renamePath = async (basePath: string, oldUserPath: string, newUserPath: string) => {
  const source = resolveSafePath(basePath, oldUserPath);
  const dest = resolveSafePath(basePath, newUserPath);
  await fs.rename(source, dest);
};

export const readFileContent = async (basePath: string, userPath: string): Promise<string> => {
  const targetPath = resolveSafePath(basePath, userPath);
  return await fs.readFile(targetPath, "utf8");
};

export const writeFileContent = async (basePath: string, userPath: string, content: string) => {
  const targetPath = resolveSafePath(basePath, userPath);
  await fs.writeFile(targetPath, content, "utf8");
};

export const compressPath = async (basePath: string, userPath: string, destZipName: string) => {
  const targetPath = resolveSafePath(basePath, userPath);
  const destZipPath = resolveSafePath(basePath, destZipName);
  const parentDir = path.dirname(targetPath);
  const baseName = path.basename(targetPath);
  
  await execAsync(`cd ${parentDir} && zip -r ${destZipPath} ${baseName}`);
};

export const extractZip = async (basePath: string, zipUserPath: string, destUserDir: string) => {
  const zipPath = resolveSafePath(basePath, zipUserPath);
  const destPath = resolveSafePath(basePath, destUserDir);
  
  await execAsync(`unzip -o ${zipPath} -d ${destPath}`);
};
