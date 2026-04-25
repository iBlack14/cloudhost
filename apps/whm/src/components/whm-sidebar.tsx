"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logoutWhmSession } from "../lib/api";

export function WhmSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const onLogout = () => {
    logoutWhmSession();
    router.replace("/auth/login");
  };

  return (
    <aside className="w-72 glass-sidebar fixed inset-y-0 left-0 z-50 p-6 flex flex-col border-r border-[#00A3FF]/10">
      <div className="mb-8">
        <Link href="/whm" className="flex flex-col items-center gap-1 group text-center">
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
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-1 h-1 rounded-full bg-primary animate-pulse"></span>
              <span className="text-[8px] text-zinc-600 uppercase font-black tracking-[0.2em]">System Root</span>
            </div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1">
        <NavItem icon="dashboard" label="Console Overview" href="/whm" active={pathname === "/whm"} />
        <NavItem icon="group" label="Account Manager" href="/whm/accounts" active={pathname === "/whm/accounts"} />
        <NavItem icon="person_add" label="Create New Account" href="/whm/accounts/create" active={pathname === "/whm/accounts/create"} />
        <NavItem icon="settings_suggest" label="Packages & Tiers" href="/whm/plans" active={pathname === "/whm/plans"} />
        <NavItem icon="dns" label="Server Config" href="/whm/config" active={pathname === "/whm/config"} />
        <NavItem icon="language" label="DNS Zone Manager" href="/whm/domains" active={pathname === "/whm/domains"} />
        <NavItem icon="verified_user" label="SSL / TLS Security" href="/whm/ssl" active={pathname === "/whm/ssl"} />
        <NavItem icon="developer_board" label="Multi-PHP Manager" href="/whm/php" active={pathname === "/whm/php"} />
        <NavItem icon="database" label="MySQL Database Center" href="/whm/databases" active={pathname === "/whm/databases"} />
        <NavItem icon="move_up" label="Migration Center" href="/whm/migrations" active={pathname === "/whm/migrations"} />
        <NavItem icon="security" label="Security Center" />
        <NavItem icon="monitoring" label="Resource Monitor" href="/whm/monitoring" active={pathname === "/whm/monitoring"} />
      </nav>

      <div className="mt-auto pt-6 border-t border-white/5 space-y-4 font-headline uppercase tracking-tighter">
        <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
           <div className="flex justify-between text-[10px] font-black text-zinc-500 mb-2">
              <span>Kernel v6.5.0-x</span>
              <span>US-EAST-01</span>
           </div>
           <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full w-2/3 kinetic-gradient"></div>
           </div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center justify-center gap-3 w-full py-3 rounded-xl bg-white/5 text-zinc-400 hover:text-white transition-all text-xs font-black"
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          Exit Console
        </button>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, active = false, href }: { icon: string; label: string; active?: boolean; href?: string }) {
  const content = (
    <div className={`flex items-center gap-5 px-5 py-3.5 rounded-2xl transition-all duration-300 cursor-pointer group ${
      active ? 'bg-primary/5 text-primary border border-primary/20 font-black' : 'text-zinc-500 hover:text-white hover:bg-white/5'
    }`}>
      <span className={`material-symbols-outlined text-[24px] ${active ? '' : 'group-hover:text-primary transition-colors'}`}>{icon}</span>
      <span className="font-headline tracking-tighter text-sm uppercase font-black">{label}</span>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
