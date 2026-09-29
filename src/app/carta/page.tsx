import { prisma } from "@/lib/prisma";
import { CartaPublica } from "@/features/carta-qr/components/carta-publica";

export default async function CartaPage({searchParams}:{searchParams:Promise<{mesa?:string}>}) {
  const params=await searchParams; const [categorias,mesas,config]=await Promise.all([
    prisma.categoriaMenu.findMany({where:{activa:true},orderBy:{orden:"asc"},select:{id:true,nombre:true,platillos:{where:{disponible:true},orderBy:{orden:"asc"},select:{id:true,nombre:true,descripcion:true,precio:true,imagenUrl:true,categoriaId:true}}}}),
    prisma.mesa.findMany({select:{id:true,numero:true,sala:{select:{nombre:true}}},orderBy:{numero:"asc"}}), prisma.configuracion.findFirst({select:{nombreRestaurante:true}}),
  ]);
  return <CartaPublica restaurante={config?.nombreRestaurante??"RestoManager"} mesaInicial={params.mesa} mesas={mesas} categorias={categorias.map(c=>({...c,platillos:c.platillos.map(p=>({...p,precio:Number(p.precio)}))}))}/>;
}
