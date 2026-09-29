import { prisma } from "@/lib/prisma";
import { requireAuthRoles } from "@/lib/auth-helpers";
import { EstadoPedido, EstadoTurno, Rol } from "@prisma/client";
import { CajaManager } from "@/features/caja/components/caja-manager";

export default async function CajaPage() {
  const user = await requireAuthRoles([Rol.ADMIN, Rol.CAJERO]);
  const turno = await prisma.turno.findFirst({
      where: { usuarioId: user.id, estado: EstadoTurno.ABIERTO },
      include: {
        movimientos: { orderBy: { createdAt: "desc" } },
        pagos: { orderBy: { createdAt: "desc" } },
      },
    });
  const [pedidos, config, ventas] = await Promise.all([
    prisma.pedido.findMany({
      where: { estado: { in: [EstadoPedido.ABIERTO, EstadoPedido.PENDIENTE, EstadoPedido.EN_PREPARACION, EstadoPedido.LISTO] } },
      include: {
        mesa: { select: { numero: true, sala: { select: { nombre: true } } } },
        usuario: { select: { nombre: true } },
        detalles: { select: { cantidad: true, subtotal: true, comensal: true, platillo: { select: { nombre: true } } } },
        pagos: { select: { monto: true, propina: true, comensal: true, estado: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.configuracion.findFirst({ select: { simboloMoneda: true, habilitarPropina: true, propinaSugerida: true } }),
    turno ? prisma.pedido.findMany({
      where: { estado: EstadoPedido.COMPLETADO, pagos: { some: { turnoId: turno.id } } },
      select: { id: true, codigo: true, total: true, propina: true, mesa: { select: { numero: true } }, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }) : Promise.resolve([]),
  ]);

  const turnoSerializado = turno ? {
    ...turno,
    saldoInicial: Number(turno.saldoInicial),
    totalVentas: Number(turno.totalVentas),
    saldoFinal: turno.saldoFinal === null ? null : Number(turno.saldoFinal),
    movimientos: turno.movimientos.map((m) => ({ ...m, monto: Number(m.monto) })),
    pagos: turno.pagos.map((p) => ({ ...p, monto: Number(p.monto), propina: Number(p.propina) })),
  } : null;

  const pedidosSerializados = pedidos.map((p) => ({
    ...p,
    subtotal: Number(p.subtotal), descuento: Number(p.descuento), impuesto: Number(p.impuesto),
    propina: Number(p.propina), total: Number(p.total),
    detalles: p.detalles.map((detalle) => ({ ...detalle, subtotal: Number(detalle.subtotal) })),
    pagos: p.pagos.map((pago) => ({ ...pago, monto: Number(pago.monto), propina: Number(pago.propina) })),
  }));

  return (
    <CajaManager
      turno={turnoSerializado}
      pedidos={pedidosSerializados}
      simboloMoneda={config?.simboloMoneda ?? "$"}
      propinaSugerida={config?.habilitarPropina ? Number(config.propinaSugerida) : 0}
      ventas={ventas.map((venta) => ({ ...venta, total: Number(venta.total), propina: Number(venta.propina), updatedAt: venta.updatedAt.toISOString() }))}
    />
  );
}
