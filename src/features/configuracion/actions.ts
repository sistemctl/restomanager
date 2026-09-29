"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuthRoles } from "@/lib/auth-helpers";
import { Rol } from "@prisma/client";
import { configuracionSchema, ConfiguracionFormData } from "@/schemas/configuracion.schema";
import { ActionResult } from "@/features/empleados/actions";

export async function getConfiguracionAction() {
  await requireAuthRoles([Rol.ADMIN]);

  let config = await prisma.configuracion.findFirst();

  if (!config) {
    config = await prisma.configuracion.create({
      data: {
        marcaSistema: "RestoManager",
        subtituloSistema: "POS SYSTEM",
        nombreRestaurante: "RestoManager",
        moneda: "COP",
        simboloMoneda: "$",
        porcentajeImpuesto: 19.0,
        aplicarImpuesto: true,
        impuestoIncluido: true,
        propinaSugerida: 10.0,
        habilitarPropina: true,
        mensajeTicket: "¡Gracias por su visita!",
      },
    });
  }

  return {
    ...config,
    porcentajeImpuesto: Number(config.porcentajeImpuesto),
    aplicarImpuesto: Boolean(config.aplicarImpuesto),
    impuestoIncluido: Boolean(config.impuestoIncluido),
    propinaSugerida: Number(config.propinaSugerida),
    habilitarPropina: Boolean(config.habilitarPropina),
  };
}

export async function updateConfiguracionAction(
  data: ConfiguracionFormData
): Promise<ActionResult> {
  try {
    await requireAuthRoles([Rol.ADMIN]);

    const parsed = configuracionSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Datos de configuración inválidos",
      };
    }

    const validData = parsed.data;

    const existing = await prisma.configuracion.findFirst();

      if (existing) {
        await prisma.configuracion.update({
          where: { id: existing.id },
          data: {
            marcaSistema: validData.marcaSistema,
            subtituloSistema: validData.subtituloSistema,
            nombreRestaurante: validData.nombreRestaurante,
            razonSocial: validData.razonSocial || null,
            identificacionTributaria: validData.identificacionTributaria || null,
            telefono: validData.telefono || null,
            email: validData.email || null,
            direccion: validData.direccion || null,
            ciudad: validData.ciudad || null,
            moneda: validData.moneda,
            simboloMoneda: validData.simboloMoneda,
            porcentajeImpuesto: validData.porcentajeImpuesto,
            aplicarImpuesto: validData.aplicarImpuesto,
            impuestoIncluido: validData.impuestoIncluido,
            propinaSugerida: validData.propinaSugerida,
            habilitarPropina: validData.habilitarPropina,
            mensajeTicket: validData.mensajeTicket || null,
            kdsAlertaAmarillaMinutos: validData.kdsAlertaAmarillaMinutos,
            kdsAlertaRojaMinutos: validData.kdsAlertaRojaMinutos,
          },
        });
      } else {
        await prisma.configuracion.create({
          data: {
            marcaSistema: validData.marcaSistema,
            subtituloSistema: validData.subtituloSistema,
            nombreRestaurante: validData.nombreRestaurante,
            razonSocial: validData.razonSocial || null,
            identificacionTributaria: validData.identificacionTributaria || null,
            telefono: validData.telefono || null,
            email: validData.email || null,
            direccion: validData.direccion || null,
            ciudad: validData.ciudad || null,
            moneda: validData.moneda,
            simboloMoneda: validData.simboloMoneda,
            porcentajeImpuesto: validData.porcentajeImpuesto,
            aplicarImpuesto: validData.aplicarImpuesto,
            impuestoIncluido: validData.impuestoIncluido,
            propinaSugerida: validData.propinaSugerida,
            habilitarPropina: validData.habilitarPropina,
            mensajeTicket: validData.mensajeTicket || null,
            kdsAlertaAmarillaMinutos: validData.kdsAlertaAmarillaMinutos,
            kdsAlertaRojaMinutos: validData.kdsAlertaRojaMinutos,
          },
        });
      }

    revalidatePath("/admin/configuracion");
    revalidatePath("/admin", "layout");
    revalidatePath("/pos");
    revalidatePath("/cocina");
    revalidatePath("/delivery");
    revalidatePath("/caja");
    revalidatePath("/carta");
    revalidatePath("/cocina");
    revalidatePath("/caja");
    revalidatePath("/delivery");
    revalidatePath("/pos");
    revalidatePath("/ticket/[pedidoId]", "page");
    revalidatePath("/precuenta/[pedidoId]", "page");
    return { success: true, message: "Configuración guardada exitosamente." };
  } catch (error: unknown) {
    const err = error as Error;
    return {
      success: false,
      error: err.message || "Error al actualizar la configuración.",
    };
  }
}
