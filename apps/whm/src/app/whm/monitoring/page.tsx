"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
const getWhmToken = () => typeof window !== "undefined" ? window.sessionStorage.getItem("whm-access-token") : null;
const whmHeaders = (): Record<string, string> => {
  const t = getWhmToken();
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

export default function ServerMonitorPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"resources" | "processes" | "services" | "logs">("resources");

  // --- RESOURCES ---
  const { data: stats } = useQuery({
    queryKey: ["whm_server_stats"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/whm/server/stats`, { headers: whmHeaders() });
      if (!res.ok) throw new Error("Fetch failed");
      return (await res.json()).data;
    },
    refetchInterval: activeTab === "resources" ? 5000 : false,
  });

  // --- PROCESSES ---
  const { data: processes } = useQuery({
    queryKey: ["whm_server_processes"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/whm/server/processes`, { headers: whmHeaders() });
      if (!res.ok) throw new Error("Fetch failed");
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
      if (!res.ok) throw new Error("Kill failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["whm_server_processes"] }),
  });

  // --- SERVICES ---
  const { data: services } = useQuery({
    queryKey: ["whm_server_services"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/whm/server/services`, { headers: whmHeaders() });
      if (!res.ok) throw new Error("Fetch failed");
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
      if (!res.ok) throw new Error("Service action failed");
      return res.json();
    },
    onSuccess: () => {
      alert("Comando ejecutado con éxito.");
      queryClient.invalidateQueries({ queryKey: ["whm_server_services"] });
    },
  });

  // --- LOGS ---
  const [logType, setLogType] = useState<"syslog" | "nginx-access" | "nginx-error">("syslog");
  const { data: logs } = useQuery({
    queryKey: ["whm_server_logs", logType],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/whm/server/logs/${logType}`, { headers: whmHeaders() });
      if (!res.ok) throw new Error("Fetch failed");
      return (await res.json()).data;
    },
    refetchInterval: activeTab === "logs" ? 3000 : false,
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <header className="space-y-1 glass-card p-6 rounded-2xl border-l-4 border-l-primary inline-block">
        <h1 className="text-4xl font-headline font-black text-white tracking-tighter uppercase italic">
          Resource <span className="text-primary">Monitor</span>
        </h1>
        <p className="text-zinc-500 font-mono tracking-widest text-[10px] uppercase">
          Analíticas Telemetría, Procesos y Micro-servicios
        </p>
      </header>

      <div className="flex gap-2 p-1 bg-black/40 rounded-xl w-fit border border-white/5">
        {(["resources", "processes", "services", "logs"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-lg font-black tracking-widest text-[10px] uppercase transition-all ${
              activeTab === tab ? "bg-white/10 text-white shadow-lg" : "text-zinc-500 hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="glass-card p-6 rounded-2xl min-h-[500px]">
        {/* --- RESOURCES TAB --- */}
        {activeTab === "resources" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="p-6 bg-black/30 border border-white/5 rounded-2xl relative overflow-hidden group">
               <div className="flex justify-between items-center mb-6 relative z-10">
                 <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">CPU Usage</span>
                 <span className="material-symbols-outlined text-primary">memory</span>
               </div>
               <div className="text-5xl font-black text-white font-headline tracking-tighter mb-2 relative z-10">
                 {stats?.cpu ?? 0}%
               </div>
               <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden relative z-10">
                 <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${stats?.cpu ?? 0}%` }}></div>
               </div>
               <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-all"></div>
             </div>
             
             <div className="p-6 bg-black/30 border border-white/5 rounded-2xl relative overflow-hidden group">
               <div className="flex justify-between items-center mb-6 relative z-10">
                 <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">RAM Allocation</span>
                 <span className="material-symbols-outlined text-secondary">memory_alt</span>
               </div>
               <div className="text-5xl font-black text-white font-headline tracking-tighter mb-2 relative z-10">
                 {stats?.ram ?? 0}%
               </div>
               <div className="text-xs font-mono text-zinc-500 mb-2 mt-1 relative z-10">
                  {Math.round(((stats?.ramDetails?.total ?? 0) - (stats?.ramDetails?.free ?? 0))/1024/1024/1024)}GB / {Math.round((stats?.ramDetails?.total ?? 0)/1024/1024/1024)}GB
               </div>
               <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden relative z-10">
                 <div className="h-full bg-secondary transition-all duration-1000" style={{ width: `${stats?.ram ?? 0}%` }}></div>
               </div>
               <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-secondary/20 rounded-full blur-3xl group-hover:bg-secondary/30 transition-all"></div>
             </div>
             
             <div className="p-6 bg-black/30 border border-white/5 rounded-2xl relative overflow-hidden group">
               <div className="flex justify-between items-center mb-6 relative z-10">
                 <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Disk Usage</span>
                 <span className="material-symbols-outlined text-amber-500">hard_drive</span>
               </div>
               <div className="text-5xl font-black text-white font-headline tracking-tighter mb-2 relative z-10">
                 {stats?.disk ?? 0}%
               </div>
               <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden relative z-10 mt-6">
                 <div className="h-full bg-amber-500 transition-all duration-1000" style={{ width: `${stats?.disk ?? 0}%` }}></div>
               </div>
               <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl group-hover:bg-amber-500/30 transition-all"></div>
             </div>
             
             <div className="col-span-1 md:col-span-3 mt-4 glass-card p-6">
                <h3 className="text-white font-black uppercase text-sm tracking-widest mb-4">Uptime & Load Average</h3>
                <div className="flex gap-12 font-mono text-zinc-400">
                  <div>
                    <span className="block text-[10px] uppercase text-zinc-600 mb-1 font-black">1m / 5m / 15m</span>
                    {stats?.loadAvgs?.map((l: number) => l.toFixed(2)).join(" , ") || "---"}
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-zinc-600 mb-1 font-black">Uptime (Seconds)</span>
                    {Math.round(stats?.uptime ?? 0)}
                  </div>
                </div>
             </div>
          </div>
        )}

        {/* --- PROCESSES TAB --- */}
        {activeTab === "processes" && (
          <div className="overflow-x-auto">
             <table className="w-full text-left font-mono text-sm table-fixed">
                <thead>
                   <tr className="border-b border-white/10 uppercase text-[10px] tracking-widest text-zinc-500 font-sans font-black">
                      <th className="p-3 w-20">PID</th>
                      <th className="p-3 w-24">User</th>
                      <th className="p-3 w-20">CPU%</th>
                      <th className="p-3 w-20">MEM%</th>
                      <th className="p-3 truncate">Command</th>
                      <th className="p-3 w-24 text-right">Kill</th>
                   </tr>
                </thead>
                <tbody>
                   {processes?.map((proc: any) => (
                      <tr key={proc.pid} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                         <td className="p-3 text-zinc-300">{proc.pid}</td>
                         <td className="p-3 text-zinc-400"><span className="px-2 py-0.5 bg-white/5 rounded text-xs">{proc.user}</span></td>
                         <td className="p-3 text-zinc-300">{proc.cpu}</td>
                         <td className="p-3 text-zinc-300">{proc.mem}</td>
                         <td className="p-3 text-zinc-500 truncate" title={proc.command}>{proc.command}</td>
                         <td className="p-3 text-right">
                            <button 
                               onClick={() => { if(confirm(`Kill process ${proc.pid}?`)) killMutation.mutate(proc.pid) }}
                               className="text-red-500 hover:bg-red-500/20 px-2 py-1 rounded transition-colors"
                            >
                               <span className="material-symbols-outlined text-[18px]">gavel</span>
                            </button>
                         </td>
                      </tr>
                   ))}
                   {!processes?.length && <tr><td colSpan={6} className="p-4 text-center">Loading...</td></tr>}
                </tbody>
             </table>
          </div>
        )}

        {/* --- SERVICES TAB --- */}
        {activeTab === "services" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {services?.map((svc: any) => (
               <div key={svc.name} className="bg-black/30 p-5 rounded-xl border border-white/5 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                     <span className="text-white font-black italic tracking-tighter text-lg">{svc.name}</span>
                     <span className={`w-3 h-3 rounded-full ${svc.status === 'active' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : svc.status === 'inactive' ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                     <button onClick={() => serviceMutation.mutate({name: svc.name, action: "restart"})} className="flex-1 py-2 bg-white/5 text-[10px] font-black tracking-widest text-zinc-300 uppercase rounded hover:bg-white/10 transition-colors">Restart</button>
                     <button onClick={() => serviceMutation.mutate({name: svc.name, action: "reload"})} className="flex-1 py-2 bg-white/5 text-[10px] font-black tracking-widest text-zinc-300 uppercase rounded hover:bg-white/10 transition-colors">Reload</button>
                     <button onClick={() => serviceMutation.mutate({name: svc.name, action: "stop"})} className="w-10 flex items-center justify-center bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded transition-colors">
                        <span className="material-symbols-outlined text-[16px]">stop</span>
                     </button>
                  </div>
               </div>
             ))}
          </div>
        )}

        {/* --- LOGS TAB --- */}
        {activeTab === "logs" && (
          <div className="h-full flex flex-col">
             <div className="flex gap-2 mb-4">
               {(["syslog", "nginx-access", "nginx-error"]).map(type => (
                 <button 
                    key={type} 
                    onClick={() => setLogType(type as any)}
                    className={`px-4 py-1.5 text-[10px] font-black tracking-widest uppercase rounded border ${logType === type ? 'border-primary text-primary bg-primary/10' : 'border-white/10 text-zinc-500 hover:border-white/20'}`}
                 >
                    {type}
                 </button>
               ))}
             </div>
             
             <div className="flex-1 bg-black p-4 rounded-xl border border-white/5 overflow-y-auto max-h-[600px] font-mono text-[11px] leading-relaxed text-zinc-400 custom-scrollbar whitespace-pre">
               {logs?.map((line: string, i: number) => (
                  <div key={i}>{line}</div>
               )) || "Cargando cola del registro..."}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
