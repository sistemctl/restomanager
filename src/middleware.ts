import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import { Rol } from "@prisma/client";
import { canAccessRoute } from "@/lib/role-access";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role as Rol | undefined;
  const pathname = nextUrl.pathname;

  // Rutas públicas y recursos estáticos
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/pin");
  const isPublicApi = pathname.startsWith("/api/auth");
  const isPublicMenu = pathname.startsWith("/carta") || pathname.startsWith("/qr") || pathname.startsWith("/serwist") || pathname.startsWith("/~offline") || pathname.startsWith("/manifest.webmanifest");

  if (isPublicApi || isPublicMenu) {
    return NextResponse.next();
  }

  // Permitir reautenticacion incluso si una sesion antigua fue desactivada.
  if (isAuthPage) {
    return NextResponse.next();
  }

  // Si no está autenticado, redirigir a login
  if (!isLoggedIn) {
    const callbackUrl = encodeURIComponent(pathname + nextUrl.search);
    return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, nextUrl));
  }

  // Control de acceso por Roles (Zero-Trust)
  if (!role) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }
  // Los layouts y acciones verifican el rol vigente en DB, no el rol antiguo del JWT.
  if (!Object.values(Rol).some(candidate => canAccessRoute(candidate, pathname))) {
    return new NextResponse("Ruta no autorizada", { status: 403 });
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
