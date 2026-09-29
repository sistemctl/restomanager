import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Rol } from "@prisma/client";
import { canAccessRoute } from "@/lib/role-access";
import { requirePageRoles } from "@/lib/auth-helpers";
import {
  Users,
  Store,
  ChefHat,
  Settings,
  Layers,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function AdminDashboardPage() {
  const user = await requirePageRoles([Rol.ADMIN, Rol.CAJERO]);

  // Métricas del sistema en tiempo real
  const [
    totalUsuarios,
    usuariosActivos,
    totalSalas,
    totalMesas,
    config,
    usuariosPorRol,
  ] = await Promise.all([
    prisma.usuario.count(),
    prisma.usuario.count({ where: { activo: true } }),
    prisma.sala.count({ where: { activa: true } }),
    prisma.mesa.count(),
    prisma.configuracion.findFirst(),
    prisma.usuario.groupBy({
      by: ["rol"],
      _count: { _all: true },
    }),
  ]);

  const kpis = [
    {
      label: "Personal Activo",
      value: `${usuariosActivos} / ${totalUsuarios}`,
      desc: "Empleados habilitados para operar",
      icon: Users,
      color: "text-blue-600 bg-blue-50 border-blue-100",
      href: "/admin/empleados",
    },
    {
      label: "Salas & Ambientes",
      value: totalSalas,
      desc: "Salas activas configuradas",
      icon: Layers,
      color: "text-amber-600 bg-amber-50 border-amber-100",
      href: "/mesas",
    },
    {
      label: "Capacidad de Mesas",
      value: totalMesas,
      desc: "Mesas listas para comensales",
      icon: Store,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
      href: "/pos",
    },
    {
      label: "Impuesto / Moneda",
      value: `${config?.moneda ?? "COP"} (${config?.porcentajeImpuesto ?? 19}%)`,
      desc: config?.nombreRestaurante ?? "RestoManager",
      icon: Settings,
      color: "text-rose-600 bg-rose-50 border-rose-100",
      href: "/admin/configuracion",
    },
  ];

  const quickActions = [
    {
      title: "Terminal POS",
      desc: "Toma de pedidos en mesa, mostrador y delivery.",
      icon: Store,
      href: "/pos",
      color: "hover:border-[#E63946]",
      iconBg: "bg-rose-50 text-[#E63946]",
    },
    {
      title: "Pantalla Cocina KDS",
      desc: "Comandas en tiempo real con semáforo de urgencia.",
      icon: ChefHat,
      href: "/cocina",
      color: "hover:border-emerald-500",
      iconBg: "bg-emerald-50 text-emerald-600",
    },
    {
      title: "Gestión de Personal",
      desc: "Administra empleados, asigna roles y códigos PIN.",
      icon: Users,
      href: "/admin/empleados",
      color: "hover:border-[#457B9D]",
      iconBg: "bg-sky-50 text-[#457B9D]",
    },
    {
      title: "Configuración General",
      desc: "Parámetros fiscales, datos del local, moneda y tickets.",
      icon: Settings,
      href: "/admin/configuracion",
      color: "hover:border-slate-500",
      iconBg: "bg-slate-100 text-slate-700",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Bienvenido, {user?.name || "Administrador"}
            </h1>
            <Badge variant="danger">{user.role}</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Panel administrativo de control central para {config?.nombreRestaurante || "RestoManager Gourmet"}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/pos"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E63946] hover:bg-[#d62828] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Store className="w-4 h-4" />
            <span>Abrir Terminal POS</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.filter(kpi => canAccessRoute(user.role, kpi.href)).map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={idx}
              href={kpi.href}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {kpi.label}
                </span>
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center border ${kpi.color}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-4">
                <div className="text-2xl font-bold text-slate-900">
                  {kpi.value}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{kpi.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Action Hub */}
      <div>
        <h2 className="text-base font-bold text-slate-900 mb-4">
          Accesos Directos a Módulos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.filter(qa => canAccessRoute(user.role, qa.href)).map((qa, idx) => {
            const Icon = qa.icon;
            return (
              <Link
                key={idx}
                href={qa.href}
                className={`bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs transition-all flex flex-col justify-between group ${qa.color}`}
              >
                <div>
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${qa.iconBg}`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-[#E63946] transition-colors">
                    {qa.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {qa.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-semibold text-slate-600 group-hover:text-[#E63946] transition-colors">
                  <span>Acceder</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Phase 1 Status & Roles Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span>Distribución de Personal</span>
          </h3>
          <div className="space-y-3">
            {usuariosPorRol.map((item) => (
              <div
                key={item.rol}
                className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-slate-50 border border-slate-100"
              >
                <span className="font-medium text-slate-700">{item.rol}</span>
                <span className="font-bold text-slate-900">
                  {item._count._all} empleado{item._count._all > 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
          {user.role === Rol.ADMIN && <div className="mt-4 pt-4 border-t border-slate-100 text-center">
            <Link
              href="/admin/empleados"
              className="text-xs font-semibold text-[#E63946] hover:underline"
            >
              Gestionar todos los empleados →
            </Link>
          </div>}
        </div>

        {/* Phase 1 Verification Checklist */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Módulos del restaurante</span>
            </h3>
            <Badge variant="success">Operación</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-800">Pedidos y cocina</strong>
                <p className="text-slate-500 text-[11px]">POS, mesas y comandas en tiempo real.</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-800">Acceso con email o PIN</strong>
                <p className="text-slate-500 text-[11px]">Acceso con contraseña o PIN de 4 dígitos para cambio en tablet.</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-800">Caja y facturación</strong>
                <p className="text-slate-500 text-[11px]">Turnos, cobros y comprobantes de venta.</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-800">Inventario, clientes y reportes</strong>
                <p className="text-slate-500 text-[11px]">Gestión y seguimiento de la operación.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
