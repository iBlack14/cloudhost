"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
      title="Bandeja de Entrada"
      subtitle="Comunicaciones seguras y cifradas de Odisea Cloud."
    >
      <div className="grid gap-8 xl:grid-cols-[240px_minmax(350px,450px)_minmax(0,1fr)]">
        {/* Folders */}
        <section className="bg-white border border-slate-200 rounded-[2rem] p-6 space-y-6 shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Directorios</div>
          <div className="space-y-1.5">
            {folders.map((item) => (
              <button
                key={item.folder}
                type="button"
                onClick={() => setFolder(item.folder)}
                className={`flex w-full items-center justify-between rounded-xl px-5 py-3 text-left text-[11px] font-bold uppercase tracking-widest transition-all ${
                  item.folder === folder
                    ? "bg-[#00A3FF]/5 text-[#00A3FF] border-l-4 border-[#00A3FF]"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <span>{item.label}</span>
                <span className={`text-[10px] font-black ${item.folder === folder ? 'text-[#00A3FF]' : 'text-slate-300'}`}>{item.count}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Message List */}
        <section className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden flex flex-col h-[75vh] shadow-sm relative">
          <div className="border-b border-slate-100 p-6 bg-slate-50/30">
            <div className="flex items-center justify-between gap-4">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00A3FF]">
                {folder}
              </div>
              <Link
                href="/compose"
                className="bg-[#00A3FF] px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-[#00A3FF]/20 hover:bg-[#008EE0] transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Redactar
              </Link>
            </div>
          </div>

          <div className="flex-1 overflow-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-20 text-center flex flex-col items-center gap-4">
                 <div className="w-8 h-8 border-4 border-[#00A3FF]/20 border-t-[#00A3FF] rounded-full animate-spin"></div>
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sincronizando...</span>
              </div>
            ) : error ? (
              <div className="p-12 text-center text-red-500 text-[11px] font-black uppercase tracking-widest">{error}</div>
            ) : messages.length === 0 ? (
              <div className="p-20 text-center flex flex-col items-center opacity-30">
                 <span className="material-symbols-outlined text-4xl mb-3 text-slate-400">inbox</span>
                 <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Buzón vacío</span>
              </div>
            ) : (
              messages.map((message) => (
                <button
                  key={message.id}
                  type="button"
                  onClick={() => setSelectedId(message.id)}
                  className={`w-full p-6 text-left transition-all relative group border-l-4 ${
                    selectedId === message.id 
                    ? "bg-[#00A3FF]/5 border-[#00A3FF]" 
                    : "hover:bg-slate-50 border-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {!message.read && <div className="w-2 h-2 rounded-full bg-[#00A3FF] shadow-[0_0_8px_rgba(0,163,255,0.4)]"></div>}
                        <span className={`truncate text-[11px] font-black uppercase tracking-tight ${message.read ? 'text-slate-400' : 'text-[#00A3FF]'}`}>
                          {message.from}
                        </span>
                      </div>
                      <div className="truncate text-[15px] font-black text-slate-900 tracking-tight leading-tight group-hover:text-[#00A3FF] transition-colors mb-1">{message.subject}</div>
                      <div className="truncate text-xs text-slate-400 line-clamp-1 font-medium">{message.preview}</div>
                    </div>
                    <div className="shrink-0 text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
                      {message.receivedAt}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        {/* Message Pane */}
        <section className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden h-[75vh] flex flex-col shadow-sm">
          {selectedMessage ? (
            <MessagePane
              key={selectedMessage.id}
              me={me}
              summary={selectedMessage}
              onToggleRead={() => void toggleRead(selectedMessage)}
              onToggleStar={() => void toggleStar(selectedMessage)}
              onTrash={() => void trashMessage(selectedMessage)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-20 opacity-20">
               <div className="w-24 h-24 rounded-[2rem] bg-slate-100 flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-5xl text-slate-400">mail</span>
               </div>
               <div className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 text-center">Selecciona un mensaje para visualizar</div>
            </div>
          )}
        </section>
      </div>
    </MailShell>
  );
}

function MessagePane({
  me,
  summary,
  onToggleRead,
  onToggleStar,
  onTrash
}: {
  me: MailIdentity | null;
  summary: MailMessageSummary;
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
    <>
      <div className="border-b border-slate-100 p-8 bg-slate-50/30">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-4">
               <span className="px-3 py-1 bg-white border border-slate-200 text-slate-400 text-[9px] font-black uppercase rounded-full tracking-wider shadow-sm">Cifrado de Extremo a Extremo</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight mb-4">{summary.subject}</h2>
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-sm uppercase">
                  {summary.from?.charAt(0)}
               </div>
               <div className="flex flex-col">
                  <div className="text-xs font-black text-slate-900">{summary.from}</div>
                  <div className="text-[10px] font-bold text-slate-400 tracking-tight mt-0.5">
                    De: <span className="text-[#00A3FF]">{summary.fromAddress}</span> → Para: <span className="text-slate-500">{me?.address}</span>
                  </div>
               </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onToggleRead} className="w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#00A3FF] hover:border-[#00A3FF]/30 transition-all shadow-sm active:scale-95" title={summary.read ? "Marcar como no leído" : "Marcar como leído"}>
              <span className="material-symbols-outlined text-[20px]">{summary.read ? "mark_email_unread" : "drafts"}</span>
            </button>
            <button type="button" onClick={onToggleStar} className="w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-amber-500 hover:border-amber-500/30 transition-all shadow-sm active:scale-95" title="Destacar">
              <span className="material-symbols-outlined text-[20px]">{summary.starred ? "star" : "star_outline"}</span>
            </button>
            <button type="button" onClick={onTrash} className="w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-500/30 transition-all shadow-sm active:scale-95" title="Eliminar">
              <span className="material-symbols-outlined text-[20px]">delete</span>
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-10 bg-white relative">
        <article className="prose prose-slate max-w-none text-slate-700 text-base leading-relaxed font-medium whitespace-pre-line">
          {message?.body ? (
             <div className="animate-in fade-in duration-500">{message.body}</div>
          ) : (
            <div className="flex items-center gap-4 text-slate-300">
               <div className="w-5 h-5 border-2 border-slate-100 border-t-[#00A3FF] rounded-full animate-spin"></div>
               <span className="text-[11px] font-black uppercase tracking-[0.2em]">Desencriptando contenido...</span>
            </div>
          )}
        </article>
      </div>
    </>
  );
}
