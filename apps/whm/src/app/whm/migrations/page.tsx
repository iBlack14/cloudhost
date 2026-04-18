"use client";

import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
const getWhmToken = () => typeof window !== "undefined" ? window.sessionStorage.getItem("whm-access-token") : null;
const whmHeaders = (): Record<string, string> => {
  const t = getWhmToken();
  return t ? { Authorization: `Bearer ${t}` } : {}; // Don't set content-type for File Uploads
};

export default function WhmMigrationsPage() {
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [sshData, setSshData] = useState({ host: "", user: "root", pass: "" });
  const [importFile, setImportFile] = useState<File | null>(null);

  // Load purely accounts just for the dropdown
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
      if (!res.ok) throw new Error(data?.error?.message ?? "Export failed");
      return data.data;
    },
    onSuccess: (data) => {
      window.open(`${API_BASE.replace('/api/v1', '')}${data.downloadUrl}`, "_blank");
    },
    onError: (e: any) => alert(e.message)
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!importFile) throw new Error("Please select a file");
      const formData = new FormData();
      formData.append("backup", importFile);

      const res = await fetch(`${API_BASE}/whm/migrations/import`, { 
        method: "POST", 
        headers: whmHeaders(), 
        body: formData 
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Import failed");
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
      if (!res.ok) throw new Error(data?.error?.message ?? "SSH failed");
      return data;
    },
    onSuccess: () => {
      alert("Job de migración iniciado en background.");
      setSshData({ host: "", user: "root", pass: "" });
    },
    onError: (e: any) => alert(e.message)
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <header className="space-y-4">
        <h1 className="text-5xl font-headline font-black text-white tracking-tighter uppercase italic flex items-center gap-4">
          Migration <span className="text-primary text-xl">Center</span>
        </h1>
        <p className="text-zinc-500 font-mono tracking-widest text-[10px] uppercase max-w-xl">
          Empaqueta y exporta arquitecturas en caliente (.tar.gz) o transfiere servidores cPanel/Odin directamente con protocolos seguros.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* Export Card */}
         <div className="glass-card p-8 rounded-2xl relative overflow-hidden flex flex-col justify-between">
             <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none -z-10"></div>
             <div>
                <div className="flex items-center gap-3 mb-6">
                   <span className="material-symbols-outlined text-primary text-3xl">download_for_offline</span>
                   <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Export Node</h2>
                </div>
                <p className="text-zinc-500 text-xs mb-6 font-mono">
                   Comprime todo el `/home`, los MySQL root dumps, configuraciones SSL y directivas FPM. (Recomendado hacer fuera de horario pico).
                </p>
             </div>
             <div className="space-y-4">
                <select 
                  value={selectedUser} 
                  onChange={e => setSelectedUser(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:border-primary outline-none"
                >
                  <option value="" disabled>Selecciona la Cuenta BDE</option>
                  {accounts?.map(a => <option key={a.username} value={a.username}>{a.username}</option>)}
                </select>
                <button 
                  disabled={exportMutation.isPending || !selectedUser}
                  onClick={() => exportMutation.mutate(selectedUser)}
                  className="w-full py-4 rounded-xl font-black tracking-widest text-[10px] uppercase transition-all bg-primary text-black shadow-[0_0_15px_rgba(0,163,255,0.4)] hover:bg-white disabled:opacity-50"
                >
                  {exportMutation.isPending ? "Generando Paquete..." : "Start Export Job"}
                </button>
             </div>
         </div>

         {/* Import Card */}
         <div className="glass-card p-8 rounded-2xl relative overflow-hidden flex flex-col justify-between">
             <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] pointer-events-none -z-10"></div>
             <div>
                <div className="flex items-center gap-3 mb-6">
                   <span className="material-symbols-outlined text-amber-500 text-3xl">upload_file</span>
                   <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Restore Bundle</h2>
                </div>
                <p className="text-zinc-500 text-xs mb-6 font-mono">
                   Sube un empaquetado (.tar.gz) generado por nuestro clúster o compatible con cPanel para importar dominios y bases de datos. Límite: 5GB.
                </p>
             </div>
             <div className="space-y-4">
                <label className="border-2 border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-white/[0.02] hover:border-amber-500/30 transition-all font-mono">
                   <span className="material-symbols-outlined text-amber-500/50 text-4xl mb-2">folder_zip</span>
                   <span className="text-white text-xs">{importFile ? importFile.name : "Click aquí para buscar .tar.gz"}</span>
                   <input type="file" className="hidden" accept=".tar.gz,.tgz" onChange={e => e.target.files && setImportFile(e.target.files[0])} />
                </label>
                <button 
                  disabled={importMutation.isPending || !importFile}
                  onClick={() => importMutation.mutate()}
                  className="w-full py-4 rounded-xl font-black tracking-widest text-[10px] uppercase transition-all bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500 hover:text-black shadow-[0_0_15px_rgba(245,158,11,0)] hover:shadow-[0_0_15px_rgba(245,158,11,0.4)] disabled:opacity-50"
                >
                  {importMutation.isPending ? "Subiendo e Importando (Por favor espere)..." : "Upload & Provision"}
                </button>
             </div>
         </div>

         {/* SSH Sync */}
         <div className="md:col-span-2 glass-card p-8 rounded-2xl relative overflow-hidden flex flex-col md:flex-row gap-8 items-center border border-white/5 bg-zinc-900/40">
             <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-secondary/10 rounded-full blur-[80px] pointer-events-none -z-10"></div>
             
             <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                   <span className="material-symbols-outlined text-secondary text-3xl">sync_alt</span>
                   <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Remote SSH Sync (Beta)</h2>
                </div>
                <p className="text-zinc-500 text-xs font-mono max-w-sm">
                   Sincroniza un clúster entero hacia Odin Cloud estableciendo un túnel Rsync.
                </p>
             </div>

             <div className="flex-[2] w-full grid grid-cols-1 sm:grid-cols-3 gap-4">
                <input 
                  type="text" placeholder="IP Address (ej. 10.0.0.5)" 
                  value={sshData.host} onChange={e => setSshData({...sshData, host: e.target.value})}
                  className="bg-black border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs focus:border-secondary transition-all outline-none" 
                />
                <input 
                  type="text" placeholder="SSH User (root)" 
                  value={sshData.user} onChange={e => setSshData({...sshData, user: e.target.value})}
                  className="bg-black border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs focus:border-secondary transition-all outline-none" 
                />
                <input 
                  type="password" placeholder="Root Password" 
                  value={sshData.pass} onChange={e => setSshData({...sshData, pass: e.target.value})}
                  className="bg-black border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs focus:border-secondary transition-all outline-none" 
                />
             </div>

             <button 
                disabled={sshMutation.isPending || !sshData.host || !sshData.pass}
                onClick={() => sshMutation.mutate()}
                className="w-full md:w-auto h-[46px] px-8 rounded-xl font-black tracking-widest text-[10px] uppercase transition-all bg-secondary/20 text-secondary border border-secondary/30 hover:bg-secondary hover:text-black disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                Connect Root
             </button>
         </div>
      </div>
    </div>
  );
}
