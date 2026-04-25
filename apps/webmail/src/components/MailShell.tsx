"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MailIdentity } from "@odisea/types";

export function MailShell({
  children,
  me,
  title,
  subtitle
}: {
  children: React.ReactNode;
  me: MailIdentity | null;
  title: string;
  subtitle: string;
}) {
  const pathname = usePathname();

  return (
    <div className="mail-shell min-h-screen bg-[#02060C]">
      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="bg-[#0A1221]/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-6 xl:sticky xl:top-8 xl:h-[calc(100vh-4rem)] flex flex-col">
          <div className="space-y-6">
            <Link href="/inbox" className="flex items-center gap-3 group">
               <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:bg-primary/40 transition-all duration-700 opacity-50"></div>
                  <img 
                    src="/logo.png" 
                    alt="Odisea" 
                    className="w-10 h-10 object-contain relative z-10 drop-shadow-[0_0_8px_rgba(0,163,255,0.3)] group-hover:scale-110 transition-transform" 
                  />
               </div>
               <div className="flex flex-col">
                 <h2 className="text-lg font-black tracking-tighter text-white font-headline italic leading-none">
                   ODISEA <span className="text-primary tracking-normal">MAIL</span>
                 </h2>
                 <span className="text-[8px] text-zinc-600 uppercase tracking-[0.3em] mt-1 font-bold">Secure Node</span>
               </div>
            </Link>

            <div className="space-y-1.5">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 ml-1">Contexto</div>
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="text-xs font-bold text-white tracking-tight truncate">{me?.domain ?? "Detectando..."}</div>
                <div className="text-[9px] text-zinc-600 font-mono mt-1 uppercase tracking-widest">{me?.address ? "Terminal Activa" : "Sincronizando..."}</div>
              </div>
            </div>
          </div>

          <nav className="mt-8 space-y-1.5">
            <MailNavItem href="/inbox" icon="inbox" label="Bandeja" active={pathname.endsWith("/inbox")} />
            <MailNavItem href="/compose" icon="edit" label="Redactar" active={pathname.endsWith("/compose")} />
            <MailNavItem href="/settings" icon="settings" label="Ajustes" active={pathname.endsWith("/settings")} />
            <div className="pt-4 mt-4 border-t border-white/5">
               <MailNavItem href="/logout" icon="logout" label="Cerrar" active={pathname.endsWith("/logout")} />
            </div>
          </nav>

          <div className="mt-auto">
             <div className="text-[8px] font-black uppercase tracking-[0.4em] text-zinc-700 text-center">
               End-to-End Secure
             </div>
          </div>
        </aside>

        <main className="space-y-6">
          <header className="bg-[#0A1221]/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-1">
               <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[8px] font-black uppercase rounded border border-primary/20 tracking-tighter">Workspace</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic font-headline">{title}</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1 font-medium opacity-60">{subtitle}</p>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}

function MailNavItem({
  href,
  icon,
  label,
  active
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
        active
          ? "bg-primary/10 text-primary border-l-2 border-primary shadow-[inset_0_0_20px_rgba(0,163,255,0.05)]"
          : "text-zinc-500 hover:text-white hover:bg-white/[0.03]"
      }`}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      {label}
    </Link>
  );
}
