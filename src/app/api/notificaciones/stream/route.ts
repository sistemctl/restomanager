import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { EstadoItem, EstadoPedido, Rol } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const role = user?.role;
  if (!user || (role !== Rol.ADMIN && role !== Rol.CAJERO && role !== Rol.MESERO)) {
    return new Response("No autorizado", { status: 401 });
  }

  const encoder = new TextEncoder();
  let ultimaFirma = "";
  const stream = new ReadableStream({
    async start(controller) {
      const enviar = (data: unknown) => controller.enqueue(encoder.encode(`event: ready\ndata: ${JSON.stringify(data)}\n\n`));
      while (!request.signal.aborted) {
        try {
          const vigente = await prisma.usuario.findUnique({ where: { id: user.id }, select: { activo: true, rol: true } });
          if (!vigente?.activo || vigente.rol !== role) break;
          const pedidos = await prisma.pedido.findMany({
            where: {
              estado: EstadoPedido.LISTO,
              ...(role === Rol.MESERO ? { usuarioId: user.id } : {}),
              detalles: { some: { estadoItem: EstadoItem.LISTO } },
            },
            select: {
              id: true,
              codigo: true,
              tipo: true,
              updatedAt: true,
              mesaId: true,
              mesa: { select: { numero: true, sala: { select: { nombre: true } } } },
            },
            orderBy: { updatedAt: "desc" },
          });
          const firma = JSON.stringify(pedidos);
          if (firma !== ultimaFirma) {
            ultimaFirma = firma;
            enviar(pedidos);
          }
        } catch {
          // EventSource reconectará si la conexión llega a cerrarse.
        }
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
