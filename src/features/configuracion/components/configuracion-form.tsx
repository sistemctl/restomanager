"use client";

import React, { useState, useTransition } from "react";
import {
  Settings,
  Building2,
  Receipt,
  Clock,
  Save,
  CheckCircle2,
  AlertCircle,
  Percent,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateConfiguracionAction } from "@/features/configuracion/actions";
import { ConfiguracionFormData } from "@/schemas/configuracion.schema";

interface ConfiguracionFormProps {
  initialConfig: {
    marcaSistema: string;
    subtituloSistema: string;
    nombreRestaurante: string;
    razonSocial: string | null;
    identificacionTributaria: string | null;
    telefono: string | null;
    email: string | null;
    direccion: string | null;
    ciudad: string | null;
    moneda: string;
    simboloMoneda: string;
    porcentajeImpuesto: number;
    aplicarImpuesto?: boolean;
    impuestoIncluido?: boolean;
    propinaSugerida: number;
    habilitarPropina?: boolean;
    mensajeTicket: string | null;
    kdsAlertaAmarillaMinutos: number;
    kdsAlertaRojaMinutos: number;
  };
}

export function ConfiguracionForm({ initialConfig }: ConfiguracionFormProps) {
  const [formData, setFormData] = useState<ConfiguracionFormData>({
    marcaSistema: initialConfig.marcaSistema,
    subtituloSistema: initialConfig.subtituloSistema,
    nombreRestaurante: initialConfig.nombreRestaurante,
    razonSocial: initialConfig.razonSocial || "",
    identificacionTributaria: initialConfig.identificacionTributaria || "",
    telefono: initialConfig.telefono || "",
    email: initialConfig.email || "",
    direccion: initialConfig.direccion || "",
    ciudad: initialConfig.ciudad || "Bogotá",
    moneda: initialConfig.moneda,
    simboloMoneda: initialConfig.simboloMoneda,
    porcentajeImpuesto: initialConfig.porcentajeImpuesto,
    aplicarImpuesto: initialConfig.aplicarImpuesto ?? true,
    impuestoIncluido: initialConfig.impuestoIncluido ?? true,
    propinaSugerida: initialConfig.propinaSugerida,
    habilitarPropina: initialConfig.habilitarPropina ?? true,
    mensajeTicket: initialConfig.mensajeTicket || "",
    kdsAlertaAmarillaMinutos: initialConfig.kdsAlertaAmarillaMinutos,
    kdsAlertaRojaMinutos: initialConfig.kdsAlertaRojaMinutos,
  });

  const [activeTab, setActiveTab] = useState<"general" | "fiscal" | "kds" | "ticket">("general");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await updateConfiguracionAction(formData);
      if (!res.success) {
        setError(res.error || "Error al guardar la configuración");
      } else {
        setSuccess("Configuración del sistema actualizada correctamente");
        setTimeout(() => setSuccess(null), 4000);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-[#E63946]" />
            <span>Configuración del Sistema</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Personaliza los datos del restaurante, parámetros impositivos, moneda y reglas de cocina.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto space-x-2">
        <button
          type="button"
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "general"
              ? "border-[#E63946] text-[#E63946]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Datos del Establecimiento</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("fiscal")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "fiscal"
              ? "border-[#E63946] text-[#E63946]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Moneda & Impuestos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("kds")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "kds"
              ? "border-[#E63946] text-[#E63946]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Tiempos de Cocina (KDS)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ticket")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "ticket"
              ? "border-[#E63946] text-[#E63946]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Comprobantes & Tickets</span>
        </button>
      </div>

      {/* Notifications */}
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

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-2xs space-y-6">
        {/* TAB 1: GENERAL */}
        {activeTab === "general" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Marca del sistema
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre del encabezado</label>
                <input type="text" required maxLength={40} value={formData.marcaSistema} onChange={(e) => setFormData((prev) => ({ ...prev, marcaSistema: e.target.value }))} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E63946]/40 focus:border-[#E63946]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Texto secundario</label>
                <input type="text" maxLength={50} value={formData.subtituloSistema} onChange={(e) => setFormData((prev) => ({ ...prev, subtituloSistema: e.target.value }))} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E63946]/40 focus:border-[#E63946]" />
              </div>
            </div>
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Información General de la Empresa
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre Comercial del Restaurante *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombreRestaurante}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      nombreRestaurante: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E63946]/40 focus:border-[#E63946]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Razón Social Legal
                </label>
                <input
                  type="text"
                  value={formData.razonSocial || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      razonSocial: e.target.value,
                    }))
                  }
                  placeholder="Ej: Gastronomía SAS"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E63946]/40 focus:border-[#E63946]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Identificación Tributaria (NIT / RFC / RUT)
                </label>
                <input
                  type="text"
                  value={formData.identificacionTributaria || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      identificacionTributaria: e.target.value,
                    }))
                  }
                  placeholder="Ej: 900.123.456-7"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E63946]/40 focus:border-[#E63946]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teléfono de Contacto
                </label>
                <input
                  type="text"
                  value={formData.telefono || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      telefono: e.target.value,
                    }))
                  }
                  placeholder="+57 (601) 555-0100"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E63946]/40 focus:border-[#E63946]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  placeholder="contacto@restomanager.com"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E63946]/40 focus:border-[#E63946]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ciudad
                </label>
                <input
                  type="text"
                  value={formData.ciudad || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      ciudad: e.target.value,
                    }))
                  }
                  placeholder="Bogotá"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E63946]/40 focus:border-[#E63946]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dirección Física
                </label>
                <input
                  type="text"
                  value={formData.direccion || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      direccion: e.target.value,
                    }))
                  }
                  placeholder="Calle 93 # 12-45"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E63946]/40 focus:border-[#E63946]"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FISCAL & MONEDA */}
        {activeTab === "fiscal" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Moneda Base del Sistema
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Código de Moneda *
                  </label>
                  <select
                    value={formData.moneda}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, moneda: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E63946]/40 focus:border-[#E63946] bg-white"
                  >
                    <option value="COP">COP (Peso Colombiano)</option>
                    <option value="USD">USD (Dólar Estadounidense)</option>
                    <option value="MXN">MXN (Peso Mexicano)</option>
                    <option value="ARS">ARS (Peso Argentino)</option>
                    <option value="EUR">EUR (Euro)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Símbolo de Moneda *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.simboloMoneda}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        simboloMoneda: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E63946]/40 focus:border-[#E63946]"
                  />
                </div>
              </div>
            </div>

            {/* Impuestos / IVA */}
            <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-slate-50/50 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-[#E63946]" />
                    <span>Impuestos y Parámetros Fiscales (IVA / Impoconsumo)</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Controla si tu restaurante aplica impuestos a las comandas y si están incluidos en la carta.
                  </p>
                </div>
              </div>

              {/* Checkbox 1: Aplicar Impuesto */}
              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 cursor-pointer transition-colors shadow-2xs">
                <input
                  type="checkbox"
                  checked={formData.aplicarImpuesto}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      aplicarImpuesto: e.target.checked,
                    }))
                  }
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#E63946] focus:ring-[#E63946]"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-800">
                    Aplicar Impuesto a las ventas y pedidos
                  </span>
                  <p className="text-slate-500 mt-0.5">
                    Habilita el cálculo del impuesto en todas las ventas, comandas y tickets del restaurante.
                  </p>
                </div>
              </label>

              {formData.aplicarImpuesto && (
                <div className="pl-4 border-l-2 border-[#E63946]/40 space-y-4 animate-in fade-in">
                  {/* Checkbox 2: Impuesto Incluido */}
                  <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 cursor-pointer transition-colors shadow-2xs">
                    <input
                      type="checkbox"
                      checked={formData.impuestoIncluido}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          impuestoIncluido: e.target.checked,
                        }))
                      }
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#E63946] focus:ring-[#E63946]"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-slate-800">
                        Los precios de los platillos ya tienen el impuesto incluido (IVA incluido)
                      </span>
                      <p className="text-slate-500 mt-0.5">
                        Si está marcado, el precio de la carta es el total final (el impuesto solo se desglosa informativamente). Si está desmarcado, el impuesto se suma al subtotal de los productos.
                      </p>
                    </div>
                  </label>

                  {/* Porcentaje de Impuesto */}
                  <div className="max-w-xs">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Porcentaje de Impuesto (%) *
                    </label>
                    <div className="relative">
                      <Percent className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.porcentajeImpuesto}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            porcentajeImpuesto: Number(e.target.value),
                          }))
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#E63946]/40 focus:border-[#E63946]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Propina Voluntaria */}
            <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-slate-50/50 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-600" />
                  <span>Propina Sugerida</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Gestiona la sugerencia voluntaria de propina para el servicio de meseros.
                </p>
              </div>

              {/* Checkbox 3: Habilitar Propina */}
              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 cursor-pointer transition-colors shadow-2xs">
                <input
                  type="checkbox"
                  checked={formData.habilitarPropina}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      habilitarPropina: e.target.checked,
                    }))
                  }
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#E63946] focus:ring-[#E63946]"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-800">
                    Habilitar sugerencia de propina voluntaria
                  </span>
                  <p className="text-slate-500 mt-0.5">
                    Muestra el monto sugerido de propina al imprimir la precuenta y al momento del cobro.
                  </p>
                </div>
              </label>

              {formData.habilitarPropina && (
                <div className="pl-4 border-l-2 border-amber-500/40 max-w-xs animate-in fade-in">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Porcentaje de Propina Sugerida (%) *
                  </label>
                  <div className="relative">
                    <Percent className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.propinaSugerida}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          propinaSugerida: Number(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#E63946]/40 focus:border-[#E63946]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: KDS COCINA */}
        {activeTab === "kds" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Umbrales de Urgencia en Cocina (KDS Semáforo)
            </h3>
            <p className="text-xs text-slate-500">
              Configura los minutos en que los pedidos en pantalla KDS cambian de color para alertar al equipo de cocina.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <label className="text-xs font-bold text-amber-900">
                    Alerta Amarilla (Atención)
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={formData.kdsAlertaAmarillaMinutos}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        kdsAlertaAmarillaMinutos: Number(e.target.value),
                      }))
                    }
                    className="w-24 px-3 py-2 text-xs rounded-xl border border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <span className="text-xs text-amber-800 font-medium">minutos transcurridos</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <label className="text-xs font-bold text-rose-900">
                    Alerta Roja (Demorado / Crítico)
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="2"
                    max="240"
                    value={formData.kdsAlertaRojaMinutos}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        kdsAlertaRojaMinutos: Number(e.target.value),
                      }))
                    }
                    className="w-24 px-3 py-2 text-xs rounded-xl border border-rose-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                  <span className="text-xs text-rose-800 font-medium">minutos transcurridos</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TICKETS */}
        {activeTab === "ticket" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Mensajes en Comprobantes de Pago y Precuentas
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mensaje de Despedida (Pie de Ticket)
              </label>
              <textarea
                rows={3}
                value={formData.mensajeTicket || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    mensajeTicket: e.target.value,
                  }))
                }
                placeholder="¡Gracias por su visita! Vuelva pronto."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E63946]/40 focus:border-[#E63946]"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Este mensaje se imprimirá al final de la precuenta y comprobante de pago entregado al comensal.
              </p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
          <Button
            type="submit"
            variant="primary"
            isLoading={isPending}
            className="shadow-xs"
          >
            <Save className="w-4 h-4 mr-2" />
            <span>Guardar Configuración</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
