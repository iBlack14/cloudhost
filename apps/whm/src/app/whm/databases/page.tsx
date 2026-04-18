"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
const getWhmToken = () => typeof window !== "undefined" ? window.sessionStorage.getItem("whm-access-token") : null;
const whmHeaders = (): Record<string, string> => {
  const t = getWhmToken();
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

export default function WhmDatabasesPage() {
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newPass, setNewPass] = useState("");

  const { data: dbs, isLoading } = useQuery({
    queryKey: ["whm_databases"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/whm/databases`, { headers: whmHeaders() });
      if (!res.ok) throw new Error("Load failed");
      return (await res.json()).data;
    }
  });

  const repairMutation = useMutation({
    mutationFn: async (dbName: string) => fetch(`${API_BASE}/whm/databases/${dbName}/repair`, { method: "POST", headers: whmHeaders() }),
    onSuccess: () => alert("Reparación (REPAIR TABLE) ejecutada correctamente")
  });

  const optimizeMutation = useMutation({
    mutationFn: async (dbName: string) => fetch(`${API_BASE}/whm/databases/${dbName}/optimize`, { method: "POST", headers: whmHeaders() }),
    onSuccess: () => {
       alert("Optimización (OPTIMIZE TABLE) ejecutada correctamente");
       queryClient.invalidateQueries({ queryKey: ["whm_databases"] });
    }
  });

  const resetPassMutation = useMutation({
    mutationFn: async ({ user, pass }: { user: string; pass: string }) => {
      const res = await fetch(`${API_BASE}/whm/databases/${user}/password`, { 
         method: "POST", 
         headers: whmHeaders(),
         body: JSON.stringify({ newPassword: pass }) 
      });
      if (!res.ok) throw new Error("Reset Failed");
      return res.json();
    },
    onSuccess: () => {
      alert("Contraseña regenerada corectamente.");
      setEditingUser(null);
      setNewPass("");
    }
  });

  const generateSsoMutation = useMutation({
    mutationFn: async (dbName: string) => {
      const res = await fetch(`${API_BASE}/whm/databases/${dbName}/sso`, { headers: whmHeaders() });
      return (await res.json()).data;
    },
    onSuccess: (data) => window.open(data.url, "_blank")
  });

  if (isLoading) return <div className="text-white">Cargando base de datos...</div>;

  const totalSizeMb = dbs?.reduce((acc: number, db: any) => acc + (db.size_mb || 0), 0) || 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <header className="space-y-4">
        <h1 className="text-5xl font-headline font-black text-white tracking-tighter uppercase italic flex items-center gap-4">
          MySQL <span className="text-primary text-xl">Database Core</span>
        </h1>
        <div className="flex gap-4">
           <span className="px-3 py-1 bg-white/5 border border-white/10 rounded font-mono text-xs text-zinc-400">
             Total Databases: <strong className="text-white">{dbs?.length || 0}</strong>
           </span>
           <span className="px-3 py-1 bg-white/5 border border-white/10 rounded font-mono text-xs text-zinc-400">
             Total MySQL Size: <strong className="text-white">{totalSizeMb.toFixed(2)} MB</strong>
           </span>
        </div>
      </header>

      <div className="glass-card rounded-3xl overflow-hidden border border-white/10 p-2 relative bg-zinc-900/50">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none -z-10"></div>
          
          <table className="w-full text-left relative z-10">
             <thead>
                <tr className="bg-black/40 text-[10px] uppercase tracking-widest text-zinc-500 font-black border-b border-white/10">
                   <th className="p-5">Database Name (Schema)</th>
                   <th className="p-5">Owner Account</th>
                   <th className="p-5 w-24 text-center">Type</th>
                   <th className="p-5 w-24">Size</th>
                   <th className="p-5 text-right pr-6">Manage Utilities</th>
                </tr>
             </thead>
             <tbody>
                {dbs?.map((db: any) => (
                   <tr key={db.db_name} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors group">
                      <td className="p-5">
                         <div className="text-lg font-black text-white">{db.db_name}</div>
                         <div className="flex gap-2 items-center mt-1">
                           <span className="text-xs text-zinc-500 font-mono">User: {db.db_user}</span>
                           <button 
                             onClick={() => setEditingUser(db.db_user)}
                             title="Cambiar Password de Usuario"
                             className="text-[10px] bg-white/5 text-primary uppercase font-bold tracking-widest px-2 rounded hover:bg-white/10"
                           >
                              Reset Pass
                           </button>
                         </div>
                         {editingUser === db.db_user && (
                            <div className="mt-3 flex gap-2 w-72">
                               <input type="text" placeholder="Nueva Contraseña" value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full bg-black border border-white/20 text-white px-2 py-1 text-xs rounded" />
                               <button onClick={() => resetPassMutation.mutate({ user: db.db_user, pass: newPass })} className="bg-primary text-black font-bold text-[10px] uppercase px-3 rounded">Guardar</button>
                               <button onClick={() => setEditingUser(null)} className="text-zinc-500 hover:text-white px-2 material-symbols-outlined text-sm">close</button>
                            </div>
                         )}
                      </td>
                      <td className="p-5 font-mono text-xs text-zinc-400 capitalize">{db.owner_username}</td>
                      <td className="p-5 text-center">
                         <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${db.type === 'wordpress' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'}`}>
                           {db.type}
                         </span>
                      </td>
                      <td className="p-5 text-zinc-300 font-mono text-sm">{db.size_mb} MB</td>
                      <td className="p-5 text-right pr-6 space-x-2">
                         <button
                           onClick={() => generateSsoMutation.mutate(db.db_name)}
                           title="phpMyAdmin Access"
                           className="bg-primary/10 text-primary hover:bg-primary hover:text-black border border-primary/20 px-3 py-1 rounded font-black text-[10px] uppercase tracking-widest transition-all shadow-[0_0_10px_rgba(0,163,255,0)] hover:shadow-[0_0_10px_rgba(0,163,255,0.4)]"
                         >
                            Login PMA
                         </button>
                         <button
                           onClick={() => { if(confirm("¿Recalcular optimizaciones lógicas? Esto toma tiempo si es grande.")) optimizeMutation.mutate(db.db_name) }}
                           title="Optimize Table Space"
                           className="bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 px-3 py-1 rounded font-black text-[10px] uppercase tracking-widest transition-all"
                         >
                            Optimize
                         </button>
                         <button
                           onClick={() => { if(confirm("¿Forzar REPAIR TABLES globalmente en los esquemas?")) repairMutation.mutate(db.db_name) }}
                           title="Repair Corrupted Sub-Tables"
                           className="bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 px-3 py-1 rounded font-black text-[10px] uppercase tracking-widest transition-all"
                         >
                            Repair
                         </button>
                      </td>
                   </tr>
                ))}
             </tbody>
          </table>
      </div>
    </div>
  );
}
