"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDomains, addDomain, deleteDomain, verifyDomain } from "../../../lib/api";

export default function DomainsPage() {
  const [newDomain, setNewDomain] = useState("");
  const queryClient = useQueryClient();

  // FIX #5: Use React Query instead of manual useState + useEffect
  const { data: domains = [], isLoading, error } = useQuery({
    queryKey: ["odin", "domains"],
    queryFn: fetchDomains,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  // FIX #7: useMutation handles loading state automatically
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
      if (!res.ok) throw new Error(data?.error?.message ?? "SSL Issue Failed");
      return data;
    },
    onSuccess: () => {
      alert("Certificado SSL emitido con éxito por Let's Encrypt.");
      queryClient.invalidateQueries({ queryKey: ["odin", "domains"] });
    },
    onError: (err) => {
      alert(`Error SSL: ${err.message}`);
    }
  });

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain) return;
    await addMutation.mutateAsync(newDomain);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-12">
      <header className="flex justify-between items-end">
        <div className="space-y-1">
          <div className="flex items-center gap-3 mb-1">
             <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-black uppercase rounded border border-primary/20 tracking-widest">
                Network Layer
             </span>
          </div>
          <h1 className="text-6xl font-headline font-black text-white tracking-tighter uppercase italic">
            Domain <span className="text-zinc-600">Assets</span>
          </h1>
          <p className="text-zinc-500 text-sm font-mono tracking-widest mt-1">
            Global namespace orchestration and DNS propagation control.
          </p>
        </div>
      </header>

      {/* Add Domain Section */}
      <div className="glass-card p-1">
         <form onSubmit={handleAddDomain} className="bg-white/[0.02] p-8 flex flex-col md:flex-row items-center gap-6 group">
            <div className="flex-1 w-full space-y-2">
               <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Register New Domain Asset</label>
               <input 
                 type="text" 
                 placeholder="e.g. blxkstudio.com"
                 value={newDomain}
                 onChange={(e) => setNewDomain(e.target.value)}
                 disabled={addMutation.isPending}
                 className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary/50 transition-all placeholder:text-zinc-800 font-headline italic uppercase tracking-tighter disabled:opacity-50"
               />
            </div>
            <button 
              disabled={addMutation.isPending || !newDomain}
              className="w-full md:w-auto mt-6 md:mt-0 kinetic-gradient px-12 py-5 rounded-2xl text-white font-black font-headline tracking-widest active:scale-95 transition-all shadow-xl shadow-primary/40 uppercase text-xs disabled:opacity-50"
            >
              {addMutation.isPending ? "Connecting..." : "+ Connect Domain"}
            </button>
         </form>
      </div>

      {/* Domains List */}
      <div className="space-y-4">
         {isLoading ? (
           <div className="p-20 flex flex-col items-center justify-center glass-card animate-pulse">
              <span className="material-symbols-outlined text-zinc-800 text-6xl mb-4">globe</span>
              <p className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">Scanning Global Name Servers...</p>
           </div>
         ) : domains.length === 0 ? (
           <div className="p-20 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-zinc-800 text-6xl mb-6">language_off</span>
              <h4 className="text-sm font-black text-zinc-500 uppercase tracking-widest">No Domain Assets Mapped</h4>
              <p className="text-[10px] text-zinc-700 mt-2 uppercase tracking-widest">Connect your first domain to enable cluster routing.</p>
           </div>
         ) : (
           <div className="grid grid-cols-1 gap-4">
              {domains.map((domain) => (
                <div key={domain.id} className="glass-card p-1 group">
                   <div className="bg-white/[0.01] p-6 flex flex-col md:flex-row items-center justify-between gap-8 group-hover:bg-white/[0.03] transition-all">
                      <div className="flex items-center gap-6">
                         <div className="w-14 h-14 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-500 group-hover:text-primary transition-all">
                            <span className="material-symbols-outlined">public</span>
                         </div>
                         <div>
                            <h3 className="text-xl font-headline font-black text-white italic uppercase tracking-tighter">{domain.domain_name}</h3>
                            <div className="flex items-center gap-3 mt-1">
                               <span className={`w-1.5 h-1.5 rounded-full ${domain.status === 'active' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-amber-500'}`}></span>
                               <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{domain.status}</span>
                            </div>
                         </div>
                      </div>

                      <div className="flex flex-1 justify-center gap-12">
                         <div className="text-center">
                             <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest block mb-1">Provider</span>
                             <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">{domain.dns_provider}</span>
                         </div>
                         <div className="text-center">
                             <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest block mb-1">SSL Shield</span>
                             <span className={`text-[10px] font-black uppercase tracking-tight ${domain.ssl_enabled ? 'text-primary' : 'text-zinc-700'}`}>
                               {domain.ssl_enabled ? 'Protected' : 'Inactive'}
                             </span>
                         </div>
                         <div className="text-center min-w-[220px]">
                             <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest block mb-1">Runtime</span>
                             <span className="text-[10px] font-bold text-zinc-400 tracking-tight">
                               {domain.verification?.publicUrl ?? (domain.verification?.dns?.resolves ? "DNS OK, sin respuesta web" : "DNS no resuelve aún")}
                             </span>
                         </div>
                      </div>

                      <div className="flex gap-2">
                         <button
                           onClick={() => window.location.href = `/domains/${domain.id}`}
                           title="Manage DNS Zone"
                           className="px-4 py-2 rounded-lg border border-primary/20 bg-primary/10 text-primary font-black uppercase text-[10px] tracking-widest hover:text-white hover:bg-primary transition-all flex items-center gap-2"
                         >
                            <span className="material-symbols-outlined text-sm">tune</span> Zone
                         </button>
                         {!domain.ssl_enabled && (
                            <button
                              onClick={() => { if(confirm("Emite tu certificado SSL con Let's Encrypt. \nRequiere que los DNS apunten a este servidor.")) sslMutation.mutate(domain.id) }}
                              disabled={sslMutation.isPending}
                              title="Instalar Auto-SSL (Let's Encrypt)"
                              className="px-4 py-2 rounded-lg border border-secondary/20 bg-secondary/10 text-secondary font-black uppercase text-[10px] tracking-widest hover:text-black hover:bg-secondary transition-all flex items-center gap-2"
                            >
                               <span className="material-symbols-outlined text-sm">lock</span> {sslMutation.isPending ? "Issuing..." : "Auto-SSL"}
                            </button>
                         )}
                         <button
                           onClick={() => verifyMutation.mutate(domain.id)}
                           disabled={verifyMutation.isPending}
                           title="Verificar DNS/SSL ahora"
                           className="p-3 rounded-lg border border-white/5 bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
                         >
                            <span className="material-symbols-outlined text-sm">sync</span>
                         </button>
                         <button 
                           onClick={() => handleDelete(domain.id)}
                           disabled={deleteMutation.isPending}
                           className="p-3 rounded-lg border border-white/5 bg-white/5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-50"
                         >
                            <span className="material-symbols-outlined text-sm">delete</span>
                         </button>
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
