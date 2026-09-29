"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

export function PrintActions({ mesaId }: { mesaId: string | null }) {
  return (
    <div className="print:hidden flex gap-2 fixed top-4 right-4 z-20">
      <Link href={mesaId ? `/pos?mesaId=${mesaId}` : "/pos"} className="h-10 px-4 rounded-xl bg-white border border-slate-200 shadow-lg text-sm font-bold text-slate-700 flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> Volver</Link>
      <button onClick={() => window.print()} className="h-10 px-4 rounded-xl bg-[#E63946] shadow-lg text-sm font-bold text-white flex items-center gap-2"><Printer className="w-4 h-4" /> Imprimir</button>
    </div>
  );
}
