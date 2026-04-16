import { z } from "zod";

export const createWhmAccountSchema = z.object({
  domain: z.string().min(3, "Ingresa un dominio válido").regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, "Formato de dominio inválido"),
  username: z
    .string()
    .min(4, "El usuario debe tener mínimo 4 caracteres")
    .max(16, "El usuario no puede tener más de 16 caracteres")
    .regex(/^[a-z0-9]+$/, "El usuario solo permite letras minúsculas y números"),
  password: z
    .string()
    .min(12, "La contraseña debe tener mínimo 12 caracteres")
    .regex(/[A-Z]/, "La contraseña debe incluir al menos una mayúscula")
    .regex(/[0-9]/, "La contraseña debe incluir al menos un número")
    .regex(/[!@#$%^&*]/, "La contraseña debe incluir al menos un carácter especial (!@#$%^&*)"),
  email: z.string().email("Correo electrónico inválido"),
  planId: z.string().uuid().optional(),
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

export type CreateWhmAccountDto = z.infer<typeof createWhmAccountSchema>;
