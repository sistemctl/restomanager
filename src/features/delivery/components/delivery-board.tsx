"use client";
import { useState, useTransition } from "react";
import { EstadoDelivery } from "@prisma/client";
import { ArrowLeft, ArrowRight, MapPin, Phone, UserRound } from "lucide-react";
import { actualizarDeliveryAction } from "@/features/delivery/actions";

type Repartidor = { id: string; nombre: string };
type Entrega = { id: string; direccion: string; telefono: string; nombreCliente: string | null; referencia: string | null; estado: EstadoDelivery; repartidorId: string | null; costoEnvio: number; pedido: { codigo: number; total: number; createdAt: string; detalles: { cantidad: number; platillo: { nombre: string } }[] }; repartidor: Repartidor | null };
const columnas = [EstadoDelivery.PENDIENTE, EstadoDelivery.EN_PREPARACION, EstadoDelivery.ENVIADO, EstadoDelivery.ENTREGADO];

export function DeliveryBoard({ entregas, repartidores, canAssign }: { entregas: Entrega[]; repartidores: Repartidor[]; canAssign: boolean }) {
  const [pending, start] = useTransition();
  const [mensaje, setMensaje] = useState("");
  const actualizar = (id: string, estado: EstadoDelivery, repartidorId?: string) => start(async () => {
    const result = await actualizarDeliveryAction(id, estado, repartidorId);
    setMensaje(result.message ?? result.error ?? "");
  });
  return <div className="space-y-6">
    <header><h1 className="text-3xl font-black text-slate-900">Delivery</h1></header>
    {mensaje && <p role="status" className="text-sm font-bold text-sky-700">{mensaje}</p>}
    <div className="grid xl:grid-cols-4 gap-4 items-start">
      {columnas.map((col, index) => <section key={col} className="bg-slate-100 p-3">
        <div className="flex items-center px-1 pb-3"><h2 className="text-xs font-black">{col.replaceAll("_", " ")}</h2><span className="ml-auto text-xs">{entregas.filter(e => e.estado === col).length}</span></div>
        <div className="space-y-3">{entregas.filter(e => e.estado === col).map(e => <article key={e.id} className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex flex-wrap gap-2"><div><p className="text-xs font-black text-[#E63946]">#{e.pedido.codigo}</p><h3 className="font-black">{e.nombreCliente ?? "Cliente"}</h3></div><b className="ml-auto">$ {Math.round(e.pedido.total).toLocaleString("es-CO")}</b></div>
          <p className="mt-3 text-xs flex gap-2"><MapPin className="w-4 h-4 shrink-0" />{e.direccion}</p>
          <p className="mt-2 text-xs flex gap-2"><Phone className="w-4 h-4" />{e.telefono}</p>
          {e.referencia && <p className="mt-2 text-xs text-slate-500">{e.referencia}</p>}
          <div className="mt-3 text-xs text-slate-500">{e.pedido.detalles.map((d, i) => <span key={i}>{d.cantidad}x {d.platillo.nombre}{i < e.pedido.detalles.length - 1 ? ", " : ""}</span>)}</div>
          {canAssign ? <label className="mt-4 flex items-center gap-2 text-xs"><UserRound className="w-4 h-4" /><select aria-label="Repartidor asignado" disabled={pending || col === EstadoDelivery.ENTREGADO} value={e.repartidorId ?? ""} onChange={event => actualizar(e.id, e.estado, event.target.value)} className="min-w-0 flex-1 border rounded-lg p-2"><option value="">Sin asignar</option>{repartidores.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}</select></label> : <p className="mt-4 text-xs">{e.repartidor?.nombre}</p>}
          <div className="flex gap-2 mt-3">
            {canAssign && index > 0 && col !== EstadoDelivery.ENTREGADO && <button title="Estado anterior" aria-label="Estado anterior" disabled={pending} onClick={() => actualizar(e.id, columnas[index - 1])} className="p-2 border rounded-lg"><ArrowLeft className="w-4 h-4" /></button>}
            {col !== EstadoDelivery.ENTREGADO && (canAssign || col === EstadoDelivery.ENVIADO) && <button disabled={pending} onClick={() => actualizar(e.id, columnas[index + 1])} className="ml-auto p-2 bg-[#1D3557] text-white rounded-lg text-xs font-bold flex items-center gap-2"><ArrowRight className="w-4 h-4" />{col === EstadoDelivery.ENVIADO ? "Confirmar entrega" : "Avanzar"}</button>}
          </div>
        </article>)}</div>
      </section>)}
    </div>
  </div>;
}
