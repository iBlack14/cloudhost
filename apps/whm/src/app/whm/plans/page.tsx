"use client";

import React from "react";
import Link from "next/link";
import { useWhmPlans } from "../../../lib/hooks/use-whm-accounts";

export default function WhmPlansPage() {
  const { data: plans = [], isLoading, isError } = useWhmPlans();

  return (
    <div className="space-y-12 max-w-7xl mx-auto">
      <header className="flex justify-between items-end">
        <div className="space-y-1">
          <div className="flex items-center gap-3 mb-1">
             <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-black uppercase rounded border border-primary/20 tracking-widest">
                Service Tiers
             </span>
          </div>
          <h1 className="text-6xl font-headline font-black text-white tracking-tighter uppercase italic">
            Packages & Plans
          </h1>
          <p className="text-zinc-500 text-sm font-mono tracking-widest mt-1">
            Configure system-wide resource allocations and billing tiers.
          </p>
        </div>
        <button className="kinetic-gradient px-8 py-4 rounded-2xl text-white font-black font-headline tracking-widest active:scale-95 transition-all shadow-xl shadow-primary/40 uppercase text-xs">
          + Create New Tier
        </button>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {[1, 2, 3].map(i => (
              <div key={i} className="glass-card h-96 p-8 animate-pulse flex flex-col justify-between">
                 <div className="space-y-4">
                    <div className="h-4 w-1/3 bg-white/5 rounded"></div>
                    <div className="h-8 w-2/3 bg-white/5 rounded"></div>
                 </div>
                 <div className="h-32 w-full bg-white/5 rounded"></div>
              </div>
           ))}
        </div>
      ) : isError ? (
        <div className="p-20 glass-card text-center">
           <span className="material-symbols-outlined text-4xl text-red-500 mb-4">warning</span>
           <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Failed to synchronize plan clusters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div key={plan.id} className="glass-card p-10 group hover:translate-y-[-8px] transition-all duration-500 relative overflow-hidden flex flex-col">
              <div className="flex justify-between items-start mb-12 relative z-10">
                <div>
                   <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] block mb-2">Technical Alias: {plan.id.split('-')[0]}</span>
                   <h3 className="text-3xl font-headline font-black text-white italic tracking-tighter group-hover:text-primary transition-colors">{plan.name}</h3>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 text-primary group-hover:bg-primary group-hover:text-black transition-all">
                   <span className="material-symbols-outlined">settings_suggest</span>
                </div>
              </div>

              <div className="space-y-6 flex-1 relative z-10">
                 <ResourceItem label="Disk Quote" value={`${plan.disk_quota_mb / 1024} GB`} detail="NVMe Gen 5 Storage" />
                 <ResourceItem label="Bandwidth" value={plan.bandwidth_mb === -1 ? 'Unlimited' : `${plan.bandwidth_mb / 1024} GB`} detail="Global Edge CDN" />
                 <ResourceItem label="Nodes Allowed" value="Single Instance" detail="Isolated Container" />
              </div>

              <div className="mt-12 pt-8 border-t border-white/5 flex justify-between items-center relative z-10">
                 <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Active nodes: 12</span>
                 <button className="text-primary text-[10px] font-black uppercase tracking-widest hover:underline">Edit Tier Config</button>
              </div>

              {/* Decorative Glow */}
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-primary/5 blur-[100px] rounded-full pointer-events-none group-hover:bg-primary/10 transition-all duration-700"></div>
            </div>
          ))}
          
          <div className="glass-card p-10 border-dashed border-2 border-white/10 flex flex-col items-center justify-center text-center group cursor-pointer hover:border-primary/50 transition-all">
             <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-all">
                <span className="material-symbols-outlined text-zinc-500 group-hover:text-primary">add</span>
             </div>
             <h3 className="text-sm font-black text-zinc-200 uppercase tracking-[0.2em]">New Infrastructure Package</h3>
             <p className="text-[10px] text-zinc-500 mt-2 uppercase tracking-tight">Define custom limits for new tenants</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ResourceItem({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="flex justify-between items-center bg-white/[0.02] p-4 rounded-2xl border border-white/5 hover:bg-white/[0.04] transition-all">
       <div>
          <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest block">{label}</span>
          <span className="text-white font-headline font-bold text-lg">{value}</span>
       </div>
       <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-tighter self-end mb-1">{detail}</span>
    </div>
  );
}
