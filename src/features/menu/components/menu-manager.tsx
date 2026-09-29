"use client";

import React, { useState, useTransition } from "react";
import {
  UtensilsCrossed,
  Plus,
  Search,
  Star,
  Layers,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  createCategoriaMenuAction,
  createPlatilloAction,
  updatePlatilloAction,
  deletePlatilloAction,
  toggleFavoritoPlatilloAction,
  toggleDisponiblePlatilloAction,
  createGrupoModificadorAction,
  deleteGrupoModificadorAction,
  createOpcionModificadorAction,
  deleteOpcionModificadorAction,
} from "@/features/menu/actions";
import { PlatilloFormData } from "@/schemas/menu.schema";

interface MenuManagerProps {
  initialCategorias: any[];
  initialPlatillos: any[];
  simboloMoneda: string;
}

export function MenuManager({
  initialCategorias,
  initialPlatillos,
  simboloMoneda,
}: MenuManagerProps) {
  const [selectedCategoriaId, setSelectedCategoriaId] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Modals
  const [isPlatilloModalOpen, setIsPlatilloModalOpen] = useState(false);
  const [editingPlatillo, setEditingPlatillo] = useState<any | null>(null);
  const [isCategoriaModalOpen, setIsCategoriaModalOpen] = useState(false);
  const [selectedPlatilloForModifiers, setSelectedPlatilloForModifiers] = useState<any | null>(null);

  // Forms
  const [platilloForm, setPlatilloForm] = useState<PlatilloFormData>({
    nombre: "",
    descripcion: "",
    precio: 0,
    costo: 0,
    categoriaId: initialCategorias[0]?.id || "",
    disponible: true,
    favorito: false,
    orden: 0,
  });

  const [categoriaForm, setCategoriaForm] = useState({
    nombre: "",
    icono: "",
    orden: 0,
  });

  const [nuevoGrupoForm, setNuevoGrupoForm] = useState({
    nombre: "",
    requerido: false,
    minimo: 0,
    maximo: 1,
  });

  const [nuevaOpcionForm, setNuevaOpcionForm] = useState<{ [grupoId: string]: { nombre: string; precioExtra: number } }>({});

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleOpenCreatePlatillo = () => {
    setEditingPlatillo(null);
    setPlatilloForm({
      nombre: "",
      descripcion: "",
      precio: 0,
      costo: 0,
      categoriaId: selectedCategoriaId !== "ALL" ? selectedCategoriaId : initialCategorias[0]?.id || "",
      disponible: true,
      favorito: false,
      orden: 0,
    });
    setIsPlatilloModalOpen(true);
  };

  const handleOpenEditPlatillo = (platillo: any) => {
    setEditingPlatillo(platillo);
    setPlatilloForm({
      nombre: platillo.nombre,
      descripcion: platillo.descripcion || "",
      precio: platillo.precio,
      costo: platillo.costo,
      categoriaId: platillo.categoriaId,
      disponible: platillo.disponible,
      favorito: platillo.favorito,
      orden: platillo.orden,
    });
    setIsPlatilloModalOpen(true);
  };

  const handleSavePlatillo = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      let res;
      if (editingPlatillo) {
        res = await updatePlatilloAction(editingPlatillo.id, platilloForm);
      } else {
        res = await createPlatilloAction(platilloForm);
      }

      if (!res.success) {
        setError(res.error || "Error al guardar platillo");
      } else {
        setSuccess(res.message || "Platillo guardado exitosamente");
        setIsPlatilloModalOpen(false);
        setTimeout(() => setSuccess(null), 3000);
      }
    });
  };

  const handleDeletePlatillo = (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar el platillo "${nombre}"?`)) return;

    startTransition(async () => {
      const res = await deletePlatilloAction(id);
      if (!res.success) {
        setError(res.error || "Error al eliminar platillo");
      } else {
        setSuccess("Platillo eliminado correctamente");
        setTimeout(() => setSuccess(null), 3000);
      }
    });
  };

  const handleToggleFavorito = (id: string) => {
    startTransition(async () => {
      await toggleFavoritoPlatilloAction(id);
    });
  };

  const handleToggleDisponible = (id: string) => {
    startTransition(async () => {
      await toggleDisponiblePlatilloAction(id);
    });
  };

  const handleSaveCategoria = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await createCategoriaMenuAction({
        ...categoriaForm,
        activa: true,
      });
      if (!res.success) {
        setError(res.error || "Error al crear categoría");
      } else {
        setSuccess("Categoría creada exitosamente");
        setIsCategoriaModalOpen(false);
        setCategoriaForm({ nombre: "", icono: "", orden: 0 });
        setTimeout(() => setSuccess(null), 3000);
      }
    });
  };

  const handleAddGrupoModificador = (platilloId: string) => {
    if (!nuevoGrupoForm.nombre.trim()) return;

    startTransition(async () => {
      const res = await createGrupoModificadorAction({
        platilloId,
        nombre: nuevoGrupoForm.nombre,
        requerido: nuevoGrupoForm.requerido,
        minimo: nuevoGrupoForm.minimo,
        maximo: nuevoGrupoForm.maximo,
      });

      if (res.success) {
        setNuevoGrupoForm({ nombre: "", requerido: false, minimo: 0, maximo: 1 });
      }
    });
  };

  const handleDeleteGrupo = (grupoId: string) => {
    startTransition(async () => {
      await deleteGrupoModificadorAction(grupoId);
    });
  };

  const handleAddOpcion = (grupoId: string) => {
    const data = nuevaOpcionForm[grupoId];
    if (!data || !data.nombre.trim()) return;

    startTransition(async () => {
      const res = await createOpcionModificadorAction({
        grupoId,
        nombre: data.nombre,
        precioExtra: data.precioExtra || 0,
      });

      if (res.success) {
        setNuevaOpcionForm((prev) => ({
          ...prev,
          [grupoId]: { nombre: "", precioExtra: 0 },
        }));
      }
    });
  };

  const handleDeleteOpcion = (opcionId: string) => {
    startTransition(async () => {
      await deleteOpcionModificadorAction(opcionId);
    });
  };

  // Filtrado de Platillos
  const filteredPlatillos = initialPlatillos.filter((p) => {
    const matchesCategory =
      selectedCategoriaId === "ALL" || p.categoriaId === selectedCategoriaId;
    const matchesSearch =
      p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.descripcion && p.descripcion.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFavorite = !onlyFavorites || p.favorito;
    return matchesCategory && matchesSearch && matchesFavorite;
  });

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <UtensilsCrossed className="w-7 h-7 text-[#E63946]" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Catálogo de Menú & Platillos
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Administra los platillos de tu carta, precios, categorías y modificadores de cocina.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => setIsCategoriaModalOpen(true)}
            className="text-xs"
          >
            <Layers className="w-4 h-4 mr-1.5 text-slate-600" />
            <span>Nueva Categoría</span>
          </Button>

          <Button onClick={handleOpenCreatePlatillo} className="text-xs">
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Nuevo Platillo</span>
          </Button>
        </div>
      </div>

      {/* Categories Bar & Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => {
              setSelectedCategoriaId("ALL");
              setOnlyFavorites(false);
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
              selectedCategoriaId === "ALL" && !onlyFavorites
                ? "bg-[#E63946] text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            Todos ({initialPlatillos.length})
          </button>

          <button
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
              onlyFavorites
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${onlyFavorites ? "fill-white" : "text-amber-500"}`} />
            <span>Favoritos POS</span>
          </button>

          {initialCategorias.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategoriaId(cat.id);
                setOnlyFavorites(false);
              }}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
                selectedCategoriaId === cat.id && !onlyFavorites
                  ? "bg-[#E63946] text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {cat.nombre} ({cat._count?.platillos ?? 0})
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar platillo por nombre o ingrediente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#E63946]/40 focus:border-[#E63946]"
          />
        </div>
      </div>

      {/* Grid of Dishes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlatillos.map((platillo) => (
          <div
            key={platillo.id}
            className={`bg-white rounded-2xl border transition-all p-5 flex flex-col justify-between shadow-2xs hover:shadow-xs ${
              !platillo.disponible
                ? "opacity-60 border-slate-200 bg-slate-50/50"
                : "border-slate-200/90"
            }`}
          >
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {platillo.nombre}
                    </h3>
                    <Badge variant={platillo.disponible ? "success" : "danger"}>
                      {platillo.disponible ? "Disponible" : "Agotado"}
                    </Badge>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400 block mt-0.5">
                    {platillo.categoria?.nombre}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleFavorito(platillo.id)}
                  title={platillo.favorito ? "Quitar de favoritos" : "Marcar favorito"}
                  className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Star
                    className={`w-5 h-5 transition-colors ${
                      platillo.favorito
                        ? "text-amber-500 fill-amber-500"
                        : "text-slate-300 hover:text-amber-400"
                    }`}
                  />
                </button>
              </div>

              {platillo.descripcion && (
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {platillo.descripcion}
                </p>
              )}

              {/* Modifiers Pill Info */}
              {platillo.gruposModificador?.length > 0 && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-100/80 px-2.5 py-1 rounded-lg w-fit">
                  <Sliders className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    {platillo.gruposModificador.length} grupo(s) modificador(es)
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Info and Actions */}
            <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium block">Precio</span>
                <span className="text-base font-extrabold text-slate-900">
                  {simboloMoneda} {platillo.precio.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  title="Modificadores de cocina"
                  onClick={() => setSelectedPlatilloForModifiers(platillo)}
                  className="h-8 w-8 text-slate-500 hover:text-[#E63946] hover:bg-rose-50"
                >
                  <Sliders className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  title="Editar platillo"
                  onClick={() => handleOpenEditPlatillo(platillo)}
                  className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                >
                  <Edit className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  title="Cambiar disponibilidad"
                  onClick={() => handleToggleDisponible(platillo.id)}
                  className={`h-8 w-8 ${
                    platillo.disponible
                      ? "text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                      : "text-emerald-600 hover:bg-emerald-50"
                  }`}
                >
                  {platillo.disponible ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  title="Eliminar platillo"
                  onClick={() => handleDeletePlatillo(platillo.id, platillo.nombre)}
                  className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPlatillos.length === 0 && (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80">
          <UtensilsCrossed className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">No se encontraron platillos</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Prueba ajustando los filtros o registra un nuevo platillo con el botón superior.
          </p>
        </div>
      )}

      {/* MODAL CREAR / EDITAR PLATILLO */}
      <Modal
        isOpen={isPlatilloModalOpen}
        onClose={() => setIsPlatilloModalOpen(false)}
        title={editingPlatillo ? "Editar Platillo" : "Nuevo Platillo"}
        description="Ingresa los detalles comerciales y operativos del platillo."
      >
        <form onSubmit={handleSavePlatillo} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre del Platillo *
            </label>
            <input
              type="text"
              required
              value={platilloForm.nombre}
              onChange={(e) =>
                setPlatilloForm((prev) => ({ ...prev, nombre: e.target.value }))
              }
              placeholder="Ej: Hamburguesa Angus Especial"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E63946]/40 focus:border-[#E63946]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descripción / Ingredientes principales
            </label>
            <textarea
              rows={2}
              value={platilloForm.descripcion || ""}
              onChange={(e) =>
                setPlatilloForm((prev) => ({ ...prev, descripcion: e.target.value }))
              }
              placeholder="Ej: 200g de carne, queso cheddar, cebolla crispy y salsa especial"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E63946]/40 focus:border-[#E63946]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Precio de Venta ({simboloMoneda}) *
              </label>
              <input
                type="number"
                step="100"
                min="0"
                required
                value={platilloForm.precio}
                onChange={(e) =>
                  setPlatilloForm((prev) => ({ ...prev, precio: Number(e.target.value) }))
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E63946]/40 focus:border-[#E63946]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Costo Estimado ({simboloMoneda})
              </label>
              <input
                type="number"
                step="100"
                min="0"
                value={platilloForm.costo}
                onChange={(e) =>
                  setPlatilloForm((prev) => ({ ...prev, costo: Number(e.target.value) }))
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E63946]/40 focus:border-[#E63946]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Categoría del Menú *
            </label>
            <select
              value={platilloForm.categoriaId}
              onChange={(e) =>
                setPlatilloForm((prev) => ({ ...prev, categoriaId: e.target.value }))
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#E63946]/40 focus:border-[#E63946]"
            >
              {initialCategorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={platilloForm.disponible}
                onChange={(e) =>
                  setPlatilloForm((prev) => ({ ...prev, disponible: e.target.checked }))
                }
                className="rounded border-slate-300 text-[#E63946] focus:ring-[#E63946]"
              />
              <span className="text-xs font-semibold text-slate-700">Disponible para la venta</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={platilloForm.favorito}
                onChange={(e) =>
                  setPlatilloForm((prev) => ({ ...prev, favorito: e.target.checked }))
                }
                className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-xs font-semibold text-slate-700">Favorito en POS</span>
            </label>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPlatilloModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {editingPlatillo ? "Actualizar Platillo" : "Crear Platillo"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL CREAR CATEGORÍA */}
      <Modal
        isOpen={isCategoriaModalOpen}
        onClose={() => setIsCategoriaModalOpen(false)}
        title="Nueva Categoría de Menú"
        description="Crea secciones como Entradas, Pizzas, Bebidas o Postres."
      >
        <form onSubmit={handleSaveCategoria} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre de la Categoría *
            </label>
            <input
              type="text"
              required
              value={categoriaForm.nombre}
              onChange={(e) =>
                setCategoriaForm((prev) => ({ ...prev, nombre: e.target.value }))
              }
              placeholder="Ej: Cócteles de Autor"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E63946]/40 focus:border-[#E63946]"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCategoriaModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              Crear Categoría
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL GESTIONAR MODIFICADORES DEL PLATILLO */}
      {selectedPlatilloForModifiers && (
        <Modal
          isOpen={!!selectedPlatilloForModifiers}
          onClose={() => setSelectedPlatilloForModifiers(null)}
          title={`Modificadores de ${selectedPlatilloForModifiers.nombre}`}
          description="Configura opciones como término de carne, salsas, o adiciones con costo extra."
          maxWidth="lg"
        >
          <div className="space-y-6">
            {/* Lista de Grupos Existentes */}
            <div className="space-y-4">
              {selectedPlatilloForModifiers.gruposModificador?.map((grupo: any) => (
                <div
                  key={grupo.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800">
                        {grupo.nombre}
                      </span>
                      {grupo.requerido ? (
                        <Badge variant="danger" className="ml-2">Obligatorio</Badge>
                      ) : (
                        <Badge variant="outline" className="ml-2">Opcional</Badge>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteGrupo(grupo.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Opciones del Grupo */}
                  <div className="space-y-1.5 pl-2 border-l-2 border-slate-200">
                    {grupo.opciones?.map((op: any) => (
                      <div
                        key={op.id}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-white border border-slate-200/60"
                      >
                        <span className="text-slate-700">{op.nombre}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">
                            {op.precioExtra > 0
                              ? `+${simboloMoneda} ${op.precioExtra.toLocaleString()}`
                              : "Sin costo"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteOpcion(op.id)}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Agregar Opción al Grupo */}
                    <div className="flex items-center gap-2 pt-1.5">
                      <input
                        type="text"
                        placeholder="Nueva opción (Ej: Salsa BBQ)"
                        value={nuevaOpcionForm[grupo.id]?.nombre || ""}
                        onChange={(e) =>
                          setNuevaOpcionForm((prev) => ({
                            ...prev,
                            [grupo.id]: {
                              nombre: e.target.value,
                              precioExtra: prev[grupo.id]?.precioExtra || 0,
                            },
                          }))
                        }
                        className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-300 bg-white"
                      />
                      <input
                        type="number"
                        placeholder="Precio Extra"
                        min="0"
                        step="100"
                        value={nuevaOpcionForm[grupo.id]?.precioExtra || ""}
                        onChange={(e) =>
                          setNuevaOpcionForm((prev) => ({
                            ...prev,
                            [grupo.id]: {
                              nombre: prev[grupo.id]?.nombre || "",
                              precioExtra: Number(e.target.value),
                            },
                          }))
                        }
                        className="w-24 px-2 py-1 text-xs rounded-lg border border-slate-300 bg-white"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAddOpcion(grupo.id)}
                        className="text-xs h-7 px-2.5"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {(!selectedPlatilloForModifiers.gruposModificador ||
                selectedPlatilloForModifiers.gruposModificador.length === 0) && (
                <p className="text-xs text-slate-400 italic">
                  Este platillo no tiene grupos de modificadores configurados.
                </p>
              )}
            </div>

            {/* Crear Nuevo Grupo */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
              <h4 className="text-xs font-bold text-slate-800">
                Añadir Grupo Modificador a este Platillo
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Nombre del Grupo (Ej: Término, Salsa, Tamaño)"
                  value={nuevoGrupoForm.nombre}
                  onChange={(e) =>
                    setNuevoGrupoForm((prev) => ({ ...prev, nombre: e.target.value }))
                  }
                  className="px-3 py-1.5 text-xs rounded-xl border border-slate-300"
                />
                <label className="flex items-center gap-2 px-1">
                  <input
                    type="checkbox"
                    checked={nuevoGrupoForm.requerido}
                    onChange={(e) =>
                      setNuevoGrupoForm((prev) => ({ ...prev, requerido: e.target.checked }))
                    }
                    className="rounded text-[#E63946]"
                  />
                  <span className="text-xs text-slate-700">Obligatorio elegir opción</span>
                </label>
              </div>
              <Button
                type="button"
                onClick={() => handleAddGrupoModificador(selectedPlatilloForModifiers.id)}
                className="text-xs w-full"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span>Crear Grupo Modificador</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
