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
    <div className="min-h-screen bg-[#02060C] flex items-center justify-center relative overflow-hidden font-sans antialiased">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-secondary/5 blur-[100px] rounded-full" />
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{ 
            backgroundImage: `radial-gradient(circle at 2px 2px, #00A3FF 1px, transparent 0)`,
            backgroundSize: '50px 50px' 
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-[380px] px-6">
        {/* Branding */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-6 group cursor-default">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/40 transition-all duration-700 opacity-50"></div>
            <img 
              src="/logo.png" 
              alt="Odisea" 
              className="w-20 h-20 object-contain relative z-10 drop-shadow-[0_0_15px_rgba(0,163,255,0.4)] group-hover:scale-110 transition-transform duration-500" 
            />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tighter italic uppercase font-headline">
            ODIN <span className="text-primary not-italic font-normal tracking-normal ml-1">PANEL</span>
          </h1>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.4em] mt-2 opacity-60">
            Cloud User Terminal
          </p>
        </div>

        {/* Login Form Container */}
        <div className="bg-[#0A1221]/60 backdrop-blur-3xl border border-white/5 rounded-3xl p-8 shadow-2xl shadow-black/40">
          <div className="mb-8">
             <h2 className="text-sm font-black text-white uppercase tracking-tight font-headline">
               Autenticación
             </h2>
             <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1 font-bold">
               Ingresa tus credenciales de acceso
             </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 ml-1">ID de Usuario</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-zinc-600">account_circle</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-11 pr-4 py-3 text-sm text-white outline-none focus:border-primary/40 focus:bg-primary/[0.01] transition-all font-mono placeholder-zinc-700"
                  placeholder="usuario_odin"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 ml-1">Clave de Acceso</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-zinc-600">shield_lock</span>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-11 pr-12 py-3 text-sm text-white outline-none focus:border-primary/40 focus:bg-primary/[0.01] transition-all font-mono placeholder-zinc-700"
                  placeholder="••••••••"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPass ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-[10px] font-bold uppercase tracking-wide animate-in fade-in slide-in-from-top-1">
                <span className="material-symbols-outlined text-[18px]">gpp_maybe</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full kinetic-gradient py-4 rounded-xl text-white font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-40 disabled:grayscale group relative overflow-hidden mt-2"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    Verificando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">verified_user</span>
                    Acceder al Panel
                  </>
                )}
              </span>
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
          </form>
        </div>

        {/* Security badge */}
        <div className="mt-8 flex items-center justify-center gap-4 opacity-30 group hover:opacity-100 transition-all duration-1000">
           <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px] text-zinc-400 group-hover:text-primary transition-colors">verified</span>
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">SSL Secure</span>
           </div>
           <div className="w-1 h-1 rounded-full bg-zinc-800"></div>
           <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px] text-zinc-400 group-hover:text-primary transition-colors">database</span>
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Global Node</span>
           </div>
        </div>
      </div>
    </div>
  );
}
