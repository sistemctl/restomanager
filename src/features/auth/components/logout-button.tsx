"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { cerrarSesionAction } from "@/features/auth/actions";

export function LogoutButton() {
  const [pending, setPending] = useState(false);
  const cerrarSesion = async () => {
    if (pending) return;
    setPending(true);
    try {
      const result = await cerrarSesionAction();
      if (result.success) window.location.assign("/login");
    } finally {
      setPending(false);
    }
  };

  return <button type="button" onClick={cerrarSesion} disabled={pending} title="Cerrar sesión" aria-label="Cerrar sesión" className="h-9 px-3 rounded-lg border border-white/10 text-slate-300 flex items-center justify-center gap-2 hover:text-white hover:bg-white/10 disabled:opacity-50"><LogOut className="w-4 h-4" /><span className="text-xs font-bold">{pending ? "Saliendo…" : "Salir"}</span></button>;
}
