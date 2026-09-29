import { z } from "zod";
import { TipoMovimientoCuenta } from "@prisma/client";

const money = z.coerce.number().finite().min(0).max(999999999.99);

export const clienteSchema = z.object({
  nombre: z.string().trim().min(2).max(120), email: z.string().email().optional().or(z.literal("")), telefono: z.string().trim().max(30).optional(), documento: z.string().trim().max(40).optional(), direccion: z.string().trim().max(180).optional(), descuentoFijo: z.coerce.number().min(0).max(100).optional(),
});
export const proveedorSchema = z.object({
  nombre: z.string().trim().min(2).max(120), contacto: z.string().trim().max(100).optional(), telefono: z.string().trim().max(30).optional(), email: z.string().email().optional().or(z.literal("")), direccion: z.string().trim().max(180).optional(), categoria: z.string().trim().max(80).optional(),
});
export const movimientoCuentaSchema = z.object({ entidadId: z.string().cuid(), tipo: z.nativeEnum(TipoMovimientoCuenta), monto: money.positive(), concepto: z.string().trim().min(3).max(180) });
export const categoriaGastoSchema = z.object({ nombre: z.string().trim().min(2).max(80) });
export const gastoSchema = z.object({ categoriaId: z.string().cuid(), proveedorId: z.string().cuid().optional().or(z.literal("")), descripcion: z.string().trim().min(3).max(180), monto: money.positive(), fecha: z.string().min(1), pagado: z.boolean(), fechaVencimiento: z.string().optional().or(z.literal("")) });

export type ClienteInput = z.infer<typeof clienteSchema>;
export type ProveedorInput = z.infer<typeof proveedorSchema>;
export type MovimientoCuentaInput = z.infer<typeof movimientoCuentaSchema>;
export type GastoInput = z.infer<typeof gastoSchema>;
