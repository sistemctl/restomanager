import { z } from "zod";

export const categoriaMenuSchema = z.object({
  nombre: z.string().min(2, "El nombre de la categoría debe tener al menos 2 caracteres"),
  icono: z.string().optional().or(z.literal("")),
  orden: z.coerce.number().default(0),
  activa: z.boolean().default(true),
});

export type CategoriaMenuFormData = z.infer<typeof categoriaMenuSchema>;

export const subcategoriaMenuSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  categoriaId: z.string().min(1, "Debe seleccionar una categoría"),
  orden: z.coerce.number().default(0),
  activa: z.boolean().default(true),
});

export type SubcategoriaMenuFormData = z.infer<typeof subcategoriaMenuSchema>;

export const platilloSchema = z.object({
  nombre: z.string().min(2, "El nombre del platillo debe tener al menos 2 caracteres"),
  descripcion: z.string().optional().or(z.literal("")),
  precio: z.coerce.number().min(0, "El precio no puede ser negativo"),
  costo: z.coerce.number().min(0, "El costo no puede ser negativo").default(0),
  categoriaId: z.string().min(1, "Debe seleccionar una categoría"),
  subcategoriaId: z.string().optional().or(z.literal("")),
  imagenUrl: z.string().optional().or(z.literal("")),
  disponible: z.boolean().default(true),
  favorito: z.boolean().default(false),
  orden: z.coerce.number().default(0),
});

export type PlatilloFormData = z.infer<typeof platilloSchema>;

export const grupoModificadorSchema = z.object({
  platilloId: z.string().min(1, "Debe especificar el platillo"),
  nombre: z.string().min(2, "El nombre del grupo debe tener al menos 2 caracteres"),
  requerido: z.boolean().default(false),
  minimo: z.coerce.number().min(0).default(0),
  maximo: z.coerce.number().min(1).default(1),
});

export type GrupoModificadorFormData = z.infer<typeof grupoModificadorSchema>;

export const opcionModificadorSchema = z.object({
  grupoId: z.string().min(1, "Debe especificar el grupo modificador"),
  nombre: z.string().min(1, "El nombre de la opción es requerido"),
  precioExtra: z.coerce.number().min(0, "El precio extra no puede ser negativo").default(0),
});

export type OpcionModificadorFormData = z.infer<typeof opcionModificadorSchema>;
