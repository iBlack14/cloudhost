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

export default function SentPage() {
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
      fetchMailMessages("SENT")
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
        setError(reason instanceof Error ? reason.message : "No se pudo cargar los enviados.");
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
      title="Enviados"
      subtitle="Historial de Comunicaciones"
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
             {/* Filter Chips (Gmail style) */}
             {!selectedId && (
               <div className="flex px-6 py-3 gap-3 border-b border-slate-50 bg-white overflow-x-auto scrollbar-hide">
                  <FilterChip label="Cualquier momento" />
                  <FilterChip label="Contiene archivos adjuntos" />
                  <FilterChip label="Para" hasDropdown />
                  <button className="text-[11px] font-black text-[#00A3FF] uppercase tracking-widest ml-auto">Búsqueda avanzada</button>
               </div>
             )}

             <div className="flex-1 overflow-y-auto custom-scrollbar">
                {loading ? (
                  <div className="p-24 flex flex-col items-center gap-4 opacity-30">
                    <div className="w-8 h-8 border-4 border-slate-100 border-t-[#00A3FF] rounded-full animate-spin"></div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Escaneando Enviados...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="p-32 text-center flex flex-col items-center">
                     <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                        <span className="material-symbols-outlined text-4xl text-slate-200">send</span>
                     </div>
                     <div className="text-slate-400 text-sm font-medium">No hay mensajes enviados.</div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      onClick={() => setSelectedId(message.id)}
                      className={`
                        group flex items-center px-4 py-3 border-b border-slate-50 cursor-pointer transition-all relative
                        ${selectedId === message.id ? "bg-[#00A3FF]/5 z-10" : "hover:bg-slate-50 hover:shadow-md hover:z-10"}
                        bg-white
                      `}
                    >
                      <div className="flex items-center gap-3 shrink-0 mr-4">
                        <span className="material-symbols-outlined text-slate-300 text-[20px] hover:text-slate-500">check_box_outline_blank</span>
                        <span 
                          onClick={(e) => { e.stopPropagation(); toggleStar(message); }}
                          className={`material-symbols-outlined text-[20px] transition-colors ${message.starred ? "text-amber-400 font-variation-fill" : "text-slate-300 hover:text-slate-500"}`}
                        >
                          {message.starred ? "star" : "star_outline"}
                        </span>
                      </div>

                      <div className="w-48 shrink-0 text-sm truncate mr-4 text-slate-700 font-medium flex items-center gap-2">
                         <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Para:</span>
                         <span className="truncate">{message.to ?? message.toAddress ?? 'admin'}</span>
                      </div>

                      <div className="flex-1 min-w-0 flex items-baseline gap-2">
                         <span className="text-sm truncate font-black text-slate-900">
                           {message.subject}
                         </span>
                         <span className="text-sm text-slate-400 truncate font-medium">
                           - {message.preview}
                         </span>
                      </div>

                      <div className="shrink-0 ml-4 text-[11px] font-bold uppercase tracking-tight text-slate-400">
                         {message.receivedAt}
                      </div>

                      {/* Hover Actions */}
                      <div className="absolute right-4 inset-y-0 flex items-center gap-1 bg-inherit px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <ToolbarIcon icon="archive" />
                         <ToolbarIcon icon="delete" onClick={(e) => { e.stopPropagation(); trashMessage(message); }} />
                         <ToolbarIcon icon="schedule" />
                      </div>
                    </div>
                  ))
                )}
             </div>
          </section>

          {/* Integrated Reading Pane */}
          {selectedId && (
            <section className="flex-1 bg-white flex flex-col min-w-0 overflow-hidden">
               <MessagePane
                 key={selectedMessage?.id}
                 me={me}
                 summary={selectedMessage!}
                 onClose={() => setSelectedId(null)}
                 onTrash={() => selectedMessage && trashMessage(selectedMessage)}
               />
            </section>
          )}
        </div>
      </div>
    </MailShell>
  );
}

function MessagePane({
  me,
  summary,
  onClose,
  onTrash
}: {
  me: MailIdentity | null;
  summary: MailMessageSummary;
  onClose: () => void;
  onTrash: () => void;
}) {
  const [message, setMessage] = useState<MailMessageDetail | null>(null);

  useEffect(() => {
    fetch(`${MAIL_BASE_PATH}/api/messages/${summary.id}`, { credentials: "include" })
      .then((response) => response.json())
      .then((payload) => {
        if (!payload.success) {
          throw new Error(payload?.error?.message ?? "No se pudo abrir el mensaje.");
        }
        setMessage(payload.data);
      })
      .catch(() => setMessage(null));
  }, [summary.id]);

  return (
    <div className="flex flex-col h-full bg-white">
       {/* Toolbar */}
       <div className="h-14 border-b border-slate-100 flex items-center px-6 gap-6 shrink-0">
          <ToolbarIcon icon="arrow_back" onClick={onClose} />
          <div className="h-6 w-px bg-slate-100 mx-2"></div>
          <ToolbarIcon icon="archive" />
          <ToolbarIcon icon="report" />
          <ToolbarIcon icon="delete" onClick={onTrash} />
          <div className="h-6 w-px bg-slate-100 mx-2"></div>
          <ToolbarIcon icon="schedule" />
          <ToolbarIcon icon="more_vert" />
       </div>

       <div className="flex-1 overflow-y-auto p-12 lg:p-20 custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-12">
             <div className="flex items-start justify-between">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight uppercase italic">{summary.subject}</h2>
                <div className="flex items-center gap-2">
                   <ToolbarIcon icon="print" />
                   <ToolbarIcon icon="open_in_new" />
                </div>
             </div>

             <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#00A3FF] text-white flex items-center justify-center font-black text-xl shadow-lg shadow-[#00A3FF]/20">
                   {me?.address?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                   <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                         <span className="text-lg font-black text-slate-900">{me?.address}</span>
                         <span className="text-xs text-slate-400 font-bold tracking-tight">&lt;{me?.address}&gt;</span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{summary.receivedAt}</div>
                   </div>
                   <div className="text-[11px] font-medium text-slate-400">
                      para <span className="text-slate-900 font-black">{summary.toAddress}</span>
                   </div>
                </div>
             </div>

             <div className="text-slate-700 text-lg leading-[1.8] font-medium whitespace-pre-line border-t border-slate-50 pt-12">
                {message?.body ? (
                   <div className="animate-in fade-in duration-700">{message.body}</div>
                ) : (
                  <div className="flex items-center gap-4 text-slate-300">
                    <div className="w-5 h-5 border-2 border-slate-100 border-t-[#00A3FF] rounded-full animate-spin"></div>
                    <span className="text-[11px] font-black uppercase tracking-widest">Cargando mensaje enviado...</span>
                  </div>
                )}
             </div>
          </div>
       </div>
    </div>
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

function FilterChip({ label, hasDropdown }: { label: string; hasDropdown?: boolean }) {
  return (
    <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition-all whitespace-nowrap">
       {label}
       {hasDropdown && <span className="material-symbols-outlined text-[16px]">arrow_drop_down</span>}
    </button>
  );
}
