import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ItemCarritoPublico = { platilloId: string; nombre: string; precio: number; cantidad: number };
type CarritoState = {
  items: ItemCarritoPublico[];
  solicitudId: string | null;
  prepararSolicitud: () => string;
  agregar: (item: Omit<ItemCarritoPublico, "cantidad">) => void;
  cambiar: (platilloId: string, cantidad: number) => void;
  limpiar: () => void;
};

export const useCarritoPublico = create<CarritoState>()(persist((set, get) => ({
  items: [],
  solicitudId: null,
  prepararSolicitud: () => {
    const previous = get().solicitudId;
    if (previous) return previous;
    // randomUUID requiere HTTPS; getRandomValues tambien funciona en la red local HTTP.
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
    const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    set({ solicitudId: id });
    return id;
  },
  agregar: (item) => set((state) => ({ items: state.items.some((i) => i.platilloId === item.platilloId) ? state.items.map((i) => i.platilloId === item.platilloId ? { ...i, cantidad: i.cantidad + 1 } : i) : [...state.items, { ...item, cantidad: 1 }] })),
  cambiar: (platilloId, cantidad) => set((state) => ({ items: cantidad <= 0 ? state.items.filter((i) => i.platilloId !== platilloId) : state.items.map((i) => i.platilloId === platilloId ? { ...i, cantidad } : i) })),
  limpiar: () => set({ items: [], solicitudId: null }),
}), { name: "restomanager-carrito-publico" }));
