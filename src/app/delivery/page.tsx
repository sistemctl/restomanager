import { Rol } from "@prisma/client";
import { requireAuthRoles } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { DeliveryBoard } from "@/features/delivery/components/delivery-board";

export default async function DeliveryPage() {
  const user = await requireAuthRoles([Rol.ADMIN, Rol.CAJERO, Rol.REPARTIDOR]);
  const canAssign = user.role !== Rol.REPARTIDOR;
  const [entregas, repartidores] = await Promise.all([
    prisma.direccionDelivery.findMany({ where: { estado: { not: "CANCELADO" }, ...(!canAssign ? { repartidorId: user.id } : {}) }, include: { repartidor: { select: { id: true, nombre: true } }, pedido: { select: { codigo: true, total: true, createdAt: true, detalles: { select: { cantidad: true, platillo: { select: { nombre: true } } } } } } }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.usuario.findMany({ where: { rol: Rol.REPARTIDOR, activo: true, ...(!canAssign ? { id: user.id } : {}) }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
  ]);
  return <div className="p-4 md:p-6"><DeliveryBoard canAssign={canAssign} repartidores={repartidores} entregas={entregas.map(e => ({ ...e, costoEnvio: Number(e.costoEnvio), pedido: { ...e.pedido, total: Number(e.pedido.total), createdAt: e.pedido.createdAt.toISOString() } }))} /></div>;
}
