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
    <div className="mail-shell min-h-screen bg-white">
       {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00A3FF]/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-slate-100 blur-[100px] rounded-full" />
        <div 
          className="absolute inset-0 opacity-[0.2]" 
          style={{ 
            backgroundImage: `radial-gradient(circle at 2px 2px, #E2E8F0 1px, transparent 0)`,
            backgroundSize: '40px 40px' 
          }}
        />
      </div>

      <div className="relative z-10 p-6 md:p-8">
        <div className="grid gap-8 xl:grid-cols-[280px_minmax(0,1fr)] max-w-[1600px] mx-auto">
          <aside className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-[2.5rem] p-8 xl:sticky xl:top-8 xl:h-[calc(100vh-4rem)] flex flex-col shadow-2xl shadow-slate-200/50">
            <div className="space-y-8">
              <Link href="/inbox" className="flex items-center gap-4 group">
                 <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-[#00A3FF]/10 rounded-2xl blur-xl group-hover:bg-[#00A3FF]/20 transition-all duration-700 opacity-50"></div>
                    <img 
                      src="/logo.png" 
                      alt="Odisea" 
                      className="w-12 h-12 object-contain relative z-10 group-hover:scale-105 transition-transform" 
                    />
                 </div>
                 <div className="flex flex-col">
                   <h2 className="text-xl font-black tracking-tighter text-slate-900 uppercase italic leading-none">
                     ODISEA <span className="text-[#00A3FF] not-italic">MAIL</span>
                   </h2>
                   <span className="text-[9px] text-[#00A3FF] font-black uppercase tracking-[0.3em] mt-1.5">Nodo de Comunicación</span>
                 </div>
              </Link>

              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Contexto Actual</div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 shadow-inner group transition-all hover:bg-white hover:border-[#00A3FF]/20">
                  <div className="text-sm font-bold text-slate-900 tracking-tight truncate">{me?.domain ?? "Sincronizando..."}</div>
                  <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">{me?.address ? "Terminal Activa" : "Cargando..."}</div>
                </div>
              </div>
            </div>

            <nav className="mt-10 space-y-2">
              <MailNavItem href="/inbox" icon="inbox" label="Bandeja" active={pathname.endsWith("/inbox")} />
              <MailNavItem href="/compose" icon="edit" label="Redactar" active={pathname.endsWith("/compose")} />
              <MailNavItem href="/settings" icon="settings" label="Ajustes" active={pathname.endsWith("/settings")} />
              <div className="pt-6 mt-6 border-t border-slate-100">
                 <MailNavItem href="/logout" icon="logout" label="Cerrar Sesión" active={pathname.endsWith("/logout")} />
              </div>
            </nav>

            <div className="mt-auto pt-8">
               <div className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-300 text-center">
                 Secure Workspace
               </div>
            </div>
          </aside>

          <main className="space-y-8 flex flex-col min-h-full">
            <header className="bg-white/70 backdrop-blur-xl border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                 <span className="px-2 py-0.5 bg-[#00A3FF]/10 text-[#00A3FF] text-[10px] font-bold uppercase rounded-full tracking-wider">Centro de Operaciones</span>
              </div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">{title}</h1>
              <p className="text-[11px] text-slate-500 uppercase tracking-[0.1em] mt-2 font-bold opacity-80">{subtitle}</p>
            </header>
            <div className="flex-1">
               {children}
            </div>
          </main>
        </div>
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
      className={`flex items-center gap-4 rounded-2xl px-5 py-4 text-[11px] font-black uppercase tracking-widest transition-all ${
        active
          ? "bg-[#00A3FF] text-white shadow-lg shadow-[#00A3FF]/20 scale-[1.02]"
          : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
      }`}
    >
      <span className="material-symbols-outlined text-[22px]">{icon}</span>
      {label}
    </Link>
  );
}
