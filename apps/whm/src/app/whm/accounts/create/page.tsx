"use client";

import React, { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
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

  const onInputChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = event.target as HTMLInputElement;
    const { name, value, type, checked } = target;

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

      setFeedback(`Node successfully provisioned. ID: ${data.accountId}`);
      setForm(defaultForm);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Provisioning failed");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="space-y-1">
        <div className="flex items-center gap-3 mb-1">
           <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-black uppercase rounded border border-primary/20 tracking-widest">
              Deployment Wizard
           </span>
        </div>
        <h1 className="text-5xl font-headline font-black text-white tracking-tighter uppercase italic">
          Provision New Node
        </h1>
        <p className="text-zinc-500 text-sm font-mono tracking-widest mt-1">
          Specify core parameters for the new administrative instance.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="glass-card p-10 space-y-10">
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ProField label="Domain / FQDN">
               <input 
                name="domain"
                type="text" 
                placeholder="example.com"
                value={form.domain}
                onChange={onInputChange}
                required
                className="pro-input"
              />
            </ProField>
            <ProField label="Administrative User">
              <input 
                name="username"
                type="text" 
                placeholder="root_admin"
                value={form.username}
                onChange={onInputChange}
                required
                className="pro-input"
              />
            </ProField>
            <ProField label="Primary Contact Email">
              <input 
                name="email"
                type="email" 
                placeholder="sysops@nexhost.cloud"
                value={form.email}
                onChange={onInputChange}
                required
                className="pro-input"
              />
            </ProField>
            <ProField label="Access Credentials">
              <input 
                name="password"
                type="password" 
                placeholder="••••••••••••"
                value={form.password}
                onChange={onInputChange}
                required
                className="pro-input"
              />
            </ProField>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-white/5">
            <ProField label="Resource Allocation Plan">
              <select 
                name="planId"
                value={form.planId ?? ""}
                onChange={onInputChange}
                className="pro-input appearance-none bg-[#0A1221]"
              >
                <option value="">Select Cluster Tier</option>
                {(plansQuery.data ?? []).map(plan => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} ({plan.disk_quota_mb}MB NVMe)
                  </option>
                ))}
              </select>
            </ProField>
            <ProField label="Compute Engine (PHP)">
              <select 
                name="settings.phpVersion"
                value={form.settings.phpVersion}
                onChange={onInputChange}
                className="pro-input appearance-none bg-[#0A1221]"
              >
                {["7.4", "8.0", "8.1", "8.2", "8.3"].map(v => (
                  <option key={v} value={v}>v{v} High-Performance</option>
                ))}
              </select>
            </ProField>
          </section>

          <section className="pt-8 border-t border-white/5 space-y-6">
             <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Infrastructure Modules</h3>
                <label className="flex items-center gap-3 cursor-pointer group">
                   <input 
                    type="checkbox" 
                    name="nameservers.inheritRoot" 
                    checked={form.nameservers.inheritRoot} 
                    onChange={onInputChange}
                    className="hidden"
                   />
                   <div className={`w-4 h-4 rounded border transition-all ${form.nameservers.inheritRoot ? 'bg-primary border-primary shadow-[0_0_10px_rgba(0,163,255,0.4)]' : 'border-zinc-700'}`}></div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-white transition-colors">Inherit Root Nameservers</span>
                </label>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ModuleToggle 
                  label="SSH Shell" 
                  active={form.settings.shellAccess} 
                  onClick={() => setForm(prev => ({ ...prev, settings: { ...prev.settings, shellAccess: !prev.settings.shellAccess } }))} 
                />
                <ModuleToggle 
                  label="Node.js Cluster" 
                  active={form.settings.nodejsEnabled} 
                  onClick={() => setForm(prev => ({ ...prev, settings: { ...prev.settings, nodejsEnabled: !prev.settings.nodejsEnabled } }))} 
                />
                <ModuleToggle 
                  label="Docker Engine" 
                  active={form.settings.dockerEnabled} 
                  onClick={() => setForm(prev => ({ ...prev, settings: { ...prev.settings, dockerEnabled: !prev.settings.dockerEnabled } }))} 
                />
             </div>
          </section>
        </div>

        <div className="flex items-center justify-between pt-4">
           <Link href="/whm/accounts">
              <button type="button" className="text-zinc-500 hover:text-white transition-colors text-[10px] uppercase font-black tracking-[0.2em]">
                Abort Mission
              </button>
           </Link>
           <button 
             type="submit" 
             disabled={!canSubmit || isSaving}
             className="kinetic-gradient px-12 py-4 rounded-2xl text-white font-black font-headline tracking-widest active:scale-95 transition-all shadow-2xl shadow-primary/40 uppercase text-xs disabled:opacity-50 disabled:grayscale"
           >
             {isSaving ? "Syncing..." : "Authorize Provisioning"}
           </button>
        </div>

        {feedback && (
          <div className={`p-6 rounded-2xl text-center text-[10px] font-black uppercase tracking-[0.2em] border animate-in fade-in slide-in-from-bottom-2 ${
            feedback.includes("successfully") ? 'border-primary/40 text-primary bg-primary/5' : 'border-red-500/40 text-red-400 bg-red-400/5'
          }`}>
             {feedback}
          </div>
        )}
      </form>
    </div>
  );
}

function ProField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 block ml-1">{label}</label>
      {children}
    </div>
  );
}

function ModuleToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`p-5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between group ${
        active 
          ? 'bg-primary/10 border-primary/50 text-white shadow-[0_0_20px_rgba(0,163,255,0.05)]' 
          : 'bg-white/5 border-white/5 text-zinc-500 hover:border-white/10 hover:text-zinc-300'
      }`}
    >
      <span className="text-[11px] font-black uppercase tracking-tight italic">{label}</span>
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${active ? 'bg-primary border-primary shadow-[0_0_10px_rgba(0,163,255,0.5)]' : 'border-zinc-800'}`}>
         {active && <span className="material-symbols-outlined text-[12px] text-black font-bold">check</span>}
      </div>
    </div>
  );
}
