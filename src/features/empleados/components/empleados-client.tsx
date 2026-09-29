"use client";

import React, { useState, useTransition } from "react";
import { Rol } from "@prisma/client";
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  KeyRound,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  createEmpleadoAction,
  updateEmpleadoAction,
  toggleEmpleadoStatusAction,
  deleteEmpleadoAction,
} from "@/features/empleados/actions";
import { EmpleadoFormData } from "@/schemas/empleado.schema";

interface EmpleadoItem {
  id: string;
  nombre: string;
  email: string | null;
  pin: string | null;
  rol: Rol;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    pedidos: number;
    turnos: number;
  };
}

interface EmpleadosClientProps {
  initialEmpleados: EmpleadoItem[];
}

export function EmpleadosClient({ initialEmpleados }: EmpleadosClientProps) {
  const [empleados, setEmpleados] = useState<EmpleadoItem[]>(initialEmpleados);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("TODOS");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmpleado, setEditingEmpleado] = useState<EmpleadoItem | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<EmpleadoFormData>({
    nombre: "",
    email: "",
    password: "",
    pin: "",
    rol: Rol.MESERO,
    activo: true,
  });

  const [isPending, startTransition] = useTransition();

  // Reset and Open Modal for Create
  const handleOpenCreate = () => {
    setEditingEmpleado(null);
    setFormData({
      nombre: "",
      email: "",
      password: "",
      pin: "",
      rol: Rol.MESERO,
      activo: true,
    });
    setModalError(null);
    setModalSuccess(null);
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (emp: EmpleadoItem) => {
    setEditingEmpleado(emp);
    setFormData({
      nombre: emp.nombre,
      email: emp.email || "",
      password: "", // Dejar vacío salvo que desee cambiarla
      pin: "",
      rol: emp.rol,
      activo: emp.activo,
    });
    setModalError(null);
    setModalSuccess(null);
    setIsModalOpen(true);
  };

  // Handle Form Submit
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setModalSuccess(null);

    startTransition(async () => {
      if (editingEmpleado) {
        // Update
        const res = await updateEmpleadoAction(editingEmpleado.id, formData);
        if (!res.success) {
          setModalError(res.error || "Error al actualizar empleado");
        } else {
          setModalSuccess("Empleado actualizado correctamente");
          // Actualizar estado local
          setEmpleados((prev) =>
            prev.map((e) =>
              e.id === editingEmpleado.id
                ? {
                    ...e,
                    nombre: formData.nombre,
                    email: formData.email || null,
                    pin: formData.quitarPin ? null : formData.pin ? "Configurado" : e.pin,
                    rol: formData.rol,
                    activo: formData.activo,
                  }
                : e
            )
          );
          setTimeout(() => setIsModalOpen(false), 800);
        }
      } else {
        // Create
        const res = await createEmpleadoAction(formData);
        if (!res.success) {
          setModalError(res.error || "Error al registrar empleado");
        } else {
          setModalSuccess("Empleado registrado exitosamente");
          // Para refrescar la lista completa con IDs nuevos
          window.location.reload();
        }
      }
    });
  };

  // Toggle Active Status
  const handleToggleStatus = (id: string) => {
    startTransition(async () => {
      const res = await toggleEmpleadoStatusAction(id);
      if (res.success) {
        setEmpleados((prev) =>
          prev.map((e) => (e.id === id ? { ...e, activo: !e.activo } : e))
        );
      } else {
        alert(res.error || "No se pudo cambiar el estado");
      }
    });
  };

  // Delete
  const handleDelete = (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar o retirar a "${nombre}"?`)) {
      return;
    }

    startTransition(async () => {
      const res = await deleteEmpleadoAction(id);
      if (res.success) {
        alert(res.message || "Operación realizada");
        setEmpleados((prev) => prev.filter((e) => e.id !== id));
      } else {
        alert(res.error || "No se pudo eliminar");
      }
    });
  };


  // Filtered employees
  const filteredEmpleados = empleados.filter((emp) => {
    const matchesSearch =
      emp.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole =
      selectedRole === "TODOS" || emp.rol === selectedRole;

    return matchesSearch && matchesRole;
  });

  const getRoleBadgeVariant = (role: Rol) => {
    switch (role) {
      case Rol.ADMIN:
        return "danger";
      case Rol.CAJERO:
        return "warning";
      case Rol.MESERO:
        return "info";
      case Rol.COCINERO:
        return "success";
      case Rol.REPARTIDOR:
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-[#E63946]" />
            <span>Gestión de Personal & Empleados</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Administra los roles del personal, accesos por contraseña y códigos PIN rápidos para comandas y POS.
          </p>
        </div>

        <Button onClick={handleOpenCreate} variant="primary" className="shadow-xs">
          <UserPlus className="w-4 h-4 mr-1.5" />
          <span>Nuevo Empleado</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o correo electrónico..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E63946]/40 focus:border-[#E63946]"
          />
        </div>

        {/* Role Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            "TODOS",
            Rol.ADMIN,
            Rol.CAJERO,
            Rol.MESERO,
            Rol.COCINERO,
            Rol.REPARTIDOR,
          ].map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setSelectedRole(role)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
                selectedRole === role
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {role === "TODOS" ? "Todos los Roles" : role}
            </button>
          ))}
        </div>
      </div>

      {/* Employees Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 sm:px-6">Empleado</th>
                <th className="py-3.5 px-4">Rol del Sistema</th>
                <th className="py-3.5 px-4">PIN Rápido</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4">Historial</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredEmpleados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No se encontraron empleados con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredEmpleados.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {/* User Profile */}
                    <td className="py-4 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                          {emp.nombre.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">
                            {emp.nombre}
                          </div>
                          <div className="text-slate-400 text-[11px]">
                            {emp.email || "Sin correo asignado (acceso solo PIN)"}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-4 px-4">
                      <Badge variant={getRoleBadgeVariant(emp.rol)}>
                        {emp.rol}
                      </Badge>
                    </td>

                    {/* PIN */}
                    <td className="py-4 px-4">
                      {emp.pin ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded-md text-xs border border-slate-200">
                            Configurado
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">
                          Sin PIN
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(emp.id)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 transition-transform active:scale-95"
                        title="Click para cambiar estado"
                      >
                        {emp.activo ? (
                          <Badge variant="success">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Activo</span>
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="w-3 h-3 text-slate-400" />
                            <span>Inactivo</span>
                          </Badge>
                        )}
                      </button>
                    </td>

                    {/* Activity */}
                    <td className="py-4 px-4 text-slate-500 text-[11px]">
                      {emp._count.pedidos} pedidos · {emp._count.turnos} turnos
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 sm:px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(emp)}
                          className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1" />
                          <span>Editar</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(emp.id, emp.nombre)}
                          className="h-8 px-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          title="Eliminar o retirar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEmpleado ? "Editar Empleado" : "Registrar Nuevo Empleado"}
        description={
          editingEmpleado
            ? `Modifica los datos y permisos de ${editingEmpleado.nombre}`
            : "Agrega un nuevo miembro del equipo al restaurante"
        }
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {modalError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          {modalSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{modalSuccess}</span>
            </div>
          )}

          {/* Nombre */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre Completo *
            </label>
            <input
              type="text"
              required
              value={formData.nombre}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, nombre: e.target.value }))
              }
              placeholder="Ej: Sofia Herrera"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E63946]/40 focus:border-[#E63946]"
            />
          </div>

          {/* Rol del Sistema */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Rol del Sistema *
            </label>
            <select
              value={formData.rol}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  rol: e.target.value as Rol,
                }))
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E63946]/40 focus:border-[#E63946] bg-white"
            >
              <option value={Rol.ADMIN}>ADMIN (Acceso Total + Configuración)</option>
              <option value={Rol.CAJERO}>CAJERO (POS + Cierre de Caja + Clientes)</option>
              <option value={Rol.MESERO}>MESERO (Toma de Pedidos + Mesas)</option>
              <option value={Rol.COCINERO}>COCINERO (Pantalla KDS)</option>
              <option value={Rol.REPARTIDOR}>REPARTIDOR (Delivery)</option>
            </select>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Correo Electrónico (Opcional si usa solo PIN)
            </label>
            <input
              type="email"
              value={formData.email || ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="ejemplo@restomanager.com"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E63946]/40 focus:border-[#E63946]"
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {editingEmpleado
                ? "Nueva Contraseña (dejar en blanco para mantener la actual)"
                : "Contraseña de Acceso (mínimo 6 caracteres)"}
            </label>
            <input
              type="password"
              value={formData.password || ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, password: e.target.value }))
              }
              placeholder="••••••••"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E63946]/40 focus:border-[#E63946]"
            />
          </div>

          {/* PIN rápido */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              PIN Rápido (Exactamente 4 dígitos numéricos)
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                inputMode="numeric"
                disabled={formData.quitarPin}
                maxLength={4}
                value={formData.pin || ""}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setFormData((prev) => ({ ...prev, pin: val }));
                }}
                placeholder={editingEmpleado ? "Nuevo PIN (opcional)" : "Ej: 7890"}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E63946]/40 focus:border-[#E63946] font-mono tracking-widest"
              />
            </div>
            {editingEmpleado && <label className="mt-2 flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={formData.quitarPin ?? false} onChange={event => setFormData(previous => ({ ...previous, quitarPin: event.target.checked, pin: "" }))} />Quitar acceso por PIN</label>}
            <p className="text-[10px] text-slate-400 mt-1">
              Permite a los meseros y cajeros identificarse instantáneamente en la tablet.
            </p>
          </div>

          {/* Activo / Inactivo */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="activo-check"
              checked={formData.activo}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, activo: e.target.checked }))
              }
              className="w-4 h-4 rounded text-[#E63946] focus:ring-[#E63946]"
            />
            <label
              htmlFor="activo-check"
              className="text-xs font-medium text-slate-700 cursor-pointer select-none"
            >
              Empleado habilitado y activo en el sistema
            </label>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isPending}
            >
              {editingEmpleado ? "Guardar Cambios" : "Crear Empleado"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
