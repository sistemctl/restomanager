import { Rol } from "@prisma/client";
import { AppLayout } from "@/components/layout/app-layout";
import { requirePageRoles } from "@/lib/auth-helpers";
export default async function DeliveryLayout({children}:{children:React.ReactNode}){await requirePageRoles([Rol.ADMIN,Rol.CAJERO,Rol.REPARTIDOR]);return <AppLayout>{children}</AppLayout>}
