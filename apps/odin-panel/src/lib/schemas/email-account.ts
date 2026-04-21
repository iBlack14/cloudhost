import { z } from "zod";

export const createEmailAccountSchema = z
  .object({
    domain: z.string().min(1, "Selecciona un dominio."),
    username: z
      .string()
      .min(1, "Ingresa un nombre de usuario.")
      .regex(/^[a-z0-9._-]+$/i, "Usa solo letras, números, puntos, guiones o guiones bajos."),
    password: z.string().min(10, "La contraseña debe tener al menos 10 caracteres."),
    quotaMb: z.number().int().positive().nullable(),
    sendLoginLink: z.boolean(),
    alternateEmail: z.string().email("Ingresa un email alterno válido.").or(z.literal("")),
    stayOnPage: z.boolean()
  })
  .superRefine((input, ctx) => {
    if (input.sendLoginLink && !input.alternateEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["alternateEmail"],
        message: "Ingresa un email alterno para enviar el login link."
      });
    }
  });

export type CreateEmailAccountInput = z.infer<typeof createEmailAccountSchema>;
