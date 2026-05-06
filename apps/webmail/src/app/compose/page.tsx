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
      title="Redactar"
      subtitle="Envía mensajes seguros desde tu terminal independiente."
    >
      <form onSubmit={onSubmit} className="bg-white border border-slate-200 p-10 rounded-[2.5rem] space-y-8 shadow-sm">
        <Field label="Desde">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-6 py-4 text-slate-900 font-bold text-sm">{me?.address ?? "Cargando..."}</div>
        </Field>
        <Field label="Para">
          <input
            value={to}
            onChange={(event) => setTo(event.target.value)}
            placeholder="ejemplo@correo.com, contacto@empresa.com"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-slate-900 font-bold text-sm outline-none placeholder:text-slate-300 focus:border-[#00A3FF] focus:bg-white transition-all shadow-inner"
            required
          />
        </Field>
        <Field label="Asunto">
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Asunto del mensaje"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-slate-900 font-bold text-sm outline-none placeholder:text-slate-300 focus:border-[#00A3FF] focus:bg-white transition-all shadow-inner"
            required
          />
        </Field>
        <Field label="Mensaje">
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={12}
            placeholder="Escribe el contenido de tu correo aquí..."
            className="w-full rounded-[2rem] border border-slate-200 bg-slate-50 px-6 py-5 text-slate-900 font-medium text-base outline-none placeholder:text-slate-300 focus:border-[#00A3FF] focus:bg-white transition-all shadow-inner leading-relaxed"
            required
          />
        </Field>

        {feedback && (
          <div className={`rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest border ${feedback.includes("error") ? 'bg-red-50 border-red-100 text-red-500' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
            {feedback}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-[#00A3FF] rounded-2xl px-10 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-[#00A3FF]/20 hover:bg-[#008EE0] active:scale-[0.98] transition-all disabled:opacity-40"
          >
            {loading ? "Enviando..." : "Enviar Mensaje"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/inbox")}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-10 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all"
          >
            Cancelar
          </button>
        </div>
      </form>
    </MailShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">{label}</div>
      {children}
    </div>
  );
}
