const assert = require("node:assert/strict");
const esbuild = require("esbuild");
const { PrismaClient } = require("@prisma/client");
const { randomUUID } = require("node:crypto");
const Module = require("node:module");
const path = require("node:path");
const prisma = new PrismaClient();

async function loadActions() {
  const result = await esbuild.build({
    stdin: { contents: ["pos", "cocina", "caja", "delivery", "carta-qr", "empleados"].map(feature => `export * from "./src/features/${feature}/actions";`).join("\n") + '\nexport * from "./src/lib/role-access";', resolveDir: process.cwd(), loader: "ts" },
    bundle: true, platform: "node", format: "cjs", packages: "external", write: false,
    plugins: [{ name: "request-context", setup(build) {
      const mocks = {
        "@/lib/auth": "export const auth = async () => globalThis.__audit.session;",
        "@/lib/prisma": 'export const prisma = new Proxy({}, { get(_, key) { if (key === "$transaction") return async callback => callback(globalThis.__audit.db); return globalThis.__audit.db[key]; } });',
        "next/cache": "export const revalidatePath = () => {};",
        "next/headers": 'export const headers = async () => new Headers({ "x-forwarded-for": "audit-test" });',
        "next/navigation": 'export const redirect = () => { throw new Error("REDIRECT"); };',
      };
      build.onResolve({ filter: /^(?:@\/lib\/(?:auth|prisma)|next\/(?:cache|headers|navigation))$/ }, args => ({ path: args.path, namespace: "test-context" }));
      build.onLoad({ filter: /.*/, namespace: "test-context" }, args => ({ contents: mocks[args.path], loader: "js" }));
    } }],
  });
  const filename = path.join(process.cwd(), "scripts", "operation-bundle.cjs");
  const compiled = new Module(filename, module);
  compiled.filename = filename;
  compiled.paths = module.paths;
  compiled._compile(result.outputFiles[0].text, filename);
  return compiled.exports;
}

async function main() {
  const actions = await loadActions();
  const models = ["usuario", "categoriaMenu", "platillo", "ingrediente", "recetaIngrediente", "sala", "mesa", "pedido", "detallePedido", "pago", "turno", "arqueoCaja", "direccionDelivery", "movimientoInventario"];
  const counts = () => Promise.all(models.map(model => prisma[model].count()));
  const before = await counts();
  const passed = [];
  const check = (name, condition) => { assert.ok(condition, name); passed.push(name); };
  try {
    await prisma.$transaction(async tx => {
      let codigo = -1000000;
      const db = new Proxy(tx, { get(target, key) {
        if (key === "pedido") return new Proxy(target.pedido, { get(model, method) {
          if (method === "create") return args => model.create({ ...args, data: { ...args.data, codigo: codigo-- } });
          return model[method];
        } });
        return target[key];
      } });
      globalThis.__audit = { db, session: null };
      const users = {};
      for (const rol of ["ADMIN", "CAJERO", "MESERO", "COCINERO", "REPARTIDOR"]) users[rol] = await tx.usuario.create({ data: { nombre: "Prueba transitoria", rol } });
      const otherRider = await tx.usuario.create({ data: { nombre: "Otro repartidor de prueba", rol: "REPARTIDOR" } });
      const login = role => { globalThis.__audit.session = { user: { id: users[role].id, role } }; };
      const category = await tx.categoriaMenu.create({ data: { nombre: "Prueba transitoria" } });
      const product = await tx.platillo.create({ data: { nombre: "Producto de prueba", categoriaId: category.id, precio: 100 } });
      const ingredient = await tx.ingrediente.create({ data: { nombre: "Ingrediente de prueba", unidadMedida: "unidad", stockActual: 10 } });
      await tx.recetaIngrediente.create({ data: { platilloId: product.id, ingredienteId: ingredient.id, cantidad: 1 } });
      for (const [role, route, allowed] of [["ADMIN", "/admin/configuracion", true], ["CAJERO", "/caja", true], ["MESERO", "/pos", true], ["MESERO", "/caja", false], ["COCINERO", "/cocina", true], ["COCINERO", "/pos", false], ["REPARTIDOR", "/delivery", true], ["REPARTIDOR", "/cocina", false], ["MESERO", "/ruta-no-declarada", false]]) check(`Ruta ${role} ${route}`, actions.canAccessRoute(role, route) === allowed);
      login("MESERO");
      globalThis.__audit.session.user.role = "ADMIN";
      const created = await actions.crearOActualizarPedidoPOSAction({ tipo: "MOSTRADOR", usuarioId: users.ADMIN.id, items: [{ platilloId: product.id, cantidad: 1 }] });
      check("Creacion POS", created.success);
      const pedidoId = created.data.pedidoId;
      const order = await tx.pedido.findUnique({ where: { id: pedidoId }, include: { detalles: true } });
      check("Responsable mesero no suplantado", order.usuarioId === users.MESERO.id);
      check("Mesero no opera cocina", !(await actions.marcarPedidoListoAction(pedidoId)).success);
      login("COCINERO");
      check("Rechazo de entrega prematura", !(await actions.entregarPedidoAction(pedidoId)).success);
      check("Preparar producto", (await actions.actualizarItemCocinaAction(order.detalles[0].id, "PREPARANDO")).success);
      check("Marcar listo", (await actions.marcarPedidoListoAction(pedidoId)).success);
      check("Servir", (await actions.entregarPedidoAction(pedidoId)).success);
      check("Servir no cobra", (await tx.pedido.findUnique({ where: { id: pedidoId } })).estado === "LISTO");
      check("No reabrir producto servido", !(await actions.actualizarItemCocinaAction(order.detalles[0].id, "PREPARANDO")).success);
      login("CAJERO");
      check("Abrir turno", (await actions.abrirTurnoAction({ saldoInicial: 0 })).success);
      const total = Number((await tx.pedido.findUnique({ where: { id: pedidoId } })).total);
      check("Cobro con caja", (await actions.registrarPagoAction({ pedidoId, propina: 0, pagos: [{ metodoPago: "EFECTIVO", monto: total }] })).success);
      check("Cobro completo", (await tx.pedido.findUnique({ where: { id: pedidoId } })).estado === "COMPLETADO");
      check("Inventario descontado una vez", Number((await tx.ingrediente.findUnique({ where: { id: ingredient.id } })).stockActual) === 9);
      check("Rechazo doble cobro", !(await actions.registrarPagoAction({ pedidoId, propina: 0, pagos: [{ metodoPago: "EFECTIVO", monto: total }] })).success);
      check("Cerrar turno", (await actions.cerrarTurnoAction({ montoReal: total, ciego: false })).success);
      login("COCINERO");
      check("Cocina no reabre cuenta cobrada", !(await actions.marcarPedidoListoAction(pedidoId)).success);
      const solicitud = { solicitudId: randomUUID(), modalidad: "DELIVERY", nombre: "Prueba transitoria", telefono: "0000000", direccion: "Direccion de prueba", items: [{ platilloId: product.id, cantidad: 1 }] };
      const first = await actions.crearPedidoPublicoAction(solicitud);
      const retry = await actions.crearPedidoPublicoAction(solicitud);
      check("QR recupera el mismo pedido", first.success && retry.success && first.data.codigo === retry.data.codigo);
      check("QR no duplica registros", await tx.pedido.count({ where: { tokenSeguimiento: solicitud.solicitudId } }) === 1);
      const delivery = await tx.direccionDelivery.findFirst({ where: { pedido: { tokenSeguimiento: solicitud.solicitudId } } });
      login("CAJERO");
      check("Asignar y despachar", (await actions.actualizarDeliveryAction(delivery.id, "ENVIADO", users.REPARTIDOR.id)).success);
      globalThis.__audit.session = { user: { id: otherRider.id, role: "REPARTIDOR" } };
      check("Repartidor ajeno denegado", !(await actions.actualizarDeliveryAction(delivery.id, "ENTREGADO")).success);
      login("REPARTIDOR");
      check("Reasignacion por repartidor denegada", !(await actions.actualizarDeliveryAction(delivery.id, "ENVIADO", otherRider.id)).success);
      check("Confirmar entrega propia", (await actions.actualizarDeliveryAction(delivery.id, "ENTREGADO")).success);
      const deliveredOrder = await tx.pedido.findUnique({ where: { id: delivery.pedidoId }, include: { pagos: true } });
      check("Entrega sin pago sigue cobrable", deliveredOrder.estado !== "COMPLETADO" && deliveredOrder.pagos.length === 0);
      await tx.usuario.update({ where: { id: users.REPARTIDOR.id }, data: { activo: false } });
      check("Sesion de usuario desactivado denegada", !(await actions.actualizarDeliveryAction(delivery.id, "ENTREGADO")).success);
      login("ADMIN");
      const email = `${randomUUID()}@audit.test`;
      let freePin;
      const { createHmac } = require("node:crypto");
      const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
      for (let n = 8000; n < 9000; n++) {
        const value = String(n);
        const hash = `hmac:${createHmac("sha256", secret).update(`employee-pin:${value}`).digest("hex")}`;
        if (!await tx.usuario.findFirst({ where: { pin: { in: [value, hash] } } })) { freePin = value; break; }
      }
      const employeeInput = { nombre: "Prueba de empleado", email, pin: freePin, rol: "MESERO", activo: true };
      check("Crear empleado con PIN protegido", (await actions.createEmpleadoAction(employeeInput)).success);
      const employee = await tx.usuario.findUnique({ where: { email } });
      check("PIN no se almacena en claro", employee.pin.startsWith("hmac:"));
      const listed = (await actions.getEmpleadosAction()).find(e => e.id === employee.id);
      check("Listado de empleados no revela PIN ni hash", listed.pin === "Configurado");
      check("Editar empleado sin cambiar PIN", (await actions.updateEmpleadoAction(employee.id, { ...employeeInput, pin: "" })).success);
      check("PIN anterior se conserva", (await tx.usuario.findUnique({ where: { id: employee.id } })).pin === employee.pin);
      check("PIN duplicado denegado", !(await actions.createEmpleadoAction({ ...employeeInput, email: `${randomUUID()}@audit.test` })).success);
      check("Administrador puede quitar PIN", (await actions.updateEmpleadoAction(employee.id, { ...employeeInput, pin: "", quitarPin: true })).success);
      check("PIN retirado", (await tx.usuario.findUnique({ where: { id: employee.id } })).pin === null);
      throw new Error("ROLLBACK_TEST");
    }, { timeout: 30000 });
  } catch (error) {
    if (error.message !== "ROLLBACK_TEST") throw error;
  }
  assert.deepEqual(await counts(), before, "Todos los registros de prueba deben revertirse");
  console.log(`${passed.length} verificaciones aprobadas; transaccion revertida y conteos conservados.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
