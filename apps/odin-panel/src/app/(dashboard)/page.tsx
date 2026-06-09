"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchOdinDashboard } from "../../lib/api";
import Link from "next/link";

export default function UserDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["user_dashboard_stats"],
    queryFn: fetchOdinDashboard
  });

  const getExpiryText = () => {
    if (!stats?.account.expiresAt) return "Sin Expiración";
    const date = new Date(stats.account.expiresAt);
    return `Expira: ${date.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}`;
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center p-24 bg-white border border-slate-200 rounded-[3rem] animate-pulse">
      <div className="w-12 h-12 border-4 border-slate-100 border-t-[#00A3FF] rounded-full animate-spin mb-4"></div>
      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Sincronizando Dashboard...</p>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 mb-1">
             <span className="px-2.5 py-1 bg-[#00A3FF]/10 text-[#00A3FF] text-[10px] font-bold uppercase rounded-full tracking-wider">
                Infraestructura Activa
             </span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 uppercase">
            Panel de <span className="text-[#00A3FF]">Control</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-2">
            Bienvenido a tu terminal de servicios en la nube de Odisea Cloud.
          </p>
        </div>
      </header>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <StatCard title="Sitios Web" value={stats?.services.domains || 0} icon="language" color="#00A3FF" />
         <StatCard title="Bases de Datos" value={stats?.services.databases || 0} icon="database" color="#8B5CF6" />
         <StatCard title="Correos Activos" value={stats?.services.emails || 0} icon="alternate_email" color="#F59E0B" />
         <StatCard title="Uso de Disco" value={`${stats?.account.diskUsed || 0} MB`} icon="hard_drive" color="#10B981" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
         {/* Service Categories Grid */}
         <div className="lg:col-span-3 space-y-10">
            <ServiceCategory 
              title="Correo Electrónico" 
              icon="mail" 
              items={[
                { label: "Cuentas de correo", icon: "contact_mail", href: "/email/accounts" },
                { label: "Reenviadores", icon: "forward_to_inbox", href: "/email/forwarders" },
                { label: "Enrutamiento", icon: "route", href: "/email/routing" },
                { label: "Auto contestadores", icon: "reply_all", href: "/email/autoresponders" },
                { label: "Dirección por defecto", icon: "alternate_email", href: "/email/default-address" },
                { label: "Listas de correos", icon: "list_alt", href: "/email/lists" },
                { label: "Monitorizar el envío", icon: "monitoring", href: "/email/delivery" },
                { label: "Filtros de correo", icon: "filter_alt", href: "/email/filters" },
                { label: "Cifrado", icon: "enhanced_encryption", href: "/email/encryption" },
                { label: "Uso del disco", icon: "storage", href: "/email/usage" },
              ]}
            />

            <ServiceCategory 
              title="Archivos" 
              icon="folder_open" 
              items={[
                { label: "Administrador de archivos", icon: "folder_managed", href: "/files" },
                { label: "Imágenes", icon: "image", href: "/files/images" },
                { label: "Privacidad del directorio", icon: "lock", href: "/files/privacy" },
                { label: "Uso del disco", icon: "pie_chart", href: "/files/usage" },
                { label: "Copias de seguridad", icon: "backup", href: "/files/backup" },
                { label: "Git™ Version Control", icon: "account_tree", href: "/files/git" },
              ]}
            />

            <ServiceCategory 
              title="Bases de Datos" 
              icon="database" 
              items={[
                { label: "phpMyAdmin", icon: "data_exploration", href: "/databases" },
                { label: "MySQL Databases", icon: "database", href: "/databases" },
                { label: "Database Wizard", icon: "magic_button", href: "/databases/wizard" },
                { label: "Remote MySQL", icon: "settings_remote", href: "/databases/remote" },
              ]}
            />

            <ServiceCategory 
              title="Dominios" 
              icon="language" 
              items={[
                { label: "WordPress Management", icon: "deployed_code", href: "/wordpress" },
                { label: "Dominios", icon: "public", href: "/domains" },
                { label: "Subdominios", icon: "layers", href: "/domains/subdomains" },
                { label: "Redirige", icon: "shortcut", href: "/domains/redirects" },
                { label: "Zone Editor", icon: "dns", href: "/domains/zone-editor" },
              ]}
            />

            <ServiceCategory 
              title="Software" 
              icon="terminal" 
              items={[
                { label: "PHP Selector", icon: "developer_board", href: "/php" },
                { label: "Node.js Engine", icon: "javascript", href: "/nodejs" },
                { label: "Python Grid", icon: "code_blocks", href: "/python" },
                { label: "WordPress Manager", icon: "settings_applications", href: "/wordpress/manager" },
              ]}
            />

            <ServiceCategory 
              title="Seguridad" 
              icon="security" 
              items={[
                { label: "SSH Access", icon: "terminal", href: "/security/ssh" },
                { label: "IP Blocker", icon: "block", href: "/security/ip-blocker" },
                { label: "SSL/TLS", icon: "encrypted", href: "/security/ssl" },
                { label: "Manage API Tokens", icon: "key", href: "/security/api-tokens" },
                { label: "Two-Factor Auth", icon: "vibration", href: "/security/2fa" },
              ]}
            />

            <ServiceCategory 
              title="Avanzado" 
              icon="settings" 
              items={[
                { label: "Terminal", icon: "terminal", href: "/advanced/terminal" },
                { label: "Cron Jobs", icon: "schedule", href: "/advanced/cron" },
                { label: "Track DNS", icon: "travel_explore", href: "/advanced/dns" },
                { label: "Error Pages", icon: "error", href: "/advanced/errors" },
                { label: "Indexes", icon: "list", href: "/advanced/indexes" },
              ]}
            />
         </div>

         {/* Right Sidebar - Resource Consumption & Plan */}
         <div className="space-y-6">
            {/* Resource Consumption */}
            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm relative overflow-hidden group">
                <div className="relative z-10">
                    <h3 className="text-xs font-black text-slate-900 uppercase mb-5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-[#00A3FF]">
                          <span className="material-symbols-outlined text-[18px]">bar_chart</span>
                      </div>
                      Estadísticas
                    </h3>
                    <div className="space-y-4">
                      <ProgressBar label="NVMe" used={stats?.account.diskUsed || 0} total={stats?.account.diskLimit || 5120} unit="MB" color="#00A3FF" />
                      <ProgressBar label="CPU" used={stats?.server.cpu || 0} total={100} unit="%" color="#8B5CF6" />
                      <ProgressBar label="RAM" used={stats?.server.ram || 0} total={100} unit="%" color="#10B981" />
                      <ProgressBar label="Correos" used={stats?.services.emails || 0} total={10} unit="" color="#F59E0B" />
                    </div>
                </div>
                <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-slate-50 blur-[120px] rounded-full pointer-events-none"></div>
            </div>

            {/* Plan Info */}
            <div className="bg-slate-900 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden group flex flex-col">
                <div className="relative z-10 flex flex-col h-full space-y-5">
                  <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#00A3FF] border border-white/10 shadow-inner">
                        <span className="material-symbols-outlined text-xl">workspace_premium</span>
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-tight">Tu Plan</h3>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Suscripción Activa</p>
                      </div>
                  </div>
                  
                  <div>
                      <div className="text-xl font-black text-[#00A3FF] uppercase tracking-tighter mb-1 leading-tight">{stats?.account.plan || "Starter"}</div>
                      <div className="inline-flex px-2 py-0.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        {getExpiryText()}
                      </div>
                  </div>

                  <div className="space-y-2.5 pt-2">
                      <button className="w-full py-2.5 bg-[#00A3FF] text-white font-black uppercase text-[9px] tracking-widest rounded-xl shadow-xl shadow-[#00A3FF]/20 hover:bg-[#008EE0] active:scale-[0.98] transition-all">
                        Mejorar Plan
                      </button>
                      <button className="w-full py-2.5 bg-white/5 border border-white/10 text-slate-400 font-black uppercase text-[9px] tracking-widest rounded-xl hover:bg-white/10 hover:text-white transition-all">
                        Soporte VIP 24/7
                      </button>
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(0,163,255,0.1),transparent)] pointer-events-none"></div>
            </div>
         </div>
      </div>
    </div>
  );
}

function ServiceCategory({ title, icon, items }: { title: string; icon: string; items: { label: string; icon: string; href: string }[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm group hover:border-slate-300 transition-all duration-500">
       <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-4">
          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-[#00A3FF] group-hover:bg-[#00A3FF]/5 transition-all">
             <span className="material-symbols-outlined text-[18px]">{icon}</span>
          </div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">{title}</h3>
       </div>
       <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3">
          {items.map((item, idx) => (
            <Link 
              key={idx} 
              href={item.href}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200/80 transition-all group/item"
            >
               <span className="material-symbols-outlined text-slate-400 group-hover/item:text-[#00A3FF] transition-colors text-[20px]">{item.icon}</span>
               <span className="text-[11px] font-bold text-slate-600 group-hover/item:text-slate-900 leading-tight">{item.label}</span>
            </Link>
          ))}
       </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: string | number; icon: string; color: string }) {
  return (
    <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-sm group hover:border-[#00A3FF]/30 transition-all duration-500 relative overflow-hidden">
       <div className="relative z-10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-all duration-500" style={{ color }}>
             <span className="material-symbols-outlined text-lg">{icon}</span>
          </div>
          <div>
             <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{title}</div>
             <div className="text-lg font-black text-slate-900 tracking-tighter leading-tight">{value}</div>
          </div>
       </div>
       <div className="absolute -bottom-16 -right-16 w-32 h-32 rounded-full blur-[60px] opacity-5 group-hover:opacity-10 transition-all duration-700" style={{ backgroundColor: color }}></div>
    </div>
  );
}

function ProgressBar({ label, used, total, unit, color }: { label: string; used: number; total: number; unit: string; color: string }) {
  const percent = Math.min(100, Math.round((used / (total || 1)) * 100));
  return (
    <div className="space-y-1.5">
       <div className="flex justify-between items-end px-1">
          <div className="text-[9px] font-black text-slate-700 uppercase tracking-widest">{label}</div>
          <div className="text-[9px] font-bold text-slate-500">
             <span className="text-slate-900 font-extrabold">{used}{unit}</span> <span className="mx-0.5 opacity-40">/</span> {total}{unit}
          </div>
       </div>
       <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden" 
            style={{ width: `${percent}%`, backgroundColor: color }}
          >
             <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-pulse"></div>
          </div>
       </div>
    </div>
  );
}

