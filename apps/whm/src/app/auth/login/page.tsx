"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { hasWhmSession, loginWhm } from "../../../lib/api";

function FeatureItem({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-full bg-[#00A3FF]/10 border border-[#00A3FF]/20 flex items-center justify-center text-[#00A3FF] flex-shrink-0 shadow-[0_0_15px_rgba(0,163,255,0.05)]">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <div className="space-y-0.5">
        <h4 className="text-sm font-bold text-white leading-snug uppercase tracking-tight">{title}</h4>
        <p className="text-xs text-slate-400 leading-snug font-medium">{desc}</p>
      </div>
    </div>
  );
}

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
    <div 
      className="min-h-screen bg-slate-950 flex flex-col lg:grid lg:grid-cols-12 relative overflow-hidden font-sans antialiased text-slate-200 selection:bg-[#00A3FF]/20"
      style={{
        backgroundImage: "url('/server-room-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Dark overlay for server room background */}
      <div className="absolute inset-0 bg-slate-950/40 z-0 pointer-events-none" />

      {/* LEFT COLUMN: BRANDING (Visible only on desktop lg:col-span-5) */}
      <div className="hidden lg:flex lg:col-span-5 bg-[#020B24]/95 border-r border-[#00A3FF]/10 flex-col justify-between p-16 lg:p-20 relative z-10">
        {/* Glow effects inside the panel */}
        <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-[#00A3FF]/10 rounded-full blur-[100px] pointer-events-none opacity-40" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-[#00A3FF]/5 rounded-full blur-[80px] pointer-events-none opacity-20" />

        <div className="relative z-10 flex flex-col items-start gap-12">
          {/* Logo & Brand */}
          <Link href="/auth/login" className="flex items-center gap-4 group">
            <div className="relative flex-shrink-0 transition-transform duration-500 group-hover:scale-105">
              <div className="absolute inset-0 bg-[#00A3FF]/10 rounded-full blur-xl group-hover:bg-[#00A3FF]/20 transition-all duration-700 opacity-50"></div>
              <img 
                src="/logo.png" 
                alt="Odisea Cloud Logo" 
                className="w-16 h-16 object-contain relative z-10 drop-shadow-md" 
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white uppercase leading-none">
                ODISEA <span className="font-light text-[#00A3FF]">CLOUD</span>
              </h2>
            </div>
          </Link>

          {/* Subheading */}
          <div className="space-y-2.5">
            <h1 className="text-3xl font-black text-white uppercase tracking-tight">
              Acceso <span className="text-[#00A3FF]">Administrativo</span>
            </h1>
            <p className="text-slate-400 text-sm font-medium">
              Panel de gestión de infraestructura global
            </p>
          </div>

          {/* Features */}
          <div className="space-y-6 pt-4 w-full">
            <FeatureItem 
              icon="verified_user" 
              title="Seguridad Avanzada" 
              desc="Protección y monitoreo 24/7" 
            />
            <FeatureItem 
              icon="bolt" 
              title="Rendimiento Superior" 
              desc="Infraestructura de alto rendimiento" 
            />
            <FeatureItem 
              icon="language" 
              title="Infraestructura Global" 
              desc="Servidores en múltiples ubicaciones" 
            />
            <FeatureItem 
              icon="settings_suggest" 
              title="Control Total" 
              desc="Gestiona todo desde un solo lugar" 
            />
          </div>
        </div>

        {/* Left footer */}
        <div className="relative z-10 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
           © 2026 ODISEACLOUD. TODOS LOS DERECHOS RESERVADOS.
        </div>
      </div>

      {/* RIGHT COLUMN: LOGIN CARD (lg:col-span-7) */}
      <div className="flex-1 lg:col-span-7 flex flex-col justify-center items-center p-6 relative z-10 bg-slate-950/20 backdrop-blur-[2px]">
        
        {/* Mobile Logo & Brand (Only visible on mobile) */}
        <div className="flex flex-col items-center mb-8 lg:hidden animate-in fade-in slide-in-from-top-4 duration-700">
          <img 
            src="/logo.png" 
            alt="Odisea Cloud Logo" 
            className="w-20 h-20 object-contain mb-3 drop-shadow-lg" 
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <h2 className="text-xl font-black tracking-tight text-white uppercase leading-none">
            ODISEA <span className="font-light text-[#00A3FF]">CLOUD</span>
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
             Acceso Administrativo
          </p>
        </div>

        {/* Glassmorphic Login Card */}
        <div className="w-full max-w-[440px] p-8 lg:p-10 rounded-[2.5rem] bg-[#020B24]/60 backdrop-blur-md border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.5)] relative overflow-hidden transition-all hover:border-white/15">
          {/* Circular badge with shield */}
          <div className="w-16 h-16 rounded-full bg-[#00A3FF]/10 border border-[#00A3FF]/20 flex items-center justify-center text-[#00A3FF] mx-auto mb-6 shadow-[0_0_20px_rgba(0,163,255,0.15)]">
             <span className="material-symbols-outlined text-[30px]">security</span>
          </div>

          <div className="text-center mb-8">
            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Bienvenido de vuelta</h3>
            <p className="text-[9px] text-slate-400 font-black tracking-widest uppercase mt-1">Inicia sesión para continuar</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5 relative z-10">
            {/* Username */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuario</label>
              <div className="relative group/input">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-slate-400 group-focus-within/input:text-[#00A3FF] transition-all duration-300">person</span>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                  className="w-full bg-slate-950/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm text-white placeholder-slate-500 focus:border-[#00A3FF]/50 focus:bg-slate-950/60 focus:ring-4 focus:ring-[#00A3FF]/5 outline-none transition-all duration-300 shadow-inner"
                  placeholder="ID de administrador"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña</label>
              <div className="relative group/input">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-slate-400 group-focus-within/input:text-[#00A3FF] transition-all duration-300">lock</span>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="w-full bg-slate-950/40 border border-white/10 rounded-2xl pl-12 pr-12 py-4 text-sm text-white placeholder-slate-500 focus:border-[#00A3FF]/50 focus:bg-slate-950/60 focus:ring-4 focus:ring-[#00A3FF]/5 outline-none transition-all duration-300 shadow-inner"
                  placeholder="••••••••••••"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors outline-none"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPass ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Helper row */}
            <div className="flex justify-between items-center text-xs pt-1.5">
              <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200 select-none font-medium">
                <input 
                  type="checkbox" 
                  className="rounded bg-slate-950/40 border border-white/10 text-[#00A3FF] focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                />
                Recordarme
              </label>
              <a href="#" className="text-[#00A3FF] hover:underline font-bold tracking-tight">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 rounded-2xl border border-red-900/30 bg-red-950/30 text-red-400 text-xs font-bold animate-in fade-in zoom-in-95 duration-300">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#00A3FF] hover:bg-[#008EE0] py-4 rounded-2xl text-white font-bold text-xs tracking-widest uppercase transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-4 flex items-center justify-center gap-3 shadow-lg shadow-[#00A3FF]/20 active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-[2px] border-white/20 border-t-white rounded-full animate-spin"></div>
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

          {/* Card footer */}
          <div className="text-center text-xs text-slate-500 mt-8 font-medium">
             ¿Necesitas ayuda? Contacta a <a href="#" className="text-[#00A3FF] hover:underline font-bold">soporte</a>
          </div>
        </div>

        {/* Mobile footer (Only visible on mobile) */}
        <div className="mt-8 text-[9px] font-bold text-slate-600 uppercase tracking-widest lg:hidden">
           © 2026 ODISEACLOUD.
        </div>
      </div>
    </div>
  );
}
