import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import { protectPin } from "@/lib/pin-security";
import { allowAttempt } from "@/lib/rate-limit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: "credentials",
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = (credentials.email as string).trim().toLowerCase();
        const password = credentials.password as string;

        const user = await prisma.usuario.findUnique({
          where: { email },
        });

        if (!user || !user.passwordHash || !user.activo) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.nombre,
          email: user.email,
          role: user.rol,
        };
      },
    }),
    Credentials({
      id: "pin",
      name: "PIN Login",
      credentials: {
        pin: { label: "PIN", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.pin) {
          return null;
        }

        const pin = (credentials.pin as string).trim();
        const source = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
        if (!allowAttempt(`pin:${source}`, 5, 60_000) || !allowAttempt("pin:global", 100, 60_000)) return null;
        if (!/^\d{4}$/.test(pin)) {
          return null;
        }

        const user = await prisma.usuario.findFirst({
          where: {
            pin: { in: [protectPin(pin), pin] },
            activo: true,
          },
        });

        if (!user) {
          return null;
        }

        if (!user.pin?.startsWith("hmac:")) {
          await prisma.usuario.update({ where: { id: user.id }, data: { pin: protectPin(pin) } });
        }

        return {
          id: user.id,
          name: user.nombre,
          email: user.email,
          role: user.rol,
        };
      },
    }),
  ],
});
