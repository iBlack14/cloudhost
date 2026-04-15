import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  JWT_SECRET: z.string().min(32), // FIX: Aumentado de 16 a 32 por seguridad
  DATABASE_URL: z.string().url(),
  ODIN_PANEL_URL: z.string().url().default("http://localhost:3003"),
  IMPERSONATE_EXPIRES_IN: z.string().default("2h")
});

export const env = envSchema.parse(process.env);
