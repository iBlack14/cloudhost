"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCreateWhmAccount, useWhmPlans } from "../../../../lib/hooks/use-whm-accounts";
import type { WhmCreateAccountInput } from "../../../../lib/schemas/whm-create-account";
import type { Plan } from "../../../../lib/api";

export default function CreateAccountPage() {
  const router = useRouter();
  const { data: plans = [] } = useWhmPlans();
  const createMutation = useCreateWhmAccount();

  const [form, setForm] = useState<WhmCreateAccountInput>({
    domain: "",
    username: "",
    password: "",
    email: "",
    planId: undefined,
    nameservers: {
      inheritRoot: true,
      ns1: "",
      ns2: "",
    },
    settings: {
      phpVersion: "8.2",
      shellAccess: false,
      nodejsEnabled: false,
      dockerEnabled: false
    }
  });

  const [feedback, setFeedback] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback("");
    try {
      await createMutation.mutateAsync(form);
      setFeedback("Account provisioned successfully.");
      setTimeout(() => router.push("/accounts"), 1500);
    } catch (error: unknown) {
      setFeedback(error instanceof Error ? error.message : "Failed to create account");
    }
  };

  const updateForm = (field: string, value: string | boolean | undefined) => {
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      setForm((prev: WhmCreateAccountInput) => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof WhmCreateAccountInput] as Record<string, unknown>),
          [child]: value
        }
      }));
    } else {
      setForm((prev: WhmCreateAccountInput) => ({ ...prev, [field]: value }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-4xl font-headline font-black text-white tracking-tighter uppercase italic">
          Provision New Instance
        </h1>
        <p className="text-zinc-500 text-sm font-mono tracking-widest mt-1">
          Define infrastructure parameters for the new node.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="glass-card p-8 space-y-8">
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Domain Name">
              <input 
                type="text" 
                placeholder="example.com"
                value={form.domain}
                onChange={(e) => updateForm("domain", e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50 transition-colors"
              />
            </FormField>
            <FormField label="Username">
              <input 
                type="text" 
                placeholder="user123"
                value={form.username}
                onChange={(e) => updateForm("username", e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50 transition-colors"
              />
            </FormField>
            <FormField label="Email Address">
              <input 
                type="email" 
                placeholder="admin@example.com"
                value={form.email}
                onChange={(e) => updateForm("email", e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50 transition-colors"
              />
            </FormField>
            <FormField label="Password">
              <input 
                type="password" 
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => updateForm("password", e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50 transition-colors"
              />
            </FormField>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Assign Plan">
              <select 
                value={form.planId || ""}
                onChange={(e) => updateForm("planId", e.target.value || undefined)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50 transition-colors appearance-none"
              >
                <option value="" className="bg-[#0A1221]">Select a resource plan</option>
                {plans.map((plan: Plan) => (
                  <option key={plan.id} value={plan.id} className="bg-[#0A1221]">
                    {plan.name} ({plan.disk_quota_mb}MB)
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="PHP Version">
              <select 
                value={form.settings.phpVersion}
                onChange={(e) => updateForm("settings.phpVersion", e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50 transition-colors appearance-none"
              >
                {["7.4", "8.0", "8.1", "8.2", "8.3"].map(v => (
                  <option key={v} value={v} className="bg-[#0A1221]">PHP Engine v{v}</option>
                ))}
              </select>
            </FormField>
          </section>

          <section className="pt-6 border-t border-white/5">
               <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4">Module Authorization</h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ToggleField label="Shell Access" active={form.settings.shellAccess} onClick={() => updateForm("settings.shellAccess", !form.settings.shellAccess)} />
                  <ToggleField label="Node.js Engine" active={form.settings.nodejsEnabled} onClick={() => updateForm("settings.nodejsEnabled", !form.settings.nodejsEnabled)} />
                  <ToggleField label="Docker Core" active={form.settings.dockerEnabled} onClick={() => updateForm("settings.dockerEnabled", !form.settings.dockerEnabled)} />
               </div>
          </section>
        </div>

        <div className="flex items-center justify-between">
           <Link href="/accounts" className="text-zinc-500 hover:text-white transition-colors text-sm uppercase font-black tracking-widest">
              Cancel Operation
           </Link>
           <button 
             type="submit" 
             disabled={createMutation.isPending}
             className="kinetic-gradient px-12 py-4 rounded-xl text-white font-black font-headline tracking-tight active:scale-95 transition-all shadow-xl shadow-primary/40 uppercase"
           >
             {createMutation.isPending ? "Syncing Clusters..." : "Authorize Provisioning"}
           </button>
        </div>

        {feedback && (
          <div className={`p-4 rounded-xl text-center text-sm font-black uppercase tracking-widest border ${
            feedback.includes("success") ? 'border-primary/40 text-primary bg-primary/5' : 'border-red-500/40 text-red-400 bg-red-400/5'
          }`}>
             {feedback}
          </div>
        )}
      </form>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">{label}</label>
      {children}
    </div>
  );
}

function ToggleField({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
        active ? 'bg-primary/10 border-primary/50 text-white' : 'bg-white/5 border-white/10 text-zinc-500 hover:border-white/20'
      }`}
    >
      <span className="text-xs font-black uppercase tracking-tight">{label}</span>
      <div className={`w-4 h-4 rounded-full border-2 ${active ? 'bg-primary border-primary pulse-glow' : 'border-zinc-700'}`}></div>
    </div>
  );
}
