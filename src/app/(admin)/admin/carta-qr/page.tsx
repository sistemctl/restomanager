import { networkInterfaces } from "node:os";
import { prisma } from "@/lib/prisma";
import { QrMesas } from "@/features/carta-qr/components/qr-mesas";

function getLocalIp() {
  const addresses = Object.entries(networkInterfaces())
    .filter(([name]) => !/virtual|vethernet|wsl|loopback|vpn|docker/i.test(name))
    .flatMap(([name, entries]) => (entries ?? []).map((entry) => ({ ...entry, name })))
    .filter((entry) => entry.family === "IPv4" && !entry.internal)
    .filter((entry) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(entry.address))
    .sort((a, b) => Number(/wi-?fi|wireless/i.test(b.name)) - Number(/wi-?fi|wireless/i.test(a.name)));
  return addresses[0]?.address ?? null;
}

export default async function CartaQrAdminPage() {
  const mesas = await prisma.mesa.findMany({
    select: { id: true, numero: true, sala: { select: { nombre: true } } },
    orderBy: { numero: "asc" },
  });
  const localIp = getLocalIp();
  const localUrl = localIp ? `http://${localIp}:3000` : null;
  const cloudflareUrl = process.env.PUBLIC_URL?.replace(/\/$/, "") ?? null;
  return <QrMesas mesas={mesas} localUrl={localUrl} cloudflareUrl={cloudflareUrl} />;
}
