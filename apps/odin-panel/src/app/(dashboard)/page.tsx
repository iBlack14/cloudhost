"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
const getOdinToken = () => typeof window !== "undefined" ? window.sessionStorage.getItem("odin-access-token") : null;
const odinHeaders = (): Record<string, string> => {
  const t = getOdinToken();
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

export default function UserDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["user_dashboard_stats"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/odin/dashboard`, { headers: odinHeaders() });
      if (!res.ok) throw new Error("Fallo al cargar");
      return (await res.json()).data;
    }
  });

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center p-24 bg-white border border-slate-200 rounded-[3rem] animate-pulse">
      <div className="w-12 h-12 border-4 border-slate-100 border-t-[#00A3FF] rounded-full animate-spin mb-4"></div>
      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Sincronizando Dashboard...</p>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 mb-1">
             <span className="px-2.5 py-1 bg-[#00A3FF]/10 text-[#00A3FF] text-[10px] font-bold uppercase rounded-full tracking-wider">
                Infraestructura Activa
             </span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 uppercase">
            Panel de <span className="text-[#00A3FF]">Control</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-2">
            Bienvenido a tu terminal de servicios en la nube de Odisea Cloud.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
         <StatCard title="Sitios Web" value={stats?.domainsCount || 0} icon="language" color="#00A3FF" />
         <StatCard title="Bases de Datos" value={stats?.databasesCount || 0} icon="database" color="#8B5CF6" />
         <StatCard title="Correos Activos" value={stats?.emailsCount || 0} icon="alternate_email" color="#F59E0B" />
         <StatCard title="Uso de Disco" value={`${stats?.diskUsageMb || 0} MB`} icon="hard_drive" color="#10B981" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
         {/* Usage & Limits */}
         <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[3rem] p-12 shadow-sm relative overflow-hidden group">
             <div className="relative z-10">
                <h3 className="text-xl font-black text-slate-900 uppercase mb-10 flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-[#00A3FF]">
                      <span className="material-symbols-outlined">bar_chart</span>
                   </div>
                   Consumo de Recursos
                </h3>
                <div className="space-y-10">
                   <ProgressBar label="Almacenamiento NVMe" used={stats?.diskUsageMb || 0} total={stats?.diskLimitMb || 1024} unit="MB" color="#00A3FF" />
                   <ProgressBar label="Ancho de Banda" used={stats?.bandwidthUsedGb || 0} total={stats?.bandwidthLimitGb || 100} unit="GB" color="#8B5CF6" />
                   <ProgressBar label="Cuentas de Correo" used={stats?.emailsCount || 0} total={stats?.emailLimit || 10} unit="Cuentas" color="#F59E0B" />
                </div>
             </div>
             <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-slate-50 blur-[120px] rounded-full pointer-events-none"></div>
         </div>

         {/* Quick Actions / Plan Info */}
         <div className="bg-slate-900 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden group flex flex-col">
            <div className="relative z-10 flex flex-col h-full space-y-10">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-[#00A3FF] border border-white/10 shadow-inner">
                     <span className="material-symbols-outlined text-2xl">workspace_premium</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Tu Plan</h3>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Suscripción Activa</p>
                  </div>
               </div>
               
               <div>
                  <div className="text-3xl font-black text-[#00A3FF] uppercase tracking-tighter mb-2">Empresarial Pro</div>
                  <div className="inline-flex px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Expira: 24 May 2025
                  </div>
               </div>

               <div className="space-y-4 pt-10 mt-auto">
                  <button className="w-full py-5 bg-[#00A3FF] text-white font-black uppercase text-[11px] tracking-widest rounded-2xl shadow-xl shadow-[#00A3FF]/20 hover:bg-[#008EE0] active:scale-[0.98] transition-all">
                     Mejorar Plan
                  </button>
                  <button className="w-full py-5 bg-white/5 border border-white/10 text-slate-400 font-black uppercase text-[11px] tracking-widest rounded-2xl hover:bg-white/10 hover:text-white transition-all">
                     Soporte VIP 24/7
                  </button>
               </div>
            </div>
            {/* Dark Mode Accents */}
            <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(0,163,255,0.1),transparent)] pointer-events-none"></div>
            <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-[#00A3FF]/10 blur-[100px] rounded-full pointer-events-none"></div>
         </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: string | number; icon: string; color: string }) {
  return (
    <div className="bg-white border border-slate-200 p-10 rounded-[2.5rem] shadow-sm group hover:border-[#00A3FF]/30 transition-all duration-500 relative overflow-hidden">
       <div className="relative z-10 flex flex-col gap-6">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:scale-110 group-hover:bg-white group-hover:shadow-lg transition-all duration-500" style={{ color }}>
             <span className="material-symbols-outlined text-4xl">{icon}</span>
          </div>
          <div>
             <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{title}</div>
             <div className="text-4xl font-black text-slate-900 tracking-tighter">{value}</div>
          </div>
       </div>
       <div className="absolute -bottom-16 -right-16 w-40 h-40 rounded-full blur-[80px] opacity-10 group-hover:opacity-20 transition-all duration-700" style={{ backgroundColor: color }}></div>
    </div>
  );
}

function ProgressBar({ label, used, total, unit, color }: { label: string; used: number; total: number; unit: string; color: string }) {
  const percent = Math.min(100, Math.round((used / (total || 1)) * 100));
  return (
    <div className="space-y-4">
       <div className="flex justify-between items-end px-1">
          <div className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{label}</div>
          <div className="text-[11px] font-black text-slate-400">
             <span className="text-slate-900">{used} {unit}</span> <span className="mx-1 opacity-40">/</span> {total} {unit}
          </div>
       </div>
       <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner p-1">
          <div 
            className="h-full rounded-full transition-all duration-1000 ease-out shadow-sm relative overflow-hidden" 
            style={{ width: `${percent}%`, backgroundColor: color }}
          >
             <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-pulse"></div>
          </div>
       </div>
    </div>
  );
}
