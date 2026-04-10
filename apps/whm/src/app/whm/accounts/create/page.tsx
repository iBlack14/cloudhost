"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";

import { AppShell, UIButton, UIInput, UINotice, UISelect } from "@odisea/ui";

import { useCreateWhmAccount, useWhmPlans } from "../../../../lib/hooks/use-whm-accounts";
import type { WhmCreateAccountInput } from "../../../../lib/schemas/whm-create-account";

const defaultForm: WhmCreateAccountInput = {
  domain: "",
  username: "",
  password: "",
  email: "",
  planId: undefined,
  nameservers: {
    inheritRoot: true,
    ns1: "",
    ns2: "",
    ns3: "",
    ns4: ""
  },
  settings: {
    phpVersion: "8.2",
    shellAccess: false,
    nodejsEnabled: false,
    dockerEnabled: false
  }
};

export default function CreateWhmAccountPage() {
  const [form, setForm] = useState<WhmCreateAccountInput>(defaultForm);
  const [feedback, setFeedback] = useState<string>("");

  const plansQuery = useWhmPlans();
  const createMutation = useCreateWhmAccount();

  const isSaving = createMutation.isPending;

  const canSubmit = useMemo(() => {
    return Boolean(form.domain && form.username && form.password && form.email) && !isSaving;
  }, [form, isSaving]);

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;

    if (name.startsWith("settings.")) {
      const key = name.replace("settings.", "") as keyof WhmCreateAccountInput["settings"];
      setForm((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          [key]: type === "checkbox" ? checked : value
        }
      }));
      return;
    }

    if (name.startsWith("nameservers.")) {
      const key = name.replace("nameservers.", "") as keyof WhmCreateAccountInput["nameservers"];
      setForm((prev) => ({
        ...prev,
        nameservers: {
          ...prev.nameservers,
          [key]: type === "checkbox" ? checked : value
        }
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback("");

    try {
      const data = await createMutation.mutateAsync({
        ...form,
        planId: form.planId || undefined
      });

      setFeedback(`Cuenta creada. userId=${data.userId} accountId=${data.accountId}`);
      setForm(defaultForm);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo crear la cuenta");
    }
  };

  return (
    <AppShell title="ODISEA CLOUD · WHM · Crear Cuenta" accent="violet" subtitle="Provisiona cuentas de hosting con configuración inicial.">
      <form onSubmit={onSubmit} className="grid gap-5 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6">
        <section className="grid gap-4 md:grid-cols-2">
          <UIInput label="Dominio" name="domain" value={form.domain} onChange={onInputChange} placeholder="cliente.com" />
          <UIInput label="Username" name="username" value={form.username} onChange={onInputChange} placeholder="cliente01" />
          <UIInput label="Email" name="email" type="email" value={form.email} onChange={onInputChange} placeholder="admin@cliente.com" />
          <UIInput label="Password" name="password" type="password" value={form.password} onChange={onInputChange} placeholder="********" />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <UISelect
            label="Plan"
            value={form.planId ?? ""}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setForm((prev) => ({ ...prev, planId: event.target.value || undefined }))
            }
          >
              <option value="">Sin plan</option>
              {(plansQuery.data ?? []).map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} · {plan.disk_quota_mb}MB / {plan.bandwidth_mb}MB
                </option>
              ))}
          </UISelect>

          <UISelect
            label="PHP Version"
            value={form.settings.phpVersion}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setForm((prev) => ({
                ...prev,
                settings: { ...prev.settings, phpVersion: event.target.value as WhmCreateAccountInput["settings"]["phpVersion"] }
              }))
            }
          >
              <option value="7.4">7.4</option>
              <option value="8.0">8.0</option>
              <option value="8.1">8.1</option>
              <option value="8.2">8.2</option>
              <option value="8.3">8.3</option>
          </UISelect>
        </section>

        <section className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="nameservers.inheritRoot" checked={form.nameservers.inheritRoot} onChange={onInputChange} />
            Heredar nameservers del root
          </label>

          {!form.nameservers.inheritRoot && (
            <div className="grid gap-3 md:grid-cols-2">
              <input name="nameservers.ns1" value={form.nameservers.ns1} onChange={onInputChange} className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-zinc-100 outline-none ring-violet-400/50 transition focus:ring-2" placeholder="ns1.cliente.com" />
              <input name="nameservers.ns2" value={form.nameservers.ns2} onChange={onInputChange} className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-zinc-100 outline-none ring-violet-400/50 transition focus:ring-2" placeholder="ns2.cliente.com" />
              <input name="nameservers.ns3" value={form.nameservers.ns3} onChange={onInputChange} className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-zinc-100 outline-none ring-violet-400/50 transition focus:ring-2" placeholder="ns3 (opcional)" />
              <input name="nameservers.ns4" value={form.nameservers.ns4} onChange={onInputChange} className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-zinc-100 outline-none ring-violet-400/50 transition focus:ring-2" placeholder="ns4 (opcional)" />
            </div>
          )}
        </section>

        <section className="grid gap-2 text-sm text-zinc-300 md:grid-cols-3">
          <label className="inline-flex items-center gap-2"><input type="checkbox" name="settings.shellAccess" checked={form.settings.shellAccess} onChange={onInputChange} /> Shell Access</label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" name="settings.nodejsEnabled" checked={form.settings.nodejsEnabled} onChange={onInputChange} /> Node.js</label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" name="settings.dockerEnabled" checked={form.settings.dockerEnabled} onChange={onInputChange} /> Docker</label>
        </section>

        <div className="flex items-center gap-3">
          <UIButton
            variant="primary"
            type="submit"
            disabled={!canSubmit}
          >
            {isSaving ? "Creando..." : "Crear cuenta"}
          </UIButton>
          {plansQuery.isLoading && <span className="text-xs text-zinc-400">Cargando planes...</span>}
        </div>

        {feedback && <UINotice tone={feedback.startsWith("Cuenta creada") ? "success" : "info"}>{feedback}</UINotice>}
      </form>
    </AppShell>
  );
}
