"use client";

import React from "react";

export default function Page() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 glass-sidebar fixed inset-y-0 left-0 z-50 p-6 flex flex-col">
        <div className="mb-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 relative flex-shrink-0">
               {/* Simulating logo with a cyan glow-box for now, or imagine the actual logo here */}
               <div className="absolute inset-0 bg-primary/20 rounded-lg blur-md"></div>
               <img src="/logo.png" alt="NexHost Logo" className="w-full h-full object-contain relative z-10" />
            </div>
            <h2 className="text-2xl font-black tracking-tighter text-white font-headline italic">
              NEXHOST
            </h2>
          </div>
          <p className="text-[10px] text-primary/60 uppercase tracking-widest mt-2 ml-10 font-bold">
            Cloud Infrastructure
          </p>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem icon="dashboard" label="Dashboard" active />
          <NavItem icon="dns" label="Servers" />
          <NavItem icon="cloud" label="Applications" />
          <NavItem icon="storage" label="Volumes" />
          <NavItem icon="lan" label="Networks" />
          <NavItem icon="shield" label="Security" />
        </nav>

        <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
          <button className="kinetic-gradient w-full py-3 rounded-xl text-white font-black font-headline tracking-tight active:scale-95 transition-all shadow-lg shadow-primary/30">
            PROVISION CLUSTER
          </button>
          <div className="flex items-center gap-3 px-4 py-2 text-zinc-400 hover:text-primary transition-all cursor-pointer text-sm font-headline tracking-tight">
            <span className="material-symbols-outlined text-sm">settings</span>
            <span>Configurations</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-12">
          <div className="space-y-1">
            <h1 className="text-5xl font-headline font-black text-white tracking-tighter uppercase italic">
              SYSTEM CONSOLE
            </h1>
            <div className="flex items-center gap-3">
               <span className="text-primary font-mono text-[10px] tracking-[0.2em]">NODE: NEX-CLOUD-01</span>
               <div className="h-px w-12 bg-white/10"></div>
               <span className="text-zinc-500 font-mono text-[10px] tracking-[0.2em]">REGION: US-BLUE-EAST</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 px-4 py-2 rounded-full">
              <span className="w-2 h-2 rounded-full bg-primary pulse-glow"></span>
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Core Status: Stable</span>
            </div>
            <div className="w-10 h-10 rounded-full border border-white/10 bg-surface flex items-center justify-center text-primary overflow-hidden">
               <span className="material-symbols-outlined">account_circle</span>
            </div>
          </div>
        </header>

        {/* Stats Grid - Logo Inspired Colors */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard 
            label="Compute Load" 
            value="12.4%" 
            detail="Delta: -0.2% (Steady)" 
            icon="memory"
            variant="azure"
          />
          <StatCard 
            label="Storage Velocity" 
            value="892 MB/s" 
            detail="NVMe Gen 5 Active" 
            icon="speed"
            variant="cyan"
          />
          <StatCard 
            label="Active Connections" 
            value="42,019" 
            detail="Global Edge Traffic" 
            icon="hub"
            variant="azure"
          />
        </section>

        {/* Console & Sidebar Splith */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Logs */}
          <div className="lg:col-span-3 glass-card p-8 border-l-4 border-l-primary/30">
            <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-sm">terminal</span>
                <h3 className="font-headline font-black text-lg text-white uppercase tracking-tight">Real-time Stream</h3>
              </div>
              <span className="text-[10px] font-bold text-zinc-500 hover:text-secondary transition-colors cursor-pointer tracking-widest bg-white/5 px-3 py-1 rounded-full">REFRESH FEED</span>
            </div>
            <div className="space-y-4 font-body">
              <LogItem time="14:22:01" msg="Scaling-Group 'NexNode' expanded: node_04 deployed." type="Auto-Scale" success />
              <LogItem time="14:18:55" msg="SSL Certificate auto-renewed for nexhost.cloud" type="Security" success />
              <LogItem time="14:12:40" msg="DDoS Mitigation: Blocked 12k packets from 45.122.x.x" type="Defense" alert />
              <LogItem time="13:59:12" msg="Database 'OdinCore' optimized. Latency reduced by 15ms." type="Engine" success />
            </div>
          </div>

          {/* Quick Connect */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="font-headline font-black text-lg text-white uppercase italic tracking-tighter">Instant Provisioning</h3>
            <div className="space-y-4">
              <DeployCard title="LAMBDA CLUSTER" desc="Serverless execution nodes" icon="electric_bolt" />
              <item className="block h-px bg-white/5"></item>
              <DeployCard title="GLOBAL CDN" desc="Edge-cached static assets" icon="public" />
              <item className="block h-px bg-white/5"></item>
              <DeployCard title="SECURE SHELL" desc="Direct terminal encrypted link" icon="code" />
            </div>
          </div>
        </div>
      </main>

      {/* Corporate Celestial Orbs */}
      <div className="fixed bottom-[-100px] right-[-100px] w-[600px] h-[600px] bg-primary/10 blur-[150px] pointer-events-none -z-10 rounded-full animate-pulse"></div>
      <div className="fixed top-[-50px] left-[-50px] w-[400px] h-[400px] bg-secondary/5 blur-[120px] pointer-events-none -z-10 rounded-full"></div>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: string; label: string; active?: boolean }) {
  return (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 cursor-pointer group ${
      active ? 'bg-primary/10 text-primary border-l-4 border-primary font-black shadow-[inset_0_0_20px_rgba(0,163,255,0.05)]' : 'text-zinc-500 hover:text-white hover:bg-white/5'
    }`}>
      <span className={`material-symbols-outlined text-[20px] ${active ? 'neon-text' : 'group-hover:text-primary transition-colors'}`}>{icon}</span>
      <span className="font-headline tracking-tighter text-sm uppercase">{label}</span>
    </div>
  );
}

function StatCard({ label, value, detail, icon, variant }: { label: string; value: string; detail: string; icon: string; variant: 'azure' | 'cyan' }) {
  const colorClass = variant === 'azure' ? 'text-primary' : 'text-secondary';
  return (
    <div className="glass-card p-6 group hover:translate-y-[-4px] hover:border-primary/30 transition-all duration-500 overflow-hidden relative">
      <div className="flex justify-between items-start mb-6 relative z-10">
        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{label}</span>
        <div className={`p-2 rounded-lg bg-white/5 ${colorClass}`}>
           <span className="material-symbols-outlined text-[22px]">{icon}</span>
        </div>
      </div>
      <div className="relative z-10">
        <div className="text-4xl font-headline font-black text-white tracking-tighter italic">{value}</div>
        <div className="text-[10px] text-zinc-600 mt-2 font-mono tracking-widest">{detail}</div>
      </div>
      {/* Background Glow */}
      <div className={`absolute -bottom-10 -right-10 w-32 h-32 blur-[60px] opacity-20 rounded-full transition-all duration-700 group-hover:scale-150 ${variant === 'azure' ? 'bg-primary' : 'bg-secondary'}`}></div>
    </div>
  );
}

function LogItem({ time, msg, type, success = false, alert = false }: { time: string; msg: string; type: string; success?: boolean; alert?: boolean }) {
  let colorClass = "text-zinc-500 border-zinc-500/30";
  if (success) colorClass = "text-primary border-primary/40 bg-primary/5";
  if (alert) colorClass = "text-red-400 border-red-500/40 bg-red-400/5";

  return (
    <div className="flex items-center gap-4 py-1 group">
      <span className="text-zinc-700 font-mono text-[10px] w-16">{time}</span>
      <p className="text-[13px] text-zinc-400 flex-1 line-clamp-1 group-hover:text-white transition-colors">{msg}</p>
      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${colorClass}`}>
        {type}
      </span>
    </div>
  );
}

function DeployCard({ title, desc, icon }: { title: string; desc: string; icon: string }) {
  return (
    <div className="p-4 rounded-xl hover:bg-white/5 transition-all cursor-pointer border border-transparent hover:border-white/5 flex items-center gap-5 group">
      <div className="p-3 rounded-xl bg-surface-container text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-black transition-all shadow-lg">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div>
        <h4 className="font-headline font-black text-sm text-white tracking-tight">{title}</h4>
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
