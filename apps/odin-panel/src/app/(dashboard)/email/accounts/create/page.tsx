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
      setFeedback(error instanceof Error ? error.message : "No se pudo crear la cuenta.");
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto">
      <EmailBreadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Correo Electrónico", href: "/email/accounts" },
          { label: "Crear Cuenta" }
        ]}
      />

      <EmailPageIntro
        title="Nueva Cuenta de Correo"
        description="Aprovisiona buzones de correo profesionales de forma instantánea. Configura identidad, seguridad y límites de almacenamiento con un flujo optimizado."
        helper={
          <>
            ¿Falta un dominio? Gestiona tus activos en el <span className="text-[#00A3FF] font-bold">Administrador de Dominios</span>.
          </>
        }
      />

      <form onSubmit={handleSubmit} className="grid gap-8 xl:grid-cols-[minmax(0,1.4fr)_380px]">
        <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm flex flex-col">
          <div className="border-b border-slate-100 px-8 py-6 flex items-center justify-between gap-4 bg-slate-50/30">
            <div>
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                Detalles de Identidad
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowOptional((current) => !current)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:border-[#00A3FF]/30 hover:text-[#00A3FF] transition-all shadow-sm active:scale-95"
            >
              {showOptional ? "Ocultar Avanzado" : "Ajustes de Cuota"}
            </button>
          </div>

          <div className="space-y-8 p-10">
            <EmailField
              label="Dominio Destino"
              hint="Selecciona el dominio sobre el cual se creará el buzón de correo."
            >
              <div className="relative">
                <select
                  value={form.domain}
                  onChange={(event) => updateField("domain", event.target.value)}
                  disabled={domains.length === 0}
                  className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-slate-900 font-bold outline-none transition-all focus:border-[#00A3FF] focus:bg-white shadow-inner"
                >
                  {domains.length === 0 ? (
                    <option value="">No hay dominios disponibles</option>
                  ) : null}
                  {domains.map((domain) => (
                    <option key={domain.domain} value={domain.domain}>
                      {domain.domain}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  expand_more
                </span>
              </div>
            </EmailField>

            <EmailField
              label="Nombre de Usuario"
              hint={errors.username ? <span className="text-red-500">{errors.username}</span> : `Dirección final: ${composedEmail}`}
            >
              <div className="grid grid-cols-[1fr_auto] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 focus-within:border-[#00A3FF] focus-within:bg-white transition-all shadow-inner">
                <input
                  type="text"
                  value={form.username}
                  onChange={(event) => updateField("username", event.target.value)}
                  placeholder="ej. ventas, info, hola"
                  className="bg-transparent px-6 py-4 text-slate-900 font-bold outline-none placeholder:text-slate-300"
                />
                <div className="border-l border-slate-100 bg-slate-100/50 px-6 py-4 text-sm font-bold text-slate-400">
                  @{activeDomain || "dominio.com"}
                </div>
              </div>
            </EmailField>

            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <EmailField
                label="Contraseña de Acceso"
                hint={errors.password ? <span className="text-red-500">{errors.password}</span> : "Usa una combinación fuerte de caracteres."}
              >
                <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 focus-within:border-[#00A3FF] focus-within:bg-white transition-all shadow-inner">
                  <input
                    type="text"
                    value={form.password}
                    onChange={(event) => updateField("password", event.target.value)}
                    className="min-w-0 flex-1 bg-transparent px-6 py-4 text-slate-900 font-mono font-bold outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => updateField("password", generatePassword())}
                    className="border-l border-slate-100 bg-slate-100/50 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#00A3FF] hover:bg-[#00A3FF] hover:text-white transition-all"
                  >
                    Generar
                  </button>
                </div>
              </EmailField>

              <div className="rounded-2xl border border-[#00A3FF]/15 bg-[#00A3FF]/5 px-6 py-4 text-right min-w-[140px]">
                <div className="text-[10px] font-black uppercase tracking-widest text-[#00A3FF]">
                  Seguridad
                </div>
                <div className="mt-1 text-2xl font-black text-slate-900 tracking-tighter">
                  {Math.min(100, Math.max(52, form.password.length * 6))}%
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-[2rem] border border-slate-100 bg-slate-50/50 p-8 shadow-inner">
               <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Método de Configuración</div>
              <label className="flex items-center gap-4 group cursor-pointer">
                <div className="relative flex items-center justify-center">
                  <input
                    type="radio"
                    checked={!form.sendLoginLink}
                    onChange={() => updateField("sendLoginLink", false)}
                    className="peer appearance-none w-5 h-5 border-2 border-slate-200 rounded-full checked:border-[#00A3FF] transition-all"
                  />
                  <div className="absolute w-2.5 h-2.5 bg-[#00A3FF] rounded-full scale-0 peer-checked:scale-100 transition-transform" />
                </div>
                <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">Establecer contraseña ahora</span>
              </label>
              <label className="flex items-center gap-4 group cursor-pointer">
                <div className="relative flex items-center justify-center">
                  <input
                    type="radio"
                    checked={form.sendLoginLink}
                    onChange={() => updateField("sendLoginLink", true)}
                    className="peer appearance-none w-5 h-5 border-2 border-slate-200 rounded-full checked:border-[#00A3FF] transition-all"
                  />
                  <div className="absolute w-2.5 h-2.5 bg-[#00A3FF] rounded-full scale-0 peer-checked:scale-100 transition-transform" />
                </div>
                <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">Enviar enlace de acceso a correo alternativo</span>
              </label>
            </div>

            {form.sendLoginLink ? (
              <EmailField
                label="Correo Alternativo"
                hint={errors.alternateEmail ? <span className="text-red-500">{errors.alternateEmail}</span> : "Se enviará un link seguro para configurar la cuenta."}
              >
                <input
                  type="email"
                  value={form.alternateEmail}
                  onChange={(event) => updateField("alternateEmail", event.target.value)}
                  placeholder="ej. administrador@tuempresa.com"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-slate-900 font-bold outline-none transition-all placeholder:text-slate-300 focus:border-[#00A3FF] focus:bg-white shadow-inner"
                />
              </EmailField>
            ) : null}

            {showOptional ? (
              <div className="space-y-6 rounded-[2rem] border border-[#00A3FF]/10 bg-white p-8 shadow-sm">
                <div className="text-[11px] font-black uppercase tracking-widest text-[#00A3FF]">
                  Límites de Almacenamiento
                </div>
                <EmailField
                  label="Cuota de Disco (MB)"
                  hint="Define el tamaño máximo del buzón. Deja vacío para ilimitado."
                >
                  <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                    <input
                      type="number"
                      min={1}
                      value={form.quotaMb ?? ""}
                      onChange={(event) =>
                        updateField("quotaMb", event.target.value ? Number(event.target.value) : null)
                      }
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-slate-900 font-bold outline-none transition-all focus:border-[#00A3FF] focus:bg-white shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => updateField("quotaMb", null)}
                      className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:border-[#00A3FF] hover:text-[#00A3FF] transition-all shadow-sm"
                    >
                      Ilimitado
                    </button>
                  </div>
                </EmailField>
              </div>
            ) : null}

            <label className="flex items-center gap-4 cursor-pointer group p-2">
              <div className="relative flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={form.stayOnPage}
                  onChange={(event) => updateField("stayOnPage", event.target.checked)}
                  className="peer appearance-none w-6 h-6 border-2 border-slate-200 rounded-lg checked:bg-[#00A3FF] checked:border-[#00A3FF] transition-all"
                />
                <span className="material-symbols-outlined absolute text-white scale-0 peer-checked:scale-100 transition-transform pointer-events-none text-[18px]">check</span>
              </div>
              <span className="text-sm font-bold text-slate-500 group-hover:text-slate-900 transition-colors">Permanecer en esta página después de crear</span>
            </label>

            <div className="flex flex-col gap-6 border-t border-slate-100 pt-10 sm:flex-row sm:items-center sm:justify-between">
              <Link href="/email/accounts" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Cancelar y Volver
              </Link>
              <button
                type="submit"
                disabled={createMutation.isPending || domains.length === 0}
                className="bg-[#00A3FF] rounded-2xl px-10 py-5 text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-[#00A3FF]/20 transition-all hover:bg-[#008EE0] active:scale-95 disabled:opacity-50"
              >
                {createMutation.isPending ? "Procesando..." : "+ Crear Cuenta"}
              </button>
            </div>

            {feedback ? (
              <div className="rounded-2xl border border-[#00A3FF]/20 bg-[#00A3FF]/5 px-6 py-4 text-sm font-bold text-[#00A3FF] animate-in fade-in slide-in-from-top-2">
                {feedback}
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Capacidad Disponible
                </div>
                <div className="mt-3 text-5xl font-black tracking-tighter text-slate-900">
                  {selectedDomain?.capacity === null ? "∞" : (selectedDomain?.capacity ?? 0) - (selectedDomain?.used ?? 0)}
                </div>
                <div className="mt-1 text-[11px] font-bold text-[#00A3FF] uppercase tracking-widest">Buzones libres</div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black tracking-tighter text-slate-400">
                  {selectedDomain?.used ?? 0}
                </div>
                <div className="mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">En uso</div>
              </div>
            </div>
            <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50/50 p-6 shadow-inner text-center">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Dominio Activo
              </div>
              <div className="mt-2 text-xl font-black text-slate-900 tracking-tight">{activeDomain || "Sin dominio"}</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 space-y-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#00A3FF]">help</span>
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-900">
                ¿Necesitas Ayuda?
              </div>
            </div>
            <div className="space-y-4 text-sm leading-relaxed text-slate-500 font-medium">
              <p>Esta interfaz permite aprovisionar buzones de correo profesionales. Una vez creada la cuenta, podrás configurar clientes externos (como Outlook o Gmail) usando los parámetros IMAP/SMTP.</p>
              <Link href="/domains" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#00A3FF] mt-2">
                Gestionar Dominios →
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
