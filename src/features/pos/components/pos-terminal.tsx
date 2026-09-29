"use client";

import React, { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  Store,
  Layers,
  Search,
  Star,
  Plus,
  Minus,
  Trash2,
  ChefHat,
  Send,
  User,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Receipt,
  FileText,
  ShoppingBag,
  ArrowRightLeft,
  ArrowLeft,
  ShoppingCart,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { PinSwitchModal } from "@/components/auth/pin-switch-modal";
import { TipoPedido, Rol } from "@prisma/client";
import { crearOActualizarPedidoPOSAction } from "@/features/pos/actions";
import { LogoutButton } from "@/features/auth/components/logout-button";

interface CartItem {
  cartItemId: string; // unique ID in cart
  platilloId: string;
  nombre: string;
  precioBase: number;
  precioFinal: number;
  cantidad: number;
  comensal: number;
  notas: string;
  opcionesSeleccionadas: Array<{
    id: string;
    nombre: string;
    precioExtra: number;
    grupoNombre: string;
  }>;
}

interface PosTerminalProps {
  salas: any[];
  meseros: any[];
  clientes: any[];
  categorias: any[];
  platillos: any[];
  config: any;
  currentUser: any;
  initialMesaId?: string;
  pedidoActivoExistente?: any;
}

export function PosTerminal({
  salas,
  meseros,
  clientes,
  categorias,
  platillos,
  config,
  currentUser,
  initialMesaId,
  pedidoActivoExistente,
}: PosTerminalProps) {
  // Estado del Tipo de Pedido & Mesa
  const [tipoPedido, setTipoPedido] = useState<TipoPedido>(
    initialMesaId ? TipoPedido.EN_MESA : TipoPedido.EN_MESA
  );
  const [selectedMesaId, setSelectedMesaId] = useState<string>(initialMesaId || "");
  const [selectedMeseroId, setSelectedMeseroId] = useState<string>(currentUser.id);
  const [selectedClienteId, setSelectedClienteId] = useState<string>(pedidoActivoExistente?.clienteId || "");
  const [comensalesCount, setComensalesCount] = useState<number>(
    pedidoActivoExistente?.comensales || 2
  );
  const [activeComensalFilter, setActiveComensalFilter] = useState<number | "ALL">("ALL");

  // Filtros del Catálogo
  const [selectedCatId, setSelectedCatId] = useState<string>("FAVORITOS");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Estado del Carrito (Comanda)
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [activePedidoId, setActivePedidoId] = useState<string | null>(
    pedidoActivoExistente?.id ?? null
  );
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Modal de Modificadores
  const [selectedPlatilloForModal, setSelectedPlatilloForModal] = useState<any | null>(null);
  const [modalComensal, setModalComensal] = useState<number>(1);
  const [modalNotas, setModalNotas] = useState<string>("");
  const [modalSelectedOptions, setModalSelectedOptions] = useState<{
    [grupoId: string]: { id: string; nombre: string; precioExtra: number; grupoNombre: string }[];
  }>({});

  // Switch User Modal
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  // Status & Transitions
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const simboloMoneda = config?.simboloMoneda || "$";
  const aplicarImpuesto = config?.aplicarImpuesto ?? true;
  const impuestoIncluido = config?.impuestoIncluido ?? true;
  const tasaImpuesto = Number(config?.porcentajeImpuesto ?? 19.0) / 100;
  const habilitarPropina = config?.habilitarPropina ?? true;
  const propinaPorcentaje = Number(config?.propinaSugerida ?? 10.0) / 100;
  const descuentoClientePorcentaje = Number(clientes.find((cliente) => cliente.id === selectedClienteId)?.descuentoFijo ?? 0) / 100;

  // Lista plana de mesas
  const todasMesas = useMemo(() => {
    return salas.flatMap((s) =>
      s.mesas.map((m: any) => ({ ...m, salaNombre: s.nombre }))
    );
  }, [salas]);

  const currentMesaObj = useMemo(() => {
    return todasMesas.find((m) => m.id === selectedMesaId);
  }, [todasMesas, selectedMesaId]);

  // Platillos filtrados
  const filteredPlatillos = useMemo(() => {
    return platillos.filter((p) => {
      const matchCat =
        selectedCatId === "ALL"
          ? true
          : selectedCatId === "FAVORITOS"
          ? p.favorito
          : p.categoriaId === selectedCatId;

      const matchSearch =
        searchQuery.trim() === "" ||
        p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchCat && matchSearch;
    });
  }, [platillos, selectedCatId, searchQuery]);

  // Abrir Modal de Modificadores o agregar directo
  const handleItemClick = (platillo: any) => {
    if (!platillo.disponible || (config?.prohibirVentaSinStock && platillo.sinStock)) return;

    if (platillo.gruposModificador && platillo.gruposModificador.length > 0) {
      // Tiene modificadores: abrir modal
      setSelectedPlatilloForModal(platillo);
      setModalComensal(activeComensalFilter === "ALL" ? 1 : activeComensalFilter);
      setModalNotas("");

      // Inicializar selecciones obligatorias por defecto
      const initialSelections: any = {};
      platillo.gruposModificador.forEach((g: any) => {
        if (g.requerido && g.opciones.length > 0) {
          const firstOp = g.opciones[0];
          initialSelections[g.id] = [
            {
              id: firstOp.id,
              nombre: firstOp.nombre,
              precioExtra: Number(firstOp.precioExtra),
              grupoNombre: g.nombre,
            },
          ];
        } else {
          initialSelections[g.id] = [];
        }
      });
      setModalSelectedOptions(initialSelections);
    } else {
      // Agregar directo al carrito
      addToCart(platillo, [], "", activeComensalFilter === "ALL" ? 1 : activeComensalFilter);
    }
  };

  const addToCart = (
    platillo: any,
    opciones: Array<{ id: string; nombre: string; precioExtra: number; grupoNombre: string }>,
    notas: string,
    comensal: number
  ) => {
    const precioBase = Number(platillo.precio);
    const sumaExtras = opciones.reduce((acc, o) => acc + o.precioExtra, 0);
    const precioFinal = precioBase + sumaExtras;

    const newCartItem: CartItem = {
      cartItemId: `${platillo.id}-${Date.now()}-${Math.random()}`,
      platilloId: platillo.id,
      nombre: platillo.nombre,
      precioBase,
      precioFinal,
      cantidad: 1,
      comensal,
      notas,
      opcionesSeleccionadas: opciones,
    };

    setCartItems((prev) => [...prev, newCartItem]);
  };

  const handleConfirmModifiers = () => {
    if (!selectedPlatilloForModal) return;

    // Aplanar todas las opciones seleccionadas
    const allSelected: any[] = [];
    Object.values(modalSelectedOptions).forEach((ops) => {
      ops.forEach((o) => allSelected.push(o));
    });

    addToCart(selectedPlatilloForModal, allSelected, modalNotas, modalComensal);
    setSelectedPlatilloForModal(null);
  };

  const handleUpdateQuantity = (cartItemId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.cartItemId === cartItemId) {
            const newQty = item.cantidad + delta;
            return newQty > 0 ? { ...item, cantidad: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveItem = (cartItemId: string) => {
    setCartItems((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  };

  // Cálculos de Totales de Comanda
  const { subtotalCalculado, descuentoCalculado, impuestoCalculado, totalCalculado, propinaSugeridaValor } =
    useMemo(() => {
      const suma = cartItems.reduce((acc, item) => acc + item.precioFinal * item.cantidad, 0);

      const descuento = suma * descuentoClientePorcentaje;
      const sumaConDescuento = suma - descuento;
      let subtotal = sumaConDescuento;
      let impuesto = 0;
      let total = sumaConDescuento;

      if (aplicarImpuesto && tasaImpuesto > 0) {
        if (impuestoIncluido) {
          total = sumaConDescuento;
          impuesto = total - total / (1 + tasaImpuesto);
          subtotal = total - impuesto;
        } else {
          subtotal = sumaConDescuento;
          impuesto = subtotal * tasaImpuesto;
          total = subtotal + impuesto;
        }
      }

      const propina = habilitarPropina ? total * propinaPorcentaje : 0;

      return {
        subtotalCalculado: subtotal,
        descuentoCalculado: descuento,
        impuestoCalculado: impuesto,
        totalCalculado: total,
        propinaSugeridaValor: propina,
      };
    }, [cartItems, aplicarImpuesto, impuestoIncluido, tasaImpuesto, habilitarPropina, propinaPorcentaje, descuentoClientePorcentaje]);

  // Enviar Comanda a Cocina
  const handleEnviarCocina = () => {
    if (cartItems.length === 0) {
      setError("Debes agregar al menos un producto a la comanda");
      return;
    }

    if (tipoPedido === TipoPedido.EN_MESA && !selectedMesaId) {
      setError("Por favor selecciona una mesa para enviar la comanda");
      return;
    }

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const itemsPayload = cartItems.map((item) => ({
        platilloId: item.platilloId,
        cantidad: item.cantidad,
        comensal: item.comensal,
        notas: item.notas,
        opcionIds: item.opcionesSeleccionadas.map((o) => o.id),
      }));

      const res = await crearOActualizarPedidoPOSAction({
        mesaId: tipoPedido === TipoPedido.EN_MESA ? selectedMesaId : null,
        tipo: tipoPedido,
        comensales: comensalesCount,
        usuarioId: selectedMeseroId,
        clienteId: selectedClienteId || null,
        items: itemsPayload,
      });

      if (!res.success) {
        setError(res.error || "Error al enviar la comanda");
      } else {
        const resultData = res.data as { pedidoId?: string } | undefined;
        if (resultData?.pedidoId) setActivePedidoId(resultData.pedidoId);
        setSuccess("✅ ¡Comanda enviada a Cocina exitosamente!");
        setCartItems([]);
        setTimeout(() => setSuccess(null), 4000);
      }
    });
  };

  // Filtrado de comanda por comensal activo
  const displayedCartItems = cartItems.filter((item) =>
    activeComensalFilter === "ALL" ? true : item.comensal === activeComensalFilter
  );

  return (
    <div className="flex flex-col h-dvh w-full bg-slate-100 overflow-hidden">
      {/* 1. TOP BAR POS */}
      <header className="min-h-14 bg-slate-900 text-white px-2 py-2 sm:h-14 sm:px-4 sm:py-0 flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-md z-20">
        {/* Left: Mode Selector */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {(currentUser.role === Rol.ADMIN || currentUser.role === Rol.CAJERO) && (
            <Link
              href={currentUser.role === Rol.ADMIN ? "/admin" : "/caja"}
              onClick={(event) => {
                if (cartItems.length > 0 && !window.confirm("Tienes productos sin enviar en la comanda. ¿Quieres salir del POS y descartarlos?")) event.preventDefault();
              }}
              title={currentUser.role === Rol.ADMIN ? "Volver al panel" : "Volver a caja"}
              className="px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{currentUser.role === Rol.ADMIN ? "Panel" : "Caja"}</span>
            </Link>
          )}
          <div className="flex min-w-0 flex-1 bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs font-semibold sm:flex-none">
            <button
              onClick={() => setTipoPedido(TipoPedido.EN_MESA)}
              className={`flex-1 justify-center px-2 py-1.5 rounded-lg transition-all flex items-center gap-1.5 sm:flex-none sm:px-3 ${
                tipoPedido === TipoPedido.EN_MESA
                  ? "bg-[#E63946] text-white shadow-xs"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>En Mesa</span>
            </button>

            <button
              onClick={() => setTipoPedido(TipoPedido.MOSTRADOR)}
              className={`flex-1 justify-center px-2 py-1.5 rounded-lg transition-all flex items-center gap-1.5 sm:flex-none sm:px-3 ${
                tipoPedido === TipoPedido.MOSTRADOR
                  ? "bg-[#E63946] text-white shadow-xs"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Mostrador</span>
            </button>

            <button
              onClick={() => setTipoPedido(TipoPedido.DELIVERY)}
              className={`flex-1 justify-center px-2 py-1.5 rounded-lg transition-all flex items-center gap-1.5 sm:flex-none sm:px-3 ${
                tipoPedido === TipoPedido.DELIVERY
                  ? "bg-[#E63946] text-white shadow-xs"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Delivery</span>
            </button>
          </div>

          {/* Table Selector if EN_MESA */}
          {tipoPedido === TipoPedido.EN_MESA && (
            <div className="flex w-full items-center gap-1.5 sm:w-auto">
              <select
                value={selectedMesaId}
                onChange={(e) => setSelectedMesaId(e.target.value)}
                className="min-w-0 flex-1 bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#E63946] sm:w-auto"
              >
                <option value="">-- Elige Mesa --</option>
                {todasMesas.map((m) => (
                  <option key={m.id} value={m.id}>
                    Mesa {m.numero} ({m.salaNombre}) - {m.estado}
                  </option>
                ))}
              </select>

              <Link
                href="/admin/mesas"
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Ver mapa de salas"
              >
                <Layers className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Center / Right: Waiter & Pin Switch */}
        <div className="hidden items-center gap-3 sm:flex">
          <div className="hidden lg:flex items-center gap-2 text-xs">
            <span className="text-slate-400">Cliente:</span>
            <select value={selectedClienteId} onChange={(e) => setSelectedClienteId(e.target.value)} className="max-w-40 bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1">
              <option value="">Consumidor final</option>
              {clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nombre}{cliente.descuentoFijo ? ` (-${cliente.descuentoFijo}%)` : ""}</option>)}
            </select>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="text-slate-400">Mozo:</span>
            <select
              value={selectedMeseroId}
              disabled={currentUser.role === Rol.MESERO}
              onChange={(e) => setSelectedMeseroId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1"
            >
              {meseros.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre} ({m.rol})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsPinModalOpen(true)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200 transition-colors"
          >
            <User className="w-3.5 h-3.5 text-[#E63946]" />
            <span className="hidden sm:inline">{currentUser.name}</span>
            <span className="font-mono text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-400">
              PIN
            </span>
          </button>
          <LogoutButton />
        </div>
      </header>

      {/* 2. MAIN DUAL-PANE BODY */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* PANEL IZQUIERDO: CATÁLOGO DE PLATILLOS */}
        <section className="w-full min-w-0 flex-1 flex flex-col bg-slate-50 border-r border-slate-200 overflow-hidden">
          {/* Subheader: Category Bar & Search */}
          <div className="p-3 bg-white border-b border-slate-200/80 space-y-2.5 shrink-0 shadow-2xs">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedCatId("FAVORITOS")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedCatId === "FAVORITOS"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>Favoritos</span>
              </button>

              <button
                onClick={() => setSelectedCatId("ALL")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedCatId === "ALL"
                    ? "bg-[#E63946] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Todos los Platillos
              </button>

              {categorias.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCatId(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    selectedCatId === cat.id
                      ? "bg-[#E63946] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat.nombre}
                </button>
              ))}
            </div>

            {/* Live Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar platillo por nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E63946]/30"
              />
            </div>
          </div>

          {/* Dishes Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredPlatillos.map((p) => {
                const hasModifiers = p.gruposModificador && p.gruposModificador.length > 0;
                const bloqueadoStock = config?.prohibirVentaSinStock && p.sinStock;

                return (
                  <button
                    key={p.id}
                    disabled={!p.disponible || bloqueadoStock}
                    onClick={() => handleItemClick(p)}
                    className={`text-left p-3.5 rounded-2xl border transition-all flex flex-col justify-between relative shadow-2xs group ${
                      !p.disponible || bloqueadoStock
                        ? "opacity-50 border-slate-200 bg-slate-100 cursor-not-allowed"
                        : "bg-white border-slate-200/90 hover:border-[#E63946] hover:shadow-md active:scale-98"
                    }`}
                  >
                    <div>
                      {/* Top badges */}
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider line-clamp-1">
                          {p.categoria?.nombre}
                        </span>
                        {p.favorito && (
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                        )}
                        {bloqueadoStock && <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">SIN STOCK</span>}
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-[#E63946] transition-colors">
                        {p.nombre}
                      </h4>

                      {p.descripcion && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                          {p.descripcion}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">
                        {simboloMoneda} {p.precio.toLocaleString()}
                      </span>

                      {hasModifiers && (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                          <Sliders className="w-2.5 h-2.5" />
                          <span>Opciones</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {filteredPlatillos.length === 0 && (
              <div className="p-12 text-center text-xs text-slate-400">
                No se encontraron platillos con los criterios seleccionados.
              </div>
            )}
          </div>
        </section>

        {/* PANEL DERECHO: COMANDA EN VIVO (ESTILO FUDO POS) */}
        <aside className={`fixed inset-0 z-40 w-full bg-white flex flex-col border-l border-slate-200 shadow-lg transition-transform duration-200 ease-out md:static md:z-auto md:w-96 md:shrink-0 md:translate-x-0 ${
          isMobileCartOpen ? "translate-x-0" : "translate-x-full"
        }`}>
          {/* Header Comanda */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 space-y-2 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Comanda Actual
                </span>
                <h3 className="text-sm font-black text-slate-900">
                  {tipoPedido === TipoPedido.EN_MESA
                    ? currentMesaObj
                      ? `MESA ${currentMesaObj.numero} (${currentMesaObj.salaNombre})`
                      : "SELECCIONA MESA"
                    : tipoPedido === TipoPedido.MOSTRADOR
                    ? "PEDIDO DE MOSTRADOR"
                    : "PEDIDO PARA DELIVERY"}
                </h3>
              </div>

              {cartItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCartItems([])}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold p-1"
                >
                  Vaciar
                </button>
              )}
            </div>

            {/* Division por Comensal */}
            {tipoPedido === TipoPedido.EN_MESA && (
              <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                <button
                  onClick={() => setActiveComensalFilter("ALL")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    activeComensalFilter === "ALL"
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600 border border-slate-200"
                  }`}
                >
                  Todos ({cartItems.length})
                </button>

                {Array.from({ length: comensalesCount }, (_, i) => i + 1).map((cNum) => {
                  const itemsInC = cartItems.filter((i) => i.comensal === cNum).length;
                  return (
                    <button
                      key={cNum}
                      onClick={() => setActiveComensalFilter(cNum)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                        activeComensalFilter === cNum
                          ? "bg-[#E63946] text-white"
                          : "bg-white text-slate-600 border border-slate-200"
                      }`}
                    >
                      P{cNum} ({itemsInC})
                    </button>
                  );
                })}

                <button
                  onClick={() => setComensalesCount((prev) => Math.min(prev + 1, 12))}
                  className="p-1 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 text-xs font-bold px-2"
                  title="Agregar comensal a la mesa"
                >
                  +
                </button>
              </div>
            )}
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="mx-3 mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mx-3 mt-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Lista de Ítems en la Comanda */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-slate-100">
            {displayedCartItems.map((item) => (
              <div key={item.cartItemId} className="pt-2.5 first:pt-0 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">
                        {item.nombre}
                      </span>
                      {tipoPedido === TipoPedido.EN_MESA && (
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                          P{item.comensal}
                        </span>
                      )}
                    </div>

                    {/* Modificadores */}
                    {item.opcionesSeleccionadas.length > 0 && (
                      <div className="text-[11px] text-slate-500 pl-1 border-l-2 border-slate-200 mt-0.5 space-y-0.5">
                        {item.opcionesSeleccionadas.map((op, idx) => (
                          <div key={idx}>
                            <span>• {op.nombre}</span>
                            {op.precioExtra > 0 && (
                              <span className="text-slate-700 font-semibold ml-1">
                                (+{simboloMoneda}{op.precioExtra.toLocaleString()})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Notas de cocina */}
                    {item.notas && (
                      <span className="text-[11px] text-amber-700 italic block mt-0.5">
                        Nota: {item.notas}
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-bold text-slate-900 shrink-0">
                    {simboloMoneda} {(item.precioFinal * item.cantidad).toLocaleString()}
                  </span>
                </div>

                {/* Cantidad controls */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    {simboloMoneda} {item.precioFinal.toLocaleString()} c/u
                  </span>

                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(item.cartItemId, -1)}
                      className="w-6 h-6 rounded flex items-center justify-center bg-white text-slate-700 hover:bg-slate-200 shadow-2xs"
                    >
                      <Minus className="w-3 h-3" />
                    </button>

                    <span className="w-6 text-center text-xs font-bold text-slate-900">
                      {item.cantidad}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(item.cartItemId, 1)}
                      className="w-6 h-6 rounded flex items-center justify-center bg-white text-slate-700 hover:bg-slate-200 shadow-2xs"
                    >
                      <Plus className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.cartItemId)}
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-rose-600 ml-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {cartItems.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <ChefHat className="w-8 h-8 text-slate-300 mx-auto" />
                <p>Comanda vacía</p>
                <p className="text-[11px] text-slate-400">
                  Haz clic en cualquier platillo del menú para añadirlo a la orden.
                </p>
              </div>
            )}
          </div>

          {/* 3. RESUMEN Y BOTÓN ENVIAR COCINA */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0 space-y-3">
            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal neto:</span>
                <span className="font-semibold text-slate-800">
                  {simboloMoneda} {Math.round(subtotalCalculado).toLocaleString()}
                </span>
              </div>

              {aplicarImpuesto && (
                <div className="flex justify-between text-slate-500">
                  <span>
                    IVA ({config?.porcentajeImpuesto ?? 19}%)
                    {impuestoIncluido ? " (incluido)" : ""}:
                  </span>
                  <span>
                    {simboloMoneda} {Math.round(impuestoCalculado).toLocaleString()}
                  </span>
                </div>
              )}

              {descuentoCalculado > 0 && <div className="flex justify-between text-emerald-700"><span>Descuento cliente:</span><span>-{simboloMoneda} {Math.round(descuentoCalculado).toLocaleString()}</span></div>}

              {habilitarPropina && propinaSugeridaValor > 0 && (
                <div className="flex justify-between text-amber-700 text-[11px]">
                  <span>Propina sugerida ({config?.propinaSugerida ?? 10}%):</span>
                  <span>{simboloMoneda} {Math.round(propinaSugeridaValor).toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between text-base font-extrabold text-slate-900 pt-1.5 border-t border-slate-200">
                <span>Total a Pagar:</span>
                <span className="text-[#E63946]">
                  {simboloMoneda} {Math.round(totalCalculado).toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileCartOpen(false)}
                className="md:hidden h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-600 flex items-center justify-center"
                title="Cerrar comanda"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activePedidoId && (
              <div className={`grid ${currentUser.role === Rol.ADMIN || currentUser.role === Rol.CAJERO ? "grid-cols-3" : "grid-cols-2"} gap-2`}>
                <Link href={`/precuenta/${activePedidoId}`} className="h-9 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold flex items-center justify-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Precuenta
                </Link>
                <Link href="/caja" className="h-9 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold flex items-center justify-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5" /> Cobrar
                </Link>
                {(currentUser.role === Rol.ADMIN || currentUser.role === Rol.CAJERO) && <Link href={`/traslado/${activePedidoId}`} className="h-9 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold flex items-center justify-center gap-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5" /> Trasladar
                </Link>}
              </div>
            )}

            {/* Big Action Button: ENVIAR COCINA */}
            <Button
              disabled={cartItems.length === 0 || isPending}
              onClick={handleEnviarCocina}
              className="w-full py-3 h-auto text-sm font-bold bg-[#E63946] hover:bg-[#d62828] text-white rounded-xl shadow-md flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{isPending ? "Enviando..." : "ENVIAR A COCINA"}</span>
            </Button>
          </div>
        </aside>

        <button
          type="button"
          onClick={() => setIsMobileCartOpen(true)}
          className="md:hidden fixed bottom-4 right-4 z-30 flex h-12 items-center gap-2 rounded-full bg-slate-900 px-4 text-sm font-bold text-white shadow-lg shadow-slate-900/25 active:scale-95"
        >
          <ShoppingCart className="h-4 w-4" />
          Comanda
          {cartItems.length > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E63946] px-1 text-[11px] text-white">
              {cartItems.length}
            </span>
          )}
        </button>
      </div>

      {/* MODAL DE SELECCIÓN DE MODIFICADORES */}
      {selectedPlatilloForModal && (
        <Modal
          isOpen={!!selectedPlatilloForModal}
          onClose={() => setSelectedPlatilloForModal(null)}
          title={selectedPlatilloForModal.nombre}
          description="Selecciona los términos, adicionales y notas especiales para cocina."
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* Grupos de Modificadores */}
            {selectedPlatilloForModal.gruposModificador?.map((grupo: any) => (
              <div key={grupo.id} className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <span className="text-xs font-bold text-slate-800">
                    {grupo.nombre}
                  </span>
                  {grupo.requerido ? (
                    <Badge variant="danger" className="text-[10px]">Requerido</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Opcional</Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {grupo.opciones?.map((opcion: any) => {
                    const isSelected = modalSelectedOptions[grupo.id]?.some(
                      (o) => o.id === opcion.id
                    );

                    return (
                      <button
                        type="button"
                        key={opcion.id}
                        onClick={() => {
                          setModalSelectedOptions((prev) => {
                            if (grupo.requerido) {
                              // Selección única obligatoria
                              return {
                                ...prev,
                                [grupo.id]: [
                                  {
                                    id: opcion.id,
                                    nombre: opcion.nombre,
                                    precioExtra: Number(opcion.precioExtra),
                                    grupoNombre: grupo.nombre,
                                  },
                                ],
                              };
                            } else {
                              // Selección múltiple
                              const currentList = prev[grupo.id] || [];
                              const exists = currentList.some((o) => o.id === opcion.id);
                              return {
                                ...prev,
                                [grupo.id]: exists
                                  ? currentList.filter((o) => o.id !== opcion.id)
                                  : [
                                      ...currentList,
                                      {
                                        id: opcion.id,
                                        nombre: opcion.nombre,
                                        precioExtra: Number(opcion.precioExtra),
                                        grupoNombre: grupo.nombre,
                                      },
                                    ],
                              };
                            }
                          });
                        }}
                        className={`p-2.5 rounded-xl border text-xs text-left transition-all flex items-center justify-between ${
                          isSelected
                            ? "border-[#E63946] bg-rose-50/50 text-[#E63946] font-bold"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <span>{opcion.nombre}</span>
                        {opcion.precioExtra > 0 && (
                          <span className="text-[11px] text-slate-500 font-semibold">
                            +{simboloMoneda}{Number(opcion.precioExtra).toLocaleString()}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Asignar Comensal */}
            {tipoPedido === TipoPedido.EN_MESA && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Asignar a Comensal:
                </label>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: comensalesCount }, (_, i) => i + 1).map((cNum) => (
                    <button
                      type="button"
                      key={cNum}
                      onClick={() => setModalComensal(cNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold ${
                        modalComensal === cNum
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      P{cNum}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Nota de Preparación */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nota para Cocina (opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: Término medio tirando a rojo, sin cebolla..."
                value={modalNotas}
                onChange={(e) => setModalNotas(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedPlatilloForModal(null)}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={handleConfirmModifiers}>
                Agregar a la Comanda
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL CAMBIO RÁPIDO DE PIN */}
      {isPinModalOpen && (
        <PinSwitchModal
          isOpen={isPinModalOpen}
          onClose={() => setIsPinModalOpen(false)}
          currentUserName={currentUser.name}
        />
      )}
    </div>
  );
}
