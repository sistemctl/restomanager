import { prisma } from "@/lib/prisma";
import { InventarioManager } from "@/features/inventario/components/inventario-manager";

export default async function InventarioPage() {
  const [ingredientes, platillos, movimientos, config] = await Promise.all([
    prisma.ingrediente.findMany({ include: { _count: { select: { recetas: true, movimientos: true } } }, orderBy: { nombre: "asc" } }),
    prisma.platillo.findMany({ include: { categoria: { select: { nombre: true } }, recetas: { include: { ingrediente: { select: { nombre: true, unidadMedida: true } } } } }, orderBy: [{ categoria: { orden: "asc" } }, { nombre: "asc" }] }),
    prisma.movimientoInventario.findMany({ include: { ingrediente: { select: { nombre: true, unidadMedida: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.configuracion.findFirst({ select: { prohibirVentaSinStock: true, simboloMoneda: true } }),
  ]);

  return <InventarioManager
    ingredientes={ingredientes.map((i) => ({ ...i, stockActual: Number(i.stockActual), stockMinimo: Number(i.stockMinimo), costoUnitario: Number(i.costoUnitario) }))}
    platillos={platillos.map((p) => ({ ...p, precio: Number(p.precio), costo: Number(p.costo), recetas: p.recetas.map((r) => ({ ...r, cantidad: Number(r.cantidad) })) }))}
    movimientos={movimientos.map((m) => ({ ...m, cantidad: Number(m.cantidad), costoTotal: Number(m.costoTotal), stockAntes: Number(m.stockAntes), stockDespues: Number(m.stockDespues), createdAt: m.createdAt.toISOString() }))}
    prohibirVentaSinStock={config?.prohibirVentaSinStock ?? false}
    simboloMoneda={config?.simboloMoneda ?? "$"}
  />;
}
