"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import type { MailIdentity, MailMessageDetail } from "@odisea/types";

import { fetchMailMe, fetchMailMessage } from "../../../lib/mail-client";
import { MailShell } from "../../../components/MailShell";

export default function MessagePage() {
  const router = useRouter();
  const params = useParams<{ messageId: string }>();
  const messageId = typeof params?.messageId === "string" ? params.messageId : "";
  const [me, setMe] = useState<MailIdentity | null>(null);
  const [message, setMessage] = useState<MailMessageDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchMailMe(), fetchMailMessage(messageId)])
      .then(([identity, detail]) => {
        setMe(identity);
        setMessage(detail);
      })
      .catch((reason) => {
        if (reason instanceof Error && reason.message.toLowerCase().includes("sesión")) {
          router.replace("/login");
          return;
        }
        setError(reason instanceof Error ? reason.message : "No se pudo cargar el mensaje.");
      });
  }, [messageId, router]);

  return (
    <MailShell
      me={me}
      title="Message"
      subtitle="Vista individual para inspección completa del correo."
    >
      <div className="glass-card p-6 md:p-8">
        {error ? (
          <div className="text-rose-200">{error}</div>
        ) : !message ? (
          <div className="text-zinc-500">Cargando mensaje...</div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Subject</div>
                <h2 className="mt-3 text-4xl font-headline font-black text-white">{message.subject}</h2>
                <div className="mt-4 space-y-1 text-sm text-zinc-400">
                  <div>From: {message.fromAddress}</div>
                  <div>To: {message.to.join(", ")}</div>
                  <div>Received: {message.receivedAt}</div>
                </div>
              </div>
              <Link
                href="/inbox"
                className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-primary"
              >
                Volver al inbox
              </Link>
            </div>

            <article className="rounded-3xl border border-white/8 bg-white/[0.03] p-6 whitespace-pre-line text-[15px] leading-8 text-zinc-300">
              {message.body}
            </article>
          </div>
        )}
      </div>
    </MailShell>
  );
}
