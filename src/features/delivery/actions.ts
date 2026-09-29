"use server";
import { EstadoDelivery, EstadoPedido, Rol } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuthRoles } from "@/lib/auth-helpers";

export async function actualizarDeliveryAction(deliveryId: string, estado: EstadoDelivery, repartidorId?: string) {
  try {
    const user = await requireAuthRoles([Rol.ADMIN, Rol.CAJERO, Rol.REPARTIDOR]);
    if (!Object.values(EstadoDelivery).includes(estado)) throw new Error("Estado de entrega invalido");
    await prisma.$transaction(async tx => {
      const delivery = await tx.direccionDelivery.findUnique({ where: { id: deliveryId }, include: { pedido: true } });
      if (!delivery || delivery.estado === EstadoDelivery.CANCELADO || delivery.pedido.estado === EstadoPedido.CANCELADO) throw new Error("Entrega no disponible");
      if (user.role === Rol.REPARTIDOR) {
        if (delivery.repartidorId !== user.id) throw new Error("Esta entrega no esta asignada a tu usuario");
        if (repartidorId !== undefined) throw new Error("Solo caja o administracion puede asignar entregas");
        if (estado !== delivery.estado && !(delivery.estado === EstadoDelivery.ENVIADO && estado === EstadoDelivery.ENTREGADO)) throw new Error("Solo puedes confirmar pedidos despachados");
      }
      if (delivery.estado === EstadoDelivery.ENTREGADO && estado !== delivery.estado) throw new Error("La entrega ya fue finalizada");
      const asignado = repartidorId === undefined ? delivery.repartidorId : repartidorId || null;
      if (asignado && !await tx.usuario.findFirst({ where: { id: asignado, activo: true, rol: Rol.REPARTIDOR }, select: { id: true } })) throw new Error("Repartidor no disponible");
      if ((estado === EstadoDelivery.ENVIADO || estado === EstadoDelivery.ENTREGADO) && !asignado) throw new Error("Asigna un repartidor antes de despachar");
      if (estado === EstadoDelivery.CANCELADO) throw new Error("Cancela el pedido desde caja");
      // Solo el cobro en caja puede completar el pedido y descontar inventario.
      await tx.direccionDelivery.update({ where: { id: deliveryId }, data: { estado, repartidorId: asignado } });
    });
    revalidatePath("/delivery");
    revalidatePath("/caja");
    return { success: true, message: "Estado actualizado" };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : "No se pudo actualizar" }; }
}
