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

  useEffect(() => {
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
      setError(submitError instanceof Error ? submitError.message : "No se pudo iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#02060C] flex items-center justify-center relative overflow-hidden font-sans antialiased">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-secondary/5 blur-[100px] rounded-full" />
        {/* Starfield / Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{ 
            backgroundImage: `radial-gradient(circle at 2px 2px, #00A3FF 1px, transparent 0)`,
            backgroundSize: '40px 40px' 
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
            WHM <span className="text-primary font-normal tracking-normal not-italic ml-1">CONSOLE</span>
          </h1>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.4em] mt-2 opacity-60">
            Secure Infrastructure Access
          </p>
        </div>

        {/* Login Form Container */}
        <div className="bg-[#0A1221]/60 backdrop-blur-3xl border border-white/5 rounded-2xl p-8 shadow-2xl shadow-black/40">
          <div className="mb-6">
             <h2 className="text-[11px] font-black text-white uppercase tracking-[0.2em] mb-1">
               Identity Required
             </h2>
             <div className="h-0.5 w-8 bg-primary/40 rounded-full"></div>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Terminal ID</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[16px] text-zinc-600">person</span>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-primary/40 focus:bg-primary/[0.02] transition-all font-mono placeholder-zinc-700"
                  placeholder="admin_id"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Access Key</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[16px] text-zinc-600">lock</span>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-10 pr-12 py-3 text-sm text-white outline-none focus:border-primary/40 focus:bg-primary/[0.02] transition-all font-mono placeholder-zinc-700"
                  placeholder="••••••••"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPass ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {error ? (
              <div className="flex items-center gap-2.5 p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-[10px] font-bold uppercase tracking-wide animate-in fade-in slide-in-from-top-1">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full kinetic-gradient py-3.5 rounded-xl text-white font-black uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-40 disabled:grayscale group relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    Verifying...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">login</span>
                    Authorize Access
                  </>
                )}
              </span>
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="mt-8 flex items-center justify-center gap-4 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-700">
           <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[12px] text-zinc-400">shield</span>
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Encrypted</span>
           </div>
           <div className="w-1 h-1 rounded-full bg-zinc-800"></div>
           <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[12px] text-zinc-400">dns</span>
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Node v2.4</span>
           </div>
        </div>
      </div>
    </div>
  );
}
