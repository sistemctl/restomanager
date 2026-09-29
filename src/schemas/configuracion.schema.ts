import { z } from "zod";

export const configuracionSchema = z.object({
  marcaSistema: z.string().trim().min(1, "Escribe el nombre de la marca").max(40),
  subtituloSistema: z.string().trim().max(50),
  nombreRestaurante: z
    .string()
    .min(2, "El nombre del restaurante debe tener al menos 2 caracteres"),
  razonSocial: z.string().optional().or(z.literal("")),
  identificacionTributaria: z.string().optional().or(z.literal("")),
  telefono: z.string().optional().or(z.literal("")),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  direccion: z.string().optional().or(z.literal("")),
  ciudad: z.string().optional().or(z.literal("")),
  moneda: z.string().min(1, "Debe especificar la moneda"),
  simboloMoneda: z.string().min(1, "Debe especificar el símbolo"),
  porcentajeImpuesto: z.coerce
    .number()
    .min(0, "El porcentaje no puede ser negativo")
    .max(100, "El porcentaje no puede superar 100"),
  aplicarImpuesto: z.boolean().default(true),
  impuestoIncluido: z.boolean().default(true),
  propinaSugerida: z.coerce
    .number()
    .min(0, "La propina no puede ser negativa")
    .max(100, "La propina no puede superar 100"),
  habilitarPropina: z.boolean().default(true),
  mensajeTicket: z.string().optional().or(z.literal("")),
  kdsAlertaAmarillaMinutos: z.coerce
    .number()
    .min(1, "Mínimo 1 minuto")
    .max(120, "Máximo 120 minutos"),
  kdsAlertaRojaMinutos: z.coerce
    .number()
    .min(2, "Mínimo 2 minutos")
    .max(240, "Máximo 240 minutos"),
});

export type ConfiguracionFormData = z.infer<typeof configuracionSchema>;
