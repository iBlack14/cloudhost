"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { MailFolder, MailFolderSummary, MailIdentity, MailMessageDetail, MailMessageSummary } from "@odisea/types";

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

export default function InboxPage() {
  const router = useRouter();
  const [me, setMe] = useState<MailIdentity | null>(null);
  const [folders, setFolders] = useState<MailFolderSummary[]>([]);
  const [folder, setFolder] = useState<MailFolder>("INBOX");
  const [messages, setMessages] = useState<MailMessageSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("principal");

  const loadAll = async (nextFolder: MailFolder) => {
    const [identity, nextFolders, nextMessages] = await Promise.all([
      fetchMailMe(),
      fetchMailFolders(),
      fetchMailMessages(nextFolder)
    ]);

    setMe(identity);
    setFolders(nextFolders);
    setMessages(nextMessages);
    setSelectedId((current) => current && nextMessages.some((item) => item.id === current) ? current : nextMessages[0]?.id ?? null);
  };

  useEffect(() => {
    setLoading(true);
    loadAll(folder)
      .catch((reason) => {
        if (reason instanceof Error && reason.message.toLowerCase().includes("sesión")) {
          router.replace("/login");
          return;
        }
        setError(reason instanceof Error ? reason.message : "No se pudo cargar la bandeja.");
      })
      .finally(() => setLoading(false));
  }, [folder, router]);

  const selectedMessage = useMemo<MailMessageSummary | null>(
    () => messages.find((item) => item.id === selectedId) ?? messages[0] ?? null,
    [messages, selectedId]
  );

  const toggleRead = async (message: MailMessageSummary) => {
    await setMailRead(message.id, !message.read);
    await loadAll(folder);
  };

  const toggleStar = async (message: MailMessageSummary) => {
    await setMailStar(message.id, !message.starred);
    await loadAll(folder);
  };

  const trashMessage = async (message: MailMessageSummary) => {
    await moveMailMessage(message.id, "TRASH");
    await loadAll(folder);
  };

  return (
    <MailShell
      me={me}
      title={folder === 'INBOX' ? 'Recibidos' : folder}
      subtitle="Buzón Corporativo"
      folders={folders}
    >
      <div className="flex h-full w-full overflow-hidden flex-col">
        
        {/* 1. Gmail-Style Toolbar */}
        <div className="h-14 border-b border-slate-100 flex items-center px-6 justify-between shrink-0 bg-white z-20">
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-1">
                 <ToolbarIcon icon="check_box_outline_blank" />
                 <ToolbarIcon icon="arrow_drop_down" />
              </div>
              <ToolbarIcon icon="refresh" onClick={() => loadAll(folder)} />
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
          {/* 2. Message List with Tabs */}
          <section className={`
            flex flex-col border-r border-slate-100 transition-all duration-500 bg-white
            ${selectedId ? "w-[450px] 2xl:w-[550px]" : "w-full"}
          `}>
             {/* Tabs Header */}
             {!selectedId && (
               <div className="flex px-4 border-b border-slate-100 bg-white">
                  <MailTab icon="inbox" label="Principal" active={activeTab === 'principal'} onClick={() => setActiveTab('principal')} color="blue" />
                  <MailTab icon="sell" label="Promociones" active={activeTab === 'promo'} onClick={() => setActiveTab('promo')} color="green" badge="4 nuevas" />
                  <MailTab icon="group" label="Social" active={activeTab === 'social'} onClick={() => setActiveTab('social')} color="blue-light" />
               </div>
             )}

             <div className="flex-1 overflow-y-auto custom-scrollbar">
                {loading ? (
                  <div className="p-24 flex flex-col items-center gap-4 opacity-30">
                    <div className="w-8 h-8 border-4 border-slate-100 border-t-[#00A3FF] rounded-full animate-spin"></div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Sincronizando...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="p-20 text-center text-slate-400 text-sm font-medium">Buzón vacío.</div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      onClick={async () => {
                        setSelectedId(message.id);
                        if (!message.read) {
                          try {
                            await setMailRead(message.id, true);
                            await loadAll(folder);
                          } catch (err) {
                            console.error("Failed to mark message as read:", err);
                          }
                        }
                      }}
                      className={`
                        group flex items-center px-4 py-3 border-b border-slate-50 cursor-pointer transition-all relative
                        ${selectedId === message.id ? "bg-[#00A3FF]/5 z-10" : "hover:bg-slate-50 hover:shadow-md hover:z-10"}
                        ${!message.read ? "bg-white" : "bg-slate-50/40"}
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

                      <div className={`w-48 shrink-0 text-sm truncate mr-4 ${!message.read ? "font-bold text-slate-900" : "font-normal text-slate-500"}`}>
                         {message.from}
                      </div>

                      <div className="flex-1 min-w-0 flex items-baseline gap-2">
                         <span className={`text-sm truncate ${!message.read ? "font-bold text-slate-900" : "font-normal text-slate-700"}`}>
                           {message.subject}
                         </span>
                         <span className="text-sm text-slate-400 truncate font-medium">
                           - {message.preview}
                         </span>
                      </div>

                      <div className={`shrink-0 ml-4 text-[11px] font-bold uppercase tracking-tight ${!message.read ? "text-slate-900" : "text-slate-400"}`}>
                         {message.receivedAt}
                      </div>

                      {/* Hover Actions */}
                      <div className="absolute right-4 inset-y-0 flex items-center gap-1 bg-inherit px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <ToolbarIcon icon="archive" />
                         <ToolbarIcon icon="delete" onClick={(e) => { e.stopPropagation(); trashMessage(message); }} />
                         <ToolbarIcon icon="mark_email_read" onClick={(e) => { e.stopPropagation(); toggleRead(message); }} />
                      </div>
                    </div>
                  ))
                )}
             </div>
          </section>

          {/* 3. Integrated Reading Pane */}
          {selectedId && (
            <section className="flex-1 bg-white flex flex-col min-w-0 overflow-hidden">
               <MessagePane
                 key={selectedMessage?.id}
                 me={me}
                 summary={selectedMessage!}
                 onClose={() => setSelectedId(null)}
                 onToggleRead={() => selectedMessage && toggleRead(selectedMessage)}
                 onToggleStar={() => selectedMessage && toggleStar(selectedMessage)}
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
  onToggleRead,
  onToggleStar,
  onTrash
}: {
  me: MailIdentity | null;
  summary: MailMessageSummary;
  onClose: () => void;
  onToggleRead: () => void;
  onToggleStar: () => void;
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
       {/* Message Header Toolbar */}
       <div className="h-14 border-b border-slate-100 flex items-center px-6 gap-6 shrink-0">
          <ToolbarIcon icon="arrow_back" onClick={onClose} />
          <div className="h-6 w-px bg-slate-100 mx-2"></div>
          <ToolbarIcon icon="archive" />
          <ToolbarIcon icon="report" />
          <ToolbarIcon icon="delete" onClick={onTrash} />
          <div className="h-6 w-px bg-slate-100 mx-2"></div>
          <ToolbarIcon icon="mark_email_unread" onClick={onToggleRead} />
          <ToolbarIcon icon="drive_file_move" />
          <ToolbarIcon icon="label" />
          <ToolbarIcon icon="more_vert" />
       </div>

       <div className="flex-1 overflow-y-auto p-10 lg:p-14 custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-10">
             <div className="flex items-start justify-between">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight uppercase italic">{summary.subject}</h2>
                <div className="flex items-center gap-2">
                   <ToolbarIcon icon="print" />
                   <ToolbarIcon icon="open_in_new" />
                </div>
             </div>

             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-lg">
                   {summary.from?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                   <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                         <span className="text-base font-black text-slate-900">{summary.from}</span>
                         <span className="text-xs text-slate-400 font-bold tracking-tight">&lt;{summary.fromAddress}&gt;</span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{summary.receivedAt}</div>
                   </div>
                   <div className="text-[10px] font-medium text-slate-400">
                      para <span className="text-slate-900 font-black">{me?.address}</span>
                   </div>
                </div>
             </div>

             <div className="text-slate-700 text-lg leading-[1.8] font-medium whitespace-pre-line border-t border-slate-50 pt-10">
                {message?.body ? (
                   <div className="animate-in fade-in duration-700">{message.body}</div>
                ) : (
                  <div className="flex items-center gap-4 text-slate-300">
                    <div className="w-5 h-5 border-2 border-slate-100 border-t-[#00A3FF] rounded-full animate-spin"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Cargando contenido...</span>
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

function MailTab({ icon, label, active, color, badge, onClick }: { icon: string; label: string; active: boolean; color: string; badge?: string; onClick: () => void }) {
  const colors: Record<string, string> = {
    blue: active ? "text-[#00A3FF] border-[#00A3FF]" : "text-slate-500 hover:bg-slate-50",
    green: active ? "text-emerald-500 border-emerald-500" : "text-slate-500 hover:bg-slate-50",
    'blue-light': active ? "text-sky-400 border-sky-400" : "text-slate-500 hover:bg-slate-50"
  };

  return (
    <button 
      onClick={onClick}
      className={`
        flex items-center gap-4 px-6 py-4 border-b-4 transition-all shrink-0
        ${colors[color]}
        ${!active && "border-transparent"}
      `}
    >
       <span className="material-symbols-outlined text-[20px]">{icon}</span>
       <div className="flex flex-col items-start">
          <span className={`text-sm tracking-tight ${active ? "font-black" : "font-bold"}`}>{label}</span>
          {badge && <span className={`text-[9px] font-black uppercase tracking-widest ${active ? "opacity-100" : "opacity-0"}`}>{badge}</span>}
       </div>
    </button>
  );
}

function getFolderIcon(folder: MailFolder): string {
  switch(folder) {
    case 'INBOX': return 'inbox';
    case 'SENT': return 'send';
    case 'TRASH': return 'delete';
    case 'DRAFTS': return 'drafts';
    case 'SPAM': return 'verified_user';
    default: return 'folder';
  }
}
