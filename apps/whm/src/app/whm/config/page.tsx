"use client";

import React from "react";
import { useWhmDashboard } from "../../../lib/hooks/use-whm-accounts";

export default function ServerConfigPage() {
  const { data: stats, isLoading } = useWhmDashboard();

  return (
    <div className="space-y-12 animate-in fade-in duration-700 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 mb-1">
             <span className="px-2.5 py-1 bg-[#00A3FF]/10 text-[#00A3FF] text-[10px] font-bold uppercase rounded-full tracking-wider">
                Sistemas Base
             </span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 uppercase">
            Configuración del <span className="text-[#00A3FF]">Servidor</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-2">
            Parámetros globales de infraestructura y telemetría de hardware en tiempo real.
          </p>
        </div>
        <div className="flex gap-4">
           <button className="px-6 py-3.5 bg-white text-slate-500 rounded-xl font-bold text-[11px] tracking-widest uppercase border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm">
              Reiniciar Servidor
           </button>
           <button className="bg-[#00A3FF] px-8 py-4 rounded-xl text-white font-bold tracking-widest active:scale-95 transition-all shadow-lg shadow-[#00A3FF]/20 uppercase text-xs">
             Guardar Cambios
           </button>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <ConfigCard title="Software Instalado" icon="terminal">
            <dl className="space-y-4">
               <ConfigItem label="Sistema Operativo" value={stats?.server.system?.os || "Ubuntu 22.04 LTS"} />
               <ConfigItem label="Plataforma" value={stats?.server.system?.platform || "Linux"} />
               <ConfigItem label="Servidor Web" value="Nginx/1.24.0 (Odisea Opt.)" />
               <ConfigItem label="Versión PHP Global" value="8.3.4 (FPM)" />
               <ConfigItem label="Entorno Node.js" value="20.11.1 (LTS)" />
            </dl>
         </ConfigCard>

         <ConfigCard title="Telemetría" icon="memory">
            <div className="space-y-8">
               <TelemetryBar label="Uso de CPU" value={stats?.server.cpu ?? 0} color="azure" loading={isLoading} />
               <TelemetryBar label="Uso de RAM" value={stats?.server.ram ?? 0} color="cyan" loading={isLoading} />
               <TelemetryBar label="Uso de Disco" value={stats?.server.disk ?? 0} color="azure" loading={isLoading} />
               
               <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
                  <div>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Procesador</span>
                     <span className="text-xs text-slate-700 font-bold truncate block" title={stats?.server.system?.cpuModel}>
                        {stats?.server.system?.cpuModel || "Cargando..."}
                     </span>
                  </div>
                  <div>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Memoria RAM</span>
                     <span className="text-xs text-slate-700 font-bold">
                        {stats?.server.system?.totalRamGB ? `${stats.server.system.totalRamGB} GB Total` : "Cargando..."}
                     </span>
                  </div>
               </div>
            </div>
         </ConfigCard>

         <ConfigCard title="Red y Seguridad" icon="security">
              <dl className="space-y-4">
               <ConfigItem label="IP Primaria" value="192.168.1.100" />
               <ConfigItem label="Servidores DNS" value="ns1.odisea.cloud" />
               <ConfigItem label="Firewall Activo" value="Protegido" badge="emerald" />
               <ConfigItem label="Certificados SSL" value="Auto-Renovable" badge="azure" />
               <ConfigItem label="Acceso SSH" value="Puerto 22345 (Key)" />
            </dl>
         </ConfigCard>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 relative overflow-hidden group shadow-sm hover:border-[#00A3FF]/30 transition-all cursor-pointer" onClick={() => window.location.href = '/whm/config/basic-setup'}>
           <div className="flex items-center gap-5 mb-10 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-[#00A3FF]/5 flex items-center justify-center text-[#00A3FF] border border-[#00A3FF]/10">
                 <span className="material-symbols-outlined text-3xl">settings_account_box</span>
              </div>
              <div>
                 <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Basic Setup</h3>
                 <p className="text-[11px] text-slate-500 font-bold tracking-widest uppercase mt-1">Configuración base y Nameservers</p>
              </div>
              <div className="ml-auto w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#00A3FF] group-hover:text-white transition-all">
                 <span className="material-symbols-outlined">arrow_forward</span>
              </div>
           </div>
           <p className="text-sm text-slate-500 font-medium leading-relaxed relative z-10">
              Configura los nombres de servidor predeterminados y la información de contacto global del administrador.
           </p>
           <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-[#00A3FF]/5 blur-[100px] rounded-full pointer-events-none group-hover:bg-[#00A3FF]/10 transition-all duration-1000"></div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 relative overflow-hidden group shadow-sm">
           <div className="flex items-center gap-5 mb-10 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-[#00A3FF]/5 flex items-center justify-center text-[#00A3FF] border border-[#00A3FF]/10">
                 <span className="material-symbols-outlined text-3xl">dns</span>
              </div>
              <div>
                 <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Global PHP</h3>
                 <p className="text-[11px] text-slate-500 font-bold tracking-widest uppercase mt-1">Archivo Odisea.ini</p>
              </div>
           </div>
           
           <div className="grid grid-cols-2 gap-4 relative z-10">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-1">
                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Memory Limit</span>
                 <span className="text-lg font-black text-slate-900">512M</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-1">
                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Post Max Size</span>
                 <span className="text-lg font-black text-slate-900">128M</span>
              </div>
           </div>
           <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-[#00A3FF]/5 blur-[100px] rounded-full pointer-events-none group-hover:bg-[#00A3FF]/10 transition-all duration-1000"></div>
        </div>
      </div>
    </div>
  );
}

function ConfigCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 flex flex-col h-full group hover:border-[#00A3FF]/30 transition-all duration-500 shadow-sm hover:shadow-lg">
       <div className="flex items-center gap-5 mb-10">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#00A3FF] group-hover:text-white transition-all shadow-sm">
             <span className="material-symbols-outlined">{icon}</span>
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase">{title}</h3>
       </div>
       <div className="flex-1">
          {children}
       </div>
    </div>
  );
}

function ConfigItem({ label, value, badge }: { label: string; value: string; badge?: 'emerald' | 'azure' }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0">
       <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
       {badge ? (
          <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border ${
             badge === 'emerald' ? 'border-emerald-200 text-emerald-600 bg-emerald-50' : 'border-[#00A3FF]/20 text-[#00A3FF] bg-[#00A3FF]/5'
          }`}>{value}</span>
       ) : (
          <span className="text-[13px] text-slate-800 font-bold">{value}</span>
       )}
    </div>
  );
}

function TelemetryBar({ label, value, color, loading }: { label: string; value: number; color: 'azure' | 'cyan'; loading?: boolean }) {
  return (
    <div className="space-y-3">
       <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest">
          <span className="text-slate-500">{label}</span>
          <span className={color === 'azure' ? 'text-[#00A3FF]' : 'text-cyan-600'}>{loading ? '...' : `${value}%`}</span>
       </div>
       <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
          <div 
             className={`h-full transition-all duration-1000 ease-out ${color === 'azure' ? 'bg-[#00A3FF] shadow-[0_0_15px_rgba(0,163,255,0.3)]' : 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]'}`}
             style={{ width: loading ? '0%' : `${value}%` }}
          ></div>
       </div>
    </div>
  );
}

function SettingField({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-[#00A3FF]/20 hover:bg-white transition-all flex flex-col gap-3 shadow-inner">
       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
       <input defaultValue={value} className="bg-transparent border-none outline-none text-slate-900 font-black text-2xl w-full" />
    </div>
  );
}
