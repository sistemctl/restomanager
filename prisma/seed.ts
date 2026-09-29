import { PrismaClient, Rol } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHmac } from "node:crypto";

const prisma = new PrismaClient();

async function main() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("Falta el secreto de autenticacion");
  const protectPin = (pin: string) => `hmac:${createHmac("sha256", secret).update(`employee-pin:${pin}`).digest("hex")}`;
  console.log("🌱 Iniciando seed de RestoManager...");

  // 1. Configuración del Restaurante
  const existingConfig = await prisma.configuracion.findFirst();
  if (!existingConfig) {
    await prisma.configuracion.create({
      data: {
        nombreRestaurante: "RestoManager Gourmet",
        razonSocial: "Gastronomía Inteligente S.A.S.",
        identificacionTributaria: "901.845.221-4",
        telefono: "+57 (601) 555-0199",
        email: "contacto@restomanager.com",
        direccion: "Calle 93 # 12-45, Parque de la 93",
        ciudad: "Bogotá",
        moneda: "COP",
        simboloMoneda: "$",
        porcentajeImpuesto: 19.0,
        propinaSugerida: 10.0,
        mensajeTicket: "¡Gracias por preferir RestoManager Gourmet! Vuelva pronto.",
        kdsAlertaAmarillaMinutos: 10,
        kdsAlertaRojaMinutos: 20,
      },
    });
    console.log("✅ Configuración inicial creada");
  }

  // 2. Usuarios del sistema
  const adminPassword = await bcrypt.hash("Admin123!", 10);
  const cajeroPassword = await bcrypt.hash("Cajero123!", 10);
  const meseroPassword = await bcrypt.hash("Mesero123!", 10);
  const cocinaPassword = await bcrypt.hash("Cocina123!", 10);
  const deliveryPassword = await bcrypt.hash("Delivery123!", 10);

  const usuariosData = [
    {
      nombre: "Administrador General",
      email: "admin@restomanager.com",
      passwordHash: adminPassword,
      pin: protectPin("1111"),
      rol: Rol.ADMIN,
      activo: true,
    },
    {
      nombre: "Carlos Martínez (Caja)",
      email: "cajero@restomanager.com",
      passwordHash: cajeroPassword,
      pin: protectPin("2222"),
      rol: Rol.CAJERO,
      activo: true,
    },
    {
      nombre: "Ana Gómez (Piso)",
      email: "mesero@restomanager.com",
      passwordHash: meseroPassword,
      pin: protectPin("3333"),
      rol: Rol.MESERO,
      activo: true,
    },
    {
      nombre: "Chef Mario Rossi",
      email: "cocina@restomanager.com",
      passwordHash: cocinaPassword,
      pin: protectPin("4444"),
      rol: Rol.COCINERO,
      activo: true,
    },
    {
      nombre: "David Ríos (Envíos)",
      email: "delivery@restomanager.com",
      passwordHash: deliveryPassword,
      pin: protectPin("5555"),
      rol: Rol.REPARTIDOR,
      activo: true,
    },
  ];

  for (const user of usuariosData) {
    await prisma.usuario.upsert({
      where: { email: user.email },
      update: {
        nombre: user.nombre,
        passwordHash: user.passwordHash,
        pin: user.pin,
        rol: user.rol,
        activo: user.activo,
      },
      create: user,
    });
  }
  console.log("✅ Usuarios iniciales creados (Admin, Cajero, Mesero, Cocinero, Repartidor)");

  // 3. Salas y Mesas
  const salasData = [
    {
      nombre: "Salón Principal",
      orden: 1,
      mesas: [
        { numero: "1", capacidad: 4, posX: 50, posY: 50 },
        { numero: "2", capacidad: 4, posX: 150, posY: 50 },
        { numero: "3", capacidad: 2, posX: 250, posY: 50 },
        { numero: "4", capacidad: 6, posX: 50, posY: 180 },
        { numero: "5", capacidad: 4, posX: 180, posY: 180 },
      ],
    },
    {
      nombre: "Terraza",
      orden: 2,
      mesas: [
        { numero: "T1", capacidad: 4, posX: 50, posY: 50 },
        { numero: "T2", capacidad: 4, posX: 160, posY: 50 },
        { numero: "T3", capacidad: 6, posX: 270, posY: 50 },
      ],
    },
    {
      nombre: "Bar & Lounge",
      orden: 3,
      mesas: [
        { numero: "B1", capacidad: 2, posX: 50, posY: 50 },
        { numero: "B2", capacidad: 2, posX: 120, posY: 50 },
        { numero: "B3", capacidad: 4, posX: 200, posY: 50 },
      ],
    },
  ];

  for (const s of salasData) {
    let sala = await prisma.sala.findFirst({ where: { nombre: s.nombre } });
    if (!sala) {
      sala = await prisma.sala.create({
        data: {
          nombre: s.nombre,
          orden: s.orden,
        },
      });
    }

    for (const m of s.mesas) {
      await prisma.mesa.upsert({
        where: {
          salaId_numero: {
            salaId: sala.id,
            numero: m.numero,
          },
        },
        update: {
          capacidad: m.capacidad,
          posX: m.posX,
          posY: m.posY,
        },
        create: {
          salaId: sala.id,
          numero: m.numero,
          capacidad: m.capacidad,
          posX: m.posX,
          posY: m.posY,
        },
      });
    }
  }
  console.log("✅ Salas y mesas iniciales creadas");

  // 4. Categorías de Gasto iniciales
  const categoriasGasto = [
    "Materia Prima & Ingredientes",
    "Servicios Públicos",
    "Nómina y Salarios",
    "Mantenimiento y Reparaciones",
    "Marketing y Publicidad",
    "Otros Gastos Operativos",
  ];

  for (const nombre of categoriasGasto) {
    await prisma.categoriaGasto.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }
  console.log("✅ Categorías de gasto creadas");

  // 5. Catálogo de Menú, Platillos y Modificadores
  const menuData = [
    {
      categoria: "Hamburguesas & Sandwiches",
      orden: 1,
      icono: "Burger",
      platillos: [
        {
          nombre: "Hamburguesa Bacon Cheddar",
          descripcion: "200g de carne angus, queso cheddar fundido, tocineta crujiente y cebolla caramelizada.",
          precio: 28900,
          costo: 12000,
          favorito: true,
          grupos: [
            {
              nombre: "Término de la carne",
              requerido: true,
              opciones: [
                { nombre: "Término Medio", precioExtra: 0 },
                { nombre: "Tres Cuartos (3/4)", precioExtra: 0 },
                { nombre: "Bien Asada", precioExtra: 0 },
              ],
            },
            {
              nombre: "Adicionales",
              requerido: false,
              opciones: [
                { nombre: "Extra Queso Cheddar", precioExtra: 4500 },
                { nombre: "Extra Tocineta Ahumada", precioExtra: 5500 },
                { nombre: "Huevo Frito", precioExtra: 3000 },
              ],
            },
          ],
        },
        {
          nombre: "Hamburguesa Clásica Artesanal",
          descripcion: "Carne de res seleccionada, lechuga romana, tomate fresco, queso gouda y salsa de la casa.",
          precio: 24500,
          costo: 9500,
          favorito: true,
          grupos: [
            {
              nombre: "Término de la carne",
              requerido: true,
              opciones: [
                { nombre: "Término Medio", precioExtra: 0 },
                { nombre: "Tres Cuartos", precioExtra: 0 },
                { nombre: "Bien Cocida", precioExtra: 0 },
              ],
            },
          ],
        },
        {
          nombre: "Sandwich Pulled Pork BBQ",
          descripcion: "Bondiola de cerdo desmechada cocida a baja temperatura por 8h con salsa BBQ bourbon.",
          precio: 26000,
          costo: 10500,
          favorito: false,
          grupos: [],
        },
      ],
    },
    {
      categoria: "Pizzas Artesanales",
      orden: 2,
      icono: "Pizza",
      platillos: [
        {
          nombre: "Pizza Margherita Especial",
          descripcion: "Masa madre, salsa pomodoro italiana, mozzarella di bufala y albahaca fresca.",
          precio: 36000,
          costo: 13000,
          favorito: true,
          grupos: [
            {
              nombre: "Masa",
              requerido: true,
              opciones: [
                { nombre: "Masa Tradicional", precioExtra: 0 },
                { nombre: "Borde Relleno de Queso", precioExtra: 6000 },
              ],
            },
          ],
        },
        {
          nombre: "Pizza Pepperoni & Jalapeño",
          descripcion: "Doble pepperoni americano, salsa pomodoro, mozzarella y toques de jalapeño curtido.",
          precio: 39500,
          costo: 14500,
          favorito: true,
          grupos: [
            {
              nombre: "Nivel de Picante",
              requerido: false,
              opciones: [
                { nombre: "Picante Suave", precioExtra: 0 },
                { nombre: "Picante Fuerte", precioExtra: 0 },
              ],
            },
          ],
        },
      ],
    },
    {
      categoria: "Cortes de Carne & Parrilla",
      orden: 3,
      icono: "Beef",
      platillos: [
        {
          nombre: "Bife de Chorizo Angus (350g)",
          descripcion: "Corte grueso a la brasa servido con chimichurri casero y papas rústicas.",
          precio: 52000,
          costo: 24000,
          favorito: true,
          grupos: [
            {
              nombre: "Término del Corte",
              requerido: true,
              opciones: [
                { nombre: "Azul / Inglés", precioExtra: 0 },
                { nombre: "Medio", precioExtra: 0 },
                { nombre: "Tres Cuartos", precioExtra: 0 },
                { nombre: "Bien Asado", precioExtra: 0 },
              ],
            },
            {
              nombre: "Acompañamiento",
              requerido: true,
              opciones: [
                { nombre: "Papas Rústicas al Romero", precioExtra: 0 },
                { nombre: "Ensalada Verde de la Huerta", precioExtra: 0 },
                { nombre: "Puré de Papa Trufado", precioExtra: 4000 },
              ],
            },
          ],
        },
      ],
    },
    {
      categoria: "Bebidas & Coctelería",
      orden: 4,
      icono: "Coffee",
      platillos: [
        {
          nombre: "Cerveza Artesanal IPA (330ml)",
          descripcion: "Cerveza local con notas cítricas y amargor equilibrado.",
          precio: 14000,
          costo: 6000,
          favorito: true,
          grupos: [],
        },
        {
          nombre: "Limonada de Coco & Menta",
          descripcion: "Preparada al momento con leche de coco fresca y hierbabuena.",
          precio: 12500,
          costo: 3500,
          favorito: true,
          grupos: [],
        },
        {
          nombre: "Gaseosa / Soda (350ml)",
          descripcion: "Coca-Cola, Cuatro, Sprite o Ginger Ale.",
          precio: 7500,
          costo: 2500,
          favorito: false,
          grupos: [
            {
              nombre: "Sabor",
              requerido: true,
              opciones: [
                { nombre: "Coca-Cola Zero", precioExtra: 0 },
                { nombre: "Coca-Cola Original", precioExtra: 0 },
                { nombre: "Sprite", precioExtra: 0 },
                { nombre: "Agua con Gas", precioExtra: 0 },
              ],
            },
          ],
        },
      ],
    },
    {
      categoria: "Postres",
      orden: 5,
      icono: "IceCream",
      platillos: [
        {
          nombre: "Volcán de Chocolate Caliente",
          descripcion: "Centro líquido de chocolate belga acompañado de helado artesanal de vainilla.",
          precio: 18000,
          costo: 6000,
          favorito: true,
          grupos: [],
        },
      ],
    },
  ];

  for (const catData of menuData) {
    let cat = await prisma.categoriaMenu.findFirst({
      where: { nombre: catData.categoria },
    });

    if (!cat) {
      cat = await prisma.categoriaMenu.create({
        data: {
          nombre: catData.categoria,
          orden: catData.orden,
          icono: catData.icono,
        },
      });
    }

    for (const platData of catData.platillos) {
      let plat = await prisma.platillo.findFirst({
        where: { nombre: platData.nombre, categoriaId: cat.id },
      });

      if (!plat) {
        plat = await prisma.platillo.create({
          data: {
            nombre: platData.nombre,
            descripcion: platData.descripcion,
            precio: platData.precio,
            costo: platData.costo,
            favorito: platData.favorito,
            categoriaId: cat.id,
          },
        });

        for (const grupoData of platData.grupos) {
          const grupo = await prisma.grupoModificador.create({
            data: {
              platilloId: plat.id,
              nombre: grupoData.nombre,
              requerido: grupoData.requerido,
            },
          });

          for (const opData of grupoData.opciones) {
            await prisma.opcionModificador.create({
              data: {
                grupoId: grupo.id,
                nombre: opData.nombre,
                precioExtra: opData.precioExtra,
              },
            });
          }
        }
      }
    }
  }
  console.log("✅ Menú y modificadores iniciales creados exitosamente");

  console.log("🎉 Seed completado exitosamente!");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
