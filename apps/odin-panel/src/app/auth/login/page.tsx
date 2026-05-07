"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { hasOdinSession, loginOdin } from "../../../lib/api";

export default function OdinLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (hasOdinSession()) {
      router.replace("/");
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await loginOdin(username, password);
      router.replace("/");
    } catch (err: any) {
      setError(err.message ?? "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-sans antialiased bg-slate-900">
      {/* Premium Technical Background */}
      <div className="fixed inset-0 z-0">
        <img 
          src="/fondo.webp" 
          alt="Technical Background" 
          className="w-full h-full object-cover opacity-50 scale-105 animate-pulse-slow"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-900/40 to-[#00A3FF]/20" />
      </div>

      <div className="relative z-10 w-full max-w-[440px] px-6">
        {/* Branding */}
        <div className="flex flex-col items-center mb-12">
          <div className="relative mb-8 group cursor-default">
            <div className="absolute inset-0 bg-[#00A3FF] rounded-full blur-3xl group-hover:bg-[#00A3FF]/40 transition-all duration-700 opacity-30"></div>
            <img 
              src="/logo.png" 
              alt="Odisea" 
              className="w-24 h-24 object-contain relative z-10 drop-shadow-2xl brightness-0 invert opacity-90 group-hover:scale-110 transition-transform duration-500" 
            />
          </div>
          <h1 className="text-5xl font-black text-white tracking-tighter italic uppercase">
            ODIN <span className="text-[#00A3FF]">PANEL</span>
          </h1>
          <p className="text-[10px] text-[#00A3FF] font-black uppercase tracking-[0.5em] mt-4">
            Cloud User Terminal
          </p>
        </div>

        {/* Login Form Container (Glassmorphism) */}
        <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-[3.5rem] p-12 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-500 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00A3FF] to-transparent opacity-50"></div>
          
          <div className="mb-10">
             <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
               Autenticación
             </h2>
             <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-2 font-bold">
               Acceso seguro a la infraestructura
             </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-7">
            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2">ID de Usuario</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-[22px] text-slate-300 group-focus-within:text-[#00A3FF] transition-all">account_circle</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl pl-14 pr-6 py-5 text-sm text-slate-900 font-bold outline-none focus:border-[#00A3FF] focus:bg-white transition-all placeholder-slate-300"
                  placeholder="usuario_odin"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2">Clave de Acceso</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-[22px] text-slate-300 group-focus-within:text-[#00A3FF] transition-all">shield_lock</span>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl pl-14 pr-14 py-5 text-sm text-slate-900 font-bold outline-none focus:border-[#00A3FF] focus:bg-white transition-all placeholder-slate-300"
                  placeholder="••••••••"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-900 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPass ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-5 rounded-2xl border border-red-100 bg-red-50 text-red-500 text-[10px] font-black uppercase tracking-wide animate-in fade-in slide-in-from-top-1">
                <span className="material-symbols-outlined text-[20px]">warning</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00A3FF] py-6 rounded-2xl text-white font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl shadow-[#00A3FF]/40 hover:bg-[#008EE0] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 mt-6 flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Sincronizando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">verified_user</span>
                  Acceder al Sistema
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security badge */}
        <div className="mt-12 flex items-center justify-center gap-6 opacity-40">
           <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-[#00A3FF]">verified</span>
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Seguridad SSL</span>
           </div>
           <div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>
           <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-[#00A3FF]">gpp_good</span>
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Protección Odin</span>
           </div>
        </div>
      </div>
    </div>
  );
}
