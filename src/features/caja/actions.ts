"use server";

import { revalidatePath } from "next/cache";
import { Prisma, EstadoMesa, EstadoPago, EstadoPedido, EstadoTurno, MetodoPago, Rol, TipoMovimientoCaja, TipoMovimientoInventario } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuthRoles } from "@/lib/auth-helpers";
import type { ActionResult } from "@/features/menu/actions";
import {
  abrirTurnoSchema,
  cerrarTurnoSchema,
  movimientoCajaSchema,
  registrarPagoSchema,
  type AbrirTurnoInput,
  type CerrarTurnoInput,
  type MovimientoCajaInput,
  type RegistrarPagoInput,
} from "@/schemas/caja.schema";

const ROLES_CAJA = [Rol.ADMIN, Rol.CAJERO];
const dinero = (valor: number) => new Prisma.Decimal(valor.toFixed(2));

export async function abrirTurnoAction(data: AbrirTurnoInput): Promise<ActionResult> {
  try {
    const user = await requireAuthRoles(ROLES_CAJA);
    const parsed = abrirTurnoSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

    const abierto = await prisma.turno.findFirst({ where: { usuarioId: user.id, estado: EstadoTurno.ABIERTO } });
    if (abierto) return { success: false, error: "Ya tienes un turno abierto" };

    await prisma.turno.create({ data: { usuarioId: user.id, saldoInicial: dinero(parsed.data.saldoInicial) } });
    revalidatePath("/caja");
    return { success: true, message: "Turno abierto correctamente" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "No se pudo abrir el turno" };
  }
}

export async function registrarMovimientoCajaAction(data: MovimientoCajaInput): Promise<ActionResult> {
  try {
    const user = await requireAuthRoles(ROLES_CAJA);
    const parsed = movimientoCajaSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

    const turno = await prisma.turno.findFirst({ where: { usuarioId: user.id, estado: EstadoTurno.ABIERTO } });
    if (!turno) return { success: false, error: "Debes abrir un turno antes de registrar movimientos" };

    await prisma.movimientoCaja.create({
      data: { ...parsed.data, monto: dinero(parsed.data.monto), turnoId: turno.id, usuarioId: user.id },
    });
    revalidatePath("/caja");
    return { success: true, message: "Movimiento registrado" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "No se pudo registrar el movimiento" };
  }
}

export async function registrarPagoAction(data: RegistrarPagoInput): Promise<ActionResult> {
  try {
    const user = await requireAuthRoles(ROLES_CAJA);
    const parsed = registrarPagoSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

    return await prisma.$transaction(async (tx) => {
      const turno = await tx.turno.findFirst({ where: { usuarioId: user.id, estado: EstadoTurno.ABIERTO } });
      if (!turno) return { success: false, error: "Debes abrir un turno para cobrar" };

      const pedido = await tx.pedido.findUnique({ where: { id: parsed.data.pedidoId }, include: { pagos: true, detalles: { include: { platillo: { include: { recetas: { include: { ingrediente: true } } } } } } } });
      if (!pedido || pedido.estado === EstadoPedido.CANCELADO) return { success: false, error: "Pedido no disponible" };
      if (pedido.estado === EstadoPedido.COMPLETADO) return { success: false, error: "Este pedido ya fue cobrado" };

      const pagosConfirmados = pedido.pagos.filter((p) => p.estado === EstadoPago.PAGADO);
      const totalBasePagado = pagosConfirmados.reduce((sum, p) => sum + Number(p.monto) - Number(p.propina), 0);
      const totalPedido = Number(pedido.total);
      let baseSeleccionada = totalPedido - totalBasePagado;

      if (parsed.data.comensal) {
        const comensales = Array.from(new Set(pedido.detalles.map((d) => d.comensal ?? 1))).sort((a, b) => a - b);
        if (!comensales.includes(parsed.data.comensal)) return { success: false, error: "El comensal seleccionado no pertenece al pedido" };
        const brutoTotal = pedido.detalles.reduce((sum, d) => sum + Number(d.subtotal), 0);
        const acumuladoPrevio = comensales.slice(0, -1).reduce((sum, numero) => {
          const bruto = pedido.detalles.filter((d) => (d.comensal ?? 1) === numero).reduce((s, d) => s + Number(d.subtotal), 0);
          return sum + Math.round((totalPedido * bruto / brutoTotal) * 100) / 100;
        }, 0);
        const brutoComensal = pedido.detalles.filter((d) => (d.comensal ?? 1) === parsed.data.comensal).reduce((s, d) => s + Number(d.subtotal), 0);
        const totalComensal = parsed.data.comensal === comensales.at(-1)
          ? Math.round((totalPedido - acumuladoPrevio) * 100) / 100
          : Math.round((totalPedido * brutoComensal / brutoTotal) * 100) / 100;
        const pagadoComensal = pagosConfirmados.filter((p) => p.comensal === parsed.data.comensal).reduce((sum, p) => sum + Number(p.monto) - Number(p.propina), 0);
        baseSeleccionada = totalComensal - pagadoComensal;
      }

      if (baseSeleccionada <= 0.009) return { success: false, error: "Esta cuenta ya está pagada" };
      const totalCobrar = baseSeleccionada + parsed.data.propina;
      const recibido = parsed.data.pagos.reduce((sum, p) => sum + p.monto, 0);
      if (Math.abs(recibido - totalCobrar) > 0.009) {
        return { success: false, error: `Los pagos deben sumar exactamente ${totalCobrar.toFixed(2)}` };
      }

      const nuevoTotalBasePagado = totalBasePagado + baseSeleccionada;
      const completado = nuevoTotalBasePagado >= totalPedido - 0.009;
      const consumos = new Map<string, { nombre: string; cantidad: number; stock: number; costo: number }>();
      if (completado && !pedido.inventarioDescontadoAt) {
        for (const detalle of pedido.detalles) {
          for (const receta of detalle.platillo.recetas) {
            const actual = consumos.get(receta.ingredienteId);
            const requerida = Number(receta.cantidad) * detalle.cantidad;
            consumos.set(receta.ingredienteId, { nombre: receta.ingrediente.nombre, cantidad: (actual?.cantidad ?? 0) + requerida, stock: Number(receta.ingrediente.stockActual), costo: Number(receta.ingrediente.costoUnitario) });
          }
        }
        const config = await tx.configuracion.findFirst({ select: { prohibirVentaSinStock: true } });
        if (config?.prohibirVentaSinStock) {
          const faltantes = Array.from(consumos.values()).filter((item) => item.stock < item.cantidad);
          if (faltantes.length) return { success: false, error: `Stock insuficiente: ${faltantes.map((item) => item.nombre).join(", ")}` };
        }
      }

      for (let index = 0; index < parsed.data.pagos.length; index++) {
        const pago = parsed.data.pagos[index];
        await tx.pago.create({
          data: {
            pedidoId: pedido.id,
            turnoId: turno.id,
            comensal: parsed.data.comensal ?? null,
            metodoPago: pago.metodoPago,
            monto: dinero(pago.monto),
            propina: index === parsed.data.pagos.length - 1 ? dinero(parsed.data.propina) : dinero(0),
            referencia: pago.referencia || null,
            estado: EstadoPago.PAGADO,
          },
        });
      }

      if (completado && !pedido.inventarioDescontadoAt) {
        for (const [ingredienteId, consumo] of consumos) {
          const despues = consumo.stock - consumo.cantidad;
          await tx.ingrediente.update({ where: { id: ingredienteId }, data: { stockActual: new Prisma.Decimal(despues.toFixed(3)) } });
          await tx.movimientoInventario.create({ data: { ingredienteId, tipo: TipoMovimientoInventario.VENTA, cantidad: new Prisma.Decimal(consumo.cantidad.toFixed(3)), costoTotal: dinero(consumo.cantidad * consumo.costo), motivo: `Venta comanda #${pedido.codigo}`, pedidoId: pedido.id, stockAntes: new Prisma.Decimal(consumo.stock.toFixed(3)), stockDespues: new Prisma.Decimal(despues.toFixed(3)) } });
        }
      }
      await tx.pedido.update({
        where: { id: pedido.id },
        data: { estado: completado ? EstadoPedido.COMPLETADO : pedido.estado, propina: { increment: dinero(parsed.data.propina) }, ...(completado && !pedido.inventarioDescontadoAt ? { inventarioDescontadoAt: new Date() } : {}) },
      });
      await tx.turno.update({ where: { id: turno.id }, data: { totalVentas: { increment: dinero(recibido) } } });
      if (completado && pedido.mesaId) await tx.mesa.update({ where: { id: pedido.mesaId }, data: { estado: EstadoMesa.DISPONIBLE } });

      revalidatePath("/caja");
      revalidatePath("/pos");
      revalidatePath("/admin/mesas");
      revalidatePath("/admin/inventario");
      return { success: true, message: completado ? "Pago registrado y pedido cerrado" : "Cuenta parcial registrada" };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "No se pudo registrar el pago" };
  }
}

export async function cerrarTurnoAction(data: CerrarTurnoInput): Promise<ActionResult> {
  try {
    const user = await requireAuthRoles(ROLES_CAJA);
    const parsed = cerrarTurnoSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

    return await prisma.$transaction(async (tx) => {
      const turno = await tx.turno.findFirst({
        where: { usuarioId: user.id, estado: EstadoTurno.ABIERTO },
        include: { movimientos: true, pagos: true },
      });
      if (!turno) return { success: false, error: "No hay un turno abierto" };

      const efectivoVentas = turno.pagos.filter((p) => p.metodoPago === MetodoPago.EFECTIVO && p.estado === EstadoPago.PAGADO).reduce((s, p) => s + Number(p.monto), 0);
      const ingresos = turno.movimientos.filter((m) => m.tipo === TipoMovimientoCaja.INGRESO).reduce((s, m) => s + Number(m.monto), 0);
      const egresos = turno.movimientos.filter((m) => m.tipo === TipoMovimientoCaja.EGRESO).reduce((s, m) => s + Number(m.monto), 0);
      const esperado = Number(turno.saldoInicial) + efectivoVentas + ingresos - egresos;
      const diferencia = parsed.data.montoReal - esperado;

      await tx.arqueoCaja.create({
        data: { turnoId: turno.id, montoEsperado: dinero(esperado), montoReal: dinero(parsed.data.montoReal), diferencia: dinero(diferencia), ciego: parsed.data.ciego, observaciones: parsed.data.observaciones || null },
      });
      await tx.turno.update({ where: { id: turno.id }, data: { estado: EstadoTurno.CERRADO, saldoFinal: dinero(parsed.data.montoReal), fechaFin: new Date() } });
      revalidatePath("/caja");
      return { success: true, message: `Turno cerrado. Diferencia: ${diferencia.toFixed(2)}` };
    });
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "No se pudo cerrar el turno" };
  }
}
