import { Router } from "express";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { scryptSync, timingSafeEqual } from "crypto";
import { env } from "../../config/env.js";
import { db } from "../../config/db.js";

const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8)
});

const comparePassword = (password: string, hash: string): boolean => {
  const [salt, digest] = hash.split(':');
  const computedDigest = scryptSync(password, salt, 64).toString('hex');
  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(computedDigest));
  } catch {
    return false;
  }
};

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
    const userResult = await db.query(
      "SELECT id, email, role, password_hash FROM users WHERE username = $1 LIMIT 1",
      [parsed.data.username]
    );

    if (userResult.rowCount === 0) {
      return res.status(401).json({
        success: false,
        error: { code: "AUTH_FAILED", message: "Usuario o contraseña incorrectos" }
      });
    }

    const user = userResult.rows[0];
    const isPasswordValid = comparePassword(parsed.data.password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: { code: "AUTH_FAILED", message: "Usuario o contraseña incorrectos" }
      });
    }

    // FIX: Generar JWT real en vez de mock-token
    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role
      },
      env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.status(200).json({
      success: true,
      data: {
        token,
        role: user.role,
        redirectTo: user.role === "admin" ? "/whm/dashboard" : "/odin-panel/dashboard"
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
