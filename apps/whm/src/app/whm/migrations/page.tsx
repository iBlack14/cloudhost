"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

const API_BASE = typeof window !== "undefined" && window.location.hostname !== "localhost" && !window.location.hostname.match(/^\d+\.\d+\.\d+\.\d+$/)
  ? `${window.location.protocol}//api.${window.location.hostname.split(".").slice(-2).join(".")}/api/v1`
  : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1");
const getWhmToken = () => typeof window !== "undefined" ? window.sessionStorage.getItem("whm-access-token") : null;
const whmHeaders = (): Record<string, string> => {
  const t = getWhmToken();
  return t ? { Authorization: `Bearer ${t}` } : {}; 
};

export default function WhmMigrationsPage() {
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [sshData, setSshData] = useState({ host: "", user: "root", pass: "" });
  const [importFile, setImportFile] = useState<File | null>(null);

  const { data: accounts } = useQuery<{username:string}[]>({
    queryKey: ["whm_migration_accounts"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/whm/accounts`, { headers: { ...whmHeaders(), "Content-Type": "application/json" } });
      const json = await res.json();
      return json.data;
    }
  });

  const exportMutation = useMutation({
    mutationFn: async (username: string) => {
      const res = await fetch(`${API_BASE}/whm/migrations/export/${username}`, { 
        method: "POST", 
        headers: { ...whmHeaders(), "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Error en la exportación");
      return data.data;
    },
    onSuccess: (data) => {
      window.open(`${API_BASE.replace('/api/v1', '')}${data.downloadUrl}`, "_blank");
    },
    onError: (e: any) => alert(e.message)
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!importFile) throw new Error("Por favor selecciona un archivo");
      const formData = new FormData();
      formData.append("backup", importFile);

      const res = await fetch(`${API_BASE}/whm/migrations/import`, { 
        method: "POST", 
        headers: whmHeaders(), 
        body: formData 
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Error en la importación");
      return data;
    },
    onSuccess: () => {
      alert("Transferencia completada. Sistema importado con éxito.");
      setImportFile(null);
    },
    onError: (e: any) => alert(e.message)
  });

  const sshMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/whm/migrations/ssh`, { 
        method: "POST", 
        headers: { ...whmHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(sshData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Error SSH");
      return data;
    },
    onSuccess: () => {
      alert("Proceso de migración iniciado en segundo plano.");
      setSshData({ host: "", user: "root", pass: "" });
    },
    onError: (e: any) => alert(e.message)
  });

  return (
    <div className="space-y-12 animate-in fade-in duration-700 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 mb-1">
             <span className="px-2.5 py-1 bg-[#00A3FF]/10 text-[#00A3FF] text-[10px] font-bold uppercase rounded-full tracking-wider">
                Transferencia de Datos
             </span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 uppercase">
            Centro de <span className="text-[#00A3FF]">Migraciones</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-2">
            Empaqueta arquitecturas (.tar.gz) o transfiere servidores mediante protocolos seguros.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Export Card */}
         <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden group hover:border-[#00A3FF]/30 transition-all duration-500">
             <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center gap-5 mb-8">
                   <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#00A3FF] group-hover:text-white transition-all shadow-sm">
                      <span className="material-symbols-outlined text-3xl">download_for_offline</span>
                   </div>
                   <div>
                      <h2 className="text-2xl font-black text-slate-900 uppercase">Exportar Nodo</h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Empaquetado Odin (.tar.gz)</p>
                   </div>
                </div>
                <p className="text-slate-500 text-sm font-medium mb-10 leading-relaxed">
                   Comprime todo el directorio <strong>/home</strong>, volcados MySQL, configuraciones SSL y directivas PHP de una cuenta específica.
                </p>
                <div className="mt-auto space-y-4">
                   <div className="relative">
                      <select 
                        value={selectedUser} 
                        onChange={e => setSelectedUser(e.target.value)}
                        className="appearance-none w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold text-sm outline-none focus:border-[#00A3FF] transition-all cursor-pointer"
                      >
                        <option value="" disabled>Seleccionar Cuenta</option>
                        {accounts?.map(a => <option key={a.username} value={a.username}>{a.username}</option>)}
                      </select>
                      <span className="material-symbols-outlined absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">expand_more</span>
                   </div>
                   <button 
                     disabled={exportMutation.isPending || !selectedUser}
                     onClick={() => exportMutation.mutate(selectedUser)}
                     className="w-full py-5 rounded-2xl font-black tracking-widest text-[11px] uppercase transition-all bg-[#00A3FF] text-white shadow-lg shadow-[#00A3FF]/20 hover:bg-[#008EE0] active:scale-[0.98] disabled:opacity-40"
                   >
                     {exportMutation.isPending ? "Generando Paquete..." : "Iniciar Exportación"}
                   </button>
                </div>
             </div>
             <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-[#00A3FF]/5 blur-[100px] rounded-full group-hover:bg-[#00A3FF]/10 transition-all duration-1000"></div>
         </div>

         {/* Import Card */}
         <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden group hover:border-amber-400/30 transition-all duration-500">
             <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center gap-5 mb-8">
                   <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-sm">
                      <span className="material-symbols-outlined text-3xl">upload_file</span>
                   </div>
                   <div>
                      <h2 className="text-2xl font-black text-slate-900 uppercase">Restaurar Paquete</h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Importación de Backups</p>
                   </div>
                </div>
                <p className="text-slate-500 text-sm font-medium mb-10 leading-relaxed">
                   Sube un archivo .tar.gz compatible para importar dominios y bases de datos automáticamente de forma masiva. Límite: 5GB.
                </p>
                <div className="mt-auto space-y-4">
                   <label className="border-2 border-dashed border-slate-100 rounded-[2rem] p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-amber-500/30 transition-all group/label">
                      <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-3 group-hover/label:scale-110 transition-all">
                        <span className="material-symbols-outlined text-amber-500">folder_zip</span>
                      </div>
                      <span className="text-slate-900 font-bold text-xs">{importFile ? importFile.name : "Haz clic para buscar archivo .tar.gz"}</span>
                      <input type="file" className="hidden" accept=".tar.gz,.tgz" onChange={e => e.target.files && setImportFile(e.target.files[0])} />
                   </label>
                   <button 
                     disabled={importMutation.isPending || !importFile}
                     onClick={() => importMutation.mutate()}
                     className="w-full py-5 rounded-2xl font-black tracking-widest text-[11px] uppercase transition-all bg-amber-500 text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600 active:scale-[0.98] disabled:opacity-40"
                   >
                     {importMutation.isPending ? "Subiendo e Importando..." : "Subir y Provisionar"}
                   </button>
                </div>
             </div>
             <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-amber-500/5 blur-[100px] rounded-full group-hover:bg-amber-500/10 transition-all duration-1000"></div>
         </div>

         {/* SSH Sync */}
         <div className="lg:col-span-2 bg-slate-900 rounded-[3rem] p-12 relative overflow-hidden flex flex-col lg:flex-row gap-12 items-center shadow-2xl">
             <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
             
             <div className="relative z-10 lg:w-1/3">
                <div className="flex items-center gap-4 mb-5">
                   <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white border border-white/10 shadow-lg shadow-white/5">
                      <span className="material-symbols-outlined text-2xl">sync_alt</span>
                   </div>
                   <h2 className="text-2xl font-black text-white uppercase tracking-tight">Sincronización SSH</h2>
                </div>
                <p className="text-slate-400 text-sm font-medium leading-relaxed">
                   Sincroniza un servidor entero hacia Odisea Cloud estableciendo un túnel Rsync seguro directo desde el origen.
                </p>
             </div>

             <div className="relative z-10 flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Dirección IP</label>
                   <input 
                     type="text" placeholder="10.0.0.5" 
                     value={sshData.host} onChange={e => setSshData({...sshData, host: e.target.value})}
                     className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold text-sm focus:border-white/30 transition-all outline-none" 
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Usuario SSH</label>
                   <input 
                     type="text" placeholder="root" 
                     value={sshData.user} onChange={e => setSshData({...sshData, user: e.target.value})}
                     className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold text-sm focus:border-white/30 transition-all outline-none" 
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Contraseña Root</label>
                   <input 
                     type="password" placeholder="••••••••" 
                     value={sshData.pass} onChange={e => setSshData({...sshData, pass: e.target.value})}
                     className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold text-sm focus:border-white/30 transition-all outline-none" 
                   />
                </div>
             </div>

             <div className="relative z-10">
                <button 
                   disabled={sshMutation.isPending || !sshData.host || !sshData.pass}
                   onClick={() => sshMutation.mutate()}
                   className="w-full lg:w-auto px-10 py-5 rounded-2xl font-black tracking-widest text-[11px] uppercase transition-all bg-white text-slate-900 hover:bg-[#00A3FF] hover:text-white disabled:opacity-40 shadow-xl shadow-white/5 active:scale-95"
                 >
                   Conectar Root
                </button>
             </div>
             
             <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#00A3FF]/20 blur-[120px] rounded-full pointer-events-none"></div>
         </div>
      </div>
    </div>
  );
}
