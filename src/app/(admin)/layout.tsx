import React from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { requirePageRoles } from "@/lib/auth-helpers";
import { Rol } from "@prisma/client";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Verificación Zero-Trust a nivel de layout admin
  await requirePageRoles([Rol.ADMIN, Rol.CAJERO]);

  return <AppLayout>{children}</AppLayout>;
}
