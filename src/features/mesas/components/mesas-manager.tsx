"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Layers,
  Plus,
  Users,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Store,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { EstadoMesa } from "@prisma/client";
import {
  createSalaAction,
  createMesaAction,
  deleteMesaAction,
  cambiarEstadoMesaAction,
  trasladarMesaAction,
  createReservacionAction,
  toggleConfirmarReservacionAction,
} from "@/features/mesas/actions";

interface MesasManagerProps {
  canManageLayout: boolean;
  initialSalas: any[];
  initialReservaciones: any[];
  simboloMoneda: string;
}

export function MesasManager({
  canManageLayout,
  initialSalas,
  initialReservaciones,
  simboloMoneda,
}: MesasManagerProps) {
  const [selectedSalaId, setSelectedSalaId] = useState<string>(
    initialSalas[0]?.id || ""
  );
  const [activeView, setActiveView] = useState<"mesas" | "reservaciones">("mesas");

  // Modals
  const [isSalaModalOpen, setIsSalaModalOpen] = useState(false);
  const [isMesaModalOpen, setIsMesaModalOpen] = useState(false);
  const [isReservacionModalOpen, setIsReservacionModalOpen] = useState(false);
  const [isTrasladoModalOpen, setIsTrasladoModalOpen] = useState(false);
  const [mesaOrigenTraslado, setMesaOrigenTraslado] = useState<any | null>(null);
  const [mesaDestinoId, setMesaDestinoId] = useState<string>("");

  // Forms
  const [salaForm, setSalaForm] = useState({ nombre: "", orden: 0, activa: true });
  const [mesaForm, setMesaForm] = useState({
    numero: "",
    capacidad: 4,
    salaId: initialSalas[0]?.id || "",
    estado: EstadoMesa.DISPONIBLE,
    posX: 0,
    posY: 0,
  });

  const [reservacionForm, setReservacionForm] = useState({
    nombreCliente: "",
    telefono: "",
    mesaId: initialSalas[0]?.mesas[0]?.id || "",
    personas: 2,
    fechaHora: new Date().toISOString().slice(0, 16),
    notas: "",
    confirmada: true,
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentSala = initialSalas.find((s) => s.id === selectedSalaId) || initialSalas[0];

  const handleCreateSala = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createSalaAction({
        nombre: salaForm.nombre,
        orden: salaForm.orden,
        activa: true,
      });
      if (!res.success) {
        setError(res.error || "Error al crear sala");
      } else {
        setSuccess("Sala creada exitosamente");
        setIsSalaModalOpen(false);
        setSalaForm({ nombre: "", orden: 0, activa: true });
        setTimeout(() => setSuccess(null), 3000);
      }
    });
  };

  const handleCreateMesa = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createMesaAction({
        numero: mesaForm.numero,
        capacidad: mesaForm.capacidad,
        salaId: selectedSalaId,
        estado: EstadoMesa.DISPONIBLE,
        posX: 0,
        posY: 0,
      });
      if (!res.success) {
        setError(res.error || "Error al crear mesa");
      } else {
        setSuccess("Mesa creada exitosamente");
        setIsMesaModalOpen(false);
        setMesaForm({
          numero: "",
          capacidad: 4,
          salaId: selectedSalaId,
          estado: EstadoMesa.DISPONIBLE,
          posX: 0,
          posY: 0,
        });
        setTimeout(() => setSuccess(null), 3000);
      }
    });
  };

  const handleDeleteMesa = (id: string, numero: string) => {
    if (!confirm(`¿Estás seguro de eliminar la Mesa ${numero}?`)) return;

    startTransition(async () => {
      const res = await deleteMesaAction(id);
      if (!res.success) {
        setError(res.error || "Error al eliminar mesa");
      } else {
        setSuccess("Mesa eliminada correctamente");
        setTimeout(() => setSuccess(null), 3000);
      }
    });
  };

  const handleCambiarEstadoMesa = (mesaId: string, nuevoEstado: EstadoMesa) => {
    startTransition(async () => {
      const res = await cambiarEstadoMesaAction(mesaId, nuevoEstado);
      if (!res.success) {
        setError(res.error || "Error al cambiar estado");
      } else {
        setSuccess(`Mesa actualizada`);
        setTimeout(() => setSuccess(null), 2000);
      }
    });
  };

  const handleOpenTraslado = (mesa: any) => {
    setMesaOrigenTraslado(mesa);
    setMesaDestinoId("");
    setIsTrasladoModalOpen(true);
  };

  const handleExecuteTraslado = () => {
    if (!mesaOrigenTraslado || !mesaDestinoId) return;

    startTransition(async () => {
      const res = await trasladarMesaAction(mesaOrigenTraslado.id, mesaDestinoId);
      if (!res.success) {
        setError(res.error || "Error al trasladar mesa");
      } else {
        setSuccess(res.message || "Consumos trasladados");
        setIsTrasladoModalOpen(false);
        setTimeout(() => setSuccess(null), 3000);
      }
    });
  };

  const handleCreateReservacion = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createReservacionAction({
        ...reservacionForm,
        confirmada: true,
      });
      if (!res.success) {
        setError(res.error || "Error al crear reservación");
      } else {
        setSuccess("Reservación registrada con éxito");
        setIsReservacionModalOpen(false);
        setTimeout(() => setSuccess(null), 3000);
      }
    });
  };

  const handleToggleConfirmar = (id: string) => {
    startTransition(async () => {
      await toggleConfirmarReservacionAction(id);
    });
  };

  // Helper para color y texto de estados estilo Fudo
  const getEstadoBadge = (estado: EstadoMesa) => {
    switch (estado) {
      case EstadoMesa.DISPONIBLE:
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          dot: "bg-emerald-500",
          text: "Disponible",
          cardBorder: "border-emerald-200 hover:border-emerald-400",
        };
      case EstadoMesa.OCUPADA:
        return {
          bg: "bg-rose-50 text-rose-700 border-rose-200",
          dot: "bg-rose-500 animate-pulse",
          text: "Ocupada",
          cardBorder: "border-rose-300 ring-1 ring-rose-300/50",
        };
      case EstadoMesa.RESERVADA:
        return {
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          dot: "bg-blue-500",
          text: "Reservada",
          cardBorder: "border-blue-200 hover:border-blue-400",
        };
      case EstadoMesa.SUCIA:
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          dot: "bg-amber-500",
          text: "Sucia / Por Limpiar",
          cardBorder: "border-amber-200",
        };
      default:
        return {
          bg: "bg-slate-50 text-slate-700 border-slate-200",
          dot: "bg-slate-400",
          text: "Mantenimiento",
          cardBorder: "border-slate-200",
        };
    }
  };

  // Todas las mesas disponibles para traslado
  const todasMesasDisponibles = initialSalas
    .flatMap((s) => s.mesas)
    .filter((m) => m.id !== mesaOrigenTraslado?.id && m.estado === EstadoMesa.DISPONIBLE);

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-[#E63946]" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Control de Mesas & Salas
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Mapa visual de salones, estado de comensales en vivo y gestión de reservaciones.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveView("mesas")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeView === "mesas" ? "bg-white shadow-2xs text-slate-900" : "text-slate-500"
              }`}
            >
              Mapa de Mesas
            </button>
            <button
              onClick={() => setActiveView("reservaciones")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeView === "reservaciones"
                  ? "bg-white shadow-2xs text-slate-900"
                  : "text-slate-500"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Reservas ({initialReservaciones.length})</span>
            </button>
          </div>

          {canManageLayout && <Button
            variant="outline"
            onClick={() => setIsSalaModalOpen(true)}
            className="text-xs"
          >
            <Plus className="w-4 h-4 mr-1" />
            <span>Nueva Sala</span>
          </Button>}

          {canManageLayout && <Button
            onClick={() => setIsMesaModalOpen(true)}
            className="text-xs"
          >
            <Plus className="w-4 h-4 mr-1" />
            <span>Nueva Mesa</span>
          </Button>}
        </div>
      </div>

      {activeView === "mesas" ? (
        <>
          {/* Salas Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-2">
            {initialSalas.map((sala) => (
              <button
                key={sala.id}
                onClick={() => setSelectedSalaId(sala.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedSalaId === sala.id
                    ? "bg-[#E63946] text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>{sala.nombre}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    selectedSalaId === sala.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {sala.mesas?.length || 0}
                </span>
              </button>
            ))}
          </div>

          {/* Grid de Mesas */}
          {currentSala && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {currentSala.mesas?.map((mesa: any) => {
                const badge = getEstadoBadge(mesa.estado);
                const pedido = mesa.pedidoActivo;

                return (
                  <div
                    key={mesa.id}
                    className={`bg-white rounded-2xl border-2 transition-all p-5 flex flex-col justify-between shadow-2xs hover:shadow-md ${badge.cardBorder}`}
                  >
                    {/* Header Mesa */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-base">
                            {mesa.numero}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">
                              Mesa {mesa.numero}
                            </span>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              <span>Hasta {mesa.capacidad} personas</span>
                            </span>
                          </div>
                        </div>

                        <div
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${badge.bg}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                          <span>{badge.text}</span>
                        </div>
                      </div>

                      {/* Info de Pedido Activo */}
                      {pedido ? (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between font-semibold text-slate-800">
                            <span>Comanda #{pedido.codigo}</span>
                            <span className="text-slate-500 font-normal">
                              {pedido.itemsCount} producto(s)
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>Mozo: {pedido.mesero}</span>
                            <span className="font-extrabold text-slate-900 text-xs">
                              {simboloMoneda} {pedido.total.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-4 text-center text-xs text-slate-400 italic">
                          Sin comanda activa
                        </div>
                      )}
                    </div>

                    {/* Acciones de Mesa */}
                    <div className="pt-4 border-t border-slate-100 mt-3 flex items-center justify-between gap-1.5">
                      <Link
                        href={`/pos?mesaId=${mesa.id}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#E63946] hover:bg-[#d62828] text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors shadow-2xs"
                      >
                        <Store className="w-3.5 h-3.5" />
                        <span>{pedido ? "Ver Comanda" : "Abrir POS"}</span>
                      </Link>

                      {pedido && (
                        <Button
                          variant="outline"
                          size="icon"
                          title="Trasladar mesa"
                          onClick={() => handleOpenTraslado(mesa)}
                          className="h-8 w-8 text-slate-600 hover:text-[#E63946]"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </Button>
                      )}

                      {/* Selector de cambio rápido de estado */}
                      <select
                        value={mesa.estado}
                        onChange={(e) =>
                          handleCambiarEstadoMesa(mesa.id, e.target.value as EstadoMesa)
                        }
                        className="text-[11px] py-1.5 px-2 rounded-xl border border-slate-200 bg-white text-slate-600 focus:outline-none"
                      >
                        <option value={EstadoMesa.DISPONIBLE}>🟢 Libre</option>
                        <option value={EstadoMesa.OCUPADA}>🔴 Ocupada</option>
                        <option value={EstadoMesa.RESERVADA}>🔵 Reservada</option>
                        <option value={EstadoMesa.SUCIA}>🟡 Por limpiar</option>
                      </select>

                      {canManageLayout && <Button
                        variant="ghost"
                        size="icon"
                        title="Eliminar mesa"
                        onClick={() => handleDeleteMesa(mesa.id, mesa.numero)}
                        className="h-8 w-8 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {(!currentSala?.mesas || currentSala.mesas.length === 0) && (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80">
              <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">
                No hay mesas en {currentSala?.nombre}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Agrega mesas a esta sala para comenzar a tomar pedidos en el POS.
              </p>
            </div>
          )}
        </>
      ) : (
        /* VISTA DE RESERVACIONES */
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800">
              Próximas Reservaciones
            </h3>
            <Button
              onClick={() => setIsReservacionModalOpen(true)}
              className="text-xs"
            >
              <Plus className="w-4 h-4 mr-1" />
              <span>Nueva Reserva</span>
            </Button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Teléfono</th>
                  <th className="py-3 px-4">Personas</th>
                  <th className="py-3 px-4">Mesa / Sala</th>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {initialReservaciones.map((res: any) => (
                  <tr key={res.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {res.nombreCliente}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{res.telefono}</td>
                    <td className="py-3 px-4 font-medium">{res.personas} pers.</td>
                    <td className="py-3 px-4 text-slate-600">
                      {res.mesa ? `Mesa ${res.mesa.numero} (${res.mesa.sala?.nombre})` : "Mesa asignada"}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {new Date(res.fechaHora).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={res.confirmada ? "success" : "warning"}>
                        {res.confirmada ? "Confirmada" : "Pendiente"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <Button
                        size="sm"
                        variant={res.confirmada ? "outline" : "primary"}
                        onClick={() => handleToggleConfirmar(res.id)}
                        className="text-[11px] h-7"
                      >
                        {res.confirmada ? "Marcar Pendiente" : "Confirmar"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {initialReservaciones.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">
                No hay reservaciones registradas.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL CREAR SALA */}
      <Modal
        isOpen={isSalaModalOpen}
        onClose={() => setIsSalaModalOpen(false)}
        title="Crear Nueva Sala"
        description="Ejemplos: Salón Principal, Terraza, Bar & Lounge, Zona VIP."
      >
        <form onSubmit={handleCreateSala} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre de la Sala *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Terraza Exterior"
              value={salaForm.nombre}
              onChange={(e) => setSalaForm((prev) => ({ ...prev, nombre: e.target.value }))}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" onClick={() => setIsSalaModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              Guardar Sala
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL CREAR MESA */}
      <Modal
        isOpen={isMesaModalOpen}
        onClose={() => setIsMesaModalOpen(false)}
        title={`Nueva Mesa en ${currentSala?.nombre}`}
        description="Asigna un identificador y capacidad para la mesa."
      >
        <form onSubmit={handleCreateMesa} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Número / Identificador de Mesa *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: 6, T4, VIP-2"
              value={mesaForm.numero}
              onChange={(e) => setMesaForm((prev) => ({ ...prev, numero: e.target.value }))}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Capacidad de Comensales *
            </label>
            <input
              type="number"
              min="1"
              max="50"
              required
              value={mesaForm.capacidad}
              onChange={(e) =>
                setMesaForm((prev) => ({ ...prev, capacidad: Number(e.target.value) }))
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" onClick={() => setIsMesaModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              Crear Mesa
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL TRASLADO DE MESA */}
      {isTrasladoModalOpen && mesaOrigenTraslado && (
        <Modal
          isOpen={isTrasladoModalOpen}
          onClose={() => setIsTrasladoModalOpen(false)}
          title={`Trasladar Mesa ${mesaOrigenTraslado.numero}`}
          description="Selecciona la mesa libre a la cual se moverán todos los pedidos y consumos activos."
        >
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
              La cuenta activa de la <strong>Mesa {mesaOrigenTraslado.numero}</strong> pasará a la nueva mesa y la mesa actual quedará disponible.
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mesa de Destino Disponible *
              </label>
              <select
                value={mesaDestinoId}
                onChange={(e) => setMesaDestinoId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
              >
                <option value="">-- Selecciona una mesa libre --</option>
                {todasMesasDisponibles.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    Mesa {m.numero} (Capacidad: {m.capacidad} personas)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="outline" onClick={() => setIsTrasladoModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={!mesaDestinoId || isPending}
                onClick={handleExecuteTraslado}
              >
                Confirmar Traslado
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL NUEVA RESERVACIÓN */}
      <Modal
        isOpen={isReservacionModalOpen}
        onClose={() => setIsReservacionModalOpen(false)}
        title="Registrar Nueva Reservación"
        description="Ingresa los datos del cliente y asigna fecha y mesa."
      >
        <form onSubmit={handleCreateReservacion} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre del Cliente *
            </label>
            <input
              type="text"
              required
              value={reservacionForm.nombreCliente}
              onChange={(e) =>
                setReservacionForm((prev) => ({ ...prev, nombreCliente: e.target.value }))
              }
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Teléfono de Contacto *
              </label>
              <input
                type="text"
                required
                value={reservacionForm.telefono}
                onChange={(e) =>
                  setReservacionForm((prev) => ({ ...prev, telefono: e.target.value }))
                }
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Número de Personas *
              </label>
              <input
                type="number"
                min="1"
                required
                value={reservacionForm.personas}
                onChange={(e) =>
                  setReservacionForm((prev) => ({
                    ...prev,
                    personas: Number(e.target.value),
                  }))
                }
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Fecha y Hora de la Reserva *
            </label>
            <input
              type="datetime-local"
              required
              value={reservacionForm.fechaHora}
              onChange={(e) =>
                setReservacionForm((prev) => ({ ...prev, fechaHora: e.target.value }))
              }
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mesa Asignada *
            </label>
            <select
              required
              value={reservacionForm.mesaId}
              onChange={(e) =>
                setReservacionForm((prev) => ({ ...prev, mesaId: e.target.value }))
              }
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white"
            >
              <option value="">-- Seleccionar mesa --</option>
              {initialSalas
                .flatMap((s) => s.mesas)
                .map((m: any) => (
                  <option key={m.id} value={m.id}>
                    Mesa {m.numero}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsReservacionModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              Guardar Reserva
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
