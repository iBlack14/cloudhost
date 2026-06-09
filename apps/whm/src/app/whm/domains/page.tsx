"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

const API_BASE = typeof window !== "undefined" && window.location.hostname !== "localhost" && !window.location.hostname.match(/^\d+\.\d+\.\d+\.\d+$/)
  ? `${window.location.protocol}//api.${window.location.hostname.split(".").slice(-2).join(".")}/api/v1`
  : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1");
const getWhmToken = () => typeof window !== "undefined" ? window.sessionStorage.getItem("whm-access-token") : null;
const whmHeaders = (): Record<string, string> => {
  const t = getWhmToken();
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

interface DomainRow {
  id: string;
  domain_name: string;
  user_id: string;
  username: string;
  status: "active" | "pending_verification";
  dns_provider: string;
}

export default function WhmDomainsPage() {
  const { data: domains, isLoading, error } = useQuery<DomainRow[]>({
    queryKey: ["whm_domains"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/whm/domains`, { headers: whmHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Error obteniendo dominios");
      return data.data;
    },
  });

  return (
    <div className="space-y-12 animate-in fade-in duration-700 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 mb-1">
             <span className="px-2.5 py-1 bg-[#00A3FF]/10 text-[#00A3FF] text-[10px] font-bold uppercase rounded-full tracking-wider">
                Infraestructura DNS
             </span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 uppercase">
            Gestor de <span className="text-[#00A3FF]">Zonas DNS</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-2">
            Administración centralizada de registros DNS para todos los dominios del servidor.
          </p>
        </div>
      </header>

      <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-20 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-[#00A3FF]/20 border-t-[#00A3FF] rounded-full animate-spin"></div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Cargando Dominios...</span>
            </div>
          </div>
        ) : error ? (
          <div className="p-20 text-center">
            <span className="material-symbols-outlined text-4xl text-red-500 mb-4">warning</span>
            <p className="text-red-600 font-bold uppercase text-xs">Error: {(error as Error).message}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 uppercase text-[10px] font-bold tracking-widest text-slate-500">
                     <th className="px-8 py-5">Dominio</th>
                     <th className="px-8 py-5">Propietario</th>
                     <th className="px-8 py-5">Proveedor</th>
                     <th className="px-8 py-5 text-right">Acciones</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {domains?.map(dom => (
                    <tr key={dom.id} className="hover:bg-slate-50/50 transition-all group duration-300">
                       <td className="px-8 py-5">
                          <div className="text-slate-900 font-bold text-lg group-hover:text-[#00A3FF] transition-colors">{dom.domain_name}</div>
                          <div className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${dom.status === 'active' ? 'text-emerald-500' : 'text-amber-500'}`}>
                             ● {dom.status === 'active' ? 'Activo' : 'Pendiente'}
                          </div>
                       </td>
                       <td className="px-8 py-5">
                          <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase">
                                {dom.username?.charAt(0) || "?"}
                             </div>
                             <span className="text-slate-600 font-bold text-sm">{dom.username || "Sistema"}</span>
                          </div>
                       </td>
                       <td className="px-8 py-5">
                          <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">{dom.dns_provider || "Local BIND9"}</span>
                       </td>
                       <td className="px-8 py-5 text-right">
                          <Link 
                            href={`/whm/domains/${dom.id}`} 
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-50 hover:bg-[#00A3FF] border border-slate-100 text-slate-600 hover:text-white font-bold uppercase text-[10px] rounded-xl tracking-widest transition-all shadow-sm"
                          >
                             <span className="material-symbols-outlined text-[16px]">edit_note</span>
                             Editar Zona
                          </Link>
                       </td>
                    </tr>
                 ))}
                 {(!domains || domains.length === 0) && (
                   <tr>
                     <td colSpan={4} className="p-24 text-center">
                        <div className="flex flex-col items-center gap-4">
                           <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100 mb-2">
                              <span className="material-symbols-outlined text-4xl">language</span>
                           </div>
                           <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs">No se encontraron zonas DNS activas</h3>
                           <p className="text-slate-400 text-sm max-w-xs mx-auto font-medium">Las zonas DNS aparecen automáticamente cuando creas una nueva cuenta de alojamiento.</p>
                           <Link href="/whm/accounts/create" className="mt-4 px-6 py-3 bg-[#00A3FF]/10 text-[#00A3FF] font-bold text-[11px] uppercase tracking-widest rounded-xl hover:bg-[#00A3FF] hover:text-white transition-all">
                              + Crear Nueva Cuenta
                           </Link>
                        </div>
                     </td>
                   </tr>
                 )}
               </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
