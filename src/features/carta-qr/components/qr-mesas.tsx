"use client";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ExternalLink, Printer } from "lucide-react";
type Mesa={id:string;numero:string;sala:{nombre:string}};
export function QrMesas({mesas,localUrl,cloudflareUrl}:{mesas:Mesa[];localUrl:string|null;cloudflareUrl:string|null}){
  const [destino,setDestino]=useState<"local"|"cloudflare">(cloudflareUrl?"cloudflare":"local");
  const baseUrl=destino==="cloudflare"?cloudflareUrl:localUrl;
  return <div className="space-y-6">
    <header className="flex flex-wrap items-end gap-3 print:hidden"><div><p className="text-xs uppercase tracking-[.2em] font-black text-[#E63946]">Carta digital</p><h1 className="text-3xl font-black">Códigos QR por mesa</h1><p className="text-sm text-slate-500">Elige cómo se conectarán los celulares que escaneen los códigos.</p></div><button onClick={()=>window.print()} disabled={!baseUrl} className="ml-auto flex gap-2 px-4 py-2 bg-[#1D3557] text-white rounded-xl text-sm font-bold disabled:opacity-50"><Printer className="w-4 h-4"/>Imprimir</button></header>
    <div className="flex flex-wrap items-center gap-2 print:hidden" role="group" aria-label="Destino de los códigos QR">
      <button type="button" onClick={()=>setDestino("local")} disabled={!localUrl} aria-pressed={destino==="local"} className={`px-4 py-2 rounded-lg border text-sm font-bold ${destino==="local"?"bg-[#1D3557] text-white border-[#1D3557]":"bg-white border-slate-300 text-slate-700"}`}>Red local{localIpLabel(localUrl)}</button>
      <button type="button" onClick={()=>setDestino("cloudflare")} disabled={!cloudflareUrl} aria-pressed={destino==="cloudflare"} className={`px-4 py-2 rounded-lg border text-sm font-bold ${destino==="cloudflare"?"bg-[#1D3557] text-white border-[#1D3557]":"bg-white border-slate-300 text-slate-700"}`}>Cloudflare</button>
      {!cloudflareUrl&&<p className="text-sm text-amber-700">Cloudflare no está configurado en este momento.</p>}
      {!localUrl&&<p className="text-sm text-amber-700">No se detectó una IP privada para la red local.</p>}
    </div>
    <p className="text-xs text-slate-500 print:hidden">Red local: conecta el celular al mismo Wi-Fi. Si DHCP cambia la IP, vuelve a abrir esta página e imprime de nuevo los códigos locales.{cloudflareUrl?` Enlace público: ${cloudflareUrl}`:""}</p>
    <div id="qr-print-area" className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{baseUrl&&mesas.map(m=>{const url=`${baseUrl}/carta?mesa=${m.id}`;return <article key={m.id} className="bg-white border rounded-2xl p-4 text-center break-inside-avoid"><p className="text-[10px] uppercase tracking-widest text-slate-500">{m.sala.nombre}</p><h2 className="text-2xl font-black mt-1">Mesa {m.numero}</h2><p className="text-[10px] font-bold uppercase mt-2">{destino==="local"?"Wi-Fi del restaurante":"Acceso por Cloudflare"}</p><div className="p-3 bg-white inline-block mt-2"><QRCodeSVG value={url} size={180} level="H" fgColor="#1D3557"/></div><a href={url} target="_blank" rel="noreferrer" className="mt-2 text-xs font-bold text-[#E63946] flex justify-center gap-1 print:hidden">Abrir carta <ExternalLink className="w-3 h-3"/></a></article>})}</div>
  </div>;
}

function localIpLabel(url:string|null){return url?` · ${new URL(url).hostname}`:"";}
