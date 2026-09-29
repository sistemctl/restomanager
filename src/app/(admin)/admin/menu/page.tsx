import React from "react";
import { prisma } from "@/lib/prisma";
import { requireAuthRoles } from "@/lib/auth-helpers";
import { Rol } from "@prisma/client";
import { getCategoriasMenuAction, getPlatillosAction } from "@/features/menu/actions";
import { MenuManager } from "@/features/menu/components/menu-manager";

export default async function AdminMenuPage() {
  await requireAuthRoles([Rol.ADMIN]);

  const config = await prisma.configuracion.findFirst();
  const categorias = await getCategoriasMenuAction();
  const platillos = await getPlatillosAction();

  return (
    <MenuManager
      initialCategorias={categorias}
      initialPlatillos={platillos}
      simboloMoneda={config?.simboloMoneda || "$"}
    />
  );
}
