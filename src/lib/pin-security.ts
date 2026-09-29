import { createHmac } from "node:crypto";

export function protectPin(pin: string): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("Falta configurar el secreto de autenticacion");
  return `hmac:${createHmac("sha256", secret).update(`employee-pin:${pin}`).digest("hex")}`;
}
