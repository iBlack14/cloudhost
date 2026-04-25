"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "../../components/Sidebar";

const ODIN_ACCESS_TOKEN_KEY = "odin-access-token";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const token = window.sessionStorage.getItem(ODIN_ACCESS_TOKEN_KEY);
    if (!token) {
      router.replace("/auth/login");
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  // Show nothing while auth is being checked — no flash of protected content
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050B14]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">
            Verificando sesión...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 relative overflow-hidden">
        {children}

        {/* Corporate Celestial Orbs */}
        <div className="fixed bottom-[-100px] right-[-100px] w-[600px] h-[600px] bg-primary/10 blur-[150px] pointer-events-none -z-10 rounded-full animate-pulse"></div>
        <div className="fixed top-[-50px] left-[-50px] w-[400px] h-[400px] bg-secondary/5 blur-[120px] pointer-events-none -z-10 rounded-full"></div>
      </main>
    </div>
  );
}
