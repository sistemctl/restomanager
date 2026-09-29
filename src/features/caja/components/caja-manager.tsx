"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MetodoPago, TipoMovimientoCaja } from "@prisma/client";
import { Banknote, CircleDollarSign, FileDown, LockKeyhole, Percent, Plus, Printer, Receipt, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { abrirTurnoAction, cerrarTurnoAction, registrarMovimientoCajaAction, registrarPagoAction } from "@/features/caja/actions";
import type { ActionResult } from "@/features/menu/actions";
import { aplicarDescuentoAction } from "@/features/facturacion/actions";

type PagoForm = { metodoPago: MetodoPago; monto: number; referencia?: string };
type Movimiento = { tipo: TipoMovimientoCaja; monto: number };
type PagoRegistrado = { metodoPago: MetodoPago; monto: number };
type TurnoCaja = {
  saldoInicial: number;
  totalVentas: number;
  movimientos: Movimiento[];
  pagos: PagoRegistrado[];
};
type DetallePedido = { cantidad: number; platillo: { nombre: string } };
type PedidoCaja = {
  id: string;
  codigo: number;
  tipo: string;
  total: number;
  descuento: number;
  mesa: { numero: string } | null;
  detalles: Array<DetallePedido & { subtotal: number; comensal: number | null }>;
  pagos: Array<{ monto: number; propina: number; comensal: number | null }>;
};
type VentaCerrada = { id: string; codigo: number; total: number; propina: number; mesa: { numero: string } | null; updatedAt: string };
type CajaManagerProps = {
  turno: TurnoCaja | null;
  pedidos: PedidoCaja[];
  simboloMoneda: string;
  propinaSugerida: number;
  ventas: VentaCerrada[];
};

export function CajaManager({ turno, pedidos, simboloMoneda, propinaSugerida, ventas }: CajaManagerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [saldoInicial, setSaldoInicial] = useState(0);
  const [tipoMovimiento, setTipoMovimiento] = useState<TipoMovimientoCaja>(TipoMovimientoCaja.INGRESO);
  const [montoMovimiento, setMontoMovimiento] = useState(0);
  const [concepto, setConcepto] = useState("");
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<PedidoCaja | null>(null);
  const [propina, setPropina] = useState(0);
  const [cuenta, setCuenta] = useState<number | "TOTAL">("TOTAL");
  const [pagos, setPagos] = useState<PagoForm[]>([{ metodoPago: MetodoPago.EFECTIVO, monto: 0 }]);
  const [tipoDescuento, setTipoDescuento] = useState<"PORCENTAJE" | "FIJO">("PORCENTAJE");
  const [valorDescuento, setValorDescuento] = useState(0);
  const [montoReal, setMontoReal] = useState(0);
  const [ciego, setCiego] = useState(false);

  const format = (value: number) => `${simboloMoneda} ${Math.round(value).toLocaleString("es-CO")}`;
  const ingresos = turno?.movimientos.filter((m) => m.tipo === TipoMovimientoCaja.INGRESO).reduce((s, m) => s + m.monto, 0) ?? 0;
  const egresos = turno?.movimientos.filter((m) => m.tipo === TipoMovimientoCaja.EGRESO).reduce((s, m) => s + m.monto, 0) ?? 0;
  const efectivo = turno?.pagos.filter((p) => p.metodoPago === MetodoPago.EFECTIVO).reduce((s, p) => s + p.monto, 0) ?? 0;
  const efectivoEsperado = (turno?.saldoInicial ?? 0) + efectivo + ingresos - egresos;
  const totalPago = useMemo(() => pagos.reduce((s, p) => s + Number(p.monto || 0), 0), [pagos]);
  const calcularSaldoCuenta = (pedido: PedidoCaja, seleccion: number | "TOTAL") => {
    const pagadoBase = pedido.pagos.reduce((sum, pago) => sum + pago.monto - pago.propina, 0);
    if (seleccion === "TOTAL") return Math.max(0, pedido.total - pagadoBase);
    const numeros = Array.from(new Set(pedido.detalles.map((detalle) => detalle.comensal ?? 1))).sort((a, b) => a - b);
    const brutoTotal = pedido.detalles.reduce((sum, detalle) => sum + detalle.subtotal, 0);
    const totales = numeros.map((numero, index) => {
      if (index === numeros.length - 1) {
        const previos = numeros.slice(0, -1).reduce((sum, previo) => {
          const bruto = pedido.detalles.filter((d) => (d.comensal ?? 1) === previo).reduce((s, d) => s + d.subtotal, 0);
          return sum + Math.round((pedido.total * bruto / brutoTotal) * 100) / 100;
        }, 0);
        return [numero, Math.round((pedido.total - previos) * 100) / 100] as const;
      }
      const bruto = pedido.detalles.filter((d) => (d.comensal ?? 1) === numero).reduce((s, d) => s + d.subtotal, 0);
      return [numero, Math.round((pedido.total * bruto / brutoTotal) * 100) / 100] as const;
    });
    const totalComensal = totales.find(([numero]) => numero === seleccion)?.[1] ?? 0;
    const pagadoComensal = pedido.pagos.filter((pago) => pago.comensal === seleccion).reduce((sum, pago) => sum + pago.monto - pago.propina, 0);
    return Math.max(0, totalComensal - pagadoComensal);
  };
  const saldoBase = pedidoSeleccionado ? calcularSaldoCuenta(pedidoSeleccionado, cuenta) : 0;
  const totalCobrar = saldoBase + propina;

  const ejecutar = (action: () => Promise<ActionResult>) => startTransition(async () => {
    setMensaje(null);
    const result = await action();
    setMensaje({ tipo: result.success ? "ok" : "error", texto: result.message || result.error || "Operación terminada" });
    if (result.success) { setPedidoSeleccionado(null); router.refresh(); }
  });

  if (!turno) return (
    <section className="max-w-lg mx-auto pt-12">
      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-8 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 text-[#E63946] flex items-center justify-center"><Wallet className="w-8 h-8" /></div>
        <h1 className="mt-5 text-2xl font-black text-slate-900">Abrir turno de caja</h1>
        <p className="mt-2 text-sm text-slate-500">Registra el efectivo inicial para comenzar a cobrar pedidos.</p>
        <label className="block text-left text-xs font-bold text-slate-600 mt-6 mb-2">Saldo inicial</label>
        <input type="number" min="0" value={saldoInicial} onChange={(e) => setSaldoInicial(Number(e.target.value))} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-lg font-bold" />
        {mensaje && <p className={`mt-3 text-sm ${mensaje.tipo === "ok" ? "text-emerald-600" : "text-rose-600"}`}>{mensaje.texto}</p>}
        <Button className="w-full mt-5" size="lg" isLoading={pending} onClick={() => ejecutar(() => abrirTurnoAction({ saldoInicial }))}>Abrir caja</Button>
      </div>
    </section>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-widest text-[#E63946]">Turno activo</p><h1 className="text-3xl font-black text-slate-900">Caja y cobros</h1></div>
        <Button variant="outline" onClick={() => document.getElementById("cierre")?.scrollIntoView({ behavior: "smooth" })}><LockKeyhole className="w-4 h-4" /> Cerrar turno</Button>
      </div>
      {mensaje && <div className={`rounded-xl px-4 py-3 text-sm font-medium ${mensaje.tipo === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{mensaje.texto}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[["Saldo inicial", turno.saldoInicial], ["Ventas", turno.totalVentas], ["Efectivo esperado", efectivoEsperado], ["Pedidos por cobrar", pedidos.length]].map(([label, value], index) => (
          <div key={String(label)} className="rounded-2xl bg-white border border-slate-200 p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-black text-slate-900">{index === 3 ? value : format(Number(value))}</p></div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        <section className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200"><h2 className="font-extrabold text-slate-900 flex items-center gap-2"><Receipt className="w-5 h-5 text-[#E63946]" /> Pedidos pendientes</h2></div>
          <div className="divide-y divide-slate-100">
            {pedidos.map((pedido) => <button key={pedido.id} onClick={() => { const saldo = calcularSaldoCuenta(pedido, "TOTAL"); setPedidoSeleccionado(pedido); setCuenta("TOTAL"); const sugerida = Math.round(saldo * propinaSugerida / 100); setPropina(sugerida); setPagos([{ metodoPago: MetodoPago.EFECTIVO, monto: saldo + sugerida }]); }} className="w-full p-4 text-left hover:bg-slate-50 flex items-center justify-between gap-4">
              <div><p className="font-bold text-slate-900">Comanda #{pedido.codigo} · {pedido.mesa ? `Mesa ${pedido.mesa.numero}` : pedido.tipo}</p><p className="text-xs text-slate-500 mt-1">{pedido.detalles.map((d) => `${d.cantidad}× ${d.platillo.nombre}`).join(" · ")}</p></div>
              <p className="font-black text-[#E63946] whitespace-nowrap">{format(pedido.total)}</p>
            </button>)}
            {pedidos.length === 0 && <p className="p-8 text-center text-sm text-slate-400">No hay pedidos pendientes de cobro.</p>}
          </div>
        </section>

        <section className="rounded-2xl bg-white border border-slate-200 p-5 h-fit">
          <h2 className="font-extrabold text-slate-900 flex items-center gap-2"><Plus className="w-5 h-5 text-[#457B9D]" /> Movimiento manual</h2>
          <div className="grid grid-cols-2 gap-2 mt-4"><button onClick={() => setTipoMovimiento(TipoMovimientoCaja.INGRESO)} className={`rounded-xl py-2 text-sm font-bold border ${tipoMovimiento === TipoMovimientoCaja.INGRESO ? "bg-emerald-50 border-emerald-400 text-emerald-700" : "border-slate-200"}`}>Ingreso</button><button onClick={() => setTipoMovimiento(TipoMovimientoCaja.EGRESO)} className={`rounded-xl py-2 text-sm font-bold border ${tipoMovimiento === TipoMovimientoCaja.EGRESO ? "bg-rose-50 border-rose-400 text-rose-700" : "border-slate-200"}`}>Egreso</button></div>
          <input type="number" min="0" placeholder="Monto" value={montoMovimiento || ""} onChange={(e) => setMontoMovimiento(Number(e.target.value))} className="w-full mt-3 rounded-xl border border-slate-300 px-3 py-2" />
          <input placeholder="Concepto" value={concepto} onChange={(e) => setConcepto(e.target.value)} className="w-full mt-3 rounded-xl border border-slate-300 px-3 py-2" />
          <Button className="w-full mt-3" variant="secondary" isLoading={pending} onClick={() => ejecutar(() => registrarMovimientoCajaAction({ tipo: tipoMovimiento, monto: montoMovimiento, concepto }))}>Registrar movimiento</Button>
        </section>
      </div>

      {pedidoSeleccionado && <section className="rounded-2xl bg-slate-900 text-white p-5">
        <div className="flex justify-between gap-4"><div><p className="text-xs text-slate-400">Cobrar comanda</p><h2 className="text-xl font-black">#{pedidoSeleccionado.codigo}</h2></div><button onClick={() => setPedidoSeleccionado(null)} className="text-slate-400">Cerrar</button></div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pb-5 border-b border-white/10">
          <label className="text-xs text-slate-300">Cuenta<select value={cuenta} onChange={(e) => { const nuevaCuenta = e.target.value === "TOTAL" ? "TOTAL" : Number(e.target.value); const saldo = calcularSaldoCuenta(pedidoSeleccionado, nuevaCuenta); const sugerida = Math.round(saldo * propinaSugerida / 100); setCuenta(nuevaCuenta); setPropina(sugerida); setPagos([{ metodoPago: MetodoPago.EFECTIVO, monto: saldo + sugerida }]); }} className="block w-full mt-1 rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white"><option value="TOTAL">Cuenta completa</option>{Array.from(new Set(pedidoSeleccionado.detalles.map((d) => d.comensal ?? 1))).sort((a, b) => a - b).map((numero) => <option key={numero} value={numero}>Comensal {numero}</option>)}</select></label>
          {pedidoSeleccionado.pagos.length === 0 && <>
            <label className="text-xs text-slate-300">Descuento<select value={tipoDescuento} onChange={(e) => setTipoDescuento(e.target.value as "PORCENTAJE" | "FIJO")} className="block w-full mt-1 rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white"><option value="PORCENTAJE">Porcentaje</option><option value="FIJO">Valor fijo</option></select></label>
            <label className="text-xs text-slate-300">Valor<input type="number" min="0" value={valorDescuento || ""} onChange={(e) => setValorDescuento(Number(e.target.value))} className="block w-full mt-1 rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white" /></label>
            <Button variant="outline" className="self-end" disabled={valorDescuento <= 0} onClick={() => ejecutar(() => aplicarDescuentoAction({ pedidoId: pedidoSeleccionado.id, tipo: tipoDescuento, valor: valorDescuento }))}><Percent className="w-4 h-4" /> Aplicar</Button>
          </>}
        </div>
        <div className="grid md:grid-cols-3 gap-4 mt-5">
          <label className="text-xs text-slate-300">Propina<input type="number" min="0" value={propina} onChange={(e) => { const nueva = Number(e.target.value); setPropina(nueva); if (pagos.length === 1) setPagos([{ ...pagos[0], monto: Number(pedidoSeleccionado.total) + nueva }]); }} className="block w-full mt-1 rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white" /></label>
          {pagos.map((pago, index) => <div key={index} className="grid grid-cols-2 gap-2"><select value={pago.metodoPago} onChange={(e) => setPagos(pagos.map((p, i) => i === index ? { ...p, metodoPago: e.target.value as MetodoPago } : p))} className="rounded-xl bg-slate-800 border border-slate-700 px-2 py-2 text-sm">{Object.values(MetodoPago).map((m) => <option key={m}>{m}</option>)}</select><input type="number" value={pago.monto || ""} onChange={(e) => setPagos(pagos.map((p, i) => i === index ? { ...p, monto: Number(e.target.value) } : p))} className="rounded-xl bg-slate-800 border border-slate-700 px-2 py-2" /></div>)}
          <Button variant="outline" onClick={() => setPagos([...pagos, { metodoPago: MetodoPago.TARJETA_CREDITO, monto: 0 }])}>Agregar medio</Button>
        </div>
        <div className="mt-5 flex flex-col sm:flex-row items-end sm:items-center justify-between gap-3"><p className={`text-sm ${Math.abs(totalPago - totalCobrar) < 0.01 ? "text-emerald-400" : "text-amber-400"}`}>Recibido {format(totalPago)} de {format(totalCobrar)}</p><Button variant="success" isLoading={pending} disabled={Math.abs(totalPago - totalCobrar) >= 0.01 || totalCobrar <= 0} onClick={() => ejecutar(() => registrarPagoAction({ pedidoId: pedidoSeleccionado.id, comensal: cuenta === "TOTAL" ? undefined : cuenta, propina, pagos }))}><Banknote className="w-4 h-4" /> Confirmar cobro</Button></div>
      </section>}

      {ventas.length > 0 && <section className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200"><h2 className="font-extrabold text-slate-900">Ventas del turno</h2></div>
        <div className="divide-y divide-slate-100">{ventas.map((venta) => <div key={venta.id} className="p-4 flex items-center gap-3"><div className="min-w-0"><p className="font-bold text-sm text-slate-900">Comanda #{venta.codigo}{venta.mesa ? ` · Mesa ${venta.mesa.numero}` : ""}</p><p className="text-xs text-slate-500">{format(venta.total + venta.propina)} · {new Date(venta.updatedAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</p></div><div className="ml-auto flex gap-2"><Link href={`/factura/${venta.id}/pdf`} target="_blank" className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5"><FileDown className="w-3.5 h-3.5" /> PDF</Link><Link href={`/ticket/${venta.id}`} className="h-8 px-3 rounded-lg bg-slate-900 text-xs font-bold text-white flex items-center gap-1.5"><Printer className="w-3.5 h-3.5" /> Ticket</Link></div></div>)}</div>
      </section>}

      <section id="cierre" className="rounded-2xl bg-white border border-slate-200 p-5">
        <h2 className="font-extrabold text-slate-900 flex items-center gap-2"><CircleDollarSign className="w-5 h-5 text-[#E63946]" /> Arqueo y cierre</h2>
        <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3 mt-4 items-end"><label className="text-xs font-bold text-slate-600">Efectivo contado<input type="number" min="0" value={montoReal || ""} onChange={(e) => setMontoReal(Number(e.target.value))} className="block w-full mt-1 rounded-xl border border-slate-300 px-3 py-2 text-base" /></label><label className="flex items-center gap-2 text-sm pb-2"><input type="checkbox" checked={ciego} onChange={(e) => setCiego(e.target.checked)} /> Arqueo ciego</label><Button variant="danger" isLoading={pending} onClick={() => ejecutar(() => cerrarTurnoAction({ montoReal, ciego }))}>Cerrar turno</Button></div>
        {!ciego && <p className="text-xs text-slate-500 mt-2">Efectivo esperado: {format(efectivoEsperado)}</p>}
      </section>
    </div>
  );
}
