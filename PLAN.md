# 🍽️ Plan de Implementación — RestoManager
### Software de Gestión para Restaurante | Referencia: Fudo POS

---

## 📋 Resumen Ejecutivo

Sistema POS integral para restaurantes, inspirado en **Fudo** (fu.do), construido con **Next.js 15 + TypeScript + PostgreSQL + Prisma**. Cubre la operación completa del restaurante en **6 fases de implementación progresivas**.

---

## 🏗️ Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15 (App Router) + TypeScript 5.x |
| Base de Datos | PostgreSQL 16 + Prisma 6 |
| Autenticación | NextAuth.js v5 — JWT + PIN rápido |
| UI | Tailwind CSS 4 + shadcn/ui |
| Estado | Zustand (persist para offline) |
| Tiempo Real | Server-Sent Events (SSE) |
| Validación | Zod |
| Gráficas | shadcn/ui Charts (Recharts) |
| PDF | @react-pdf/renderer |
| Imágenes | UploadThing |
| PWA | @serwist/next |

---

## 📦 Módulos del Sistema

### Funcionalidades Core (inspiradas en Fudo)

| # | Módulo | Descripción |
|---|--------|-------------|
| 1 | **POS Terminal** | Ventas por mesa, mostrador y delivery. Favoritos, modificadores, descuentos |
| 2 | **Gestión de Mesas** | Mapa de salas, estados por color, traslado, mapa de calor, reservaciones |
| 3 | **Ventas por Comensal** | Cuentas individuales en la misma mesa, facturación separada |
| 4 | **Cocina KDS** | Pantalla tiempo real (SSE), timer urgencia, alertas sonoras, notificación al mesero |
| 5 | **Caja y Arqueo** | Arqueo normal + ciego, múltiples cajas, turnos, movimientos no vinculados |
| 6 | **Facturación** | Múltiples medios de pago, cierre parcial, propinas, precuenta, PDF/ticket |
| 7 | **Menú/Carta** | Categorías, subcategorías, modificadores, productos favoritos, imágenes |
| 8 | **Inventario** | Stock automático por receta, mermas, conteo físico, alertas, prohibir sin stock |
| 9 | **Clientes** | Base de datos, cuentas corrientes, descuentos automáticos, historial |
| 10 | **Proveedores** | Base de datos, categorías, cuentas corrientes |
| 11 | **Gastos** | Registro con categorías, vencimientos, estado de resultados |
| 12 | **Carta QR** | Menú digital público, pedido desde celular, QR por mesa |
| 13 | **Delivery** | Gestión completa, repartidores, tracking de estados |
| 14 | **Reportes** | Ventas, ranking productos, heatmap mesas, stock, gastos, exportar Excel |
| 15 | **Empleados** | Roles, permisos, PIN de autorización |

---

## 🗄️ Modelo de Base de Datos

### Tablas Principales (20+)

```
PERSONAS                  OPERACIÓN                 PRODUCTOS/INVENTARIO
─────────────             ─────────────             ────────────────────
• Usuario                 • Sala                    • CategoriaMenu
• Cliente                 • Mesa                    • SubcategoriaMenu
• Proveedor               • Reservacion             • Platillo
• Descuento               • Pedido                  • GrupoModificador
• MovCuentaCorriente      • DetallePedido           • OpcionModificador
                          • ModificadorDetalle      • Ingrediente
CAJA/FINANZAS             • Pago                    • RecetaIngrediente
─────────────             • DireccionDelivery       • MovimientoInventario
• Turno
• ArqueoCaja
• MovimientoCaja
• CategoriaGasto
• Gasto
```

### Enums del Sistema

```
Rol: ADMIN | CAJERO | MESERO | COCINERO | REPARTIDOR
EstadoMesa: DISPONIBLE | OCUPADA | RESERVADA | SUCIA | MANTENIMIENTO
TipoPedido: EN_MESA | MOSTRADOR | DELIVERY
EstadoPedido: ABIERTO | PENDIENTE | EN_PREPARACION | LISTO | COMPLETADO | CANCELADO
EstadoPago: SIN_PAGAR | PARCIAL | PAGADO | REEMBOLSADO
EstadoItem: EN_COLA | PREPARANDO | LISTO | SERVIDO
MetodoPago: EFECTIVO | TARJETA_CREDITO | TARJETA_DEBITO | TRANSFERENCIA | CUENTA_CORRIENTE
EstadoDelivery: PENDIENTE | EN_PREPARACION | ENVIADO | ENTREGADO | CANCELADO
```

---

## 🔐 Sistema de Roles y Permisos

| Área | Admin | Cajero | Mesero | Cocinero | Repartidor |
|------|:-----:|:------:|:------:|:--------:|:----------:|
| Dashboard / KPIs | ✅ | ✅ | ❌ | ❌ | ❌ |
| Gestionar empleados | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gestionar menú | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gestionar mesas/salas | ✅ | ✅ | ❌ | ❌ | ❌ |
| Tomar pedidos (POS) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Pantalla cocina (KDS) | ✅ | ❌ | ❌ | ✅ | ❌ |
| Facturar / cobrar | ✅ | ✅ | ❌ | ❌ | ❌ |
| Arqueo de caja | ✅ | ✅ | ❌ | ❌ | ❌ |
| Gestionar clientes | ✅ | ✅ | ❌ | ❌ | ❌ |
| Gestionar proveedores | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gestionar gastos | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gestionar inventario | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver reportes | ✅ | ✅ | ❌ | ❌ | ❌ |
| Gestionar delivery | ✅ | ✅ | ❌ | ❌ | ✅ |
| Aplicar descuentos | ✅ | ✅ | ❌ | ❌ | ❌ |
| Configuración sistema | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 📐 Arquitectura

### Estructura Feature-Driven

```
src/app/           → SOLO routing y layouts
src/features/      → Módulos de dominio (lógica de negocio)
  ├── [módulo]/
  │   ├── components/  → Componentes React del módulo
  │   ├── hooks/       → Custom hooks del módulo
  │   └── actions.ts   → Server Actions (mutaciones)
src/components/    → Componentes compartidos
src/lib/           → Utilidades globales
src/schemas/       → Validación Zod
src/stores/        → Estado Zustand
```

### Patrones Clave
- **Server Actions** para mutaciones (no API routes)
- **SSE (Server-Sent Events)** para cocina en tiempo real
- **Zero-Trust**: cada Server Action verifica permisos
- **Decimal** para dinero (nunca Float)
- **Transacciones atómicas** para inventario (prisma.$transaction)
- **Mobile-first**: diseñar para móvil, escalar a desktop

### Autenticación Dual
1. **Email + Password** → Admin y gestión
2. **PIN 4 dígitos** → Cambio rápido entre meseros en tablet/POS

---

## 🗓️ Fases de Implementación

### Fase 1 — Fundación (Semana 1-2)
- [x] Inicializar Next.js 15 + TypeScript + Tailwind + shadcn/ui
- [x] Configurar Prisma + PostgreSQL + migraciones
- [x] NextAuth v5 con email/password + PIN
- [x] Layout responsive: sidebar colapsable + bottom nav móvil
- [x] Middleware de protección por roles
- [x] CRUD de empleados (usuarios, roles, PIN)
- [x] Página de configuración del sistema
- [x] Seed de datos iniciales

### Fase 2 — Menú + Mesas + POS (Semana 3-4)
- [x] CRUD de categorías, subcategorías y platillos
- [x] Modificadores y adicionales de productos
- [x] Productos favoritos
- [x] Gestión de salas (PRINCIPAL, TERRAZA, BAR, VIP)
- [x] Grid visual de mesas con estados por color
- [x] Reservaciones con calendario
- [x] Terminal POS: pedido → mesa/mostrador → platillos → modificadores
- [x] Ventas por comensal (cuentas individuales por mesa)
- [x] Asignación de mesero

### Fase 3 — Cocina + Caja + Facturación (Semana 5-6)
- [x] KDS fullscreen con SSE en tiempo real
- [x] Timer de urgencia (verde/amarillo/rojo)
- [x] Filtro por estación + alertas sonoras
- [x] Notificación al mesero cuando orden está lista
- [x] Wake Lock para pantalla cocina
- [x] Arqueo de caja (normal + ciego)
- [x] Múltiples cajas + turnos
- [x] Movimientos de caja
- [x] Pagos: múltiples medios + cierre parcial
- [x] Descuentos + propinas
- [x] Precuenta imprimible
- [x] Factura PDF + ticket térmico
- [x] Traslado de consumos entre mesas

### Fase 4 — Inventario (Semana 7-8)
- [x] CRUD de ingredientes con SKU y unidad
- [x] Recetas: ingredientes por platillo
- [x] Descuento automático de stock al completar pedido
- [x] Alertas de stock bajo
- [x] Prohibir venta sin stock
- [x] Control de mermas y desperdicios
- [x] Conteo de inventario (físico vs sistema)
- [x] Historial de movimientos
- [x] Actualización automática de costos

### Fase 5 — Clientes + Proveedores + Gastos (Semana 9-10)
- [x] Clientes: base de datos, cuentas corrientes, descuentos automáticos
- [x] Proveedores: base de datos, categorías, cuentas corrientes
- [x] Gastos: registro, categorías, vencimientos
- [x] Estado de resultados (ingresos vs gastos)
- [x] Importación masiva CSV/Excel

### Fase 6 — Carta QR + Delivery + Reportes + PWA (Semana 11-12)
- [x] Carta QR: menú digital público, pedido desde celular, QR por mesa
- [x] Tienda Online: delivery/take away sin comisiones
- [x] Delivery: gestión completa, repartidores, tracking
- [x] Reportes: ventas, ranking, heatmap mesas, stock, gastos
- [x] Exportación a Excel
- [x] PWA: Serwist, manifest, offline
- [x] Zustand persist para offline (carrito público)

---

## ✅ Plan de Verificación

### Tests Automatizados
```bash
npx prisma validate          # Schema válido
npx prisma migrate dev       # Migraciones
npx tsc --noEmit              # Type checking
npx next lint                 # Lint
npm run build                 # Build producción
```

### Verificación Manual por Fase

**Fase 1:** Login email + PIN | Roles redirigen correctamente | CRUD empleados  
**Fase 2:** Menú + modificadores | Mapa mesas | POS completo | Ventas por comensal  
**Fase 3:** KDS tiempo real + sonido + timer | Arqueo ciego | Cierre parcial | Descuentos  
**Fase 4:** Receta → venta → stock decrementado | Merma | Conteo inventario  
**Fase 5:** Cliente con descuento automático | Proveedor con cuenta corriente | Estado de resultados  
**Fase 6:** QR → menú → pedido → cocina | Delivery tracking | Reportes + Excel | PWA offline  

---

## 🎨 Diseño UI/UX (Referencia Fudo)

### Paleta de Colores
```
Primario:     #E63946 (Rojo restaurante)
Secundario:   #457B9D (Azul confianza)
Acento:       #F4A261 (Naranja cálido)
Fondo:        #F1FAEE (Crema suave)
Texto:        #1D3557 (Azul oscuro)
Éxito:        #2A9D8F (Verde teal)
```

### Estados de Mesa (Colores)
- 🟢 **Verde** — Disponible
- 🔴 **Rojo** — Ocupada (pedido activo)
- 🟡 **Ámbar** — Precuenta impresa (esperando pago)
- 🔵 **Azul** — Reservada
- ⚫ **Gris** — Mantenimiento / Sucia

### Layout POS (Dual-Pane — estilo Fudo)
```
┌──────────────────────────────┬──────────────────────┐
│  🔍 Buscar producto...       │  COMANDA #1042  Mesa 3│
│  [FAV] [Bebidas] [Hamburguesas] [Pizzas]             │
│  ┌─────────┐ ┌─────────┐    │  2x Hamburguesa  $7,200│
│  │ Cheese  │ │ BBQ     │    │    - Término: Medio    │
│  │ $3,100  │ │ $3,600  │    │  1x Cerveza IPA  $1,400│
│  └─────────┘ └─────────┘    │  1x Papas Fritas $1,800│
│  ┌─────────┐ ┌─────────┐    ├──────────────────────┤
│  │ Pizza N │ │ Pizza F │    │  Total:      $10,400  │
│  │ $4,200  │ │ $4,500  │    │  [ENVIAR COCINA]      │
│  └─────────┘ └─────────┘    │  [COBRAR]             │
└──────────────────────────────┴──────────────────────┘
```

### KDS Cocina (Ticket Cards)
```
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│ MESA 3       #1042  │ │ DELIVERY      #084  │ │ MESA 8       #1044  │
│ Mozo: Juan  ⏱ 04:12 │ │ Rappi     ⏱ 12:30  │ │ Mozo: Sofia ⏱ 22:45 │
│ [🟢 NORMAL]         │ │ [🟡 ATENCIÓN]       │ │ [🔴 DEMORADO]       │
│─────────────────────│ │─────────────────────│ │─────────────────────│
│ 2x Hamburguesa Bacon│ │ 1x Pizza Fugazza    │ │ 1x Ojo de Bife      │
│   - Término: Medio  │ │ 1x Empanada Carne   │ │   - Término: Jugoso  │
│ 1x Papas Rústicas   │ │                     │ │ 1x Salmón Grillé    │
│─────────────────────│ │─────────────────────│ │─────────────────────│
│ [MARCAR TODO LISTO] │ │ [MARCAR TODO LISTO] │ │ [MARCAR TODO LISTO] │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

---

## 📝 Notas

- **Moneda e impuesto**: Configurables en `/admin/configuracion`
- **Referencia principal**: [Fudo POS](https://fu.do) — líder en Latinoamérica
- **Offline-first**: Ventaja competitiva sobre Fudo (100% cloud-dependent)
