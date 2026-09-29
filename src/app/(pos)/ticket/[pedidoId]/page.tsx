import { notFound } from "next/navigation";
import { Rol } from "@prisma/client";
import { requireAuthRoles } from "@/lib/auth-helpers";
import { getFacturaData } from "@/features/facturacion/factura-data";
import { PrintActions } from "@/components/precuenta/print-actions";

export default async function TicketPage({ params }: { params: Promise<{ pedidoId: string }> }) {
  const user = await requireAuthRoles([Rol.ADMIN, Rol.CAJERO, Rol.MESERO]);
  const { pedidoId } = await params;
  const data = await getFacturaData(pedidoId, { id: user.id, role: user.role });
  if (!data) notFound();
  const { pedido, config } = data;
  const money = (valor: number) => `${config?.simboloMoneda ?? "$"} ${Math.round(valor).toLocaleString("es-CO")}`;
  return <main className="min-h-screen bg-slate-100 py-10 print:bg-white print:p-0"><PrintActions mesaId={null} /><article className="thermal-ticket mx-auto bg-white shadow-xl print:shadow-none px-5 py-7 text-[11px] text-slate-900">
    <header className="text-center pb-4 border-b border-dashed border-slate-400"><h1 className="text-base font-black">{config?.nombreRestaurante ?? "RestoManager"}</h1>{config?.identificacionTributaria && <p>NIT {config.identificacionTributaria}</p>}<p>{config?.direccion}</p><p className="mt-2 font-black">COMPROBANTE #{pedido.codigo}</p><p>{new Date(pedido.createdAt).toLocaleString("es-CO")}</p></header>
    <section className="py-4 space-y-2">{pedido.detalles.map((d) => <div key={d.id}><div className="grid grid-cols-[auto_1fr_auto] gap-1"><b>{d.cantidad}x</b><span>{d.nombre}</span><b>{money(d.subtotal)}</b></div>{d.modificadores.map((m) => <p key={m} className="pl-5 text-slate-500">+ {m}</p>)}</div>)}</section>
    <section className="py-3 border-y border-dashed border-slate-400 space-y-1"><div className="flex justify-between"><span>Subtotal</span><span>{money(pedido.subtotal)}</span></div>{pedido.descuento > 0 && <div className="flex justify-between"><span>Descuento</span><span>-{money(pedido.descuento)}</span></div>}<div className="flex justify-between"><span>Impuestos</span><span>{money(pedido.impuesto)}</span></div>{pedido.propina > 0 && <div className="flex justify-between"><span>Propina</span><span>{money(pedido.propina)}</span></div>}<div className="flex justify-between text-sm font-black pt-2"><span>TOTAL</span><span>{money(pedido.total + pedido.propina)}</span></div></section>
    <section className="py-3">{pedido.pagos.map((p) => <div key={p.id} className="flex justify-between"><span>{p.metodoPago.replaceAll("_", " ")}</span><span>{money(p.monto)}</span></div>)}</section>
    <footer className="text-center pt-4 border-t border-dashed border-slate-400"><p>{config?.mensajeTicket ?? "Gracias por su visita"}</p><p className="mt-1 text-slate-400">RestoManager POS</p></footer>
  </article></main>;
}
