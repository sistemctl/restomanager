const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const base = process.env.VERIFY_HTTP_BASE || "http://localhost:3002";

async function request(jar, route, options = {}) {
  const response = await fetch(`${base}${route}`, { ...options, redirect: "manual", headers: { Cookie: Object.entries(jar).map(([key, value]) => `${key}=${value}`).join("; "), ...options.headers } });
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(";")[0];
    const index = pair.indexOf("=");
    jar[pair.slice(0, index)] = pair.slice(index + 1);
  }
  return response;
}

async function authenticate(provider, credentials, source = "http-role-test") {
  const jar = {};
  const { csrfToken } = await (await request(jar, "/api/auth/csrf")).json();
  const callback = await request(jar, `/api/auth/callback/${provider}`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Auth-Return-Redirect": "1", "x-forwarded-for": source },
    body: new URLSearchParams({ ...credentials, csrfToken, callbackUrl: base }),
  });
  const callbackData = await callback.json();
  const session = await (await request(jar, "/api/auth/session")).json();
  if (provider === "credentials" && !session?.user) throw new Error(`Login de prueba rechazado: ${new URL(callbackData.url, base).searchParams.get("error") || callback.status}`);
  return { jar, session: session || {} };
}

async function main() {
  const { protectPin } = await import("../src/lib/pin-security.ts");
  const createdIds = [];
  let server;
  let checks = 0;
  const check = (condition, message) => { assert.ok(condition, message); checks++; };
  try {
    if (!process.env.VERIFY_HTTP_BASE) {
    // No reutilizar un servidor existente para estas pruebas.
    try { await fetch(`${base}/api/auth/csrf`); throw new Error("El puerto 3002 ya esta ocupado"); }
    catch (error) { if (error.message === "El puerto 3002 ya esta ocupado") throw error; }
    server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "-p", "3002"], { windowsHide: true, stdio: ["ignore", "ignore", "ignore"], env: { ...process.env, AUTH_URL: base, NEXTAUTH_URL: base } });
    let ready = false;
    for (let i = 0; i < 80; i++) {
      try { if ((await fetch(`${base}/api/auth/csrf`)).ok) { ready = true; break; } } catch {}
      if (server.exitCode !== null) break;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert.ok(ready, "El servidor de prueba debe iniciar");
    }
    const password = randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    let pin;
    for (let n = 7000; n < 8000; n++) {
      const value = String(n);
      if (!await prisma.usuario.findFirst({ where: { pin: { in: [value, protectPin(value)] } } })) { pin = value; break; }
    }
    assert.ok(pin);
    const users = {};
    for (const rol of ["ADMIN", "CAJERO", "MESERO", "COCINERO", "REPARTIDOR"]) {
      const user = await prisma.usuario.create({ data: { nombre: "Prueba HTTP temporal", email: `${randomUUID()}@audit.test`, passwordHash, rol, ...(rol === "MESERO" ? { pin: protectPin(pin) } : {}) } });
      createdIds.push(user.id); users[rol] = user;
    }
    const sessions = {};
    for (const [rol, routes] of Object.entries({ ADMIN: [["/admin/configuracion", true]], CAJERO: [["/caja", true], ["/admin/empleados", false]], MESERO: [["/pos", true], ["/caja", false]], COCINERO: [["/cocina", true], ["/pos", false]], REPARTIDOR: [["/delivery", true], ["/cocina", false]] })) {
      const { jar, session } = await authenticate("credentials", { email: users[rol].email, password });
      sessions[rol] = jar;
      check(session.user?.role === rol, `Login real ${rol}`);
      check(!("pin" in session.user), `Sesion sin PIN ${rol}`);
      for (const [route, allowed] of routes) {
        const response = await request(jar, route);
        check(allowed ? response.status === 200 : [302, 303, 307, 308, 403].includes(response.status), `${rol} acceso ${route}: ${response.status}`);
      }
    }
    for (const route of ["/admin", "/pos", "/caja", "/cocina", "/delivery", "/admin/reportes", "/carta"]) {
      const measurements = [];
      for (let attempt = 0; attempt < 2; attempt++) {
        const started = performance.now();
        const response = await request(sessions.ADMIN, route);
        await response.arrayBuffer();
        check(response.status === 200, `Modulo ${route}: ${response.status}`);
        measurements.push(Math.round(performance.now() - started));
      }
      console.log(`${route}: ${measurements.join(" / ")} ms (primera / segunda carga HTTP completa)`);
    }
    const source = `pin-http-${randomUUID()}`;
    check((await authenticate("pin", { pin }, source)).session.user?.id === users.MESERO.id, "Login PIN real");
    for (let i = 0; i < 4; i++) check(!(await authenticate("pin", { pin: "invalido" }, source)).session.user, "Rechazar PIN invalido");
    check(!(await authenticate("pin", { pin }, source)).session.user, "Bloquear PIN correcto despues del limite");
    await prisma.usuario.update({ where: { id: users.MESERO.id }, data: { activo: false } });
    const blocked = await request(sessions.MESERO, "/pos");
    check([302, 303, 307, 308].includes(blocked.status) && blocked.headers.get("location")?.includes("/login"), "Sesion desactivada pierde acceso");
    check((await request(sessions.MESERO, "/login")).status === 200, "Reingreso sin bucle de redireccion");
    await prisma.usuario.update({ where: { id: users.ADMIN.id }, data: { rol: "MESERO" } });
    check((await request(sessions.ADMIN, "/admin/configuracion")).status === 307, "Rol cambiado pierde permiso administrativo");
    check((await request(sessions.ADMIN, "/pos")).status === 200, "Rol cambiado accede a POS sin bucle");
    console.log(`${checks} verificaciones HTTP reales aprobadas.`);
  } finally {
    if (server && server.exitCode === null) {
      const exited = new Promise(resolve => server.once("exit", resolve));
      server.kill();
      await exited;
    }
    if (createdIds.length) {
      await prisma.usuario.deleteMany({ where: { id: { in: createdIds } } });
      assert.equal(await prisma.usuario.count({ where: { id: { in: createdIds } } }), 0);
      console.log("Cuentas HTTP temporales eliminadas; servidor de prueba detenido.");
    }
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
