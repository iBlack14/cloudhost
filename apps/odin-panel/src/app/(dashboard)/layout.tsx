"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "../../components/Sidebar";
import { hasOdinSession } from "../../lib/api";

const API_BASE = (() => {
  if (typeof window === "undefined") {
    const envUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
    return envUrl.startsWith("//") ? "http:" + envUrl : envUrl;
  }
  const host = window.location.hostname;
  const proto = window.location.protocol;
  if (host === "localhost") return "http://localhost:3001/api/v1";
  if (host.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    let port = "3001";
    try {
      const u = process.env.NEXT_PUBLIC_API_URL ? new URL(process.env.NEXT_PUBLIC_API_URL) : null;
      if (u && u.port) port = u.port;
    } catch {}
    return `${proto}//${host}:${port}/api/v1`;
  }
  const parts = host.split(".");
  return `${proto}//api.${parts.length >= 2 ? parts.slice(-2).join(".") : host}/api/v1`;
})();

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authChecked, setAuthChecked] = useState(false);
  const [showHttpAlert, setShowHttpAlert] = useState(false);
  const [isActivatingSsl, setIsActivatingSsl] = useState(false);

  useEffect(() => {
    // Perform check only on client side
    const token = hasOdinSession();
    
    if (!token) {
      // Small delay to ensure no race condition with impersonate bridge
      const timeout = setTimeout(() => {
        const reCheckToken = hasOdinSession();
        if (!reCheckToken) {
          router.replace("/auth/login");
        } else {
          setAuthChecked(true);
        }
      }, 100);
      return () => clearTimeout(timeout);
    } else {
      setAuthChecked(true);
    }
  }, [router, pathname]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isHttp = window.location.protocol === "http:";
      const isLocal = window.location.hostname === "localhost" || 
                      window.location.hostname === "127.0.0.1" || 
                      !!window.location.hostname.match(/^\d+\.\d+\.\d+\.\d+$/);
      if (isHttp && !isLocal) {
        setShowHttpAlert(true);
      }
    }
  }, []);

  const handleActivateSystemSsl = async () => {
    setIsActivatingSsl(true);
    try {
      const token = hasOdinSession();
      const res = await fetch(`${API_BASE}/odin-panel/system/ssl`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Error al configurar SSL");
      }
      alert(data?.message ?? "SSL configurado correctamente. Recargando página segura...");
      window.location.href = window.location.href.replace("http://", "https://");
    } catch (err: any) {
      alert(err.message || "Error al solicitar SSL para el panel.");
    } finally {
      setIsActivatingSsl(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-6 animate-in fade-in duration-500">
          <div className="w-14 h-14 border-4 border-slate-100 border-t-[#00A3FF] rounded-full animate-spin shadow-sm" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">
            Autenticando Acceso...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 ml-64 p-6 lg:p-12 relative overflow-hidden flex flex-col bg-slate-50/30">
        {/* Background Decorative Elements - Pure Corporate Light */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          {/* Subtle Blue Glow in the top right */}
          <div className="absolute top-[-10%] right-[-5%] w-[45%] h-[45%] bg-[#00A3FF]/5 blur-[140px] rounded-full" />
          
          {/* Subtle Slate Glow in the bottom left */}
          <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-slate-200/50 blur-[120px] rounded-full" />
          
          {/* Professional Dot Grid for Depth */}
          <div 
            className="absolute inset-0 opacity-[0.4]" 
            style={{ 
              backgroundImage: `radial-gradient(circle at 2px 2px, #CBD5E1 1.5px, transparent 0)`,
              backgroundSize: '48px 48px' 
            }}
          />
        </div>

        {/* Banner de SSL */}
        {showHttpAlert && (
          <div className="relative z-50 mb-8 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-3xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-center gap-4 animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white text-2xl">gpp_maybe</span>
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-black uppercase tracking-wide">Conexión No Segura Detectada</h4>
                <p className="text-xs text-white/80 font-medium">
                  Estás accediendo a través de HTTP sin cifrado. Protege el panel y habilita HTTPS de forma automática.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
              <button
                onClick={handleActivateSystemSsl}
                disabled={isActivatingSsl}
                className="flex-1 md:flex-initial bg-white text-orange-600 hover:bg-orange-50 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isActivatingSsl ? (
                  <>
                    <span className="w-3 h-3 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                    Generando SSL...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xs">verified_user</span>
                    Activar SSL del Panel
                  </>
                )}
              </button>
              <button
                onClick={() => setShowHttpAlert(false)}
                className="w-10 h-10 hover:bg-white/10 rounded-xl flex items-center justify-center transition-colors text-white/80 hover:text-white"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>
        )}

        <div className="relative z-10 flex-1 flex flex-col max-w-[1600px] mx-auto w-full min-w-0">
           {children}
        </div>
      </main>
    </div>
  );
}

