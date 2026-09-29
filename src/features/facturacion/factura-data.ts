import { EstadoPedido, Rol } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getFacturaData(pedidoId: string, user: { id: string; role: Rol }) {
  const [pedido, config] = await Promise.all([
    prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: {
        mesa: { select: { numero: true, sala: { select: { nombre: true } } } },
        usuario: { select: { nombre: true } },
        cliente: { select: { nombre: true, documento: true } },
        detalles: { include: { platillo: { select: { nombre: true } }, modificadores: true }, orderBy: { createdAt: "asc" } },
        pagos: { where: { estado: "PAGADO" }, orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.configuracion.findFirst(),
  ]);
  if (!pedido || pedido.estado !== EstadoPedido.COMPLETADO) return null;
  if (user.role === Rol.MESERO && pedido.usuarioId !== user.id) return null;
  return {
    config: config ? {
      nombreRestaurante: config.nombreRestaurante,
      razonSocial: config.razonSocial,
      identificacionTributaria: config.identificacionTributaria,
      direccion: config.direccion,
      ciudad: config.ciudad,
      telefono: config.telefono,
      simboloMoneda: config.simboloMoneda,
      mensajeTicket: config.mensajeTicket,
    } : null,
    pedido: {
      id: pedido.id, codigo: pedido.codigo, tipo: pedido.tipo, createdAt: pedido.createdAt.toISOString(),
      mesa: pedido.mesa, usuario: pedido.usuario, cliente: pedido.cliente,
      subtotal: Number(pedido.subtotal), descuento: Number(pedido.descuento), impuesto: Number(pedido.impuesto), propina: Number(pedido.propina), total: Number(pedido.total),
      detalles: pedido.detalles.map((d) => ({ id: d.id, cantidad: d.cantidad, nombre: d.platillo.nombre, subtotal: Number(d.subtotal), modificadores: d.modificadores.map((m) => m.nombre) })),
      pagos: pedido.pagos.map((p) => ({ id: p.id, metodoPago: p.metodoPago, monto: Number(p.monto), propina: Number(p.propina), referencia: p.referencia, comensal: p.comensal })),
    },
  };
}

export type FacturaData = NonNullable<Awaited<ReturnType<typeof getFacturaData>>>;
