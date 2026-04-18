"use client";

import { useQuery } from "@tanstack/react-query";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
const getWhmToken = () => typeof window !== "undefined" ? window.sessionStorage.getItem("whm-access-token") : null;
const whmHeaders = () => {
  const t = getWhmToken();
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

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

  if (isLoading) return <div className="text-white">Cargando SSL/TLS Manager...</div>;
  if (error) return <div className="text-red-500 font-bold">Error: {(error as Error).message}</div>;

  const validDomains = domains || [];
  const securedCount = validDomains.filter(d => d.ssl_enabled).length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
       <header className="space-y-4">
          <div className="glass-card p-6 rounded-2xl border-l-4 border-secondary inline-block">
             <h1 className="text-4xl font-headline font-black text-white tracking-tighter uppercase italic">
               SSL / TLS <span className="text-secondary">Manager</span>
             </h1>
             <p className="text-zinc-500 font-mono tracking-widest text-[10px] uppercase">
               Auto-SSL global con Let's Encrypt y control de certificados Root.
             </p>
          </div>
          <div className="flex gap-4 items-center pl-2">
             <div className="flex items-center gap-2 text-xs font-black text-secondary tracking-widest uppercase">
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
                {Math.round((securedCount / Math.max(1, validDomains.length)) * 100)}% Cobertura
             </div>
             <span className="text-zinc-600">|</span>
             <span className="text-zinc-400 font-mono text-xs">{validDomains.length - securedCount} Pending issuance</span>
          </div>
       </header>

       <div className="glass-card p-6 rounded-2xl">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="border-b border-white/10 uppercase text-[10px] tracking-widest text-zinc-500 font-black">
                     <th className="p-3">Domain (Host)</th>
                     <th className="p-3">Account</th>
                     <th className="p-3">Encryption Status</th>
                     <th className="p-3">Issuer</th>
                     <th className="p-3 text-right">Actions</th>
                  </tr>
               </thead>
               <tbody>
                 {validDomains.map(dom => (
                    <tr key={dom.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                       <td className="p-3 text-white font-bold text-lg">{dom.domain_name}</td>
                       <td className="p-3 text-zinc-400 font-mono text-xs">{dom.username}</td>
                       <td className="p-3">
                         {dom.ssl_enabled ? (
                            <span className="px-2 py-1 bg-secondary/10 border border-secondary/20 text-secondary font-black text-[9px] uppercase tracking-widest rounded-md flex items-center w-fit gap-1">
                               <span className="material-symbols-outlined text-[14px]">lock</span> Secured
                            </span>
                         ) : (
                            <span className="px-2 py-1 bg-red-500/10 border border-red-500/20 text-red-400 font-black text-[9px] uppercase tracking-widest rounded-md flex items-center w-fit gap-1">
                               <span className="material-symbols-outlined text-[14px]">lock_open</span> Insecure
                            </span>
                         )}
                       </td>
                       <td className="p-3 text-zinc-500 font-mono text-xs">
                          {dom.ssl_enabled ? "Let's Encrypt (AutoSSL)" : "None"}
                       </td>
                       <td className="p-3 text-right">
                          <button 
                             disabled={dom.ssl_enabled}
                             onClick={() => alert("Función protegida. Loguéate como usuario para emitir o actualiza permisos.")}
                             className={`px-4 py-2 font-black uppercase text-[10px] rounded tracking-widest transition-colors ${dom.ssl_enabled ? 'bg-white/5 text-zinc-600 cursor-not-allowed' : 'bg-primary text-black hover:bg-white'}`}
                          >
                             {dom.ssl_enabled ? "Active" : "Force Issue"}
                          </button>
                       </td>
                    </tr>
                 ))}
                 {validDomains.length === 0 && (
                   <tr>
                     <td colSpan={5} className="p-10 text-center text-zinc-500">No hay dominios registrados en el sistema.</td>
                   </tr>
                 )}
               </tbody>
            </table>
         </div>
       </div>
    </div>
  );
}
