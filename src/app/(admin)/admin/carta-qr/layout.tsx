import { Rol } from "@prisma/client";
import { requirePageRoles } from "@/lib/auth-helpers";

export default async function RestrictedLayout({ children }: { children: React.ReactNode }) {
  await requirePageRoles([Rol.ADMIN]);
  return children;
}
