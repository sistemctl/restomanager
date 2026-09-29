const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const { protectPin } = await import("../src/lib/pin-security.ts");
  const count = await prisma.$transaction(async tx => {
    const users = await tx.usuario.findMany({ where: { pin: { not: null } }, select: { id: true, pin: true } });
    let migrated = 0;
    for (const user of users) {
      if (user.pin.startsWith("hmac:")) continue;
      await tx.usuario.update({ where: { id: user.id }, data: { pin: protectPin(user.pin) } });
      migrated++;
    }
    return migrated;
  });
  console.log(`PIN protegidos: ${count}`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
