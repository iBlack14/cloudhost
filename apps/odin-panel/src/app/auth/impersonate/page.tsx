"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function OdinImpersonatePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [step, setStep] = useState(0);

  const logs = [
    "INTERCEPTING INCOMING WHM HANDSHAKE...",
    "DECRYPTING ADMINISTRATIVE PAYLOAD...",
    "VALIDATING NEURAL SESSION DYNAMICS...",
    "HANDSHAKING WITH ODIN BORDER GATEWAY...",
    "SESSION INJECTED. DIVERTING TO DASHBOARD.",
  ];

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!token) return;

    // Simulate technical handshake
    const interval = setInterval(() => {
      setStep((prev) => {
        if (prev < logs.length - 1) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 600);

    // Actual session logic
    localStorage.setItem("odin-token", token);
    
    const timeout = setTimeout(() => {
      router.replace("/");
    }, 4000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [token, router]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050B14]">
         <div className="glass-card p-12 text-center border-red-500/20">
            <span className="material-symbols-outlined text-red-500 text-5xl mb-4">error</span>
            <h2 className="text-2xl font-headline font-black text-white italic tracking-tighter uppercase">Connection Fault</h2>
            <p className="text-zinc-500 mt-2 text-[10px] font-black tracking-widest uppercase">Administrative token not detected in current sector.</p>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#050B14] relative overflow-hidden">
      {/* Central Core */}
      <div className="relative z-10 flex flex-col items-center">
         <div className="w-32 h-32 relative mb-12">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full border-t-primary animate-spin"></div>
            <div className="absolute inset-4 border-2 border-secondary/10 rounded-full border-b-secondary animate-spin [animation-duration:3s] [animation-direction:reverse]"></div>
            <div className="absolute inset-0 flex items-center justify-center">
               <img src="/logo.png" alt="Odin" className="w-16 h-16 object-contain" />
            </div>
         </div>

         <div className="space-y-4 max-w-md w-full px-6">
            <div className="text-center mb-8">
               <h1 className="text-3xl font-headline font-black text-white italic tracking-tighter uppercase">
                  Impersonation Bridge
               </h1>
               <p className="text-[10px] text-zinc-500 font-black tracking-[0.4em] uppercase mt-2">
                  Establishing Unified Control
               </p>
            </div>

            <div className="bg-black/40 border border-white/5 rounded-2xl p-6 font-mono space-y-2 h-40 overflow-hidden relative shadow-2xl">
               <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-black/60 to-transparent z-10"></div>
               <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
               
               <div className="space-y-2 transition-all duration-500" style={{ transform: `translateY(-${step * 24}px)` }}>
                  {logs.map((log, i) => (
                    <div 
                      key={i} 
                      className={`text-[10px] flex items-center gap-3 transition-opacity duration-300 ${i <= step ? 'opacity-100' : 'opacity-0'}`}
                    >
                       <span className={`w-1.5 h-1.5 rounded-full ${i === step ? 'bg-primary animate-pulse' : 'bg-zinc-800'}`}></span>
                       <span className={i === step ? 'text-primary' : 'text-zinc-600'}>{log}</span>
                       {i === step && mounted && <span className="text-[10px] text-zinc-400">[{Math.floor(Math.random() * 900) + 100}ms]</span>}
                    </div>
                  ))}
               </div>
            </div>

            <div className="flex justify-center gap-4 pt-10">
               <div className="px-5 py-2 rounded-full border border-white/5 bg-white/5 text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                  X-ROOT-TRUSTED
               </div>
               <div className="px-5 py-2 rounded-full border border-primary/20 bg-primary/5 text-[9px] font-black text-primary uppercase tracking-widest shadow-[0_0_15px_rgba(0,163,255,0.1)]">
                  SYSLOG: OK
               </div>
            </div>
         </div>
      </div>

      {/* Corporate Celestial Orbs */}
      <div className="fixed bottom-[-150px] left-[-150px] w-[600px] h-[600px] bg-primary/5 blur-[150px] pointer-events-none rounded-full animate-pulse"></div>
      <div className="fixed top-[-100px] right-[-100px] w-[500px] h-[500px] bg-secondary/5 blur-[130px] pointer-events-none rounded-full"></div>
    </div>
  );
}
