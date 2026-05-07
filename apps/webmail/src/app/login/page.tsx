"use client";

import { type FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginMail } from "../../lib/mail-client";

export default function LoginPage() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await loginMail(address, password);
      router.replace("/inbox");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Credenciales inválidas.");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-sans antialiased bg-slate-900">
      {/* Premium Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/mail.png" 
          alt="Background" 
          className="w-full h-full object-cover opacity-60 scale-105 animate-pulse-slow"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-900/40 to-[#00A3FF]/20" />
      </div>

      <div className="relative z-10 w-full max-w-[900px] px-6 grid lg:grid-cols-2 gap-16 items-center">
        {/* Left Side: Branding */}
        <div className="space-y-10 text-white">
          <div className="space-y-6">
             <div className="relative w-20 h-20">
                <div className="absolute inset-0 bg-[#00A3FF] rounded-3xl blur-2xl opacity-40"></div>
                <img 
                  src="/logo.png" 
                  alt="Odisea" 
                  className="w-20 h-20 object-contain relative z-10 brightness-0 invert" 
                />
             </div>
             <div className="space-y-2">
                <h1 className="text-5xl font-black tracking-tighter uppercase italic leading-none">
                  ODISEA <span className="text-[#00A3FF] not-italic font-black">MAIL</span>
                </h1>
                <p className="text-[11px] text-[#00A3FF] font-black uppercase tracking-[0.4em]">
                  Cloud Communications
                </p>
             </div>
          </div>

          <div className="space-y-8 max-w-sm">
            <p className="text-slate-300 text-lg leading-relaxed font-medium">
              Acceso profesional a tu buzón seguro. Gestión de identidades con cifrado de grado militar.
            </p>
            
            <div className="space-y-4">
               <Feature icon="verified_user" title="Seguridad Total" text="Protección contra phishing y spam avanzado." light />
               <Feature icon="bolt" title="Velocidad Extrema" text="Acceso instantáneo con tecnología NVMe." light />
            </div>
          </div>
        </div>

        {/* Right Side: Form (Glassmorphism) */}
        <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-[3rem] p-12 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00A3FF] to-transparent opacity-50"></div>
          
          <div className="mb-10">
             <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
               Iniciar Sesión
             </h2>
             <p className="text-[11px] text-slate-400 uppercase tracking-widest mt-2 font-bold">
               Ingresa tus credenciales corporativas
             </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-7">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Correo Electrónico</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-[20px] text-slate-300 group-focus-within:text-[#00A3FF] transition-all">alternate_email</span>
                <input
                  type="email"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl pl-14 pr-6 py-5 text-sm text-slate-900 outline-none focus:border-[#00A3FF] focus:bg-white transition-all font-bold placeholder-slate-300"
                  placeholder="usuario@dominio.com"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Contraseña</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-[20px] text-slate-300 group-focus-within:text-[#00A3FF] transition-all">lock_open</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl pl-14 pr-6 py-5 text-sm text-slate-900 outline-none focus:border-[#00A3FF] focus:bg-white transition-all font-bold placeholder-slate-300"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-5 rounded-2xl border border-red-100 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-wide animate-in fade-in slide-in-from-top-1">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00A3FF] py-6 rounded-2xl text-white font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl shadow-[#00A3FF]/40 hover:bg-[#008EE0] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:grayscale mt-6"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>Sincronizando...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <span className="material-symbols-outlined text-[20px]">login</span>
                  <span>Acceder al Buzón</span>
                </div>
              )}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-slate-100 text-center">
             <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.3em]">
               Infraestructura Segura <span className="text-[#00A3FF]">Odisea</span>
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, text, light }: { icon: string; title: string; text: string; light?: boolean }) {
  return (
    <div className={`flex gap-5 items-start p-4 ${light ? 'hover:bg-white/5' : 'hover:bg-slate-50'} rounded-2xl transition-all group`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${light ? 'bg-white/10 text-[#00A3FF]' : 'bg-slate-100 text-slate-400 group-hover:bg-[#00A3FF] group-hover:text-white'}`}>
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <div>
        <div className={`text-xs font-black uppercase tracking-widest ${light ? 'text-white' : 'text-slate-900'}`}>{title}</div>
        <div className={`text-[11px] font-medium mt-1 leading-relaxed ${light ? 'text-slate-400' : 'text-slate-500'}`}>{text}</div>
      </div>
    </div>
  );
}
