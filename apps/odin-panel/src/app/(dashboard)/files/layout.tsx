"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { hasOdinSession } from "../../../lib/api";

export default function FileManagerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const token = hasOdinSession();
    if (!token) {
      const t = setTimeout(() => {
        if (!hasOdinSession()) router.replace("/auth/login");
        else setAuthChecked(true);
      }, 100);
      return () => clearTimeout(t);
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d1117]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-slate-700 border-t-[#00A3FF] rounded-full animate-spin" />
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#f5faff] overflow-hidden">
      {/* Top chrome bar */}
      <header className="h-12 flex items-center px-3 sm:px-4 gap-3 bg-white border-b border-sky-100 shrink-0 z-50 shadow-sm shadow-sky-100/70">
        {/* Back to panel */}
        <Link
          href="/"
          className="flex items-center gap-1.5 text-slate-500 hover:text-sky-600 transition-colors text-[11px] font-semibold"
        >
          <span className="material-symbols-outlined text-[14px]">arrow_back</span>
          Panel
        </Link>

        <span className="w-px h-4 bg-slate-200" />

        {/* Breadcrumb placeholder — filled by page via data attribute on body or context */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="material-symbols-outlined text-[14px] text-[#00A3FF]">folder_open</span>
          <span className="text-[10px] sm:text-[11px] font-black text-slate-700 uppercase tracking-widest truncate">
            Administrador de Archivos
          </span>
        </div>

        {/* Right side — branding pill */}
        <div className="ml-auto hidden sm:flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-sky-600 text-[10px] font-black uppercase tracking-widest">
            Files
          </span>
        </div>
      </header>

      {/* Content fills remaining height */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
