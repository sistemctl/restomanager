import { notFound } from "next/navigation";
import { EstadoMesa, Rol } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuthRoles } from "@/lib/auth-helpers";
import { TrasladoConsumos } from "@/features/facturacion/components/traslado-consumos";

export default async function TrasladoPage({ params }: { params: Promise<{ pedidoId: string }> }) {
  await requireAuthRoles([Rol.ADMIN, Rol.CAJERO]);
  const { pedidoId } = await params;
  const [pedido, mesas] = await Promise.all([
    prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { mesa: { select: { numero: true, sala: { select: { nombre: true } } } }, detalles: { include: { platillo: { select: { nombre: true } }, modificadores: true }, orderBy: { createdAt: "asc" } } },
    }),
    prisma.mesa.findMany({
      where: { estado: { not: EstadoMesa.MANTENIMIENTO } },
      include: { sala: { select: { nombre: true } } },
      orderBy: [{ sala: { nombre: "asc" } }, { numero: "asc" }],
    }),
  ]);
  if (!pedido || !pedido.mesaId || !pedido.mesa) notFound();
  return <TrasladoConsumos pedido={{ id: pedido.id, codigo: pedido.codigo, mesaId: pedido.mesaId, mesa: pedido.mesa, detalles: pedido.detalles.map((d) => ({ id: d.id, cantidad: d.cantidad, nombre: d.platillo.nombre, subtotal: Number(d.subtotal), modificadores: d.modificadores.map((m) => m.nombre) })) }} mesas={mesas.filter((m) => m.id !== pedido.mesaId).map((m) => ({ id: m.id, numero: m.numero, estado: m.estado, sala: m.sala }))} />;
}
