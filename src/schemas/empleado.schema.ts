import { z } from "zod";
import { Rol } from "@prisma/client";

export const empleadoFormSchema = z.object({
  nombre: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "Nombre demasiado largo"),
  email: z
    .string()
    .email("Email inválido")
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .optional()
    .or(z.literal("")),
  pin: z
    .string()
    .regex(/^\d{4}$/, "El PIN debe tener exactamente 4 dígitos numéricos")
    .optional()
    .or(z.literal("")),
  rol: z.nativeEnum(Rol),
  activo: z.boolean().default(true),
  quitarPin: z.boolean().optional(),
});

export type EmpleadoFormData = z.infer<typeof empleadoFormSchema>;
