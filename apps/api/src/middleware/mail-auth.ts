import type { NextFunction, Request, Response } from "express";

import { verifyAuthToken } from "../utils/jwt.js";

const getBearerToken = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token;
};

export const requireMailAuth = (req: Request, res: Response, next: NextFunction): void => {
  const bearerToken = getBearerToken(req.header("authorization"));

  if (!bearerToken) {
    res.status(401).json({
      success: false,
      error: { code: "MAIL_AUTH_REQUIRED", message: "Sesión de mail requerida" }
    });
    return;
  }

  try {
    const payload = verifyAuthToken(bearerToken);

    if (payload.tokenType !== "mail_session") {
      res.status(401).json({
        success: false,
        error: { code: "INVALID_MAIL_SESSION", message: "Token de mail inválido" }
      });
      return;
    }

    req.auth = payload;
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: { code: "MAIL_AUTH_INVALID", message: "Sesión de mail inválida o expirada" }
    });
  }
};
