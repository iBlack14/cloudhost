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
      setForm((prev: WhmCreateAccountInput) => ({
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
      setForm((prev: WhmCreateAccountInput) => ({
        ...prev,
        nameservers: {
          ...prev.nameservers,
          [key]: type === "checkbox" ? checked : value
        }
      }));
      return;
    }

    setForm((prev: WhmCreateAccountInput) => ({ ...prev, [name]: value }));
  };

  const generatePassword = () => {
    const length = 16;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const special = "!@#$%^&*";
    
    let retVal = "";
    retVal += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    retVal += numbers.charAt(Math.floor(Math.random() * numbers.length));
    retVal += special.charAt(Math.floor(Math.random() * special.length));
    
    for (let i = 3; i < length; i++) {
      retVal += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    retVal = retVal.split('').sort(() => 0.5 - Math.random()).join('');
    setForm(prev => ({ ...prev, password: retVal }));
  };

  const formatError = (rawError: string) => {
    try {
      if (rawError.trim().startsWith('[') || rawError.trim().startsWith('{')) {
        const parsed = JSON.parse(rawError);
        if (Array.isArray(parsed)) {
          return parsed.map((e: any) => e.message || e.MESSAGE || "Validation error").join(" • ");
        }
      }
      return rawError;
    } catch {
      return rawError;
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback("");

    try {
      const data = await createMutation.mutateAsync({
        ...form,
        planId: form.planId || undefined
      });

      setFeedback(`SUCCESS: Node successfully provisioned. ID: ${data.accountId}`);
      setForm(defaultForm);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Provisioning failed");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <header className="space-y-1.5 border-b border-white/5 pb-8">
        <div className="flex items-center gap-2 mb-1">
           <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[8px] font-black uppercase rounded border border-primary/20 tracking-tighter">Deployment Wizard</span>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic font-headline">
          Provision <span className="text-primary not-italic">New Node</span>
        </h1>
        <p className="text-zinc-500 text-[10px] font-mono tracking-widest uppercase opacity-60">
          Specify core parameters for the new instance.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="bg-[#0A1221]/40 backdrop-blur-xl border border-white/5 rounded-2xl p-8 space-y-10">
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProField label="Domain / FQDN">
               <input 
                name="domain"
                type="text" 
                placeholder="example.com"
                value={form.domain}
                onChange={onInputChange}
                required
                className="pro-input py-2.5 text-sm"
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
                className="pro-input py-2.5 text-sm"
              />
            </ProField>
            <ProField label="Contact Email">
              <input 
                name="email"
                type="email" 
                placeholder="sysops@odisea.cloud"
                value={form.email}
                onChange={onInputChange}
                required
                className="pro-input py-2.5 text-sm"
              />
            </ProField>
            <ProField label="Access Key">
              <div className="relative">
                <input 
                  name="password"
                  type="text" 
                  placeholder="••••••••••••"
                  value={form.password}
                  onChange={onInputChange}
                  required
                  className="pro-input py-2.5 text-sm pr-12 font-mono"
                />
                <button 
                  type="button"
                  onClick={generatePassword}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary/20 transition-all text-zinc-500 hover:text-primary"
                  title="Generate"
                >
                  <span className="material-symbols-outlined text-[16px]">key</span>
                </button>
              </div>
            </ProField>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-white/5">
            <ProField label="Cluster Tier">
              <select 
                name="planId"
                value={form.planId ?? ""}
                onChange={onInputChange}
                className="pro-input py-2.5 text-sm appearance-none bg-[#0A1221]"
              >
                <option value="">Select Tier</option>
                {(plansQuery.data ?? []).map(plan => (
                   <option key={plan.id} value={plan.id}>
                    {plan.name} ({plan.disk_quota_mb}MB NVMe)
                  </option>
                ))}
              </select>
            </ProField>
            <ProField label="Compute Engine">
              <select 
                name="settings.phpVersion"
                value={form.settings.phpVersion}
                onChange={onInputChange}
                className="pro-input py-2.5 text-sm appearance-none bg-[#0A1221]"
              >
                {["7.4", "8.0", "8.1", "8.2", "8.3", "8.4"].map(v => (
                  <option key={v} value={v}>PHP v{v}</option>
                ))}
              </select>
            </ProField>
          </section>

          <section className="pt-8 border-t border-white/5 space-y-6">
             <div className="flex items-center justify-between">
                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Infrastructure Modules</h3>
                <label className="flex items-center gap-2 cursor-pointer group">
                   <input 
                    type="checkbox" 
                    name="nameservers.inheritRoot" 
                    checked={form.nameservers.inheritRoot} 
                    onChange={onInputChange}
                    className="hidden"
                   />
                   <div className={`w-3.5 h-3.5 rounded border transition-all ${form.nameservers.inheritRoot ? 'bg-primary border-primary' : 'border-zinc-800'}`}></div>
                   <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400 transition-colors">Inherit Nameservers</span>
                </label>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <ModuleToggle 
                  label="SSH Shell" 
                  active={form.settings.shellAccess} 
                  onClick={() => setForm((prev: WhmCreateAccountInput) => ({ ...prev, settings: { ...prev.settings, shellAccess: !prev.settings.shellAccess } }))} 
                />
                <ModuleToggle 
                  label="Node.js" 
                  active={form.settings.nodejsEnabled} 
                  onClick={() => setForm((prev: WhmCreateAccountInput) => ({ ...prev, settings: { ...prev.settings, nodejsEnabled: !prev.settings.nodejsEnabled } }))} 
                />
                <ModuleToggle 
                  label="Docker" 
                  active={form.settings.dockerEnabled} 
                  onClick={() => setForm((prev: WhmCreateAccountInput) => ({ ...prev, settings: { ...prev.settings, dockerEnabled: !prev.settings.dockerEnabled } }))} 
                />
             </div>
          </section>
        </div>

        <div className="flex items-center justify-between pt-4">
           <Link href="/whm/accounts">
              <button type="button" className="text-zinc-600 hover:text-zinc-400 transition-colors text-[9px] uppercase font-black tracking-[0.2em]">
                Cancel Operation
              </button>
           </Link>
           <button 
             type="submit" 
             disabled={!canSubmit || isSaving}
             className="kinetic-gradient px-8 py-3 rounded-xl text-white font-black text-[10px] tracking-widest uppercase shadow-lg shadow-primary/20 active:translate-y-[1px] transition-all disabled:opacity-40"
           >
             {isSaving ? "Provisioning..." : "Authorize Deployment"}
           </button>
        </div>

        {feedback && (
          <div className={`p-5 rounded-xl text-center text-[10px] font-black uppercase tracking-wide border animate-in fade-in slide-in-from-bottom-1 flex items-center justify-center gap-3 ${
            feedback.startsWith("SUCCESS") ? 'border-primary/20 text-primary bg-primary/5' : 'border-red-500/20 text-red-400 bg-red-400/5'
          }`}>
             <span className="material-symbols-outlined text-[16px]">
               {feedback.startsWith("SUCCESS") ? 'verified' : 'warning'}
             </span>
             <span>{formatError(feedback.replace("SUCCESS: ", ""))}</span>
          </div>
        )}
      </form>
    </div>
  );
}

function ProField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 block ml-1">{label}</label>
      {children}
    </div>
  );
}

function ModuleToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${
        active 
          ? 'bg-primary/10 border-primary/20 text-white' 
          : 'bg-white/[0.02] border-white/5 text-zinc-600 hover:border-white/10'
      }`}
    >
      <span className="text-[10px] font-black uppercase tracking-tight italic">{label}</span>
      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${active ? 'bg-primary border-primary' : 'border-zinc-800'}`}>
         {active && <span className="material-symbols-outlined text-[10px] text-black font-bold">check</span>}
      </div>
    </div>
  );
}
