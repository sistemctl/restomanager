"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Rol } from "@prisma/client";
import {
  LayoutDashboard,
  UtensilsCrossed,
  ChefHat,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Layers,
  Store,
  Wallet,
  Package,
  Landmark,
  QrCode,
  BarChart3,
  Bike,
} from "lucide-react";
import { getDefaultRedirectForRole } from "@/lib/role-access";
import { cn } from "@/lib/utils";

interface SidebarProps {
  userRole?: Rol;
  brandName?: string;
  brandSubtitle?: string;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Rol[];
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export function Sidebar({ userRole = Rol.ADMIN, brandName = "RestoManager", brandSubtitle = "POS SYSTEM" }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const navigation: NavGroup[] = [
    {
      title: "Operación",
      items: [
        {
          name: "Terminal POS",
          href: "/pos",
          icon: Store,
          roles: [Rol.ADMIN, Rol.CAJERO, Rol.MESERO],
        },
        {
          name: "Mesas & Salas",
          href: "/admin/mesas",
          icon: Layers,
          roles: [Rol.ADMIN, Rol.CAJERO],
        },
        {
          name: "Cocina KDS",
          href: "/cocina",
          icon: ChefHat,
          roles: [Rol.ADMIN, Rol.COCINERO],
        },
        {
          name: "Delivery",
          href: "/delivery",
          icon: Bike,
          roles: [Rol.ADMIN, Rol.CAJERO, Rol.REPARTIDOR],
        },
      ],
    },
    {
      title: "Administración",
      items: [
        {
          name: "Dashboard",
          href: "/admin",
          icon: LayoutDashboard,
          roles: [Rol.ADMIN, Rol.CAJERO],
        },
        {
          name: "Menú & Catálogo",
          href: "/admin/menu",
          icon: UtensilsCrossed,
          roles: [Rol.ADMIN],
        },
        {
          name: "Carta QR",
          href: "/admin/carta-qr",
          icon: QrCode,
          roles: [Rol.ADMIN],
        },
        {
          name: "Reportes",
          href: "/admin/reportes",
          icon: BarChart3,
          roles: [Rol.ADMIN, Rol.CAJERO],
        },
        {
          name: "Empleados",
          href: "/admin/empleados",
          icon: Users,
          roles: [Rol.ADMIN],
        },
        {
          name: "Configuración",
          href: "/admin/configuracion",
          icon: Settings,
          roles: [Rol.ADMIN],
        },
      ],
    },
    {
      title: "Finanzas",
      items: [
        {
          name: "Caja & Turnos",
          href: "/caja",
          icon: Wallet,
          roles: [Rol.ADMIN, Rol.CAJERO],
        },
        {
          name: "Inventario",
          href: "/admin/inventario",
          icon: Package,
          roles: [Rol.ADMIN],
        },
        {
          name: userRole === Rol.CAJERO ? "Clientes" : "Clientes & Finanzas",
          href: "/admin/finanzas",
          icon: Landmark,
          roles: [Rol.ADMIN, Rol.CAJERO],
        },
      ],
    },
  ];

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col bg-slate-900 text-slate-300 border-r border-slate-800 transition-all duration-300 z-30 select-none",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
        {!collapsed && (
          <Link href={getDefaultRedirectForRole(userRole)} className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E63946] flex items-center justify-center text-white shadow-md">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white text-base leading-tight tracking-tight">
                {brandName}
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                {brandSubtitle}
              </span>
            </div>
          </Link>
        )}
        {collapsed && (
          <Link href={getDefaultRedirectForRole(userRole)} className="mx-auto">
            <div className="w-10 h-10 rounded-xl bg-[#E63946] flex items-center justify-center text-white shadow-md">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
          </Link>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={collapsed ? "Expandir" : "Colapsar"}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Nav links */}
      <div className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
        {navigation.map((group, idx) => {
          // Filter items by user role
          const visibleItems = group.items.filter((item) =>
            item.roles.includes(userRole)
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-1">
              {!collapsed && (
                <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  {group.title}
                </p>
              )}
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/admin" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.name : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative",
                      isActive
                        ? "bg-[#E63946] text-white shadow-sm"
                        : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-5 h-5 shrink-0 transition-transform group-hover:scale-105",
                        isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                      )}
                    />
                    {!collapsed && (
                      <span className="flex-1 truncate">{item.name}</span>
                    )}
                    {!collapsed && item.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 font-semibold border border-slate-700">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

    </aside>
  );
}
