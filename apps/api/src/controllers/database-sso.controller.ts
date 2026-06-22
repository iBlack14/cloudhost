import type { Request, Response } from "express";
import { z } from "zod";
import crypto from "node:crypto";

import { consumeDatabaseSsoToken } from "../services/database-sso.service.js";
import { env } from "../config/env.js";

const querySchema = z.object({
  token: z.string().min(1, "Token requerido")
});

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderErrorPage = (message: string): string => `
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Odisea DB Access</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #07111d;
        color: #f8fafc;
        font-family: Arial, sans-serif;
      }
      main {
        width: min(92vw, 560px);
        padding: 32px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 24px;
        background: rgba(10, 20, 36, 0.92);
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
      }
      h1 {
        margin: 0 0 16px;
        font-size: 28px;
      }
      p {
        margin: 0;
        color: #cbd5e1;
        line-height: 1.6;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Acceso de base de datos no disponible</h1>
      <p>${escapeHtml(message)}</p>
    </main>
  </body>
</html>
`;

export const databaseSsoBridgeHandler = async (req: Request, res: Response): Promise<void> => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).type("html").send(renderErrorPage("Falta el token temporal de acceso."));
    return;
  }

  try {
    const context = await consumeDatabaseSsoToken(parsed.data.token);
    
    const jwtSecret = env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("El secreto JWT no está configurado en el servidor.");
    }

    // Encrypt the database credentials using AES-256-CBC
    const algorithm = "aes-256-cbc";
    const key = Buffer.from(jwtSecret, "hex");
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const payload = JSON.stringify({
      username: context.dbUser,
      password: context.password
    });
    
    let encrypted = cipher.update(payload, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    const ivHex = iv.toString("hex");

    const isProduction = env.NODE_ENV === "production";
    const phpMyAdminUrl = new URL(env.PHPMYADMIN_URL);
    
    // In production, Nginx proxies /phpmyadmin/ under the same domain
    const redirectBase = isProduction
      ? "/phpmyadmin"
      : phpMyAdminUrl.origin;

    const finalUrl = `${redirectBase}/signon.php?token=${encrypted}&iv=${ivHex}&db=${encodeURIComponent(context.dbName)}`;

    res.redirect(302, finalUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo iniciar la sesion temporal.";
    res.status(400).type("html").send(renderErrorPage(message));
  }
};

