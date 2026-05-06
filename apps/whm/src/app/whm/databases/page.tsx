"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
      if (!res.ok) throw new Error("Fallo al cargar");
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
      if (!res.ok) throw new Error("Fallo al resetear");
      return res.json();
    },
    onSuccess: () => {
      alert("Contraseña regenerada correctamente.");
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

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <div className="w-10 h-10 border-4 border-[#00A3FF]/20 border-t-[#00A3FF] rounded-full animate-spin"></div>
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Cargando Bases de Datos...</span>
    </div>
  );

  const totalSizeMb = dbs?.reduce((acc: number, db: any) => acc + (db.size_mb || 0), 0) || 0;

  return (
    <div className="space-y-12 animate-in fade-in duration-700 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 mb-1">
             <span className="px-2.5 py-1 bg-[#00A3FF]/10 text-[#00A3FF] text-[10px] font-bold uppercase rounded-full tracking-wider">
                Infraestructura de Datos
             </span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 uppercase">
            Gestor de <span className="text-[#00A3FF]">Bases de Datos</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-2">
            Administración centralizada de motores MySQL/MariaDB.
          </p>
        </div>
        <div className="flex gap-4">
           <div className="px-4 py-2 bg-white border border-slate-200 rounded-xl flex flex-col shadow-sm">
             <span className="text-[9px] font-bold text-slate-400 uppercase">Total Esquemas</span>
             <span className="text-lg font-black text-slate-900">{dbs?.length || 0}</span>
           </div>
           <div className="px-4 py-2 bg-white border border-slate-200 rounded-xl flex flex-col shadow-sm">
             <span className="text-[9px] font-bold text-slate-400 uppercase">Espacio Ocupado</span>
             <span className="text-lg font-black text-[#00A3FF]">{totalSizeMb.toFixed(1)} MB</span>
           </div>
        </div>
      </header>

      <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
          <table className="w-full text-left">
             <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 uppercase text-[10px] font-bold tracking-widest text-slate-500">
                   <th className="px-8 py-5">Nombre / Esquema</th>
                   <th className="px-8 py-5">Propietario</th>
                   <th className="px-8 py-5 w-24 text-center">Tipo</th>
                   <th className="px-8 py-5 w-24">Tamaño</th>
                   <th className="px-8 py-5 text-right">Herramientas</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {dbs?.map((db: any) => (
                   <tr key={db.db_name} className="hover:bg-slate-50/30 transition-all group duration-300">
                      <td className="px-8 py-5">
                         <div className="text-[17px] font-black text-slate-900 group-hover:text-[#00A3FF] transition-colors">{db.db_name}</div>
                         <div className="flex gap-3 items-center mt-1.5">
                           <span className="text-[11px] text-slate-500 font-bold uppercase tracking-tight">Usuario: {db.db_user}</span>
                           <button 
                             onClick={() => setEditingUser(db.db_user)}
                             className="text-[9px] bg-slate-100 text-[#00A3FF] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md hover:bg-[#00A3FF] hover:text-white transition-all shadow-sm"
                           >
                              Reset Pass
                           </button>
                         </div>
                         {editingUser === db.db_user && (
                            <div className="mt-4 flex gap-2 w-full max-w-xs animate-in slide-in-from-top-2">
                               <input type="text" placeholder="Nueva Clave" value={newPass} onChange={e => setNewPass(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 px-3 py-2 text-xs rounded-xl outline-none focus:border-[#00A3FF] transition-all" />
                               <button onClick={() => resetPassMutation.mutate({ user: db.db_user, pass: newPass })} className="bg-[#00A3FF] text-white font-bold text-[10px] uppercase px-4 rounded-xl shadow-sm hover:bg-[#008EE0]">Guardar</button>
                               <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600 px-1 material-symbols-outlined text-[20px]">close</button>
                            </div>
                         )}
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                           <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-400 uppercase">{db.owner_username?.charAt(0)}</div>
                           <span className="text-slate-600 font-bold text-xs uppercase tracking-tight">{db.owner_username}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-center">
                         <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border ${db.type === 'wordpress' ? 'border-blue-200 text-blue-600 bg-blue-50' : 'border-purple-200 text-purple-600 bg-purple-50'}`}>
                           {db.type}
                         </span>
                      </td>
                      <td className="px-8 py-5 text-slate-500 font-bold text-sm">{db.size_mb} MB</td>
                      <td className="px-8 py-5 text-right space-x-2">
                         <button
                           onClick={() => generateSsoMutation.mutate(db.db_name)}
                           className="inline-flex items-center gap-2 bg-[#00A3FF]/10 text-[#00A3FF] hover:bg-[#00A3FF] hover:text-white border border-[#00A3FF]/10 px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm active:scale-95"
                         >
                            <span className="material-symbols-outlined text-[16px]">login</span>
                            Entrar PMA
                         </button>
                         <div className="inline-flex gap-1">
                            <button
                              onClick={() => { if(confirm("¿Recalcular optimizaciones?")) optimizeMutation.mutate(db.db_name) }}
                              title="Optimizar Tabla"
                              className="w-10 h-10 bg-slate-50 text-slate-400 hover:text-[#00A3FF] hover:bg-[#00A3FF]/5 border border-slate-100 rounded-xl transition-all flex items-center justify-center shadow-sm"
                            >
                               <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
                            </button>
                            <button
                              onClick={() => { if(confirm("¿Reparar esquemas?")) repairMutation.mutate(db.db_name) }}
                              title="Reparar Tabla"
                              className="w-10 h-10 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-100 rounded-xl transition-all flex items-center justify-center shadow-sm"
                            >
                               <span className="material-symbols-outlined text-[18px]">build</span>
                            </button>
                         </div>
                      </td>
                   </tr>
                ))}
                {(!dbs || dbs.length === 0) && !isLoading && (
                  <tr>
                    <td colSpan={5} className="p-20 text-center text-slate-400 italic font-medium">No se encontraron bases de datos activas.</td>
                  </tr>
                )}
             </tbody>
          </table>
      </div>
    </div>
  );
}
