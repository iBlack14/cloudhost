"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/whm");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#050B14] flex items-center justify-center">
       <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 relative animate-pulse">
             <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
             <img src="/logo.png" alt="Odisea Cloud Logo" className="w-full h-full object-contain relative z-10" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 animate-pulse">Initializing Odin Core...</span>
       </div>
    </div>
  );
}
