import { Router } from "express";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8)
});

export const authRouter = Router();

authRouter.post("/login", (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Payload inválido" }
    });
  }

  const isAdmin = parsed.data.username.toLowerCase() === "admin";

  return res.status(200).json({
    success: true,
    data: {
      token: "mock-token",
      role: isAdmin ? "admin" : "user",
      redirectTo: isAdmin ? "/whm/dashboard" : "/odin-panel/dashboard"
    }
  });
});
