"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearOdinSession } from "../lib/api";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    clearOdinSession();
    router.replace("/auth/login");
  };

  return (
    <aside className="w-72 bg-white border-r border-slate-200 fixed inset-y-0 left-0 z-50 p-8 flex flex-col shadow-2xl shadow-slate-200/50">
      <div className="mb-10">
        <Link href="/" className="flex flex-col items-center gap-3 group text-center">
          <div className="relative flex-shrink-0">
             <div className="absolute inset-0 bg-[#00A3FF]/10 rounded-full blur-2xl group-hover:bg-[#00A3FF]/20 transition-all duration-700 opacity-50"></div>
             <img 
               src="/logo.png" 
               alt="Odisea Cloud" 
               className="w-24 h-24 object-contain relative z-10 group-hover:scale-105 transition-transform" 
             />
          </div>
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-black tracking-tighter text-slate-900 uppercase italic leading-none">
              ODISEA <span className="text-[#00A3FF] not-italic">CLOUD</span>
            </h2>
            <span className="text-[9px] text-[#00A3FF] font-black uppercase tracking-[0.3em] mt-2.5">Portal de Usuario</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-2">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 ml-4">Gestión Principal</div>
        <NavItem href="/" icon="dashboard" label="Dashboard" active={pathname === "/"} />
        <NavItem href="/accounts" icon="group" label="Mis Cuentas" active={pathname.startsWith("/accounts")} />
        <NavItem href="/email/accounts" icon="alternate_email" label="Correos" active={pathname.startsWith("/email")} />
        
        <div className="pt-6 pb-2">
           <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 ml-4">Aplicaciones</div>
        </div>
        <NavItem href="/wordpress" icon="deployed_code" label="WordPress" active={pathname.startsWith("/wordpress")} />
        <NavItem href="/files" icon="folder" label="Archivos" active={pathname === "/files" || (pathname.startsWith("/files") && !pathname.startsWith("/files/backup"))} />
        <NavItem href="/files/backup" icon="folder_zip" label="Backups" active={pathname.startsWith("/files/backup")} />
        <NavItem href="/databases" icon="database" label="Bases de Datos" active={pathname.startsWith("/databases")} />
        <NavItem href="/domains" icon="language" label="Dominios" active={pathname.startsWith("/domains")} />

        <div className="pt-6 pb-2">
           <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 ml-4">Desarrollo</div>
        </div>
        <NavItem href="/php" icon="developer_board" label="Multi-PHP" active={pathname.startsWith("/php")} />
        <NavItem href="/nodejs" icon="javascript" label="Node.js Engine" active={pathname.startsWith("/nodejs")} />
        <NavItem href="/python" icon="code_blocks" label="Python Grid" active={pathname.startsWith("/python")} />
      </nav>

      <div className="mt-auto pt-8 border-t border-slate-100 space-y-3">
        <button className="w-full py-4 rounded-2xl bg-[#00A3FF] text-white font-black tracking-widest uppercase text-[10px] shadow-lg shadow-[#00A3FF]/20 hover:bg-[#008EE0] active:scale-[0.98] transition-all">
          Provisionar Cluster
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-3 w-full px-4 py-3.5 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer text-[10px] font-black uppercase tracking-widest group"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}

function NavItem({ href = "#", icon, label, active = false }: { href?: string; icon: string; label: string; active?: boolean }) {
  return (
    <Link 
      href={href}
      className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group border ${
        active 
        ? 'bg-[#00A3FF]/5 text-[#00A3FF] border-[#00A3FF]/20 font-black' 
        : 'text-slate-400 border-transparent hover:text-slate-900 hover:bg-slate-50'
    }`}>
      <span className={`material-symbols-outlined text-[22px] ${active ? 'text-[#00A3FF]' : 'group-hover:text-[#00A3FF] transition-colors'}`}>{icon}</span>
      <span className="tracking-tight text-sm font-bold">{label}</span>
    </Link>
  );
}
