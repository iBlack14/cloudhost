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
