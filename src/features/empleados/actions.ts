"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuthRoles } from "@/lib/auth-helpers";
import { Rol } from "@prisma/client";
import { empleadoFormSchema, EmpleadoFormData } from "@/schemas/empleado.schema";
import { protectPin } from "@/lib/pin-security";

export type ActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
};

// 1. Obtener lista de empleados
export async function getEmpleadosAction() {
  await requireAuthRoles([Rol.ADMIN]);

  const empleados = await prisma.usuario.findMany({
    select: {
      id: true,
      nombre: true,
      email: true,
      pin: true,
      rol: true,
      activo: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          pedidos: true,
          turnos: true,
        },
      },
    },
    orderBy: [
      { activo: "desc" },
      { rol: "asc" },
      { nombre: "asc" },
    ],
  });

  return empleados.map(({ pin, ...empleado }) => ({ ...empleado, pin: pin ? "Configurado" : null }));
}

// 2. Crear nuevo empleado
export async function createEmpleadoAction(
  data: EmpleadoFormData
): Promise<ActionResult> {
  try {
    await requireAuthRoles([Rol.ADMIN]);

    const parsed = empleadoFormSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Datos inválidos",
      };
    }

    const { nombre, email, password, pin, rol, activo } = parsed.data;

    // Verificar si el email ya existe
    if (email && email.trim() !== "") {
      const existingEmail = await prisma.usuario.findUnique({
        where: { email: email.trim().toLowerCase() },
      });
      if (existingEmail) {
        return { success: false, error: "Ya existe un usuario con este correo electrónico." };
      }
    }

    // Verificar si el PIN ya existe
    if (pin && pin.trim() !== "") {
      const existingPin = await prisma.usuario.findFirst({
        where: { pin: { in: [pin.trim(), protectPin(pin.trim())] } },
      });
      if (existingPin) {
        return { success: false, error: "El PIN ingresado ya está asignado a otro empleado." };
      }
    }

    let passwordHash: string | undefined = undefined;
    if (password && password.trim() !== "") {
      passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    await prisma.usuario.create({
      data: {
        nombre: nombre.trim(),
        email: email && email.trim() !== "" ? email.trim().toLowerCase() : null,
        passwordHash,
        pin: pin && pin.trim() !== "" ? protectPin(pin.trim()) : null,
        rol,
        activo,
      },
    });

    revalidatePath("/admin/empleados");
    return { success: true, message: "Empleado creado exitosamente." };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "Error al crear el empleado." };
  }
}

// 3. Actualizar empleado existente
export async function updateEmpleadoAction(
  id: string,
  data: EmpleadoFormData
): Promise<ActionResult> {
  try {
    await requireAuthRoles([Rol.ADMIN]);

    const parsed = empleadoFormSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Datos inválidos",
      };
    }

    const { nombre, email, password, pin, rol, activo } = parsed.data;

    const existingUser = await prisma.usuario.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return { success: false, error: "Empleado no encontrado." };
    }

    // Validar conflicto de email
    if (email && email.trim() !== "") {
      const emailConflict = await prisma.usuario.findFirst({
        where: {
          email: email.trim().toLowerCase(),
          NOT: { id },
        },
      });
      if (emailConflict) {
        return { success: false, error: "Otro empleado ya tiene asignado este email." };
      }
    }

    // Validar conflicto de PIN
    if (pin && pin.trim() !== "") {
      const pinConflict = await prisma.usuario.findFirst({
        where: {
          pin: { in: [pin.trim(), protectPin(pin.trim())] },
          NOT: { id },
        },
      });
      if (pinConflict) {
        return { success: false, error: "Otro empleado ya tiene asignado este PIN." };
      }
    }

    // Proteger contra desactivar o quitar admin al único admin
    if (existingUser.rol === Rol.ADMIN && (rol !== Rol.ADMIN || !activo)) {
      const totalActiveAdmins = await prisma.usuario.count({
        where: {
          rol: Rol.ADMIN,
          activo: true,
          NOT: { id },
        },
      });
      if (totalActiveAdmins === 0) {
        return {
          success: false,
          error: "No puedes desactivar ni cambiar el rol al único Administrador activo del sistema.",
        };
      }
    }

    const updateData: {
      nombre: string;
      email: string | null;
      pin: string | null;
      rol: Rol;
      activo: boolean;
      passwordHash?: string;
    } = {
      nombre: nombre.trim(),
      email: email && email.trim() !== "" ? email.trim().toLowerCase() : null,
      pin: parsed.data.quitarPin ? null : pin && pin.trim() !== "" ? protectPin(pin.trim()) : existingUser.pin,
      rol,
      activo,
    };

    if (password && password.trim() !== "") {
      updateData.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    await prisma.usuario.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/admin/empleados");
    return { success: true, message: "Empleado actualizado exitosamente." };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "Error al actualizar el empleado." };
  }
}

// 4. Cambiar estado activo/inactivo
export async function toggleEmpleadoStatusAction(id: string): Promise<ActionResult> {
  try {
    await requireAuthRoles([Rol.ADMIN]);

    const user = await prisma.usuario.findUnique({
      where: { id },
    });

    if (!user) {
      return { success: false, error: "Empleado no encontrado." };
    }

    // Proteger único admin
    if (user.rol === Rol.ADMIN && user.activo) {
      const totalActiveAdmins = await prisma.usuario.count({
        where: {
          rol: Rol.ADMIN,
          activo: true,
          NOT: { id },
        },
      });
      if (totalActiveAdmins === 0) {
        return {
          success: false,
          error: "No se puede desactivar al único Administrador activo del sistema.",
        };
      }
    }

    await prisma.usuario.update({
      where: { id },
      data: { activo: !user.activo },
    });

    revalidatePath("/admin/empleados");
    return {
      success: true,
      message: `Empleado ${!user.activo ? "activado" : "desactivado"} correctamente.`,
    };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "Error al cambiar estado." };
  }
}

// 5. Eliminar empleado
export async function deleteEmpleadoAction(id: string): Promise<ActionResult> {
  try {
    await requireAuthRoles([Rol.ADMIN]);

    const user = await prisma.usuario.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            pedidos: true,
            turnos: true,
            movimientosCaja: true,
          },
        },
      },
    });

    if (!user) {
      return { success: false, error: "Empleado no encontrado." };
    }

    // Proteger único admin
    if (user.rol === Rol.ADMIN) {
      const totalAdmins = await prisma.usuario.count({
        where: {
          rol: Rol.ADMIN,
          NOT: { id },
        },
      });
      if (totalAdmins === 0) {
        return {
          success: false,
          error: "No puedes eliminar al único Administrador del sistema.",
        };
      }
    }

    // Si tiene registros históricos asociados, realizar soft-delete (desactivar)
    const hasHistory =
      user._count.pedidos > 0 ||
      user._count.turnos > 0 ||
      user._count.movimientosCaja > 0;

    if (hasHistory) {
      await prisma.usuario.update({
        where: { id },
        data: { activo: false },
      });
      revalidatePath("/admin/empleados");
      return {
        success: true,
        message:
          "El empleado tiene pedidos o turnos históricos. Por seguridad contable, ha sido desactivado en lugar de eliminado.",
      };
    }

    await prisma.usuario.delete({
      where: { id },
    });

    revalidatePath("/admin/empleados");
    return { success: true, message: "Empleado eliminado exitosamente." };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "Error al eliminar el empleado." };
  }
}
