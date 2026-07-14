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
    <aside className="w-64 bg-white border-r border-slate-200 fixed inset-y-0 left-0 z-50 p-5 flex flex-col shadow-xl shadow-slate-200/50">
      <div className="mb-6">
        <Link href="/" className="flex flex-col items-center gap-2 group text-center">
          <div className="relative flex-shrink-0">
             <div className="absolute inset-0 bg-[#00A3FF]/10 rounded-full blur-xl group-hover:bg-[#00A3FF]/20 transition-all duration-700 opacity-50"></div>
             <img 
               src="/logo.png" 
               alt="Odisea Cloud" 
               className="w-14 h-14 object-contain relative z-10 group-hover:scale-105 transition-transform" 
             />
          </div>
          <div className="flex flex-col items-center">
            <h2 className="text-lg font-black tracking-tighter text-slate-900 uppercase italic leading-none">
              ODISEA <span className="text-[#00A3FF] not-italic">CLOUD</span>
            </h2>
            <span className="text-[8px] text-[#00A3FF] font-black uppercase tracking-[0.3em] mt-2">Portal de Usuario</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-1">
        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 ml-3">Servicios</div>
        <NavItem href="/" icon="dashboard" label="Dashboard" active={pathname === "/"} />
        <NavItem href="/files" icon="folder" label="Archivos" active={pathname.startsWith("/files")} />
        <NavItem href="/ftp" icon="folder_shared" label="Acceso FTP" active={pathname.startsWith("/ftp")} />
        <NavItem href="/wordpress" icon="deployed_code" label="WordPress" active={pathname.startsWith("/wordpress")} />
        <NavItem href="/email/accounts" icon="alternate_email" label="Correos" active={pathname.startsWith("/email")} />
        <NavItem href="/domains" icon="language" label="Dominios" active={pathname.startsWith("/domains")} />
        <NavItem href="/nodejs" icon="javascript" label="NodeJS Engine" active={pathname.startsWith("/nodejs")} />
        <NavItem href="/cloudweb" icon="cloud_sync" label="Cloud Web" active={pathname.startsWith("/cloudweb")} />
      </nav>

      <div className="mt-auto pt-6 border-t border-slate-100 space-y-2">
        <button className="w-full py-2.5 rounded-xl bg-[#00A3FF] text-white font-black tracking-widest uppercase text-[9px] shadow-md shadow-[#00A3FF]/10 hover:bg-[#008EE0] active:scale-[0.98] transition-all">
          Provisionar Cluster
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2.5 w-full px-4 py-2.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer text-[9px] font-black uppercase tracking-widest group"
        >
          <span className="material-symbols-outlined text-[16px]">logout</span>
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
      className={`flex items-center gap-3.5 px-4 py-2.5 rounded-xl transition-all duration-300 group border ${
        active 
        ? 'bg-[#00A3FF]/5 text-[#00A3FF] border-[#00A3FF]/20 font-black' 
        : 'text-slate-400 border-transparent hover:text-slate-900 hover:bg-slate-50'
    }`}>
      <span className={`material-symbols-outlined text-[18px] ${active ? 'text-[#00A3FF]' : 'group-hover:text-[#00A3FF] transition-colors'}`}>{icon}</span>
      <span className="tracking-tight text-xs font-bold">{label}</span>
    </Link>
  );
}
