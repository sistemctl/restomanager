import React from "react";
import { prisma } from "@/lib/prisma";
import { requirePageRoles } from "@/lib/auth-helpers";
import { Rol } from "@prisma/client";
import { getSalasConMesasAction, getReservacionesAction } from "@/features/mesas/actions";
import { MesasManager } from "@/features/mesas/components/mesas-manager";

export default async function AdminMesasPage() {
  const user = await requirePageRoles([Rol.ADMIN, Rol.CAJERO]);

  const config = await prisma.configuracion.findFirst();
  const salas = await getSalasConMesasAction();
  const reservaciones = await getReservacionesAction();

  return (
    <MesasManager
      canManageLayout={user.role === Rol.ADMIN}
      initialSalas={salas}
      initialReservaciones={reservaciones}
      simboloMoneda={config?.simboloMoneda || "$"}
    />
  );
}
