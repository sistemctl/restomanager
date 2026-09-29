# CLAUDE.md — Contexto del Proyecto

## Descripción

Sistema integral de gestión para restaurante (POS) inspirado en **Fudo** (fu.do). Aplicación web responsive mobile-first para la operación completa de un restaurante: mesas, pedidos, cocina en tiempo real, facturación, arqueo de caja, inventario, clientes, proveedores, gastos, delivery, carta QR y reportes.

## Stack Tecnológico

- **Framework:** Next.js 15 (App Router) + TypeScript 5.x
- **Base de Datos:** PostgreSQL 16 + Prisma 6 (ORM)
- **Autenticación:** NextAuth.js v5 (Auth.js) — JWT + PIN rápido
- **UI:** Tailwind CSS 4 + shadcn/ui
- **Estado:** Zustand (con persist para offline)
- **Tiempo Real:** Server-Sent Events (SSE) — cocina KDS
- **Validación:** Zod
- **Gráficas:** shadcn/ui Charts (Recharts)
- **PDF:** @react-pdf/renderer
- **Imágenes:** UploadThing
- **PWA:** @serwist/next
- **QR:** qrcode.react
- **Excel:** xlsx (SheetJS)

## Arquitectura

```
src/
├── app/           → SOLO routing y layouts (Next.js App Router)
│   ├── (auth)/    → Login, PIN
│   ├── (admin)/   → Panel administrativo
│   ├── (pos)/     → Terminal punto de venta
│   ├── (cocina)/  → Kitchen Display System
│   ├── (mesero)/  → App móvil del mesero
│   ├── (public)/  → Carta QR + Tienda Online (sin auth)
│   └── api/       → Route Handlers + SSE streams
├── components/    → Componentes compartidos (ui/, layout/)
├── features/      → 🔥 Módulos de dominio (lógica de negocio)
│   ├── auth/      → Login, PIN, switch user
│   ├── pos/       → Carrito, pedidos, modificadores
│   ├── cocina/    → KDS tickets, timers, bump actions
│   ├── mesas/     → Floor plan, estados, traslado
│   ├── menu/      → CRUD platillos, categorías, modificadores
│   ├── inventario/→ Stock, recetas, mermas, conteo
│   ├── caja/      → Arqueo (normal + ciego), turnos, movimientos
│   ├── facturacion/→ Pagos, descuentos, cierre parcial, PDF
│   ├── clientes/  → Base datos, cuentas corrientes, descuentos
│   ├── proveedores/→ Base datos, cuentas corrientes
│   ├── gastos/    → Registro, categorías, vencimientos
│   ├── delivery/  → Tracking, repartidores, tienda online
│   ├── carta-qr/  → Menú digital público, QR por mesa
│   ├── empleados/ → CRUD usuarios, roles, PIN
│   └── reportes/  → Ventas, ranking, heatmap, estado resultados
├── lib/           → Utilidades globales (prisma, auth, event-bus)
├── schemas/       → Zod validation schemas
├── stores/        → Zustand stores
├── types/         → TypeScript type definitions
└── middleware.ts  → Protección de rutas por rol
```

## Convenciones de Código

### Nomenclatura
- **Archivos:** kebab-case (`menu-item-form.tsx`, `use-cart.ts`)
- **Componentes:** PascalCase (`MenuItemForm`, `TicketCard`)
- **Funciones/variables:** camelCase (`createOrder`, `totalAmount`)
- **Constantes:** UPPER_SNAKE_CASE (`TAX_RATE`, `MAX_TABLES`)
- **Tablas DB:** snake_case plural español (`platillos`, `detalles_pedido`)
- **Enums Prisma:** PascalCase (`EstadoPedido`, `TipoPedido`)
- **Valores enum:** UPPER_SNAKE_CASE (`EN_MESA`, `COCINA_CALIENTE`)

### Patrones
- **Server Actions** para mutaciones (no API routes)
- **API Route Handlers** solo para SSE streams y webhooks externos
- **Zod** para validación en cliente y servidor
- `Decimal` (nunca `Float`) para dinero y cantidades de inventario
- `prisma.$transaction()` para operaciones atómicas (ej: deducir stock al vender)
- **Zero-Trust**: cada Server Action verifica permisos con `requireAuthRoles()`

### Componentes
- Usar shadcn/ui como base (`npx shadcn@latest add [componente]`)
- Componentes en `features/[módulo]/components/` para lógica de dominio
- Componentes compartidos en `components/ui/` y `components/layout/`
- Mobile-first: diseñar para móvil primero, escalar a desktop

### Base de Datos
- IDs tipo `cuid()` (no auto-increment para entidades principales)
- Siempre agregar `createdAt` y `updatedAt`
- Índices en campos filtrados frecuentemente (`estado`, `createdAt`)
- `@db.Decimal(10, 2)` para dinero, `@db.Decimal(10, 3)` para pesos/volúmenes

## Roles del Sistema

| Rol | Acceso |
|-----|--------|
| `ADMIN` | Acceso total al sistema |
| `CAJERO` | POS, caja, facturación, clientes, reportes |
| `MESERO` | Tomar pedidos, ver mesas, recibir notificaciones |
| `COCINERO` | Pantalla de cocina (KDS) |
| `REPARTIDOR` | Delivery, tracking de pedidos |

## Comandos Frecuentes

```bash
npm run dev              # Servidor de desarrollo
npm run build            # Build de producción
npx prisma migrate dev   # Crear/aplicar migraciones
npx prisma db seed       # Ejecutar seed
npx prisma studio        # GUI de base de datos
npx prisma validate      # Validar schema
npx tsc --noEmit         # Type checking
```

## Variables de Entorno (.env)

```
DATABASE_URL="postgresql://usuario:password@localhost:5432/restaurante"
NEXTAUTH_SECRET="tu-secret-aqui"
NEXTAUTH_URL="http://localhost:3000"
UPLOADTHING_TOKEN="tu-token"
```

## Referencia de Diseño

- **Inspirado en:** Fudo POS (fu.do) — líder POS gastronómico en Latinoamérica
- **Paleta:** Rojo restaurante (#E63946), Azul (#457B9D), Naranja (#F4A261), Crema (#F1FAEE)
- **UI Pattern:** Dual-pane POS (productos izquierda, comanda derecha)
- **Mesas:** Colores semáforo (verde=libre, rojo=ocupada, ámbar=precuenta)
- **KDS:** Tickets con timer (verde <10min, amarillo 10-20min, rojo >20min)
