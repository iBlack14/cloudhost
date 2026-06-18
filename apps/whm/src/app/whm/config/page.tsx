"use client";

import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWhmDashboard } from "../../../lib/hooks/use-whm-accounts";
import { API_BASE, whmAuthHeaders } from "../../../lib/api";

interface ServerConfig {
  network: {
    primaryIp: string;
    nameserver: string;
    sshPort: string;
    firewallActive: boolean;
  };
  software: {
    os: string;
    platform: string;
    nginx: string;
    nodejs: string;
    phpGlobal: string;
  };
  hardware: {
    cpuModel: string;
    cpuCores: number;
    totalRamGB: number;
  };
}

export default function ServerConfigPage() {
  const { data: stats, isLoading: statsLoading } = useWhmDashboard();

  const { data: config, isLoading: configLoading } = useQuery<ServerConfig>({
    queryKey: ["whm_server_config"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/whm/server/config`, { headers: whmAuthHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Error");
      return data.data;
    },
    staleTime: 30_000, // cache 30s — software versions don't change often
  });

  const rebootMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/whm/server/reboot`, {
        method: "POST",
        headers: whmAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Error al reiniciar");
      return data;
    },
    onSuccess: (data) => {
      toast.success(data?.data?.message ?? "Reinicio programado");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al reiniciar el servidor"),
  });

  const handleReboot = () => {
    if (confirm("⚠️ ¿Estás seguro de que deseas reiniciar el servidor? Todos los servicios serán interrumpidos temporalmente.")) {
      rebootMutation.mutate();
    }
  };

  const loading = configLoading || statsLoading;

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
           <button
             onClick={handleReboot}
             disabled={rebootMutation.isPending}
             className="px-6 py-3.5 bg-white text-red-500 rounded-xl font-bold text-[11px] tracking-widest uppercase border border-red-100 hover:bg-red-50 hover:border-red-200 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
           >
             <span className={`material-symbols-outlined text-[18px] ${rebootMutation.isPending ? 'animate-spin' : ''}`}>
               {rebootMutation.isPending ? 'autorenew' : 'restart_alt'}
             </span>
             {rebootMutation.isPending ? 'Programando...' : 'Reiniciar Servidor'}
           </button>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <ConfigCard title="Software Instalado" icon="terminal" loading={loading}>
            <dl className="space-y-4">
               <ConfigItem label="Sistema Operativo" value={config?.software.os || "Cargando..."} />
               <ConfigItem label="Plataforma" value={config?.software.platform || "Cargando..."} />
               <ConfigItem label="Servidor Web" value={config?.software.nginx || "Cargando..."} />
               <ConfigItem label="PHP Global" value={config?.software.phpGlobal || "Cargando..."} />
               <ConfigItem label="Node.js" value={config?.software.nodejs || "Cargando..."} />
            </dl>
         </ConfigCard>

         <ConfigCard title="Telemetría" icon="memory" loading={statsLoading}>
            <div className="space-y-8">
               <TelemetryBar label="Uso de CPU" value={stats?.server.cpu ?? 0} loading={statsLoading} />
               <TelemetryBar label="Uso de RAM" value={stats?.server.ram ?? 0} loading={statsLoading} />
               <TelemetryBar label="Uso de Disco" value={stats?.server.disk ?? 0} loading={statsLoading} />
               
               <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
                  <div>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Procesador</span>
                     <span className="text-xs text-slate-700 font-bold truncate block" title={config?.hardware.cpuModel}>
                        {config?.hardware.cpuModel || stats?.server.system?.cpuModel || "Cargando..."}
                     </span>
                  </div>
                  <div>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Núcleos / RAM</span>
                     <span className="text-xs text-slate-700 font-bold">
                        {config?.hardware.cpuCores ? `${config.hardware.cpuCores} cores` : "..."} / {config?.hardware.totalRamGB ? `${config.hardware.totalRamGB} GB` : "..."}
                     </span>
                  </div>
               </div>
            </div>
         </ConfigCard>

         <ConfigCard title="Red y Seguridad" icon="security" loading={loading}>
              <dl className="space-y-4">
               <ConfigItem label="IP Primaria" value={config?.network.primaryIp || "Cargando..."} />
               <ConfigItem label="Nameserver" value={config?.network.nameserver || "Cargando..."} />
               <ConfigItem
                 label="Firewall"
                 value={config ? (config.network.firewallActive ? "Activo (UFW)" : "Inactivo") : "Cargando..."}
                 badge={config ? (config.network.firewallActive ? "emerald" : "red") : undefined}
               />
               <ConfigItem label="Certificados SSL" value="Auto-Renovable (Certbot)" badge="azure" />
               <ConfigItem label="Puerto SSH" value={config?.network.sshPort ? `Puerto ${config.network.sshPort}` : "Cargando..."} />
            </dl>
         </ConfigCard>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div
          className="bg-white border border-slate-200 rounded-[2.5rem] p-10 relative overflow-hidden group shadow-sm hover:border-[#00A3FF]/30 transition-all cursor-pointer"
          onClick={() => window.location.href = '/whm/config/basic-setup'}
        >
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
                 <span className="material-symbols-outlined text-3xl">developer_board</span>
              </div>
              <div>
                 <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">PHP Global</h3>
                 <p className="text-[11px] text-slate-500 font-bold tracking-widest uppercase mt-1">Versión activa del servidor</p>
              </div>
           </div>
           
           <div className="grid grid-cols-2 gap-4 relative z-10">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-1">
                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Versión Activa</span>
                 <span className="text-lg font-black text-slate-900 truncate">
                   {configLoading ? "..." : (config?.software.phpGlobal || "N/D")}
                 </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-1">
                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Gestor</span>
                 <span className="text-lg font-black text-slate-900">PHP-FPM</span>
              </div>
           </div>
           <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-[#00A3FF]/5 blur-[100px] rounded-full pointer-events-none group-hover:bg-[#00A3FF]/10 transition-all duration-1000"></div>
        </div>
      </div>
    </div>
  );
}

function ConfigCard({ title, icon, children, loading }: { title: string; icon: string; children: React.ReactNode; loading?: boolean }) {
  return (
    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 flex flex-col h-full group hover:border-[#00A3FF]/30 transition-all duration-500 shadow-sm hover:shadow-lg">
       <div className="flex items-center gap-5 mb-10">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm ${loading ? 'bg-slate-100 text-slate-300 animate-pulse' : 'bg-slate-50 text-slate-400 group-hover:bg-[#00A3FF] group-hover:text-white'}`}>
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

function ConfigItem({ label, value, badge }: { label: string; value: string; badge?: 'emerald' | 'azure' | 'red' }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0">
       <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
       {badge ? (
          <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border ${
             badge === 'emerald' ? 'border-emerald-200 text-emerald-600 bg-emerald-50'
             : badge === 'red' ? 'border-red-200 text-red-600 bg-red-50'
             : 'border-[#00A3FF]/20 text-[#00A3FF] bg-[#00A3FF]/5'
          }`}>{value}</span>
       ) : (
          <span className="text-[13px] text-slate-800 font-bold">{value}</span>
       )}
    </div>
  );
}

function TelemetryBar({ label, value, loading }: { label: string; value: number; loading?: boolean }) {
  const color = value >= 85 ? "bg-red-500" : value >= 60 ? "bg-amber-500" : "bg-[#00A3FF]";
  const textColor = value >= 85 ? "text-red-500" : value >= 60 ? "text-amber-500" : "text-[#00A3FF]";
  return (
    <div className="space-y-3">
       <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest">
          <span className="text-slate-500">{label}</span>
          <span className={loading ? "text-slate-300" : textColor}>{loading ? '...' : `${value}%`}</span>
       </div>
       <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
          <div
             className={`h-full transition-all duration-1000 ease-out ${color}`}
             style={{ width: loading ? '0%' : `${value}%` }}
          ></div>
       </div>
    </div>
  );
}
