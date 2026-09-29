import React from "react";
import { getEmpleadosAction } from "@/features/empleados/actions";
import { EmpleadosClient } from "@/features/empleados/components/empleados-client";

export default async function EmpleadosPage() {
  const empleados = await getEmpleadosAction();

  return <EmpleadosClient initialEmpleados={empleados} />;
}
