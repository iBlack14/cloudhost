"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
const ODIN_ACCESS_TOKEN_KEY = "odin-access-token";

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
    const token = window.sessionStorage.getItem(ODIN_ACCESS_TOKEN_KEY);
    if (token) {
      router.replace("/");
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const payload = await res.json();

      if (!res.ok || !payload.success) {
        throw new Error(payload?.error?.message ?? "Credenciales incorrectas");
      }

      const { token, role } = payload.data;

      if (role !== "user" && role !== "admin") {
        throw new Error("No tienes acceso al panel de usuario");
      }

      window.sessionStorage.setItem(ODIN_ACCESS_TOKEN_KEY, token);
      router.replace("/");
    } catch (err: any) {
      setError(err.message ?? "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center relative overflow-hidden font-sans antialiased">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#00A3FF]/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-15%] left-[-15%] w-[45%] h-[45%] bg-slate-200 blur-[120px] rounded-full" />
        <div 
          className="absolute inset-0 opacity-[0.3]" 
          style={{ 
            backgroundImage: `radial-gradient(circle at 2px 2px, #E2E8F0 1px, transparent 0)`,
            backgroundSize: '50px 50px' 
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-[420px] px-6">
        {/* Branding */}
        <div className="flex flex-col items-center mb-12">
          <div className="relative mb-8 group cursor-default">
            <div className="absolute inset-0 bg-[#00A3FF]/20 rounded-full blur-3xl group-hover:bg-[#00A3FF]/40 transition-all duration-700 opacity-40"></div>
            <img 
              src="/logo.png" 
              alt="Odisea" 
              className="w-24 h-24 object-contain relative z-10 drop-shadow-xl group-hover:scale-110 transition-transform duration-500" 
            />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">
            ODIN <span className="text-[#00A3FF]">PANEL</span>
          </h1>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-3">
            Cloud User Terminal
          </p>
        </div>

        {/* Login Form Container */}
        <div className="bg-white border border-slate-200 rounded-[3rem] p-12 shadow-2xl shadow-slate-200/50 animate-in zoom-in-95 duration-500">
          <div className="mb-10">
             <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
               Autenticación
             </h2>
             <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1.5 font-bold">
               Ingresa tus credenciales de acceso seguro
             </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2">ID de Usuario</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-[22px] text-slate-300">account_circle</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-14 pr-6 py-4 text-sm text-slate-900 font-bold outline-none focus:border-[#00A3FF] focus:bg-white transition-all shadow-inner placeholder-slate-300"
                  placeholder="usuario_odin"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2">Clave de Acceso</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-[22px] text-slate-300">shield_lock</span>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-14 pr-14 py-4 text-sm text-slate-900 font-bold outline-none focus:border-[#00A3FF] focus:bg-white transition-all shadow-inner placeholder-slate-300"
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
              <div className="flex items-center gap-3 p-4 rounded-2xl border border-red-200 bg-red-50 text-red-500 text-[10px] font-black uppercase tracking-wide animate-in fade-in slide-in-from-top-1">
                <span className="material-symbols-outlined text-[20px]">warning</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00A3FF] py-5 rounded-2xl text-white font-black uppercase tracking-widest text-[11px] shadow-xl shadow-[#00A3FF]/20 hover:bg-[#008EE0] active:scale-[0.98] transition-all disabled:opacity-40 mt-4 flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
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
        <div className="mt-12 flex items-center justify-center gap-6 opacity-30">
           <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-slate-400">verified</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seguridad SSL</span>
           </div>
           <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
           <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-slate-400">gpp_good</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protección Odin</span>
           </div>
        </div>
      </div>
    </div>
  );
}
