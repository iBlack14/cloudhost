import { z } from "zod";

export type UserRole = "admin" | "reseller" | "user";

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

// FIX: Consolidated schema (was duplicated in apps/whm and apps/odin-panel)
export const whmCreateAccountSchema = z.object({
  domain: z.string().min(3).regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, "Dominio inválido"),
  username: z.string().min(4).max(16).regex(/^[a-z0-9]+$/, "Solo letras minúsculas y números"),
  password: z.string()
    .min(12, "Mínimo 12 caracteres")
    .regex(/[A-Z]/, "Debe contener mayúsculas")
    .regex(/[0-9]/, "Debe contener números")
    .regex(/[!@#$%^&*]/, "Debe contener carácter especial"),
  email: z.string().email("Email inválido"),
  planId: z.string().uuid("Plan ID inválido").optional(),
  nameservers: z.object({
    inheritRoot: z.boolean(),
    ns1: z.string().optional(),
    ns2: z.string().optional(),
    ns3: z.string().optional(),
    ns4: z.string().optional()
  }),
  settings: z.object({
    phpVersion: z.enum(["7.4", "8.0", "8.1", "8.2", "8.3"]),
    shellAccess: z.boolean(),
    nodejsEnabled: z.boolean(),
    dockerEnabled: z.boolean()
  })
});

export type WhmCreateAccountInput = z.infer<typeof whmCreateAccountSchema>;

// Auth Schemas
export const loginSchema = z.object({
  username: z.string().min(3, "Usuario debe tener al menos 3 caracteres"),
  password: z.string().min(8, "Contraseña debe tener al menos 8 caracteres")
});

export type LoginInput = z.infer<typeof loginSchema>;

export const exchangeImpersonationSchema = z.object({
  token: z.string().min(1, "Token requerido")
});

export type ExchangeImpersonationInput = z.infer<typeof exchangeImpersonationSchema>;

// Result Types
export interface CreateWhmAccountResult {
  userId: string;
  accountId: string;
}

export interface WhmImpersonationResult {
  accountId: string;
  impersonateToken: string;
  odinPanelUrl: string;
}

export interface Plan {
  id: string;
  name: string;
  disk_quota_mb: number;
  bandwidth_mb: number;
}

export interface WhmAccountRow {
  account_id: string;
  user_id: string;
  username: string;
  email: string;
  domain: string;
  plan_name: string | null;
  status: "active" | "suspended" | "terminated";
  disk_used_mb: number;
  created_at: string;
}

export interface DomainRecord {
  id: string;
  domain_name: string;
  status: "active" | "pending_verification" | "offline" | string;
  dns_provider: string;
  ssl_enabled: boolean;
  verification?: {
    publicUrl?: string | null;
    dns?: {
      resolves: boolean;
      aRecords: string[];
      cnameRecords: string[];
      error?: string;
    };
  };
}

export interface WordPressSite {
  id: string;
  domain: string;
  site_title: string;
  wp_version: string;
  php_version: string;
  db_name: string;
  auto_updates: boolean;
  status: string;
  admin_url?: string;
  service_port?: number;
  container_name?: string;
}
