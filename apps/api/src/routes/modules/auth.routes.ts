import { Router } from "express";
import { z } from "zod";
import { db } from "../../config/db.js";
import { verifyPassword } from "../../utils/hash-password.js";
import { signAccessToken, verifyAuthToken, type AuthRole } from "../../utils/jwt.js";

import { loginSchema, exchangeImpersonationSchema } from "../../../../../packages/types/src/index.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Payload inválido" }
    });
  }

  try {
    const userResult = await db.query<{
      id: string;
      username: string;
      role: AuthRole;
      status: "active" | "suspended" | "terminated";
      password_hash: string;
    }>(
      "SELECT id, username, role, status, password_hash FROM users WHERE username = $1 LIMIT 1",
      [parsed.data.username]
    );

    if (userResult.rowCount === 0) {
      return res.status(401).json({
        success: false,
        error: { code: "AUTH_FAILED", message: "Usuario o contraseña incorrectos" }
      });
    }

    const user = userResult.rows[0];
    const isPasswordValid = verifyPassword(parsed.data.password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: { code: "AUTH_FAILED", message: "Usuario o contraseña incorrectos" }
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        error: { code: "ACCOUNT_DISABLED", message: "La cuenta está suspendida o inactiva" }
      });
    }

    const token = signAccessToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      tokenType: "access"
    });

    return res.status(200).json({
      success: true,
      data: {
        token,
        role: user.role,
        redirectTo: user.role === "user" ? "/" : "/whm"
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Error en login" }
    });
  }
});

authRouter.post("/impersonate/exchange", (req, res) => {
  const parsed = exchangeImpersonationSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Token de impersonación inválido" }
    });
  }

  try {
    const payload = verifyAuthToken(parsed.data.token);

    if (payload.tokenType !== "impersonation") {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_TOKEN_TYPE", message: "Se requiere token de impersonación" }
      });
    }

    const accessToken = signAccessToken({
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
      tokenType: "access"
    });

    return res.status(200).json({
      success: true,
      data: {
        token: accessToken,
        role: payload.role
      }
    });
  } catch {
    return res.status(401).json({
      success: false,
      error: { code: "AUTH_INVALID", message: "Token de impersonación inválido o expirado" }
    });
  }
});
