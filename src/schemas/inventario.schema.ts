import { z } from "zod";
import { TipoMovimientoInventario } from "@prisma/client";

const cantidad = z.coerce.number().finite().min(0).max(9999999.999);
const dinero = z.coerce.number().finite().min(0).max(999999999.99);

export const ingredienteSchema = z.object({
  nombre: z.string().trim().min(2).max(100),
  sku: z.string().trim().max(40).optional().or(z.literal("")),
  unidadMedida: z.string().trim().min(1).max(20),
  stockInicial: cantidad.default(0),
  stockMinimo: cantidad.default(0),
  costoUnitario: dinero.default(0),
});

export const movimientoInventarioSchema = z.object({
  ingredienteId: z.string().cuid(),
  tipo: z.nativeEnum(TipoMovimientoInventario).refine((tipo) => tipo === TipoMovimientoInventario.COMPRA || tipo === TipoMovimientoInventario.MERMA, "Movimiento no permitido"),
  cantidad: cantidad.positive("La cantidad debe ser mayor que cero"),
  costoUnitario: dinero.optional(),
  motivo: z.string().trim().min(3).max(180),
});

export const conteoInventarioSchema = z.object({
  ingredienteId: z.string().cuid(),
  cantidadFisica: cantidad,
  motivo: z.string().trim().min(3).max(180).default("Conteo físico"),
});

export const recetaSchema = z.object({
  platilloId: z.string().cuid(),
  ingredientes: z.array(z.object({ ingredienteId: z.string().cuid(), cantidad: cantidad.positive() })).min(1, "Agregue al menos un ingrediente"),
});

export type IngredienteInput = z.infer<typeof ingredienteSchema>;
export type MovimientoInventarioInput = z.infer<typeof movimientoInventarioSchema>;
export type ConteoInventarioInput = z.infer<typeof conteoInventarioSchema>;
export type RecetaInput = z.infer<typeof recetaSchema>;
