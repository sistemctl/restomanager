import { z } from "zod";
import { EstadoMesa } from "@prisma/client";

export const salaSchema = z.object({
  nombre: z.string().min(2, "El nombre de la sala debe tener al menos 2 caracteres"),
  orden: z.coerce.number().default(0),
  activa: z.boolean().default(true),
});

export type SalaFormData = z.infer<typeof salaSchema>;

export const mesaSchema = z.object({
  numero: z.string().min(1, "El número o identificador de mesa es requerido"),
  capacidad: z.coerce.number().min(1, "La capacidad mínima es de 1 persona").max(50, "Máximo 50 personas"),
  salaId: z.string().min(1, "Debe seleccionar una sala"),
  estado: z.nativeEnum(EstadoMesa).default(EstadoMesa.DISPONIBLE),
  posX: z.coerce.number().default(0),
  posY: z.coerce.number().default(0),
});

export type MesaFormData = z.infer<typeof mesaSchema>;

export const reservacionSchema = z.object({
  nombreCliente: z.string().min(2, "El nombre del cliente debe tener al menos 2 caracteres"),
  telefono: z.string().min(6, "Teléfono de contacto requerido"),
  mesaId: z.string().min(1, "Debe seleccionar una mesa"),
  personas: z.coerce.number().min(1, "Mínimo 1 persona"),
  fechaHora: z.string().min(1, "Fecha y hora requerida"),
  notas: z.string().optional().or(z.literal("")),
  confirmada: z.boolean().default(true),
});

export type ReservacionFormData = z.infer<typeof reservacionSchema>;
