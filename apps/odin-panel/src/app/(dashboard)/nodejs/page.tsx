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
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error?.message ?? "Action failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["odin_nodejs_apps"] }),
    onError: (e: Error) => alert(e.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/odin-panel/nodejs/${id}`, { method: "DELETE", headers: authHeaders() });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error?.message ?? "Delete failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["odin_nodejs_apps"] }),
    onError: (e: Error) => alert(e.message)
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 bg-white border border-slate-200 rounded-[3rem] animate-pulse">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-[#00A3FF] rounded-full animate-spin mb-4"></div>
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Sincronizando Cluster PM2...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 mb-1">
             <span className="px-2.5 py-1 bg-[#00A3FF]/10 text-[#00A3FF] text-[10px] font-bold uppercase rounded-full tracking-wider">
                Motor JavaScript
             </span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 uppercase">
            Node.js <span className="text-[#00A3FF]">App Engine</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-2">
            Despliega PM2 Wrappers, APIs REST o frameworks SSR de forma instantánea.
          </p>
        </div>
        
        <button 
           onClick={() => setShowCreate(!showCreate)}
           className={`px-10 py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all shadow-xl flex items-center gap-2 active:scale-95 ${showCreate ? 'bg-slate-900 text-white shadow-slate-900/20' : 'bg-[#00A3FF] text-white shadow-[#00A3FF]/20'}`}
        >
          <span className="material-symbols-outlined">{showCreate ? 'close' : 'add'}</span>
          {showCreate ? "Cancelar Despliegue" : "Configurar Nueva App"}
        </button>
      </header>

      {showCreate && (
         <div className="bg-white border border-slate-200 p-12 rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
            <div className="absolute top-[-10%] right-[-5%] w-64 h-64 bg-[#00A3FF]/5 rounded-full blur-[80px] pointer-events-none"></div>
            <div className="relative z-10 space-y-10">
               <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase">Topología de Aplicación</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Configurar entorno de ejecución aislado</p>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-3">
                     <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre del Proyecto</label>
                     <input type="text" value={newApp.name} onChange={e => setNewApp({...newApp, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold text-sm outline-none focus:border-[#00A3FF] focus:bg-white transition-all shadow-inner" placeholder="ej: mi-api-rest" />
                  </div>
                  <div className="space-y-3">
                     <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Versión de Runtime (NVM)</label>
                     <select value={newApp.version} onChange={e => setNewApp({...newApp, version: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold text-sm outline-none focus:border-[#00A3FF] focus:bg-white transition-all shadow-inner cursor-pointer appearance-none">
                        <option value="18">Node.js 18.x (LTS)</option>
                        <option value="20">Node.js 20.x (LTS)</option>
                        <option value="22">Node.js 22.x (Current)</option>
                     </select>
                  </div>
                  <div className="space-y-3">
                     <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Ruta de Instalación</label>
                     <input type="text" value={newApp.path} onChange={e => setNewApp({...newApp, path: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold text-sm outline-none focus:border-[#00A3FF] focus:bg-white transition-all shadow-inner" />
                  </div>
                  <div className="space-y-3">
                     <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Fichero de Inicio</label>
                     <input type="text" value={newApp.script} onChange={e => setNewApp({...newApp, script: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold text-sm outline-none focus:border-[#00A3FF] focus:bg-white transition-all shadow-inner" />
                  </div>
                  <div className="space-y-3">
                     <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Dominio (Reverse Proxy)</label>
                     <input type="text" value={newApp.domain} onChange={e => setNewApp({...newApp, domain: e.target.value})} placeholder="api.midominio.com" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold text-sm outline-none focus:border-[#00A3FF] focus:bg-white transition-all shadow-inner" />
                  </div>
                  <div className="space-y-3">
                     <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Asignación de Puerto Interno</label>
                     <input type="number" value={newApp.port} onChange={e => setNewApp({...newApp, port: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold text-sm outline-none focus:border-[#00A3FF] focus:bg-white transition-all shadow-inner" />
                  </div>
               </div>

               <button 
                 disabled={createMutation.isPending || !newApp.name || !newApp.domain}
                 onClick={() => createMutation.mutate()}
                 className="bg-[#00A3FF] px-12 py-5 rounded-2xl text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-[#00A3FF]/20 hover:bg-[#008EE0] active:scale-[0.98] transition-all disabled:opacity-40"
               >
                 Provisionar Entorno Node
               </button>
            </div>
         </div>
      )}

      {apps?.length === 0 && !showCreate ? (
        <div className="p-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center text-center group hover:border-[#00A3FF]/20 transition-all cursor-pointer" onClick={() => setShowCreate(true)}>
             <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-slate-200 mb-6 shadow-sm">
                <span className="material-symbols-outlined text-5xl">javascript</span>
             </div>
             <h4 className="text-lg font-black text-slate-900 uppercase">Sin Aplicaciones Activas</h4>
             <p className="text-sm text-slate-500 mt-2 font-medium">Comienza a desplegar servidores de alto rendimiento usando PM2 Native.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
           {apps?.map((app: any) => (
             <div key={app.id} className="bg-white border border-slate-200 p-8 rounded-[2.5rem] flex flex-col xl:flex-row justify-between items-center gap-10 group hover:border-[#00A3FF]/30 transition-all duration-500 shadow-sm">
                <div className="flex gap-6 items-center w-full xl:w-1/3">
                   <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[#00A3FF] group-hover:text-white transition-all shadow-sm shrink-0">
                      <span className="material-symbols-outlined text-3xl">javascript</span>
                   </div>
                   <div className="space-y-1">
                      <h3 className="text-2xl font-black text-slate-900 group-hover:text-[#00A3FF] transition-colors flex items-center gap-3">
                        {app.name} 
                        <span className={`w-2.5 h-2.5 rounded-full ${app.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : app.status === 'stopping' || app.status === 'stopped' ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                      </h3>
                      <div className="flex gap-4">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                           Puerto: <strong className="text-[#00A3FF]">{app.port}</strong>
                         </span>
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                           Node: <strong className="text-[#00A3FF]">v{app.version}</strong>
                         </span>
                         <span className="text-[10px] font-black text-[#00A3FF] tracking-widest hover:underline cursor-pointer">
                           https://{app.domain}
                         </span>
                      </div>
                   </div>
                </div>
                
                <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center flex-1 w-full xl:w-auto border-y xl:border-y-0 xl:border-x border-slate-100 py-6 xl:py-0 px-8">
                   <div className="grid grid-cols-2 gap-8 flex-1">
                      <div className="text-center md:text-left">
                         <span className="block text-[10px] uppercase tracking-widest text-slate-300 font-black mb-2">Carga CPU</span>
                         <span className="text-sm font-black text-slate-700 font-mono bg-slate-50 px-3 py-1 rounded-lg">{app.cpu ?? 0}%</span>
                      </div>
                      <div className="text-center md:text-left">
                         <span className="block text-[10px] uppercase tracking-widest text-slate-300 font-black mb-2">Memoria RAM</span>
                         <span className="text-sm font-black text-slate-700 font-mono bg-slate-50 px-3 py-1 rounded-lg">{Math.round((app.memory ?? 0) / 1024 / 1024)}MB</span>
                      </div>
                   </div>

                   <div className="flex gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100 shadow-inner">
                      <button 
                        onClick={() => manageMutation.mutate({ id: app.id, action: "start" })} 
                        className="px-4 py-2 text-[10px] uppercase font-black tracking-widest text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
                      >
                         Iniciar
                      </button>
                      <button 
                        onClick={() => manageMutation.mutate({ id: app.id, action: "restart" })} 
                        className="px-4 py-2 text-[10px] uppercase font-black tracking-widest text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all"
                      >
                         Reiniciar
                      </button>
                      <button 
                        onClick={() => manageMutation.mutate({ id: app.id, action: "stop" })} 
                        className="px-4 py-2 text-[10px] uppercase font-black tracking-widest text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                         Parar
                      </button>
                   </div>
                </div>

                <button 
                  onClick={() => { if(confirm("¿Eliminar aplicación permanentemente?")) deleteMutation.mutate(app.id) }} 
                  className="w-12 h-12 rounded-2xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm"
                >
                   <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
             </div>
           ))}
        </div>
      )}
    </div>
  );
}
