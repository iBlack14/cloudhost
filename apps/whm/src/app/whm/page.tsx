"use client";

import React from "react";
import Link from "next/link";
import { useWhmDashboard } from "../../lib/hooks/use-whm-accounts";

const formatUptime = (seconds?: number): string => {
  if (!seconds || seconds <= 0) return "UPTIME: N/A";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `UPTIME: ${days}D ${hours}H`;
  const mins = Math.floor((seconds % 3600) / 60);
  return `UPTIME: ${hours}H ${mins}M`;
};

export default function WhmDashboardPage() {
  const { data: dashboard } = useWhmDashboard();
  const server = dashboard?.server;
  const accounts = dashboard?.accounts;
  const loadBars = server?.loadAvgs?.length ? server.loadAvgs : [0, 0, 0, server?.loadAverage1m ?? 0];
  const peakLoad = Math.max(...loadBars, 0);

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-10 border-b border-white/5 pb-8">
        <div className="flex items-center gap-6">
          <div className="relative flex-shrink-0 group">
             <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/30 transition-all duration-700 opacity-40"></div>
             <img 
               src="/logo.png" 
               alt="Odisea Cloud Logo" 
               className="w-16 h-16 object-contain relative z-10 drop-shadow-[0_0_10px_rgba(0,163,255,0.3)] group-hover:scale-105 transition-transform" 
             />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 mb-0.5">
               <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[8px] font-black uppercase rounded border border-primary/20 tracking-tighter">System Admin</span>
               <span className="text-zinc-600 text-[9px] font-mono tracking-widest font-bold opacity-40">X-ROOT-CORE</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic font-headline">
              Web Host <span className="text-primary not-italic">Manager</span>
            </h1>
          </div>
        </div>
        <div className="flex gap-3">
           <Link href="/whm/accounts/create">
              <button className="px-5 py-2.5 kinetic-gradient text-white rounded-xl font-black text-[10px] tracking-widest uppercase shadow-lg shadow-primary/20 hover:translate-y-[-1px] active:translate-y-0 transition-all border border-white/10">
                 Provision Node
              </button>
           </Link>
           <Link href="/whm/accounts">
              <button className="px-5 py-2.5 bg-white/[0.03] text-zinc-400 rounded-xl font-black text-[10px] tracking-widest uppercase border border-white/5 hover:bg-white/[0.08] hover:text-white transition-all backdrop-blur-md">
                 Account List
              </button>
           </Link>
        </div>
      </header>

      {/* Real-time Stats Refined */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        <StatCard
          label="CPU LOAD"
          value={`${server?.cpu ?? 0}%`}
          desc={`AVG 1M: ${server?.loadAverage1m ?? 0}`}
          icon="memory"
          variant="azure"
        />
        <StatCard
          label="RAM STATUS"
          value={`${server?.ram ?? 0}%`}
          desc={formatUptime(server?.uptimeSeconds)}
          icon="database"
          variant="cyan"
        />
        <StatCard
          label="STORAGE"
          value={`${server?.disk ?? 0}%`}
          desc={`CORES ACTIVE: ${server?.cores ?? 1}`}
          icon="storage"
          variant="azure"
        />
        <StatCard
          label="NODES"
          value={`${accounts?.active ?? 0}`}
          desc={`SUSP: ${accounts?.suspended ?? 0} · OFF: ${accounts?.terminated ?? 0}`}
          icon="group"
          variant="cyan"
        />
      </section>

      {/* Operations Focus Refined */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
         <div className="bg-[#0A1221]/40 backdrop-blur-xl border border-white/5 rounded-2xl p-8 group relative overflow-hidden">
            <div className="flex items-center gap-4 mb-8 relative z-10">
               <div className="w-11 h-11 rounded-xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10 transition-all group-hover:border-primary/30">
                  <span className="material-symbols-outlined text-2xl">add_circle</span>
               </div>
               <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight font-headline">Provisioning Wizard</h3>
                  <p className="text-[9px] text-zinc-500 font-bold tracking-widest uppercase opacity-60">Deploy new instances</p>
               </div>
            </div>
            <div className="space-y-3 relative z-10">
               <Link href="/whm/accounts/create" className="block">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-primary/20 hover:bg-primary/[0.02] transition-all cursor-pointer flex justify-between items-center group/item">
                     <span className="text-xs font-bold text-zinc-300 uppercase tracking-tight">Shared Compute Tier</span>
                     <span className="material-symbols-outlined text-[16px] text-zinc-600 group-hover/item:text-primary transition-colors">arrow_right_alt</span>
                  </div>
               </Link>
               <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 opacity-30 cursor-not-allowed flex justify-between items-center">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-tight">Dedicated Cluster (Enterprise)</span>
                  <span className="material-symbols-outlined text-[16px] text-zinc-600">lock</span>
               </div>
            </div>
         </div>

         <div className="bg-[#0A1221]/40 backdrop-blur-xl border border-white/5 rounded-2xl p-8 relative overflow-hidden group">
            <div className="flex items-center gap-4 mb-8 relative z-10">
               <div className="w-11 h-11 rounded-xl bg-secondary/5 flex items-center justify-center text-secondary border border-secondary/10 transition-all group-hover:border-secondary/30">
                  <span className="material-symbols-outlined text-2xl">insights</span>
               </div>
               <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight font-headline text-secondary">Network Pulse</h3>
                  <p className="text-[9px] text-zinc-500 font-bold tracking-widest uppercase opacity-60">System load visualization</p>
               </div>
            </div>
            <div className="relative z-10 space-y-4">
               <div className="flex items-end gap-2 h-24 px-2">
                  {loadBars.map((value, index) => {
                    const normalized = peakLoad > 0 ? Math.max(15, Math.round((value / peakLoad) * 100)) : 15;
                    const active = index === loadBars.length - 1;
                    return (
                      <div
                        key={`${value}-${index}`}
                        className={`flex-1 rounded-md transition-all duration-500 ${active ? "kinetic-gradient shadow-[0_0_15px_rgba(0,163,255,0.2)]" : "bg-white/[0.03] group-hover:bg-primary/10"}`}
                        style={{ height: `${normalized}%` }}
                      />
                    );
                  })}
               </div>
               <div className="flex justify-between items-center pt-2">
                  <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Real-time Load Metrics</span>
                  <span className="text-[9px] font-mono text-primary font-bold">{server?.loadAverage1m?.toFixed(2)}</span>
               </div>
            </div>
            {/* Abstract Blur Decor */}
            <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-primary/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-primary/10 transition-all duration-1000"></div>
         </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, desc, icon, variant }: { label: string; value: string; desc: string; icon: string; variant: 'azure' | 'cyan' }) {
  const colorClass = variant === 'azure' ? 'text-primary' : 'text-secondary';
  return (
    <div className="bg-[#0A1221]/40 backdrop-blur-xl p-6 rounded-2xl border border-white/5 group hover:border-primary/20 transition-all duration-500 overflow-hidden relative">
      <div className="flex justify-between items-start mb-6 relative z-10">
        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em]">{label}</span>
        <div className={`p-2 rounded-lg bg-white/[0.03] ${colorClass} group-hover:scale-110 transition-transform duration-500`}>
           <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </div>
      </div>
      <div className="relative z-10">
        <div className="text-3xl font-black text-white tracking-tighter italic group-hover:text-primary transition-colors duration-500 font-headline">{value}</div>
        <div className="text-[9px] text-zinc-500 mt-2 font-bold tracking-widest uppercase opacity-40">{desc}</div>
      </div>
      {/* Micro-glow on hover */}
      <div className="absolute inset-0 bg-primary/[0.02] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
    </div>
  );
}
