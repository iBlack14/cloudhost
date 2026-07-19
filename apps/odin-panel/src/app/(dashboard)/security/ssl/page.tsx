"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDomains, getOdinAccessToken } from "../../../../lib/api";

const API_BASE = (() => {
  if (typeof window === "undefined") {
    const envUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
    return envUrl.startsWith("//") ? "http:" + envUrl : envUrl;
  }
  const host = window.location.hostname;
  const proto = window.location.protocol;
  if (host === "localhost") return "http://localhost:3001/api/v1";
  if (host.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    let port = "3001";
    try {
      const u = process.env.NEXT_PUBLIC_API_URL ? new URL(process.env.NEXT_PUBLIC_API_URL) : null;
      if (u && u.port) port = u.port;
    } catch {}
    return `${proto}//${host}:${port}/api/v1`;
  }
  const parts = host.split(".");
  return `${proto}//api.${parts.length >= 2 ? parts.slice(-2).join(".") : host}/api/v1`;
})();

interface DomainRecord {
  id: string;
  domain_name: string;
  status: string;
  ssl_enabled: boolean;
}

interface SslStatus {
  domain: string;
  hasSsl: boolean;
  issuer?: string;
  expiryDate?: string;
}

export default function SslCertificatesPage() {
  const queryClient = useQueryClient();

  const { data: domains = [], isLoading: isLoadingDomains } = useQuery({
    queryKey: ["odin", "domains"],
    queryFn: fetchDomains,
    staleTime: 1000 * 60 * 5
  });

  // Query SSL status for each domain
  const sslStatusesQuery = useQuery({
    queryKey: ["odin", "ssl_statuses", domains.map(d => d.id).join(",")],
    queryFn: async () => {
      const results: Record<string, SslStatus> = {};
      const token = getOdinAccessToken();
      
      await Promise.all(
        domains.map(async (d) => {
          try {
            const res = await fetch(`${API_BASE}/odin-panel/domains/${d.id}/ssl`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
              const json = await res.json();
              results[d.id] = json.data;
            } else {
              results[d.id] = { domain: d.domain_name, hasSsl: false };
            }
          } catch {
            results[d.id] = { domain: d.domain_name, hasSsl: false };
          }
        })
      );
      return results;
    },
    enabled: domains.length > 0
  });

  const autoSslMutation = useMutation({
    mutationFn: async (domainId: string) => {
      const token = getOdinAccessToken();
      const res = await fetch(`${API_BASE}/odin-panel/domains/${domainId}/ssl/issue`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Fallo al emitir SSL");
      return data;
    },
    onSuccess: () => {
      alert("Certificado SSL emitido correctamente por Let's Encrypt.");
      queryClient.invalidateQueries({ queryKey: ["odin", "domains"] });
      queryClient.invalidateQueries({ queryKey: ["odin", "ssl_statuses"] });
    },
    onError: (err: any) => alert(`Error al emitir SSL: ${err.message}`)
  });

  const isLoading = isLoadingDomains || sslStatusesQuery.isLoading;

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-10">
         <div className="space-y-1.5">
           <div className="flex items-center gap-3 mb-1">
              <span className="px-2.5 py-1 bg-[#00A3FF]/10 text-[#00A3FF] text-[10px] font-bold uppercase rounded-full tracking-wider">
                 Seguridad
              </span>
           </div>
           <h1 className="text-5xl font-black text-slate-900 uppercase">
             Certificados <span className="text-[#00A3FF]">SSL/TLS</span>
           </h1>
           <p className="text-slate-500 text-sm font-medium mt-2">
             Protege las comunicaciones de tus visitantes cifrando el tráfico con certificados SSL Let's Encrypt gratuitos.
           </p>
         </div>
      </header>

      {/* SSL Certificates List */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden">
         <h3 className="text-sm font-black text-slate-900 uppercase mb-8 flex items-center gap-3 border-b border-slate-100 pb-6">
            <span className="material-symbols-outlined text-[#00A3FF]">verified</span>
            Mis Dominios y Estado de Certificado
         </h3>

         {isLoading ? (
           <div className="p-10 flex flex-col items-center justify-center animate-pulse">
              <div className="w-10 h-10 border-4 border-slate-100 border-t-[#00A3FF] rounded-full animate-spin mb-4"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Analizando seguridad de dominios...</p>
           </div>
         ) : domains.length === 0 ? (
           <div className="p-10 text-center text-slate-400 font-bold uppercase text-[11px] tracking-widest">
              No tienes ningún dominio o subdominio vinculado todavía.
           </div>
         ) : (
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead>
                    <tr className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400 font-black border-b border-slate-100">
                       <th className="p-5 pl-8">Dominio</th>
                       <th className="p-5">Emisor SSL</th>
                       <th className="p-5">Expiración</th>
                       <th className="p-5">Cifrado (HTTPS)</th>
                       <th className="p-5 w-40 text-right pr-8">Acciones</th>
                    </tr>
                 </thead>
                 <tbody>
                    {domains.map((dom) => {
                      const sslStatus = sslStatusesQuery.data?.[dom.id];
                      const hasSsl = sslStatus?.hasSsl || dom.ssl_enabled;
                      return (
                        <tr key={dom.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                           <td className="p-5 pl-8 font-black text-slate-900 text-base flex items-center gap-3">
                              <span className={`material-symbols-outlined ${hasSsl ? 'text-emerald-500' : 'text-slate-300'}`}>
                                 {hasSsl ? 'lock' : 'lock_open'}
                              </span>
                              {dom.domain_name}
                           </td>
                           <td className="p-5 text-slate-500 font-medium text-sm">
                              {hasSsl ? (sslStatus?.issuer || "Let's Encrypt") : "N/A"}
                           </td>
                           <td className="p-5 text-slate-500 font-medium text-xs font-mono">
                              {hasSsl ? (sslStatus?.expiryDate || "Indeterminada") : "Expirado / Inactivo"}
                           </td>
                           <td className="p-5">
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${hasSsl ? 'border-emerald-200 text-emerald-600 bg-emerald-50' : 'border-red-200 text-red-600 bg-red-50'}`}>
                                {hasSsl ? 'Seguro' : 'No Seguro'}
                              </span>
                           </td>
                           <td className="p-5 text-right pr-8">
                               <div className="flex items-center justify-end gap-2">
                                 {hasSsl && (
                                   <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest flex items-center gap-1.5 mr-2">
                                      <span className="material-symbols-outlined text-sm">verified_user</span>
                                      Protegido
                                   </span>
                                 )}
                                 <button 
                                   onClick={() => autoSslMutation.mutate(dom.id)}
                                   disabled={autoSslMutation.isPending}
                                   className={`${
                                     hasSsl 
                                       ? "bg-slate-100 hover:bg-slate-200 text-slate-600" 
                                       : "bg-[#00A3FF]/10 text-[#00A3FF] hover:bg-[#00A3FF] hover:text-white"
                                   } px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-95 transition-all flex items-center gap-2 justify-center disabled:opacity-40`}
                                 >
                                    <span className="material-symbols-outlined text-[16px]">sync</span>
                                    {autoSslMutation.isPending ? "Generando..." : hasSsl ? "Regenerar" : "Auto-SSL"}
                                 </button>
                               </div>
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
