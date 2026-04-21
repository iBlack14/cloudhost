"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createEmailAccountSchema } from "../../../../../lib/schemas/email-account";
import { useCreateEmailAccount, useEmailDomains } from "../../../../../lib/hooks/use-email-accounts";
import { EmailBreadcrumbs, EmailField, EmailPageIntro } from "../../../../../components/email/EmailUI";

const generatePassword = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*_-";
  return Array.from({ length: 16 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
};

export default function CreateEmailAccountPage() {
  const router = useRouter();
  const { data: domains = [] } = useEmailDomains();
  const createMutation = useCreateEmailAccount();
  const [showOptional, setShowOptional] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);

  const [form, setForm] = useState<{
    domain: string;
    username: string;
    password: string;
    quotaMb: number | null;
    sendLoginLink: boolean;
    alternateEmail: string;
    stayOnPage: boolean;
  }>({
    domain: "",
    username: "",
    password: generatePassword(),
    quotaMb: 250,
    sendLoginLink: false,
    alternateEmail: "",
    stayOnPage: true
  });

  const selectedDomain = useMemo(
    () => domains.find((item) => item.domain === form.domain) ?? domains[0],
    [domains, form.domain]
  );
  const activeDomain = selectedDomain?.domain ?? form.domain;
  const composedEmail = activeDomain
    ? form.username
      ? `${form.username}@${activeDomain}`
      : `username@${activeDomain}`
    : "username@dominio.com";

  React.useEffect(() => {
    if (domains.length === 0) {
      if (form.domain) {
        setForm((current) => ({ ...current, domain: "" }));
      }
      return;
    }

    const domainExists = domains.some((item) => item.domain === form.domain);
    if (!domainExists) {
      setForm((current) => ({ ...current, domain: domains[0].domain }));
    }
  }, [domains, form.domain]);

  const updateField = <K extends keyof typeof form>(field: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    setErrors({});

    const parsed = createEmailAccountSchema.safeParse(form);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        nextErrors[String(issue.path[0] ?? "form")] = issue.message;
      }
      setErrors(nextErrors);
      return;
    }

    try {
      const result = await createMutation.mutateAsync(parsed.data);
      setFeedback(result.result.message);
      if (parsed.data.stayOnPage) {
        setForm((current) => ({
          ...current,
          username: "",
          password: generatePassword(),
          alternateEmail: ""
        }));
        return;
      }

      setTimeout(() => router.push("/email/accounts"), 900);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo crear la cuenta mock.");
    }
  };

  return (
    <div className="space-y-8">
      <EmailBreadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Email", href: "/email/accounts" },
          { label: "Create account" }
        ]}
      />

      <EmailPageIntro
        title="Crear una Cuenta de Correo"
        description="Crea nuevas direcciones para cualquiera de los dominios del panel. La composición del flujo replica la claridad de cPanel, pero en el lenguaje visual oscuro de ODIN."
        helper={
          <>
            ¿Missing a domain? El acceso a <span className="text-primary">Manage Domains</span> quedará enlazado al backend real.
          </>
        }
      />

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        <div className="glass-card overflow-hidden">
          <div className="border-b border-white/5 px-6 py-5 flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">
                Create an email account
              </div>
              <div className="mt-2 text-sm text-zinc-400">
                Define identidad, acceso y cuota inicial.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowOptional((current) => !current)}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300 hover:border-primary/25 hover:text-primary transition-colors"
            >
              {showOptional ? "Hide optional" : "Edit settings"}
            </button>
          </div>

          <div className="space-y-7 p-6">
            <EmailField
              label="Dominio"
              hint="Missing a domain? Check the domain manager once backend integration is enabled."
            >
              <select
                value={form.domain}
                onChange={(event) => updateField("domain", event.target.value)}
                disabled={domains.length === 0}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition-colors focus:border-primary/35"
              >
                {domains.length === 0 ? (
                  <option value="" className="bg-[#0A1221]">
                    No hay dominios disponibles
                  </option>
                ) : null}
                {domains.map((domain) => (
                  <option key={domain.domain} value={domain.domain} className="bg-[#0A1221]">
                    {domain.domain}
                  </option>
                ))}
              </select>
            </EmailField>

            <EmailField
              label="Nombre de usuario"
              hint={errors.username ? <span className="text-rose-300">{errors.username}</span> : `Dirección final: ${composedEmail}`}
            >
              <div className="grid grid-cols-[1fr_auto] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                <input
                  type="text"
                  value={form.username}
                  onChange={(event) => updateField("username", event.target.value)}
                  placeholder="ventas, soporte, admin"
                  className="bg-transparent px-4 py-3 text-white outline-none placeholder:text-zinc-600"
                />
                <div className="border-l border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-zinc-400">
                  @{activeDomain || "dominio.com"}
                </div>
              </div>
            </EmailField>

            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <EmailField
                label="Contraseña"
                hint={errors.password ? <span className="text-rose-300">{errors.password}</span> : "Usa una clave fuerte o genera una nueva."}
              >
                <div className="flex overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                  <input
                    type="text"
                    value={form.password}
                    onChange={(event) => updateField("password", event.target.value)}
                    className="min-w-0 flex-1 bg-transparent px-4 py-3 text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => updateField("password", generatePassword())}
                    className="border-l border-white/10 bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-primary"
                  >
                    Generar
                  </button>
                </div>
              </EmailField>

              <div className="rounded-2xl border border-primary/15 bg-primary/10 px-4 py-3 text-right">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">
                  Password strength
                </div>
                <div className="mt-2 text-lg font-headline font-black text-white">
                  {Math.min(100, Math.max(52, form.password.length * 6))}/100
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <label className="flex items-start gap-3 text-sm text-zinc-300">
                <input
                  type="radio"
                  checked={!form.sendLoginLink}
                  onChange={() => updateField("sendLoginLink", false)}
                  className="mt-1"
                />
                <span>Set password now.</span>
              </label>
              <label className="flex items-start gap-3 text-sm text-zinc-300">
                <input
                  type="radio"
                  checked={form.sendLoginLink}
                  onChange={() => updateField("sendLoginLink", true)}
                  className="mt-1"
                />
                <span>Send login link to alternate email address.</span>
              </label>
            </div>

            {form.sendLoginLink ? (
              <EmailField
                label="Alternate email"
                hint={errors.alternateEmail ? <span className="text-rose-300">{errors.alternateEmail}</span> : "Aquí llegaría el login link en el flujo real."}
              >
                <input
                  type="email"
                  value={form.alternateEmail}
                  onChange={(event) => updateField("alternateEmail", event.target.value)}
                  placeholder="ops@tuempresa.com"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-primary/35"
                />
              </EmailField>
            ) : null}

            {showOptional ? (
              <div className="space-y-5 rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">
                  Optional settings
                </div>
                <EmailField
                  label="Storage quota (MB)"
                  hint="Usa un valor alto para buzones operativos o vacío para simular cuota infinita."
                >
                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <input
                      type="number"
                      min={1}
                      value={form.quotaMb ?? ""}
                      onChange={(event) =>
                        updateField("quotaMb", event.target.value ? Number(event.target.value) : null)
                      }
                      className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition-colors focus:border-primary/35"
                    />
                    <button
                      type="button"
                      onClick={() => updateField("quotaMb", null)}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300"
                    >
                      Unlimited
                    </button>
                  </div>
                </EmailField>
              </div>
            ) : null}

            <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={form.stayOnPage}
                onChange={(event) => updateField("stayOnPage", event.target.checked)}
              />
              Stay on this page after I click Create.
            </label>

            <div className="flex flex-col gap-4 border-t border-white/5 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <Link href="/email/accounts" className="text-sm font-black uppercase tracking-[0.16em] text-zinc-500 transition-colors hover:text-white">
                ← Volver
              </Link>
              <button
                type="submit"
                disabled={createMutation.isPending || domains.length === 0}
                className="kinetic-gradient rounded-2xl px-6 py-3 text-sm font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-primary/25 transition-transform active:scale-95 disabled:opacity-60"
              >
                {createMutation.isPending ? "Provisioning..." : "+ Crear"}
              </button>
            </div>

            {feedback ? (
              <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
                {feedback}
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                  Capacity overview
                </div>
                <div className="mt-3 text-4xl font-headline font-black tracking-tight text-white">
                  {selectedDomain?.capacity === null ? "∞" : (selectedDomain?.capacity ?? 0) - (selectedDomain?.used ?? 0)}
                </div>
                <div className="mt-1 text-xs text-zinc-500">Disponible</div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-headline font-black tracking-tight text-primary">
                  {selectedDomain?.used ?? 0}
                </div>
                <div className="mt-1 text-xs text-zinc-500">Usado</div>
              </div>
            </div>
            <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                Dominio activo
              </div>
              <div className="mt-2 text-lg font-headline font-black text-white">{activeDomain || "Sin dominio"}</div>
              <div className="mt-2 text-xs text-zinc-500">
                Alias resultante: <span className="text-primary">{composedEmail}</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 space-y-5">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">
              Missing a domain?
            </div>
            <p className="text-sm leading-6 text-zinc-400">
              Navega al listado de dominios de la cuenta y agrega uno nuevo antes de aprovisionar más buzones.
            </p>
            <Link href="/domains" className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-primary">
              <span className="material-symbols-outlined text-[18px]">language</span>
              Manage Domains
            </Link>
          </div>

          <div className="glass-card p-6 space-y-5">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">
              Need help?
            </div>
            <div className="space-y-3 text-sm text-zinc-400">
              <p>Esta interfaz mock ya valida el flujo de alta, generación de contraseña y quota local.</p>
              <p>En la siguiente fase se conectará a la API real para creación y administración de buzones.</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
