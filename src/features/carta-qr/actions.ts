"use server";

import { headers } from "next/headers";
import { EstadoDelivery, EstadoMesa, EstadoPedido, Prisma, TipoPedido } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { allowAttempt } from "@/lib/rate-limit";

const pedidoPublicoSchema = z.object({
  solicitudId: z.string().uuid(),
  modalidad: z.enum(["MESA", "DELIVERY", "RETIRO"]),
  mesaId: z.string().cuid().optional(),
  nombre: z.string().trim().min(2).max(100),
  telefono: z.string().trim().min(7).max(30),
  direccion: z.string().trim().max(180).optional(),
  referencia: z.string().trim().max(180).optional(),
  notas: z.string().trim().max(300).optional(),
  items: z.array(z.object({ platilloId: z.string().cuid(), cantidad: z.number().int().min(1).max(20) })).min(1).max(50),
});

export type PedidoPublicoInput = z.infer<typeof pedidoPublicoSchema>;

export async function crearPedidoPublicoAction(input: PedidoPublicoInput) {
  const parsed = pedidoPublicoSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const data = parsed.data;
  const previo = await prisma.pedido.findUnique({ where: { tokenSeguimiento: data.solicitudId }, select: { codigo: true, tokenSeguimiento: true } });
  if (previo) return { success: true as const, data: { token: previo.tokenSeguimiento!, codigo: previo.codigo } };
  const requestHeaders = await headers();
  const source = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allowAttempt(`qr:${source}`, 10, 60_000) || !allowAttempt("qr:global", 100, 60_000)) return { success: false as const, error: "Demasiados pedidos. Espera un minuto antes de intentar de nuevo." };
  if (data.modalidad === "MESA" && !data.mesaId) return { success: false as const, error: "La mesa es obligatoria" };
  if (data.modalidad === "DELIVERY" && !data.direccion) return { success: false as const, error: "La dirección es obligatoria" };

  const ids = [...new Set(data.items.map((item) => item.platilloId))];
  const [platillos, config] = await Promise.all([
    prisma.platillo.findMany({ where: { id: { in: ids }, disponible: true } }),
    prisma.configuracion.findFirst(),
  ]);
  if (platillos.length !== ids.length) return { success: false as const, error: "Uno de los productos ya no está disponible" };
  const mapa = new Map(platillos.map((p) => [p.id, p]));
  const subtotal = data.items.reduce((sum, item) => sum.plus(mapa.get(item.platilloId)!.precio.mul(item.cantidad)), new Prisma.Decimal(0));
  const impuesto = config?.aplicarImpuesto && !config.impuestoIncluido ? subtotal.mul(config.porcentajeImpuesto).div(100).toDecimalPlaces(2) : new Prisma.Decimal(0);
  const costoEnvio = data.modalidad === "DELIVERY" ? new Prisma.Decimal(5000) : new Prisma.Decimal(0);
  const token = data.solicitudId;

  const pedido = await prisma.$transaction(async (tx) => {
    const creado = await tx.pedido.create({
      data: {
        tipo: data.modalidad === "MESA" ? TipoPedido.EN_MESA : data.modalidad === "DELIVERY" ? TipoPedido.DELIVERY : TipoPedido.MOSTRADOR,
        estado: EstadoPedido.PENDIENTE,
        mesaId: data.modalidad === "MESA" ? data.mesaId : null,
        notas: data.notas || null,
        subtotal,
        impuesto,
        total: subtotal.plus(impuesto).plus(costoEnvio),
        origenOnline: true,
        tokenSeguimiento: token,
        detalles: { create: data.items.map((item) => ({ platilloId: item.platilloId, cantidad: item.cantidad, precioUnitario: mapa.get(item.platilloId)!.precio, subtotal: mapa.get(item.platilloId)!.precio.mul(item.cantidad) })) },
        delivery: data.modalidad === "DELIVERY" ? { create: { nombreCliente: data.nombre, telefono: data.telefono, direccion: data.direccion!, referencia: data.referencia || null, costoEnvio, estado: EstadoDelivery.PENDIENTE } } : undefined,
      },
      select: { codigo: true },
    });
    if (data.modalidad === "MESA" && data.mesaId) await tx.mesa.update({ where: { id: data.mesaId }, data: { estado: EstadoMesa.OCUPADA } });
    return creado;
  }).catch(async (error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.pedido.findUnique({ where: { tokenSeguimiento: token }, select: { codigo: true } });
      if (existing) return existing;
    }
    throw error;
  });
  revalidatePath("/cocina");
  revalidatePath("/delivery");
  return { success: true as const, data: { token, codigo: pedido.codigo } };
}
