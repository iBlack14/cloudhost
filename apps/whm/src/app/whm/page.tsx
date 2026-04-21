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
    <>
      <header className="flex justify-between items-end mb-16 relative z-10">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 relative flex-shrink-0 group">
             <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/40 transition-all animate-pulse"></div>
             <img src="/logo.png" alt="Odisea Cloud Logo" className="w-full h-full object-contain relative z-10" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-1">
               <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-black uppercase rounded border border-primary/20">ODISEA CLOUD · SYSTEM ADMIN</span>
               <span className="text-zinc-600 text-[10px] font-mono tracking-widest font-bold">X-ROOT-TERMINAL</span>
            </div>
            <h1 className="text-6xl font-headline font-black text-white tracking-tighter uppercase italic">
              WEB HOST MANAGER
            </h1>
          </div>
        </div>
        <div className="flex gap-4">
           <Link href="/whm/accounts/create">
              <button className="px-8 py-4 kinetic-gradient text-white rounded-2xl font-black font-headline text-xs tracking-widest uppercase shadow-xl shadow-primary/30 hover:scale-105 transition-all outline outline-1 outline-white/20">
                 Crear Cuenta
              </button>
           </Link>
           <Link href="/whm/accounts">
              <button className="px-8 py-4 bg-white/5 text-zinc-300 rounded-2xl font-black font-headline text-xs tracking-widest uppercase border border-white/10 hover:bg-white/10 transition-all backdrop-blur-md">
                 Gestionar Cuentas
              </button>
           </Link>
        </div>
      </header>

      {/* Real-time Stats Refined */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16 relative z-10">
        <StatCard
          label="CPU CHARGE"
          value={`${server?.cpu ?? 0}%`}
          desc={`LOAD 1M: ${server?.loadAverage1m ?? 0}`}
          icon="memory"
          variant="azure"
        />
        <StatCard
          label="RAM RESIDENT"
          value={`${server?.ram ?? 0}%`}
          desc={formatUptime(server?.uptimeSeconds)}
          icon="database"
          variant="cyan"
        />
        <StatCard
          label="DISK VOLUME"
          value={`${server?.disk ?? 0}%`}
          desc={`CORES: ${server?.cores ?? 1}`}
          icon="storage"
          variant="azure"
        />
        <StatCard
          label="ACTIVE NODES"
          value={`${accounts?.active ?? 0}`}
          desc={`SUSP: ${accounts?.suspended ?? 0} · TERM: ${accounts?.terminated ?? 0}`}
          icon="group"
          variant="cyan"
        />
      </section>

      {/* Operations Focus Refined */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
         <div className="glass-card p-10 group relative overflow-hidden">
            <div className="flex items-center gap-5 mb-10 relative z-10">
               <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 font-bold group-hover:scale-110 transition-all shadow-[0_0_20px_rgba(0,163,255,0.1)]">
                  <span className="material-symbols-outlined text-4xl">add_circle</span>
               </div>
               <div>
                  <h3 className="text-2xl font-headline font-black text-white uppercase tracking-tight">Provisioning Wizard</h3>
                  <p className="text-[10px] text-zinc-500 font-black tracking-widest">DEPLOY NEW TENANTS IN REAL-TIME</p>
               </div>
            </div>
            <div className="space-y-4 relative z-10">
               <Link href="/whm/accounts/create" className="block">
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/30 transition-all cursor-pointer flex justify-between items-center group/item">
                     <span className="text-sm font-black text-zinc-200 uppercase tracking-tighter">Shared Hosting Tier</span>
                     <span className="material-symbols-outlined text-sm text-zinc-500 group-hover/item:text-primary transition-colors">arrow_right_alt</span>
                  </div>
               </Link>
               <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/30 transition-all cursor-pointer flex justify-between items-center group/item opacity-50">
                  <span className="text-sm font-black text-zinc-200 uppercase tracking-tighter">Dedicated VM / VPS Cluster (Coming soon)</span>
                  <span className="material-symbols-outlined text-sm text-zinc-500">lock</span>
               </div>
            </div>
         </div>

         <div className="glass-card p-10 relative overflow-hidden group">
            <div className="flex items-center gap-5 mb-10 relative z-10">
               <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/20 font-bold group-hover:scale-110 transition-all shadow-[0_0_20px_rgba(0,229,255,0.1)]">
                  <span className="material-symbols-outlined text-4xl">insights</span>
               </div>
               <div>
                  <h3 className="text-2xl font-headline font-black text-white uppercase tracking-tight text-secondary">Network Pulse</h3>
                  <p className="text-[10px] text-zinc-500 font-black tracking-widest uppercase">UPTIME MONITORING & TRAFFIC</p>
               </div>
            </div>
            <div className="relative z-10 space-y-6">
               <div className="flex items-end gap-3 h-32 px-4">
                  {loadBars.map((value, index) => {
                    const normalized = peakLoad > 0 ? Math.max(18, Math.round((value / peakLoad) * 100)) : 18;
                    const active = index === loadBars.length - 1;
                    return (
                      <div
                        key={`${value}-${index}`}
                        className={`flex-1 rounded-lg transition-all ${active ? "kinetic-gradient shadow-[0_0_15px_rgba(0,163,255,0.2)]" : "bg-white/5 hover:bg-primary/20"}`}
                        style={{ height: `${normalized}%` }}
                      />
                    );
                  })}
               </div>
               <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] text-center">
                 Load avgs: {loadBars.map((value) => value.toFixed(2)).join(" · ")}
               </p>
            </div>
            {/* Absctract Blur Decor */}
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none group-hover:bg-primary/20 transition-all duration-1000"></div>
         </div>
      </section>
    </>
  );
}

function StatCard({ label, value, desc, icon, variant }: { label: string; value: string; desc: string; icon: string; variant: 'azure' | 'cyan' }) {
  const colorClass = variant === 'azure' ? 'text-primary' : 'text-secondary';
  return (
    <div className="glass-card p-8 border-l-4 border-l-primary/10 group hover:border-l-primary transition-all duration-700 overflow-hidden relative">
      <div className="flex justify-between items-start mb-8 relative z-10">
        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">{label}</span>
        <div className={`p-2.5 rounded-xl bg-white/5 ${colorClass} group-hover:scale-110 transition-transform`}>
           <span className="material-symbols-outlined text-[22px]">{icon}</span>
        </div>
      </div>
      <div className="relative z-10">
        <div className="text-4xl font-headline font-black text-white tracking-tighter italic group-hover:neon-text transition-all duration-500">{value}</div>
        <div className="text-[10px] text-zinc-500 mt-3 font-black tracking-widest uppercase opacity-70">{desc}</div>
      </div>
    </div>
  );
}
