import { Rol } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Rol;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    role?: Rol;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Rol;
  }
}
