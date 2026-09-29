const assert = require("node:assert/strict");
const esbuild = require("esbuild");
const Module = require("node:module");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const result = await esbuild.build({
    stdin: { contents: 'export * from "./src/lib/auth"; export * from "./src/lib/pin-security";', resolveDir: process.cwd(), loader: "ts" },
    bundle: true, platform: "node", format: "cjs", packages: "external", write: false,
    plugins: [{ name: "auth-request-context", setup(build) {
      build.onResolve({ filter: /^(?:next-auth|@\/lib\/prisma)$/ }, args => ({ path: args.path, namespace: "context" }));
      build.onLoad({ filter: /.*/, namespace: "context" }, args => ({ contents: args.path === "next-auth"
        ? 'export default function NextAuth(config) { globalThis.__pinConfig = config; return { handlers: {}, auth: async () => null, signIn: () => {}, signOut: () => {} }; }'
        : 'export const prisma = new Proxy({}, { get(_, key) { return globalThis.__pinDb[key]; } });', loader: "js" }));
    } }],
  });
  const filename = path.join(process.cwd(), "scripts", "pin-bundle.cjs");
  const compiled = new Module(filename, module);
  compiled.filename = filename;
  compiled.paths = module.paths;
  compiled._compile(result.outputFiles[0].text, filename);
  const { protectPin } = compiled.exports;
  const provider = globalThis.__pinConfig.providers.find(p => (p.options?.id ?? p.id) === "pin");
  const authorize = provider.options?.authorize ?? provider.authorize;
  const request = source => new Request("http://localhost/api/auth/callback/pin", { headers: { "x-forwarded-for": source } });
  const before = await prisma.usuario.count();
  let checks = 0;
  const check = condition => { assert.ok(condition); checks++; };
  try {
    await prisma.$transaction(async tx => {
      globalThis.__pinDb = tx;
      let pin;
      for (let n = 9000; n <= 9999; n++) {
        const candidate = String(n);
        if (!await tx.usuario.findFirst({ where: { pin: { in: [candidate, protectPin(candidate)] } } })) { pin = candidate; break; }
      }
      assert.ok(pin, "Se necesita un PIN libre para la prueba");
      const user = await tx.usuario.create({ data: { nombre: "Prueba PIN transitoria", rol: "MESERO", pin } });
      const authenticated = await authorize({ pin }, request("pin-migrate"));
      check(authenticated?.id === user.id);
      check(!("pin" in authenticated));
      check((await tx.usuario.findUnique({ where: { id: user.id } })).pin === protectPin(pin));
      check((await authorize({ pin }, request("pin-hashed")))?.id === user.id);
      await tx.usuario.update({ where: { id: user.id }, data: { activo: false } });
      check(await authorize({ pin }, request("pin-inactive")) === null);
      await tx.usuario.update({ where: { id: user.id }, data: { activo: true } });
      for (let i = 0; i < 5; i++) check(await authorize({ pin: "incorrecto" }, request("pin-throttle")) === null);
      check(await authorize({ pin }, request("pin-throttle")) === null);
      check((await authorize({ pin }, request("pin-other-device")))?.id === user.id);
      const token = await globalThis.__pinConfig.callbacks.jwt({ token: { pin, role: "MESERO" }, user: authenticated });
      check(!("pin" in token));
      const session = await globalThis.__pinConfig.callbacks.session({ session: { user: {} }, token });
      check(!("pin" in session.user));
      throw new Error("ROLLBACK_PIN_TEST");
    }, { timeout: 15000 });
  } catch (error) { if (error.message !== "ROLLBACK_PIN_TEST") throw error; }
  assert.equal(await prisma.usuario.count(), before);
  console.log(`${checks} verificaciones PIN aprobadas; usuarios temporales revertidos.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
