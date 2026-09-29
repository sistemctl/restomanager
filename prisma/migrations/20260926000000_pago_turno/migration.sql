-- Vincula cada pago con el turno de caja que lo recibió.
ALTER TABLE "pagos" ADD COLUMN "turnoId" TEXT;
ALTER TABLE "pagos" ADD COLUMN "comensal" INTEGER;
ALTER TABLE "configuracion" ADD COLUMN "prohibirVentaSinStock" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "pedidos" ADD COLUMN "inventarioDescontadoAt" TIMESTAMP(3);
ALTER TABLE "movimientos_inventario" ADD COLUMN "stockAntes" DECIMAL(10,3) NOT NULL DEFAULT 0;
ALTER TABLE "movimientos_inventario" ADD COLUMN "stockDespues" DECIMAL(10,3) NOT NULL DEFAULT 0;
ALTER TABLE "movimientos_inventario" ADD COLUMN "pedidoId" TEXT;
ALTER TABLE "gastos" ADD COLUMN "proveedorId" TEXT;
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "pagos_turnoId_createdAt_idx" ON "pagos"("turnoId", "createdAt");
CREATE INDEX "pagos_pedidoId_comensal_idx" ON "pagos"("pedidoId", "comensal");

ALTER TABLE "pagos"
ADD CONSTRAINT "pagos_turnoId_fkey"
FOREIGN KEY ("turnoId") REFERENCES "turnos"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
