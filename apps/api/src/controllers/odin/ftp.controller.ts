import type { Request, Response } from "express";
import { z } from "zod";
import * as ftpService from "../../services/odin/ftp.service.js";
import { getUserId } from "../../utils/get-user-id.js";

export const listFtpAccountsHandler = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    const accounts = await ftpService.listFtpAccounts(userId);
    return res.status(200).json({ success: true, data: accounts });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: error instanceof Error ? error.message : "Error al listar cuentas FTP" },
    });
  }
};

export const createFtpAccountHandler = async (req: Request, res: Response) => {
  const schema = z.object({
    username: z.string().min(3).max(30),
    password: z.string().min(8),
    path: z.string().default("/")
  });

  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({
      success: false,
      error: { message: "Datos inválidos", code: "VALIDATION_ERROR" },
    });
  }

  try {
    const userId = await getUserId(req);
    const account = await ftpService.createFtpAccount(
      userId,
      parse.data.username,
      parse.data.password,
      parse.data.path
    );
    return res.status(201).json({ success: true, data: account });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: error instanceof Error ? error.message : "Error al crear cuenta FTP" },
    });
  }
};

export const deleteFtpAccountHandler = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    const accountId = req.params.id as string;
    if (!accountId) throw new Error("ID de cuenta requerido");
    
    await ftpService.deleteFtpAccount(userId, accountId);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: error instanceof Error ? error.message : "Error al eliminar cuenta FTP" },
    });
  }
};

export const updateFtpPasswordHandler = async (req: Request, res: Response) => {
  const schema = z.object({
    password: z.string().min(8)
  });

  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({
      success: false,
      error: { message: "Contraseña inválida", code: "VALIDATION_ERROR" },
    });
  }

  try {
    const userId = await getUserId(req);
    const accountId = req.params.id as string;
    if (!accountId) throw new Error("ID de cuenta requerido");
    
    await ftpService.updateFtpPassword(userId, accountId, parse.data.password);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: error instanceof Error ? error.message : "Error al actualizar contraseña FTP" },
    });
  }
};
