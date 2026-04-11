"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function WhmSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-72 glass-sidebar fixed inset-y-0 left-0 z-50 p-6 flex flex-col border-r border-[#00A3FF]/10">
      <div className="mb-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 relative flex-shrink-0 group">
             <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:bg-primary/40 transition-all"></div>
             <img src="/logo.png" alt="NexHost Logo" className="w-full h-full object-contain relative z-10" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tighter text-white font-headline">
              NEXHOST <span className="text-primary italic font-black">WHM</span>
            </h2>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#00A3FF]"></span>
              <span className="text-[9px] text-zinc-500 uppercase font-black tracking-[0.2em]">Service: Active</span>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        <NavItem icon="dashboard" label="Console Overview" href="/whm" active={pathname === "/whm" || pathname === "/"} />
        <NavItem icon="group" label="Account Manager" href="/whm/accounts" active={pathname.startsWith("/whm/accounts")} />
        <NavItem icon="person_add" label="Create New Account" href="/whm/accounts/create" active={pathname === "/whm/accounts/create"} />
        <NavItem icon="settings_suggest" label="Packages & Tiers" href="/whm/plans" active={pathname === "/whm/plans"} />
        <NavItem icon="dns" label="Server Config" href="/whm/config" active={pathname === "/whm/config"} />
        <NavItem icon="language" label="DNS Zone Manager" href="/whm/domains" active={pathname.startsWith("/whm/domains")} />
        <NavItem icon="security" label="Security Center" />
        <NavItem icon="monitoring" label="Resource Monitor" />
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
        <button className="flex items-center justify-center gap-3 w-full py-3 rounded-xl bg-white/5 text-zinc-400 hover:text-white transition-all text-xs font-black">
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
      active ? 'bg-primary/10 text-primary border-r-4 border-primary font-black shadow-[inset_0_0_20px_rgba(0,163,255,0.05)]' : 'text-zinc-500 hover:text-white hover:bg-white/5'
    }`}>
      <span className={`material-symbols-outlined text-[24px] ${active ? 'neon-text' : 'group-hover:text-primary transition-colors'}`}>{icon}</span>
      <span className="font-headline tracking-tighter text-sm uppercase font-black">{label}</span>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
