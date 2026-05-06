"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDatabases, createDatabase, issueDatabaseSsoLink } from "../../../lib/api";

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
    onError: (err: any) => alert("Error al crear base de datos: " + err.message)
  });

  const databaseSsoMutation = useMutation({
    mutationFn: (dbName: string) => issueDatabaseSsoLink(dbName),
    onSuccess: (data) => {
      window.open(data.url, "_blank", "noopener,noreferrer");
    },
    onError: (err: any) => alert("No se pudo abrir phpMyAdmin: " + err.message)
  });

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 mb-1">
             <span className="px-2.5 py-1 bg-[#00A3FF]/10 text-[#00A3FF] text-[10px] font-bold uppercase rounded-full tracking-wider">
                Motores de Datos
             </span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 uppercase">
            Bases de <span className="text-[#00A3FF]">Datos</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-2">
            Administra tus clusters MySQL y accede a la orquestación de phpMyAdmin.
          </p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#00A3FF] px-10 py-5 rounded-2xl text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-[#00A3FF]/20 hover:bg-[#008EE0] active:scale-[0.98] transition-all"
        >
          + Crear Base de Datos
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {isLoading ? (
          <div className="col-span-full p-24 flex flex-col items-center justify-center bg-white border border-slate-200 rounded-[3rem] shadow-sm animate-pulse">
             <div className="w-12 h-12 border-4 border-slate-100 border-t-[#00A3FF] rounded-full animate-spin mb-4"></div>
             <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Sincronizando con el Servidor SQL...</p>
          </div>
        ) : databases.length === 0 ? (
          <div className="col-span-full p-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center text-center">
             <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-slate-200 mb-6 shadow-sm">
                <span className="material-symbols-outlined text-5xl">database_off</span>
             </div>
             <h4 className="text-lg font-black text-slate-900 uppercase">Sin Instancias Activas</h4>
             <p className="text-sm text-slate-500 mt-2 font-medium">Provisiona tu primera base de datos para comenzar a almacenar información.</p>
          </div>
        ) : (
          databases.map((db, i) => (
            <div key={i} className="bg-white border border-slate-200 p-10 rounded-[2.5rem] shadow-sm group hover:border-[#00A3FF]/30 transition-all duration-300 relative overflow-hidden">
               <div className="flex justify-between items-start mb-8 relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#00A3FF] group-hover:text-white transition-all shadow-sm">
                     <span className="material-symbols-outlined text-3xl">database</span>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${db.type === 'wordpress' ? 'border-blue-200 text-blue-600 bg-blue-50' : 'border-emerald-200 text-emerald-600 bg-emerald-50'}`}>
                    {db.type}
                  </span>
               </div>
               
               <h3 className="text-2xl font-black text-slate-900 tracking-tight group-hover:text-[#00A3FF] transition-colors mb-4">{db.name}</h3>
               <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                     <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Usuario</span>
                     <span className="text-xs font-bold text-slate-700 font-mono">{db.user}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                     <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Host</span>
                     <span className="text-xs font-bold text-slate-700 font-mono">127.0.0.1</span>
                  </div>
               </div>

               <div className="mt-10 pt-8 border-t border-slate-100 flex gap-3 relative z-10">
                  <button 
                    onClick={() => databaseSsoMutation.mutate(db.name)}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-[#00A3FF]/10 text-[#00A3FF] py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#00A3FF] hover:text-white transition-all shadow-sm active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[18px]">login</span>
                    {databaseSsoMutation.isPending ? "Abriendo..." : "phpMyAdmin"}
                  </button>
                  <button className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95">
                     <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
               </div>
               <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-[#00A3FF]/5 blur-[80px] rounded-full group-hover:bg-[#00A3FF]/10 transition-all duration-1000"></div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => !createMutation.isPending && setIsModalOpen(false)}></div>
          <div className="bg-white w-full max-w-md relative z-10 p-12 rounded-[3rem] shadow-2xl space-y-10 animate-in zoom-in-95 duration-300">
             <div className="flex justify-between items-center">
                <div>
                   <h2 className="text-2xl font-black text-slate-900 uppercase">Nueva Base</h2>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Configurar instancia MySQL</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 hover:text-slate-900 transition-all flex items-center justify-center">
                   <span className="material-symbols-outlined">close</span>
                </button>
             </div>

             <div className="space-y-8">
                <div className="space-y-3">
                   <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Prefijo de Nombre</label>
                   <input 
                     value={newName}
                     onChange={(e) => setNewName(e.target.value)}
                     className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold text-sm outline-none focus:border-[#00A3FF] focus:bg-white transition-all shadow-inner"
                     placeholder="ej: mi_tienda"
                   />
                </div>
                <div className="space-y-3">
                   <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Contraseña del Usuario</label>
                   <input 
                     type="password"
                     value={newPass}
                     onChange={(e) => setNewPass(e.target.value)}
                     className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold text-sm outline-none focus:border-[#00A3FF] focus:bg-white transition-all shadow-inner"
                     placeholder="••••••••"
                   />
                </div>

                <button 
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !newName || !newPass}
                  className="w-full bg-[#00A3FF] py-5 rounded-2xl text-white font-black uppercase tracking-widest text-[11px] shadow-xl shadow-[#00A3FF]/20 hover:bg-[#008EE0] active:scale-[0.98] transition-all disabled:opacity-40"
                >
                  {createMutation.isPending ? "Configurando Servidor..." : "Crear Instancia"}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
