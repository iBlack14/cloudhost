"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "../../components/Sidebar";
import { hasOdinSession } from "../../lib/api";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Perform check only on client side
    const token = hasOdinSession();
    
    if (!token) {
      // Small delay to ensure no race condition with impersonate bridge
      const timeout = setTimeout(() => {
        const reCheckToken = hasOdinSession();
        if (!reCheckToken) {
          router.replace("/auth/login");
        } else {
          setAuthChecked(true);
        }
      }, 100);
      return () => clearTimeout(timeout);
    } else {
      setAuthChecked(true);
    }
  }, [router, pathname]);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-6 animate-in fade-in duration-500">
          <div className="w-14 h-14 border-4 border-slate-100 border-t-[#00A3FF] rounded-full animate-spin shadow-sm" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">
            Autenticando Acceso...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 ml-72 p-6 lg:p-12 relative overflow-hidden flex flex-col bg-slate-50/30">
        {/* Background Decorative Elements - Pure Corporate Light */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          {/* Subtle Blue Glow in the top right */}
          <div className="absolute top-[-10%] right-[-5%] w-[45%] h-[45%] bg-[#00A3FF]/5 blur-[140px] rounded-full" />
          
          {/* Subtle Slate Glow in the bottom left */}
          <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-slate-200/50 blur-[120px] rounded-full" />
          
          {/* Professional Dot Grid for Depth */}
          <div 
            className="absolute inset-0 opacity-[0.4]" 
            style={{ 
              backgroundImage: `radial-gradient(circle at 2px 2px, #CBD5E1 1.5px, transparent 0)`,
              backgroundSize: '48px 48px' 
            }}
          />
        </div>

        <div className="relative z-10 flex-1 flex flex-col max-w-[1600px] mx-auto w-full min-w-0">
           {children}
        </div>
      </main>
    </div>
  );
}
