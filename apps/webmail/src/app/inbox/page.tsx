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
      subtitle="Terminal de comunicaciones cifradas de Odisea Cloud."
    >
      <div className="grid gap-6 xl:grid-cols-[220px_minmax(320px,400px)_minmax(0,1fr)]">
        {/* Folders */}
        <section className="bg-[#0A1221]/40 backdrop-blur-xl border border-white/5 rounded-3xl p-4 space-y-4">
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 ml-1">Carpetas</div>
          <div className="space-y-1">
            {folders.map((item) => (
              <button
                key={item.folder}
                type="button"
                onClick={() => setFolder(item.folder)}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest transition-all ${
                  item.folder === folder
                    ? "bg-primary/10 text-primary"
                    : "text-zinc-500 hover:text-white hover:bg-white/[0.03]"
                }`}
              >
                <span>{item.label}</span>
                <span className={`text-[9px] font-mono ${item.folder === folder ? 'text-primary' : 'text-zinc-700'}`}>{item.count}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Message List */}
        <section className="bg-[#0A1221]/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden flex flex-col h-[72vh]">
          <div className="border-b border-white/5 p-4 bg-white/[0.01]">
            <div className="flex items-center justify-between gap-4">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
                {folder}
              </div>
              <Link
                href="/compose"
                className="kinetic-gradient px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-primary/20"
              >
                + Redactar
              </Link>
            </div>
          </div>

          <div className="flex-1 overflow-auto divide-y divide-white/5">
            {loading ? (
              <div className="p-12 text-center">
                 <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
                 <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Sincronizando...</span>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-400 text-[10px] font-black uppercase tracking-widest">{error}</div>
            ) : messages.length === 0 ? (
              <div className="p-8 text-center text-zinc-700 italic text-[11px]">Buzón vacío</div>
            ) : (
              messages.map((message) => (
                <button
                  key={message.id}
                  type="button"
                  onClick={() => setSelectedId(message.id)}
                  className={`w-full p-4 text-left transition-all relative group ${
                    selectedMessage?.id === message.id ? "bg-primary/[0.03]" : "hover:bg-white/[0.01]"
                  }`}
                >
                  {selectedMessage?.id === message.id && <div className="absolute inset-y-0 left-0 w-1 bg-primary"></div>}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {!message.read && <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_#00A3FF]"></div>}
                        <span className={`truncate text-[10px] font-black uppercase tracking-tight ${message.read ? 'text-zinc-600' : 'text-zinc-200'}`}>
                          {message.from}
                        </span>
                      </div>
                      <div className="mt-1.5 truncate text-sm font-bold text-white tracking-tight group-hover:text-primary transition-colors">{message.subject}</div>
                      <div className="mt-1 truncate text-[11px] text-zinc-600 line-clamp-1">{message.preview}</div>
                    </div>
                    <div className="shrink-0 text-[9px] font-mono font-bold text-zinc-700 uppercase">
                      {message.receivedAt}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        {/* Message Pane */}
        <section className="bg-[#0A1221]/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden h-[72vh] flex flex-col">
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
            <div className="flex-1 flex flex-col items-center justify-center p-10 opacity-20">
               <span className="material-symbols-outlined text-6xl mb-4">mail</span>
               <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 text-center">Selecciona un terminal para visualizar</div>
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
      <div className="border-b border-white/5 p-6 bg-white/[0.01]">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
               <span className="px-1.5 py-0.5 bg-white/5 text-zinc-500 text-[8px] font-black uppercase rounded border border-white/5 tracking-tighter">Lectura en curso</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight leading-tight">{summary.subject}</h2>
            <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-zinc-500">
              <span className="text-primary">{summary.fromAddress}</span>
              <span>→</span>
              <span className="text-zinc-600">{me?.address}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onToggleRead} className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-zinc-500 hover:text-primary transition-all" title={summary.read ? "Marcar como no leído" : "Marcar como leído"}>
              <span className="material-symbols-outlined text-[18px]">{summary.read ? "mark_email_unread" : "drafts"}</span>
            </button>
            <button type="button" onClick={onToggleStar} className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-zinc-500 hover:text-amber-400 transition-all" title="Destacar">
              <span className="material-symbols-outlined text-[18px]">{summary.starred ? "star" : "star_outline"}</span>
            </button>
            <button type="button" onClick={onTrash} className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-zinc-500 hover:text-red-500 transition-all" title="Eliminar">
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <article className="bg-[#02060C]/40 border border-white/5 rounded-2xl p-6 text-sm leading-relaxed text-zinc-300 font-medium whitespace-pre-line shadow-inner">
          {message?.body ?? (
            <div className="flex items-center gap-3 opacity-40">
               <div className="w-4 h-4 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin"></div>
               <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando contenido...</span>
            </div>
          )}
        </article>
      </div>
    </>
  );
}
