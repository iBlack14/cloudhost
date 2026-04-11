"use client";

import React from "react";
import { WhmSidebar } from "../../components/whm-sidebar";

export default function WhmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen overflow-hidden">
      <WhmSidebar />

      {/* Main Content WHM */}
      <main className="flex-1 ml-72 p-12 relative overflow-hidden">
        {children}

        {/* Corporate Celestial Orbs */}
        <div className="fixed bottom-[-150px] right-[-150px] w-[800px] h-[800px] bg-primary/5 blur-[180px] pointer-events-none -z-10 rounded-full animate-pulse"></div>
        <div className="fixed top-[-100px] left-[50vw] w-[400px] h-[400px] bg-secondary/3 blur-[120px] pointer-events-none -z-10 rounded-full"></div>
      </main>
    </div>
  );
}
