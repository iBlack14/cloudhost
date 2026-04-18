"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDatabases, createDatabase, type UserDatabase } from "../../../lib/api";

export default function DatabasesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPass, setNewPass] = useState("");

  const { data: databases = [], isLoading } = useQuery({
    queryKey: ["odin", "databases"],
    queryFn: fetchDatabases
  });

  const createMutation = useMutation({
    mutationFn: () => createDatabase(newName, newPass),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["odin", "databases"] });
      setIsModalOpen(false);
      setNewName("");
      setNewPass("");
      alert("Base de datos creada exitosamente.");
    },
    onError: (err: any) => {
      alert("Error al crear base de datos: " + err.message);
    }
  });

  const handleOpenPMA = (dbUser: string) => {
    // For now, we open the portal. 
    // In a production setup, we would implement a Signon script.
    // As a placeholder for "no authentication", we can open the link.
    const pmaUrl = `${window.location.protocol}//${window.location.hostname}:8080`;
    window.open(pmaUrl, "_blank");
  };

  return (
    <div className="space-y-12">
      <header className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-6xl font-headline font-black text-white tracking-tighter uppercase italic">
            Database <span className="text-zinc-600">Vault</span>
          </h1>
          <p className="text-zinc-500 text-sm font-mono tracking-widest mt-1">
            Manage your MySQL clusters and access the phpMyAdmin orchestration tool.
          </p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="kinetic-gradient px-8 py-4 rounded-2xl text-white font-black font-headline tracking-widest active:scale-95 transition-all shadow-xl shadow-primary/40 uppercase text-xs"
        >
          + Create Database
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full p-24 flex flex-col items-center justify-center glass-card animate-pulse">
             <span className="material-symbols-outlined text-zinc-800 text-6xl mb-4">settings_suggest</span>
             <p className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">Scanning technical matrix...</p>
          </div>
        ) : databases.length === 0 ? (
          <div className="col-span-full p-20 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-center">
             <span className="material-symbols-outlined text-zinc-600 text-5xl mb-4">database_off</span>
             <h4 className="text-sm font-black text-zinc-400 uppercase tracking-widest">No databases provisioned.</h4>
          </div>
        ) : (
          databases.map((db, i) => (
            <div key={i} className="glass-card p-8 group hover:border-primary/40 transition-all duration-500 relative overflow-hidden">
               <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-zinc-500 group-hover:text-primary transition-all">
                     <span className="material-symbols-outlined text-3xl">database</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${db.type === 'wordpress' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {db.type}
                  </span>
               </div>
               
               <h3 className="text-xl font-headline font-black text-white tracking-tighter uppercase mb-2">{db.name}</h3>
               <div className="space-y-4">
                  <div className="flex justify-between text-[10px] items-center">
                     <span className="text-zinc-600 font-black uppercase tracking-widest">User</span>
                     <span className="text-zinc-300 font-mono">{db.user}</span>
                  </div>
                  <div className="flex justify-between text-[10px] items-center">
                     <span className="text-zinc-600 font-black uppercase tracking-widest">Host</span>
                     <span className="text-zinc-300 font-mono">127.0.0.1</span>
                  </div>
               </div>

               <div className="mt-8 pt-6 border-t border-white/5 flex gap-2">
                  <button 
                    onClick={() => handleOpenPMA(db.user)}
                    className="flex-1 bg-white/5 border border-white/5 py-3 rounded-xl text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                  >
                    phpMyAdmin
                  </button>
                  <button className="p-3 bg-red-500/5 text-red-500 rounded-xl border border-red-500/10 hover:bg-red-500 hover:text-white transition-all">
                     <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
               </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !createMutation.isPending && setIsModalOpen(false)}></div>
          <div className="glass-card w-full max-w-md relative z-10 p-8 space-y-8 animate-in fade-in zoom-in duration-300">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-headline font-black text-white italic tracking-tighter uppercase">New Database</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition-all">
                   <span className="material-symbols-outlined">close</span>
                </button>
             </div>

             <div className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">DB Name Prefix</label>
                   <input 
                     value={newName}
                     onChange={(e) => setNewName(e.target.value)}
                     className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white font-mono text-sm focus:outline-none focus:border-primary/50"
                     placeholder="my_data"
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Password</label>
                   <input 
                     type="password"
                     value={newPass}
                     onChange={(e) => setNewPass(e.target.value)}
                     className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white font-mono text-sm focus:outline-none focus:border-primary/50"
                     placeholder="••••••••"
                   />
                </div>

                <button 
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !newName || !newPass}
                  className="w-full kinetic-gradient py-4 rounded-xl text-white font-black uppercase tracking-widest text-xs disabled:opacity-50"
                >
                  {createMutation.isPending ? "Configuring Matrix..." : "Create Database Instance"}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
