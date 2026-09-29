"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRightLeft, Check, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trasladarConsumosAction } from "@/features/facturacion/actions";

type Props = {
  pedido: { id: string; codigo: number; mesaId: string; mesa: { numero: string; sala: { nombre: string } }; detalles: Array<{ id: string; cantidad: number; nombre: string; subtotal: number; modificadores: string[] }> };
  mesas: Array<{ id: string; numero: string; estado: string; sala: { nombre: string } }>;
};

export function TrasladoConsumos({ pedido, mesas }: Props) {
  const router = useRouter();
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [destino, setDestino] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const todos = seleccionados.length === pedido.detalles.length;
  const alternar = (id: string) => setSeleccionados((actual) => actual.includes(id) ? actual.filter((item) => item !== id) : [...actual, id]);

  const trasladar = () => startTransition(async () => {
    setError(null);
    const resultado = await trasladarConsumosAction({ pedidoId: pedido.id, mesaDestinoId: destino, detalleIds: seleccionados });
    if (!resultado.success) { setError(resultado.error ?? "No se pudo realizar el traslado"); return; }
    router.push(`/pos?mesaId=${destino}`);
  });

  return <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
    <div className="max-w-4xl mx-auto">
      <Link href={`/pos?mesaId=${pedido.mesaId}`} className="text-sm font-bold text-slate-500 flex items-center gap-2 mb-5"><ArrowLeft className="w-4 h-4" /> Volver al POS</Link>
      <div className="flex items-end justify-between gap-4 mb-6"><div><p className="text-xs uppercase tracking-widest font-black text-[#E63946]">Comanda #{pedido.codigo}</p><h1 className="text-3xl font-black text-slate-900">Trasladar consumos</h1><p className="text-sm text-slate-500 mt-1">Origen: {pedido.mesa.sala.nombre} · Mesa {pedido.mesa.numero}</p></div><ArrowRightLeft className="w-9 h-9 text-slate-300" /></div>
      <div className="grid lg:grid-cols-[1.3fr_.7fr] gap-5">
        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden"><button onClick={() => setSeleccionados(todos ? [] : pedido.detalles.map((d) => d.id))} className="w-full px-5 py-3 text-left text-xs font-black text-slate-500 border-b border-slate-200">{todos ? "Quitar selección" : "Seleccionar todo"}</button><div className="divide-y divide-slate-100">{pedido.detalles.map((detalle) => <button key={detalle.id} onClick={() => alternar(detalle.id)} className={`w-full p-4 text-left flex gap-3 transition-colors ${seleccionados.includes(detalle.id) ? "bg-rose-50" : "hover:bg-slate-50"}`}><span className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center ${seleccionados.includes(detalle.id) ? "bg-[#E63946] border-[#E63946] text-white" : "border-slate-300"}`}>{seleccionados.includes(detalle.id) && <Check className="w-3.5 h-3.5" />}</span><div><p className="font-bold text-slate-900">{detalle.cantidad}× {detalle.nombre}</p>{detalle.modificadores.map((m) => <p key={m} className="text-xs text-slate-500">+ {m}</p>)}</div></button>)}</div></section>
        <aside className="bg-slate-900 text-white rounded-2xl p-5 h-fit"><h2 className="font-black flex items-center gap-2"><MapPin className="w-4 h-4 text-[#F4A261]" /> Mesa destino</h2><select value={destino} onChange={(e) => setDestino(e.target.value)} className="w-full mt-4 rounded-xl bg-slate-800 border border-slate-700 px-3 py-3 text-sm"><option value="">Seleccionar mesa</option>{mesas.map((mesa) => <option key={mesa.id} value={mesa.id}>{mesa.sala.nombre} · Mesa {mesa.numero} ({mesa.estado})</option>)}</select><p className="mt-4 text-xs text-slate-400">Los productos conservarán su estado de cocina. Los descuentos se recalcularán en ambas cuentas.</p>{error && <p className="mt-3 text-xs text-rose-300">{error}</p>}<Button className="w-full mt-5" isLoading={pending} disabled={!destino || seleccionados.length === 0} onClick={trasladar}>Confirmar traslado</Button></aside>
      </div>
    </div>
  </main>;
}
