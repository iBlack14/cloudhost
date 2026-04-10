"use client";

import React from "react";
import Link from "next/link";

export default function Page() {
  return (
    <div className="flex min-h-screen overflow-hidden">
      {/* Sidebar WHM */}
      <aside className="w-72 glass-sidebar fixed inset-y-0 left-0 z-50 p-6 flex flex-col border-r border-[#00A3FF]/10">
        <div className="mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 relative flex-shrink-0 group">
               <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:bg-primary/40 transition-all"></div>
               <img src="/logo.png" alt="NexHost Logo" className="w-full h-full object-contain relative z-10" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tighter text-white font-headline">
                NEXHOST <span className="text-primary italic font-black">WHM</span>
              </h2>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#00A3FF]"></span>
                <span className="text-[9px] text-zinc-500 uppercase font-black tracking-[0.2em]">Service: Active</span>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          <NavItem icon="dashboard" label="Console Overview" active />
          <NavItem icon="group" label="Account Manager" />
          <NavItem icon="person_add" label="Create New Account" />
          <NavItem icon="settings_suggest" label="Packages & Tiers" />
          <NavItem icon="dns" label="Server Config" />
          <NavItem icon="security" label="Security Center" />
          <NavItem icon="monitoring" label="Resource Monitor" />
        </nav>

        <div className="mt-auto pt-6 border-t border-white/5 space-y-4 font-headline uppercase tracking-tighter">
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
             <div className="flex justify-between text-[10px] font-black text-zinc-500 mb-2">
                <span>Kernel v6.5.0-x</span>
                <span>US-EAST-01</span>
             </div>
             <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full w-2/3 kinetic-gradient"></div>
             </div>
          </div>
          <button className="flex items-center justify-center gap-3 w-full py-3 rounded-xl bg-white/5 text-zinc-400 hover:text-white transition-all text-xs font-black">
            <span className="material-symbols-outlined text-sm">logout</span>
            Exit Console
          </button>
        </div>
      </aside>

      {/* Main Content WHM */}
      <main className="flex-1 ml-72 p-12 relative">
        <header className="flex justify-between items-end mb-16 relative z-10">
          <div className="flex items-center gap-6">
            {/* Logo in Header instead of text/beside text */}
            <div className="w-20 h-20 relative flex-shrink-0 group">
               <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/40 transition-all animate-pulse"></div>
               <img src="/logo.png" alt="NexHost Logo" className="w-full h-full object-contain relative z-10" />
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
             <button className="px-8 py-4 kinetic-gradient text-white rounded-2xl font-black font-headline text-xs tracking-widest uppercase shadow-xl shadow-primary/30 hover:scale-105 transition-all outline outline-1 outline-white/20">
                Crear Cuenta
             </button>
             <button className="px-8 py-4 bg-white/5 text-zinc-300 rounded-2xl font-black font-headline text-xs tracking-widest uppercase border border-white/10 hover:bg-white/10 transition-all backdrop-blur-md">
                Gestionar Cuentas
             </button>
          </div>
        </header>

        {/* Real-time Stats Refined */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16 relative z-10">
          <StatCard label="CPU CHARGE" value="31%" desc="STABLE (10M AVG)" icon="memory" variant="azure" />
          <StatCard label="RAM RESIDENT" value="62%" desc="12.4 GB ACTIVE" icon="database" variant="cyan" />
          <StatCard label="DISK VOLUME" value="48%" desc="NVME-RAY-01" icon="storage" variant="azure" />
          <StatCard label="ACTIVE NODES" value="120" desc="HEALTHY CLUSTER" icon="group" variant="cyan" />
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
                 <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/30 transition-all cursor-pointer flex justify-between items-center group/item">
                    <span className="text-sm font-black text-zinc-200 uppercase tracking-tighter">Shared Hosting Tier</span>
                    <span className="material-symbols-outlined text-sm text-zinc-500 group-hover/item:text-primary transition-colors">arrow_right_alt</span>
                 </div>
                 <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/30 transition-all cursor-pointer flex justify-between items-center group/item">
                    <span className="text-sm font-black text-zinc-200 uppercase tracking-tighter">Dedicated VM / VPS Cluster</span>
                    <span className="material-symbols-outlined text-sm text-zinc-500 group-hover/item:text-primary transition-colors">arrow_right_alt</span>
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
                    <div className="flex-1 h-1/2 bg-white/5 rounded-lg hover:bg-primary/20 transition-all"></div>
                    <div className="flex-1 h-3/4 bg-white/5 rounded-lg hover:bg-primary/30 transition-all"></div>
                    <div className="flex-1 h-2/3 bg-white/5 rounded-lg hover:bg-primary/25 transition-all"></div>
                    <div className="flex-1 h-full kinetic-gradient rounded-lg shadow-[0_0_15px_rgba(0,163,255,0.2)]"></div>
                    <div className="flex-1 h-4/5 bg-white/5 rounded-lg hover:bg-primary/20 transition-all"></div>
                    <div className="flex-1 h-1/2 bg-white/5 rounded-lg hover:bg-primary/10 transition-all"></div>
                 </div>
                 <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] text-center">Peak Velocity: 1.2 GB/S</p>
              </div>
              {/* Absctract Blur Decor */}
              <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none group-hover:bg-primary/20 transition-all duration-1000"></div>
           </div>
        </section>

        {/* Global Starfield Background Layer (already in globals.css) */}
      </main>

      {/* Corporate Celestial Orbs */}
      <div className="fixed bottom-[-150px] right-[-150px] w-[800px] h-[800px] bg-primary/5 blur-[180px] pointer-events-none -z-10 rounded-full animate-pulse"></div>
      <div className="fixed top-[-100px] left-[50vw] w-[400px] h-[400px] bg-secondary/3 blur-[120px] pointer-events-none -z-10 rounded-full"></div>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: string; label: string; active?: boolean }) {
  return (
    <div className={`flex items-center gap-5 px-5 py-3.5 rounded-2xl transition-all duration-300 cursor-pointer group ${
      active ? 'bg-primary/10 text-primary border-r-4 border-primary font-black shadow-[inset_0_0_20px_rgba(0,163,255,0.05)]' : 'text-zinc-500 hover:text-white hover:bg-white/5'
    }`}>
      <span className={`material-symbols-outlined text-[24px] ${active ? 'neon-text' : 'group-hover:text-primary transition-colors'}`}>{icon}</span>
      <span className="font-headline tracking-tighter text-sm uppercase font-black">{label}</span>
    </div>
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
