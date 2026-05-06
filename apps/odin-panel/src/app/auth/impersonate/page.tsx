"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { exchangeImpersonationToken } from "../../../lib/api";

export default function OdinImpersonatePage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [invalidToken, setInvalidToken] = useState(false);
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);

  const logs = [
    "INTERCEPTANDO HANDSHAKE DE WHM...",
    "DECODIFICANDO PAYLOAD ADMINISTRATIVO...",
    "VALIDANDO DINÁMICAS DE SESIÓN NEURAL...",
    "SINCRONIZANDO CON PUERTA DE ENLACE ODIN...",
    "SESIÓN INYECTADA. REDIRECCIONANDO AL PANEL.",
  ];

  useEffect(() => {
    setMounted(true);

    const getHashToken = () => {
       const hash = window.location.hash;
       if (hash.includes("token=")) {
          return decodeURIComponent(hash.split("token=")[1]);
       }
       return null;
    };

    const t = getHashToken();
    if (t) {
       setToken(t);
    }
  }, []);

  useEffect(() => {
    if (!token) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const interval = setInterval(() => {
      setStep((prev) => {
        if (prev < logs.length - 1) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 700);

    const authenticateFromImpersonation = async () => {
      try {
        const exchange = await exchangeImpersonationToken(token);
        window.sessionStorage.setItem("odin-access-token", exchange.token);
        // Clear the hash for security
        window.history.replaceState(null, "", "/auth/impersonate");
        
        timeoutId = setTimeout(() => {
          router.replace("/");
        }, 3500);
      } catch (err) {
        setInvalidToken(true);
        window.sessionStorage.removeItem("odin-access-token");
        clearInterval(interval);
      }
    };
    
    authenticateFromImpersonation();

    return () => {
      clearInterval(interval);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [token, router]);

  // Si no hay token en el hash y no estamos cargando, mostramos error
  if (mounted && !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white relative overflow-hidden">
         <div className="absolute inset-0 z-0 opacity-[0.4]" 
            style={{ 
              backgroundImage: `radial-gradient(circle at 2px 2px, #E2E8F0 1px, transparent 0)`,
              backgroundSize: '40px 40px' 
            }}
         />
         <div className="bg-white border border-slate-200 p-12 rounded-[3rem] shadow-2xl text-center relative z-10 max-w-sm w-full mx-6 animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-sm">
               <span className="material-symbols-outlined text-4xl">warning</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Error de <span className="text-red-500">Enlace</span></h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-4 leading-relaxed">
              No se detectó un token administrativo válido en el sector actual.
            </p>
            <button 
              onClick={() => router.push("/auth/login")}
              className="mt-10 w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-900/20"
            >
              Volver al Login
            </button>
         </div>
      </div>
    );
  }

  if (invalidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white relative overflow-hidden">
         <div className="absolute inset-0 z-0 opacity-[0.4]" 
            style={{ 
              backgroundImage: `radial-gradient(circle at 2px 2px, #E2E8F0 1px, transparent 0)`,
              backgroundSize: '40px 40px' 
            }}
         />
         <div className="bg-white border border-slate-200 p-12 rounded-[3rem] shadow-2xl text-center relative z-10 max-w-sm w-full mx-6 animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-sm">
               <span className="material-symbols-outlined text-4xl">security_update_warning</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Token <span className="text-amber-500">Inválido</span></h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-4 leading-relaxed">
              El acceso administrativo ha expirado o no es reconocido por la puerta de enlace.
            </p>
            <button 
              onClick={() => router.push("/auth/login")}
              className="mt-10 w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all active:scale-95"
            >
              Solicitar Nuevo Acceso
            </button>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#00A3FF]/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-15%] left-[-15%] w-[45%] h-[45%] bg-slate-200 blur-[120px] rounded-full" />
        <div 
          className="absolute inset-0 opacity-[0.3]" 
          style={{ 
            backgroundImage: `radial-gradient(circle at 2px 2px, #E2E8F0 1px, transparent 0)`,
            backgroundSize: '40px 40px' 
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-md w-full px-6">
         <div className="w-40 h-40 relative mb-14">
            <div className="absolute inset-0 bg-[#00A3FF]/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute inset-0 border-[6px] border-[#00A3FF]/10 rounded-full border-t-[#00A3FF] animate-spin"></div>
            <div className="absolute inset-6 border-[3px] border-slate-200 rounded-full border-b-[#00A3FF]/40 animate-spin [animation-duration:4s] [animation-direction:reverse]"></div>
            <div className="absolute inset-0 flex items-center justify-center">
               <img src="/logo.png" alt="Odin" className="w-20 h-20 object-contain" />
            </div>
         </div>

         <div className="space-y-10 w-full text-center">
            <div className="space-y-3">
               <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic">
                  Puente de <span className="text-[#00A3FF]">Acceso</span>
               </h1>
               <p className="text-[10px] text-slate-400 font-black tracking-[0.4em] uppercase">
                  Sincronización Administrativa
               </p>
            </div>

            <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-[2.5rem] p-10 font-mono space-y-4 h-52 overflow-hidden relative shadow-2xl">
               <div className="absolute top-0 left-0 w-full h-10 bg-gradient-to-b from-white/80 to-transparent z-10"></div>
               <div className="absolute bottom-0 left-0 w-full h-10 bg-gradient-to-t from-white/80 to-transparent z-10"></div>
               
               <div className="space-y-4 transition-all duration-700 ease-in-out" style={{ transform: `translateY(-${step * 32}px)` }}>
                  {logs.map((log, i) => (
                    <div 
                      key={i} 
                      className={`text-[11px] font-bold flex items-center gap-4 transition-all duration-500 ${i <= step ? 'opacity-100' : 'opacity-0 scale-95'}`}
                    >
                       <div className={`w-2 h-2 rounded-full ${i === step ? 'bg-[#00A3FF] animate-pulse shadow-[0_0_8px_#00A3FF]' : 'bg-slate-200'}`}></div>
                       <span className={i === step ? 'text-slate-900' : 'text-slate-400'}>{log}</span>
                       {i === step && mounted && <span className="text-[10px] text-[#00A3FF] font-black">[{Math.floor(Math.random() * 400) + 100}ms]</span>}
                    </div>
                  ))}
               </div>
            </div>

            <div className="flex justify-center gap-4 pt-4">
               <div className="px-6 py-2.5 rounded-full border border-slate-200 bg-white text-[9px] font-black text-slate-400 uppercase tracking-widest shadow-sm">
                  ROOT-TRUSTED
               </div>
               <div className="px-6 py-2.5 rounded-full border border-[#00A3FF]/20 bg-[#00A3FF]/5 text-[9px] font-black text-[#00A3FF] uppercase tracking-widest shadow-lg shadow-[#00A3FF]/5">
                  ENLACE: ACTIVO
               </div>
            </div>
         </div>
      </div>

      {/* Corporate Accent */}
      <div className="fixed bottom-10 right-10 flex flex-col items-end opacity-20 pointer-events-none">
         <span className="text-[8px] font-black uppercase tracking-[0.5em] text-slate-900">Odisea Cloud Infrastructure</span>
         <span className="text-[8px] font-black uppercase tracking-[0.5em] text-[#00A3FF] mt-1">Terminal ID: 3003-ADMIN</span>
      </div>
    </div>
  );
}
