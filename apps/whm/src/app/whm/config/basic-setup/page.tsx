"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { fetchSettings, saveSettings } from "../../../../lib/api";

export default function BasicSetupPage() {
  const [setupMode, setSetupMode] = useState<"inherit" | "explicit">("inherit");
  const [nameservers, setNameservers] = useState({
    ns1: "ns1.odisea.cloud",
    ns2: "ns2.odisea.cloud",
    ns3: "",
    ns4: "",
  });

  const [smtpConfig, setSmtpConfig] = useState({
    smtp_host: "",
    smtp_port: "25",
    smtp_user: "",
    smtp_pass: "",
    smtp_secure: "false",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings()
      .then((data) => {
        if (data) {
          setSmtpConfig({
            smtp_host: data.smtp_host || "",
            smtp_port: data.smtp_port || "25",
            smtp_user: data.smtp_user || "",
            smtp_pass: data.smtp_pass || "",
            smtp_secure: data.smtp_secure || "false",
          });
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading settings:", err);
        setLoading(false);
      });
  }, []);

  const handleSaveConfig = async () => {
    try {
      await saveSettings(smtpConfig);
      alert("Configuración de SMTP guardada correctamente en la base de datos.");
    } catch (err: any) {
      alert("Error al guardar configuración: " + err.message);
    }
  };

  const explicitNameservers = {
    ns1: "",
    ns2: "",
    ns3: "",
    ns4: "",
  };

  const currentNS = setupMode === "inherit" ? nameservers : explicitNameservers;

  return (
    <div className="space-y-12 animate-in fade-in duration-700 max-w-5xl mx-auto pb-20">
      {/* Breadcrumbs & Header */}
      <header className="space-y-8 border-b border-slate-200 pb-10">
        <nav className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
           <Link href="/whm" className="hover:text-[#00A3FF] transition-colors">Inicio</Link>
           <span className="material-symbols-outlined text-[14px]">chevron_right</span>
           <Link href="/whm/config" className="hover:text-[#00A3FF] transition-colors">Configuración del servidor</Link>
           <span className="material-symbols-outlined text-[14px]">chevron_right</span>
           <span className="text-[#00A3FF]">Basic WebHost Manager® Setup</span>
        </nav>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1.5">
            <h1 className="text-5xl font-black text-slate-900 uppercase leading-none">
              Configuración <span className="text-[#00A3FF]">Básica</span>
            </h1>
            <p className="text-slate-500 text-sm font-medium mt-3">
              Administra los parámetros base de tu infraestructura y DNS predeterminado.
            </p>
          </div>
          <button 
            onClick={handleSaveConfig}
            className="bg-[#00A3FF] px-10 py-4 rounded-2xl text-white font-black tracking-widest active:scale-95 transition-all shadow-xl shadow-[#00A3FF]/20 uppercase text-[11px]"
          >
            Guardar Configuración
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-10">
         
         {/* Nameservers Section */}
         <section className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden shadow-sm group">
            <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
               <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-[#00A3FF]">
                     <span className="material-symbols-outlined text-3xl">language</span>
                  </div>
                  <div>
                     <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Nameservers</h2>
                     <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-1">Configuración DNS por defecto para nuevas cuentas</p>
                  </div>
               </div>
               <Link href="#" className="text-[#00A3FF] text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-2">
                  Documentación <span className="material-symbols-outlined text-[16px]">open_in_new</span>
               </Link>
            </div>

            <div className="p-10 space-y-12">
               
               {/* Option Selector */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div 
                     onClick={() => setSetupMode("inherit")}
                     className={`p-8 rounded-[2.5rem] border-2 cursor-pointer transition-all duration-300 relative group/opt ${
                       setupMode === "inherit" 
                       ? 'border-[#00A3FF] bg-[#00A3FF]/5 shadow-lg shadow-[#00A3FF]/5' 
                       : 'border-slate-100 bg-slate-50 hover:border-slate-300 hover:bg-white'
                     }`}
                  >
                     <div className="flex items-start justify-between mb-6">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${setupMode === 'inherit' ? 'bg-[#00A3FF] text-white' : 'bg-white text-slate-400 shadow-sm'}`}>
                           <span className="material-symbols-outlined">account_tree</span>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${setupMode === 'inherit' ? 'bg-[#00A3FF] border-[#00A3FF]' : 'border-slate-200'}`}>
                           {setupMode === 'inherit' && <span className="material-symbols-outlined text-white text-[14px] font-bold">check</span>}
                        </div>
                     </div>
                     <h3 className={`text-lg font-black uppercase tracking-tight ${setupMode === 'inherit' ? 'text-[#00A3FF]' : 'text-slate-900'}`}>Heredar de Root</h3>
                     <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">
                        Utiliza los nameservers predeterminados del servidor principal para todas las cuentas.
                     </p>
                  </div>

                  <div 
                     onClick={() => setSetupMode("explicit")}
                     className={`p-8 rounded-[2.5rem] border-2 cursor-pointer transition-all duration-300 relative group/opt ${
                       setupMode === "explicit" 
                       ? 'border-[#00A3FF] bg-[#00A3FF]/5 shadow-lg shadow-[#00A3FF]/5' 
                       : 'border-slate-100 bg-slate-50 hover:border-slate-300 hover:bg-white'
                     }`}
                  >
                     <div className="flex items-start justify-between mb-6">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${setupMode === 'explicit' ? 'bg-[#00A3FF] text-white' : 'bg-white text-slate-400 shadow-sm'}`}>
                           <span className="material-symbols-outlined">settings_input_component</span>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${setupMode === 'explicit' ? 'bg-[#00A3FF] border-[#00A3FF]' : 'border-slate-200'}`}>
                           {setupMode === 'explicit' && <span className="material-symbols-outlined text-white text-[14px] font-bold">check</span>}
                        </div>
                     </div>
                     <h3 className={`text-lg font-black uppercase tracking-tight ${setupMode === 'explicit' ? 'text-[#00A3FF]' : 'text-slate-900'}`}>Configurar Explícitamente</h3>
                     <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">
                        Establece nameservers personalizados que se transferirán con el usuario durante migraciones.
                     </p>
                  </div>
               </div>

               {/* Nameservers Inputs */}
               <div className="bg-slate-50 rounded-[3rem] p-10 space-y-8 border border-slate-100">
                  <div className="flex items-center gap-3 px-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-[#00A3FF]"></span>
                     <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Servidores DNS Activos</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <NSInput label="Nameserver 1" value={currentNS.ns1} disabled={setupMode === 'inherit'} />
                     <NSInput label="Nameserver 2" value={currentNS.ns2} disabled={setupMode === 'inherit'} />
                     <NSInput label="Nameserver 3" value={currentNS.ns3} disabled={setupMode === 'inherit'} />
                     <NSInput label="Nameserver 4" value={currentNS.ns4} disabled={setupMode === 'inherit'} />
                  </div>
               </div>

            </div>
         </section>

         {/* SMTP Configuration Section */}
         <section className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden shadow-sm group">
            <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
               <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-[#00A3FF]">
                     <span className="material-symbols-outlined text-3xl">alternate_email</span>
                  </div>
                  <div>
                     <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Servidor SMTP Global</h2>
                     <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-1">Configuración para correos del sistema (ej: restablecimiento de contraseñas)</p>
                  </div>
               </div>
            </div>

            <div className="p-10 space-y-12">
               <div className="bg-slate-50 rounded-[3rem] p-10 space-y-8 border border-slate-100">
                  <div className="flex items-center gap-3 px-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-[#00A3FF]"></span>
                     <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Credenciales de Salida</h4>
                  </div>

                  {loading ? (
                     <div className="p-10 flex flex-col items-center justify-center animate-pulse">
                        <div className="w-8 h-8 border-4 border-slate-100 border-t-[#00A3FF] rounded-full animate-spin mb-4"></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargando datos de SMTP...</p>
                     </div>
                  ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                           <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Host SMTP</label>
                           <input 
                             type="text" 
                             placeholder="ej: mail.odisea.cloud o smtp.gmail.com"
                             value={smtpConfig.smtp_host}
                             onChange={(e) => setSmtpConfig({...smtpConfig, smtp_host: e.target.value})}
                             className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-5 text-slate-900 font-bold text-sm outline-none focus:border-[#00A3FF] focus:shadow-[0_0_20px_rgba(0,163,255,0.1)] transition-all shadow-inner"
                          />
                        </div>

                        <div className="space-y-3">
                           <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Puerto SMTP</label>
                           <input 
                             type="text" 
                             placeholder="25, 465 o 587"
                             value={smtpConfig.smtp_port}
                             onChange={(e) => setSmtpConfig({...smtpConfig, smtp_port: e.target.value})}
                             className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-5 text-slate-900 font-bold text-sm outline-none focus:border-[#00A3FF] focus:shadow-[0_0_20px_rgba(0,163,255,0.1)] transition-all shadow-inner"
                          />
                        </div>

                        <div className="space-y-3">
                           <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Usuario SMTP</label>
                           <input 
                             type="text" 
                             placeholder="ej: admin@odisea.cloud"
                             value={smtpConfig.smtp_user}
                             onChange={(e) => setSmtpConfig({...smtpConfig, smtp_user: e.target.value})}
                             className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-5 text-slate-900 font-bold text-sm outline-none focus:border-[#00A3FF] focus:shadow-[0_0_20px_rgba(0,163,255,0.1)] transition-all shadow-inner"
                          />
                        </div>

                        <div className="space-y-3">
                           <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Contraseña SMTP</label>
                           <input 
                             type="password" 
                             placeholder="••••••••"
                             value={smtpConfig.smtp_pass}
                             onChange={(e) => setSmtpConfig({...smtpConfig, smtp_pass: e.target.value})}
                             className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-5 text-slate-900 font-bold text-sm outline-none focus:border-[#00A3FF] focus:shadow-[0_0_20px_rgba(0,163,255,0.1)] transition-all shadow-inner"
                          />
                        </div>

                        <div className="space-y-3 md:col-span-2">
                           <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Conexión Segura (SSL/TLS)</label>
                           <select 
                             value={smtpConfig.smtp_secure}
                             onChange={(e) => setSmtpConfig({...smtpConfig, smtp_secure: e.target.value})}
                             className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-5 text-slate-900 font-bold text-sm outline-none focus:border-[#00A3FF] transition-all"
                           >
                              <option value="false">Desactivado (Sin Cifrado / TLS con STARTTLS)</option>
                              <option value="true">Activado (SSL/TLS Directo)</option>
                           </select>
                        </div>
                     </div>
                  )}
               </div>
            </div>
         </section>

      </div>
    </div>
  );
}

function NSInput({ label, value, disabled }: { label: string; value: string; disabled: boolean }) {
  return (
    <div className="space-y-3 group/in">
       <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-2">
          {label}
          {disabled && <span className="material-symbols-outlined text-[14px] opacity-50">lock</span>}
       </label>
       <div className="relative">
          <input 
            type="text" 
            value={value}
            onChange={() => {}}
            disabled={disabled}
            className={`w-full border rounded-2xl px-6 py-5 text-slate-900 font-bold text-sm outline-none transition-all shadow-inner ${
              disabled 
              ? 'bg-slate-100/50 border-slate-200 text-slate-400 cursor-not-allowed' 
              : 'bg-white border-slate-200 focus:border-[#00A3FF] focus:shadow-[0_0_20px_rgba(0,163,255,0.1)]'
            }`}
          />
          {!disabled && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center">
               <span className="material-symbols-outlined text-[18px]">verified</span>
            </div>
          )}
       </div>
    </div>
  );
}
