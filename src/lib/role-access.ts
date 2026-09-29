import { Rol } from "@prisma/client";

export function getDefaultRedirectForRole(role: Rol): string {
  if (role === Rol.ADMIN) return "/admin";
  if (role === Rol.COCINERO) return "/cocina";
  if (role === Rol.REPARTIDOR) return "/delivery";
  return "/pos";
}

const ROUTE_ROLES: Record<string, Rol[]> = {
  "/api/cocina/stream": [Rol.ADMIN, Rol.COCINERO],
  "/api/notificaciones/stream": [Rol.ADMIN, Rol.CAJERO, Rol.MESERO],
  "/admin/mesas": [Rol.ADMIN, Rol.CAJERO],
  "/admin/reportes": [Rol.ADMIN, Rol.CAJERO],
  "/admin/finanzas": [Rol.ADMIN, Rol.CAJERO],
  "/pos": [Rol.ADMIN, Rol.CAJERO, Rol.MESERO],
  "/caja": [Rol.ADMIN, Rol.CAJERO],
  "/cocina": [Rol.ADMIN, Rol.COCINERO],
  "/delivery": [Rol.ADMIN, Rol.CAJERO, Rol.REPARTIDOR],
  "/mesas": [Rol.ADMIN, Rol.CAJERO],
  "/menu": [Rol.ADMIN],
  "/traslado": [Rol.ADMIN, Rol.CAJERO],
  "/ticket": [Rol.ADMIN, Rol.CAJERO, Rol.MESERO],
  "/precuenta": [Rol.ADMIN, Rol.CAJERO, Rol.MESERO],
  "/factura": [Rol.ADMIN, Rol.CAJERO, Rol.MESERO],
};

export function canAccessRoute(role: Rol, pathname: string): boolean {
  if (pathname === "/admin") return role === Rol.ADMIN || role === Rol.CAJERO;
  for (const [route, roles] of Object.entries(ROUTE_ROLES)) {
    if (pathname === route || pathname.startsWith(`${route}/`)) return roles.includes(role);
  }
  if (pathname.startsWith("/admin/")) return role === Rol.ADMIN;
  return pathname === "/";
}
