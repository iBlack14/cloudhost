"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
const getToken = () => typeof window !== "undefined" ? window.sessionStorage.getItem("odin-access-token") : null;
const authHeaders = (): Record<string, string> => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

export default function NodejsAppsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newApp, setNewApp] = useState({ name: "", version: "20", path: "/home/apps/mi-api", script: "index.js", domain: "", port: "3000" });

  const { data: apps, isLoading } = useQuery({
    queryKey: ["odin_nodejs_apps"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/odin-panel/nodejs`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Load failed");
      return (await res.json()).data;
    },
    refetchInterval: 5000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...newApp, port: parseInt(newApp.port, 10) };
      const res = await fetch(`${API_BASE}/odin-panel/nodejs`, { 
         method: "POST", headers: authHeaders(), body: JSON.stringify(payload) 
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Error creating app");
      return data;
    },
    onSuccess: () => {
      setShowCreate(false);
      setNewApp({ name: "", version: "20", path: "/home/apps/mi-api", script: "index.js", domain: "", port: "3000" });
      queryClient.invalidateQueries({ queryKey: ["odin_nodejs_apps"] });
    },
    onError: (e: any) => alert(e.message)
  });

  const manageMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      const res = await fetch(`${API_BASE}/odin-panel/nodejs/${id}/${action}`, { method: "POST", headers: authHeaders() });
      if (!res.ok) throw new Error("Action failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["odin_nodejs_apps"] })
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/odin-panel/nodejs/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["odin_nodejs_apps"] })
  });

  if (isLoading) return <div className="p-10 text-white">Loading PM2 Cluster data...</div>;

  return (
    <div className="space-y-8 max-w-6xl">
      <header className="flex justify-between items-end">
        <div className="space-y-4">
          <h1 className="text-5xl font-headline font-black text-white tracking-tighter uppercase italic flex items-center gap-4">
            Node.js <span className="text-emerald-500">App Engine</span>
          </h1>
          <p className="text-zinc-500 font-mono tracking-widest text-[10px] uppercase">
            Despliega PM2 Wrappers, API Rest o SSR Frameworks instantáneamente.
          </p>
        </div>
        <button 
           onClick={() => setShowCreate(!showCreate)}
           className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 font-black text-[10px] uppercase tracking-widest transition-all rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)]"
        >
          {showCreate ? "Cancel" : "+ Build New App"}
        </button>
      </header>

      {showCreate && (
         <div className="glass-card p-8 rounded-2xl border border-emerald-500/20 bg-zinc-900 animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none -z-10"></div>
            <h3 className="text-emerald-500 font-black uppercase text-xl italic tracking-tighter mb-6">Application Topology</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block mb-2">App Name</label>
                  <input type="text" value={newApp.name} onChange={e => setNewApp({...newApp, name: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:border-emerald-500 outline-none" placeholder="api-v1" />
               </div>
               <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block mb-2">Node.js Version (NVM)</label>
                  <select value={newApp.version} onChange={e => setNewApp({...newApp, version: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:border-emerald-500 outline-none appearance-none">
                     <option value="18">Node.js 18.x (LTS)</option>
                     <option value="20">Node.js 20.x (LTS)</option>
                     <option value="22">Node.js 22.x (Current)</option>
                  </select>
               </div>
               <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block mb-2">Application Root Path</label>
                  <input type="text" value={newApp.path} onChange={e => setNewApp({...newApp, path: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:border-emerald-500 outline-none" />
               </div>
               <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block mb-2">Application Startup File</label>
                  <input type="text" value={newApp.script} onChange={e => setNewApp({...newApp, script: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:border-emerald-500 outline-none" />
               </div>
               <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block mb-2">Target Domain (Reverse Proxy)</label>
                  <input type="text" value={newApp.domain} onChange={e => setNewApp({...newApp, domain: e.target.value})} placeholder="api.midominio.com" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:border-emerald-500 outline-none" />
               </div>
               <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block mb-2">Internal Port allocation</label>
                  <input type="number" value={newApp.port} onChange={e => setNewApp({...newApp, port: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:border-emerald-500 outline-none" />
               </div>
            </div>

            <button 
              disabled={createMutation.isPending || !newApp.name || !newApp.domain}
              onClick={() => createMutation.mutate()}
              className="mt-8 bg-white hover:bg-emerald-500 transition-colors text-black font-black uppercase tracking-widest text-[10px] px-8 py-3 rounded-xl disabled:opacity-50"
            >
              Provision Environment
            </button>
         </div>
      )}

      {apps?.length === 0 && !showCreate ? (
        <div className="p-20 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-zinc-800 text-6xl mb-6">javascript</span>
            <h4 className="text-sm font-black text-zinc-500 uppercase tracking-widest">Aún no hay Node.js Apps</h4>
            <p className="text-[10px] text-zinc-700 mt-2 uppercase tracking-widest">Empieza a desplegar servidores de alto rendimiento usando PM2 Native.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
           {apps?.map((app: any) => (
             <div key={app.id} className="glass-card p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6 group hover:border-emerald-500/20 transition-all border border-white/5">
                <div className="flex gap-6 items-center w-full md:w-auto">
                   <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-emerald-600 transition-all group-hover:bg-emerald-500/10">
                      <span className="material-symbols-outlined text-3xl">javascript</span>
                   </div>
                   <div>
                      <h3 className="text-2xl font-headline font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                        {app.name} 
                        <span className={`w-2 h-2 rounded-full ${app.status === 'online' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : app.status === 'stopping' || app.status === 'stopped' ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                      </h3>
                      <div className="flex gap-4 mt-2">
                         <span className="text-[10px] font-mono text-zinc-500 tracking-widest">
                           Port: <strong className="text-zinc-300">{app.port}</strong>
                         </span>
                         <span className="text-[10px] font-mono text-zinc-500 tracking-widest">
                           Node: <strong className="text-zinc-300">v{app.version}</strong>
                         </span>
                         <span className="text-[10px] font-mono text-emerald-500/70 tracking-widest">
                           https://{app.domain}
                         </span>
                      </div>
                   </div>
                </div>
                
                <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-center w-full md:w-auto">
                   <div className="flex gap-4 text-center">
                      <div>
                         <span className="block text-[9px] uppercase tracking-widest text-zinc-600 font-black mb-1">CPU Load</span>
                         <span className="text-xs font-mono font-bold text-white">{app.cpu ?? 0}%</span>
                      </div>
                      <div>
                         <span className="block text-[9px] uppercase tracking-widest text-zinc-600 font-black mb-1">RAM Alloc</span>
                         <span className="text-xs font-mono font-bold text-white">{Math.round((app.memory ?? 0) / 1024 / 1024)}mb</span>
                      </div>
                   </div>

                   <div className="flex gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5">
                      <button 
                        onClick={() => manageMutation.mutate({ id: app.id, action: "start" })} 
                        className="px-3 py-2 text-[10px] uppercase font-black tracking-widest text-zinc-400 hover:text-green-500 hover:bg-green-500/10 rounded-lg transition-all"
                      >
                         Boot
                      </button>
                      <button 
                        onClick={() => manageMutation.mutate({ id: app.id, action: "restart" })} 
                        className="px-3 py-2 text-[10px] uppercase font-black tracking-widest text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all"
                      >
                         Restart
                      </button>
                      <button 
                        onClick={() => manageMutation.mutate({ id: app.id, action: "stop" })} 
                        className="px-3 py-2 text-[10px] uppercase font-black tracking-widest text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                         Stop
                      </button>
                      <span className="w-px h-6 bg-white/10 self-center mx-1"></span>
                      <button 
                        onClick={() => { if(confirm("¿Eliminar aplicación del servidor PM2?")) deleteMutation.mutate(app.id) }} 
                        className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 transition-all rounded-lg"
                      >
                         <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                   </div>
                </div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
}
