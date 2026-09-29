# 🍽️ RestoManager — Sistema de Gestión para Restaurante

<p align="center">
  <strong>Software POS integral para restaurantes, bares y cafeterías</strong><br/>
  Inspirado en <a href="https://fu.do">Fudo</a> — Construido con Next.js, TypeScript y PostgreSQL
</p>

---

## ✨ Características

### 🏪 Punto de Venta (POS)
- Terminal de ventas rápida con búsqueda y favoritos
- Ventas por **mesa**, **mostrador** (take away) y **delivery**
- **Ventas por comensal** — cuentas individuales en la misma mesa
- Modificadores y adicionales de productos (término de carne, extras, tamaños)
- Descuentos fijos y porcentuales (globales y por cliente)
- Cierre parcial de ventas

### 🪑 Gestión de Mesas
- Mapa visual de salas y mesas con estados por color
- Traslado de consumos entre mesas
- Reservaciones con calendario
- Mapa de calor (mesas más rentables)
- Asignación de mesero por mesa

### 👨‍🍳 Cocina (KDS - Kitchen Display System)
- Pantalla fullscreen en tiempo real (Server-Sent Events)
- Tickets con timer de urgencia (verde/amarillo/rojo)
- Filtro por estación (cocina caliente, fría, bar, postres)
- Alertas sonoras para nuevos pedidos
- Notificación al mesero cuando la orden está lista
- Wake Lock para pantalla siempre encendida

### 💰 Caja y Facturación
- Arqueo de caja (normal + **arqueo ciego** para mayor seguridad)
- Múltiples cajas simultáneas e independientes
- Turnos de trabajo
- Movimientos de caja (ingresos/egresos no vinculados a ventas)
- Múltiples medios de pago en una misma venta
- Control de propinas
- Generación de precuenta y factura/ticket (PDF + impresión térmica)

### 📦 Inventario
- Control de stock con descuento automático por receta
- Recetas/fichas técnicas (ingredientes por platillo)
- Control de mermas y desperdicios
- Conteo de inventario (stock físico vs sistema)
- Alertas de stock bajo
- Prohibir venta sin disponibilidad
- Historial de movimientos

### 👥 Clientes y Proveedores
- Base de datos de clientes con historial de consumo
- Cuentas corrientes (crédito/débito)
- Descuentos automáticos por cliente
- Gestión de proveedores con categorías
- Cuentas corrientes de proveedores

### 💸 Gastos
- Registro de gastos con categorías
- Control de vencimientos
- Vinculación con proveedores
- Estado de resultados (ingresos vs gastos)

### 📱 Carta QR y Tienda Online
- Menú digital accesible por código QR (sin app)
- Pedidos desde el celular del cliente
- Tienda online para delivery/take away sin comisiones
- Sincronización en tiempo real de precios y disponibilidad

### 🛵 Delivery
- Gestión completa de pedidos a domicilio
- Asignación de repartidores
- Tracking de estados (pendiente → en camino → entregado)
- Tiempo estimado de entrega

### 📊 Reportes y Estadísticas
- Ventas por día, hora, canal y medio de pago
- Ranking de productos (más vendidos, mayor margen)
- Mapa de calor de mesas
- Reportes de stock, compras y gastos
- Estado de resultados financiero
- Exportación a Excel

### 👤 Empleados y Seguridad
- Sistema de roles (Admin, Cajero, Mesero, Cocinero, Repartidor)
- Permisos granulares por rol
- Login por email/password (admin) + PIN rápido de 4 dígitos (personal)
- Zero-Trust: verificación de permisos en cada Server Action

### 📲 Mobile-First y PWA
- Diseño responsive mobile-first
- Instalable como app (PWA)
- Soporte offline (carrito POS en IndexedDB)
- Touch-friendly para tablets en cocina

---

## 🛠️ Stack Tecnológico

| Tecnología | Uso |
|-----------|-----|
| [Next.js 15](https://nextjs.org) | Framework full-stack (App Router) |
| [TypeScript](https://typescriptlang.org) | Lenguaje principal |
| [PostgreSQL](https://postgresql.org) | Base de datos relacional |
| [Prisma](https://prisma.io) | ORM type-safe |
| [NextAuth.js v5](https://authjs.dev) | Autenticación y roles |
| [Tailwind CSS](https://tailwindcss.com) | Estilos utility-first |
| [shadcn/ui](https://ui.shadcn.com) | Componentes UI |
| [Zustand](https://zustand-demo.pmnd.rs) | Estado global |
| [Zod](https://zod.dev) | Validación de datos |
| [Recharts](https://recharts.org) | Gráficas y reportes |
| [@react-pdf/renderer](https://react-pdf.org) | Generación de PDF |
| [UploadThing](https://uploadthing.com) | Subida de imágenes |
| [@serwist/next](https://serwist.pages.dev) | PWA / Service Worker |

---

## 🚀 Inicio Rápido

### Requisitos Previos

- [Node.js](https://nodejs.org) 18+
- [PostgreSQL](https://postgresql.org) 14+
- [Git](https://git-scm.com) 2.x

### Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/restomanager.git
cd restomanager

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus datos de PostgreSQL

# 4. Crear base de datos y ejecutar migraciones
npx prisma migrate dev --name init

# 5. Cargar datos iniciales
npx prisma db seed

# 6. Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en el equipo servidor y, dentro de la misma red local, usando `http://IP-DEL-SERVIDOR:3000`. El script de desarrollo escucha en `0.0.0.0`; configure `NEXTAUTH_URL` con la IP LAN actual del servidor y permita el puerto TCP 3000 en el firewall.

### Credenciales por Defecto (Seed)

| Rol | Email | Contraseña | PIN |
|-----|-------|------------|-----|
| Admin | admin@restomanager.com | admin123 | 0000 |
| Cajero | cajero@restomanager.com | cajero123 | 1111 |
| Mesero | mesero@restomanager.com | mesero123 | 2222 |
| Cocinero | cocinero@restomanager.com | cocinero123 | 3333 |
| Repartidor | repartidor@restomanager.com | repartidor123 | 4444 |

---

## 📁 Estructura del Proyecto

```
src/
├── app/           # Routing y layouts (Next.js App Router)
├── components/    # Componentes compartidos (UI, layout)
├── features/      # Módulos de dominio (lógica de negocio)
│   ├── auth/      # Autenticación
│   ├── pos/       # Punto de venta
│   ├── cocina/    # Kitchen Display System
│   ├── mesas/     # Gestión de mesas
│   ├── menu/      # Menú y platillos
│   ├── inventario/# Control de stock
│   ├── caja/      # Arqueo y turnos
│   ├── facturacion/# Pagos y facturas
│   ├── clientes/  # Gestión de clientes
│   ├── proveedores/# Gestión de proveedores
│   ├── gastos/    # Control de gastos
│   ├── delivery/  # Delivery y repartidores
│   ├── carta-qr/  # Menú digital QR
│   ├── empleados/ # Gestión de personal
│   └── reportes/  # Reportes y estadísticas
├── lib/           # Utilidades (prisma, auth, event-bus)
├── schemas/       # Validación con Zod
├── stores/        # Estado global (Zustand)
└── types/         # Definiciones de tipos
```

---

## 🗺️ Roadmap

- [x] Fase 1 — Fundación (Auth, Layout, DB, Empleados)
- [ ] Fase 2 — Menú + Mesas + POS
- [x] Fase 3 — Cocina KDS + Caja + Facturación
- [x] Fase 4 — Inventario + Recetas + Mermas
- [x] Fase 5 — Clientes + Proveedores + Gastos
- [x] Fase 6 — Carta QR + Delivery + Reportes + PWA

---

## 📄 Licencia

Este proyecto es privado y de uso interno.

---

<p align="center">
  Hecho con ❤️ y ☕ — Inspirado en <a href="https://fu.do">Fudo POS</a>
</p>

