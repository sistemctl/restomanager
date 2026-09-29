# Verificacion de operacion

Ejecutar desde la raiz del proyecto con Node 24 y la base configurada en `.env`:

```text
node scripts/verify-operation.cjs
node scripts/verify-pin.cjs
node scripts/protect-existing-pins.cjs
npm run build
node scripts/verify-http.cjs
```

Las dos verificaciones ejecutan las Server Actions y el proveedor PIN reales,
con un contexto de autenticacion simulado y fixtures temporales dentro de una
transaccion PostgreSQL revertida. El contexto HTTP y `revalidatePath` se sustituyen
en memoria. Los pedidos usan codigos temporales negativos para no avanzar la
secuencia de comandas. Los scripts comprueban los conteos al terminar; no son
pruebas graficas del navegador ni del transporte de NextAuth.

`verify-http.cjs` usa el build de produccion en un servidor temporal (puerto
3002). Crea cinco cuentas temporales, verifica login real, sesiones, rutas por
rol, bloqueo PIN, desactivacion y cambios de rol. Elimina solo las cuentas que
creo y detiene su servidor al finalizar. El puerto debe estar libre.

`protect-existing-pins.cjs` convierte los PIN existentes a HMAC con el secreto
del servidor sin cambiar los numeros usados por los empleados. Es idempotente.
Mantener estable y respaldado `AUTH_SECRET` / `NEXTAUTH_SECRET`: si se rota, los
PIN protegidos necesitan restablecerse. No ejecutar el seed para esta conversion;
el seed restablece las credenciales de demostracion.

El limite de intentos PIN y de solicitudes QR es por proceso: 5 y 10 por origen
por minuto respectivamente. En despliegues con varias instancias o reinicios
frecuentes se necesita un almacen compartido para esos limites.

Un pedido servido conserva el estado LISTO y sale de KDS cuando todos sus
productos estan SERVIDO. Solo un cobro completo desde caja lo marca COMPLETADO
y descuenta inventario. Delivery confirma la entrega de forma independiente.
