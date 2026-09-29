"use server";
import { revalidatePath } from "next/cache";
import { EstadoItem, EstadoPedido, Prisma, Rol } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuthRoles } from "@/lib/auth-helpers";
import type { ActionResult } from "@/features/menu/actions";
const ROLES_COCINA = [Rol.ADMIN, Rol.COCINERO];

async function requirePedidoActivo(tx: Prisma.TransactionClient, pedidoId: string) {
  // Compartir el bloqueo con caja evita reabrir una cuenta cobrada simultaneamente.
  await tx.$queryRaw`SELECT id FROM pedidos WHERE id = ${pedidoId} FOR UPDATE`;
  const pedido = await tx.pedido.findUnique({ where: { id: pedidoId }, select: { estado: true } });
  if (!pedido || pedido.estado === EstadoPedido.COMPLETADO || pedido.estado === EstadoPedido.CANCELADO) throw new Error("El pedido ya no esta activo");
}
async function sincronizarEstadoPedido(tx: Prisma.TransactionClient, pedidoId: string) {
  const detalles = await tx.detallePedido.findMany({ where: { pedidoId }, select: { estadoItem: true } });
  const todosListos = detalles.length > 0 && detalles.every(item => item.estadoItem === EstadoItem.LISTO || item.estadoItem === EstadoItem.SERVIDO);
  const algunoIniciado = detalles.some(item => item.estadoItem !== EstadoItem.EN_COLA);
  await tx.pedido.update({ where: { id: pedidoId }, data: { estado: todosListos ? EstadoPedido.LISTO : algunoIniciado ? EstadoPedido.EN_PREPARACION : EstadoPedido.PENDIENTE } });
}
function refresh() { revalidatePath("/cocina"); revalidatePath("/pos"); }

export async function actualizarItemCocinaAction(detalleId: string, estado: EstadoItem): Promise<ActionResult> {
  try {
    await requireAuthRoles(ROLES_COCINA);
    if (estado !== EstadoItem.PREPARANDO && estado !== EstadoItem.LISTO && estado !== EstadoItem.SERVIDO) throw new Error("Estado de cocina invalido");
    await prisma.$transaction(async tx => {
      const detalle = await tx.detallePedido.findUnique({ where: { id: detalleId } });
      if (!detalle) throw new Error("Producto no encontrado");
      await requirePedidoActivo(tx, detalle.pedidoId);
      if (detalle.estadoItem === EstadoItem.SERVIDO && estado !== EstadoItem.SERVIDO) throw new Error("El producto ya fue servido");
      if (estado === EstadoItem.SERVIDO && detalle.estadoItem !== EstadoItem.LISTO && detalle.estadoItem !== EstadoItem.SERVIDO) throw new Error("El producto aun no esta listo");
      await tx.detallePedido.update({ where: { id: detalleId }, data: { estadoItem: estado } });
      await sincronizarEstadoPedido(tx, detalle.pedidoId);
    });
    refresh(); return { success: true };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : "No se pudo actualizar" }; }
}
export async function marcarPedidoListoAction(pedidoId: string): Promise<ActionResult> {
  try {
    await requireAuthRoles(ROLES_COCINA);
    await prisma.$transaction(async tx => {
      await requirePedidoActivo(tx, pedidoId);
      await tx.detallePedido.updateMany({ where: { pedidoId, estadoItem: { not: EstadoItem.SERVIDO } }, data: { estadoItem: EstadoItem.LISTO } });
      await sincronizarEstadoPedido(tx, pedidoId);
    });
    refresh(); return { success: true, message: "Comanda lista para entregar" };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : "No se pudo completar" }; }
}
export async function entregarPedidoAction(pedidoId: string): Promise<ActionResult> {
  try {
    await requireAuthRoles(ROLES_COCINA);
    await prisma.$transaction(async tx => {
      await requirePedidoActivo(tx, pedidoId);
      if (await tx.detallePedido.count({ where: { pedidoId, estadoItem: { in: [EstadoItem.EN_COLA, EstadoItem.PREPARANDO] } } })) throw new Error("La comanda aun tiene productos en preparacion");
      await tx.detallePedido.updateMany({ where: { pedidoId }, data: { estadoItem: EstadoItem.SERVIDO } });
      await sincronizarEstadoPedido(tx, pedidoId);
    });
    refresh(); return { success: true, message: "Pedido retirado de cocina, pendiente de cobro" };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : "No se pudo entregar" }; }
}
