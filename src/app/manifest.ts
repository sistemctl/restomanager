import type { MetadataRoute } from "next";
export default function manifest():MetadataRoute.Manifest{return{name:"RestoManager POS",short_name:"RestoManager",description:"Gestión integral para restaurantes",start_url:"/",display:"standalone",background_color:"#fffaf1",theme_color:"#E63946",orientation:"any",icons:[{src:"/icon.svg",sizes:"any",type:"image/svg+xml",purpose:"any"}]}}
