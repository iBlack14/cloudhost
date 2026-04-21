"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import type { EmailMailboxMessage } from "../../../../../../lib/email";
import {
  useEmailAccount,
  useMailboxMessages
} from "../../../../../../lib/hooks/use-email-accounts";
import { EmailBreadcrumbs } from "../../../../../../components/email/EmailUI";

const tagStyles: Record<EmailMailboxMessage["tag"], string> = {
  system: "border-primary/20 bg-primary/10 text-primary",
  client: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  security: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  billing: "border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-300"
};

export default function MailboxPage() {
  const params = useParams<{ accountId: string }>();
  const accountId = typeof params?.accountId === "string" ? params.accountId : "";
  const { data: account, isLoading: loadingAccount, isError } = useEmailAccount(accountId);
  const { data: messages = [], isLoading: loadingMessages } = useMailboxMessages(accountId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return messages.filter((message) =>
      term.length === 0
        ? true
        : message.subject.toLowerCase().includes(term) ||
          message.preview.toLowerCase().includes(term) ||
          message.from.toLowerCase().includes(term)
    );
  }, [messages, query]);

  const selectedMessage =
    filtered.find((message) => message.id === selectedId) ??
    filtered[0] ??
    null;

  React.useEffect(() => {
    if (!selectedId && filtered.length > 0) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  if (isError) {
    return (
      <div className="space-y-8">
        <EmailBreadcrumbs
          items={[
            { label: "Dashboard", href: "/" },
            { label: "Email", href: "/email/accounts" },
            { label: "Mailbox" }
          ]}
        />
        <div className="glass-card p-10 text-center space-y-4">
          <h1 className="text-3xl font-headline font-black text-white uppercase italic">Buzón no disponible</h1>
          <p className="text-zinc-400">No pudimos resolver esa cuenta de correo.</p>
          <Link href="/email/accounts" className="inline-flex rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-primary">
            Volver a cuentas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <EmailBreadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Email", href: "/email/accounts" },
          { label: "Mailbox" }
        ]}
      />

      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
            Odisea Mail Workspace
          </div>
          <h1 className="text-4xl md:text-5xl font-headline font-black text-white uppercase italic tracking-tighter">
            {loadingAccount ? "Cargando buzón..." : account?.address}
          </h1>
          <p className="text-sm leading-6 text-zinc-400 max-w-3xl">
            Inbox interno del panel, con lectura rápida, categorías, búsqueda y panel de contexto. Se renderiza en el mismo frontend de ODIN sobre `:3003`; no es un portal separado.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button className="kinetic-gradient rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-primary/25">
            + Compose
          </button>
          <Link href="/email/accounts" className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-zinc-300">
            Volver
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[220px_minmax(320px,420px)_minmax(0,1fr)]">
        <aside className="glass-card p-5 space-y-5 h-fit">
          <MailboxNavItem icon="inbox" label="Inbox" count={filtered.length} active />
          <MailboxNavItem icon="star" label="Starred" count={messages.filter((item) => item.starred).length} />
          <MailboxNavItem icon="send" label="Sent" count={0} />
          <MailboxNavItem icon="draft" label="Drafts" count={2} />
          <MailboxNavItem icon="delete" label="Trash" count={0} />

          <div className="border-t border-white/5 pt-5 space-y-3">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Workspace notes</div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-xs leading-6 text-zinc-400">
              Este inbox ya resuelve el flujo visual de WebMail dentro de tu panel. Luego se puede conectar a almacenamiento real, login delegado y acciones SMTP/IMAP.
            </div>
          </div>
        </aside>

        <section className="glass-card overflow-hidden">
          <div className="border-b border-white/5 p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                Mensajes
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                {filtered.length} visibles
              </div>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                search
              </span>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por asunto, remitente o preview..."
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-3 pl-12 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-primary/35"
              />
            </div>
          </div>

          <div className="max-h-[70vh] overflow-auto">
            {loadingMessages ? (
              <div className="p-10 text-center text-zinc-500 animate-pulse">Cargando mensajes del workspace...</div>
            ) : filtered.length === 0 ? (
              <div className="p-10 text-center text-zinc-500">No hay mensajes para este buzón todavía.</div>
            ) : (
              filtered.map((message) => {
                const active = selectedMessage?.id === message.id;
                return (
                  <button
                    key={message.id}
                    type="button"
                    onClick={() => setSelectedId(message.id)}
                    className={`w-full border-b border-white/5 px-5 py-4 text-left transition-all ${active ? "bg-primary/10" : "hover:bg-white/[0.03]"}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 space-y-2">
                        <div className="flex items-center gap-3">
                          <span className={`text-sm ${message.read ? "text-zinc-600" : "text-primary"}`}>●</span>
                          <span className="truncate text-sm font-black uppercase tracking-[0.12em] text-zinc-200">{message.from}</span>
                          <span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${tagStyles[message.tag]}`}>
                            {message.tag}
                          </span>
                        </div>
                        <div className="truncate text-base font-headline font-black tracking-tight text-white">{message.subject}</div>
                        <div className="truncate text-sm text-zinc-500">{message.preview}</div>
                      </div>
                      <div className="shrink-0 text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500">{message.receivedAt}</div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="glass-card overflow-hidden min-h-[70vh]">
          {selectedMessage ? (
            <>
              <div className="border-b border-white/5 p-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Reading pane</div>
                    <h2 className="text-3xl font-headline font-black tracking-tight text-white">{selectedMessage.subject}</h2>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
                      <span>{selectedMessage.from}</span>
                      <span className="text-zinc-700">•</span>
                      <span>{selectedMessage.fromAddress}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MailboxIconButton icon="reply" />
                    <MailboxIconButton icon="forward" />
                    <MailboxIconButton icon="star" active={selectedMessage.starred} />
                    <MailboxIconButton icon="more_horiz" />
                  </div>
                </div>
              </div>

              <div className="grid gap-6 p-6 2xl:grid-cols-[minmax(0,1fr)_280px]">
                <article className="rounded-3xl border border-white/8 bg-white/[0.02] p-6 whitespace-pre-line text-[15px] leading-8 text-zinc-300">
                  {selectedMessage.body}
                </article>

                <aside className="space-y-5">
                  <ContextCard
                    title="Thread Context"
                    lines={[
                      `Mailbox: ${account?.address ?? "-"}`,
                      `Received: ${selectedMessage.receivedAt}`,
                      `Tag: ${selectedMessage.tag}`,
                      `Status: ${selectedMessage.read ? "Read" : "Unread"}`
                    ]}
                  />
                  <ContextCard
                    title="Suggested Actions"
                    lines={[
                      "Reply with template",
                      "Create internal task",
                      "Mark as client priority",
                      "Archive in shared folder"
                    ]}
                  />
                </aside>
              </div>
            </>
          ) : (
            <div className="p-10 text-center text-zinc-500">Selecciona un mensaje para leerlo.</div>
          )}
        </section>
      </div>
    </div>
  );
}

function MailboxNavItem({
  icon,
  label,
  count,
  active
}: {
  icon: string;
  label: string;
  count: number;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition-all ${
        active ? "bg-primary/10 text-primary border border-primary/20" : "border border-transparent bg-white/[0.03] text-zinc-400 hover:text-white hover:border-white/8"
      }`}
    >
      <span className="flex items-center gap-3">
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
        <span className="text-sm font-black uppercase tracking-[0.12em]">{label}</span>
      </span>
      <span className="text-[10px] font-black uppercase tracking-[0.14em]">{count}</span>
    </button>
  );
}

function MailboxIconButton({ icon, active }: { icon: string; active?: boolean }) {
  return (
    <button
      type="button"
      className={`rounded-2xl border px-3 py-3 transition-all ${active ? "border-primary/20 bg-primary/10 text-primary" : "border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white"}`}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
    </button>
  );
}

function ContextCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-3xl border border-white/8 bg-white/[0.02] p-5">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{title}</div>
      <div className="mt-4 space-y-3">
        {lines.map((line) => (
          <div key={line} className="text-sm text-zinc-300">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
