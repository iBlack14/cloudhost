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
    isReseller: false,
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
      setFeedback("Instancia provisionada exitosamente.");
      setTimeout(() => router.push("/accounts"), 1500);
    } catch (error: unknown) {
      setFeedback(error instanceof Error ? error.message : "Fallo al crear la cuenta");
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
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 mb-1">
             <span className="px-2.5 py-1 bg-[#00A3FF]/10 text-[#00A3FF] text-[10px] font-bold uppercase rounded-full tracking-wider">
                Despliegue de Infraestructura
             </span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 uppercase">
            Provisionar <span className="text-[#00A3FF]">Instancia</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-2">
            Define los parámetros técnicos para el nuevo nodo de alojamiento.
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-10">
        <div className="bg-white border border-slate-200 rounded-[3rem] p-12 shadow-sm space-y-12 relative overflow-hidden">
          <div className="absolute top-[-10%] right-[-5%] w-64 h-64 bg-[#00A3FF]/5 rounded-full blur-[80px] pointer-events-none"></div>
          
          <section className="space-y-8 relative z-10">
            <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-widest px-2 flex items-center gap-2">
               <span className="material-symbols-outlined text-[18px]">dns</span>
               Configuración de Dominio y Acceso
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <FormField label="Nombre de Dominio">
                <input 
                  type="text" 
                  placeholder="ejemplo.com"
                  value={form.domain}
                  onChange={(e) => updateForm("domain", e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold text-sm outline-none focus:border-[#00A3FF] focus:bg-white transition-all shadow-inner placeholder-slate-300"
                />
              </FormField>
              <FormField label="Nombre de Usuario">
                <input 
                  type="text" 
                  placeholder="usuario123"
                  value={form.username}
                  onChange={(e) => updateForm("username", e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold text-sm outline-none focus:border-[#00A3FF] focus:bg-white transition-all shadow-inner placeholder-slate-300"
                />
              </FormField>
              <FormField label="Correo de Contacto">
                <input 
                  type="email" 
                  placeholder="admin@ejemplo.com"
                  value={form.email}
                  onChange={(e) => updateForm("email", e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold text-sm outline-none focus:border-[#00A3FF] focus:bg-white transition-all shadow-inner placeholder-slate-300"
                />
              </FormField>
              <FormField label="Contraseña del Sistema">
                <input 
                  type="password" 
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => updateForm("password", e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold text-sm outline-none focus:border-[#00A3FF] focus:bg-white transition-all shadow-inner placeholder-slate-300"
                />
              </FormField>
            </div>
          </section>

          <section className="space-y-8 relative z-10 pt-10 border-t border-slate-100">
            <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-widest px-2 flex items-center gap-2">
               <span className="material-symbols-outlined text-[18px]">equalizer</span>
               Recursos y Entorno
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <FormField label="Asignar Plan de Recursos">
                <select 
                  value={form.planId || ""}
                  onChange={(e) => updateForm("planId", e.target.value || undefined)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold text-sm outline-none focus:border-[#00A3FF] focus:bg-white transition-all shadow-inner cursor-pointer appearance-none"
                >
                  <option value="">Selecciona un plan de cuota</option>
                  {plans.map((plan: Plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} ({plan.disk_quota_mb}MB NVMe)
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Versión de Motor PHP">
                <select 
                  value={form.settings.phpVersion}
                  onChange={(e) => updateForm("settings.phpVersion", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold text-sm outline-none focus:border-[#00A3FF] focus:bg-white transition-all shadow-inner cursor-pointer appearance-none"
                >
                  {["7.4", "8.0", "8.1", "8.2", "8.3", "8.4"].map(v => (
                    <option key={v} value={v}>PHP Engine v{v}</option>
                  ))}
                </select>
              </FormField>
            </div>
          </section>

          <section className="pt-10 border-t border-slate-100 relative z-10">
               <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-widest mb-8 px-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">verified_user</span>
                  Autorización de Módulos
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <ToggleField label="Acceso Shell (SSH)" active={form.settings.shellAccess} onClick={() => updateForm("settings.shellAccess", !form.settings.shellAccess)} icon="terminal" />
                  <ToggleField label="Motor Node.js" active={form.settings.nodejsEnabled} onClick={() => updateForm("settings.nodejsEnabled", !form.settings.nodejsEnabled)} icon="javascript" />
                  <ToggleField label="Docker Core" active={form.settings.dockerEnabled} onClick={() => updateForm("settings.dockerEnabled", !form.settings.dockerEnabled)} icon="settings_input_component" />
               </div>
          </section>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-4">
           <Link href="/accounts" className="text-slate-400 hover:text-slate-900 transition-all text-[11px] uppercase font-black tracking-widest flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Cancelar Operación
           </Link>
           <button 
             type="submit" 
             disabled={createMutation.isPending}
             className="bg-[#00A3FF] px-14 py-5 rounded-2xl text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-[#00A3FF]/20 hover:bg-[#008EE0] active:scale-[0.98] transition-all disabled:opacity-40 flex items-center gap-3"
           >
             <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
             {createMutation.isPending ? "Sincronizando Clusters..." : "Autorizar Provisionamiento"}
           </button>
        </div>

        {feedback && (
          <div className={`p-6 rounded-[2rem] text-center text-[10px] font-black uppercase tracking-[0.2em] border animate-in zoom-in-95 duration-300 ${
            feedback.includes("exitosamente") 
            ? 'border-[#00A3FF]/20 text-[#00A3FF] bg-[#00A3FF]/5 shadow-lg shadow-[#00A3FF]/5' 
            : 'border-red-200 text-red-500 bg-red-50'
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
    <div className="space-y-3">
      <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2 block">{label}</label>
      {children}
    </div>
  );
}

function ToggleField({ label, active, onClick, icon }: { label: string; active: boolean; onClick: () => void; icon: string }) {
  return (
    <div 
      onClick={onClick}
      className={`p-6 rounded-2xl border cursor-pointer transition-all flex items-center justify-between group ${
        active 
        ? 'bg-[#00A3FF]/5 border-[#00A3FF]/30 text-[#00A3FF] shadow-sm shadow-[#00A3FF]/10' 
        : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-[#00A3FF]/30 hover:bg-white'
      }`}
    >
      <div className="flex items-center gap-3">
         <span className={`material-symbols-outlined text-[20px] ${active ? 'text-[#00A3FF]' : 'text-slate-300 group-hover:text-[#00A3FF]'} transition-colors`}>{icon}</span>
         <span className={`text-[10px] font-black uppercase tracking-tight ${active ? 'text-[#00A3FF]' : 'text-slate-500'} transition-colors`}>{label}</span>
      </div>
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${active ? 'bg-[#00A3FF] border-[#00A3FF]' : 'border-slate-300'}`}>
         {active && <span className="material-symbols-outlined text-white text-[12px] font-bold">check</span>}
      </div>
    </div>
  );
}
