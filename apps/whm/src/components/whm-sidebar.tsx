"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logoutWhmSession, getWhmRole } from "../lib/api";

export function WhmSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const role = mounted ? getWhmRole() : null;

  const onLogout = () => {
    logoutWhmSession();
    router.replace("/auth/login");
  };

  const isAdmin = role === "admin" || !mounted; // Default to admin while mounting to avoid layout shift if possible, or just false.

  return (
    <aside className="w-72 fixed inset-y-0 left-0 z-50 p-6 flex flex-col bg-white border-r border-slate-200 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      <div className="mb-10">
        <Link href="/whm" className="flex flex-col items-center gap-2 group text-center">
          <div className="relative flex-shrink-0 transition-transform duration-500 group-hover:scale-105">
             <div className="absolute inset-0 bg-[#00A3FF]/5 rounded-full blur-2xl group-hover:bg-[#00A3FF]/10 transition-all duration-700 opacity-50"></div>
             <img 
               src="/logo.png" 
               alt="Odisea Cloud Logo" 
               className="w-24 h-24 object-contain relative z-10 drop-shadow-md" 
             />
          </div>
          <div className="flex flex-col items-center">
            <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase leading-none">
              ODISEA <span className="font-light text-[#00A3FF]">CLOUD</span>
            </h2>
            <div className="flex items-center gap-2 mt-2.5">
              <div className={`h-1.5 w-1.5 rounded-full shadow-[0_0_8px] ${isAdmin ? 'bg-[#00A3FF] shadow-[#00A3FF]' : 'bg-emerald-500 shadow-emerald-500'}`}></div>
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                {isAdmin ? 'Administrador' : 'Revendedor'}
              </span>
            </div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1 custom-scrollbar">
        <NavItem icon="dashboard" label="Inicio" href="/whm" active={pathname === "/whm"} />
        <NavItem icon="group" label="Ver Cuentas" href="/whm/accounts" active={pathname === "/whm/accounts"} />
        <NavItem icon="person_add" label="Crear Cuenta" href="/whm/accounts/create" active={pathname === "/whm/accounts/create"} />
        <NavItem icon="settings_suggest" label="Planes de Usuario" href="/whm/plans" active={pathname === "/whm/plans"} />
        {isAdmin && <NavItem icon="hub" label="Planes Reseller" href="/whm/plans/resellers" active={pathname === "/whm/plans/resellers"} />}
        
        {isAdmin && <NavItem icon="dns" label="Configuración" href="/whm/config" active={pathname === "/whm/config"} />}
        
        <NavItem icon="settings_account_box" label="Basic Setup" href="/whm/config/basic-setup" active={pathname === "/whm/config/basic-setup"} />
        <NavItem icon="language" label="Zonas DNS" href="/whm/domains" active={pathname === "/whm/domains"} />
        <NavItem icon="verified_user" label="Seguridad SSL" href="/whm/ssl" active={pathname === "/whm/ssl"} />
        <NavItem icon="developer_board" label="Versiones PHP" href="/whm/php" active={pathname === "/whm/php"} />
        <NavItem icon="database" label="Bases de Datos" href="/whm/databases" active={pathname === "/whm/databases"} />
        
        {isAdmin && <NavItem icon="move_up" label="Migraciones" href="/whm/migrations" active={pathname === "/whm/migrations"} />}
        {isAdmin && <NavItem icon="monitoring" label="Recursos" href="/whm/monitoring" active={pathname === "/whm/monitoring"} />}
      </nav>

      <div className="mt-auto pt-6 border-t border-slate-100 space-y-4">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
           <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-2 uppercase tracking-wider">
              <span>Servidor v6.5</span>
              <span className="text-[#00A3FF]">US-EAST</span>
           </div>
           <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner">
              <div className="h-full w-2/3 bg-[#00A3FF] rounded-full"></div>
           </div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center justify-center gap-3 w-full py-3.5 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all text-[11px] font-bold uppercase tracking-widest border border-transparent hover:border-red-100"
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, active = false, href }: { icon: string; label: string; active?: boolean; href?: string }) {
  const content = (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 cursor-pointer group border ${
      active 
        ? 'bg-[#00A3FF]/5 text-[#00A3FF] border-[#00A3FF]/20 font-bold shadow-sm' 
        : 'text-slate-600 border-transparent hover:text-[#00A3FF] hover:bg-slate-50'
    }`}>
      <span className={`material-symbols-outlined text-[22px] transition-colors`}>{icon}</span>
      <span className={`text-[12px] font-bold uppercase tracking-tight`}>{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00A3FF]"></div>}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
