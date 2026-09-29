import { auth } from "@/lib/auth";
import { Rol } from "@prisma/client";
import { redirect } from "next/navigation";
import { getDefaultRedirectForRole } from "@/lib/role-access";
import { prisma } from "@/lib/prisma";
import { cache } from "react";
export { getDefaultRedirectForRole } from "@/lib/role-access";

export const getCurrentUser = cache(async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.usuario.findUnique({ where: { id: session.user.id }, select: { id: true, rol: true, activo: true, nombre: true, email: true } });
  if (!user?.activo) return null;
  return { id: user.id, role: user.rol, name: user.nombre, email: user.email };
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user || !user.id) {
    throw new Error("No autenticado. Por favor inicie sesión.");
  }
  return user;
}

export async function requireAuthRoles(allowedRoles: Rol[]) {
  const user = await requireUser();
  if (!allowedRoles.includes(user.role)) {
    throw new Error(
      `Acceso denegado: El rol ${user.role} no tiene permisos para realizar esta acción.`
    );
  }
  return user;
}

export async function requirePageRoles(allowedRoles: Rol[]) {
  const user = await getCurrentUser();
  if (!user?.id) redirect("/login");
  if (!allowedRoles.includes(user.role)) redirect(getDefaultRedirectForRole(user.role));
  return user;
}
