import type { Request, Response } from "express";
import { z } from "zod";

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

export const databaseSsoBridgeHandler = async (req: Request, res: Response): Promise<Response> => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).type("html").send(renderErrorPage("Falta el token temporal de acceso."));
  }

  try {
    const context = await consumeDatabaseSsoToken(parsed.data.token);
    const phpMyAdminUrl = new URL(env.PHPMYADMIN_URL);
    const actionUrl = `${phpMyAdminUrl.origin}/index.php?route=/`;
    const target = `index.php?route=/database/structure&db=${encodeURIComponent(context.dbName)}`;

    const html = `
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
        margin: 0 0 16px;
        color: #cbd5e1;
        line-height: 1.6;
      }
      button {
        margin-top: 12px;
        border: 0;
        border-radius: 999px;
        background: #12b5ff;
        color: #04111d;
        font-weight: 700;
        padding: 12px 18px;
        cursor: pointer;
      }
    </style>
  </head>
  <body onload="document.getElementById('odin-db-sso-form')?.submit()">
    <main>
      <h1>Abriendo phpMyAdmin</h1>
      <p>Estamos iniciando una sesion temporal para <strong>${escapeHtml(context.dbName)}</strong>.</p>
      <p>Si tu navegador bloquea el envio automatico, usa el boton manual.</p>
      <form id="odin-db-sso-form" action="${escapeHtml(actionUrl)}" method="post">
        <input type="hidden" name="pma_username" value="${escapeHtml(context.dbUser)}" />
        <input type="hidden" name="pma_password" value="${escapeHtml(context.password)}" />
        <input type="hidden" name="server" value="1" />
        <input type="hidden" name="target" value="${escapeHtml(target)}" />
        <button type="submit">Entrar ahora</button>
      </form>
    </main>
  </body>
</html>
    `;

    return res.status(200).type("html").send(html);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo iniciar la sesion temporal.";
    return res.status(400).type("html").send(renderErrorPage(message));
  }
};
