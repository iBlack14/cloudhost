"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { MailFolderSummary, MailIdentity } from "@odisea/types";
import { sendMailMessage } from "../lib/mail-client";

export function MailShell({
  children,
  me,
  title,
  subtitle,
  folders = []
}: {
  children: React.ReactNode;
  me: MailIdentity | null;
  title: string;
  subtitle: string;
  folders?: MailFolderSummary[];
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
              <span className="text-xl font-bold tracking-tight text-slate-800">
                Odisea <span className="text-[#00A3FF] font-semibold">Mail</span>
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
              <div className="text-xs font-semibold text-[#00A3FF] leading-none mb-1">{me?.address}</div>
              <div className="text-[10px] font-medium text-slate-400 leading-none">Canal Seguro Activo</div>
           </div>
           <button className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
              <span className="material-symbols-outlined">help_outline</span>
           </button>
           <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold text-xs shadow-lg shadow-slate-900/20">
              {me?.address?.charAt(0).toUpperCase()}
           </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        
        {/* 2. Sidebar */}
        <aside className={`
          shrink-0 bg-white flex flex-col transition-all duration-300
          ${isSidebarOpen ? "w-64 p-4" : "w-[68px] py-4 px-2 items-center"}
        `}>
           <button 
             onClick={() => setIsComposeOpen(true)}
             className={`
               flex items-center justify-center bg-white border border-slate-200 hover:shadow-xl hover:bg-slate-50 text-slate-900 transition-all shadow-md active:scale-95 group mb-6
               ${isSidebarOpen ? "gap-4 px-6 py-3.5 rounded-2xl" : "w-12 h-12 rounded-full"}
             `}
           >
              <span className="material-symbols-outlined text-[#00A3FF] group-hover:scale-110 transition-transform">edit</span>
              {isSidebarOpen && <span className="text-sm font-semibold text-slate-700">Redactar</span>}
           </button>

           <nav className="flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
              <MailNavItem href="/inbox" icon="inbox" label="Recibidos" count={folders.find(f => f.folder === 'INBOX')?.count} active={pathname.endsWith("/inbox")} sidebarOpen={isSidebarOpen} />
              <MailNavItem href="/starred" icon="star" label="Destacados" count={folders.find(f => f.folder === 'STARRED')?.count} active={pathname.endsWith("/starred")} sidebarOpen={isSidebarOpen} />
              <MailNavItem href="/sent" icon="send" label="Enviados" count={folders.find(f => f.folder === 'SENT')?.count} active={pathname.endsWith("/sent")} sidebarOpen={isSidebarOpen} />
              <MailNavItem href="/drafts" icon="drafts" label="Borradores" count={folders.find(f => f.folder === 'DRAFTS')?.count} active={pathname.endsWith("/drafts")} sidebarOpen={isSidebarOpen} />
              <MailNavItem href="/trash" icon="delete" label="Papelera" count={folders.find(f => f.folder === 'TRASH')?.count} active={pathname.endsWith("/trash")} sidebarOpen={isSidebarOpen} />
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
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; overflow: hidden; background: white; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
      `}</style>
    </div>
  );
}

function FloatingCompose({ onClose }: { onClose: () => void }) {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [toInput, setToInput] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);

  const addRecipient = (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (trimmed && trimmed.includes("@") && !recipients.includes(trimmed)) {
      setRecipients((prev) => [...prev, trimmed]);
    }
    setToInput("");
  };

  const removeRecipient = (email: string) => {
    setRecipients((prev) => prev.filter((r) => r !== email));
  };

  const handleToKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      e.preventDefault();
      if (toInput.trim()) {
        addRecipient(toInput);
      }
    }
    if (e.key === "Backspace" && toInput === "" && recipients.length > 0) {
      removeRecipient(recipients[recipients.length - 1]);
    }
  };

  const handleToPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    const emails = pasted.split(/[,;\s\n]+/).filter((s) => s.includes("@"));
    if (emails.length > 0) {
      e.preventDefault();
      const newRecipients = [...recipients];
      emails.forEach((email) => {
        const trimmed = email.trim().toLowerCase();
        if (trimmed && !newRecipients.includes(trimmed)) {
          newRecipients.push(trimmed);
        }
      });
      setRecipients(newRecipients);
      setToInput("");
    }
  };

  const handleSend = async () => {
    if (recipients.length === 0 || !subject || !body) return;
    setLoading(true);
    try {
      await sendMailMessage({ to: recipients, subject, body });
      onClose();
    } catch (e) {
      alert("Error enviando mensaje: " + (e instanceof Error ? e.message : "Error desconocido"));
    } finally {
      setLoading(false);
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`
      fixed bottom-0 right-10 w-[420px] bg-white shadow-[0_16px_64px_rgba(0,163,255,0.12)] rounded-t-xl border border-slate-200 z-50 flex flex-col transition-all duration-500 transform
      ${minimized ? "h-11 translate-y-0" : "h-[460px] translate-y-0"}
      animate-in slide-in-from-bottom-20
    `}>
       {/* Window Header */}
       <div className="h-11 bg-[#1A1F2D] text-white flex items-center justify-between px-5 rounded-t-xl shrink-0 cursor-pointer group" onClick={() => setMinimized(!minimized)}>
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-1.5 rounded-full bg-[#00A3FF] animate-pulse"></div>
             <span className="text-xs font-semibold tracking-wide opacity-90 group-hover:opacity-100 transition-opacity">Mensaje nuevo</span>
          </div>
          <div className="flex items-center gap-5">
             <button onClick={(e) => { e.stopPropagation(); setMinimized(!minimized); }} className="material-symbols-outlined text-[18px] opacity-40 hover:opacity-100 hover:text-[#00A3FF] transition-all">remove</button>
             <button className="material-symbols-outlined text-[18px] opacity-40 hover:opacity-100 transition-all">open_in_full</button>
             <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="material-symbols-outlined text-[18px] opacity-40 hover:opacity-100 hover:text-red-400 transition-all">close</button>
          </div>
       </div>

       {!minimized && (
         <>
           <div className="flex-1 flex flex-col px-5 py-3 space-y-px overflow-hidden">
              {/* To field with chips */}
              <div className="flex items-start border-b border-slate-100 py-2 gap-2">
                 <span className="text-xs font-semibold text-slate-400 w-10 pt-1.5 shrink-0">Para</span>
                 <div className="flex-1 flex flex-wrap items-center gap-1.5 min-h-[32px]" onClick={() => toInputRef.current?.focus()}>
                    {recipients.map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1 bg-[#E8F4FD] text-[#00A3FF] px-2.5 py-1 rounded-full text-xs font-medium group/chip hover:bg-[#d0ecfb] transition-colors animate-in fade-in zoom-in-95 duration-150"
                      >
                        {email}
                        <button
                          onClick={(e) => { e.stopPropagation(); removeRecipient(email); }}
                          className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-[#00A3FF]/20 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      </span>
                    ))}
                    <input
                      ref={toInputRef}
                      type="text"
                      value={toInput}
                      onChange={(e) => setToInput(e.target.value)}
                      onKeyDown={handleToKeyDown}
                      onPaste={handleToPaste} 
                      onBlur={() => { if (toInput.trim()) addRecipient(toInput); }}
                      placeholder={recipients.length === 0 ? "correo@ejemplo.com" : ""}
                      className="flex-1 min-w-[100px] outline-none text-sm font-medium text-slate-800 bg-transparent py-0.5 placeholder:text-slate-300"
                    />
                 </div>
                 <div className="flex gap-3 text-xs font-medium text-slate-300 pt-1.5 shrink-0">
                    <button className="hover:text-[#00A3FF]">Cc</button>
                    <button className="hover:text-[#00A3FF]">Cco</button>
                 </div>
              </div>
              <div className="flex items-center border-b border-slate-100 py-2">
                 <input 
                   type="text" 
                   placeholder="Asunto" 
                   value={subject} 
                   onChange={(e) => setSubject(e.target.value)} 
                   className="w-full outline-none text-sm font-medium text-slate-800 placeholder:text-slate-300" 
                 />
              </div>
              <textarea 
                placeholder="Escribe tu mensaje..." 
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="flex-1 w-full outline-none py-3 text-sm font-medium text-slate-700 resize-none custom-scrollbar leading-relaxed" 
              />
           </div>

           {/* Functional Toolbar Footer */}
           <div className="h-14 border-t border-slate-100 flex items-center justify-between px-5 shrink-0 bg-white">
              <div className="flex items-center gap-4">
                 {/* Unified Send Pill */}
                 <div className="flex items-center bg-[#00A3FF] rounded-full overflow-hidden shadow-lg shadow-[#00A3FF]/20 group active:scale-95 transition-all">
                    <button 
                      onClick={handleSend}
                      disabled={loading || recipients.length === 0 || !subject || !body}
                      className="px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#008EE0] transition-colors disabled:opacity-50"
                    >
                       {loading ? "Enviando..." : "Enviar"}
                    </button>
                    <div className="w-[1px] h-7 bg-white/10"></div>
                    <button className="px-2 py-2.5 text-white hover:bg-[#008EE0] transition-colors">
                       <span className="material-symbols-outlined text-[18px]">arrow_drop_down</span>
                    </button>
                 </div>

                 {/* Utility Icons */}
                 <div className="flex items-center gap-0.5">
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
                className="w-9 h-9 rounded-full flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all active:scale-90"
              >
                 <span className="material-symbols-outlined text-[20px]">delete</span>
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
      title={!sidebarOpen ? label : undefined}
      className={`
        flex items-center transition-all duration-200 group
        ${sidebarOpen 
          ? "justify-between rounded-r-full px-6 py-3" 
          : "justify-center rounded-xl py-3 mx-auto w-12"}
        ${active 
          ? "bg-[#00A3FF]/10 text-[#00A3FF]" 
          : variant === "danger"
            ? "text-slate-400 hover:text-red-500 hover:bg-red-50"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}
      `}
    >
      <div className={`flex items-center ${sidebarOpen ? "gap-4" : "justify-center"}`}>
        <span className={`material-symbols-outlined text-[22px] ${active ? "text-[#00A3FF]" : "text-slate-400 group-hover:text-slate-600"}`}>
          {icon}
        </span>
        {sidebarOpen && <span className={`text-[13px] ${active ? "font-semibold" : "font-medium"}`}>{label}</span>}
      </div>
      {sidebarOpen && count !== undefined && (
        <span className={`text-[10px] font-semibold ${active ? "text-[#00A3FF]" : "text-slate-400"}`}>{count}</span>
      )}
    </Link>
  );
}
