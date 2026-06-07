"use client";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchOdinDashboard } from "../../../../lib/api";

export default function SshAccessPage() {
  const [sshKeys, setSshKeys] = useState<{ id: string; name: string; key: string; date: string }[]>([
    {
      id: "1",
      name: "Llave de Producción Laptop",
      key: "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDC7F... dev@laptop",
      date: "28 May 2026"
    }
  ]);
  const [keyName, setKeyName] = useState("");
  const [keyValue, setKeyValue] = useState("");

  const { data: stats } = useQuery({
    queryKey: ["user_dashboard_stats"],
    queryFn: fetchOdinDashboard
  });

  const handleAddKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName || !keyValue) return;
    setSshKeys([
      ...sshKeys,
      {
        id: Date.now().toString(),
        name: keyName,
        key: keyValue,
        date: new Date().toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })
      }
    ]);
    setKeyName("");
    setKeyValue("");
    alert("Llave SSH autorizada con éxito (Simulado).");
  };

  const handleDeleteKey = (id: string) => {
    if (confirm("¿Estás seguro de que deseas revocar esta llave SSH?")) {
      setSshKeys(sshKeys.filter((k) => k.id !== id));
    }
  };

  const username = stats?.account?.plan ? "user_" + stats.account.plan.toLowerCase() : "cliente";
  const serverIp = "127.0.0.1"; // default fallback local

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-10">
         <div className="space-y-1.5">
           <div className="flex items-center gap-3 mb-1">
              <span className="px-2.5 py-1 bg-[#00A3FF]/10 text-[#00A3FF] text-[10px] font-bold uppercase rounded-full tracking-wider">
                 Seguridad
              </span>
           </div>
           <h1 className="text-5xl font-black text-slate-900 uppercase">
             Acceso <span className="text-[#00A3FF]">SSH</span>
           </h1>
           <p className="text-slate-500 text-sm font-medium mt-2">
             Conéctate de forma segura al shell de tu servidor para administrar archivos, paquetes y depurar tus aplicaciones.
           </p>
         </div>
      </header>

      {/* SSH Connection Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm space-y-8 relative overflow-hidden">
            <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-3 border-b border-slate-100 pb-6">
              <span className="material-symbols-outlined text-[#00A3FF]">terminal</span>
              Credenciales de Conexión
            </h3>
            
            <div className="space-y-6">
               <div className="p-6 bg-slate-900 rounded-3xl text-white font-mono text-xs flex justify-between items-center group/code relative overflow-hidden shadow-inner">
                  <div className="space-y-1">
                     <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest block">Comando de terminal</span>
                     <span className="text-sm text-[#00E5FF] font-bold">ssh {username}@{serverIp} -p 22</span>
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`ssh ${username}@${serverIp} -p 22`);
                      alert("Comando copiado al portapapeles");
                    }}
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all flex items-center justify-center border border-white/5"
                  >
                     <span className="material-symbols-outlined text-base">content_copy</span>
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl">
                     <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Servidor (Host)</div>
                     <div className="text-sm font-bold text-slate-700 font-mono">{serverIp}</div>
                  </div>
                  <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl">
                     <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Puerto Shell</div>
                     <div className="text-sm font-bold text-slate-700 font-mono">22</div>
                  </div>
                  <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl">
                     <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Usuario SSH</div>
                     <div className="text-sm font-bold text-slate-700 font-mono">{username}</div>
                  </div>
               </div>
            </div>
            <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-[#00A3FF]/5 blur-[60px] rounded-full pointer-events-none"></div>
         </div>

         <div className="bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl flex flex-col justify-between text-white relative overflow-hidden">
            <div className="space-y-6 relative z-10">
               <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-[#00A3FF] border border-white/10 shadow-inner">
                  <span className="material-symbols-outlined text-2xl">verified_user</span>
               </div>
               <div>
                  <h4 className="text-lg font-black uppercase tracking-tight">Acceso Seguro</h4>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                     Para conectarte, debes añadir la clave pública de tu máquina en la sección derecha. Se desactivan los inicios de sesión por contraseña tradicional para evitar ataques de fuerza bruta.
                  </p>
               </div>
            </div>
            <div className="mt-8 pt-6 border-t border-white/5 relative z-10">
               <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Protocolo Estándar</span>
               <span className="text-xs font-bold text-[#00A3FF]">OpenSSH RSA / ED25519</span>
            </div>
            <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(0,163,255,0.05),transparent)] pointer-events-none"></div>
         </div>
      </div>

      {/* SSH Keys Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Add Key Form */}
         <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden">
            <form onSubmit={handleAddKey} className="space-y-6">
               <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-3 border-b border-slate-100 pb-6">
                  <span className="material-symbols-outlined text-[#00A3FF]">vpn_key</span>
                  Autorizar Clave Pública SSH
               </h3>

               <div className="space-y-4">
                  <div className="space-y-2">
                     <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre Identificador</label>
                     <input 
                       type="text" 
                       placeholder="ej: Mi MacBook Pro"
                       value={keyName}
                       onChange={(e) => setKeyName(e.target.value)}
                       required
                       className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold text-sm outline-none focus:border-[#00A3FF] focus:bg-white transition-all shadow-inner"
                     />
                  </div>

                  <div className="space-y-2">
                     <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Contenido de la Clave (id_rsa.pub)</label>
                     <textarea 
                       rows={4}
                       placeholder="Comienza con 'ssh-rsa' o 'ssh-ed25519'..."
                       value={keyValue}
                       onChange={(e) => setKeyValue(e.target.value)}
                       required
                       className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-mono text-xs outline-none focus:border-[#00A3FF] focus:bg-white transition-all shadow-inner resize-none"
                     />
                  </div>

                  <button className="w-full bg-[#00A3FF] py-4 rounded-2xl text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-[#00A3FF]/20 hover:bg-[#008EE0] active:scale-[0.98] transition-all">
                     Agregar Clave
                  </button>
               </div>
            </form>
         </div>

         {/* Active Keys List */}
         <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 uppercase mb-8 flex items-center gap-3 border-b border-slate-100 pb-6">
               <span className="material-symbols-outlined text-[#00A3FF]">lock_open</span>
               Claves Autorizadas
            </h3>

            <div className="space-y-4 max-h-[360px] overflow-y-auto pr-2">
               {sshKeys.map((k) => (
                  <div key={k.id} className="p-6 bg-slate-50 border border-slate-100 rounded-3xl flex justify-between items-center group relative overflow-hidden">
                     <div className="space-y-2 w-3/4">
                        <div className="flex items-center gap-3">
                           <span className="text-sm font-black text-slate-900">{k.name}</span>
                           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{k.date}</span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-400 truncate leading-relaxed">{k.key}</p>
                     </div>
                     <button 
                       onClick={() => handleDeleteKey(k.id)}
                       className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm"
                     >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                     </button>
                  </div>
               ))}
               {sshKeys.length === 0 && (
                  <div className="text-center text-slate-400 font-bold uppercase text-[11px] tracking-widest py-10">
                     No hay llaves SSH configuradas.
                  </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
}
