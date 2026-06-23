"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { MailFolderSummary, MailIdentity, MailMessageDetail, MailMessageSummary } from "@odisea/types";

import {
  fetchMailFolders,
  fetchMailMe,
  fetchMailMessages,
  moveMailMessage,
  setMailRead,
  setMailStar,
  MAIL_BASE_PATH
} from "../../lib/mail-client";
import { MailShell } from "../../components/MailShell";

export default function DraftsPage() {
  const router = useRouter();
  const [me, setMe] = useState<MailIdentity | null>(null);
  const [folders, setFolders] = useState<MailFolderSummary[]>([]);
  const [messages, setMessages] = useState<MailMessageSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = async () => {
    const [identity, nextFolders, nextMessages] = await Promise.all([
      fetchMailMe(),
      fetchMailFolders(),
      fetchMailMessages("DRAFTS")
    ]);

    setMe(identity);
    setFolders(nextFolders);
    setMessages(nextMessages);
    setSelectedId((current) => current && nextMessages.some((item) => item.id === current) ? current : null);
  };

  useEffect(() => {
    setLoading(true);
    loadAll()
      .catch((reason) => {
        if (reason instanceof Error && reason.message.toLowerCase().includes("sesión")) {
          router.replace("/login");
          return;
        }
        setError(reason instanceof Error ? reason.message : "No se pudo cargar los borradores.");
      })
      .finally(() => setLoading(false));
  }, [router]);

  const selectedMessage = useMemo<MailMessageSummary | null>(
    () => messages.find((item) => item.id === selectedId) ?? null,
    [messages, selectedId]
  );

  const toggleStar = async (message: MailMessageSummary) => {
    await setMailStar(message.id, !message.starred);
    await loadAll();
  };

  const trashMessage = async (message: MailMessageSummary) => {
    await moveMailMessage(message.id, "TRASH");
    await loadAll();
  };

  return (
    <MailShell
      me={me}
      title="Borradores"
      subtitle="Mensajes sin enviar"
      folders={folders}
    >
      <div className="flex h-full w-full overflow-hidden flex-col bg-white">
        
        {/* Gmail-Style Toolbar */}
        <div className="h-12 border-b border-slate-100 flex items-center px-6 justify-between shrink-0 bg-white z-20">
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-1">
                 <ToolbarIcon icon="check_box_outline_blank" />
                 <ToolbarIcon icon="arrow_drop_down" />
              </div>
              <ToolbarIcon icon="refresh" onClick={() => loadAll()} />
              <ToolbarIcon icon="more_vert" />
           </div>
           
           <div className="flex items-center gap-4">
              <span className="text-xs font-medium text-slate-400">1–{messages.length} de {messages.length}</span>
              <div className="flex items-center">
                 <ToolbarIcon icon="chevron_left" />
                 <ToolbarIcon icon="chevron_right" />
              </div>
           </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Message List */}
          <section className={`flex flex-col bg-white transition-all duration-300 ${selectedId ? "w-[420px] min-w-[420px] border-r border-slate-100" : "w-full"}`}>
             <div className="flex-1 overflow-y-auto custom-scrollbar">
                 {loading ? (
                   <div className="p-24 flex flex-col items-center gap-4 opacity-30">
                     <div className="w-7 h-7 border-[3px] border-slate-100 border-t-[#00A3FF] rounded-full animate-spin"></div>
                     <span className="text-xs font-medium text-slate-400">Cargando Borradores...</span>
                   </div>
                 ) : messages.length === 0 ? (
                   <div className="p-32 text-center flex flex-col items-center opacity-50">
                      <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-5 border border-slate-100">
                         <span className="material-symbols-outlined text-3xl text-slate-300">edit_note</span>
                      </div>
                      <div className="text-slate-500 text-sm font-medium">No tienes borradores guardados.</div>
                   </div>
                 ) : (
                   messages.map((message) => (
                     <div
                       key={message.id}
                       onClick={() => setSelectedId(message.id)}
                       className={`
                         group flex items-center px-4 py-2.5 border-b border-slate-50/80 cursor-pointer transition-all relative
                         ${selectedId === message.id ? "bg-orange-50/50 border-l-2 border-l-[#FF3D00]" : "hover:bg-slate-50/70 border-l-2 border-l-transparent"}
                         bg-white
                       `}
                     >
                       <div className="flex items-center gap-2.5 shrink-0 mr-3">
                         <span className="material-symbols-outlined text-slate-300 text-[18px]">check_box_outline_blank</span>
                         <span 
                           onClick={(e) => { e.stopPropagation(); toggleStar(message); }}
                           className={`material-symbols-outlined text-[18px] transition-colors ${message.starred ? "text-amber-400 font-variation-fill" : "text-slate-300 hover:text-slate-500"}`}
                         >
                           {message.starred ? "star" : "star_outline"}
                         </span>
                       </div>

                       {selectedId ? (
                         <div className="flex-1 min-w-0">
                           <div className="flex items-center justify-between mb-0.5">
                             <span className="text-[13px] font-medium text-[#FF3D00] italic">Borrador</span>
                             <span className="text-[11px] font-medium text-[#FF3D00] shrink-0 ml-2">{message.receivedAt}</span>
                           </div>
                           <div className="text-[13px] truncate font-medium text-slate-700">{message.subject || "(sin asunto)"}</div>
                           <div className="text-xs text-slate-400 truncate mt-0.5 font-normal">{message.preview}</div>
                         </div>
                       ) : (
                         <>
                           <div className="w-48 shrink-0 text-[13px] truncate mr-4 text-[#FF3D00] font-medium italic">
                              Borrador
                           </div>

                           <div className="flex-1 min-w-0 flex items-baseline gap-1.5">
                              <span className="text-[13px] truncate font-medium text-slate-700">
                                {message.subject || "(sin asunto)"}
                              </span>
                              <span className="text-[13px] text-slate-400 truncate font-normal">
                                — {message.preview}
                              </span>
                           </div>

                           <div className="shrink-0 ml-4 text-xs font-medium text-[#FF3D00]">
                              {message.receivedAt}
                           </div>
                         </>
                       )}

                       {/* Hover Actions */}
                       <div className="absolute right-3 inset-y-0 flex items-center gap-0.5 bg-inherit px-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ToolbarIcon icon="edit" onClick={(e) => { e.stopPropagation(); router.push(`/compose?id=${message.id}`); }} />
                          <ToolbarIcon icon="delete" onClick={(e) => { e.stopPropagation(); trashMessage(message); }} />
                       </div>
                     </div>
                   ))
                 )}
              </div>
          </section>

          {/* Inline Draft Preview Pane */}
          {selectedId && (
            <section className="flex-1 min-w-0 bg-white flex flex-col animate-in slide-in-from-right-5 duration-200">
              <div className="flex flex-col h-full bg-white">
                 {/* Toolbar */}
                 <div className="h-12 border-b border-slate-100 flex items-center px-5 gap-4 shrink-0">
                    <ToolbarIcon icon="arrow_back" onClick={() => setSelectedId(null)} />
                    <div className="h-5 w-px bg-slate-100"></div>
                    <ToolbarIcon icon="delete" onClick={() => selectedMessage && trashMessage(selectedMessage)} />
                    <div className="h-5 w-px bg-slate-100"></div>
                    <ToolbarIcon icon="more_vert" />
                    <div className="ml-auto">
                       <ToolbarIcon icon="close" onClick={() => setSelectedId(null)} />
                    </div>
                 </div>

                 <div className="flex-1 flex flex-col items-center justify-center p-16 text-center space-y-6">
                    <div className="w-20 h-20 rounded-2xl bg-orange-50 flex items-center justify-center text-[#FF3D00]">
                       <span className="material-symbols-outlined text-4xl">edit_square</span>
                    </div>
                    <div className="space-y-3">
                       <h3 className="text-xl font-bold text-slate-900">Borrador en pausa</h3>
                       <p className="text-sm text-slate-500 max-w-xs mx-auto">Este mensaje no ha sido enviado. Puedes continuar redactándolo ahora mismo.</p>
                    </div>
                    <button 
                       onClick={() => router.push(`/compose?id=${selectedId}`)}
                       className="bg-[#FF3D00] text-white text-xs font-semibold px-8 py-3 rounded-xl shadow-lg shadow-orange-500/15 hover:scale-[1.03] active:scale-95 transition-all"
                    >
                       Continuar Redactando
                    </button>
                 </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </MailShell>
  );
}

function ToolbarIcon({ icon, onClick }: { icon: string; onClick?: (e: React.MouseEvent) => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all active:scale-95"
    >
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
    </button>
  );
}
