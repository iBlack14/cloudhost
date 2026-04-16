"use client";

import React from "react";
import { useWhmDashboard } from "../../../lib/hooks/use-whm-accounts";

export default function ServerConfigPage() {
  const { data: stats, isLoading } = useWhmDashboard();

  return (
    <div className="space-y-12 max-w-7xl mx-auto">
      <header className="flex justify-between items-end">
        <div className="space-y-1">
          <div className="flex items-center gap-3 mb-1">
             <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-black uppercase rounded border border-primary/20 tracking-widest">
                Core Systems
             </span>
          </div>
          <h1 className="text-6xl font-headline font-black text-white tracking-tighter uppercase italic">
            Server Configuration
          </h1>
          <p className="text-zinc-500 text-sm font-mono tracking-widest mt-1">
            Global infrastructure parameters and real-time hardware telemetry.
          </p>
        </div>
        <div className="flex gap-4">
           <button className="px-6 py-3 bg-white/5 text-zinc-400 rounded-xl font-black font-headline text-[10px] tracking-widest uppercase border border-white/5 hover:text-white transition-all">
              Reboot Terminal
           </button>
           <button className="kinetic-gradient px-8 py-4 rounded-2xl text-white font-black font-headline tracking-widest active:scale-95 transition-all shadow-xl shadow-primary/40 uppercase text-xs">
             Save Config
           </button>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <ConfigCard title="Software Stack" icon="terminal">
            <dl className="space-y-4">
               <ConfigItem label="Operating System" value="Ubuntu 22.04.3 LTS (Jammy)" />
               <ConfigItem label="Kernel Version" value="6.5.0-27-generic" />
               <ConfigItem label="Web Server" value="Nginx/1.24.0 (Odisea Optimized)" />
               <ConfigItem label="PHP Global" value="8.3.4 (FPM/FastCGI)" />
               <ConfigItem label="Node.js Runtime" value="20.11.1 (LTS)" />
            </dl>
         </ConfigCard>

         <ConfigCard title="Hardware Telemetry" icon="memory">
            <div className="space-y-8">
               <TelemetryBar label="CPU Load" value={stats?.server.cpu ?? 0} color="azure" loading={isLoading} />
               <TelemetryBar label="RAM Residency" value={stats?.server.ram ?? 0} color="cyan" loading={isLoading} />
               <TelemetryBar label="Disk Volume" value={stats?.server.disk ?? 0} color="azure" loading={isLoading} />
               
               <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/5">
                  <div>
                     <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block">Processor</span>
                     <span className="text-xs text-zinc-300 font-mono">AMD EPYC™ 9654</span>
                  </div>
                  <div>
                     <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block">Memory</span>
                     <span className="text-xs text-zinc-300 font-mono">128GB ECC DDR5</span>
                  </div>
               </div>
            </div>
         </ConfigCard>

         <ConfigCard title="Network & Security" icon="security">
             <dl className="space-y-4">
               <ConfigItem label="Primary IPv4" value="192.168.1.100" />
               <ConfigItem label="Nameservers" value="ns1.odisea.cloud" />
               <ConfigItem label="Firewall (UFW)" value="Active / Protected" badge="emerald" />
               <ConfigItem label="SSL Global" value="Auto-Renew (LE)" badge="azure" />
               <ConfigItem label="SSH Access" value="Port 22345 / Key Only" />
            </dl>
         </ConfigCard>
      </section>

      <div className="glass-card p-10 relative overflow-hidden group">
         <div className="flex items-center gap-5 mb-8 relative z-10">
            <span className="material-symbols-outlined text-primary text-4xl">dns</span>
            <div>
               <h3 className="text-2xl font-headline font-black text-white uppercase italic tracking-tighter">Global PHP Configuration</h3>
               <p className="text-[10px] text-zinc-500 font-black tracking-widest uppercase">Odisea.ini Management</p>
            </div>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
            <SettingField label="Memory Limit" value="512M" />
            <SettingField label="Max Upload" value="128M" />
            <SettingField label="Post Max Size" value="128M" />
            <SettingField label="Execution Time" value="300s" />
         </div>
      </div>
    </div>
  );
}

function ConfigCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="glass-card p-8 flex flex-col h-full group hover:border-primary/30 transition-all duration-500">
       <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-all">
             <span className="material-symbols-outlined">{icon}</span>
          </div>
          <h3 className="text-xl font-headline font-black text-white tracking-tighter uppercase italic">{title}</h3>
       </div>
       <div className="flex-1">
          {children}
       </div>
    </div>
  );
}

function ConfigItem({ label, value, badge }: { label: string; value: string; badge?: 'emerald' | 'azure' }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/[0.03] last:border-0">
       <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</span>
       {badge ? (
          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border ${
             badge === 'emerald' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' : 'border-primary/30 text-primary bg-primary/5'
          }`}>{value}</span>
       ) : (
          <span className="text-xs text-zinc-100 font-mono tracking-tight">{value}</span>
       )}
    </div>
  );
}

function TelemetryBar({ label, value, color, loading }: { label: string; value: number; color: 'azure' | 'cyan'; loading?: boolean }) {
  return (
    <div className="space-y-2">
       <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
          <span className="text-zinc-500">{label}</span>
          <span className={color === 'azure' ? 'text-primary' : 'text-secondary'}>{loading ? '...' : `${value}%`}</span>
       </div>
       <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
          <div 
             className={`h-full transition-all duration-1000 ease-out ${color === 'azure' ? 'kinetic-gradient shadow-[0_0_10px_rgba(0,163,255,0.4)]' : 'bg-secondary shadow-[0_0_10px_rgba(0,229,255,0.4)]'}`}
             style={{ width: loading ? '0%' : `${value}%` }}
          ></div>
       </div>
    </div>
  );
}

function SettingField({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all flex flex-col gap-2">
       <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{label}</span>
       <input defaultValue={value} className="bg-transparent border-none outline-none text-white font-headline font-black italic text-xl w-full" />
    </div>
  );
}
