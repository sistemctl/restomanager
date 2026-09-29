import { z } from "zod";

export const descuentoPedidoSchema = z.object({
  pedidoId: z.string().cuid(),
  tipo: z.enum(["PORCENTAJE", "FIJO"]),
  valor: z.coerce.number().finite().positive().max(999999999.99),
});

export const trasladoConsumosSchema = z.object({
  pedidoId: z.string().cuid(),
  mesaDestinoId: z.string().cuid(),
  detalleIds: z.array(z.string().cuid()).min(1, "Seleccione al menos un consumo"),
});

export type DescuentoPedidoInput = z.infer<typeof descuentoPedidoSchema>;
export type TrasladoConsumosInput = z.infer<typeof trasladoConsumosSchema>;
