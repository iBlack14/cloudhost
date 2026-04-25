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
    <div className="min-h-screen bg-[#02060C] flex items-center justify-center relative overflow-hidden font-sans antialiased">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-emerald-500/5 blur-[100px] rounded-full" />
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{ 
            backgroundImage: `radial-gradient(circle at 2px 2px, #00A3FF 1px, transparent 0)`,
            backgroundSize: '50px 50px' 
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-[850px] px-6 grid lg:grid-cols-2 gap-12 items-center">
        {/* Left Side: Branding */}
        <div className="space-y-8">
          <div className="space-y-4">
             <div className="relative w-16 h-16 group cursor-default">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/40 transition-all duration-700 opacity-50"></div>
                <img 
                  src="/logo.png" 
                  alt="Odisea" 
                  className="w-16 h-16 object-contain relative z-10 drop-shadow-[0_0_15px_rgba(0,163,255,0.4)]" 
                />
             </div>
             <div className="space-y-1">
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic font-headline leading-none">
                  ODISEA <span className="text-primary not-italic font-normal tracking-normal ml-1">MAIL</span>
                </h1>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.4em] opacity-60">
                  Cloud Communications
                </p>
             </div>
          </div>

          <div className="space-y-6 max-w-sm">
            <p className="text-zinc-500 text-sm leading-relaxed font-medium">
              Accede a tu buzón seguro de Odisea Cloud. Gestión de identidades independiente para máxima privacidad.
            </p>
            
            <div className="grid gap-4">
               <Feature icon="lock" title="Cifrado E2E" text="Sesiones aisladas y seguras." />
               <Feature icon="speed" title="Alta Velocidad" text="Infraestructura NVMe dedicada." />
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="bg-[#0A1221]/60 backdrop-blur-3xl border border-white/5 rounded-3xl p-8 shadow-2xl shadow-black/40">
          <div className="mb-8">
             <h2 className="text-sm font-black text-white uppercase tracking-tight font-headline">
               Inicio de Sesión
             </h2>
             <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1 font-bold">
               Ingresa tus credenciales de correo
             </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 ml-1">Dirección Completa</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-zinc-600">alternate_email</span>
                <input
                  type="email"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-11 pr-4 py-3 text-sm text-white outline-none focus:border-primary/40 focus:bg-primary/[0.01] transition-all font-mono placeholder-zinc-700"
                  placeholder="admin@tu-dominio.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 ml-1">Contraseña</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-zinc-600">shield_lock</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-11 pr-4 py-3 text-sm text-white outline-none focus:border-primary/40 focus:bg-primary/[0.01] transition-all font-mono placeholder-zinc-700"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-[10px] font-bold uppercase tracking-wide animate-in fade-in slide-in-from-top-1">
                <span className="material-symbols-outlined text-[18px]">warning</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full kinetic-gradient py-4 rounded-xl text-white font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-40 disabled:grayscale mt-2"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    Conectando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">login</span>
                    Entrar al Webmail
                  </>
                )}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="flex gap-4 items-start p-3 hover:bg-white/[0.02] rounded-2xl transition-colors">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      </div>
      <div>
        <div className="text-[10px] font-black uppercase text-white tracking-widest">{title}</div>
        <div className="text-[10px] text-zinc-600 font-medium mt-0.5">{text}</div>
      </div>
    </div>
  );
}
