import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { EstadoItem, EstadoPedido, Rol } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== Rol.ADMIN && user.role !== Rol.COCINERO)) return new Response("No autorizado", { status: 401 });

  const encoder = new TextEncoder();
  let ultimaFirma = "";
  const stream = new ReadableStream({
    async start(controller) {
      const enviar = (evento: string, data: string) => controller.enqueue(encoder.encode(`event: ${evento}\ndata: ${data}\n\n`));
      enviar("connected", JSON.stringify({ ok: true }));
      while (!request.signal.aborted) {
        try {
          const vigente = await prisma.usuario.findUnique({ where: { id: user.id }, select: { activo: true, rol: true } });
          if (!vigente?.activo || (vigente.rol !== Rol.ADMIN && vigente.rol !== Rol.COCINERO)) break;
          const pedidos = await prisma.pedido.findMany({
            where: { estado: { in: [EstadoPedido.PENDIENTE, EstadoPedido.EN_PREPARACION, EstadoPedido.LISTO] }, detalles: { some: { estadoItem: { not: EstadoItem.SERVIDO } } } },
            select: { id: true, estado: true, updatedAt: true, detalles: { select: { id: true, estadoItem: true, updatedAt: true } } },
            orderBy: { updatedAt: "asc" },
          });
          const firma = JSON.stringify(pedidos);
          if (firma !== ultimaFirma) { ultimaFirma = firma; enviar("orders", JSON.stringify({ changed: true })); }
          else enviar("heartbeat", JSON.stringify({ at: Date.now() }));
        } catch {
          enviar("error", JSON.stringify({ retry: true }));
        }
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }
      controller.close();
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" } });
}
