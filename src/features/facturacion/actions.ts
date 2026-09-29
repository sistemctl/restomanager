"use server";

import { revalidatePath } from "next/cache";
import { EstadoMesa, EstadoPedido, Prisma, Rol, TipoPedido } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuthRoles } from "@/lib/auth-helpers";
import type { ActionResult } from "@/features/menu/actions";
import { descuentoPedidoSchema, trasladoConsumosSchema, type DescuentoPedidoInput, type TrasladoConsumosInput } from "@/schemas/facturacion.schema";

const ROLES_FACTURACION = [Rol.ADMIN, Rol.CAJERO];
const dinero = (valor: number) => new Prisma.Decimal(valor.toFixed(2));

async function calcularTotales(tx: Prisma.TransactionClient, pedidoId: string, descuento: number) {
  const [detalles, config] = await Promise.all([
    tx.detallePedido.findMany({ where: { pedidoId }, select: { subtotal: true } }),
    tx.configuracion.findFirst(),
  ]);
  const bruto = detalles.reduce((sum, detalle) => sum + Number(detalle.subtotal), 0);
  const descuentoAplicado = Math.min(Math.max(descuento, 0), bruto);
  const base = bruto - descuentoAplicado;
  const tasa = Number(config?.porcentajeImpuesto ?? 19) / 100;
  let subtotal = base;
  let impuesto = 0;
  let total = base;
  if (config?.aplicarImpuesto ?? true) {
    if (config?.impuestoIncluido ?? true) {
      impuesto = base - base / (1 + tasa);
      subtotal = base - impuesto;
    } else {
      impuesto = base * tasa;
      total = base + impuesto;
    }
  }
  await tx.pedido.update({ where: { id: pedidoId }, data: { subtotal: dinero(subtotal), descuento: dinero(descuentoAplicado), impuesto: dinero(impuesto), total: dinero(total) } });
}

export async function aplicarDescuentoAction(data: DescuentoPedidoInput): Promise<ActionResult> {
  try {
    await requireAuthRoles(ROLES_FACTURACION);
    const parsed = descuentoPedidoSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };
    return await prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.findUnique({ where: { id: parsed.data.pedidoId }, include: { detalles: true, pagos: true } });
      if (!pedido || pedido.estado === EstadoPedido.CANCELADO || pedido.estado === EstadoPedido.COMPLETADO) return { success: false, error: "Pedido no disponible para descuento" };
      if (pedido.pagos.length) return { success: false, error: "No se puede modificar el descuento después de iniciar pagos parciales" };
      const bruto = pedido.detalles.reduce((sum, detalle) => sum + Number(detalle.subtotal), 0);
      const descuento = parsed.data.tipo === "PORCENTAJE" ? bruto * parsed.data.valor / 100 : parsed.data.valor;
      if (descuento >= bruto) return { success: false, error: "El descuento debe ser menor al valor del pedido" };
      await calcularTotales(tx, pedido.id, descuento);
      revalidatePath("/caja"); revalidatePath("/pos"); revalidatePath(`/precuenta/${pedido.id}`);
      return { success: true, message: "Descuento aplicado" };
    });
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "No se pudo aplicar el descuento" };
  }
}

export async function trasladarConsumosAction(data: TrasladoConsumosInput): Promise<ActionResult<{ pedidoDestinoId: string }>> {
  try {
    const user = await requireAuthRoles(ROLES_FACTURACION);
    const parsed = trasladoConsumosSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };
    return await prisma.$transaction(async (tx) => {
      const origen = await tx.pedido.findUnique({ where: { id: parsed.data.pedidoId }, include: { detalles: true, pagos: true } });
      if (!origen || !origen.mesaId) return { success: false, error: "El pedido de origen no pertenece a una mesa" };
      if (origen.mesaId === parsed.data.mesaDestinoId) return { success: false, error: "Seleccione una mesa diferente" };
      if (origen.pagos.length) return { success: false, error: "No se pueden trasladar consumos con pagos registrados" };
      const idsValidos = new Set(origen.detalles.map((detalle) => detalle.id));
      if (parsed.data.detalleIds.some((id) => !idsValidos.has(id))) return { success: false, error: "Hay consumos que no pertenecen al pedido" };
      const mesaDestino = await tx.mesa.findUnique({ where: { id: parsed.data.mesaDestinoId } });
      if (!mesaDestino || mesaDestino.estado === EstadoMesa.MANTENIMIENTO) return { success: false, error: "Mesa destino no disponible" };

      const destinoExistente = await tx.pedido.findFirst({
        where: { mesaId: mesaDestino.id, estado: { in: [EstadoPedido.ABIERTO, EstadoPedido.PENDIENTE, EstadoPedido.EN_PREPARACION, EstadoPedido.LISTO] } },
        include: { pagos: true },
      });
      if (destinoExistente?.pagos.length) return { success: false, error: "La mesa destino ya tiene pagos parciales" };
      const destinoId = destinoExistente?.id ?? (await tx.pedido.create({ data: { tipo: TipoPedido.EN_MESA, estado: origen.estado, mesaId: mesaDestino.id, usuarioId: origen.usuarioId ?? user.id, comensales: origen.comensales } })).id;

      await tx.detallePedido.updateMany({ where: { id: { in: parsed.data.detalleIds } }, data: { pedidoId: destinoId } });
      await calcularTotales(tx, destinoId, 0);
      const restantes = origen.detalles.length - parsed.data.detalleIds.length;
      if (restantes === 0) {
        await tx.pedido.update({ where: { id: origen.id }, data: { estado: EstadoPedido.CANCELADO, descuento: dinero(0), subtotal: dinero(0), impuesto: dinero(0), total: dinero(0) } });
        await tx.mesa.update({ where: { id: origen.mesaId }, data: { estado: EstadoMesa.DISPONIBLE } });
      } else {
        await calcularTotales(tx, origen.id, 0);
      }
      await tx.mesa.update({ where: { id: mesaDestino.id }, data: { estado: EstadoMesa.OCUPADA } });
      revalidatePath("/pos"); revalidatePath("/admin/mesas"); revalidatePath("/caja");
      return { success: true, message: "Consumos trasladados", data: { pedidoDestinoId: destinoId } };
    });
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "No se pudieron trasladar los consumos" };
  }
}
