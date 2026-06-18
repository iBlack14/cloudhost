"use client";

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { API_BASE, whmAuthHeaders as whmHeaders } from "../../../lib/api";

interface DomainRow {
  id: string;
  domain_name: string;
  user_id: string;
  username: string;
  status: string;
  ssl_enabled: boolean;
}

export default function WhmSslManagerPage() {
  const queryClient = useQueryClient();

  const { data: domains, isLoading, error } = useQuery<DomainRow[]>({
    queryKey: ["whm_domains_ssl"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/whm/domains`, { headers: whmHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Error fetching domains");
      return data.data;
    },
  });

  const sslMutation = useMutation({
    mutationFn: async (domainId: string) => {
      // El endpoint de emisión SSL está en el router de odin (usuario)
      // El WHM puede llamarlo directamente porque comparte la API con autorización de admin
      const res = await fetch(`${API_BASE}/odin/domains/${domainId}/ssl/issue`, {
        method: "POST",
        headers: whmHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Error al emitir SSL");
      return data;
    },
    onSuccess: (_data, domainId) => {
      toast.success("Certificado SSL emitido correctamente con Let's Encrypt");
      queryClient.invalidateQueries({ queryKey: ["whm_domains_ssl"] });
    },
    onError: (e: any) => {
      toast.error(e.message ?? "Error al emitir el certificado SSL");
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-3">
        <div className="w-8 h-8 border-[3px] border-[#00A3FF]/20 border-t-[#00A3FF] rounded-full animate-spin"></div>
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Cargando SSL/TLS Manager...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-20 text-center text-red-600 font-bold uppercase text-[11px] tracking-widest">
        Error: {(error as Error).message}
      </div>
    );
  }

  const validDomains = domains || [];
  const securedCount = validDomains.filter(d => d.ssl_enabled).length;

  return (
    <div className="space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b border-slate-200 pb-8">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 mb-1">
             <span className="px-2 py-0.5 bg-[#00A3FF]/10 text-[#00A3FF] text-[9px] font-bold uppercase rounded border border-[#00A3FF]/20 tracking-widest">Seguridad del Servidor</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">
            Administrador de <span className="text-[#00A3FF]">SSL / TLS</span>
          </h1>
          <p className="text-slate-500 text-[11px] font-bold tracking-widest uppercase mt-2">
            Auto-SSL global con Let's Encrypt y control de certificados Root
          </p>
        </div>
        <div className="flex gap-4 items-center bg-white border border-slate-200 px-5 py-3 rounded-2xl shadow-sm">
           <div className="flex items-center gap-2 text-xs font-black text-[#00A3FF] tracking-widest uppercase">
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
              {Math.round((securedCount / Math.max(1, validDomains.length)) * 100)}% Cobertura
           </div>
           <span className="text-slate-300">|</span>
           <span className="text-slate-500 font-mono text-xs">{validDomains.length - securedCount} Pendientes</span>
        </div>
      </header>

      <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
           <table className="w-full text-left">
              <thead>
                 <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-100 bg-slate-50/30">
                    <th className="px-8 py-5">Dominio (Host)</th>
                    <th className="px-8 py-5">Cuenta</th>
                    <th className="px-8 py-5">Estado de Cifrado</th>
                    <th className="px-8 py-5">Emisor</th>
                    <th className="px-8 py-5 text-right">Operaciones</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {validDomains.map(dom => (
                   <tr key={dom.id} className="hover:bg-slate-50/80 transition-all group duration-300">
                      <td className="px-8 py-5 text-slate-900 font-bold text-lg group-hover:text-[#00A3FF] transition-colors">{dom.domain_name}</td>
                      <td className="px-8 py-5 text-slate-600 font-mono text-xs font-medium">{dom.username}</td>
                      <td className="px-8 py-5">
                        {dom.ssl_enabled ? (
                           <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-600 font-bold text-[9px] uppercase tracking-widest rounded-md flex items-center w-fit gap-1">
                              <span className="material-symbols-outlined text-[14px]">lock</span> Protegido
                           </span>
                        ) : (
                           <span className="px-2.5 py-1 bg-red-50 border border-red-200 text-red-600 font-bold text-[9px] uppercase tracking-widest rounded-md flex items-center w-fit gap-1">
                              <span className="material-symbols-outlined text-[14px]">lock_open</span> Inseguro
                           </span>
                        )}
                      </td>
                      <td className="px-8 py-5 text-slate-500 font-mono text-xs font-medium">
                         {dom.ssl_enabled ? "Let's Encrypt (AutoSSL)" : "Ninguno"}
                      </td>
                      <td className="px-8 py-5 text-right">
                         <button 
                             disabled={dom.ssl_enabled || sslMutation.isPending}
                             onClick={() => sslMutation.mutate(dom.id)}
                             className={`px-5 py-2.5 font-bold uppercase text-[10px] rounded-xl tracking-widest transition-all ${
                               dom.ssl_enabled 
                                 ? 'bg-slate-50 text-slate-400 border border-slate-100 cursor-not-allowed' 
                                 : sslMutation.isPending
                                 ? 'bg-[#00A3FF]/50 text-white cursor-wait'
                                 : 'bg-[#00A3FF] text-white hover:bg-[#008EE0] hover:shadow-lg hover:shadow-[#00A3FF]/20 active:scale-95'
                             }`}
                          >
                             {dom.ssl_enabled ? "Activo" : sslMutation.isPending ? "Emitiendo..." : "AutoSSL"}
                         </button>
                      </td>
                   </tr>
                ))}
                {validDomains.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-slate-500 font-medium italic text-sm">
                      No hay dominios registrados en el sistema.
                    </td>
                  </tr>
                )}
              </tbody>
           </table>
        </div>
      </div>
    </div>
  );
}
