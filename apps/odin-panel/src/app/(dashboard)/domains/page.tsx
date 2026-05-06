"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDomains, addDomain, deleteDomain, verifyDomain } from "../../../lib/api";

export default function DomainsPage() {
  const [newDomain, setNewDomain] = useState("");
  const queryClient = useQueryClient();

  const { data: domains = [], isLoading } = useQuery({
    queryKey: ["odin", "domains"],
    queryFn: fetchDomains,
    staleTime: 1000 * 60 * 5
  });

  const addMutation = useMutation({
    mutationFn: addDomain,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["odin", "domains"] });
      setNewDomain("");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDomain,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["odin", "domains"] });
    }
  });

  const verifyMutation = useMutation({
    mutationFn: verifyDomain,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["odin", "domains"] });
    }
  });

  const sslMutation = useMutation({
    mutationFn: async (domainId: string) => {
      const res = await fetch(`http://localhost:3001/api/v1/odin-panel/domains/${domainId}/ssl/issue`, {
         method: "POST",
         headers: { Authorization: `Bearer ${window.sessionStorage.getItem("odin-access-token")}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Fallo al emitir SSL");
      return data;
    },
    onSuccess: () => {
      alert("Certificado SSL emitido con éxito.");
      queryClient.invalidateQueries({ queryKey: ["odin", "domains"] });
    },
    onError: (err) => alert(`Error SSL: ${err.message}`)
  });

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain) return;
    await addMutation.mutateAsync(newDomain);
  };

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
            Mis <span className="text-[#00A3FF]">Dominios</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-2">
            Administra tus activos digitales, zonas DNS y seguridad SSL.
          </p>
        </div>
        <div className="flex gap-4">
           <div className="px-5 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="text-right">
                 <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dominios Activos</div>
                 <div className="text-xl font-black text-slate-900">{domains.length}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-[#00A3FF]">
                 <span className="material-symbols-outlined">public</span>
              </div>
           </div>
        </div>
      </header>

      {/* Add Domain Section */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden group">
         <form onSubmit={handleAddDomain} className="relative z-10 flex flex-col md:flex-row items-end gap-6">
            <div className="flex-1 w-full space-y-3">
               <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Conectar Nuevo Dominio</label>
               <div className="relative">
                  <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-slate-300">add_link</span>
                  <input 
                    type="text" 
                    placeholder="ejemplo.com"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    disabled={addMutation.isPending}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-14 pr-6 py-4 text-slate-900 font-bold outline-none focus:border-[#00A3FF] focus:bg-white transition-all placeholder:text-slate-300 shadow-inner"
                  />
               </div>
            </div>
            <button 
              disabled={addMutation.isPending || !newDomain}
              className="w-full md:w-auto bg-[#00A3FF] px-10 py-5 rounded-2xl text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-[#00A3FF]/20 hover:bg-[#008EE0] active:scale-[0.98] transition-all disabled:opacity-40"
            >
              {addMutation.isPending ? "Conectando..." : "Vincular Dominio"}
            </button>
         </form>
         <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-[#00A3FF]/5 blur-[100px] rounded-full"></div>
      </div>

      {/* Domains List */}
      <div className="grid grid-cols-1 gap-6">
         {isLoading ? (
           <div className="p-20 flex flex-col items-center justify-center bg-white border border-slate-200 rounded-[3rem] shadow-sm">
              <div className="w-12 h-12 border-4 border-slate-100 border-t-[#00A3FF] rounded-full animate-spin mb-4"></div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Sincronizando con Servidores DNS...</p>
           </div>
         ) : domains.length === 0 ? (
           <div className="p-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-slate-200 mb-6 shadow-sm">
                 <span className="material-symbols-outlined text-5xl">language_off</span>
              </div>
              <h4 className="text-lg font-black text-slate-900 uppercase">Sin Dominios Vinculados</h4>
              <p className="text-sm text-slate-500 mt-2 font-medium">Conecta tu primer dominio para habilitar el enrutamiento y hosting.</p>
           </div>
         ) : (
           <div className="grid grid-cols-1 gap-4">
              {domains.map((domain) => (
                <div key={domain.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm group hover:border-[#00A3FF]/30 transition-all duration-300">
                   <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                      <div className="flex items-center gap-6 w-full lg:w-1/3">
                         <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[#00A3FF] group-hover:text-white transition-all shadow-sm">
                            <span className="material-symbols-outlined text-3xl">public</span>
                         </div>
                         <div>
                            <h3 className="text-xl font-black text-slate-900 group-hover:text-[#00A3FF] transition-colors">{domain.domain_name}</h3>
                            <div className="flex items-center gap-2.5 mt-1.5">
                               <span className={`w-2 h-2 rounded-full ${domain.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500'}`}></span>
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{domain.status === 'active' ? 'Activo' : 'Pendiente'}</span>
                            </div>
                         </div>
                      </div>

                      <div className="flex flex-1 justify-around w-full border-y lg:border-y-0 lg:border-x border-slate-100 py-6 lg:py-0 px-4">
                         <div className="text-center px-4">
                             <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1.5">Proveedor DNS</span>
                             <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{domain.dns_provider || "Odisea DNS"}</span>
                         </div>
                         <div className="text-center px-4">
                             <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1.5">Seguridad SSL</span>
                             <span className={`text-xs font-black uppercase tracking-tight ${domain.ssl_enabled ? 'text-emerald-500' : 'text-slate-400'}`}>
                               {domain.ssl_enabled ? 'Protegido' : 'Inactivo'}
                             </span>
                         </div>
                         <div className="text-center px-4">
                             <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1.5">URL Pública</span>
                             <span className="text-xs font-bold text-[#00A3FF] tracking-tight">
                               {domain.verification?.publicUrl ?? "dns_waiting"}
                             </span>
                         </div>
                      </div>

                      <div className="flex gap-2 w-full lg:w-auto">
                         <button
                           onClick={() => window.location.href = `/domains/${domain.id}`}
                           className="flex-1 lg:flex-none px-6 py-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:text-[#00A3FF] hover:bg-[#00A3FF]/5 transition-all flex items-center justify-center gap-2"
                         >
                            <span className="material-symbols-outlined text-[18px]">tune</span> Gestionar
                         </button>
                         {!domain.ssl_enabled && (
                            <button
                              onClick={() => { if(confirm("¿Emitir certificado SSL Let's Encrypt?")) sslMutation.mutate(domain.id) }}
                              disabled={sslMutation.isPending}
                              className="flex-1 lg:flex-none px-6 py-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center gap-2"
                            >
                               <span className="material-symbols-outlined text-[18px]">lock</span> {sslMutation.isPending ? "Emitiendo..." : "Auto-SSL"}
                            </button>
                         )}
                         <div className="flex gap-1">
                            <button
                              onClick={() => verifyMutation.mutate(domain.id)}
                              className="w-11 h-11 rounded-xl bg-slate-50 text-slate-400 hover:text-[#00A3FF] transition-all flex items-center justify-center shadow-sm"
                            >
                               <span className="material-symbols-outlined text-[18px]">sync</span>
                            </button>
                            <button 
                              onClick={() => handleDelete(domain.id)}
                              className="w-11 h-11 rounded-xl bg-slate-50 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center shadow-sm"
                            >
                               <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                         </div>
                      </div>
                   </div>
                </div>
              ))}
           </div>
         )}
      </div>
    </div>
  );
}
