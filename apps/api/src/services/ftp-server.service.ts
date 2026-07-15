import { FtpSrv, FileSystem } from "ftp-srv";
import { db } from "../config/db.js";
import { decryptSecret } from "../utils/secret.js";
import path from "node:path";
import os from "node:os";

const getBaseUserPath = async (userId: string): Promise<string> => {
  const userResult = await db.query("SELECT username FROM users WHERE id = $1", [userId]);
  if (userResult.rowCount === 0) throw new Error("Usuario no encontrado");
  const username = userResult.rows[0].username.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  if (process.platform === "win32") {
    return path.join(process.cwd(), ".odin-home", username);
  }
  return path.join("/home", username);
};

export const startFtpServer = async () => {
  // Use port 2121 to avoid requiring root, or 21 if running as root
  const port = process.env.FTP_PORT || 2121;
  
  let pasvUrl = process.env.FTP_PASV_URL;
  if (!pasvUrl) {
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const data = await res.json();
      pasvUrl = data.ip;
      console.log(`[odisea-ftp] Detected public IP for PASV: ${pasvUrl}`);
    } catch (e) {
      pasvUrl = "127.0.0.1";
    }
  }

  const ftpServer = new FtpSrv({
    url: `ftp://0.0.0.0:${port}`,
    anonymous: false,
    pasv_url: pasvUrl,
    pasv_min: 10000,
    pasv_max: 10010
  });

  ftpServer.on("login", async (data, resolve, reject) => {
    try {
      const { username, password } = data;
      
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
      
      // The account.path is relative to the base path, e.g. "/public_html" or "/"
      let targetPath = basePath;
      if (account.path && account.path !== "/") {
        // Prevent path traversal
        const normalizedPath = path.normalize(account.path).replace(/^(\.\.[\/\\])+/, "");
        targetPath = path.join(basePath, normalizedPath);
      }

      // Important: targetPath must be within basePath to prevent escaping
      if (!targetPath.startsWith(basePath)) {
        return reject(new Error("Ruta de acceso inválida"));
      }

      return resolve({ root: targetPath });
    } catch (err) {
      console.error("[FTP Server] Login error:", err);
      return reject(new Error("Error interno del servidor FTP"));
    }
  });

  ftpServer.listen().then(() => {
    console.log(`[odisea-ftp] FTP server listening on :${port}`);
  }).catch((err: any) => {
    console.error("[odisea-ftp] Failed to start FTP server:", err);
  });
};
