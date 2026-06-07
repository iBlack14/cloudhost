"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDomains, addDomain, deleteDomain } from "../../../../lib/api";

export default function SubdomainsPage() {
  const queryClient = useQueryClient();
  const [subdomainPrefix, setSubdomainPrefix] = useState("");
  const [selectedRootDomain, setSelectedRootDomain] = useState("");

  const { data: domains = [], isLoading } = useQuery({
    queryKey: ["odin", "domains"],
    queryFn: fetchDomains,
    staleTime: 1000 * 60 * 5
  });

  // Filter root domains (domains with only one dot like "example.com")
  const rootDomains = domains.filter((d) => {
    const parts = d.domain_name.split(".");
    return parts.length === 2 || (parts.length === 3 && parts[1].length <= 3 && parts[2].length <= 3); // simplistic check for tlds
  });

  // Filter subdomains (domains that are children of one of our root domains)
  const subdomains = domains.filter((d) => {
    const isSubdomain = d.domain_name.split(".").length > 2;
    return isSubdomain;
  });

  const addMutation = useMutation({
    mutationFn: addDomain,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["odin", "domains"] });
      setSubdomainPrefix("");
      alert("Subdominio creado exitosamente.");
    },
    onError: (err: any) => alert(`Error al crear subdominio: ${err.message}`)
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDomain,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["odin", "domains"] });
    },
    onError: (err: any) => alert(`Error al eliminar subdominio: ${err.message}`)
  });

  const handleCreateSubdomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subdomainPrefix || !selectedRootDomain) return;
    const fullDomain = `${subdomainPrefix.trim().toLowerCase()}.${selectedRootDomain}`;
    addMutation.mutate(fullDomain);
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este subdominio?")) {
      deleteMutation.mutate(id);
    }
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
             Mis <span className="text-[#00A3FF]">Subdominios</span>
           </h1>
           <p className="text-slate-500 text-sm font-medium mt-2">
             Crea particiones de tus dominios principales para albergar diferentes aplicaciones.
           </p>
         </div>
      </header>

      {/* Create Subdomain Card */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden group">
         <form onSubmit={handleCreateSubdomain} className="relative z-10 space-y-6">
            <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-3">
              <span className="material-symbols-outlined text-[#00A3FF]">layers</span>
              Crear un Subdominio
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
               <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Subdominio</label>
                  <input 
                    type="text" 
                    placeholder="ej: blog, api, tienda"
                    value={subdomainPrefix}
                    onChange={(e) => setSubdomainPrefix(e.target.value)}
                    disabled={addMutation.isPending}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold outline-none focus:focus:border-[#00A3FF] focus:bg-white transition-all shadow-inner"
                  />
               </div>

               <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Dominio Base</label>
                  <select 
                    value={selectedRootDomain}
                    onChange={(e) => setSelectedRootDomain(e.target.value)}
                    disabled={addMutation.isPending}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold outline-none focus:border-[#00A3FF] focus:bg-white transition-all appearance-none"
                  >
                     <option value="">-- Selecciona un Dominio --</option>
                     {rootDomains.map((d) => (
                       <option key={d.id} value={d.domain_name}>{d.domain_name}</option>
                     ))}
                  </select>
               </div>

               <button 
                 disabled={addMutation.isPending || !subdomainPrefix || !selectedRootDomain}
                 className="w-full bg-[#00A3FF] py-4 rounded-2xl text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-[#00A3FF]/20 hover:bg-[#008EE0] active:scale-[0.98] transition-all disabled:opacity-40"
               >
                 {addMutation.isPending ? "Creando..." : "Crear Subdominio"}
               </button>
            </div>
         </form>
         <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-[#00A3FF]/5 blur-[100px] rounded-full"></div>
      </div>

      {/* Subdomains List */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden">
         <h3 className="text-sm font-black text-slate-900 uppercase mb-8 flex items-center gap-3 border-b border-slate-100 pb-6">
            <span className="material-symbols-outlined text-[#00A3FF]">list_alt</span>
            Lista de Subdominios Activos
         </h3>

         {isLoading ? (
           <div className="p-10 flex flex-col items-center justify-center animate-pulse">
              <div className="w-10 h-10 border-4 border-slate-100 border-t-[#00A3FF] rounded-full animate-spin mb-4"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargando subdominios...</p>
           </div>
         ) : subdomains.length === 0 ? (
           <div className="p-10 text-center text-slate-400 font-bold uppercase text-[11px] tracking-widest">
              No tienes ningún subdominio creado todavía.
           </div>
         ) : (
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead>
                    <tr className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400 font-black border-b border-slate-100">
                       <th className="p-5 pl-8">Subdominio</th>
                       <th className="p-5">Dominio Root</th>
                       <th className="p-5">Estado</th>
                       <th className="p-5 w-20 text-right pr-8">Acciones</th>
                    </tr>
                 </thead>
                 <tbody>
                    {subdomains.map((sub) => {
                      const parts = sub.domain_name.split(".");
                      const rootDomain = parts.slice(1).join(".");
                      return (
                        <tr key={sub.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                           <td className="p-5 pl-8 font-black text-slate-900 text-base">{sub.domain_name}</td>
                           <td className="p-5 text-slate-500 font-medium text-sm">{rootDomain}</td>
                           <td className="p-5">
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${sub.status === 'active' ? 'border-emerald-200 text-emerald-600 bg-emerald-50' : 'border-amber-200 text-amber-600 bg-amber-50'}`}>
                                {sub.status === 'active' ? 'Activo' : 'Pendiente'}
                              </span>
                           </td>
                           <td className="p-5 text-right pr-8">
                              <button 
                                onClick={() => handleDelete(sub.id)}
                                className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm"
                              >
                                 <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                           </td>
                        </tr>
                      );
                    })}
                 </tbody>
              </table>
           </div>
         )}
      </div>
    </div>
  );
}
