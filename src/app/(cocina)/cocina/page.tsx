import { EstadoItem, EstadoPedido, Rol } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePageRoles } from "@/lib/auth-helpers";
import { CocinaKds } from "@/features/cocina/components/cocina-kds";

export default async function CocinaPage() {
  const user = await requirePageRoles([Rol.ADMIN, Rol.COCINERO]);
  const [pedidos, config] = await Promise.all([
    prisma.pedido.findMany({
      where: {
        estado: { in: [EstadoPedido.PENDIENTE, EstadoPedido.EN_PREPARACION, EstadoPedido.LISTO] },
        detalles: { some: { estadoItem: { not: EstadoItem.SERVIDO } } },
      },
      include: {
        mesa: { select: { numero: true, sala: { select: { nombre: true } } } },
        usuario: { select: { nombre: true } },
        detalles: {
          where: { estadoItem: { not: EstadoItem.SERVIDO } },
          include: {
            platillo: { select: { nombre: true, categoria: { select: { nombre: true } } } },
            modificadores: { select: { id: true, nombre: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.configuracion.findFirst({ select: { nombreRestaurante: true, kdsAlertaAmarillaMinutos: true, kdsAlertaRojaMinutos: true } }),
  ]);

  const serializados = pedidos.map((pedido) => ({
    id: pedido.id,
    codigo: pedido.codigo,
    tipo: pedido.tipo,
    estado: pedido.estado,
    createdAt: pedido.createdAt.toISOString(),
    notas: pedido.notas,
    mesa: pedido.mesa,
    usuario: pedido.usuario,
    detalles: pedido.detalles.map((detalle) => ({
      id: detalle.id,
      cantidad: detalle.cantidad,
      estadoItem: detalle.estadoItem,
      notas: detalle.notas,
      platillo: detalle.platillo,
      modificadores: detalle.modificadores,
    })),
  }));

  return (
    <CocinaKds
      pedidos={serializados}
      cocinero={user.name ?? "Cocina"}
      restaurante={config?.nombreRestaurante ?? "RestoManager"}
      alertaAmarilla={config?.kdsAlertaAmarillaMinutos ?? 10}
      alertaRoja={config?.kdsAlertaRojaMinutos ?? 20}
    />
  );
}
