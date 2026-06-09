"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE = typeof window !== "undefined" && window.location.hostname !== "localhost" && !window.location.hostname.match(/^\d+\.\d+\.\d+\.\d+$/)
  ? `${window.location.protocol}//api.${window.location.hostname.split(".").slice(-2).join(".")}/api/v1`
  : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1");

const getWhmToken = () =>
  typeof window !== "undefined" ? window.sessionStorage.getItem("whm-access-token") : null;

const whmHeaders = (): Record<string, string> => {
  const t = getWhmToken();
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

interface PhpStatus {
  version: string;
  status: "active" | "inactive" | "not_installed";
  installed: boolean;
  extensions: string[];
}

interface PhpAccount {
  account_id: string;
  username: string;
  domain: string;
  php_version: string;
}

export default function WhmPhpManager() {
  const queryClient = useQueryClient();
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string>("8.2");

  const { data: statuses, isLoading: loadStatus } = useQuery<PhpStatus[]>({
    queryKey: ["whm_php_status"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/whm/php/status`, { headers: whmHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Error obteniendo estados");
      return data.data;
    },
  });

  const { data: accounts, isLoading: loadAccounts } = useQuery<PhpAccount[]>({
    queryKey: ["whm_php_accounts"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/whm/php/accounts`, { headers: whmHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Error obteniendo cuentas");
      return data.data;
    },
  });

  const changeAccountPhp = useMutation({
    mutationFn: async ({ accountId, version }: { accountId: string; version: string }) => {
      const res = await fetch(`${API_BASE}/whm/php/accounts/${accountId}`, {
        method: "PATCH",
        headers: whmHeaders(),
        body: JSON.stringify({ version }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Error al actualizar");
      return data;
    },
    onSuccess: () => {
      setEditingAccountId(null);
      queryClient.invalidateQueries({ queryKey: ["whm_php_accounts"] });
    },
  });

  const reloadFpm = useMutation({
    mutationFn: async (version: string) => {
      const res = await fetch(`${API_BASE}/whm/php/reload/${version}`, {
        method: "POST",
        headers: whmHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Error al recargar");
      return data;
    },
    onSuccess: () => {
      alert("Servicio PHP-FPM recargado correctamente.");
      queryClient.invalidateQueries({ queryKey: ["whm_php_status"] });
    },
  });

  return (
    <div className="space-y-12 animate-in fade-in duration-700 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 mb-1">
             <span className="px-2.5 py-1 bg-[#00A3FF]/10 text-[#00A3FF] text-[10px] font-bold uppercase rounded-full tracking-wider">
                Entornos de Ejecución
             </span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 uppercase">
            Gestor <span className="text-[#00A3FF]">Multi-PHP</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-2">
            Control de servicios PHP-FPM y asignación de versiones por cuenta de cliente.
          </p>
        </div>
      </header>

      {/* Pools Status */}
      <section className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm">
        <div className="flex items-center gap-4 mb-10">
           <div className="w-10 h-10 rounded-xl bg-[#00A3FF]/5 flex items-center justify-center text-[#00A3FF] border border-[#00A3FF]/10">
              <span className="material-symbols-outlined">terminal</span>
           </div>
           <h2 className="text-xl font-black text-slate-900 uppercase">Estado de Servicios PHP-FPM</h2>
        </div>
        
        {loadStatus ? (
          <div className="flex items-center justify-center p-10 gap-3">
             <div className="w-6 h-6 border-4 border-[#00A3FF]/20 border-t-[#00A3FF] rounded-full animate-spin"></div>
             <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Consultando Servicios...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {statuses?.map((s) => (
              <div key={s.version} className="bg-slate-50 border border-slate-100 p-6 rounded-2xl flex flex-col gap-3 relative overflow-hidden group hover:border-[#00A3FF]/30 transition-all shadow-sm">
                <div className="flex justify-between items-center relative z-10">
                  <span className="text-slate-900 font-black text-2xl group-hover:text-[#00A3FF] transition-colors">v{s.version}</span>
                  <div className={`w-3.5 h-3.5 rounded-full shadow-inner ${s.status === 'active' ? 'bg-emerald-500 shadow-emerald-500/50' : s.installed ? 'bg-amber-500 shadow-amber-500/50' : 'bg-slate-300'}`}></div>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest relative z-10">
                  {s.status === 'active' ? 'En ejecución' : s.installed ? 'Inactivo' : 'No Instalado'}
                </span>
                
                {s.installed && (
                  <button 
                    onClick={() => { if(confirm(`¿Recargar el servicio PHP ${s.version} FPM?`)) reloadFpm.mutate(s.version) }}
                    disabled={reloadFpm.isPending}
                    className="mt-2 w-full py-2 text-[9px] font-bold uppercase tracking-widest bg-white border border-slate-200 hover:bg-[#00A3FF] hover:text-white text-slate-500 rounded-xl transition-all shadow-sm relative z-10"
                  >
                    Recargar
                  </button>
                )}
                <div className="absolute -bottom-8 -right-8 w-20 h-20 bg-[#00A3FF]/5 blur-[30px] rounded-full group-hover:bg-[#00A3FF]/10 transition-all duration-700"></div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Account Version Assignment */}
      <section className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm">
        <div className="flex items-center gap-4 mb-10">
           <div className="w-10 h-10 rounded-xl bg-[#00A3FF]/5 flex items-center justify-center text-[#00A3FF] border border-[#00A3FF]/10">
              <span className="material-symbols-outlined">supervised_user_circle</span>
           </div>
           <h2 className="text-xl font-black text-slate-900 uppercase">Asignación por Cuenta</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 uppercase text-[11px] font-black tracking-[0.1em] text-slate-600">
                <th className="px-8 py-6">Usuario</th>
                <th className="px-8 py-6">Dominio Principal</th>
                <th className="px-8 py-6">Versión PHP</th>
                <th className="px-8 py-6 text-right">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadAccounts ? (
                <tr>
                   <td colSpan={4} className="p-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                         <div className="w-8 h-8 border-[3px] border-[#00A3FF]/20 border-t-[#00A3FF] rounded-full animate-spin"></div>
                         <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Cargando Cuentas...</span>
                      </div>
                   </td>
                </tr>
              ) : accounts?.map((acc) => (
                <tr key={acc.account_id} className="hover:bg-slate-50/50 transition-all group duration-300">
                  <td className="px-8 py-5 text-slate-900 font-bold text-[15px] group-hover:text-[#00A3FF] transition-colors">{acc.username}</td>
                  <td className="px-8 py-5 text-slate-400 font-bold text-sm uppercase tracking-tight">{acc.domain}</td>
                  <td className="px-8 py-5">
                    {editingAccountId === acc.account_id ? (
                      <div className="relative inline-block">
                        <select 
                          value={selectedVersion}
                          onChange={(e) => setSelectedVersion(e.target.value)}
                          className="appearance-none bg-white text-slate-900 font-bold px-5 py-2.5 pr-10 rounded-xl border border-slate-200 outline-none min-w-[140px] focus:border-[#00A3FF] transition-all cursor-pointer shadow-sm text-sm"
                        >
                          {statuses?.map(s => (
                            <option key={s.version} value={s.version} className="text-slate-900 bg-white">
                              PHP v{s.version} {s.installed ? "" : "(No inst.)"}
                            </option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#00A3FF] text-[18px]">
                          expand_more
                        </span>
                      </div>
                    ) : (
                      <span className="px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg font-bold text-[11px] text-slate-600">
                        {acc.php_version}
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-5 text-right">
                    {editingAccountId === acc.account_id ? (
                      <div className="flex gap-4 justify-end items-center">
                        <button 
                          onClick={() => setEditingAccountId(null)}
                          className="text-[11px] uppercase font-black text-slate-400 hover:text-slate-600 transition-all tracking-widest"
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={() => changeAccountPhp.mutate({ accountId: acc.account_id, version: selectedVersion })}
                          disabled={changeAccountPhp.isPending}
                          className="text-[11px] uppercase font-black text-white bg-[#00A3FF] px-6 py-2.5 rounded-xl shadow-lg shadow-[#00A3FF]/20 hover:bg-[#008EE0] active:scale-95 transition-all tracking-widest"
                        >
                          Guardar
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                           setEditingAccountId(acc.account_id);
                           setSelectedVersion(acc.php_version);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-[#00A3FF] hover:border-[#00A3FF]/30 transition-all shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[16px]">tune</span>
                        Gestionar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {accounts?.length === 0 && !loadAccounts && (
                <tr>
                  <td colSpan={4} className="p-20 text-center text-slate-400 italic font-medium">No se encontraron cuentas registradas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
