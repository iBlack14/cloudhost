import type { NextFunction, Request, Response } from "express";

import { verifyAuthToken, type AuthRole } from "../utils/jwt.js";

interface RequireAuthOptions {
  roles?: AuthRole[];
}

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

export const requireAuth =
  ({ roles }: RequireAuthOptions = {}) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const bearerToken = getBearerToken(req.header("authorization"));

    if (!bearerToken) {
      res.status(401).json({
        success: false,
        error: { code: "AUTH_REQUIRED", message: "Token de autenticación requerido" }
      });
      return;
    }

    try {
      const payload = verifyAuthToken(bearerToken);

      if (payload.tokenType !== "access" && payload.tokenType !== "impersonation") {
        res.status(401).json({
          success: false,
          error: { code: "AUTH_INVALID", message: "Token inválido o expirado" }
        });
        return;
      }

      req.auth = payload;

      if (roles && !roles.includes(payload.role)) {
        res.status(403).json({
          success: false,
          error: { code: "FORBIDDEN", message: "No tienes permisos para este recurso" }
        });
        return;
      }

      next();
    } catch {
      res.status(401).json({
        success: false,
        error: { code: "AUTH_INVALID", message: "Token inválido o expirado" }
      });
    }
  };
