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

export default function TrashPage() {
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
      fetchMailMessages("TRASH")
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
        setError(reason instanceof Error ? reason.message : "No se pudo cargar la papelera.");
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

  const restoreMessage = async (message: MailMessageSummary) => {
    await moveMailMessage(message.id, "INBOX");
    await loadAll();
  };

  return (
    <MailShell
      me={me}
      title="Papelera"
      subtitle="Mensajes Eliminados"
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

        {/* Trash Warning Banner */}
        <div className="bg-slate-50 border-b border-slate-100 px-10 py-3 text-center flex items-center justify-center gap-4">
           <span className="text-[11px] font-medium text-slate-500 italic">Los mensajes que hayan estado en la Papelera durante más de 30 días se borrarán automáticamente.</span>
           <button className="text-[11px] font-black text-[#00A3FF] uppercase tracking-widest hover:underline">Vaciar Papelera ahora</button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Message List */}
          <section className="flex flex-col w-full bg-white">
             <div className="flex-1 overflow-y-auto custom-scrollbar">
                 {loading ? (
                   <div className="p-24 flex flex-col items-center gap-4 opacity-30">
                     <div className="w-8 h-8 border-4 border-slate-100 border-t-[#00A3FF] rounded-full animate-spin"></div>
                     <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Recuperando Papelera...</span>
                   </div>
                 ) : messages.length === 0 ? (
                   <div className="p-32 text-center flex flex-col items-center opacity-40">
                      <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-6 border border-slate-100">
                         <span className="material-symbols-outlined text-4xl text-slate-300">delete</span>
                      </div>
                      <div className="text-slate-500 text-sm font-medium">No hay conversaciones en la Papelera.</div>
                   </div>
                 ) : (
                   messages.map((message) => (
                     <div
                       key={message.id}
                       onClick={() => setSelectedId(message.id)}
                       className={`
                         group flex items-center px-4 py-3 border-b border-slate-50 cursor-pointer transition-all relative
                         ${selectedId === message.id ? "bg-slate-100 z-10" : "hover:bg-slate-50 hover:shadow-sm hover:z-10"}
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

                       <div className="w-48 shrink-0 text-sm truncate mr-4 text-slate-500 font-medium italic opacity-70">
                          {message.from}
                       </div>

                       <div className="flex-1 min-w-0 flex items-baseline gap-2">
                          <span className="text-sm truncate font-bold text-slate-600 line-through decoration-slate-300">
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
                          <ToolbarIcon icon="restore_from_trash" onClick={(e) => { e.stopPropagation(); restoreMessage(message); }} />
                          <ToolbarIcon icon="delete_forever" />
                       </div>
                     </div>
                   ))
                 )}
              </div>
          </section>

          {/* Message Details Modal Window */}
          {selectedId && selectedMessage && (
            <div 
              onClick={() => setSelectedId(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200"
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full max-w-5xl h-[85vh] rounded-[2rem] shadow-[0_32px_128px_rgba(0,163,255,0.15)] border border-slate-200/50 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
              >
                <MessagePane
                  key={selectedMessage.id}
                  me={me}
                  summary={selectedMessage}
                  onClose={() => setSelectedId(null)}
                  onRestore={() => restoreMessage(selectedMessage)}
                />
              </div>
            </div>
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
  onRestore
}: {
  me: MailIdentity | null;
  summary: MailMessageSummary;
  onClose: () => void;
  onRestore: () => void;
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
          <ToolbarIcon icon="restore_from_trash" onClick={onRestore} />
          <ToolbarIcon icon="delete_forever" />
          <div className="h-6 w-px bg-slate-100 mx-2"></div>
          <ToolbarIcon icon="report" />
          <ToolbarIcon icon="more_vert" />
          <div className="ml-auto">
             <ToolbarIcon icon="close" onClick={onClose} />
          </div>
       </div>

       <div className="flex-1 overflow-y-auto p-12 lg:p-20 custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-10">
             <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl flex items-center justify-between mb-8">
                <div className="flex items-center gap-4 text-slate-500">
                   <span className="material-symbols-outlined">info</span>
                   <span className="text-xs font-bold uppercase tracking-wider">Este mensaje está en la papelera</span>
                </div>
                <button onClick={onRestore} className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl hover:bg-slate-800 transition-all">Restaurar ahora</button>
             </div>

             <div className="flex items-start justify-between">
                <h2 className="text-4xl font-black text-slate-400 tracking-tight leading-tight uppercase italic line-through decoration-slate-200">{summary.subject}</h2>
             </div>

             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center font-black text-lg">
                   {summary.from?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                   <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                         <span className="text-base font-black text-slate-500">{summary.from}</span>
                         <span className="text-xs text-slate-300 font-bold tracking-tight">&lt;{summary.fromAddress}&gt;</span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{summary.receivedAt}</div>
                   </div>
                   <div className="text-[10px] font-medium text-slate-400">
                      para <span className="text-slate-500 font-black">{me?.address}</span>
                   </div>
                </div>
             </div>

             <div className="text-slate-400 text-lg leading-[1.8] font-medium whitespace-pre-line border-t border-slate-50 pt-10 italic">
                {message?.body ? (
                   <div className="animate-in fade-in duration-700 opacity-60">{message.body}</div>
                ) : (
                  <div className="flex items-center gap-4 text-slate-200">
                    <div className="w-5 h-5 border-2 border-slate-100 border-t-slate-400 rounded-full animate-spin"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Cargando mensaje eliminado...</span>
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
