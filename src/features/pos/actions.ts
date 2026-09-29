"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuthRoles } from "@/lib/auth-helpers";
import { Rol, TipoPedido, EstadoPedido, EstadoMesa, EstadoItem } from "@prisma/client";
import { ActionResult } from "@/features/menu/actions";

export interface ItemPedidoInput {
  platilloId: string;
  cantidad: number;
  notas?: string;
  comensal?: number;
  opcionIds?: string[];
}

export interface CrearPedidoPOSInput {
  mesaId?: string | null;
  tipo: TipoPedido;
  comensales?: number;
  usuarioId?: string; // Mesero que atiende
  clienteId?: string | null;
  notas?: string;
  items: ItemPedidoInput[];
}

export async function getPedidoActivoMesaAction(mesaId: string) {
  const user = await requireAuthRoles([Rol.ADMIN, Rol.CAJERO, Rol.MESERO]);

  const pedido = await prisma.pedido.findFirst({
    where: {
      mesaId,
      ...(user.role === Rol.MESERO ? { OR: [{ usuarioId: user.id }, { usuarioId: null }] } : {}),
      estado: {
        in: [EstadoPedido.ABIERTO, EstadoPedido.PENDIENTE, EstadoPedido.EN_PREPARACION, EstadoPedido.LISTO],
      },
    },
    include: {
      mesa: true,
      usuario: { select: { id: true, nombre: true } },
      detalles: {
        include: {
          platillo: true,
          modificadores: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!pedido) return null;

  return {
    ...pedido,
    subtotal: Number(pedido.subtotal),
    descuento: Number(pedido.descuento),
    impuesto: Number(pedido.impuesto),
    propina: Number(pedido.propina),
    total: Number(pedido.total),
    detalles: pedido.detalles.map((d) => ({
      ...d,
      precioUnitario: Number(d.precioUnitario),
      subtotal: Number(d.subtotal),
      platillo: {
        ...d.platillo,
        precio: Number(d.platillo.precio),
        costo: Number(d.platillo.costo),
      },
      modificadores: d.modificadores.map((m) => ({
        ...m,
        precioExtra: Number(m.precioExtra),
      })),
    })),
  };
}

export async function crearOActualizarPedidoPOSAction(
  data: CrearPedidoPOSInput
): Promise<ActionResult> {
  try {
    const sessionUser = await requireAuthRoles([Rol.ADMIN, Rol.CAJERO, Rol.MESERO]);
    const operadorId = sessionUser.role === Rol.MESERO ? sessionUser.id : data.usuarioId || sessionUser.id;
    const operador = await prisma.usuario.findFirst({ where: { id: operadorId, activo: true, rol: { in: [Rol.ADMIN, Rol.CAJERO, Rol.MESERO] } }, select: { id: true } });
    if (!operador) return { success: false, error: "El responsable del pedido no esta disponible" };

    if (!data.items || data.items.length === 0) {
      return { success: false, error: "La comanda debe contener al menos un producto" };
    }

    // Obtener configuración fiscal
    const config = await prisma.configuracion.findFirst();
    const aplicarImpuesto = config?.aplicarImpuesto ?? true;
    const impuestoIncluido = config?.impuestoIncluido ?? true;
    const tasaImpuesto = Number(config?.porcentajeImpuesto ?? 19.0) / 100;

    return await prisma.$transaction(async (tx) => {
      if (config?.prohibirVentaSinStock) {
        const cantidades = new Map<string, number>();
        for (const item of data.items) cantidades.set(item.platilloId, (cantidades.get(item.platilloId) ?? 0) + item.cantidad);
        const recetas = await tx.recetaIngrediente.findMany({ where: { platilloId: { in: Array.from(cantidades.keys()) } }, include: { ingrediente: true } });
        const consumos = new Map<string, { nombre: string; requerido: number; disponible: number }>();
        for (const receta of recetas) {
          const actual = consumos.get(receta.ingredienteId);
          const requerido = Number(receta.cantidad) * (cantidades.get(receta.platilloId) ?? 0);
          consumos.set(receta.ingredienteId, { nombre: receta.ingrediente.nombre, requerido: (actual?.requerido ?? 0) + requerido, disponible: Number(receta.ingrediente.stockActual) });
        }
        const faltantes = Array.from(consumos.values()).filter((item) => item.disponible < item.requerido);
        if (faltantes.length) return { success: false, error: `No hay stock suficiente de: ${faltantes.map((item) => item.nombre).join(", ")}` };
      }

      let pedidoId: string | null = null;

      // Si es en mesa, verificar si ya tiene un pedido activo
      if (data.tipo === TipoPedido.EN_MESA && data.mesaId) {
        const existente = await tx.pedido.findFirst({
          where: {
            mesaId: data.mesaId,
            estado: {
              in: [EstadoPedido.ABIERTO, EstadoPedido.PENDIENTE, EstadoPedido.EN_PREPARACION, EstadoPedido.LISTO],
            },
          },
        });

        if (existente) {
          await tx.$queryRaw`SELECT id FROM pedidos WHERE id = ${existente.id} FOR UPDATE`;
          const vigente = await tx.pedido.findUnique({ where: { id: existente.id }, select: { estado: true } });
          if (!vigente || vigente.estado === EstadoPedido.COMPLETADO || vigente.estado === EstadoPedido.CANCELADO) {
            return { success: false, error: "El pedido se cerro. Vuelve a seleccionar la mesa." };
          }
          if (sessionUser.role === Rol.MESERO && existente.usuarioId && existente.usuarioId !== sessionUser.id) {
            return { success: false, error: "Esta mesa esta asignada a otro mesero" };
          }
          if (!existente.usuarioId) await tx.pedido.update({ where: { id: existente.id }, data: { usuarioId: operadorId } });
          pedidoId = existente.id;
        }
      }

      // Si no existe, crear el pedido
      if (!pedidoId) {
        const nuevoPedido = await tx.pedido.create({
          data: {
            tipo: data.tipo,
            estado: EstadoPedido.PENDIENTE,
            mesaId: data.mesaId || null,
            usuarioId: operadorId,
            clienteId: data.clienteId || null,
            comensales: data.comensales || 1,
            notas: data.notas || null,
          },
        });
        pedidoId = nuevoPedido.id;

        // Si es en mesa, marcar mesa como OCUPADA
        if (data.mesaId) {
          await tx.mesa.update({
            where: { id: data.mesaId },
            data: { estado: EstadoMesa.OCUPADA },
          });
        }
      }

      // Procesar cada ítem del pedido
      for (const item of data.items) {
        const platillo = await tx.platillo.findUnique({
          where: { id: item.platilloId },
        });

        if (!platillo) continue;

        const precioUnitarioBase = Number(platillo.precio);

        // Obtener modificadores seleccionados
        let opcionesSeleccionadas: { id: string; nombre: string; precioExtra: number }[] = [];
        if (item.opcionIds && item.opcionIds.length > 0) {
          const ops = await tx.opcionModificador.findMany({
            where: { id: { in: item.opcionIds } },
          });
          opcionesSeleccionadas = ops.map((o) => ({
            id: o.id,
            nombre: o.nombre,
            precioExtra: Number(o.precioExtra),
          }));
        }

        const sumaExtras = opcionesSeleccionadas.reduce((acc, o) => acc + o.precioExtra, 0);
        const precioFinalUnitario = precioUnitarioBase + sumaExtras;
        const subtotalItem = precioFinalUnitario * item.cantidad;

        const detalle = await tx.detallePedido.create({
          data: {
            pedidoId: pedidoId!,
            platilloId: item.platilloId,
            cantidad: item.cantidad,
            precioUnitario: precioFinalUnitario,
            subtotal: subtotalItem,
            comensal: item.comensal || 1,
            notas: item.notas || null,
            estadoItem: EstadoItem.EN_COLA,
          },
        });

        // Registrar modificadores en DB
        for (const op of opcionesSeleccionadas) {
          await tx.modificadorDetalle.create({
            data: {
              detallePedidoId: detalle.id,
              opcionId: op.id,
              nombre: op.nombre,
              precioExtra: op.precioExtra,
            },
          });
        }
      }

      // Recalcular totales del pedido completo
      const todosDetalles = await tx.detallePedido.findMany({
        where: { pedidoId: pedidoId! },
      });

      const sumaItems = todosDetalles.reduce((acc, d) => acc + Number(d.subtotal), 0);
      const cliente = data.clienteId ? await tx.cliente.findUnique({ where: { id: data.clienteId }, select: { descuentoFijo: true } }) : null;
      const descuentoCliente = cliente?.descuentoFijo ? sumaItems * Number(cliente.descuentoFijo) / 100 : 0;
      const baseConDescuento = Math.max(0, sumaItems - descuentoCliente);

      let subtotalFinal = baseConDescuento;
      let impuestoFinal = 0;
      let totalFinal = baseConDescuento;

      if (aplicarImpuesto && tasaImpuesto > 0) {
        if (impuestoIncluido) {
          totalFinal = baseConDescuento;
          impuestoFinal = totalFinal - totalFinal / (1 + tasaImpuesto);
          subtotalFinal = totalFinal - impuestoFinal;
        } else {
          subtotalFinal = baseConDescuento;
          impuestoFinal = subtotalFinal * tasaImpuesto;
          totalFinal = subtotalFinal + impuestoFinal;
        }
      }

      await tx.pedido.update({
        where: { id: pedidoId! },
        data: {
          subtotal: subtotalFinal,
          descuento: descuentoCliente,
          impuesto: impuestoFinal,
          total: totalFinal,
          clienteId: data.clienteId || null,
          estado: EstadoPedido.PENDIENTE,
        },
      });

      revalidatePath("/pos");
      revalidatePath("/mesas");
      revalidatePath("/cocina");

      return {
        success: true,
        message: "Comanda enviada a cocina con éxito",
        data: { pedidoId },
      };
    });
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "Error al procesar la comanda" };
  }
}

export async function cancelarPedidoAction(pedidoId: string): Promise<ActionResult> {
  try {
    await requireAuthRoles([Rol.ADMIN, Rol.CAJERO]);

    return await prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.findUnique({
        where: { id: pedidoId },
      });

      if (!pedido) {
        return { success: false, error: "Pedido no encontrado" };
      }

      await tx.pedido.update({
        where: { id: pedidoId },
        data: { estado: EstadoPedido.CANCELADO },
      });

      if (pedido.mesaId) {
        await tx.mesa.update({
          where: { id: pedido.mesaId },
          data: { estado: EstadoMesa.DISPONIBLE },
        });
      }

      revalidatePath("/pos");
      revalidatePath("/mesas");
      revalidatePath("/cocina");
      return { success: true, message: "Pedido cancelado exitosamente" };
    });
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "Error al cancelar pedido" };
  }
}
