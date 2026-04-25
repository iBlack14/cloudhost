import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  JWT_SECRET: z.string().min(32), // FIX: Aumentado de 16 a 32 por seguridad
  DATABASE_URL: z.string().url(),
  ODIN_PANEL_URL: z.string().url().default("http://localhost:3003"),
  WEBMAIL_URL: z.string().url().default("http://localhost:3007"),
  WEBMAIL_INTERNAL_PORT: z.coerce.number().int().positive().default(3007),
  PHPMYADMIN_URL: z.string().url().default("http://localhost:8080"),
  IMPERSONATE_EXPIRES_IN: z.string().default("2h"),
  MAIL_SSO_EXPIRES_IN: z.string().default("60s"),
  MAIL_SESSION_EXPIRES_IN: z.string().default("12h"),
  DATABASE_SSO_EXPIRES_IN: z.string().default("60s"),
  MYSQL_CONTAINER_NAME: z.string().default("odisea-mysql"),
  MYSQL_ROOT_PASSWORD: z.string().default("root"),
  MYSQL_HOST_PORT: z.coerce.number().int().positive().default(3307),
  CORS_ORIGIN: z.string().default("*")
});

export const env = envSchema.parse(process.env);
