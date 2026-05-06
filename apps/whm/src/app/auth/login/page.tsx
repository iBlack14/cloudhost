"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { hasWhmSession, loginWhm } from "../../../lib/api";

export default function WhmLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (hasWhmSession()) {
      router.replace("/whm");
    }
  }, [router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await loginWhm(username, password);
      router.replace("/whm");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Acceso denegado. Credenciales inválidas.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center relative overflow-hidden font-sans antialiased text-slate-900 selection:bg-[#00A3FF]/20">
      {/* 🌌 Corporate Light Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div 
          className="absolute inset-0 z-0 opacity-40"
          style={{
            backgroundImage: "url('/fondo-logo.webp')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        {/* Soft Overlays for depth */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white via-white/90 to-blue-50/30 opacity-95" />
      </div>

      {/* 🔮 Subtle Accent Glow */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#00A3FF]/5 rounded-full blur-[120px] pointer-events-none opacity-50" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#00A3FF]/5 rounded-full blur-[100px] pointer-events-none opacity-30" />

      <div className="relative z-10 w-full max-w-[440px] px-6 animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out">
        
        {/* 🛡️ Corporate Branding */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative group transition-transform duration-500 hover:scale-105">
            <img 
              src="/logo.png" 
              alt="Odisea Logo" 
              className="w-32 h-32 object-contain mb-4 drop-shadow-lg" 
            />
          </div>
          
          <div className="text-center mb-6">
             <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-1">
               ODISEA <span className="font-light text-[#00A3FF]">CLOUD</span>
             </h1>
             <div className="flex items-center gap-2 justify-center">
                <div className="h-[2px] w-12 bg-gradient-to-r from-transparent to-[#00A3FF]/40 rounded-full"></div>
                <div className="h-[2px] w-12 bg-gradient-to-l from-transparent to-[#00A3FF]/40 rounded-full"></div>
             </div>
          </div>

          <div className="flex flex-col items-center">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              Acceso Administrativo
            </h2>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              Panel de gestión de infraestructura global
            </p>
          </div>
        </div>

        {/* 🔐 Elegant White Container */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-[0_20px_50px_-12px_rgba(0,163,255,0.12)] relative overflow-hidden">
          
          <form onSubmit={onSubmit} className="space-y-6 relative z-10">
            <div className="space-y-2.5">
              <label className="text-[13px] font-bold text-slate-600 ml-1">Usuario</label>
              <div className="relative group/input">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-slate-400 group-focus-within/input:text-[#00A3FF] transition-all duration-300">person</span>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-[15px] text-slate-900 outline-none focus:border-[#00A3FF]/50 focus:bg-white focus:ring-4 focus:ring-[#00A3FF]/5 transition-all duration-300 placeholder-slate-400"
                  placeholder="ID de administrador"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <label className="text-[13px] font-bold text-slate-600 ml-1">Contraseña</label>
              <div className="relative group/input">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-slate-400 group-focus-within/input:text-[#00A3FF] transition-all duration-300">lock</span>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-12 py-4 text-[15px] text-slate-900 outline-none focus:border-[#00A3FF]/50 focus:bg-white focus:ring-4 focus:ring-[#00A3FF]/5 transition-all duration-300 placeholder-slate-400"
                  placeholder="••••••••••••"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors outline-none"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPass ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 rounded-2xl border border-red-200 bg-red-50 text-red-600 text-[13px] font-semibold animate-in fade-in zoom-in-95 duration-300">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#00A3FF] hover:bg-[#008EE0] py-4 rounded-2xl text-white font-bold text-[15px] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-4 flex items-center justify-center gap-3 shadow-[0_10px_20px_-5px_rgba(0,163,255,0.4)] active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-[3px] border-white/20 border-t-white rounded-full animate-spin"></div>
                  Verificando...
                </>
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <span className="material-symbols-outlined text-[18px]">login</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* 🔒 Corporate Footer */}
        <div className="mt-12 flex items-center justify-center gap-6 text-slate-400 cursor-default">
           <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px]">verified_user</span>
              <span className="text-[10px] font-bold tracking-wider uppercase">Bóveda Protegida</span>
           </div>
           <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
           <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px]">hub</span>
              <span className="text-[10px] font-bold tracking-wider uppercase">Nodo US-EAST-2.4</span>
           </div>
        </div>
      </div>
    </div>
  );
}
