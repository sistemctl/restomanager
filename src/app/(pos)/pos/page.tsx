import React from "react";
import { prisma } from "@/lib/prisma";
import { requirePageRoles } from "@/lib/auth-helpers";
import { Rol } from "@prisma/client";
import { getSalasConMesasAction } from "@/features/mesas/actions";
import { getCategoriasMenuAction, getPlatillosAction } from "@/features/menu/actions";
import { getPedidoActivoMesaAction } from "@/features/pos/actions";
import { PosTerminal } from "@/features/pos/components/pos-terminal";

interface PosPageProps {
  searchParams: Promise<{ mesaId?: string }>;
}

export default async function PosPage({ searchParams }: PosPageProps) {
  const user = await requirePageRoles([Rol.ADMIN, Rol.CAJERO, Rol.MESERO]);
  const params = await searchParams;
  const initialMesaId = params.mesaId;

  // Cargar datos en paralelo para máxima velocidad
  const [salas, categorias, platillos, meseros, clientes, config, pedidoActivo] = await Promise.all([
    getSalasConMesasAction(),
    getCategoriasMenuAction(),
    getPlatillosAction(),
    prisma.usuario.findMany({
      where: {
        activo: true,
        rol: { in: [Rol.ADMIN, Rol.CAJERO, Rol.MESERO] },
      },
      select: {
        id: true,
        nombre: true,
        rol: true,
      },
      orderBy: { nombre: "asc" },
    }),
    prisma.cliente.findMany({ select: { id: true, nombre: true, documento: true, descuentoFijo: true }, orderBy: { nombre: "asc" } }),
    prisma.configuracion.findFirst(),
    initialMesaId ? getPedidoActivoMesaAction(initialMesaId) : Promise.resolve(null),
  ]);

  return (
    <PosTerminal
      salas={salas}
      meseros={meseros}
      clientes={clientes.map((cliente) => ({ ...cliente, descuentoFijo: cliente.descuentoFijo === null ? null : Number(cliente.descuentoFijo) }))}
      categorias={categorias}
      platillos={platillos}
      config={config ? {
        ...config,
        porcentajeImpuesto: Number(config.porcentajeImpuesto),
        propinaSugerida: Number(config.propinaSugerida),
      } : null}
      currentUser={user}
      initialMesaId={initialMesaId}
      pedidoActivoExistente={pedidoActivo}
    />
  );
}
