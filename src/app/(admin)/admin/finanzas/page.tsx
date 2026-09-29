import { requirePageRoles } from "@/lib/auth-helpers";
import { EstadoPedido, Rol } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { FinanzasManager } from "@/features/finanzas/components/finanzas-manager";

export default async function FinanzasPage() {
  const user = await requirePageRoles([Rol.ADMIN, Rol.CAJERO]);
  const canManageFinances = user.role === Rol.ADMIN;
  const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0,0,0,0);
  const [clientes, proveedores, categorias, gastos, ventas] = await Promise.all([
    prisma.cliente.findMany({ include: { movimientosCuenta: { orderBy: { createdAt: "desc" }, take: 8 }, _count: { select: { pedidos: true } } }, orderBy: { nombre: "asc" } }),
    canManageFinances ? prisma.proveedor.findMany({ include: { movimientosCuenta: { orderBy: { createdAt: "desc" }, take: 8 }, _count: { select: { gastos: true } } }, orderBy: { nombre: "asc" } }) : Promise.resolve([]),
    canManageFinances ? prisma.categoriaGasto.findMany({ orderBy: { nombre: "asc" } }) : Promise.resolve([]),
    canManageFinances ? prisma.gasto.findMany({ include: { categoria: true, proveedor: { select: { nombre: true } } }, orderBy: { fecha: "desc" }, take: 200 }) : Promise.resolve([]),
    prisma.pedido.aggregate({ where: { estado: EstadoPedido.COMPLETADO, updatedAt: { gte: inicioMes } }, _sum: { total: true, propina: true } }),
  ]);
  const ingresosMes = Number(ventas._sum.total ?? 0) + Number(ventas._sum.propina ?? 0);
  const gastosMes = gastos.filter((g) => g.fecha >= inicioMes).reduce((s,g) => s + Number(g.monto),0);
  return <FinanzasManager canManageFinances={canManageFinances}
    clientes={clientes.map(c=>({...c,saldoCuentaCorriente:Number(c.saldoCuentaCorriente),descuentoFijo:c.descuentoFijo===null?null:Number(c.descuentoFijo),movimientosCuenta:c.movimientosCuenta.map(m=>({...m,monto:Number(m.monto),createdAt:m.createdAt.toISOString()}))}))}
    proveedores={proveedores.map(p=>({...p,saldoCuentaCorriente:Number(p.saldoCuentaCorriente),movimientosCuenta:p.movimientosCuenta.map(m=>({...m,monto:Number(m.monto),createdAt:m.createdAt.toISOString()}))}))}
    categorias={categorias}
    gastos={gastos.map(g=>({...g,monto:Number(g.monto),fecha:g.fecha.toISOString(),fechaVencimiento:g.fechaVencimiento?.toISOString()??null,createdAt:g.createdAt.toISOString(),updatedAt:g.updatedAt.toISOString()}))}
    ingresosMes={ingresosMes} gastosMes={gastosMes}
  />;
}
