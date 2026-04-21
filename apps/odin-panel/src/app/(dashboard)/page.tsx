"use client";

import React from "react";
import Link from "next/link";
import { useOdinDashboard } from "../../lib/hooks/use-odin-dashboard";

const formatBytesToGb = (bytes: number): string => `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;

const formatUptime = (seconds?: number): string => {
  if (!seconds || seconds <= 0) return "UPTIME: N/A";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `UPTIME: ${days}D ${hours}H`;
  const mins = Math.floor((seconds % 3600) / 60);
  return `UPTIME: ${hours}H ${mins}M`;
};

export default function DashboardPage() {
  const { data: dashboard, isLoading } = useOdinDashboard();

  const server = dashboard?.server;
  const account = dashboard?.account;
  const services = dashboard?.services;

  return (
    <div className="space-y-16">
      <header className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-5xl font-headline font-black text-white tracking-tighter uppercase italic">
            SYSTEM CONSOLE
          </h1>
          <div className="flex items-center gap-3">
             <span className="text-primary font-mono text-[10px] tracking-[0.2em]">NODE: OD-CLOUD-01</span>
             <div className="h-px w-12 bg-white/10"></div>
             <span className="text-zinc-500 font-mono text-[10px] tracking-[0.2em]">REGION: US-BLUE-EAST</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 px-4 py-2 rounded-full">
            <span className="w-2 h-2 rounded-full bg-primary pulse-glow"></span>
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Core Status: Stable</span>
          </div>
          <div className="w-10 h-10 rounded-full border border-white/10 bg-surface flex items-center justify-center text-primary overflow-hidden">
             <span className="material-symbols-outlined">account_circle</span>
          </div>
        </div>
      </header>

      {/* Stats Quick Glance */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          label="Compute Load" 
          value={isLoading ? "..." : `${server?.cpu ?? 0}%`}
          detail={isLoading ? "SYNCING TELEMETRY" : `LOAD 1M: ${server?.loadAverage1m ?? 0} · ${formatUptime(server?.uptimeSeconds)}`}
          icon="memory"
          variant="azure"
        />
        <StatCard 
          label="Storage Allocation" 
          value={isLoading ? "..." : `${account?.diskPercent ?? 0}%`}
          detail={isLoading ? "LOADING ACCOUNT DISK" : `${account?.diskUsed ?? 0} MB / ${account?.diskLimit ?? 0} MB · PLAN ${account?.plan ?? "N/A"}`}
          icon="speed"
          variant="cyan"
        />
        <StatCard 
          label="Active Services" 
          value={isLoading ? "..." : `${(services?.domains ?? 0) + (services?.apps ?? 0) + (services?.databases ?? 0)}`}
          detail={isLoading ? "COUNTING RUNTIMES" : `DOM ${services?.domains ?? 0} · DB ${services?.databases ?? 0} · APPS ${services?.apps ?? 0}`}
          icon="hub"
          variant="azure"
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TelemetryCard
          title="RAM Residency"
          value={isLoading ? "..." : `${server?.ram ?? 0}%`}
          detail={isLoading ? "COLLECTING MEMORY" : `${formatBytesToGb((server?.ramDetails.total ?? 0) - (server?.ramDetails.free ?? 0))} used of ${formatBytesToGb(server?.ramDetails.total ?? 0)}`}
          accent="azure"
        />
        <TelemetryCard
          title="Server Disk"
          value={isLoading ? "..." : `${server?.disk ?? 0}%`}
          detail={isLoading ? "PROBING ROOT VOLUME" : `ROOT FS · ${server?.cores ?? 1} CORES AVAILABLE`}
          accent="cyan"
        />
        <TelemetryCard
          title="Service Matrix"
          value={isLoading ? "..." : `${services?.emails ?? 0} MAIL`}
          detail={isLoading ? "BACKEND LINK PENDING" : `EMAILS ${services?.emails ?? 0} · DOMAINS ${services?.domains ?? 0}`}
          accent="azure"
        />
      </section>

      {/* Bento Sections Inspired by cPanel but elevated */}
      <div className="space-y-12">
        <BentoSection title="Correo Electrónico" icon="mail">
          <BentoItem href="/email/accounts" label="Cuentas de Correo" icon="alternate_email" desc="Gestionar MX, quotas y spam" />
          <BentoItem label="Reenviadores" icon="forward_to_inbox" />
          <BentoItem label="Auto-contestadores" icon="reply_all" />
          <BentoItem label="Filtros de Correo" icon="filter_list" />
        </BentoSection>

        <BentoSection title="Archivos & Almacenamiento" icon="folder_special">
          <BentoItem href="/files" label="Administrador de Archivos" icon="folder_open" desc="Explorador cloud nativo" />
          <BentoItem label="Imágenes" icon="image" />
          <BentoItem label="Uso del Disco" icon="bar_chart" desc="Analizar espacio ocupado" />
          <BentoItem label="Copias de Seguridad" icon="history" />
          <BentoItem label="Git™ Version Control" icon="account_tree" />
          <BentoItem label="JetBackup 5" icon="verified_user" />
        </BentoSection>

        <BentoSection title="Bases de Datos" icon="database" accent="cyan">
          <BentoItem href="/databases" label="phpMyAdmin" icon="settings_ethernet" desc="Administración SQL web" />
          <BentoItem href="/databases" label="Manage My Databases" icon="table_rows" />
          <BentoItem label="Database Wizard" icon="auto_fix" />
          <BentoItem label="Remote Database Access" icon="on_device_training" />
        </BentoSection>

        <BentoSection title="Dominios & DNS" icon="public">
          <BentoItem href="/wordpress" label="WordPress Management" icon="unfold_more" desc="Optimización y auto-login" />
          <BentoItem label="Zone Editor" icon="dns" desc="Registros A, CNAME, TXT" />
          <BentoItem label="Redirige" icon="shortcut" />
          <BentoItem label="Dynamic DNS" icon="dynamic_form" />
        </BentoSection>

        <BentoSection title="Software & Motores" icon="terminal" accent="cyan">
          <BentoItem href="/wordpress" label="WordPress Manager" icon="deployed_code" desc="Instalar y gestionar instancias" />
          <BentoItem label="Administrador MultiPHP" icon="settings_suggest" desc="v7.4 a v8.3 flexible" />
          <BentoItem label="Softaculous Apps" icon="add_box" desc="1-Click Installer" />
          <BentoItem label="Setup Node.js App" icon="javascript" desc="Entornos JS aislados" />
          <BentoItem label="Setup Python App" icon="rebase_edit" />
          <BentoItem label="Setup Ruby App" icon="diamond" />
        </BentoSection>
      </div>

      <footer className="pt-12 pb-8 border-t border-white/5 flex justify-between items-center text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em]">
         <span>Odin Panel v2.4.0-Stable</span>
         <span className="text-primary italic">Odisea Cloud Infrastructure</span>
      </footer>
    </div>
  );
}

function BentoSection({ title, icon, children, accent = "azure" }: { title: string; icon: string; children: React.ReactNode, accent?: "azure" | "cyan" }) {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-4 ml-2">
         <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center ${accent === "azure" ? "text-primary border border-primary/20" : "text-secondary border border-secondary/20"}`}>
            <span className="material-symbols-outlined text-lg">{icon}</span>
         </div>
         <h2 className="text-xl font-headline font-black text-white italic tracking-tighter uppercase">{title}</h2>
         <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {children}
      </div>
    </section>
  );
}

function BentoItem({ label, icon, desc, href = "#" }: { label: string; icon: string; desc?: string; href?: string }) {
  return (
    <Link href={href} className="group">
      <div className="glass-card p-5 flex items-center gap-4 hover:border-primary/40 hover:bg-white/[0.04] transition-all duration-300 h-full relative overflow-hidden">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 group-hover:bg-primary/20 group-hover:text-primary transition-all duration-500 shadow-xl">
           <span className="material-symbols-outlined text-[22px]">{icon}</span>
        </div>
        <div>
           <h4 className="text-[11px] font-black text-white uppercase tracking-wider group-hover:text-primary transition-colors">{label}</h4>
           {desc && <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity">{desc}</p>}
        </div>
        {/* Subtle dynamic glow */}
        <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-primary/5 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
      </div>
    </Link>
  );
}

function StatCard({ label, value, detail, icon, variant }: { label: string; value: string; detail: string; icon: string; variant: 'azure' | 'cyan' }) {
  const colorClass = variant === 'azure' ? 'text-primary' : 'text-secondary';
  return (
    <div className="glass-card p-6 group hover:translate-y-[-4px] hover:border-primary/30 transition-all duration-500 overflow-hidden relative">
      <div className="flex justify-between items-start mb-6 relative z-10">
        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{label}</span>
        <div className={`p-2 rounded-lg bg-white/5 ${colorClass}`}>
           <span className="material-symbols-outlined text-[22px]">{icon}</span>
        </div>
      </div>
      <div className="relative z-10">
        <div className="text-4xl font-headline font-black text-white tracking-tighter italic group-hover:neon-text transition-all duration-500">{value}</div>
        <div className="text-[10px] text-zinc-600 mt-2 font-mono tracking-widest uppercase opacity-70">{detail}</div>
      </div>
      {/* Background Glow */}
      <div className={`absolute -bottom-10 -right-10 w-32 h-32 blur-[60px] opacity-20 rounded-full transition-all duration-700 group-hover:scale-150 ${variant === 'azure' ? 'bg-primary' : 'bg-secondary'}`}></div>
    </div>
  );
}

function TelemetryCard({
  title,
  value,
  detail,
  accent
}: {
  title: string;
  value: string;
  detail: string;
  accent: "azure" | "cyan";
}) {
  return (
    <div className="glass-card p-6 relative overflow-hidden">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{title}</div>
          <div className="mt-4 text-3xl font-headline font-black tracking-tighter italic text-white">{value}</div>
          <div className="mt-2 text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-600">{detail}</div>
        </div>
        <div className={`h-12 w-12 rounded-2xl border flex items-center justify-center ${accent === "azure" ? "border-primary/20 text-primary bg-primary/10" : "border-secondary/20 text-secondary bg-secondary/10"}`}>
          <span className="material-symbols-outlined">{accent === "azure" ? "monitoring" : "storage"}</span>
        </div>
      </div>
    </div>
  );
}
