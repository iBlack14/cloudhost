import type { Request, Response } from "express";
import { z } from "zod";
import { db } from "../../config/db.js";
import { getUserId } from "../../utils/get-user-id.js";
import * as phpService from "../../services/odin/php.service.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getAccountInfo = async (userId: string) => {
  const result = await db.query(
    `SELECT ha.id, ha.php_version, ha.domain, u.username
     FROM hosting_accounts ha
     INNER JOIN users u ON u.id = ha.user_id
     WHERE ha.user_id = $1
     LIMIT 1`,
    [userId]
  );
  if (result.rowCount === 0) throw new Error("Cuenta de hosting no encontrada");
  return result.rows[0] as {
    id: string;
    php_version: string;
    domain: string;
    username: string;
  };
};

const getPhpIni = async (accountId: string): Promise<Record<string, string>> => {
  const result = await db.query(
    `SELECT php_ini FROM php_configurations WHERE account_id = $1 LIMIT 1`,
    [accountId]
  );
  return result.rows[0]?.php_ini ?? {};
};

// ─── GET /odin-panel/php/versions ────────────────────────────────────────────
/** Returns which PHP versions are installed on this server */
export const getVersionsHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const installed = await phpService.getInstalledVersions();
    const statuses = await Promise.all(
      phpService.SUPPORTED_PHP_VERSIONS.map(async (v) => ({
        version: v,
        installed: installed.includes(v),
        status: await phpService.getFpmStatus(v),
        extensions: phpService.PHP_EXTENSIONS[v] ?? [],
      }))
    );

    return res.status(200).json({ success: true, data: statuses });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: "Error al obtener versiones PHP disponibles" },
    });
  }
};

// ─── GET /odin-panel/php/current ─────────────────────────────────────────────
/** Returns the current PHP config for the logged-in user's account */
export const getCurrentPhpHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    const account = await getAccountInfo(userId);
    const phpIni = await getPhpIni(account.id);
    const activeExtensions = await phpService.getActiveExtensions(
      account.php_version as phpService.PHPVersion
    );

    return res.status(200).json({
      success: true,
      data: {
        currentVersion: account.php_version,
        domain: account.domain,
        phpIni,
        activeExtensions,
        availableVersions: phpService.SUPPORTED_PHP_VERSIONS,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: error instanceof Error ? error.message : "Error al obtener PHP actual" },
    });
  }
};

// ─── PATCH /odin-panel/php/version ───────────────────────────────────────────
/** Changes the active PHP version for the user's account */
export const changeVersionHandler = async (req: Request, res: Response): Promise<Response> => {
  const schema = z.object({
    version: z.enum(["8.1", "8.2", "8.3", "8.4", "8.5"]),
  });

  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    return res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Versión PHP inválida", details: parse.error.flatten() },
    });
  }

  try {
    const userId = await getUserId(req);
    const account = await getAccountInfo(userId);
    const phpIni = await getPhpIni(account.id);

    const result = await phpService.changeAccountPhpVersion(
      account.username,
      parse.data.version,
      account.domain,
      phpIni
    );

    // Update BD
    await db.query(
      `UPDATE hosting_accounts SET php_version = $1 WHERE id = $2`,
      [parse.data.version, account.id]
    );

    // Upsert php_configurations
    await db.query(
      `INSERT INTO php_configurations (account_id, php_version, is_active, updated_at)
       VALUES ($1, $2, true, NOW())
       ON CONFLICT (account_id) DO UPDATE SET php_version = $2, is_active = true, updated_at = NOW()`,
      [account.id, parse.data.version]
    );

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: error instanceof Error ? error.message : "Error al cambiar versión PHP" },
    });
  }
};

// ─── GET /odin-panel/php/ini ──────────────────────────────────────────────────
export const getPhpIniHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    const account = await getAccountInfo(userId);
    const phpIni = await getPhpIni(account.id);

    return res.status(200).json({ success: true, data: phpIni });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: "Error al obtener configuración php.ini" },
    });
  }
};

// ─── PATCH /odin-panel/php/ini ────────────────────────────────────────────────
const allowedIniKeys = [
  "memory_limit",
  "upload_max_filesize",
  "post_max_size",
  "max_execution_time",
  "max_input_time",
  "date.timezone",
] as const;

export const updatePhpIniHandler = async (req: Request, res: Response): Promise<Response> => {
  const schema = z.object({
    memory_limit:        z.string().optional(),
    upload_max_filesize: z.string().optional(),
    post_max_size:       z.string().optional(),
    max_execution_time:  z.string().optional(),
    max_input_time:      z.string().optional(),
    "date.timezone":     z.string().optional(),
  });

  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    return res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Opciones php.ini inválidas" },
    });
  }

  try {
    const userId = await getUserId(req);
    const account = await getAccountInfo(userId);

    // Strip undefined values
    const safeOptions = Object.fromEntries(
      Object.entries(parse.data).filter(([_, v]) => v !== undefined)
    ) as Record<string, string>;

    // Upsert php_configurations with new ini
    await db.query(
      `INSERT INTO php_configurations (account_id, php_version, php_ini, is_active, updated_at)
       VALUES ($1, $2, $3::jsonb, true, NOW())
       ON CONFLICT (account_id) DO UPDATE SET php_ini = $3::jsonb, updated_at = NOW()`,
      [account.id, account.php_version, JSON.stringify(safeOptions)]
    );

    // Re-generate FPM pool with new ini
    await phpService.writeFpmPool(
      account.username,
      account.php_version as phpService.PHPVersion,
      safeOptions
    );
    await phpService.reloadFpm(account.php_version as phpService.PHPVersion);

    return res.status(200).json({ success: true, data: safeOptions });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: "Error al actualizar php.ini" },
    });
  }
};

// ─── GET /odin-panel/php/extensions ──────────────────────────────────────────
export const getExtensionsHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    const account = await getAccountInfo(userId);
    const active = await phpService.getActiveExtensions(
      account.php_version as phpService.PHPVersion
    );

    return res.status(200).json({
      success: true,
      data: {
        version: account.php_version,
        active,
        available: phpService.PHP_EXTENSIONS[account.php_version] ?? [],
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: "Error al obtener extensiones PHP" },
    });
  }
};

// ─── WHM: GET /whm/php/status ─────────────────────────────────────────────────
export const whmPhpStatusHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const statuses = await Promise.all(
      phpService.SUPPORTED_PHP_VERSIONS.map(async (v) => ({
        version: v,
        status: await phpService.getFpmStatus(v),
        extensions: phpService.PHP_EXTENSIONS[v] ?? [],
        installed: await phpService.isVersionInstalled(v),
      }))
    );

    return res.status(200).json({ success: true, data: statuses });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: "Error al obtener estado PHP global" },
    });
  }
};

// ─── WHM: GET /whm/php/accounts ───────────────────────────────────────────────
export const whmPhpAccountsHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const result = await db.query(
      `SELECT u.username, ha.domain, ha.php_version, ha.id as account_id
       FROM hosting_accounts ha
       INNER JOIN users u ON u.id = ha.user_id
       ORDER BY u.username`
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: "Error al listar versiones PHP de cuentas" },
    });
  }
};

// ─── WHM: PATCH /whm/php/accounts/:accountId ──────────────────────────────────
export const whmChangeAccountPhpHandler = async (req: Request, res: Response): Promise<Response> => {
  const schema = z.object({ version: z.enum(["8.1", "8.2", "8.3", "8.4", "8.5"]) });
  const parse = schema.safeParse(req.body);

  if (!parse.success) {
    return res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Versión PHP inválida" },
    });
  }

  try {
    const { accountId } = req.params;
    const accountResult = await db.query(
      `SELECT ha.id, ha.domain, u.username
       FROM hosting_accounts ha
       INNER JOIN users u ON u.id = ha.user_id
       WHERE ha.id = $1`,
      [accountId]
    );
    if (accountResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: { message: "Cuenta no encontrada" } });
    }
    const account = accountResult.rows[0];

    const result = await phpService.changeAccountPhpVersion(
      account.username,
      parse.data.version,
      account.domain
    );

    await db.query(
      `UPDATE hosting_accounts SET php_version = $1 WHERE id = $2`,
      [parse.data.version, accountId]
    );

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: error instanceof Error ? error.message : "Error al cambiar PHP" },
    });
  }
};

// ─── WHM: POST /whm/php/reload/:version ───────────────────────────────────────
export const whmReloadFpmHandler = async (req: Request, res: Response): Promise<Response> => {
  const { version } = req.params;
  if (!phpService.SUPPORTED_PHP_VERSIONS.includes(version as phpService.PHPVersion)) {
    return res.status(422).json({ success: false, error: { message: "Versión inválida" } });
  }

  try {
    await phpService.reloadFpm(version as phpService.PHPVersion);
    return res.status(200).json({ success: true, data: { message: `php${version}-fpm recargado` } });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: `Error al recargar php${version}-fpm` },
    });
  }
};
