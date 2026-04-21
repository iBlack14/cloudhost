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
  setMailStar
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
      title="Inbox"
      subtitle="Tu bandeja vive en el webmail independiente y usa una sesión distinta al panel ODIN."
    >
      <div className="grid gap-6 xl:grid-cols-[240px_minmax(320px,420px)_minmax(0,1fr)]">
        <section className="glass-card p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Folders</div>
          <div className="mt-4 space-y-2">
            {folders.map((item) => (
              <button
                key={item.folder}
                type="button"
                onClick={() => setFolder(item.folder)}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-black uppercase tracking-[0.14em] transition-all ${
                  item.folder === folder
                    ? "border-primary/20 bg-primary/10 text-primary"
                    : "border-white/10 bg-white/[0.03] text-zinc-300 hover:text-white"
                }`}
              >
                <span>{item.label}</span>
                <span className="text-[10px]">{item.count}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="glass-card overflow-hidden">
          <div className="border-b border-white/5 px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                {folder}
              </div>
              <Link
                href="/compose"
                className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-primary"
              >
                + Compose
              </Link>
            </div>
          </div>

          <div className="max-h-[72vh] overflow-auto">
            {loading ? (
              <div className="p-8 text-center text-zinc-500">Cargando bandeja...</div>
            ) : error ? (
              <div className="p-8 text-center text-rose-200">{error}</div>
            ) : messages.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">No hay mensajes en esta carpeta.</div>
            ) : (
              messages.map((message) => (
                <button
                  key={message.id}
                  type="button"
                  onClick={() => setSelectedId(message.id)}
                  className={`w-full border-b border-white/5 px-5 py-4 text-left transition-all ${
                    selectedMessage?.id === message.id ? "bg-primary/10" : "hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${message.read ? "text-zinc-600" : "text-primary"}`}>●</span>
                        <span className="truncate text-sm font-black uppercase tracking-[0.12em] text-zinc-200">
                          {message.from}
                        </span>
                      </div>
                      <div className="mt-2 truncate text-base font-headline font-black text-white">{message.subject}</div>
                      <div className="mt-2 truncate text-sm text-zinc-500">{message.preview}</div>
                    </div>
                    <div className="shrink-0 text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500">
                      {message.receivedAt}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="glass-card min-h-[72vh] overflow-hidden">
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
            <div className="p-10 text-center text-zinc-500">Selecciona un mensaje para abrirlo.</div>
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
  const router = useRouter();
  const [message, setMessage] = useState<MailMessageDetail | null>(null);

  useEffect(() => {
    fetch(`/mail/api/messages/${summary.id}`, { credentials: "include" })
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
      <div className="border-b border-white/5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Reading pane</div>
            <div className="mt-3 text-3xl font-headline font-black text-white">{summary.subject}</div>
            <div className="mt-3 text-sm text-zinc-400">
              {summary.fromAddress} → {me?.address}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onToggleRead} className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-zinc-300">
              <span className="material-symbols-outlined text-[18px]">{summary.read ? "mark_email_unread" : "drafts"}</span>
            </button>
            <button type="button" onClick={onToggleStar} className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-zinc-300">
              <span className="material-symbols-outlined text-[18px]">{summary.starred ? "star" : "star_outline"}</span>
            </button>
            <button type="button" onClick={onTrash} className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-zinc-300">
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
            <button
              type="button"
              onClick={() => router.push(`/message/${summary.id}`)}
              className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-primary"
            >
              Open page
            </button>
          </div>
        </div>
      </div>
      <div className="p-6">
        <article className="rounded-3xl border border-white/8 bg-white/[0.03] p-6 whitespace-pre-line text-[15px] leading-8 text-zinc-300">
          {message?.body ?? "Cargando mensaje..."}
        </article>
      </div>
    </>
  );
}
