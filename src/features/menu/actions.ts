"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuthRoles } from "@/lib/auth-helpers";
import { Rol } from "@prisma/client";
import {
  categoriaMenuSchema,
  CategoriaMenuFormData,
  platilloSchema,
  PlatilloFormData,
  grupoModificadorSchema,
  GrupoModificadorFormData,
  opcionModificadorSchema,
  OpcionModificadorFormData,
} from "@/schemas/menu.schema";

export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

// -------------------------------------------------------------
// CATEGORÍAS DE MENÚ
// -------------------------------------------------------------

export async function getCategoriasMenuAction() {
  await requireAuthRoles([Rol.ADMIN, Rol.CAJERO, Rol.MESERO]);

  const categorias = await prisma.categoriaMenu.findMany({
    orderBy: { orden: "asc" },
    include: {
      subcategorias: {
        orderBy: { orden: "asc" },
      },
      _count: {
        select: { platillos: true },
      },
    },
  });

  return categorias;
}

export async function createCategoriaMenuAction(
  data: CategoriaMenuFormData
): Promise<ActionResult> {
  try {
    await requireAuthRoles([Rol.ADMIN]);

    const parsed = categoriaMenuSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Datos de categoría inválidos",
      };
    }

    const categoria = await prisma.categoriaMenu.create({
      data: parsed.data,
    });

    revalidatePath("/admin/menu");
    revalidatePath("/menu");
    revalidatePath("/pos");
    return { success: true, message: "Categoría creada exitosamente", data: categoria };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "Error al crear categoría" };
  }
}

export async function updateCategoriaMenuAction(
  id: string,
  data: CategoriaMenuFormData
): Promise<ActionResult> {
  try {
    await requireAuthRoles([Rol.ADMIN]);

    const parsed = categoriaMenuSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Datos de categoría inválidos",
      };
    }

    const categoria = await prisma.categoriaMenu.update({
      where: { id },
      data: parsed.data,
    });

    revalidatePath("/admin/menu");
    revalidatePath("/menu");
    revalidatePath("/pos");
    return { success: true, message: "Categoría actualizada exitosamente", data: categoria };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "Error al actualizar categoría" };
  }
}

export async function deleteCategoriaMenuAction(id: string): Promise<ActionResult> {
  try {
    await requireAuthRoles([Rol.ADMIN]);

    await prisma.categoriaMenu.delete({
      where: { id },
    });

    revalidatePath("/admin/menu");
    revalidatePath("/menu");
    revalidatePath("/pos");
    return { success: true, message: "Categoría eliminada exitosamente" };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "Error al eliminar categoría" };
  }
}

// -------------------------------------------------------------
// PLATILLOS / PRODUCTOS
// -------------------------------------------------------------

export async function getPlatillosAction(categoriaId?: string) {
  await requireAuthRoles([Rol.ADMIN, Rol.CAJERO, Rol.MESERO]);

  const platillos = await prisma.platillo.findMany({
    where: categoriaId ? { categoriaId } : undefined,
    orderBy: [{ favorito: "desc" }, { orden: "asc" }, { nombre: "asc" }],
    include: {
      categoria: true,
      subcategoria: true,
      gruposModificador: {
        include: {
          opciones: true,
        },
      },
      recetas: {
        include: { ingrediente: { select: { stockActual: true } } },
      },
    },
  });

  return platillos.map((p) => ({
    ...p,
    precio: Number(p.precio),
    costo: Number(p.costo),
    gruposModificador: p.gruposModificador.map((g) => ({
      ...g,
      opciones: g.opciones.map((o) => ({
        ...o,
        precioExtra: Number(o.precioExtra),
      })),
    })),
    sinStock: p.recetas.some((receta) => Number(receta.ingrediente.stockActual) < Number(receta.cantidad)),
    recetas: undefined,
  }));
}

export async function getPlatilloByIdAction(id: string) {
  await requireAuthRoles([Rol.ADMIN, Rol.CAJERO, Rol.MESERO]);

  const platillo = await prisma.platillo.findUnique({
    where: { id },
    include: {
      categoria: true,
      subcategoria: true,
      gruposModificador: {
        include: {
          opciones: true,
        },
      },
    },
  });

  if (!platillo) return null;

  return {
    ...platillo,
    precio: Number(platillo.precio),
    costo: Number(platillo.costo),
    gruposModificador: platillo.gruposModificador.map((g) => ({
      ...g,
      opciones: g.opciones.map((o) => ({
        ...o,
        precioExtra: Number(o.precioExtra),
      })),
    })),
  };
}

export async function createPlatilloAction(data: PlatilloFormData): Promise<ActionResult> {
  try {
    await requireAuthRoles([Rol.ADMIN]);

    const parsed = platilloSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Datos del platillo inválidos",
      };
    }

    const { subcategoriaId, ...rest } = parsed.data;

    const platillo = await prisma.platillo.create({
      data: {
        ...rest,
        subcategoriaId: subcategoriaId || null,
      },
    });

    revalidatePath("/admin/menu");
    revalidatePath("/menu");
    revalidatePath("/pos");
    return { success: true, message: "Platillo creado exitosamente", data: platillo };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "Error al crear platillo" };
  }
}

export async function updatePlatilloAction(
  id: string,
  data: PlatilloFormData
): Promise<ActionResult> {
  try {
    await requireAuthRoles([Rol.ADMIN]);

    const parsed = platilloSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Datos del platillo inválidos",
      };
    }

    const { subcategoriaId, ...rest } = parsed.data;

    const platillo = await prisma.platillo.update({
      where: { id },
      data: {
        ...rest,
        subcategoriaId: subcategoriaId || null,
      },
    });

    revalidatePath("/admin/menu");
    revalidatePath("/menu");
    revalidatePath("/pos");
    return { success: true, message: "Platillo actualizado exitosamente", data: platillo };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "Error al actualizar platillo" };
  }
}

export async function deletePlatilloAction(id: string): Promise<ActionResult> {
  try {
    await requireAuthRoles([Rol.ADMIN]);

    await prisma.platillo.delete({
      where: { id },
    });

    revalidatePath("/admin/menu");
    revalidatePath("/menu");
    revalidatePath("/pos");
    return { success: true, message: "Platillo eliminado exitosamente" };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "Error al eliminar platillo" };
  }
}

export async function toggleFavoritoPlatilloAction(id: string): Promise<ActionResult> {
  try {
    await requireAuthRoles([Rol.ADMIN, Rol.CAJERO, Rol.MESERO]);

    const platillo = await prisma.platillo.findUnique({ where: { id } });
    if (!platillo) return { success: false, error: "Platillo no encontrado" };

    const updated = await prisma.platillo.update({
      where: { id },
      data: { favorito: !platillo.favorito },
    });

    revalidatePath("/admin/menu");
    revalidatePath("/menu");
    revalidatePath("/pos");
    return {
      success: true,
      message: updated.favorito ? "Añadido a favoritos" : "Quitado de favoritos",
    };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "Error al actualizar favorito" };
  }
}

export async function toggleDisponiblePlatilloAction(id: string): Promise<ActionResult> {
  try {
    await requireAuthRoles([Rol.ADMIN, Rol.CAJERO, Rol.MESERO]);

    const platillo = await prisma.platillo.findUnique({ where: { id } });
    if (!platillo) return { success: false, error: "Platillo no encontrado" };

    const updated = await prisma.platillo.update({
      where: { id },
      data: { disponible: !platillo.disponible },
    });

    revalidatePath("/admin/menu");
    revalidatePath("/menu");
    revalidatePath("/pos");
    return {
      success: true,
      message: updated.disponible ? "Platillo disponible" : "Platillo marcado como agotado",
    };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "Error al cambiar disponibilidad" };
  }
}

// -------------------------------------------------------------
// GRUPOS Y OPCIONES MODIFICADORAS
// -------------------------------------------------------------

export async function createGrupoModificadorAction(
  data: GrupoModificadorFormData
): Promise<ActionResult> {
  try {
    await requireAuthRoles([Rol.ADMIN]);

    const parsed = grupoModificadorSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Datos del grupo inválidos",
      };
    }

    const grupo = await prisma.grupoModificador.create({
      data: parsed.data,
    });

    revalidatePath("/admin/menu");
    revalidatePath("/menu");
    revalidatePath("/pos");
    return { success: true, message: "Grupo de modificadores creado", data: grupo };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "Error al crear grupo modificador" };
  }
}

export async function deleteGrupoModificadorAction(id: string): Promise<ActionResult> {
  try {
    await requireAuthRoles([Rol.ADMIN]);

    await prisma.grupoModificador.delete({
      where: { id },
    });

    revalidatePath("/admin/menu");
    revalidatePath("/menu");
    revalidatePath("/pos");
    return { success: true, message: "Grupo modificador eliminado" };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "Error al eliminar grupo modificador" };
  }
}

export async function createOpcionModificadorAction(
  data: OpcionModificadorFormData
): Promise<ActionResult> {
  try {
    await requireAuthRoles([Rol.ADMIN]);

    const parsed = opcionModificadorSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Datos de la opción inválidos",
      };
    }

    const opcion = await prisma.opcionModificador.create({
      data: parsed.data,
    });

    revalidatePath("/admin/menu");
    revalidatePath("/menu");
    revalidatePath("/pos");
    return { success: true, message: "Opción modificadora agregada", data: opcion };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "Error al agregar opción" };
  }
}

export async function deleteOpcionModificadorAction(id: string): Promise<ActionResult> {
  try {
    await requireAuthRoles([Rol.ADMIN]);

    await prisma.opcionModificador.delete({
      where: { id },
    });

    revalidatePath("/admin/menu");
    revalidatePath("/menu");
    revalidatePath("/pos");
    return { success: true, message: "Opción modificadora eliminada" };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "Error al eliminar opción" };
  }
}
