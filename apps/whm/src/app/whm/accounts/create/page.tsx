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
  isReseller: false,
  resellerConfig: {
    maxAccounts: -1,
    limitDiskMb: -1,
  },
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

const RESELLER_PLANS = [
  { id: "res-bronze", name: "Reseller Bronze", maxAccounts: 10, limitDiskMb: 102400 },
  { id: "res-silver", name: "Reseller Silver", maxAccounts: 50, limitDiskMb: 512000 },
  { id: "res-gold", name: "Reseller Gold", maxAccounts: -1, limitDiskMb: 2097152 },
];

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

    if (name === "isReseller") {
      setForm(prev => ({ 
        ...prev, 
        isReseller: checked,
        planId: "", // Reset plan when toggling type
        resellerConfig: checked ? { maxAccounts: -1, limitDiskMb: -1 } : prev.resellerConfig
      }));
      return;
    }

    if (name === "durationMonths") {
      const val = value === "" ? undefined : parseInt(value, 10);
      setForm(prev => ({ 
        ...prev, 
        durationMonths: val
      }));
      return;
    }

    if (name === "planId") {
       const selectedPlanId = value;
       let updatedResellerConfig = form.resellerConfig;

       if (form.isReseller) {
          const plan = RESELLER_PLANS.find(p => p.id === selectedPlanId);
          if (plan) {
             updatedResellerConfig = {
                maxAccounts: plan.maxAccounts,
                limitDiskMb: plan.limitDiskMb
             };
          }
       }

       setForm(prev => ({ 
          ...prev, 
          planId: selectedPlanId,
          resellerConfig: updatedResellerConfig
       }));
       return;
    }

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

    if (name.startsWith("resellerConfig.")) {
      const key = name.replace("resellerConfig.", "") as keyof NonNullable<WhmCreateAccountInput["resellerConfig"]>;
      setForm((prev: WhmCreateAccountInput) => ({
        ...prev,
        resellerConfig: {
          ...prev.resellerConfig!,
          [key]: type === "number" ? parseInt(value) : value
        }
      }));
      return;
    }

    setForm((prev: WhmCreateAccountInput) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
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
          return parsed.map((e: any) => e.message || e.MESSAGE || "Error de validación").join(" • ");
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

      setFeedback(`SUCCESS: Cuenta creada con éxito. ID: ${data.accountId}`);
      setForm(defaultForm);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Error al crear la cuenta");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-700">
      <header className="space-y-1.5 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2 mb-1">
           <span className="px-2 py-0.5 bg-[#00A3FF]/10 text-[#00A3FF] text-[9px] font-bold uppercase rounded-full tracking-wider">Gestión de Clientes</span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 uppercase">
          Crear Nueva <span className="text-[#00A3FF]">Cuenta</span>
        </h1>
        <p className="text-slate-500 text-xs font-medium">
          Complete los datos para dar de alta un nuevo servicio de alojamiento.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ProField label="Nombre del Dominio">
               <input 
                name="domain"
                type="text" 
                placeholder="ejemplo.com"
                value={form.domain}
                onChange={onInputChange}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-[#00A3FF]/50 focus:bg-white transition-all placeholder:text-slate-300 shadow-inner"
              />
            </ProField>
            <ProField label="Nombre de Usuario">
              <input 
                name="username"
                type="text" 
                placeholder="usuario_admin"
                value={form.username}
                onChange={onInputChange}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-[#00A3FF]/50 focus:bg-white transition-all placeholder:text-slate-300 shadow-inner"
              />
            </ProField>
            <ProField label="Correo Electrónico">
              <input 
                name="email"
                type="email" 
                placeholder="correo@odisea.cloud"
                value={form.email}
                onChange={onInputChange}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-[#00A3FF]/50 focus:bg-white transition-all placeholder:text-slate-300 shadow-inner"
              />
            </ProField>
            <ProField label="Contraseña de Acceso">
              <div className="relative">
                <input 
                  name="password"
                  type="text" 
                  placeholder="Escriba o genere una clave"
                  value={form.password}
                  onChange={onInputChange}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-[#00A3FF]/50 focus:bg-white transition-all pr-12 font-mono shadow-inner"
                />
                <button 
                  type="button"
                  onClick={generatePassword}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all text-slate-400 hover:text-[#00A3FF] shadow-sm"
                  title="Generar Contraseña"
                >
                  <span className="material-symbols-outlined text-[16px]">key</span>
                </button>
              </div>
            </ProField>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-slate-100">
            <ProField label="Plan de Alojamiento">
              <select 
                name="planId"
                value={form.planId ?? ""}
                onChange={onInputChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-[#00A3FF]/50 focus:bg-white transition-all appearance-none shadow-inner"
              >
                <option value="">Seleccionar un Plan</option>
                {form.isReseller ? (
                   RESELLER_PLANS.map(plan => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} (Límite: {plan.maxAccounts === -1 ? 'Ilimitado' : plan.maxAccounts} cuentas)
                      </option>
                   ))
                ) : (
                  (plansQuery.data ?? []).map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} ({plan.disk_quota_mb}MB SSD)
                    </option>
                  ))
                )}
              </select>
            </ProField>
            <ProField label="Periodo de Suscripción">
              <select 
                name="durationMonths"
                value={form.durationMonths ?? ""}
                onChange={onInputChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-[#00A3FF]/50 focus:bg-white transition-all appearance-none shadow-inner"
              >
                <option value="">Sin Expiración / Ilimitado</option>
                <option value="1">1 Mes</option>
                <option value="3">3 Meses</option>
                <option value="6">6 Meses</option>
                <option value="12">1 Año</option>
                <option value="24">2 Años</option>
              </select>
            </ProField>
            <ProField label="Versión de PHP">
              <select 
                name="settings.phpVersion"
                value={form.settings.phpVersion}
                onChange={onInputChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-[#00A3FF]/50 focus:bg-white transition-all appearance-none shadow-inner"
              >
                {["7.4", "8.0", "8.1", "8.2", "8.3", "8.4"].map(v => (
                  <option key={v} value={v}>PHP v{v}</option>
                ))}
              </select>
            </ProField>
          </section>

          <section className="pt-6 border-t border-slate-100 space-y-6">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-0.5">
                   <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Privilegios de Cuenta</h3>
                   <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Configurar accesos de administrador/revendedor</p>
                </div>
                <div className="flex items-center gap-6">
                   <label className="flex items-center gap-3 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        name="isReseller" 
                        checked={form.isReseller} 
                        onChange={onInputChange}
                        className="hidden"
                      />
                      <div className={`w-10 h-6 rounded-full relative transition-all duration-300 ${form.isReseller ? 'bg-[#00A3FF]' : 'bg-slate-200'}`}>
                         <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${form.isReseller ? 'left-5' : 'left-1'}`}></div>
                      </div>
                      <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors uppercase tracking-tight">Habilitar Reseller (WHM)</span>
                   </label>
                   
                   <label className="flex items-center gap-3 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        name="nameservers.inheritRoot" 
                        checked={form.nameservers.inheritRoot} 
                        onChange={onInputChange}
                        className="hidden"
                      />
                      <div className={`w-4.5 h-4.5 rounded border-2 transition-all flex items-center justify-center ${form.nameservers.inheritRoot ? 'bg-slate-900 border-slate-900' : 'border-slate-300 bg-white'}`}>
                         {form.nameservers.inheritRoot && <span className="material-symbols-outlined text-white text-[12px] font-bold">check</span>}
                      </div>
                      <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors uppercase tracking-tight">Heredar DNS Root</span>
                   </label>
                </div>
             </div>

             {form.isReseller && !form.planId && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 animate-in slide-in-from-top-4 duration-300">
                   <ProField label="Límite de Cuentas (-1 = Ilimitado)">
                      <input 
                        name="resellerConfig.maxAccounts"
                        type="number"
                        value={form.resellerConfig?.maxAccounts}
                        onChange={onInputChange}
                        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-[#00A3FF]/50 shadow-inner"
                      />
                   </ProField>
                   <ProField label="Límite de Disco MB (-1 = Ilimitado)">
                      <input 
                        name="resellerConfig.limitDiskMb"
                        type="number"
                        value={form.resellerConfig?.limitDiskMb}
                        onChange={onInputChange}
                        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-[#00A3FF]/50 shadow-inner"
                      />
                   </ProField>
                </div>
             )}

             <div className="space-y-3">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block px-1">Módulos de Sistema</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                   <ModuleToggle 
                     label="Acceso SSH" 
                     active={form.settings.shellAccess} 
                     onClick={() => setForm((prev: WhmCreateAccountInput) => ({ ...prev, settings: { ...prev.settings, shellAccess: !prev.settings.shellAccess } }))} 
                   />
                   <ModuleToggle 
                     label="Soporte Node.js" 
                     active={form.settings.nodejsEnabled} 
                     onClick={() => setForm((prev: WhmCreateAccountInput) => ({ ...prev, settings: { ...prev.settings, nodejsEnabled: !prev.settings.nodejsEnabled } }))} 
                   />
                   <ModuleToggle 
                     label="Contenedores Docker" 
                     active={form.settings.dockerEnabled} 
                     onClick={() => setForm((prev: WhmCreateAccountInput) => ({ ...prev, settings: { ...prev.settings, dockerEnabled: !prev.settings.dockerEnabled } }))} 
                   />
                </div>
             </div>
          </section>
        </div>

        <div className="flex items-center justify-between pt-2">
           <Link href="/whm/accounts">
              <button type="button" className="text-slate-400 hover:text-slate-600 transition-colors text-xs font-bold uppercase tracking-widest">
                Volver al listado
              </button>
           </Link>
           <button 
             type="submit" 
             disabled={!canSubmit || isSaving}
             className="bg-[#00A3FF] px-6 py-2.5 rounded-lg text-white font-bold text-xs tracking-widest uppercase shadow-lg shadow-[#00A3FF]/20 active:translate-y-[1px] transition-all disabled:opacity-40"
           >
             {isSaving ? "Creando Cuenta..." : "Guardar y Crear Cuenta"}
           </button>
        </div>

        {feedback && (
          <div className={`p-4 rounded-xl text-center text-sm font-bold border animate-in fade-in slide-in-from-bottom-2 flex items-center justify-center gap-4 ${
            feedback.startsWith("SUCCESS") ? 'border-[#00A3FF]/20 text-[#00A3FF] bg-[#00A3FF]/5' : 'border-red-200 text-red-600 bg-red-50'
          }`}>
             <span className="material-symbols-outlined text-[20px]">
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
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block ml-0.5">{label}</label>
      {children}
    </div>
  );
}

function ModuleToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`p-3 py-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between group shadow-sm ${
        active 
          ? 'bg-[#00A3FF]/5 border-[#00A3FF]/30 text-slate-900' 
          : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-200'
      }`}
    >
      <span className="text-xs font-bold uppercase tracking-tight">{label}</span>
      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${active ? 'bg-[#00A3FF] border-[#00A3FF]' : 'border-slate-300 bg-white'}`}>
         {active && <span className="material-symbols-outlined text-[10px] text-white font-bold">check</span>}
      </div>
    </div>
  );
}
