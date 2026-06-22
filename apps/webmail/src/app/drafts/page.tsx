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
    setSelectedId((current) => current && nextMessages.some((item) => item.id === current) ? current : nextMessages[0]?.id ?? null);
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
    () => messages.find((item) => item.id === selectedId) ?? messages[0] ?? null,
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
        <div className="h-14 border-b border-slate-100 flex items-center px-6 justify-between shrink-0 bg-white z-20">
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-1">
                 <ToolbarIcon icon="check_box_outline_blank" />
                 <ToolbarIcon icon="arrow_drop_down" />
              </div>
              <ToolbarIcon icon="refresh" onClick={() => loadAll()} />
              <ToolbarIcon icon="more_vert" />
           </div>
           
           <div className="flex items-center gap-4">
              <span className="text-[11px] font-medium text-slate-500">1-{messages.length} de {messages.length}</span>
              <div className="flex items-center">
                 <ToolbarIcon icon="chevron_left" />
                 <ToolbarIcon icon="chevron_right" />
              </div>
           </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Message List */}
          <section className={`
            flex flex-col border-r border-slate-100 transition-all duration-500 bg-white
            ${selectedId ? "w-[450px] 2xl:w-[550px]" : "w-full"}
          `}>
             <div className="flex-1 overflow-y-auto custom-scrollbar">
                {loading ? (
                  <div className="p-24 flex flex-col items-center gap-4 opacity-30">
                    <div className="w-8 h-8 border-4 border-slate-100 border-t-[#00A3FF] rounded-full animate-spin"></div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Cargando Borradores...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="p-32 text-center flex flex-col items-center opacity-40">
                     <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-6 border border-slate-100">
                        <span className="material-symbols-outlined text-4xl text-slate-300">edit_note</span>
                     </div>
                     <div className="text-slate-500 text-sm font-medium">No tienes borradores guardados.</div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      onClick={() => setSelectedId(message.id)}
                      className={`
                        group flex items-center px-4 py-3 border-b border-slate-50 cursor-pointer transition-all relative
                        ${selectedId === message.id ? "bg-[#FF3D00]/5 z-10" : "hover:bg-slate-50 hover:shadow-sm hover:z-10"}
                        bg-white
                      `}
                    >
                      <div className="flex items-center gap-3 shrink-0 mr-4">
                        <span className="material-symbols-outlined text-slate-300 text-[20px]">check_box_outline_blank</span>
                        <span 
                          onClick={(e) => { e.stopPropagation(); toggleStar(message); }}
                          className={`material-symbols-outlined text-[20px] transition-colors ${message.starred ? "text-amber-400 font-variation-fill" : "text-slate-300 hover:text-slate-500"}`}
                        >
                          {message.starred ? "star" : "star_outline"}
                        </span>
                      </div>

                      <div className="w-48 shrink-0 text-sm truncate mr-4 text-[#FF3D00] font-bold italic">
                         [Borrador]
                      </div>

                      <div className="flex-1 min-w-0 flex items-baseline gap-2">
                         <span className="text-sm truncate font-semibold text-slate-800">
                           {message.subject || "(sin asunto)"}
                         </span>
                         <span className="text-sm text-slate-400 truncate font-medium">
                           - {message.preview}
                         </span>
                      </div>

                      <div className="shrink-0 ml-4 text-[11px] font-bold uppercase tracking-tight text-[#FF3D00]">
                         {message.receivedAt}
                      </div>

                      {/* Hover Actions */}
                      <div className="absolute right-4 inset-y-0 flex items-center gap-1 bg-inherit px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <ToolbarIcon icon="edit" onClick={(e) => { e.stopPropagation(); router.push(`/compose?id=${message.id}`); }} />
                         <ToolbarIcon icon="delete" onClick={(e) => { e.stopPropagation(); trashMessage(message); }} />
                      </div>
                    </div>
                  ))
                )}
             </div>
          </section>

          {/* Reading/Edit Preview Pane */}
          {selectedId && (
            <section className="flex-1 bg-white flex flex-col min-w-0 overflow-hidden">
               <div className="flex flex-col h-full bg-white">
                  {/* Toolbar */}
                  <div className="h-14 border-b border-slate-100 flex items-center px-6 gap-6 shrink-0">
                     <ToolbarIcon icon="arrow_back" onClick={() => setSelectedId(null)} />
                     <div className="h-6 w-px bg-slate-100 mx-2"></div>
                     <ToolbarIcon icon="delete" onClick={() => selectedMessage && trashMessage(selectedMessage)} />
                     <div className="h-6 w-px bg-slate-100 mx-2"></div>
                     <ToolbarIcon icon="more_vert" />
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-center p-20 text-center space-y-8">
                     <div className="w-24 h-24 rounded-[2rem] bg-orange-50 flex items-center justify-center text-[#FF3D00] shadow-inner">
                        <span className="material-symbols-outlined text-5xl">edit_square</span>
                     </div>
                     <div className="space-y-4">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">Borrador en pausa</h3>
                        <p className="text-sm text-slate-500 max-w-xs mx-auto font-medium">Este mensaje no ha sido enviado. Puedes continuar redactándolo ahora mismo.</p>
                     </div>
                     <button 
                        onClick={() => router.push(`/compose?id=${selectedId}`)}
                        className="bg-[#FF3D00] text-white text-[11px] font-black uppercase tracking-widest px-10 py-4 rounded-2xl shadow-xl shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all"
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
      className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all active:scale-90"
    >
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
    </button>
  );
}
