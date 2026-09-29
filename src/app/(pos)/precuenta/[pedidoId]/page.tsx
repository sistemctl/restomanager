import { notFound } from "next/navigation";
import { Rol } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuthRoles } from "@/lib/auth-helpers";
import { PrintActions } from "@/components/precuenta/print-actions";

export default async function PrecuentaPage({ params }: { params: Promise<{ pedidoId: string }> }) {
  const user = await requireAuthRoles([Rol.ADMIN, Rol.CAJERO, Rol.MESERO]);
  const { pedidoId } = await params;
  const [pedido, config] = await Promise.all([
    prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: {
        mesa: { select: { numero: true, sala: { select: { nombre: true } } } },
        usuario: { select: { nombre: true } },
        detalles: { include: { platillo: { select: { nombre: true } }, modificadores: true }, orderBy: [{ comensal: "asc" }, { createdAt: "asc" }] },
      },
    }),
    prisma.configuracion.findFirst(),
  ]);
  if (!pedido || (user.role === Rol.MESERO && pedido.usuarioId !== user.id)) notFound();

  const simbolo = config?.simboloMoneda ?? "$";
  const formato = (valor: number) => `${simbolo} ${Math.round(valor).toLocaleString("es-CO")}`;

  return (
    <main className="min-h-screen bg-slate-100 py-12 px-4 print:bg-white print:p-0">
      <PrintActions mesaId={pedido.mesaId} />
      <article className="mx-auto w-full max-w-[420px] bg-white shadow-2xl print:shadow-none px-8 py-10 text-slate-900">
        <header className="text-center border-b-2 border-dashed border-slate-300 pb-6">
          <p className="text-xl font-black tracking-tight">{config?.nombreRestaurante ?? "RestoManager"}</p>
          {config?.razonSocial && <p className="text-xs text-slate-500 mt-1">{config.razonSocial}</p>}
          {config?.identificacionTributaria && <p className="text-xs text-slate-500">NIT: {config.identificacionTributaria}</p>}
          {config?.direccion && <p className="text-xs text-slate-500">{config.direccion}{config.ciudad ? ` · ${config.ciudad}` : ""}</p>}
          <div className="mt-5 inline-flex px-3 py-1 rounded-full bg-slate-900 text-white text-[10px] font-black tracking-[0.18em]">PRECUENTA · NO VÁLIDA COMO FACTURA</div>
        </header>

        <section className="py-5 border-b border-dashed border-slate-300 text-xs grid grid-cols-2 gap-y-2">
          <span className="text-slate-500">Comanda</span><strong className="text-right">#{pedido.codigo}</strong>
          <span className="text-slate-500">Ubicación</span><strong className="text-right">{pedido.mesa ? `${pedido.mesa.sala.nombre} · Mesa ${pedido.mesa.numero}` : pedido.tipo.replace("_", " ")}</strong>
          <span className="text-slate-500">Atendió</span><strong className="text-right">{pedido.usuario?.nombre ?? "—"}</strong>
          <span className="text-slate-500">Fecha</span><strong className="text-right">{pedido.createdAt.toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}</strong>
        </section>

        <section className="py-5 space-y-4">
          {pedido.detalles.map((detalle) => <div key={detalle.id}>
            <div className="grid grid-cols-[auto_1fr_auto] gap-2 text-sm"><strong>{detalle.cantidad}×</strong><span className="font-semibold">{detalle.platillo.nombre}</span><strong>{formato(Number(detalle.subtotal))}</strong></div>
            {detalle.modificadores.map((modificador) => <p key={modificador.id} className="ml-7 mt-1 text-[11px] text-slate-500">+ {modificador.nombre}{Number(modificador.precioExtra) > 0 ? ` (${formato(Number(modificador.precioExtra))})` : ""}</p>)}
            {detalle.notas && <p className="ml-7 mt-1 text-[11px] italic text-slate-500">Nota: {detalle.notas}</p>}
          </div>)}
        </section>

        <section className="border-t-2 border-dashed border-slate-300 pt-5 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formato(Number(pedido.subtotal))}</span></div>
          {Number(pedido.descuento) > 0 && <div className="flex justify-between text-emerald-700"><span>Descuento</span><span>− {formato(Number(pedido.descuento))}</span></div>}
          {Number(pedido.impuesto) > 0 && <div className="flex justify-between"><span className="text-slate-500">Impuesto</span><span>{formato(Number(pedido.impuesto))}</span></div>}
          <div className="flex justify-between items-end pt-3 mt-3 border-t border-slate-200"><span className="font-black">TOTAL</span><span className="text-2xl font-black">{formato(Number(pedido.total))}</span></div>
          {config?.habilitarPropina && <p className="pt-2 text-[10px] text-center text-slate-400">Propina sugerida: {Number(config.propinaSugerida)}% · voluntaria</p>}
        </section>

        <footer className="mt-8 pt-5 border-t border-dashed border-slate-300 text-center text-[10px] text-slate-400">
          <p>{config?.mensajeTicket ?? "¡Gracias por su visita!"}</p><p className="mt-1">Solicite su factura al momento de pagar.</p>
        </footer>
      </article>
    </main>
  );
}
