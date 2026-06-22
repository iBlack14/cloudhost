"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Toaster } from "sonner";
import { WhmSidebar } from "../../components/whm-sidebar";
import { hasWhmSession } from "../../lib/api";

export default function WhmLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!hasWhmSession()) {
      router.replace("/auth/login");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen overflow-hidden bg-[#F8FAFC]">
      <WhmSidebar />

      {/* Main Content WHM - Light Corporate Theme */}
      <main className="flex-1 ml-64 p-6 relative overflow-hidden min-h-screen">
        <div className="relative z-10">
          {children}
        </div>

        {/* Corporate Decor Orbs - Softer for Light Theme */}
        <div className="fixed bottom-[-150px] right-[-150px] w-[800px] h-[800px] bg-[#00A3FF]/5 blur-[180px] pointer-events-none z-0 rounded-full"></div>
        <div className="fixed top-[-100px] left-[50vw] w-[400px] h-[400px] bg-[#00A3FF]/5 blur-[120px] pointer-events-none z-0 rounded-full"></div>
      </main>

      {/* Toast notifications — replaces alert() across all WHM pages */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: "inherit",
            fontSize: "12px",
            fontWeight: "700",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            borderRadius: "12px",
          },
        }}
        richColors
        closeButton
      />
    </div>
  );
}
