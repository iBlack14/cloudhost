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
        setError(reason instanceof Error ? reason.message : "No se pudo cargar los enviados.");
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
      title="Enviados"
      subtitle="Historial de Comunicaciones"
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
             {/* Filter Chips (Gmail style) */}
             <div className="flex px-6 py-2.5 gap-2.5 border-b border-slate-50 bg-white overflow-x-auto scrollbar-hide">
                <FilterChip label="Cualquier momento" />
                <FilterChip label="Contiene archivos adjuntos" />
                <FilterChip label="Para" hasDropdown />
                <button className="text-xs font-semibold text-[#00A3FF] ml-auto whitespace-nowrap">Búsqueda avanzada</button>
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar">
                 {loading ? (
                   <div className="p-24 flex flex-col items-center gap-4 opacity-30">
                     <div className="w-7 h-7 border-[3px] border-slate-100 border-t-[#00A3FF] rounded-full animate-spin"></div>
                     <span className="text-xs font-medium text-slate-400">Escaneando Enviados...</span>
                   </div>
                 ) : messages.length === 0 ? (
                   <div className="p-32 text-center flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-5">
                         <span className="material-symbols-outlined text-3xl text-slate-200">send</span>
                      </div>
                      <div className="text-slate-400 text-sm font-medium">No hay mensajes enviados.</div>
                   </div>
                 ) : (
                   messages.map((message) => (
                     <div
                       key={message.id}
                       onClick={() => setSelectedId(message.id)}
                       className={`
                         group flex items-center px-4 py-2.5 border-b border-slate-50/80 cursor-pointer transition-all relative
                         ${selectedId === message.id ? "bg-[#00A3FF]/[0.06] border-l-2 border-l-[#00A3FF]" : "hover:bg-slate-50/70 border-l-2 border-l-transparent"}
                         bg-white
                       `}
                     >
                       <div className="flex items-center gap-2.5 shrink-0 mr-3">
                         <span className="material-symbols-outlined text-slate-300 text-[18px] hover:text-slate-500">check_box_outline_blank</span>
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
                             <span className="text-[13px] truncate font-normal text-slate-500 flex items-center gap-1.5">
                               <span className="text-[11px] text-slate-400">Para:</span>
                               {message.to?.[0] ?? 'admin'}
                             </span>
                             <span className="text-[11px] font-medium text-slate-400 shrink-0 ml-2">{message.receivedAt}</span>
                           </div>
                           <div className="text-[13px] truncate font-medium text-slate-700">{message.subject}</div>
                           <div className="text-xs text-slate-400 truncate mt-0.5 font-normal">{message.preview}</div>
                         </div>
                       ) : (
                         <>
                           <div className="w-48 shrink-0 text-[13px] truncate mr-4 text-slate-600 font-medium flex items-center gap-1.5">
                              <span className="text-[11px] text-slate-400">Para:</span>
                              <span className="truncate">{message.to?.[0] ?? 'admin'}</span>
                           </div>

                           <div className="flex-1 min-w-0 flex items-baseline gap-1.5">
                              <span className="text-[13px] truncate font-medium text-slate-700">
                                {message.subject}
                              </span>
                              <span className="text-[13px] text-slate-400 truncate font-normal">
                                — {message.preview}
                              </span>
                           </div>

                           <div className="shrink-0 ml-4 text-xs font-medium text-slate-400">
                              {message.receivedAt}
                           </div>
                         </>
                       )}

                       {/* Hover Actions */}
                       <div className="absolute right-3 inset-y-0 flex items-center gap-0.5 bg-inherit px-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ToolbarIcon icon="archive" />
                          <ToolbarIcon icon="delete" onClick={(e) => { e.stopPropagation(); trashMessage(message); }} />
                          <ToolbarIcon icon="schedule" />
                       </div>
                     </div>
                   ))
                 )}
              </div>
          </section>

          {/* Inline Reading Pane */}
          {selectedId && selectedMessage && (
            <section className="flex-1 min-w-0 bg-white flex flex-col animate-in slide-in-from-right-5 duration-200">
              <MessagePane
                key={selectedMessage.id}
                me={me}
                summary={selectedMessage}
                onClose={() => setSelectedId(null)}
                onTrash={() => trashMessage(selectedMessage)}
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
       <div className="h-12 border-b border-slate-100 flex items-center px-5 gap-4 shrink-0">
          <ToolbarIcon icon="arrow_back" onClick={onClose} />
          <div className="h-5 w-px bg-slate-100"></div>
          <ToolbarIcon icon="archive" />
          <ToolbarIcon icon="report" />
          <ToolbarIcon icon="delete" onClick={onTrash} />
          <div className="h-5 w-px bg-slate-100"></div>
          <ToolbarIcon icon="schedule" />
          <ToolbarIcon icon="more_vert" />
          <div className="ml-auto flex items-center gap-1">
             <ToolbarIcon icon="print" />
             <ToolbarIcon icon="open_in_new" />
          </div>
       </div>

       <div className="flex-1 overflow-y-auto p-8 lg:p-10 custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-8">
             <h2 className="text-2xl font-bold text-slate-900 leading-snug">{summary.subject}</h2>

             <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00A3FF] to-[#0066CC] text-white flex items-center justify-center font-semibold text-sm shadow-md shadow-[#00A3FF]/20">
                   {me?.address?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                   <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                         <span className="text-sm font-semibold text-slate-900">{me?.address}</span>
                         <span className="text-xs text-slate-400 truncate">&lt;{me?.address}&gt;</span>
                      </div>
                      <div className="text-xs font-medium text-slate-400 shrink-0 ml-4">{summary.receivedAt}</div>
                   </div>
                   <div className="text-xs text-slate-400">
                      para <span className="text-slate-600 font-medium">{summary.to?.[0]}</span>
                   </div>
                </div>
             </div>

             <div className="text-slate-700 text-[15px] leading-[1.8] whitespace-pre-line border-t border-slate-100 pt-8">
                {message?.body ? (
                   <div className="animate-in fade-in duration-500">{message.body}</div>
                ) : (
                  <div className="flex items-center gap-3 text-slate-300">
                    <div className="w-4 h-4 border-2 border-slate-200 border-t-[#00A3FF] rounded-full animate-spin"></div>
                    <span className="text-xs font-medium text-slate-400">Cargando mensaje enviado...</span>
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
      className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all active:scale-95"
    >
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
    </button>
  );
}

function FilterChip({ label, hasDropdown }: { label: string; hasDropdown?: boolean }) {
  return (
    <button className="flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-50 transition-all whitespace-nowrap">
       {label}
       {hasDropdown && <span className="material-symbols-outlined text-[16px]">arrow_drop_down</span>}
    </button>
  );
}
