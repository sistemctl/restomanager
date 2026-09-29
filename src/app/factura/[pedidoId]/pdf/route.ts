import { renderToBuffer } from "@react-pdf/renderer";
import { Rol } from "@prisma/client";
import { requireAuthRoles } from "@/lib/auth-helpers";
import { FacturaDocumento } from "@/features/facturacion/factura-documento";
import { getFacturaData } from "@/features/facturacion/factura-data";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ pedidoId: string }> }) {
  const user = await requireAuthRoles([Rol.ADMIN, Rol.CAJERO, Rol.MESERO]);
  const { pedidoId } = await params;
  const data = await getFacturaData(pedidoId, { id: user.id, role: user.role });
  if (!data) return new Response("Comprobante no disponible", { status: 404 });
  const buffer = await renderToBuffer(FacturaDocumento({ data }));
  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="comprobante-${data.pedido.codigo}.pdf"`, "Cache-Control": "private, no-store" },
  });
}
