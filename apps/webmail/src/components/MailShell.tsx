"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { MailIdentity } from "@odisea/types";
import { sendMailMessage } from "../lib/mail-client";

export function MailShell({
  children,
  me,
  title,
  subtitle
}: {
  children: React.ReactNode;
  me: MailIdentity | null;
  title: string;
  subtitle: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  return (
    <div className="h-screen bg-white text-slate-900 flex flex-col overflow-hidden font-sans selection:bg-[#00A3FF]/10 selection:text-[#00A3FF]">
      
      {/* 1. Gmail-Style Top Search & Brand Bar */}
      <header className="h-16 shrink-0 border-b border-slate-100 flex items-center px-4 gap-8 z-30 bg-white">
        <div className="flex items-center gap-4 w-64 shrink-0">
           <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
              <span className="material-symbols-outlined">menu</span>
           </button>
           <div className="flex items-center gap-3 group cursor-pointer" onClick={() => router.push("/inbox")}>
              <img src="/logo.png" alt="Odisea" className="h-8 w-8 object-contain" />
              <span className="text-xl font-black tracking-tighter uppercase italic text-slate-800">
                ODISEA <span className="text-[#00A3FF] not-italic">MAIL</span>
              </span>
           </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-3xl relative group">
           <div className="absolute inset-y-0 left-4 flex items-center text-slate-400 group-focus-within:text-[#00A3FF]">
              <span className="material-symbols-outlined">search</span>
           </div>
           <input 
             type="text" 
             placeholder="Buscar en el correo corporativo..." 
             className="w-full bg-slate-100/50 hover:bg-slate-100 focus:bg-white border-transparent focus:border-[#00A3FF]/20 focus:ring-4 focus:ring-[#00A3FF]/5 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium transition-all outline-none border shadow-sm"
           />
        </div>

        <div className="flex items-center gap-3 ml-auto">
           <div className="hidden lg:flex flex-col items-end mr-4">
              <div className="text-[10px] font-black text-[#00A3FF] uppercase tracking-widest leading-none mb-1">{me?.address}</div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Canal Seguro Activo</div>
           </div>
           <button className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
              <span className="material-symbols-outlined">help_outline</span>
           </button>
           <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs shadow-lg shadow-slate-900/20">
              {me?.address?.charAt(0).toUpperCase()}
           </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        
        {/* 2. Sidebar */}
        <aside className={`
          shrink-0 bg-white p-4 flex flex-col transition-all duration-300 overflow-hidden
          ${isSidebarOpen ? "w-64" : "w-20"}
        `}>
           <button 
             onClick={() => setIsComposeOpen(true)}
             className={`
               flex items-center gap-4 bg-white border border-slate-200 hover:shadow-xl hover:bg-slate-50 text-slate-900 px-6 py-4 rounded-[1.5rem] transition-all shadow-md active:scale-95 group mb-6
               ${!isSidebarOpen && "px-4"}
             `}
           >
              <span className="material-symbols-outlined text-[#00A3FF] group-hover:scale-110 transition-transform">edit</span>
              {isSidebarOpen && <span className="text-sm font-black tracking-tight text-slate-700">Redactar</span>}
           </button>

           <nav className="flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
              <MailNavItem href="/inbox" icon="inbox" label="Recibidos" count={12} active={pathname.endsWith("/inbox")} sidebarOpen={isSidebarOpen} />
              <MailNavItem href="/starred" icon="star" label="Destacados" active={pathname.endsWith("/starred")} sidebarOpen={isSidebarOpen} />
              <MailNavItem href="/sent" icon="send" label="Enviados" active={pathname.endsWith("/sent")} sidebarOpen={isSidebarOpen} />
              <MailNavItem href="/drafts" icon="drafts" label="Borradores" active={pathname.endsWith("/drafts")} sidebarOpen={isSidebarOpen} />
              <MailNavItem href="/trash" icon="delete" label="Papelera" active={pathname.endsWith("/trash")} sidebarOpen={isSidebarOpen} />
              <div className="mt-4 pt-4 border-t border-slate-100">
                 <MailNavItem href="/logout" icon="logout" label="Salir" active={pathname.endsWith("/logout")} sidebarOpen={isSidebarOpen} variant="danger" />
              </div>
           </nav>
        </aside>

        {/* 3. Main Content Area */}
        <main className="flex-1 bg-white flex flex-col min-w-0 border-l border-slate-100 relative">
           {children}
        </main>

        {/* 4. Floating Compose Window (Fully Functional) */}
        {isComposeOpen && (
          <FloatingCompose onClose={() => setIsComposeOpen(false)} />
        )}
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        body { font-family: 'Inter', sans-serif; overflow: hidden; background: white; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
      `}</style>
    </div>
  );
}

function FloatingCompose({ onClose }: { onClose: () => void }) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (!to || !subject || !body) return;
    setLoading(true);
    try {
      await sendMailMessage({ to: [to], subject, body });
      onClose();
    } catch (e) {
      alert("Error enviando mensaje");
    } finally {
      setLoading(false);
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`
      fixed bottom-0 right-10 w-[520px] bg-white shadow-[0_32px_128px_rgba(0,163,255,0.15)] rounded-t-2xl border border-slate-200 z-50 flex flex-col transition-all duration-500 transform
      ${minimized ? "h-12 translate-y-0" : "h-[640px] translate-y-0"}
      animate-in slide-in-from-bottom-20
    `}>
       {/* Window Header */}
       <div className="h-12 bg-[#1A1F2D] text-white flex items-center justify-between px-6 rounded-t-2xl shrink-0 cursor-pointer group" onClick={() => setMinimized(!minimized)}>
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-1.5 rounded-full bg-[#00A3FF] animate-pulse"></div>
             <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-90 group-hover:opacity-100 transition-opacity">Mensaje nuevo</span>
          </div>
          <div className="flex items-center gap-5">
             <button onClick={(e) => { e.stopPropagation(); setMinimized(!minimized); }} className="material-symbols-outlined text-[18px] opacity-40 hover:opacity-100 hover:text-[#00A3FF] transition-all">remove</button>
             <button className="material-symbols-outlined text-[18px] opacity-40 hover:opacity-100 transition-all">open_in_full</button>
             <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="material-symbols-outlined text-[18px] opacity-40 hover:opacity-100 hover:text-red-400 transition-all">close</button>
          </div>
       </div>

       {!minimized && (
         <>
           <div className="flex-1 flex flex-col p-8 space-y-px overflow-hidden">
              <div className="flex items-center border-b border-slate-100 py-3">
                 <span className="text-xs font-black text-slate-400 w-12 uppercase tracking-widest">Para</span>
                 <input 
                   type="text" 
                   value={to} 
                   onChange={(e) => setTo(e.target.value)} 
                   className="flex-1 outline-none text-sm font-black text-slate-800" 
                 />
                 <div className="flex gap-4 text-[9px] font-black text-slate-300 uppercase tracking-widest">
                    <button className="hover:text-[#00A3FF]">Cc</button>
                    <button className="hover:text-[#00A3FF]">Cco</button>
                 </div>
              </div>
              <div className="flex items-center border-b border-slate-100 py-3">
                 <input 
                   type="text" 
                   placeholder="Asunto" 
                   value={subject} 
                   onChange={(e) => setSubject(e.target.value)} 
                   className="w-full outline-none text-sm font-black text-slate-800 placeholder:text-slate-200" 
                 />
              </div>
              <textarea 
                placeholder="Escribe tu mensaje..." 
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="flex-1 w-full outline-none py-6 text-sm font-medium text-slate-700 resize-none custom-scrollbar leading-relaxed" 
              />
           </div>

           {/* Functional Toolbar Footer */}
           <div className="h-20 border-t border-slate-100 flex items-center justify-between px-8 shrink-0 bg-white rounded-b-2xl">
              <div className="flex items-center gap-6">
                 {/* Unified Send Pill */}
                 <div className="flex items-center bg-[#00A3FF] rounded-full overflow-hidden shadow-2xl shadow-[#00A3FF]/30 group active:scale-95 transition-all">
                    <button 
                      onClick={handleSend}
                      disabled={loading || !to || !subject || !body}
                      className="px-8 py-3.5 text-[11px] font-black uppercase tracking-widest text-white hover:bg-[#008EE0] transition-colors disabled:opacity-50"
                    >
                       {loading ? "Sincronizando..." : "Enviar"}
                    </button>
                    <div className="w-[1px] h-10 bg-white/10"></div>
                    <button className="px-3 py-3.5 text-white hover:bg-[#008EE0] transition-colors">
                       <span className="material-symbols-outlined text-[20px]">arrow_drop_down</span>
                    </button>
                 </div>

                 {/* Utility Icons (NOW FUNCTIONAL) */}
                 <div className="flex items-center gap-1.5">
                    <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => console.log('File selected:', e.target.files?.[0])} />
                    <ToolbarIcon icon="text_format" onClick={() => alert('Opciones de formato activadas')} />
                    <ToolbarIcon icon="attach_file" onClick={handleFileClick} />
                    <ToolbarIcon icon="link" onClick={() => { const url = prompt('Ingresa el enlace:'); if(url) setBody(body + '\n' + url); }} />
                    <ToolbarIcon icon="mood" onClick={() => setBody(body + ' 😊')} />
                    <ToolbarIcon icon="image" onClick={handleFileClick} />
                 </div>
              </div>
              
              <button 
                onClick={onClose} 
                className="w-11 h-11 rounded-full flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all active:scale-90"
              >
                 <span className="material-symbols-outlined text-[22px]">delete</span>
              </button>
           </div>
         </>
       )}
    </div>
  );
}

function ToolbarIcon({ icon, onClick }: { icon: string; onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-[#00A3FF] transition-all"
    >
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
    </button>
  );
}

function MailNavItem({
  href,
  icon,
  label,
  count,
  active,
  sidebarOpen,
  variant = "default"
}: {
  href: string;
  icon: string;
  label: string;
  count?: number;
  active: boolean;
  sidebarOpen: boolean;
  variant?: "default" | "danger"
}) {
  return (
    <Link
      href={href}
      className={`
        flex items-center justify-between rounded-r-full px-6 py-3 transition-all duration-200 group
        ${active 
          ? "bg-[#00A3FF]/10 text-[#00A3FF]" 
          : variant === "danger"
            ? "text-slate-400 hover:text-red-500 hover:bg-red-50"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}
        ${!sidebarOpen && "px-4 rounded-full mx-2"}
      `}
    >
      <div className="flex items-center gap-4">
        <span className={`material-symbols-outlined text-[22px] ${active ? "text-[#00A3FF]" : "text-slate-400 group-hover:text-slate-600"}`}>
          {icon}
        </span>
        {sidebarOpen && <span className={`text-[13px] font-bold tracking-tight ${active ? "font-black" : ""}`}>{label}</span>}
      </div>
      {sidebarOpen && count !== undefined && (
        <span className={`text-[10px] font-black ${active ? "text-[#00A3FF]" : "text-slate-400"}`}>{count}</span>
      )}
    </Link>
  );
}
