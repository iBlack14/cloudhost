"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { fetchWhmDomains } from "../../../lib/api";

export default function WhmDomainsPage() {
  const [domains, setDomains] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await fetchWhmDomains();
        setDomains(data);
      } catch (err) {
        console.error("Failed to load global domains", err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-12">
      <header className="flex justify-between items-end">
        <div className="space-y-1">
          <div className="flex items-center gap-3 mb-1">
             <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-black uppercase rounded border border-primary/20 tracking-widest">
                Global DNS Authority
             </span>
          </div>
          <h1 className="text-6xl font-headline font-black text-white tracking-tighter uppercase italic">
            Domain <span className="text-zinc-600">Control Plane</span>
          </h1>
          <p className="text-zinc-500 text-sm font-mono tracking-widest mt-1">
            Orchestrating nameserver propagation and global zone distribution.
          </p>
        </div>
        <button className="kinetic-gradient px-8 py-4 rounded-2xl text-white font-black font-headline tracking-widest active:scale-95 transition-all shadow-xl shadow-primary/40 uppercase text-xs flex items-center gap-3">
           <span className="material-symbols-outlined text-sm">settings_ethernet</span>
           Global NS Config
        </button>
      </header>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <StatsBox label="Total Registered" value={domains.length} sub="Across all accounts" />
         <StatsBox label="Active Zones" value={domains.filter(d => d.status === 'active').length} sub="Healthy propagation" />
         <StatsBox label="Pending SSL" value={domains.filter(d => !d.ssl_enabled).length} sub="Requires attention" />
      </div>

      {/* Domains Table */}
      <div className="glass-card overflow-hidden">
         <table className="w-full text-left border-collapse">
            <thead>
               <tr className="bg-white/5 border-b border-white/5">
                  <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Domain Asset</th>
                  <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Account Owner</th>
                  <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Status / Heath</th>
                  <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Infrastructure</th>
                  <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Actions</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
               {isLoading ? (
                 <tr>
                    <td colSpan={5} className="py-20 text-center animate-pulse">
                       <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">Synching with Network Nodes...</p>
                    </td>
                 </tr>
               ) : domains.length === 0 ? (
                 <tr>
                    <td colSpan={5} className="py-20 text-center">
                       <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">No domains found in cluster</p>
                    </td>
                 </tr>
               ) : (
                 domains.map((domain) => (
                   <tr key={domain.id} className="hover:bg-white/[0.01] transition-all group">
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-600 group-hover:text-primary transition-colors">
                               <span className="material-symbols-outlined text-sm">language</span>
                            </div>
                            <div>
                               <p className="text-white font-headline font-black italic uppercase tracking-tighter">{domain.domain_name}</p>
                               <p className="text-[9px] text-zinc-600 font-mono tracking-tighter">ID: {domain.id.split('-')[0]}</p>
                            </div>
                         </div>
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm text-zinc-700">person</span>
                            <span className="text-zinc-400 font-bold text-xs uppercase tracking-tight">{domain.owner_name}</span>
                         </div>
                      </td>
                      <td className="px-8 py-6">
                         <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                           domain.status === 'active' ? 'border-green-500/30 text-green-400 bg-green-500/5' : 'border-amber-500/30 text-amber-400 bg-amber-500/5'
                         }`}>
                           {domain.status}
                         </span>
                      </td>
                      <td className="px-8 py-6">
                         <div className="space-y-1">
                            <div className="flex items-center gap-2">
                               <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">SSL:</span>
                               <span className={`text-[10px] font-bold ${domain.ssl_enabled ? 'text-primary' : 'text-zinc-700'}`}>
                                 {domain.ssl_enabled ? 'FORTIFIED' : 'VULNERABLE'}
                               </span>
                            </div>
                            <div className="flex items-center gap-2">
                               <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">DNS:</span>
                               <span className="text-[10px] font-bold text-zinc-500 uppercase">{domain.dns_provider}</span>
                            </div>
                         </div>
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <Link href={`/whm/domains/${domain.id}`} className="p-2.5 rounded-lg border border-white/5 bg-white/5 text-zinc-500 hover:text-white hover:border-primary/50 transition-all">
                               <span className="material-symbols-outlined text-sm">edit</span>
                            </Link>
                            <button className="p-2.5 rounded-lg border border-white/5 bg-white/5 text-zinc-500 hover:text-primary hover:border-primary/50 transition-all">
                               <span className="material-symbols-outlined text-sm">troubleshoot</span>
                            </button>
                         </div>
                      </td>
                   </tr>
                 ))
               )}
            </tbody>
         </table>
      </div>
    </div>
  );
}

function StatsBox({ label, value, sub }: { label: string; value: number | string; sub: string }) {
  return (
    <div className="glass-card p-8 bg-white/[0.01] hover:border-primary/20 transition-all group">
       <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-4">{label}</p>
       <h4 className="text-5xl font-headline font-black text-white italic tracking-tighter uppercase leading-none group-hover:text-primary transition-colors">{value}</h4>
       <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-4">{sub}</p>
    </div>
  );
}
