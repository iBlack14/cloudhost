"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchDomains, fetchOdinDashboard } from "../../../lib/api";

export default function AccountsPage() {
  const [search, setSearch] = useState("");
  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ["odin", "dashboard"],
    queryFn: fetchOdinDashboard
  });
  const { data: domains = [], isLoading: domainsLoading } = useQuery({
    queryKey: ["odin", "domains"],
    queryFn: fetchDomains
  });
  const isLoading = dashboardLoading || domainsLoading;

  const filteredAccounts = useMemo(() => {
    const term = search.toLowerCase();
    return domains.filter(domain => 
      domain.domain_name.toLowerCase().includes(term) ||
      domain.status.toLowerCase().includes(term)
    );
  }, [domains, search]);

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 mb-1">
             <span className="px-2.5 py-1 bg-[#00A3FF]/10 text-[#00A3FF] text-[10px] font-bold uppercase rounded-full tracking-wider">
                Infraestructura Multicloud
             </span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 uppercase">
            Gestión de <span className="text-[#00A3FF]">Cuentas</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-2">
            Consulta la instancia asociada a tu usuario y sus dominios vinculados.
          </p>
        </div>
        <Link href="/domains">
          <button className="bg-[#00A3FF] px-10 py-5 rounded-2xl text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-[#00A3FF]/20 hover:bg-[#008EE0] active:scale-[0.98] transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">language</span>
            Ver Dominios
          </button>
        </Link>
      </header>

      <div className="bg-white border border-slate-200 rounded-[3rem] shadow-sm overflow-hidden flex flex-col">
        <div className="px-10 py-6 border-b border-slate-100 flex items-center gap-6 bg-slate-50/50">
          <span className="material-symbols-outlined text-slate-300">search</span>
          <input 
            type="text" 
            placeholder="Buscar por usuario, dominio o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-slate-900 w-full font-bold text-sm placeholder:text-slate-300 placeholder:font-medium"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50/30 border-b border-slate-100">
                <th className="px-10 py-5">Instancia / Dominio</th>
                <th className="px-10 py-5">Dominio Principal</th>
                <th className="px-10 py-5">Estado</th>
                <th className="px-10 py-5 text-right">Recursos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 bg-white">
              {isLoading ? (
                 <tr>
                   <td colSpan={4} className="p-24 text-center">
                     <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-slate-100 border-t-[#00A3FF] rounded-full animate-spin"></div>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Escaneando infraestructura...</p>
                     </div>
                   </td>
                 </tr>
              ) : filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-24 text-center">
                      <div className="flex flex-col items-center opacity-30">
                        <span className="material-symbols-outlined text-6xl text-slate-400">group_off</span>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-4">Sin resultados</p>
                      </div>
                    </td>
                  </tr>
              ) : filteredAccounts.map((domain) => (
                <tr key={domain.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-10 py-6">
                    <div className="font-black text-slate-900 tracking-tight text-base group-hover:text-[#00A3FF] transition-colors">{domain.domain_name}</div>
                    <div className="text-[11px] text-slate-400 font-bold mt-0.5">{dashboard?.account.plan ?? "Plan activo"}</div>
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-2">
                       <span className="material-symbols-outlined text-slate-200 text-[18px]">language</span>
                       <span className="font-bold text-slate-600 text-sm">{domain.domain_name}</span>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                      domain.status === 'active' 
                      ? 'border-[#00A3FF]/20 text-[#00A3FF] bg-[#00A3FF]/5 shadow-sm shadow-[#00A3FF]/5' 
                      : 'border-red-200 text-red-500 bg-red-50'
                    }`}>
                      {domain.status === 'active' ? 'Activo' : domain.status}
                    </span>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {dashboard?.account.diskUsed ?? 0} MB / {dashboard?.account.diskLimit ?? 0} MB
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
