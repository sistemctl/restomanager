"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuthRoles } from "@/lib/auth-helpers";
import { Rol, EstadoMesa, EstadoPedido } from "@prisma/client";
import {
  salaSchema,
  SalaFormData,
  mesaSchema,
  MesaFormData,
  reservacionSchema,
  ReservacionFormData,
} from "@/schemas/mesas.schema";
import { ActionResult } from "@/features/menu/actions";

// -------------------------------------------------------------
// SALAS Y MESAS
// -------------------------------------------------------------

export async function getSalasConMesasAction() {
  await requireAuthRoles([Rol.ADMIN, Rol.CAJERO, Rol.MESERO]);

  const salas = await prisma.sala.findMany({
    orderBy: { orden: "asc" },
    include: {
      mesas: {
        orderBy: { numero: "asc" },
        include: {
          pedidos: {
            where: {
              estado: {
                in: [EstadoPedido.ABIERTO, EstadoPedido.PENDIENTE, EstadoPedido.EN_PREPARACION, EstadoPedido.LISTO],
              },
            },
            include: {
              usuario: { select: { nombre: true } },
              detalles: true,
            },
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  return salas.map((sala) => ({
    ...sala,
    mesas: sala.mesas.map((mesa) => {
      const pedidoActivo = mesa.pedidos[0];
      return {
        ...mesa,
        pedidos: undefined,
        pedidoActivo: pedidoActivo
          ? {
              id: pedidoActivo.id,
              codigo: pedidoActivo.codigo,
              estado: pedidoActivo.estado,
              total: Number(pedidoActivo.total),
              subtotal: Number(pedidoActivo.subtotal),
              comensales: pedidoActivo.comensales,
              mesero: pedidoActivo.usuario?.nombre || "Sin asignar",
              createdAt: pedidoActivo.createdAt,
              itemsCount: pedidoActivo.detalles.reduce((acc, d) => acc + d.cantidad, 0),
            }
          : null,
      };
    }),
  }));
}

export async function createSalaAction(data: SalaFormData): Promise<ActionResult> {
  try {
    await requireAuthRoles([Rol.ADMIN]);

    const parsed = salaSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Datos de sala inválidos",
      };
    }

    const sala = await prisma.sala.create({
      data: parsed.data,
    });

    revalidatePath("/mesas");
    revalidatePath("/pos");
    return { success: true, message: "Sala creada exitosamente", data: sala };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "Error al crear sala" };
  }
}

export async function updateSalaAction(id: string, data: SalaFormData): Promise<ActionResult> {
  try {
    await requireAuthRoles([Rol.ADMIN]);

    const parsed = salaSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Datos de sala inválidos",
      };
    }

    const sala = await prisma.sala.update({
      where: { id },
      data: parsed.data,
    });

    revalidatePath("/mesas");
    revalidatePath("/pos");
    return { success: true, message: "Sala actualizada exitosamente", data: sala };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "Error al actualizar sala" };
  }
}

export async function deleteSalaAction(id: string): Promise<ActionResult> {
  try {
    await requireAuthRoles([Rol.ADMIN]);

    await prisma.sala.delete({
      where: { id },
    });

    revalidatePath("/mesas");
    revalidatePath("/pos");
    return { success: true, message: "Sala eliminada exitosamente" };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "Error al eliminar sala" };
  }
}

export async function createMesaAction(data: MesaFormData): Promise<ActionResult> {
  try {
    await requireAuthRoles([Rol.ADMIN]);

    const parsed = mesaSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Datos de mesa inválidos",
      };
    }

    const mesa = await prisma.mesa.create({
      data: parsed.data,
    });

    revalidatePath("/mesas");
    revalidatePath("/pos");
    return { success: true, message: "Mesa creada exitosamente", data: mesa };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "Error al crear mesa" };
  }
}

export async function updateMesaAction(id: string, data: MesaFormData): Promise<ActionResult> {
  try {
    await requireAuthRoles([Rol.ADMIN]);

    const parsed = mesaSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Datos de mesa inválidos",
      };
    }

    const mesa = await prisma.mesa.update({
      where: { id },
      data: parsed.data,
    });

    revalidatePath("/mesas");
    revalidatePath("/pos");
    return { success: true, message: "Mesa actualizada exitosamente", data: mesa };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "Error al actualizar mesa" };
  }
}

export async function deleteMesaAction(id: string): Promise<ActionResult> {
  try {
    await requireAuthRoles([Rol.ADMIN]);

    await prisma.mesa.delete({
      where: { id },
    });

    revalidatePath("/mesas");
    revalidatePath("/pos");
    return { success: true, message: "Mesa eliminada exitosamente" };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "Error al eliminar mesa" };
  }
}

export async function cambiarEstadoMesaAction(
  id: string,
  estado: EstadoMesa
): Promise<ActionResult> {
  try {
    await requireAuthRoles([Rol.ADMIN, Rol.CAJERO, Rol.MESERO]);

    const mesa = await prisma.mesa.update({
      where: { id },
      data: { estado },
    });

    revalidatePath("/mesas");
    revalidatePath("/pos");
    return { success: true, message: `Mesa cambiada a ${estado}`, data: mesa };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "Error al cambiar estado de mesa" };
  }
}

export async function trasladarMesaAction(
  mesaOrigenId: string,
  mesaDestinoId: string
): Promise<ActionResult> {
  try {
    await requireAuthRoles([Rol.ADMIN, Rol.CAJERO, Rol.MESERO]);

    return await prisma.$transaction(async (tx) => {
      // Buscar pedido activo en mesa origen
      const pedido = await tx.pedido.findFirst({
        where: {
          mesaId: mesaOrigenId,
          estado: {
            in: [EstadoPedido.ABIERTO, EstadoPedido.PENDIENTE, EstadoPedido.EN_PREPARACION, EstadoPedido.LISTO],
          },
        },
      });

      if (!pedido) {
        return { success: false, error: "La mesa de origen no tiene un pedido activo para trasladar" };
      }

      // Validar mesa destino
      const mesaDestino = await tx.mesa.findUnique({
        where: { id: mesaDestinoId },
      });

      if (!mesaDestino) {
        return { success: false, error: "Mesa de destino no encontrada" };
      }

      // Reasignar pedido a la nueva mesa
      await tx.pedido.update({
        where: { id: pedido.id },
        data: { mesaId: mesaDestinoId },
      });

      // Actualizar estados de ambas mesas
      await tx.mesa.update({
        where: { id: mesaOrigenId },
        data: { estado: EstadoMesa.DISPONIBLE },
      });

      await tx.mesa.update({
        where: { id: mesaDestinoId },
        data: { estado: EstadoMesa.OCUPADA },
      });

      revalidatePath("/mesas");
      revalidatePath("/pos");
      return { success: true, message: `Consumos trasladados con éxito a la mesa ${mesaDestino.numero}` };
    });
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "Error al trasladar consumos entre mesas" };
  }
}

// -------------------------------------------------------------
// RESERVACIONES
// -------------------------------------------------------------

export async function getReservacionesAction() {
  await requireAuthRoles([Rol.ADMIN, Rol.CAJERO, Rol.MESERO]);

  const reservaciones = await prisma.reservacion.findMany({
    orderBy: { fechaHora: "asc" },
    include: {
      mesa: {
        include: { sala: true },
      },
    },
  });

  return reservaciones;
}

export async function createReservacionAction(
  data: ReservacionFormData
): Promise<ActionResult> {
  try {
    await requireAuthRoles([Rol.ADMIN, Rol.CAJERO, Rol.MESERO]);

    const parsed = reservacionSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Datos de reservación inválidos",
      };
    }

    const { fechaHora, ...rest } = parsed.data;

    const reservacion = await prisma.reservacion.create({
      data: {
        ...rest,
        fechaHora: new Date(fechaHora),
      },
    });

    if (rest.mesaId) {
      await prisma.mesa.update({
        where: { id: rest.mesaId },
        data: { estado: EstadoMesa.RESERVADA },
      });
    }

    revalidatePath("/mesas");
    revalidatePath("/admin/mesas");
    return { success: true, message: "Reservación creada con éxito", data: reservacion };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "Error al crear reservación" };
  }
}

export async function toggleConfirmarReservacionAction(
  id: string
): Promise<ActionResult> {
  try {
    await requireAuthRoles([Rol.ADMIN, Rol.CAJERO, Rol.MESERO]);

    const res = await prisma.reservacion.findUnique({ where: { id } });
    if (!res) return { success: false, error: "Reservación no encontrada" };

    const updated = await prisma.reservacion.update({
      where: { id },
      data: { confirmada: !res.confirmada },
    });

    revalidatePath("/mesas");
    revalidatePath("/admin/mesas");
    return { success: true, message: updated.confirmada ? "Reserva confirmada" : "Reserva pendiente", data: updated };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "Error al actualizar reservación" };
  }
}
