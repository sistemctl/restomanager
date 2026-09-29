"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Rol } from "@prisma/client";
import { Store, ChefHat, LayoutDashboard, Users, Settings, Wallet, Package, Landmark, Bike, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  userRole?: Rol;
}

export function BottomNav({ userRole = Rol.MESERO }: BottomNavProps) {
  const pathname = usePathname();

  const links: Array<{
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    roles: Rol[];
  }> = [
    {
      name: "POS",
      href: "/pos",
      icon: Store,
      roles: [Rol.ADMIN, Rol.CAJERO, Rol.MESERO],
    },
    {
      name: "Caja",
      href: "/caja",
      icon: Wallet,
      roles: [Rol.ADMIN, Rol.CAJERO],
    },
    {
      name: "Cocina",
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
    {
      name: "Stock",
      href: "/admin/inventario",
      icon: Package,
      roles: [Rol.ADMIN],
    },
    {
      name: "Finanzas",
      href: "/admin/finanzas",
      icon: Landmark,
      roles: [Rol.ADMIN],
    },
    {
      name: "Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
      roles: [Rol.ADMIN],
    },
    {
      name: "Reportes",
      href: "/admin/reportes",
      icon: BarChart3,
      roles: [Rol.ADMIN],
    },
    {
      name: "Personal",
      href: "/admin/empleados",
      icon: Users,
      roles: [Rol.ADMIN],
    },
    {
      name: "Ajustes",
      href: "/admin/configuracion",
      icon: Settings,
      roles: [Rol.ADMIN],
    },
  ];

  const visibleLinks = links.filter((link) => link.roles.includes(userRole));

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 z-30 flex items-center justify-start px-2 shadow-lg safe-area-pb overflow-x-auto">
      {visibleLinks.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href !== "/admin" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center flex-1 min-w-16 py-1 gap-1 transition-colors",
              isActive
                ? "text-[#E63946] font-semibold"
                : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
