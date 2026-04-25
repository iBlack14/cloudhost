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
    <aside className="w-64 glass-sidebar fixed inset-y-0 left-0 z-50 p-6 flex flex-col">
      <div className="mb-8">
        <Link href="/" className="flex flex-col items-center gap-1 group text-center">
          <div className="relative flex-shrink-0">
             <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl group-hover:bg-primary/20 transition-all duration-700 opacity-50"></div>
             <img 
               src="/logo.png" 
               alt="Odisea Cloud Logo" 
               className="w-32 h-32 object-contain relative z-10 group-hover:scale-110 transition-transform" 
             />
          </div>
          <div className="flex flex-col items-center">
            <h2 className="text-xl font-black tracking-tighter text-white font-headline italic leading-none">
              ODISEA <span className="text-primary tracking-normal">CLOUD</span>
            </h2>
            <span className="text-[8px] text-zinc-600 uppercase tracking-[0.3em] mt-2 font-bold">Infrastructure</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-2">
        <NavItem href="/" icon="dashboard" label="Dashboard" active={pathname === "/"} />
        <NavItem href="/accounts" icon="group" label="Accounts" active={pathname.startsWith("/accounts")} />
        <NavItem href="/email/accounts" icon="alternate_email" label="Email" active={pathname.startsWith("/email")} />
        <NavItem href="/wordpress" icon="deployed_code" label="WordPress" active={pathname.startsWith("/wordpress")} />
        <NavItem href="/files" icon="folder" label="File Manager" active={pathname.startsWith("/files")} />
        <NavItem href="/databases" icon="database" label="Databases" active={pathname.startsWith("/databases")} />
        <NavItem href="/domains" icon="language" label="Domains" active={pathname.startsWith("/domains")} />
        <NavItem href="/php" icon="developer_board" label="Multi-PHP" active={pathname.startsWith("/php")} />
        <NavItem href="/nodejs" icon="javascript" label="Node.js Engine" active={pathname.startsWith("/nodejs")} />
      </nav>

      <div className="mt-auto pt-6 border-t border-white/5 space-y-2">
        <button className="kinetic-gradient w-full py-3 rounded-xl text-white font-black font-headline tracking-tight active:scale-95 transition-all shadow-lg shadow-primary/30 uppercase text-xs">
          Provision Cluster
        </button>
        <button
          id="odin-logout-btn"
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/5 transition-all cursor-pointer text-sm font-headline tracking-tight group"
        >
          <span className="material-symbols-outlined text-sm group-hover:text-red-400 transition-colors">logout</span>
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
      className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 cursor-pointer group ${
        active ? 'bg-primary/5 text-primary border border-primary/20 font-black' : 'text-zinc-500 hover:text-white hover:bg-white/5'
    }`}>
      <span className={`material-symbols-outlined text-[20px] ${active ? '' : 'group-hover:text-primary transition-colors'}`}>{icon}</span>
      <span className="font-headline tracking-tighter text-sm uppercase">{label}</span>
    </Link>
  );
}
