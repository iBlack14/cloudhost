"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { MailIdentity } from "@odisea/types";

import { fetchMailMe, sendMailMessage } from "../../lib/mail-client";
import { MailShell } from "../../components/MailShell";

export default function ComposePage() {
  const router = useRouter();
  const [me, setMe] = useState<MailIdentity | null>(null);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [isFocused, setIsFocused] = useState<string | null>(null);

  useEffect(() => {
    fetchMailMe()
      .then(setMe)
      .catch(() => router.replace("/login"));
  }, [router]);

  const onSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault();
    if (!to || !subject || !body) return;
    
    setLoading(true);
    setFeedback(null);

    try {
      const recipients = to
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      await sendMailMessage({ to: recipients, subject, body });
      setFeedback("Mensaje enviado con éxito al nodo de destino.");
      
      // Auto-reset and redirect
      setTimeout(() => {
        setTo("");
        setSubject("");
        setBody("");
        router.push("/inbox");
      }, 1500);
    } catch (reason) {
      setFeedback(reason instanceof Error ? reason.message : "Error crítico en la transmisión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MailShell
      me={me}
      title="Terminal de Redacción"
      subtitle="Canal de comunicación encriptado"
    >
      <div className="h-full flex flex-col bg-[#F8FAFC] p-6 lg:p-10">
        
        {/* Pro-Max Floating Compose Container */}
        <div className="flex-1 max-w-5xl mx-auto w-full bg-white rounded-[2.5rem] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.08)] border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 fade-in duration-700">
           
           {/* Glassmorphic Header */}
           <div className="h-16 bg-slate-900/95 backdrop-blur-xl flex items-center justify-between px-8 shrink-0 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-[#00A3FF]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <div className="flex items-center gap-3 relative z-10">
                 <div className="w-2 h-2 rounded-full bg-[#00A3FF] animate-pulse shadow-[0_0_10px_#00A3FF]"></div>
                 <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/90">New Secure Transmission</span>
              </div>
              <div className="flex items-center gap-6 relative z-10">
                 <span className="material-symbols-outlined text-[18px] text-white/40 cursor-pointer hover:text-white transition-colors">remove</span>
                 <span className="material-symbols-outlined text-[18px] text-white/40 cursor-pointer hover:text-white transition-colors">zoom_out_map</span>
                 <span onClick={() => router.back()} className="material-symbols-outlined text-[18px] text-white/40 cursor-pointer hover:text-red-400 transition-colors">close</span>
              </div>
           </div>

           <div className="flex-1 flex flex-col p-10 lg:p-14 space-y-1">
              
              {/* Recipients - Advanced Field */}
              <div className={`flex items-center border-b transition-all duration-500 py-4 ${isFocused === 'to' ? 'border-[#00A3FF] translate-x-2' : 'border-slate-100'}`}>
                 <span className="text-xs font-black text-slate-400 w-16 uppercase tracking-widest">Para</span>
                 <input 
                   type="text" 
                   value={to}
                   onFocus={() => setIsFocused('to')}
                   onBlur={() => setIsFocused(null)}
                   onChange={(e) => setTo(e.target.value)}
                   className="flex-1 bg-transparent border-none outline-none text-base font-black text-slate-900 placeholder:text-slate-200 placeholder:font-bold"
                   placeholder="destinatario@odiseacloud.com"
                 />
                 <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <button onClick={() => setShowCc(!showCc)} className="hover:text-[#00A3FF] transition-colors">Cc</button>
                    <button className="hover:text-[#00A3FF] transition-colors">Cco</button>
                 </div>
              </div>

              {showCc && (
                <div className="flex items-center border-b border-slate-100 py-4 animate-in fade-in slide-in-from-top-4 duration-500">
                   <span className="text-xs font-black text-slate-400 w-16 uppercase tracking-widest">Cc</span>
                   <input type="text" className="flex-1 bg-transparent border-none outline-none text-base font-black text-slate-900" />
                </div>
              )}

              {/* Subject - Advanced Field */}
              <div className={`flex items-center border-b transition-all duration-500 py-4 ${isFocused === 'subject' ? 'border-[#00A3FF] translate-x-2' : 'border-slate-100'}`}>
                 <input 
                   type="text" 
                   value={subject}
                   onFocus={() => setIsFocused('subject')}
                   onBlur={() => setIsFocused(null)}
                   onChange={(e) => setSubject(e.target.value)}
                   className="w-full bg-transparent border-none outline-none text-base font-black text-slate-900 placeholder:text-slate-200 placeholder:font-bold"
                   placeholder="Asunto del mensaje"
                 />
              </div>

              {/* Message Body - Pro Editor Feel */}
              <textarea 
                value={body}
                onFocus={() => setIsFocused('body')}
                onBlur={() => setIsFocused(null)}
                onChange={(e) => setBody(e.target.value)}
                className="flex-1 w-full bg-transparent border-none outline-none py-10 text-lg font-medium text-slate-700 resize-none placeholder:text-slate-100 leading-relaxed custom-scrollbar selection:bg-[#00A3FF]/10"
                placeholder="Inicia la redacción segura aquí..."
              />

              {/* Advanced Pro-Max Footer Toolbar */}
              <div className="shrink-0 pt-10 flex flex-col md:flex-row md:items-center justify-between gap-8 border-t border-slate-50">
                 <div className="flex items-center gap-6">
                    <div className="flex items-center rounded-2xl overflow-hidden shadow-2xl shadow-[#00A3FF]/30 group active:scale-95 transition-all">
                       <button 
                         onClick={() => onSubmit()}
                         disabled={loading || !to || !subject || !body}
                         className="bg-[#00A3FF] hover:bg-[#008EE0] text-white px-10 py-5 text-[11px] font-black uppercase tracking-[0.2em] transition-all disabled:opacity-40"
                       >
                          {loading ? "Sincronizando..." : "Enviar Ahora"}
                       </button>
                       <div className="w-px h-14 bg-white/10"></div>
                       <button className="bg-[#00A3FF] hover:bg-[#008EE0] text-white px-4 py-5 transition-all">
                          <span className="material-symbols-outlined text-[24px]">expand_more</span>
                       </button>
                    </div>

                    <div className="flex items-center gap-1.5 p-1.5 bg-slate-50 rounded-2xl border border-slate-100">
                       <ToolbarIcon icon="text_format" tooltip="Formato" />
                       <ToolbarIcon icon="attach_file" tooltip="Adjuntar" />
                       <ToolbarIcon icon="link" tooltip="Enlace" />
                       <ToolbarIcon icon="mood" tooltip="Emojis" />
                       <ToolbarIcon icon="add_to_drive" tooltip="Drive" />
                       <ToolbarIcon icon="image" tooltip="Imágenes" />
                       <ToolbarIcon icon="lock" tooltip="Privacidad" />
                       <ToolbarIcon icon="history_edu" tooltip="Firma" />
                    </div>
                 </div>

                 <div className="flex items-center gap-4">
                    {feedback && (
                      <div className={`px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest border animate-in slide-in-from-right-10 ${feedback.includes("éxito") ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-500'}`}>
                         {feedback}
                      </div>
                    )}
                    <button 
                      onClick={() => router.back()}
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all active:scale-90 shadow-sm border border-slate-100 bg-white"
                    >
                       <span className="material-symbols-outlined text-[28px]">delete</span>
                    </button>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <style jsx>{`
        textarea::placeholder { transition: opacity 0.5s; }
        textarea:focus::placeholder { opacity: 0.3; }
      `}</style>
    </MailShell>
  );
}

function ToolbarIcon({ icon, tooltip }: { icon: string; tooltip: string }) {
  return (
    <div className="relative group">
      <button className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-400 hover:bg-white hover:text-[#00A3FF] hover:shadow-sm transition-all active:scale-90">
        <span className="material-symbols-outlined text-[22px]">{icon}</span>
      </button>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all scale-75 group-hover:scale-100 z-50 whitespace-nowrap">
         {tooltip}
      </div>
    </div>
  );
}
