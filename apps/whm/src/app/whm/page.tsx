"use client";

import React from "react";
import Link from "next/link";
import { useWhmDashboard } from "../../lib/hooks/use-whm-accounts";
import { UpdateWidget } from "../../components/update-widget";

const formatUptime = (seconds?: number): string => {
  if (!seconds || seconds <= 0) return "UPTIME: N/A";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `ACTIVO: ${days}d ${hours}h`;
  const mins = Math.floor((seconds % 3600) / 60);
  return `ACTIVO: ${hours}h ${mins}m`;
};

export default function WhmDashboardPage() {
  const { data: dashboard } = useWhmDashboard();
  const server = dashboard?.server;
  const accounts = dashboard?.accounts;
  const loadBars = server?.loadAvgs?.length ? server.loadAvgs : [0, 0, 0, server?.loadAverage1m ?? 0];
  const peakLoad = Math.max(...loadBars, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-1000 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-5 relative z-10 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0 group transition-transform duration-500 hover:scale-105">
             <div className="absolute inset-0 bg-[#00A3FF]/10 rounded-full blur-2xl group-hover:bg-[#00A3FF]/20 transition-all duration-700 opacity-40"></div>
             <img 
               src="/logo.png" 
               alt="Odisea Cloud Logo" 
               className="w-11 h-11 object-contain relative z-10 drop-shadow-md" 
             />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-[#00A3FF]/10 text-[#00A3FF] text-[8px] font-bold uppercase rounded-full tracking-wider">Administrador</span>
                <div className="h-1 w-1 rounded-full bg-slate-300"></div>
                <span className="text-slate-500 text-[8px] font-mono tracking-widest uppercase font-bold">X-ROOT-CORE</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              Panel de <span className="text-[#00A3FF]">Control</span>
            </h1>
            <p className="text-slate-500 text-[11px] font-medium">Resumen del estado y gestión de su infraestructura.</p>
          </div>
        </div>
        <div className="flex gap-2">
           <Link href="/whm/accounts/create">
              <button className="px-4 py-2.5 bg-[#00A3FF] text-white rounded-xl font-bold text-[9px] tracking-widest uppercase hover:bg-[#008EE0] transition-all shadow-md shadow-[#00A3FF]/20 active:scale-95">
                 Crear Cuenta
              </button>
           </Link>
           <Link href="/whm/accounts">
              <button className="px-4 py-2.5 bg-white text-slate-700 rounded-xl font-bold text-[9px] tracking-widest uppercase border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm active:scale-95">
                 Ver Cuentas
              </button>
           </Link>
        </div>
      </header>

      <UpdateWidget />

      {/* Real-time Stats Refined */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        <StatCard
          label="USO DE CPU"
          value={`${server?.cpu ?? 0}%`}
          desc={`CARGA 1M: ${server?.loadAverage1m ?? 0}`}
          icon="memory"
        />
        <StatCard
          label="MEMORIA RAM"
          value={`${server?.ram ?? 0}%`}
          desc={formatUptime(server?.uptimeSeconds)}
          icon="database"
        />
        <StatCard
          label="ALMACENAMIENTO"
          value={`${server?.disk ?? 0}%`}
          desc={`${server?.cores ?? 1} NÚCLEOS ACTIVOS`}
          icon="storage"
        />
        <StatCard
          label="CUENTAS"
          value={`${accounts?.active ?? 0}`}
          desc={`SUSP: ${accounts?.suspended ?? 0} · OFF: ${accounts?.terminated ?? 0}`}
          icon="group"
        />
      </section>

      {/* Operations Focus Refined */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 relative z-10">
         <div className="bg-white border border-slate-200 rounded-2xl p-5 group relative overflow-hidden transition-all hover:border-[#00A3FF]/20 shadow-sm">
            <div className="flex items-center gap-3.5 mb-4 relative z-10">
               <div className="w-9 h-9 rounded-xl bg-[#00A3FF]/5 flex items-center justify-center text-[#00A3FF] border border-[#00A3FF]/10 transition-all group-hover:scale-110 group-hover:border-[#00A3FF]/30">
                  <span className="material-symbols-outlined text-lg">add_circle</span>
               </div>
               <div>
                  <h3 className="text-base font-black text-slate-900 uppercase leading-none">Nueva Cuenta</h3>
                  <p className="text-[9px] text-slate-500 font-bold tracking-widest uppercase mt-1">Crear nuevo servicio</p>
               </div>
            </div>
            <div className="space-y-2 relative z-10">
               <Link href="/whm/accounts/create" className="block">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-[#00A3FF]/30 hover:bg-[#00A3FF]/5 transition-all cursor-pointer flex justify-between items-center group/item">
                     <span className="text-xs font-bold text-slate-800 uppercase">Servicio Estándar</span>
                     <span className="material-symbols-outlined text-[16px] text-slate-500 group-hover/item:text-[#00A3FF] group-hover/item:translate-x-1 transition-all">arrow_right_alt</span>
                  </div>
               </Link>
               <div className="p-3.5 rounded-xl bg-slate-50/50 border border-slate-100 opacity-40 cursor-not-allowed flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase">Clúster Empresarial</span>
                  <span className="material-symbols-outlined text-[16px] text-slate-400">lock</span>
               </div>
            </div>
         </div>

         <div className="bg-white border border-slate-200 rounded-2xl p-5 relative overflow-hidden group transition-all hover:border-[#00A3FF]/20 shadow-sm">
            <div className="flex items-center gap-3.5 mb-4 relative z-10">
               <div className="w-9 h-9 rounded-xl bg-[#00A3FF]/5 flex items-center justify-center text-[#00A3FF] border border-[#00A3FF]/10 transition-all group-hover:scale-110 group-hover:border-[#00A3FF]/30">
                  <span className="material-symbols-outlined text-lg">insights</span>
               </div>
               <div>
                  <h3 className="text-base font-black text-slate-900 uppercase leading-none">Carga del Sistema</h3>
                  <p className="text-[9px] text-slate-500 font-bold tracking-widest uppercase mt-1">Métricas en tiempo real</p>
               </div>
            </div>
            <div className="relative z-10 space-y-3">
               <div className="flex items-end gap-2 h-20 px-1">
                  {loadBars.map((value, index) => {
                    const normalized = peakLoad > 0 ? Math.max(15, Math.round((value / peakLoad) * 100)) : 15;
                    const active = index === loadBars.length - 1;
                    return (
                      <div
                        key={`${value}-${index}`}
                        className={`flex-1 rounded-md transition-all duration-700 ${active ? "bg-[#00A3FF] shadow-md shadow-[#00A3FF]/20 scale-105" : "bg-slate-100 group-hover:bg-[#00A3FF]/10"}`}
                        style={{ height: `${normalized}%` }}
                      />
                    );
                  })}
               </div>
               <div className="flex justify-between items-center pt-2 px-1 border-t border-slate-50">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Actividad Reciente</span>
                  <div className="flex items-center gap-1.5">
                     <span className="text-xs font-black text-[#00A3FF]">{server?.loadAverage1m?.toFixed(2)}</span>
                     <span className="text-[8px] font-bold text-slate-400 uppercase">Avg</span>
                  </div>
               </div>
            </div>
         </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, desc, icon }: { label: string; value: string; desc: string; icon: string }) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 group hover:border-[#00A3FF]/40 transition-all duration-500 relative overflow-hidden shadow-sm hover:shadow-md">
      <div className="flex justify-between items-start mb-3 relative z-10">
        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
        <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 group-hover:text-[#00A3FF] group-hover:bg-[#00A3FF]/10 transition-all duration-500 border border-slate-100 group-hover:border-[#00A3FF]/20">
          <span className="material-symbols-outlined text-[16px]">{icon}</span>
        </div>
      </div>
      <div className="relative z-10">
        <div className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1.5">{value}</div>
        <div className="text-[9px] text-slate-600 font-bold tracking-tight uppercase flex items-center gap-1.5">
          <div className="w-1 h-1 rounded-full bg-[#00A3FF]"></div>
          {desc}
        </div>
      </div>
      {/* Subtle brand tint */}
      <div className="absolute -right-8 -bottom-8 w-20 h-20 bg-[#00A3FF]/5 blur-[40px] rounded-full group-hover:bg-[#00A3FF]/10 transition-all duration-700"></div>
    </div>
  );
}
