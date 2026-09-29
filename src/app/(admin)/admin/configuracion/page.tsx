import React from "react";
import { getConfiguracionAction } from "@/features/configuracion/actions";
import { ConfiguracionForm } from "@/features/configuracion/components/configuracion-form";

export default async function ConfiguracionPage() {
  const config = await getConfiguracionAction();

  return <ConfiguracionForm initialConfig={config} />;
}
