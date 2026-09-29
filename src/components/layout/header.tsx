"use client";

import React, { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { Rol } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PinSwitchModal } from "@/components/auth/pin-switch-modal";
import { KeyRound, LogOut, Clock, Utensils } from "lucide-react";
import { NotificacionesMesero } from "@/components/layout/notificaciones-mesero";

interface HeaderProps {
  user?: {
    name?: string | null;
    email?: string | null;
    role?: Rol | null;
  } | null;
  restaurantName?: string;
}

export function Header({
  user,
  restaurantName = "RestoManager Gourmet",
}: HeaderProps) {
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("es-CO", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getRoleBadgeVariant = (role?: Rol | null) => {
    switch (role) {
      case Rol.ADMIN:
        return "danger";
      case Rol.CAJERO:
        return "warning";
      case Rol.MESERO:
        return "info";
      case Rol.COCINERO:
        return "success";
      case Rol.REPARTIDOR:
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRoleLabel = (role?: Rol | null) => {
    switch (role) {
      case Rol.ADMIN:
        return "Administrador";
      case Rol.CAJERO:
        return "Cajero";
      case Rol.MESERO:
        return "Mesero / Piso";
      case Rol.COCINERO:
        return "Cocinero KDS";
      case Rol.REPARTIDOR:
        return "Repartidor";
      default:
        return "Personal";
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
      {/* Left: Restaurant name & Current Time */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 md:hidden">
          <div className="w-8 h-8 rounded-lg bg-[#E63946] flex items-center justify-center text-white">
            <Utensils className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-800 text-sm">{restaurantName}</span>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <span className="font-semibold text-slate-800 text-sm">{restaurantName}</span>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/60">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{time || "--:--"}</span>
          </div>
        </div>
      </div>

      {/* Right: User Profile, PIN Switch & Logout */}
      <div className="flex items-center gap-2 md:gap-3">
        {(user?.role === Rol.ADMIN || user?.role === Rol.CAJERO || user?.role === Rol.MESERO) && (
          <NotificacionesMesero />
        )}
        {/* Quick PIN switch button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsPinModalOpen(true)}
          className="text-xs text-slate-700 hover:text-[#E63946] hover:border-rose-200 transition-colors"
          title="Cambiar rápido de usuario mediante PIN"
        >
          <KeyRound className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden sm:inline">Cambiar con PIN</span>
        </Button>

        {/* User Card */}
        {user && (
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
              {user.name ? user.name.slice(0, 2).toUpperCase() : "RM"}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-800 leading-tight">
                {user.name}
              </span>
              <div className="mt-0.5">
                <Badge variant={getRoleBadgeVariant(user.role)}>
                  {getRoleLabel(user.role)}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Sign out */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
          title="Cerrar Sesión"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>

      {/* PIN Switch Modal */}
      <PinSwitchModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        currentUserName={user?.name}
      />
    </header>
  );
}
