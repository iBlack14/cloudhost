"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 glass-sidebar fixed inset-y-0 left-0 z-50 p-6 flex flex-col">
      <div className="mb-10">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 relative flex-shrink-0">
             <div className="absolute inset-0 bg-primary/20 rounded-lg blur-md"></div>
             <img src="/logo.png" alt="Odisea Cloud Logo" className="w-full h-full object-contain relative z-10" />
          </div>
          <h2 className="text-2xl font-black tracking-tighter text-white font-headline italic">
            ODISEA <span className="text-primary tracking-normal">CLOUD</span>
          </h2>
        </Link>
        <p className="text-[10px] text-primary/60 uppercase tracking-widest mt-2 ml-10 font-bold">
          Cloud Infrastructure
        </p>
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
        <NavItem href="/servers" icon="dns" label="Servers" />
        <NavItem href="/nodejs" icon="javascript" label="Node.js Engine" active={pathname.startsWith("/nodejs")} />
        <NavItem href="/storage" icon="storage" label="Volumes" />
        <NavItem href="/networks" icon="lan" label="Networks" />
        <NavItem href="/security" icon="shield" label="Security" />
      </nav>

      <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
        <button className="kinetic-gradient w-full py-3 rounded-xl text-white font-black font-headline tracking-tight active:scale-95 transition-all shadow-lg shadow-primary/30 uppercase text-xs">
          Provision Cluster
        </button>
        <div className="flex items-center gap-3 px-4 py-2 text-zinc-400 hover:text-primary transition-all cursor-pointer text-sm font-headline tracking-tight">
          <span className="material-symbols-outlined text-sm">settings</span>
          <span>Configurations</span>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ href = "#", icon, label, active = false }: { href?: string; icon: string; label: string; active?: boolean }) {
  return (
    <Link 
      href={href}
      className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 cursor-pointer group ${
        active ? 'bg-primary/10 text-primary border-l-4 border-primary font-black shadow-[inset_0_0_20px_rgba(0,163,255,0.05)]' : 'text-zinc-500 hover:text-white hover:bg-white/5'
    }`}>
      <span className={`material-symbols-outlined text-[20px] ${active ? 'neon-text' : 'group-hover:text-primary transition-colors'}`}>{icon}</span>
      <span className="font-headline tracking-tighter text-sm uppercase">{label}</span>
    </Link>
  );
}
