import { AppLayout } from "@/components/layout/app-layout";
import { requirePageRoles } from "@/lib/auth-helpers";
import { Rol } from "@prisma/client";

export default async function CajaLayout({ children }: { children: React.ReactNode }) {
  await requirePageRoles([Rol.ADMIN, Rol.CAJERO]);
  return <AppLayout>{children}</AppLayout>;
}
