"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
const getWhmToken = () => typeof window !== "undefined" ? window.sessionStorage.getItem("whm-access-token") : null;
const whmHeaders = (): Record<string, string> => {
  const t = getWhmToken();
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

export default function ServerMonitorPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"resources" | "processes" | "services" | "accounts" | "logs">("resources");

  // --- RESOURCES ---
  const { data: stats } = useQuery({
    queryKey: ["whm_server_stats"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/whm/server/stats`, { headers: whmHeaders() });
      if (!res.ok) throw new Error("Fallo al obtener estadísticas");
      return (await res.json()).data;
    },
    refetchInterval: activeTab === "resources" ? 5000 : false,
  });

  // --- PROCESSES ---
  const { data: processes } = useQuery({
    queryKey: ["whm_server_processes"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/whm/server/processes`, { headers: whmHeaders() });
      if (!res.ok) throw new Error("Fallo al obtener procesos");
      return (await res.json()).data;
    },
    refetchInterval: activeTab === "processes" ? 5000 : false,
  });

  const killMutation = useMutation({
    mutationFn: async (pid: string) => {
      const res = await fetch(`${API_BASE}/whm/server/processes/${pid}`, {
        method: "DELETE",
        headers: whmHeaders()
      });
      if (!res.ok) throw new Error("Fallo al finalizar proceso");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["whm_server_processes"] }),
  });

  // --- SERVICES ---
  const { data: services } = useQuery({
    queryKey: ["whm_server_services"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/whm/server/services`, { headers: whmHeaders() });
      if (!res.ok) throw new Error("Fallo al obtener servicios");
      return (await res.json()).data;
    },
    refetchInterval: activeTab === "services" ? 10000 : false,
  });

  const serviceMutation = useMutation({
    mutationFn: async ({ name, action }: { name: string; action: string }) => {
      const res = await fetch(`${API_BASE}/whm/server/services/${name}/${action}`, {
        method: "POST",
        headers: whmHeaders()
      });
      if (!res.ok) throw new Error("Fallo en la acción del servicio");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whm_server_services"] });
    },
  });

  // --- ACCOUNTS MONITORING ---
  const { data: accounts } = useQuery({
    queryKey: ["whm_monitoring_accounts"],
    queryFn: async () => {
       const res = await fetch(`${API_BASE}/whm/accounts`, { headers: whmHeaders() });
       return (await res.json()).data;
    },
    enabled: activeTab === "accounts"
  });

  // --- LOGS ---
  const [logType, setLogType] = useState<"syslog" | "nginx-access" | "nginx-error">("syslog");
  const { data: logs } = useQuery({
    queryKey: ["whm_server_logs", logType],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/whm/server/logs/${logType}`, { headers: whmHeaders() });
      if (!res.ok) throw new Error("Fallo al obtener logs");
      return (await res.json()).data;
    },
    refetchInterval: activeTab === "logs" ? 3000 : false,
  });

  return (
    <div className="space-y-12 animate-in fade-in duration-700 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 mb-1">
             <span className="px-2.5 py-1 bg-[#00A3FF]/10 text-[#00A3FF] text-[10px] font-bold uppercase rounded-full tracking-wider">
                Telemetría en Vivo
             </span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 uppercase">
            Monitor de <span className="text-[#00A3FF]">Recursos</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-2">
            Seguimiento en tiempo real de hardware, procesos y servicios del sistema.
          </p>
        </div>
      </header>

      <div className="flex flex-wrap gap-3 p-1.5 bg-slate-100 rounded-2xl w-fit border border-slate-200 shadow-inner">
        {(["resources", "accounts", "processes", "services", "logs"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-8 py-3 rounded-xl font-bold tracking-widest text-[10px] uppercase transition-all ${
              activeTab === tab 
              ? "bg-white text-[#00A3FF] shadow-md" 
              : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {tab === "resources" ? "Hardware" : tab === "accounts" ? "Cuentas" : tab === "processes" ? "Procesos" : tab === "services" ? "Servicios" : "Logs"}
          </button>
        ))}
      </div>

      <div className="min-h-[500px]">
        {/* --- RESOURCES TAB --- */}
        {activeTab === "resources" && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               <StatCard title="Uso de CPU" value={stats?.cpu ?? 0} color="#00A3FF" icon="memory" />
               <StatCard title="Memoria RAM" value={stats?.ram ?? 0} color="#8B5CF6" icon="memory_alt" 
                 subtitle={`${Math.round(((stats?.ramDetails?.total ?? 0) - (stats?.ramDetails?.free ?? 0))/1024/1024/1024)}GB / ${Math.round((stats?.ramDetails?.total ?? 0)/1024/1024/1024)}GB`}
               />
               <StatCard title="Espacio en Disco" value={stats?.disk ?? 0} color="#F59E0B" icon="hard_drive" />
            </div>
            
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm">
               <h3 className="text-slate-900 font-black uppercase text-sm tracking-widest mb-8 flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-300">timer</span>
                  Tiempo de Actividad y Carga
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-2">
                    <span className="block text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">Carga Promedio (1m / 5m / 15m)</span>
                    <div className="flex gap-4">
                       {stats?.loadAvgs?.map((l: number, i: number) => (
                          <div key={i} className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-800">
                             {l.toFixed(2)}
                          </div>
                       )) || <span className="text-slate-300">---</span>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <span className="block text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">Uptime Total</span>
                    <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl font-bold text-[#00A3FF] inline-block">
                       {Math.round(stats?.uptime ?? 0)} segundos
                    </div>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* --- ACCOUNTS TAB --- */}
        {activeTab === "accounts" && (
          <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm animate-in slide-in-from-bottom-4 duration-500">
             <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-slate-900 font-black uppercase text-xs tracking-widest">Uso de Recursos por Cuenta</h3>
                <span className="px-3 py-1 bg-[#00A3FF]/10 text-[#00A3FF] rounded-lg text-[10px] font-bold uppercase tracking-widest">En Vivo</span>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead>
                      <tr className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400 font-bold border-b border-slate-100">
                         <th className="px-8 py-5">Usuario</th>
                         <th className="px-8 py-5">Dominio</th>
                         <th className="px-8 py-5">Cuota de Disco</th>
                         <th className="px-8 py-5">Uso Estimado</th>
                         <th className="px-8 py-5 text-right">Estado</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {accounts?.map((acc: any) => (
                         <tr key={acc.id} className="hover:bg-slate-50/50 transition-all">
                            <td className="px-8 py-5 text-slate-900 font-bold">{acc.username}</td>
                            <td className="px-8 py-5 text-slate-500 font-medium text-sm">{acc.domain}</td>
                            <td className="px-8 py-5">
                               <div className="flex flex-col gap-1.5 w-40">
                                  <div className="flex justify-between text-[9px] font-bold uppercase text-slate-400">
                                     <span>Uso</span>
                                     <span>{acc.disk_usage || "0"}MB / {acc.disk_limit || "∞"}</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                     <div className="h-full bg-[#00A3FF]" style={{ width: `${Math.min(100, (acc.disk_usage / (acc.disk_limit || 1)) * 100)}%` }}></div>
                                  </div>
                               </div>
                            </td>
                            <td className="px-8 py-5">
                               <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                  <span className="text-xs font-bold text-slate-600 uppercase">Saludable</span>
                                </div>
                            </td>
                            <td className="px-8 py-5 text-right">
                               <span className="text-[10px] font-black uppercase text-[#00A3FF] tracking-widest">Optimizado</span>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {/* --- PROCESSES TAB --- */}
        {activeTab === "processes" && (
          <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm animate-in slide-in-from-bottom-4 duration-500">
             <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-sm">
                   <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 uppercase text-[10px] tracking-widest text-slate-400 font-sans font-bold">
                         <th className="px-8 py-5 w-24">PID</th>
                         <th className="px-8 py-5 w-32">Usuario</th>
                         <th className="px-8 py-5 w-24">CPU%</th>
                         <th className="px-8 py-5 w-24">MEM%</th>
                         <th className="px-8 py-5">Comando</th>
                         <th className="px-8 py-5 w-24 text-right">Acción</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {processes?.map((proc: any) => (
                         <tr key={proc.pid} className="hover:bg-slate-50/50 transition-all group">
                            <td className="px-8 py-4 text-slate-900 font-bold">{proc.pid}</td>
                            <td className="px-8 py-4"><span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase">{proc.user}</span></td>
                            <td className="px-8 py-4 text-[#00A3FF] font-black">{proc.cpu}%</td>
                            <td className="px-8 py-4 text-slate-700 font-bold">{proc.mem}%</td>
                            <td className="px-8 py-4 text-slate-400 text-xs truncate max-w-md" title={proc.command}>{proc.command}</td>
                            <td className="px-8 py-4 text-right">
                               <button 
                                  onClick={() => { if(confirm(`¿Finalizar proceso ${proc.pid}?`)) killMutation.mutate(proc.pid) }}
                                  className="w-8 h-8 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center"
                               >
                                  <span className="material-symbols-outlined text-[18px]">gavel</span>
                               </button>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {/* --- SERVICES TAB --- */}
        {activeTab === "services" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
             {services?.map((svc: any) => (
               <div key={svc.name} className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm flex flex-col gap-6 group hover:border-[#00A3FF]/30 transition-all duration-300">
                  <div className="flex justify-between items-start">
                     <div>
                        <span className="text-slate-900 font-black tracking-tight text-xl block">{svc.name}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-[0.2em] mt-1 block ${svc.status === 'active' ? 'text-emerald-500' : 'text-amber-500'}`}>
                           {svc.status === 'active' ? '● Ejecutando' : '● Detenido'}
                        </span>
                     </div>
                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${svc.status === 'active' ? 'bg-emerald-50 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white' : 'bg-amber-50 text-amber-500'}`}>
                        <span className="material-symbols-outlined text-2xl">{svc.status === 'active' ? 'settings_backup_restore' : 'warning'}</span>
                     </div>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={() => serviceMutation.mutate({name: svc.name, action: "restart"})} className="flex-1 py-3 bg-slate-50 text-[10px] font-black tracking-widest text-slate-500 uppercase rounded-xl hover:bg-[#00A3FF] hover:text-white transition-all shadow-sm">Reiniciar</button>
                     <button onClick={() => serviceMutation.mutate({name: svc.name, action: "reload"})} className="flex-1 py-3 bg-slate-50 text-[10px] font-black tracking-widest text-slate-500 uppercase rounded-xl hover:bg-[#00A3FF] hover:text-white transition-all shadow-sm">Recargar</button>
                     <button onClick={() => serviceMutation.mutate({name: svc.name, action: "stop"})} className="w-12 h-[42px] flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">stop</span>
                     </button>
                  </div>
               </div>
             ))}
          </div>
        )}

        {/* --- LOGS TAB --- */}
        {activeTab === "logs" && (
          <div className="h-full flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-500">
             <div className="flex flex-wrap gap-2">
               {(["syslog", "nginx-access", "nginx-error"]).map(type => (
                 <button 
                    key={type} 
                    onClick={() => setLogType(type as any)}
                    className={`px-6 py-2.5 text-[10px] font-black tracking-widest uppercase rounded-xl border transition-all ${logType === type ? 'border-[#00A3FF] text-[#00A3FF] bg-[#00A3FF]/5 shadow-sm' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}
                 >
                    {type}
                 </button>
               ))}
             </div>
             
             <div className="flex-1 bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 overflow-y-auto max-h-[600px] font-mono text-[12px] leading-relaxed text-slate-400 shadow-2xl custom-scrollbar">
               {logs?.map((line: string, i: number) => (
                  <div key={i} className="mb-1 border-l-2 border-slate-800 pl-4 hover:border-[#00A3FF] hover:text-slate-200 transition-colors">{line}</div>
               )) || <div className="flex items-center gap-3"><div className="w-4 h-4 border-2 border-slate-700 border-t-white rounded-full animate-spin"></div> Cargando registros del sistema...</div>}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, color, icon, subtitle }: { title: string; value: number; color: string; icon: string; subtitle?: string }) {
  return (
    <div className="bg-white border border-slate-200 p-10 rounded-[2.5rem] relative overflow-hidden group hover:border-slate-300 transition-all shadow-sm">
       <div className="flex justify-between items-start mb-8 relative z-10">
         <div>
            <h4 className="text-[11px] uppercase font-black tracking-[0.2em] text-slate-400 mb-1">{title}</h4>
            <div className="text-5xl font-black text-slate-900 tracking-tighter">
              {value}%
            </div>
            {subtitle && <p className="text-[10px] font-bold text-slate-400 mt-2 font-mono">{subtitle}</p>}
         </div>
         <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-500" style={{ color }}>
            <span className="material-symbols-outlined text-3xl">{icon}</span>
         </div>
       </div>
       <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden relative z-10 shadow-inner">
         <div 
           className="h-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(0,0,0,0.1)]" 
           style={{ width: `${value}%`, backgroundColor: color }}
         ></div>
       </div>
       <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full blur-[80px] pointer-events-none transition-all duration-1000 group-hover:scale-150" style={{ backgroundColor: `${color}10` }}></div>
    </div>
  );
}
