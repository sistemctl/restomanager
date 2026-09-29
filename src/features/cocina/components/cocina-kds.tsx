"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EstadoItem, EstadoPedido, TipoPedido } from "@prisma/client";
import { AlarmClock, BellRing, ChefHat, Check, Clock3, Maximize, Play, Radio, Utensils } from "lucide-react";
import { actualizarItemCocinaAction, entregarPedidoAction, marcarPedidoListoAction } from "@/features/cocina/actions";
import { LogoutButton } from "@/features/auth/components/logout-button";

type DetalleKds = {
  id: string;
  cantidad: number;
  estadoItem: EstadoItem;
  notas: string | null;
  platillo: { nombre: string; categoria: { nombre: string } };
  modificadores: { id: string; nombre: string }[];
};
type PedidoKds = {
  id: string;
  codigo: number;
  tipo: TipoPedido;
  estado: EstadoPedido;
  createdAt: string;
  notas: string | null;
  mesa: { numero: string; sala: { nombre: string } } | null;
  usuario: { nombre: string } | null;
  detalles: DetalleKds[];
};
type Props = {
  pedidos: PedidoKds[];
  cocinero: string;
  restaurante: string;
  alertaAmarilla: number;
  alertaRoja: number;
};

function minutosTranscurridos(fecha: string, ahora: number) {
  return Math.max(0, Math.floor((ahora - new Date(fecha).getTime()) / 60000));
}

function emitirAlerta() {
  const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  gain.gain.setValueAtTime(0.18, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.45);
}

export function CocinaKds({ pedidos, cocinero, restaurante, alertaAmarilla, alertaRoja }: Props) {
  const router = useRouter();
  const [ahora, setAhora] = useState(Date.now());
  const [estacion, setEstacion] = useState("TODAS");
  const [sonido, setSonido] = useState(false);
  const [conectado, setConectado] = useState(false);
  const [wakeActivo, setWakeActivo] = useState(false);
  const [pending, startTransition] = useTransition();
  const idsPrevios = useRef(new Set(pedidos.map((pedido) => pedido.id)));
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);

  const estaciones = useMemo(() => ["TODAS", ...Array.from(new Set(pedidos.flatMap((p) => p.detalles.map((d) => d.platillo.categoria.nombre))))], [pedidos]);
  const visibles = useMemo(() => pedidos.map((pedido) => ({
    ...pedido,
    detalles: estacion === "TODAS" ? pedido.detalles : pedido.detalles.filter((d) => d.platillo.categoria.nombre === estacion),
  })).filter((pedido) => pedido.detalles.length > 0), [pedidos, estacion]);

  useEffect(() => {
    const timer = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const nuevos = pedidos.filter((pedido) => !idsPrevios.current.has(pedido.id));
    if (nuevos.length && sonido) {
      emitirAlerta();
    }
    idsPrevios.current = new Set(pedidos.map((pedido) => pedido.id));
  }, [pedidos, sonido]);

  useEffect(() => {
    const events = new EventSource("/api/cocina/stream");
    events.addEventListener("connected", () => setConectado(true));
    events.addEventListener("orders", () => { setConectado(true); router.refresh(); });
    events.onerror = () => setConectado(false);
    return () => events.close();
  }, [router]);

  const alternarWakeLock = async () => {
    const nav = navigator as Navigator & { wakeLock?: { request: (tipo: "screen") => Promise<{ release: () => Promise<void> }> } };
    if (wakeLock.current) { await wakeLock.current.release(); wakeLock.current = null; setWakeActivo(false); return; }
    if (nav.wakeLock) { wakeLock.current = await nav.wakeLock.request("screen"); setWakeActivo(true); }
  };

  const ejecutar = (accion: () => Promise<{ success: boolean }>) => startTransition(async () => {
    const resultado = await accion();
    if (resultado.success) router.refresh();
  });

  const columnas: Array<{ titulo: string; estados: EstadoPedido[]; color: string; borde: string }> = [
    { titulo: "En cola", estados: [EstadoPedido.PENDIENTE], color: "text-sky-300", borde: "border-sky-400/30" },
    { titulo: "Preparando", estados: [EstadoPedido.EN_PREPARACION], color: "text-amber-300", borde: "border-amber-400/30" },
    { titulo: "Listos", estados: [EstadoPedido.LISTO], color: "text-emerald-300", borde: "border-emerald-400/30" },
  ];

  return (
    <main className="min-h-screen bg-[#0b1017] text-slate-100 selection:bg-[#E63946] selection:text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b1017]/95 backdrop-blur-xl">
        <div className="px-4 lg:px-6 h-16 flex items-center gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#E63946] flex items-center justify-center shadow-lg shadow-red-950/30"><ChefHat className="w-6 h-6" /></div>
            <div className="min-w-0"><p className="font-black tracking-tight truncate">{restaurante}</p><p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Kitchen display · {cocinero}</p></div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className={`hidden sm:flex items-center gap-1.5 text-xs font-bold ${conectado ? "text-emerald-400" : "text-rose-400"}`}><Radio className="w-3.5 h-3.5" /> {conectado ? "En vivo" : "Reconectando"}</span>
            <button onClick={() => { if (!sonido) emitirAlerta(); setSonido(!sonido); }} className={`h-9 px-3 rounded-lg border text-xs font-bold flex items-center gap-2 ${sonido ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10" : "border-white/10 text-slate-400"}`}><BellRing className="w-4 h-4" /> <span className="hidden md:inline">Sonido</span></button>
            <button onClick={alternarWakeLock} className={`h-9 px-3 rounded-lg border text-xs font-bold flex items-center gap-2 ${wakeActivo ? "border-amber-500/40 text-amber-300 bg-amber-500/10" : "border-white/10 text-slate-400"}`}><Maximize className="w-4 h-4" /> <span className="hidden md:inline">Pantalla activa</span></button>
            <LogoutButton />
          </div>
        </div>
        <div className="px-4 lg:px-6 pb-3 flex items-center gap-2 overflow-x-auto">
          {estaciones.map((nombre) => <button key={nombre} onClick={() => setEstacion(nombre)} className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${estacion === nombre ? "bg-white text-slate-950" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>{nombre === "TODAS" ? "Todas las estaciones" : nombre}</button>)}
          <span className="ml-auto pl-4 text-xs text-slate-500 whitespace-nowrap">{visibles.length} comandas</span>
        </div>
      </header>

      <div className="grid xl:grid-cols-3 min-h-[calc(100vh-7rem)] divide-y xl:divide-y-0 xl:divide-x divide-white/10">
        {columnas.map((columna) => {
          const tickets = visibles.filter((pedido) => columna.estados.includes(pedido.estado));
          return <section key={columna.titulo} className="p-3 lg:p-4 min-w-0">
            <div className="flex items-center justify-between px-1 mb-3"><h2 className={`font-black uppercase tracking-[0.16em] text-xs ${columna.color}`}>{columna.titulo}</h2><span className="text-xs font-black bg-white/5 rounded-full min-w-7 h-7 flex items-center justify-center">{tickets.length}</span></div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-3">
              {tickets.map((pedido) => <Ticket key={pedido.id} pedido={pedido} ahora={ahora} amarilla={alertaAmarilla} roja={alertaRoja} filtrando={estacion !== "TODAS"} pending={pending} ejecutar={ejecutar} />)}
            </div>
            {tickets.length === 0 && <div className={`border border-dashed ${columna.borde} rounded-2xl py-12 text-center text-slate-600`}><Utensils className="w-7 h-7 mx-auto mb-2 opacity-60" /><p className="text-xs font-bold">Sin comandas</p></div>}
          </section>;
        })}
      </div>
    </main>
  );
}

function Ticket({ pedido, ahora, amarilla, roja, filtrando, pending, ejecutar }: { pedido: PedidoKds; ahora: number; amarilla: number; roja: number; filtrando: boolean; pending: boolean; ejecutar: (accion: () => Promise<{ success: boolean }>) => void }) {
  const minutos = minutosTranscurridos(pedido.createdAt, ahora);
  const urgencia = minutos >= roja ? "rojo" : minutos >= amarilla ? "amarillo" : "verde";
  const tono = urgencia === "rojo" ? "border-rose-500/70 bg-rose-950/20" : urgencia === "amarillo" ? "border-amber-400/60 bg-amber-950/15" : "border-emerald-500/35 bg-[#121a22]";
  const etiqueta = pedido.mesa ? `MESA ${pedido.mesa.numero}` : pedido.tipo === TipoPedido.DELIVERY ? "DELIVERY" : "MOSTRADOR";
  return <article className={`rounded-2xl border ${tono} overflow-hidden shadow-2xl shadow-black/20 animate-[ticket-in_.2s_ease-out]`}>
    <div className="px-4 py-3 border-b border-white/10 flex items-start justify-between gap-3">
      <div><p className="text-[10px] font-black tracking-[0.18em] text-slate-400">{etiqueta}</p><p className="text-2xl font-black leading-none mt-1">#{pedido.codigo}</p></div>
      <div className={`rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 font-mono text-sm font-black ${urgencia === "rojo" ? "bg-rose-500 text-white animate-pulse" : urgencia === "amarillo" ? "bg-amber-400 text-slate-950" : "bg-emerald-500/15 text-emerald-300"}`}><AlarmClock className="w-4 h-4" /> {minutos}m</div>
    </div>
    <div className="px-4 py-2 bg-black/10 flex justify-between text-[10px] text-slate-500"><span>{pedido.usuario?.nombre ?? "Sin mesero"}</span><span>{pedido.mesa?.sala.nombre ?? pedido.tipo.replace("_", " ")}</span></div>
    <div className="p-3 space-y-2">
      {pedido.detalles.map((detalle) => <div key={detalle.id} className="rounded-xl bg-white/[0.045] p-3">
        <div className="flex gap-2"><span className="text-lg font-black text-white">{detalle.cantidad}×</span><div className="min-w-0 flex-1"><p className="font-bold text-sm leading-snug">{detalle.platillo.nombre}</p>{detalle.modificadores.map((m) => <p key={m.id} className="text-xs text-amber-200/80 mt-1">+ {m.nombre}</p>)}{detalle.notas && <p className="mt-2 text-xs font-bold text-rose-300 border-l-2 border-rose-400 pl-2">{detalle.notas}</p>}</div></div>
        {detalle.estadoItem !== EstadoItem.LISTO && <button disabled={pending} onClick={() => ejecutar(() => actualizarItemCocinaAction(detalle.id, detalle.estadoItem === EstadoItem.EN_COLA ? EstadoItem.PREPARANDO : EstadoItem.LISTO))} className="mt-3 w-full h-8 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50">{detalle.estadoItem === EstadoItem.EN_COLA ? <><Play className="w-3.5 h-3.5" /> Iniciar</> : <><Check className="w-3.5 h-3.5" /> Listo</>}</button>}
      </div>)}
    </div>
    <div className="p-3 pt-0">
      {pedido.estado === EstadoPedido.LISTO ? <button disabled={pending} onClick={() => ejecutar(() => entregarPedidoAction(pedido.id))} className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2"><Check className="w-4 h-4" /> ENTREGADO</button> : !filtrando && <button disabled={pending} onClick={() => ejecutar(() => marcarPedidoListoAction(pedido.id))} className="w-full h-10 rounded-xl border border-white/15 hover:bg-white/10 font-black text-xs flex items-center justify-center gap-2"><Clock3 className="w-4 h-4" /> MARCAR TODO LISTO</button>}
    </div>
  </article>;
}
