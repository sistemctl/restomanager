"use server";

import { signOut } from "@/lib/auth";

export async function cerrarSesionAction() {
  await signOut({ redirectTo: "/login", redirect: false });
  return { success: true };
}
