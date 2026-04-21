"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { MailIdentity } from "@odisea/types";

import { fetchMailMe, sendMailMessage } from "../../lib/mail-client";
import { MailShell } from "../../components/MailShell";

export default function ComposePage() {
  const router = useRouter();
  const [me, setMe] = useState<MailIdentity | null>(null);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMailMe()
      .then(setMe)
      .catch(() => router.replace("/login"));
  }, [router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const recipients = to
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      await sendMailMessage({ to: recipients, subject, body });
      setFeedback("Mensaje enviado correctamente.");
      setTo("");
      setSubject("");
      setBody("");
    } catch (reason) {
      setFeedback(reason instanceof Error ? reason.message : "No se pudo enviar el mensaje.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MailShell
      me={me}
      title="Compose"
      subtitle="Envía mensajes desde tu buzón del webmail independiente."
    >
      <form onSubmit={onSubmit} className="glass-card p-6 md:p-8 space-y-6">
        <Field label="From">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-white">{me?.address ?? "Cargando..."}</div>
        </Field>
        <Field label="To">
          <input
            value={to}
            onChange={(event) => setTo(event.target.value)}
            placeholder="cliente@empresa.com, admin@odiseacloud.com"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-white outline-none placeholder:text-zinc-600 focus:border-primary/35"
            required
          />
        </Field>
        <Field label="Subject">
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Asunto"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-white outline-none placeholder:text-zinc-600 focus:border-primary/35"
            required
          />
        </Field>
        <Field label="Body">
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={12}
            placeholder="Escribe tu mensaje..."
            className="w-full rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4 text-white outline-none placeholder:text-zinc-600 focus:border-primary/35"
            required
          />
        </Field>

        {feedback ? (
          <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
            {feedback}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="kinetic-gradient rounded-2xl px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-white disabled:opacity-60"
          >
            {loading ? "Enviando..." : "Send message"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/inbox")}
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-zinc-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </MailShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">{label}</div>
      {children}
    </div>
  );
}
