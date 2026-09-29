import React from "react";
import { getCurrentUser } from "@/lib/auth-helpers";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { prisma } from "@/lib/prisma";

interface AppLayoutProps {
  children: React.ReactNode;
}

export async function AppLayout({ children }: AppLayoutProps) {
  const user = await getCurrentUser();
  const config = await prisma.configuracion.findFirst({
    select: { marcaSistema: true, subtituloSistema: true, nombreRestaurante: true },
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      {/* Desktop Sidebar */}
      <Sidebar userRole={user?.role} brandName={config?.marcaSistema ?? "RestoManager"} brandSubtitle={config?.subtituloSistema ?? "POS SYSTEM"} />

      {/* Main Body */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <Header user={user} restaurantName={config?.nombreRestaurante ?? "RestoManager Gourmet"} />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav userRole={user?.role} />
      </div>
    </div>
  );
}
