"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
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
      if (!res.ok) throw new Error(data?.error?.message ?? "Error fetching domains");
      return data.data;
    },
  });

  if (isLoading) return <div className="text-white">Cargando DNS Zone Manager...</div>;
  if (error) return <div className="text-red-500 font-bold">Error: {(error as Error).message}</div>;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
       <header className="space-y-1 glass-card p-6 rounded-2xl border-l-4 border-l-primary inline-block">
          <h1 className="text-4xl font-headline font-black text-white tracking-tighter uppercase italic">
            DNS Zone <span className="text-primary">Manager</span>
          </h1>
          <p className="text-zinc-500 font-mono tracking-widest text-[10px] uppercase">
            Administración global de zonas DNS BIND9
          </p>
       </header>

       <div className="glass-card p-6 rounded-2xl">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="border-b border-white/10 uppercase text-[10px] tracking-widest text-zinc-500 font-black">
                     <th className="p-3">Domain</th>
                     <th className="p-3">Owner</th>
                     <th className="p-3">Provider</th>
                     <th className="p-3 text-right">Actions</th>
                  </tr>
               </thead>
               <tbody>
                 {domains?.map(dom => (
                    <tr key={dom.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                       <td className="p-3 text-white font-bold text-lg">{dom.domain_name}</td>
                       <td className="p-3 text-zinc-400 font-mono text-xs">{dom.username}</td>
                       <td className="p-3 text-zinc-500 font-mono text-xs uppercase">{dom.dns_provider}</td>
                       <td className="p-3 text-right">
                          <Link href={`/whm/domains/${dom.id}`} className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary font-black uppercase text-[10px] rounded tracking-widest transition-colors">
                             Edit Zone
                          </Link>
                       </td>
                    </tr>
                 ))}
                 {domains?.length === 0 && (
                   <tr>
                     <td colSpan={4} className="p-10 text-center text-zinc-500">No hay dominios registrados en el sistema.</td>
                   </tr>
                 )}
               </tbody>
            </table>
         </div>
       </div>
    </div>
  );
}
