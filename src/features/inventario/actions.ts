"use server";

import { revalidatePath } from "next/cache";
import { Prisma, Rol, TipoMovimientoInventario } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuthRoles } from "@/lib/auth-helpers";
import type { ActionResult } from "@/features/menu/actions";
import { conteoInventarioSchema, ingredienteSchema, movimientoInventarioSchema, recetaSchema, type ConteoInventarioInput, type IngredienteInput, type MovimientoInventarioInput, type RecetaInput } from "@/schemas/inventario.schema";

const ROLES_INVENTARIO = [Rol.ADMIN];
const decimal3 = (valor: number) => new Prisma.Decimal(valor.toFixed(3));
const dinero = (valor: number) => new Prisma.Decimal(valor.toFixed(2));

async function recalcularCostoPlatillos(tx: Prisma.TransactionClient, platilloIds: string[]) {
  for (const platilloId of Array.from(new Set(platilloIds))) {
    const receta = await tx.recetaIngrediente.findMany({ where: { platilloId }, include: { ingrediente: { select: { costoUnitario: true } } } });
    const costo = receta.reduce((sum, item) => sum + Number(item.cantidad) * Number(item.ingrediente.costoUnitario), 0);
    await tx.platillo.update({ where: { id: platilloId }, data: { costo: dinero(costo) } });
  }
}

export async function crearIngredienteAction(data: IngredienteInput): Promise<ActionResult> {
  try {
    await requireAuthRoles(ROLES_INVENTARIO);
    const parsed = ingredienteSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };
    await prisma.$transaction(async (tx) => {
      const ingrediente = await tx.ingrediente.create({ data: { nombre: parsed.data.nombre, sku: parsed.data.sku || null, unidadMedida: parsed.data.unidadMedida, stockActual: decimal3(parsed.data.stockInicial), stockMinimo: decimal3(parsed.data.stockMinimo), costoUnitario: dinero(parsed.data.costoUnitario) } });
      if (parsed.data.stockInicial > 0) await tx.movimientoInventario.create({ data: { ingredienteId: ingrediente.id, tipo: TipoMovimientoInventario.AJUSTE, cantidad: decimal3(parsed.data.stockInicial), costoTotal: dinero(parsed.data.stockInicial * parsed.data.costoUnitario), motivo: "Inventario inicial", stockAntes: decimal3(0), stockDespues: decimal3(parsed.data.stockInicial) } });
    });
    revalidatePath("/admin/inventario"); revalidatePath("/pos");
    return { success: true, message: "Ingrediente creado" };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : "No se pudo crear el ingrediente" }; }
}

export async function actualizarIngredienteAction(id: string, data: IngredienteInput): Promise<ActionResult> {
  try {
    await requireAuthRoles(ROLES_INVENTARIO);
    const parsed = ingredienteSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };
    await prisma.$transaction(async (tx) => {
      const recetas = await tx.recetaIngrediente.findMany({ where: { ingredienteId: id }, select: { platilloId: true } });
      await tx.ingrediente.update({ where: { id }, data: { nombre: parsed.data.nombre, sku: parsed.data.sku || null, unidadMedida: parsed.data.unidadMedida, stockMinimo: decimal3(parsed.data.stockMinimo), costoUnitario: dinero(parsed.data.costoUnitario) } });
      await recalcularCostoPlatillos(tx, recetas.map((receta) => receta.platilloId));
    });
    revalidatePath("/admin/inventario"); revalidatePath("/admin/menu");
    return { success: true, message: "Ingrediente actualizado" };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : "No se pudo actualizar" }; }
}

export async function eliminarIngredienteAction(id: string): Promise<ActionResult> {
  try {
    await requireAuthRoles(ROLES_INVENTARIO);
    const ingrediente = await prisma.ingrediente.findUnique({ where: { id }, include: { _count: { select: { recetas: true, movimientos: true } } } });
    if (!ingrediente) return { success: false, error: "Ingrediente no encontrado" };
    if (ingrediente._count.recetas || ingrediente._count.movimientos) return { success: false, error: "No se puede eliminar un ingrediente con receta o historial" };
    await prisma.ingrediente.delete({ where: { id } });
    revalidatePath("/admin/inventario");
    return { success: true, message: "Ingrediente eliminado" };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : "No se pudo eliminar" }; }
}

export async function registrarMovimientoInventarioAction(data: MovimientoInventarioInput): Promise<ActionResult> {
  try {
    await requireAuthRoles(ROLES_INVENTARIO);
    const parsed = movimientoInventarioSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };
    await prisma.$transaction(async (tx) => {
      const ingrediente = await tx.ingrediente.findUnique({ where: { id: parsed.data.ingredienteId } });
      if (!ingrediente) throw new Error("Ingrediente no encontrado");
      const antes = Number(ingrediente.stockActual);
      const despues = parsed.data.tipo === TipoMovimientoInventario.COMPRA ? antes + parsed.data.cantidad : antes - parsed.data.cantidad;
      if (despues < 0) throw new Error("La merma supera el stock disponible");
      let nuevoCosto = Number(ingrediente.costoUnitario);
      if (parsed.data.tipo === TipoMovimientoInventario.COMPRA && parsed.data.costoUnitario !== undefined) nuevoCosto = despues > 0 ? ((antes * nuevoCosto) + (parsed.data.cantidad * parsed.data.costoUnitario)) / despues : parsed.data.costoUnitario;
      await tx.ingrediente.update({ where: { id: ingrediente.id }, data: { stockActual: decimal3(despues), costoUnitario: dinero(nuevoCosto) } });
      await tx.movimientoInventario.create({ data: { ingredienteId: ingrediente.id, tipo: parsed.data.tipo, cantidad: decimal3(parsed.data.cantidad), costoTotal: dinero(parsed.data.cantidad * (parsed.data.costoUnitario ?? nuevoCosto)), motivo: parsed.data.motivo, stockAntes: decimal3(antes), stockDespues: decimal3(despues) } });
      const recetas = await tx.recetaIngrediente.findMany({ where: { ingredienteId: ingrediente.id }, select: { platilloId: true } });
      await recalcularCostoPlatillos(tx, recetas.map((receta) => receta.platilloId));
    });
    revalidatePath("/admin/inventario"); revalidatePath("/admin/menu"); revalidatePath("/pos");
    return { success: true, message: parsed.data.tipo === TipoMovimientoInventario.COMPRA ? "Compra registrada" : "Merma registrada" };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : "No se pudo registrar el movimiento" }; }
}

export async function registrarConteoInventarioAction(data: ConteoInventarioInput): Promise<ActionResult> {
  try {
    await requireAuthRoles(ROLES_INVENTARIO);
    const parsed = conteoInventarioSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };
    await prisma.$transaction(async (tx) => {
      const ingrediente = await tx.ingrediente.findUnique({ where: { id: parsed.data.ingredienteId } });
      if (!ingrediente) throw new Error("Ingrediente no encontrado");
      const antes = Number(ingrediente.stockActual);
      const diferencia = parsed.data.cantidadFisica - antes;
      await tx.ingrediente.update({ where: { id: ingrediente.id }, data: { stockActual: decimal3(parsed.data.cantidadFisica) } });
      await tx.movimientoInventario.create({ data: { ingredienteId: ingrediente.id, tipo: TipoMovimientoInventario.AJUSTE, cantidad: decimal3(diferencia), costoTotal: dinero(Math.abs(diferencia) * Number(ingrediente.costoUnitario)), motivo: parsed.data.motivo, stockAntes: decimal3(antes), stockDespues: decimal3(parsed.data.cantidadFisica) } });
    });
    revalidatePath("/admin/inventario"); revalidatePath("/pos");
    return { success: true, message: "Conteo aplicado" };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : "No se pudo aplicar el conteo" }; }
}

export async function guardarRecetaAction(data: RecetaInput): Promise<ActionResult> {
  try {
    await requireAuthRoles(ROLES_INVENTARIO);
    const parsed = recetaSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };
    const ids = parsed.data.ingredientes.map((item) => item.ingredienteId);
    if (new Set(ids).size !== ids.length) return { success: false, error: "No repita ingredientes en la receta" };
    await prisma.$transaction(async (tx) => {
      await tx.recetaIngrediente.deleteMany({ where: { platilloId: parsed.data.platilloId } });
      await tx.recetaIngrediente.createMany({ data: parsed.data.ingredientes.map((item) => ({ platilloId: parsed.data.platilloId, ingredienteId: item.ingredienteId, cantidad: decimal3(item.cantidad) })) });
      await recalcularCostoPlatillos(tx, [parsed.data.platilloId]);
    });
    revalidatePath("/admin/inventario"); revalidatePath("/admin/menu"); revalidatePath("/pos");
    return { success: true, message: "Receta guardada y costo recalculado" };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : "No se pudo guardar la receta" }; }
}

export async function actualizarPoliticaStockAction(prohibirVentaSinStock: boolean): Promise<ActionResult> {
  try {
    await requireAuthRoles(ROLES_INVENTARIO);
    const config = await prisma.configuracion.findFirst();
    if (config) await prisma.configuracion.update({ where: { id: config.id }, data: { prohibirVentaSinStock } });
    else await prisma.configuracion.create({ data: { prohibirVentaSinStock } });
    revalidatePath("/admin/inventario"); revalidatePath("/pos");
    return { success: true, message: prohibirVentaSinStock ? "Bloqueo por stock activado" : "Venta sin stock permitida" };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : "No se pudo cambiar la política" }; }
}
