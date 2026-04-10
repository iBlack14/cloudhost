import { z } from "zod";

export const createWhmAccountSchema = z.object({
  domain: z.string().min(3).regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i),
  username: z.string().min(4).max(16).regex(/^[a-z0-9]+$/),
  password: z.string().min(8),
  email: z.string().email(),
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
