"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchDomains } from "../../../../lib/api";
import Link from "next/link";

export default function ZoneEditorRouterPage() {
  const { data: domains = [], isLoading } = useQuery({
    queryKey: ["odin", "domains"],
    queryFn: fetchDomains,
    staleTime: 1000 * 60 * 5
  });

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-10">
         <div className="space-y-1.5">
           <div className="flex items-center gap-3 mb-1">
              <span className="px-2.5 py-1 bg-[#00A3FF]/10 text-[#00A3FF] text-[10px] font-bold uppercase rounded-full tracking-wider">
                 Gestión de Red
              </span>
           </div>
           <h1 className="text-5xl font-black text-slate-900 uppercase">
             Editor de <span className="text-[#00A3FF]">Zonas DNS</span>
           </h1>
           <p className="text-slate-500 text-sm font-medium mt-2">
             Administra los registros DNS de tus dominios apuntando a servidores de correo, IPs y verificaciones externas.
           </p>
         </div>
      </header>

      {/* Select Domain to edit DNS Zone */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden">
         <h3 className="text-sm font-black text-slate-900 uppercase mb-8 flex items-center gap-3 border-b border-slate-100 pb-6">
            <span className="material-symbols-outlined text-[#00A3FF]">dns</span>
            Selecciona un dominio para editar su Zona DNS
         </h3>

         {isLoading ? (
           <div className="p-10 flex flex-col items-center justify-center animate-pulse">
              <div className="w-10 h-10 border-4 border-slate-100 border-t-[#00A3FF] rounded-full animate-spin mb-4"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargando dominios...</p>
           </div>
         ) : domains.length === 0 ? (
           <div className="p-10 text-center text-slate-400 font-bold uppercase text-[11px] tracking-widest">
              No tienes ningún dominio o subdominio vinculado todavía.
           </div>
         ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {domains.map((dom) => (
                <div key={dom.id} className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm group hover:border-[#00A3FF]/30 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
                   <div>
                      <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#00A3FF] group-hover:text-white transition-all shadow-sm mb-6">
                         <span className="material-symbols-outlined text-2xl">public</span>
                      </div>
                      <h3 className="text-lg font-black text-slate-900 group-hover:text-[#00A3FF] transition-colors">{dom.domain_name}</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{dom.dns_provider || "Odisea DNS"}</p>
                   </div>
                   
                   <div className="mt-8">
                      <Link href={`/domains/${dom.id}`} className="block">
                         <button className="w-full inline-flex items-center justify-center gap-2 bg-[#00A3FF]/10 text-[#00A3FF] py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#00A3FF] hover:text-white transition-all shadow-sm active:scale-95">
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                            Editar Registros DNS
                         </button>
                      </Link>
                   </div>
                   <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-[#00A3FF]/5 blur-[60px] rounded-full group-hover:bg-[#00A3FF]/10 transition-all duration-1000"></div>
                </div>
              ))}
           </div>
         )}
      </div>
    </div>
  );
}
