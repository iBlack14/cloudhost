"use client";

import React from "react";
import { Sidebar } from "../../components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
