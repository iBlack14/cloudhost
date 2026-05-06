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
    <div className="min-h-screen bg-white flex items-center justify-center relative overflow-hidden font-sans antialiased">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#00A3FF]/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-slate-100 blur-[100px] rounded-full" />
        <div 
          className="absolute inset-0 opacity-[0.4]" 
          style={{ 
            backgroundImage: `radial-gradient(circle at 2px 2px, #E2E8F0 1px, transparent 0)`,
            backgroundSize: '40px 40px' 
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-[900px] px-6 grid lg:grid-cols-2 gap-16 items-center">
        {/* Left Side: Branding */}
        <div className="space-y-10">
          <div className="space-y-6">
             <div className="relative w-20 h-20">
                <div className="absolute inset-0 bg-[#00A3FF]/10 rounded-3xl blur-2xl opacity-50 animate-pulse"></div>
                <img 
                  src="/logo.png" 
                  alt="Odisea" 
                  className="w-20 h-20 object-contain relative z-10" 
                />
             </div>
             <div className="space-y-2">
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
                  ODISEA <span className="text-[#00A3FF] not-italic font-black">MAIL</span>
                </h1>
                <p className="text-[11px] text-[#00A3FF] font-black uppercase tracking-[0.4em]">
                  Cloud Communications
                </p>
             </div>
          </div>

          <div className="space-y-8 max-w-sm">
            <p className="text-slate-500 text-base leading-relaxed font-medium">
              Acceso profesional a tu buzón seguro. Gestión de identidades con cifrado de grado militar y privacidad garantizada.
            </p>
            
            <div className="space-y-4">
               <Feature icon="verified_user" title="Seguridad Total" text="Protección contra phishing y spam avanzado." />
               <Feature icon="bolt" title="Velocidad Extrema" text="Acceso instantáneo con tecnología NVMe." />
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200/50 relative">
          <div className="mb-10">
             <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
               Iniciar Sesión
             </h2>
             <p className="text-[11px] text-slate-400 uppercase tracking-widest mt-2 font-bold">
               Ingresa tus credenciales corporativas
             </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2.5">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Correo Electrónico</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-slate-300 group-focus-within:text-[#00A3FF] transition-colors">alternate_email</span>
                <input
                  type="email"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-5 py-4 text-sm text-slate-900 outline-none focus:border-[#00A3FF] focus:bg-white transition-all font-bold placeholder-slate-300 shadow-inner"
                  placeholder="usuario@dominio.com"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Contraseña</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-slate-300 group-focus-within:text-[#00A3FF] transition-colors">lock_open</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-5 py-4 text-sm text-slate-900 outline-none focus:border-[#00A3FF] focus:bg-white transition-all font-bold placeholder-slate-300 shadow-inner"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 rounded-2xl border border-red-100 bg-red-50 text-red-600 text-[11px] font-bold uppercase tracking-wide animate-in fade-in slide-in-from-top-1">
                <span className="material-symbols-outlined text-[20px]">error</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00A3FF] py-5 rounded-2xl text-white font-black uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-[#00A3FF]/30 hover:bg-[#008EE0] active:scale-[0.98] transition-all disabled:opacity-40 disabled:grayscale mt-4"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>Conectando...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">login</span>
                  <span>Acceder al Buzón</span>
                </div>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-100 text-center">
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
               © 2024 Odisea Cloud. Infraestructura Segura.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="flex gap-5 items-start p-4 hover:bg-slate-50 rounded-2xl transition-all group">
      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[#00A3FF] group-hover:text-white transition-all">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <div>
        <div className="text-xs font-black uppercase text-slate-900 tracking-widest">{title}</div>
        <div className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">{text}</div>
      </div>
    </div>
  );
}
