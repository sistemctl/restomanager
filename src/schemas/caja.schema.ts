import { z } from "zod";
import { MetodoPago, TipoMovimientoCaja } from "@prisma/client";

const money = z.coerce.number().finite().min(0).max(999999999.99);

export const abrirTurnoSchema = z.object({
  saldoInicial: money,
});

export const movimientoCajaSchema = z.object({
  tipo: z.nativeEnum(TipoMovimientoCaja),
  monto: money.positive("El monto debe ser mayor que cero"),
  concepto: z.string().trim().min(3, "Indique el concepto").max(160),
});

export const registrarPagoSchema = z.object({
  pedidoId: z.string().cuid(),
  comensal: z.coerce.number().int().positive().optional(),
  propina: money.default(0),
  pagos: z.array(z.object({
    metodoPago: z.nativeEnum(MetodoPago),
    monto: money.positive("Cada pago debe ser mayor que cero"),
    referencia: z.string().trim().max(100).optional(),
  })).min(1, "Agregue al menos un medio de pago"),
});

export const cerrarTurnoSchema = z.object({
  montoReal: money,
  ciego: z.boolean().default(false),
  observaciones: z.string().trim().max(500).optional(),
});

export type AbrirTurnoInput = z.infer<typeof abrirTurnoSchema>;
export type MovimientoCajaInput = z.infer<typeof movimientoCajaSchema>;
export type RegistrarPagoInput = z.infer<typeof registrarPagoSchema>;
export type CerrarTurnoInput = z.infer<typeof cerrarTurnoSchema>;
