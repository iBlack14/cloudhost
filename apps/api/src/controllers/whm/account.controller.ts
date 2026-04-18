import type { Request, Response } from "express";
import { z } from "zod";

import { whmCreateAccountSchema } from "@odisea/types";
import {
  createWhmAccount,
  impersonateWhmAccount,
  listWhmAccounts,
  listWhmPlans,
  resumeWhmAccount,
  suspendWhmAccount
} from "../../services/whm/account.service.js";

const accountIdParamSchema = z.object({
  accountId: z.string().uuid()
});

export const createWhmAccountHandler = async (req: Request, res: Response): Promise<Response> => {
  const parsed = whmCreateAccountSchema.safeParse(req.body);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return res.status(422).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: firstIssue?.message ?? "Datos inválidos",
        details: parsed.error.flatten()
      }
    });
  }

  try {
    const data = await createWhmAccount(parsed.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && error.message === "PLAN_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        error: { code: "PLAN_NOT_FOUND", message: "Plan no encontrado" }
      });
    }

    const dbError = error as { code?: string; detail?: string };

    if (dbError.code === "23505") {
      return res.status(409).json({
        success: false,
        error: {
          code: "RESOURCE_CONFLICT",
          message: "Username, email o dominio ya existe",
          details: dbError.detail
        }
      });
    }

    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "No se pudo crear la cuenta" }
    });
  }
};

export const listWhmPlansHandler = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const plans = await listWhmPlans();
    return res.status(200).json({ success: true, data: plans });
  } catch {
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "No se pudieron obtener los planes" }
    });
  }
};

export const listWhmAccountsHandler = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const accounts = await listWhmAccounts();
    return res.status(200).json({ success: true, data: accounts });
  } catch {
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "No se pudieron listar las cuentas" }
    });
  }
};

export const suspendWhmAccountHandler = async (req: Request, res: Response): Promise<Response> => {
  const parsed = accountIdParamSchema.safeParse(req.params);

  if (!parsed.success) {
    return res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "accountId inválido" }
    });
  }

  try {
    await suspendWhmAccount(parsed.data.accountId);
    return res.status(200).json({ success: true, data: { accountId: parsed.data.accountId, status: "suspended" } });
  } catch (error) {
    if (error instanceof Error && error.message === "ACCOUNT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        error: { code: "ACCOUNT_NOT_FOUND", message: "Cuenta no encontrada" }
      });
    }

    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "No se pudo suspender la cuenta" }
    });
  }
};

export const resumeWhmAccountHandler = async (req: Request, res: Response): Promise<Response> => {
  const parsed = accountIdParamSchema.safeParse(req.params);

  if (!parsed.success) {
    return res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "accountId inválido" }
    });
  }

  try {
    await resumeWhmAccount(parsed.data.accountId);
    return res.status(200).json({ success: true, data: { accountId: parsed.data.accountId, status: "active" } });
  } catch (error) {
    if (error instanceof Error && error.message === "ACCOUNT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        error: { code: "ACCOUNT_NOT_FOUND", message: "Cuenta no encontrada" }
      });
    }

    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "No se pudo reactivar la cuenta" }
    });
  }
};

export const impersonateWhmAccountHandler = async (req: Request, res: Response): Promise<Response> => {
  const parsed = accountIdParamSchema.safeParse(req.params);

  if (!parsed.success) {
    return res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "accountId inválido" }
    });
  }

  try {
    const data = await impersonateWhmAccount(parsed.data.accountId, "whm-admin");
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[whm:impersonate:error]", error);

    if (error instanceof Error && error.message === "ACCOUNT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        error: { code: "ACCOUNT_NOT_FOUND", message: "Cuenta no encontrada" }
      });
    }

    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "No se pudo iniciar impersonación" }
    });
  }
};
