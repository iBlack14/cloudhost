import { FtpSrv, FileSystem } from "ftp-srv";
import { db } from "../config/db.js";
import { decryptSecret } from "../utils/secret.js";
import path from "node:path";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { createReadStream, createWriteStream, constants } from "node:fs";
import { randomUUID } from "node:crypto";

/**
 * Resolve the physical home directory for a hosting user.
 * Linux: /home/<username>  |  Windows (dev): <cwd>/.odin-home/<username>
 */
const getBaseUserPath = async (userId: string): Promise<string> => {
  const userResult = await db.query("SELECT username FROM users WHERE id = $1", [userId]);
  if (userResult.rowCount === 0) throw new Error("Usuario no encontrado");
  const username = userResult.rows[0].username.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  if (process.platform === "win32") {
    return path.resolve(process.cwd(), ".odin-home", username);
  }
  return path.resolve("/home", username);
};

/**
 * Normalize an FTP account path (stored as virtual path like "/public_html")
 * into a physical directory that is ALWAYS inside the user's home.
 *
 * Fixes:
 * - path.join(base, "/public_html") quirks
 * - accidental absolute paths stored in DB (/home/user/...)
 * - path traversal with ".."
 * - startsWith false-positives (/home/user vs /home/username)
 */
export const resolveFtpRoot = (basePath: string, accountPath?: string | null): string => {
  const base = path.resolve(basePath);
  const raw = (accountPath ?? "/").toString().trim() || "/";

  if (raw === "/" || raw === "." || raw === "./") {
    return base;
  }

  // Normalize separators
  let virtual = raw.replace(/\\/g, "/");

  // If the stored path is already an absolute FS path under the user home, make it relative
  const asAbsolute = path.resolve(virtual);
  if (asAbsolute === base || asAbsolute.startsWith(base + path.sep)) {
    virtual = path.relative(base, asAbsolute).replace(/\\/g, "/");
  }

  // Strip leading slashes so segments are always relative to home
  virtual = virtual.replace(/^\/+/, "");

  const segments = virtual.split("/").filter((s) => s && s !== ".");
  const safe: string[] = [];
  for (const seg of segments) {
    if (seg === "..") {
      if (safe.length > 0) safe.pop();
    } else {
      // Disallow weird segment names
      if (seg.includes("\0")) continue;
      safe.push(seg);
    }
  }

  const target = safe.length === 0 ? base : path.resolve(base, ...safe);

  if (target !== base && !target.startsWith(base + path.sep)) {
    throw new Error("Ruta de acceso inválida");
  }

  return target;
};

/**
 * Build a virtual (FTP-facing) path from cwd + request, never escaping above "/".
 */
const buildVirtualPath = (cwd: string, requestPath: string): string => {
  const raw = String(requestPath ?? ".").replace(/\\/g, "/");
  const joined = raw.startsWith("/")
    ? path.posix.normalize(raw)
    : path.posix.normalize(path.posix.join(cwd || "/", raw));

  const segments = joined.split("/").filter((s) => s && s !== ".");
  const safe: string[] = [];
  for (const seg of segments) {
    if (seg === "..") {
      if (safe.length > 0) safe.pop();
    } else {
      safe.push(seg);
    }
  }
  return "/" + safe.join("/");
};

/**
 * Map a virtual FTP path onto the physical jail root without ever leaving it.
 * Unlike stock ftp-srv FileSystem, this never lets absolute client paths
 * or ".." segments resolve outside `root` (the cause of FileZilla folder loops).
 */
const mapToFs = (root: string, virtualPath: string): { clientPath: string; fsPath: string } => {
  const resolvedRoot = path.resolve(root);
  const clientPath = buildVirtualPath("/", virtualPath);
  const segments = clientPath.split("/").filter(Boolean);
  const fsPath = segments.length === 0 ? resolvedRoot : path.resolve(resolvedRoot, ...segments);

  if (fsPath !== resolvedRoot && !fsPath.startsWith(resolvedRoot + path.sep)) {
    return { clientPath: "/", fsPath: resolvedRoot };
  }

  return { clientPath, fsPath };
};

const assertInsideRoot = async (root: string, fsPath: string): Promise<string> => {
  const resolvedRoot = path.resolve(root);
  let realRoot = resolvedRoot;
  try {
    realRoot = await fsp.realpath(resolvedRoot);
  } catch {
    // root may not exist yet
  }

  let realPath = fsPath;
  try {
    realPath = await fsp.realpath(fsPath);
  } catch {
    // For create operations the path may not exist; check parent instead
    const parent = path.dirname(fsPath);
    try {
      const realParent = await fsp.realpath(parent);
      if (realParent !== realRoot && !realParent.startsWith(realRoot + path.sep)) {
        throw new Error("Access denied: path escapes jail");
      }
      // Reconstruct candidate under real parent
      realPath = path.join(realParent, path.basename(fsPath));
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Access denied")) throw err;
      // parent missing — fall through to string check on unresolved path
      realPath = path.resolve(fsPath);
    }
  }

  if (realPath !== realRoot && !realPath.startsWith(realRoot + path.sep)) {
    throw new Error("Access denied: path escapes jail");
  }

  // Also enforce logical (non-realpath) containment
  const logical = path.resolve(fsPath);
  if (logical !== resolvedRoot && !logical.startsWith(resolvedRoot + path.sep)) {
    throw new Error("Access denied: path escapes jail");
  }

  return realPath;
};

/**
 * Custom FTP filesystem that keeps FileZilla (and any client) strictly
 * inside the account jail. Stock ftp-srv resolves absolute CWD/LIST paths
 * in a way that can leave the root and re-enter /home/<user> forever
 * ("folder loop"), and can expose system dirs not shown in the panel.
 */
class JailFileSystem extends FileSystem {
  // ftp-srv stores these on the instance at runtime
  declare cwd: string;
  declare _root: string;

  constructor(connection: unknown, { root, cwd }: { root: string; cwd?: string }) {
    const resolvedRoot = path.resolve(root);
    super(connection as never, { root: resolvedRoot, cwd: cwd || "/" });
    this._root = resolvedRoot;
    this.cwd = buildVirtualPath("/", cwd || "/");
  }

  // Override private resolver used by stock methods we don't reimplement
  _resolvePath(requestPath: string = ".") {
    const virtual = buildVirtualPath(this.cwd || "/", requestPath);
    return mapToFs(this._root, virtual);
  }

  currentDirectory(): string {
    return this.cwd || "/";
  }

  async get(fileName: string) {
    const { fsPath } = this._resolvePath(fileName);
    await assertInsideRoot(this._root, fsPath);
    const stat = await fsp.stat(fsPath);
    return Object.assign(stat, { name: fileName });
  }

  async list(requestPath: string = ".") {
    const { fsPath } = this._resolvePath(requestPath);
    await assertInsideRoot(this._root, fsPath);

    const names = await fsp.readdir(fsPath);
    const resolvedRoot = path.resolve(this._root);
    let realRoot = resolvedRoot;
    try {
      realRoot = await fsp.realpath(resolvedRoot);
    } catch {
      /* ignore */
    }

    const entries = await Promise.all(
      names.map(async (name) => {
        // Never surface . / .. even if present
        if (name === "." || name === "..") return null;

        const full = path.join(fsPath, name);
        try {
          await fsp.access(full, constants.F_OK);

          // Use lstat so we can detect symlinks that point outside the jail
          const lstat = await fsp.lstat(full);

          if (lstat.isSymbolicLink()) {
            try {
              const real = await fsp.realpath(full);
              if (real !== realRoot && !real.startsWith(realRoot + path.sep)) {
                // Symlink escapes jail — hide it (prevents FileZilla loops)
                return null;
              }
            } catch {
              // Broken symlink — hide
              return null;
            }
          }

          const stat = await fsp.stat(full);

          // Extra safety: if resolved target left the jail, hide entry
          try {
            const real = await fsp.realpath(full);
            if (real !== realRoot && !real.startsWith(realRoot + path.sep)) {
              return null;
            }
          } catch {
            return null;
          }

          return Object.assign(stat, { name });
        } catch {
          return null;
        }
      })
    );

    return entries.filter(Boolean);
  }

  async chdir(requestPath: string = ".") {
    const { fsPath, clientPath } = this._resolvePath(requestPath);
    const real = await assertInsideRoot(this._root, fsPath);
    const stat = await fsp.stat(real);
    if (!stat.isDirectory()) {
      throw new Error("Not a valid directory");
    }
    this.cwd = clientPath;
    return this.currentDirectory();
  }

  write(fileName: string, { append = false, start = undefined }: { append?: boolean; start?: number } = {}) {
    const { fsPath, clientPath } = this._resolvePath(fileName);
    // Parent must stay inside jail
    const parent = path.dirname(fsPath);
    const resolvedRoot = path.resolve(this._root);
    if (parent !== resolvedRoot && !parent.startsWith(resolvedRoot + path.sep) && parent !== resolvedRoot) {
      throw new Error("Access denied");
    }

    const stream = createWriteStream(fsPath, {
      flags: !append ? "w+" : "a+",
      start,
    });
    stream.once("error", () => {
      fs.unlink(fsPath, () => undefined);
    });
    stream.once("close", () => stream.end());
    return { stream, clientPath };
  }

  async read(fileName: string, { start = undefined }: { start?: number } = {}) {
    const { fsPath, clientPath } = this._resolvePath(fileName);
    await assertInsideRoot(this._root, fsPath);
    const stat = await fsp.stat(fsPath);
    if (stat.isDirectory()) {
      throw new Error("Cannot read a directory");
    }
    const stream = createReadStream(fsPath, { flags: "r", start });
    return { stream, clientPath };
  }

  async delete(requestPath: string) {
    const { fsPath } = this._resolvePath(requestPath);
    await assertInsideRoot(this._root, fsPath);
    const stat = await fsp.lstat(fsPath);
    if (stat.isDirectory()) {
      await fsp.rmdir(fsPath);
    } else {
      await fsp.unlink(fsPath);
    }
  }

  async mkdir(requestPath: string) {
    const { fsPath } = this._resolvePath(requestPath);
    // Ensure final path would be inside jail
    const resolvedRoot = path.resolve(this._root);
    if (fsPath !== resolvedRoot && !fsPath.startsWith(resolvedRoot + path.sep)) {
      throw new Error("Access denied");
    }
    await fsp.mkdir(fsPath, { recursive: true });
    return fsPath;
  }

  async rename(from: string, to: string) {
    const { fsPath: fromPath } = this._resolvePath(from);
    const { fsPath: toPath } = this._resolvePath(to);
    await assertInsideRoot(this._root, fromPath);
    const resolvedRoot = path.resolve(this._root);
    if (toPath !== resolvedRoot && !toPath.startsWith(resolvedRoot + path.sep)) {
      throw new Error("Access denied");
    }
    await fsp.rename(fromPath, toPath);
  }

  async chmod(requestPath: string, mode: string | number) {
    const { fsPath } = this._resolvePath(requestPath);
    await assertInsideRoot(this._root, fsPath);
    await fsp.chmod(fsPath, mode);
  }

  getUniqueName(): string {
    return randomUUID().replace(/\W/g, "");
  }
}

export const startFtpServer = async () => {
  // Use port 2121 to avoid requiring root, or 21 if running as root
  const port = process.env.FTP_PORT || 2121;

  let pasvUrl = process.env.FTP_PASV_URL;
  if (!pasvUrl) {
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const data = (await res.json()) as { ip?: string };
      pasvUrl = data.ip || "127.0.0.1";
      console.log(`[odisea-ftp] Detected public IP for PASV: ${pasvUrl}`);
    } catch {
      pasvUrl = "127.0.0.1";
    }
  }

  const ftpServer = new FtpSrv({
    url: `ftp://0.0.0.0:${port}`,
    anonymous: false,
    pasv_url: pasvUrl,
    pasv_min: 10000,
    pasv_max: 10010,
  });

  ftpServer.on("login", async (data, resolve, reject) => {
    try {
      const { username, password, connection } = data;

      const res = await db.query(
        "SELECT id, user_id, password_ciphertext, path FROM ftp_accounts WHERE username = $1",
        [username]
      );

      if (res.rowCount === 0) {
        return reject(new Error("Usuario o contraseña incorrectos"));
      }

      const account = res.rows[0];
      const decryptedPassword = decryptSecret(account.password_ciphertext);

      if (password !== decryptedPassword) {
        return reject(new Error("Usuario o contraseña incorrectos"));
      }

      const basePath = await getBaseUserPath(account.user_id);
      const targetPath = resolveFtpRoot(basePath, account.path);

      // Ensure the physical directory exists before jailing the user
      try {
        if (!fs.existsSync(targetPath)) {
          fs.mkdirSync(targetPath, { recursive: true });
        }
      } catch (e) {
        console.error("[FTP] Failed to create user directory:", e);
      }

      const jailFs = new JailFileSystem(connection, { root: targetPath, cwd: "/" });

      return resolve({
        root: targetPath,
        cwd: "/",
        fs: jailFs,
      });
    } catch (err) {
      console.error("[FTP Server] Login error:", err);
      return reject(new Error("Error interno del servidor FTP"));
    }
  });

  ftpServer.listen().then(() => {
    console.log(`[odisea-ftp] FTP server listening on :${port}`);
  }).catch((err: unknown) => {
    console.error("[odisea-ftp] Failed to start FTP server:", err);
  });
};
