"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, CheckCircle2, ChefHat } from "lucide-react";

type Notificacion = {
  id: string;
  codigo: number;
  tipo: string;
  mesaId: string | null;
  mesa: { numero: string; sala: { nombre: string } } | null;
};

export function NotificacionesMesero() {
  const [abierto, setAbierto] = useState(false);
  const [pedidos, setPedidos] = useState<Notificacion[]>([]);
  const inicializado = useRef(false);
  const idsActuales = useRef(new Set<string>());

  useEffect(() => {
    const events = new EventSource("/api/notificaciones/stream");
    events.addEventListener("ready", (event) => {
      const nuevos = JSON.parse((event as MessageEvent).data) as Notificacion[];
      if (inicializado.current && nuevos.some((p) => !idsActuales.current.has(p.id))) {
        setAbierto(true);
      }
      inicializado.current = true;
      idsActuales.current = new Set(nuevos.map((pedido) => pedido.id));
      setPedidos(nuevos);
    });
    return () => events.close();
  }, []);

  return (
    <div className="relative">
      <button onClick={() => setAbierto(!abierto)} className={`relative h-9 w-9 rounded-lg flex items-center justify-center transition-colors ${pedidos.length ? "bg-emerald-50 text-emerald-700" : "text-slate-400 hover:bg-slate-100"}`} title="Pedidos listos">
        <Bell className={`w-4 h-4 ${pedidos.length ? "animate-[bell-pop_.35s_ease-out]" : ""}`} />
        {pedidos.length > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#E63946] text-white text-[9px] font-black flex items-center justify-center">{pedidos.length}</span>}
      </button>
      {abierto && <>
        <button aria-label="Cerrar notificaciones" onClick={() => setAbierto(false)} className="fixed inset-0 z-40 cursor-default" />
        <div className="absolute right-0 top-11 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-[ticket-in_.18s_ease-out]">
          <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-widest text-slate-400">Cocina</p><p className="font-black text-sm">Pedidos listos</p></div><ChefHat className="w-5 h-5 text-emerald-400" /></div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {pedidos.map((pedido) => <Link key={pedido.id} href={pedido.mesaId ? `/pos?mesaId=${pedido.mesaId}` : "/pos"} onClick={() => setAbierto(false)} className="p-4 flex items-center gap-3 hover:bg-emerald-50/60 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><CheckCircle2 className="w-5 h-5" /></div>
              <div className="min-w-0"><p className="text-sm font-black text-slate-900">Comanda #{pedido.codigo}</p><p className="text-xs text-slate-500">{pedido.mesa ? `Mesa ${pedido.mesa.numero} · ${pedido.mesa.sala.nombre}` : pedido.tipo.replace("_", " ")}</p></div>
              <span className="ml-auto text-[10px] font-black text-emerald-700">RETIRAR</span>
            </Link>)}
            {pedidos.length === 0 && <p className="p-7 text-center text-xs text-slate-400">No hay pedidos esperando entrega.</p>}
          </div>
        </div>
      </>}
    </div>
  );
}
