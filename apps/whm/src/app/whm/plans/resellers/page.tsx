"use client";

import React, { useState, useEffect } from "react";
import { getWhmRole } from "../../../../lib/api";

interface ResellerPlan {
  id: string;
  name: string;
  maxAccounts: number;
  totalDiskGb: number;
  price: number;
  activeResellers: number;
  overselling: boolean;
  apiAccess: boolean;
}

const initialPlans: ResellerPlan[] = [
  {
    id: "res-bronze",
    name: "Reseller Bronze",
    maxAccounts: 10,
    totalDiskGb: 100,
    price: 29.99,
    activeResellers: 0,
    overselling: false,
    apiAccess: true
  },
  {
    id: "res-silver",
    name: "Reseller Silver",
    maxAccounts: 50,
    totalDiskGb: 500,
    price: 89.99,
    activeResellers: 0,
    overselling: true,
    apiAccess: true
  },
  {
    id: "res-gold",
    name: "Reseller Gold",
    maxAccounts: -1,
    totalDiskGb: 2048,
    price: 199.99,
    activeResellers: 0,
    overselling: true,
    apiAccess: true
  }
];

export default function ResellerPlansPage() {
  const [plans, setPlans] = useState<ResellerPlan[]>(initialPlans);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ResellerPlan | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  const role = mounted ? getWhmRole() : null;
  const isAdmin = role === "admin";

  if (!mounted) return null;

  const openCreateModal = () => {
    setEditingPlan({
      id: `res-${Math.random().toString(36).substr(2, 5)}`,
      name: "",
      maxAccounts: 10,
      totalDiskGb: 100,
      price: 0,
      activeResellers: 0,
      overselling: false,
      apiAccess: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (plan: ResellerPlan) => {
    setEditingPlan({ ...plan });
    setIsModalOpen(true);
  };

  const savePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    if (plans.find(p => p.id === editingPlan.id)) {
      setPlans(plans.map(p => p.id === editingPlan.id ? editingPlan : p));
    } else {
      setPlans([...plans, editingPlan]);
    }
    setIsModalOpen(false);
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
         <span className="material-symbols-outlined text-6xl text-slate-200">lock</span>
         <h2 className="text-2xl font-black text-slate-900 uppercase">Acceso Restringido</h2>
         <p className="text-slate-500 max-w-md">Esta sección es exclusiva para administradores root del sistema.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-700 max-w-7xl mx-auto relative">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 mb-1">
             <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 text-[10px] font-bold uppercase rounded-full tracking-wider border border-emerald-500/20">
                Alianzas Estratégicas
             </span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">
            Planes de <span className="text-emerald-500">Reseller</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium tracking-tight mt-2">
            Defina los paquetes de revendedor con límites de cuentas y recursos de infraestructura.
          </p>
        </div>
        <button 
          onClick={openCreateModal}
          className="bg-emerald-500 px-8 py-4 rounded-2xl text-white font-bold tracking-widest active:scale-95 transition-all shadow-xl shadow-emerald-500/20 uppercase text-xs"
        >
          + Crear Paquete Reseller
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white border border-slate-200 rounded-[3rem] p-10 group hover:border-emerald-500/30 transition-all duration-500 relative overflow-hidden flex flex-col shadow-sm hover:shadow-xl">
            <div className="flex justify-between items-start mb-12 relative z-10">
               <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-inner">
                  <span className="material-symbols-outlined text-3xl">hub</span>
               </div>
               <div className="text-right">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Desde</span>
                  <div className="text-2xl font-black text-slate-900">${plan.price}<span className="text-sm text-slate-400 font-bold">/mes</span></div>
               </div>
            </div>

            <div className="mb-10 relative z-10">
               <h3 className="text-3xl font-black text-slate-900 tracking-tight uppercase group-hover:text-emerald-500 transition-colors">{plan.name}</h3>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">ID: {plan.id}</p>
            </div>

            <div className="space-y-4 flex-1 relative z-10">
               <LimitItem icon="group" label="Límite de Cuentas" value={plan.maxAccounts === -1 ? 'Ilimitado' : `${plan.maxAccounts} Cuentas`} />
               <LimitItem icon="database" label="Espacio Total" value={`${plan.totalDiskGb} GB NVMe`} />
               <LimitItem icon="speed" label="Overselling" value={plan.overselling ? "Permitido" : "Restringido"} />
               <LimitItem icon="api" label="Acceso API" value={plan.apiAccess ? "Activado" : "Desactivado"} />
            </div>

            <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between items-center relative z-10">
               <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{plan.activeResellers} Revendedores Activos</span>
               </div>
               <button 
                onClick={() => openEditModal(plan)}
                className="text-emerald-500 text-[10px] font-black uppercase tracking-widest hover:underline"
               >
                 Configurar
               </button>
            </div>

            {/* Decorative Element */}
            <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none group-hover:bg-emerald-500/10 transition-all duration-1000"></div>
          </div>
        ))}

      </div>

      {/* Modal / Slide-over */}
      {isModalOpen && editingPlan && (
        <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
           <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
              <header className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Configuración del Plan</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Defina los parámetros del socio</p>
                 </div>
                 <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-all">
                    <span className="material-symbols-outlined">close</span>
                 </button>
              </header>

              <form onSubmit={savePlan} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                 <div className="space-y-6">
                    <FormField label="Nombre del Plan">
                       <input 
                        required
                        value={editingPlan.name}
                        onChange={(e) => setEditingPlan({...editingPlan, name: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 text-sm font-bold text-slate-900 focus:border-emerald-500/50 outline-none transition-all shadow-inner" 
                        placeholder="Ej: Reseller Platinum"
                       />
                    </FormField>

                    <div className="grid grid-cols-2 gap-6">
                       <FormField label="Límite de Cuentas">
                          <input 
                            type="number"
                            value={editingPlan.maxAccounts}
                            onChange={(e) => setEditingPlan({...editingPlan, maxAccounts: parseInt(e.target.value)})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 text-sm font-bold text-slate-900 focus:border-emerald-500/50 outline-none transition-all shadow-inner" 
                          />
                       </FormField>
                       <FormField label="Espacio Disco (GB)">
                          <input 
                            type="number"
                            value={editingPlan.totalDiskGb}
                            onChange={(e) => setEditingPlan({...editingPlan, totalDiskGb: parseInt(e.target.value)})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 text-sm font-bold text-slate-900 focus:border-emerald-500/50 outline-none transition-all shadow-inner" 
                          />
                       </FormField>
                    </div>

                    <FormField label="Precio Mensual (USD)">
                       <input 
                        type="number"
                        step="0.01"
                        value={editingPlan.price}
                        onChange={(e) => setEditingPlan({...editingPlan, price: parseFloat(e.target.value)})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 text-sm font-bold text-slate-900 focus:border-emerald-500/50 outline-none transition-all shadow-inner" 
                       />
                    </FormField>

                    <div className="pt-6 border-t border-slate-100 space-y-4">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Opciones Avanzadas</span>
                       <div className="grid grid-cols-1 gap-4">
                          <ToggleOption 
                            label="Permitir Overselling" 
                            active={editingPlan.overselling} 
                            onClick={() => setEditingPlan({...editingPlan, overselling: !editingPlan.overselling})}
                          />
                          <ToggleOption 
                            label="Habilitar Acceso API" 
                            active={editingPlan.apiAccess} 
                            onClick={() => setEditingPlan({...editingPlan, apiAccess: !editingPlan.apiAccess})}
                          />
                       </div>
                    </div>
                 </div>
              </form>

              <footer className="p-8 border-t border-slate-100 bg-slate-50/50 flex gap-4">
                 <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-4 rounded-xl border border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-widest hover:bg-white transition-all"
                 >
                   Cancelar
                 </button>
                 <button 
                  onClick={savePlan}
                  className="flex-[2] px-6 py-4 rounded-xl bg-emerald-500 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                 >
                   Guardar Cambios
                 </button>
              </footer>
           </div>
        </div>
      )}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
       <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
       {children}
    </div>
  );
}

function ToggleOption({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between group ${active ? 'bg-emerald-50 border-emerald-500/30' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}
    >
       <span className={`text-xs font-bold uppercase tracking-tight ${active ? 'text-emerald-600' : 'text-slate-500'}`}>{label}</span>
       <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${active ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 bg-white'}`}>
          {active && <span className="material-symbols-outlined text-[12px] text-white font-bold">check</span>}
       </div>
    </div>
  );
}

function LimitItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100 group-hover:bg-white transition-all">
       <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm group-hover:border-emerald-100 transition-all">
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
       </div>
       <div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">{label}</span>
          <span className="text-slate-900 font-bold text-sm tracking-tight">{value}</span>
       </div>
    </div>
  );
}
