import type { Request, Response } from "express";
import { getUserId } from "../../utils/get-user-id.js";
import * as databaseService from "../../services/odin/database.service.js";
import { issueDatabaseSsoLink } from "../../services/database-sso.service.js";

export const listDatabasesHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    const dbs = await databaseService.listUserDatabases(userId);
    return res.status(200).json({ success: true, data: dbs });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "Error al listar bases de datos" } });
  }
};

export const createDatabaseHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    const { name, password } = req.body;
    
    if (!name || !password) {
      return res.status(400).json({ success: false, error: { message: "Nombre y contraseña requeridos" } });
    }

    const created = await databaseService.createCustomDatabase(userId, name, password);
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "Error al crear base de datos" } });
  }
};

export const issueDatabaseSsoHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    const dbName = String(req.params.dbName ?? "");

    if (!dbName) {
      return res.status(400).json({ success: false, error: { message: "Base de datos requerida" } });
    }

    const protocol = req.get("x-forwarded-proto") ?? req.protocol;
    const host = req.get("host") ?? "localhost:3001";
    const publicBaseUrl = `${protocol}://${host}${req.baseUrl.replace(/\/odin-panel$/, "")}`;

    const data = await issueDatabaseSsoLink({
      dbName,
      userId,
      publicBaseUrl
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al emitir acceso temporal a phpMyAdmin";
    return res.status(400).json({ success: false, error: { message } });
  }
};

const databaseError = (res: Response, error: unknown): Response => {
  const message = error instanceof Error ? error.message : "Error al administrar el acceso remoto";
  return res.status(message.includes("no encontrado") ? 404 : 400).json({ success: false, error: { message } });
};

export const listRemoteHostsHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    const hosts = await databaseService.listRemoteHosts(userId);
    const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
    const requestHost = forwardedHost || req.hostname;
    const publicHost = databaseService.getRemoteDatabaseConnectionInfo(requestHost);
    return res.status(200).json({ success: true, data: { hosts, connection: publicHost } });
  } catch (error) {
    return databaseError(res, error);
  }
};

export const createRemoteHostHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    const host = String(req.body?.host ?? "");
    const name = String(req.body?.name ?? "");
    if (!host) return res.status(400).json({ success: false, error: { message: "La IP o rango es obligatorio" } });
    const created = await databaseService.createRemoteHost(userId, name, host);
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    return databaseError(res, error);
  }
};

export const updateRemoteHostHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    if (typeof req.body?.enabled !== "boolean") {
      return res.status(400).json({ success: false, error: { message: "El estado es obligatorio" } });
    }
    const updated = await databaseService.setRemoteHostEnabled(userId, String(req.params.id), req.body.enabled);
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return databaseError(res, error);
  }
};

export const deleteRemoteHostHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    await databaseService.deleteRemoteHost(userId, String(req.params.id));
    return res.status(200).json({ success: true, data: null });
  } catch (error) {
    return databaseError(res, error);
  }
};
