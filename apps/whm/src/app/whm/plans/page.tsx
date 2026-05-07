"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useWhmPlans } from "../../../lib/hooks/use-whm-accounts";
import { getWhmRole } from "../../../lib/api";

interface Plan {
  id: string;
  name: string;
  disk_quota_mb: number;
  bandwidth_mb: number;
}

export default function WhmPlansPage() {
  const plansQuery = useWhmPlans();
  const [localPlans, setLocalPlans] = useState<Plan[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const role = mounted ? getWhmRole() : null;
  const isAdmin = role === "admin";

  const plans = plansQuery.data || localPlans;

  const openCreateModal = () => {
    setEditingPlan({
      id: `plan-${Math.random().toString(36).substr(2, 5)}`,
      name: "",
      disk_quota_mb: 5120,
      bandwidth_mb: 51200
    });
    setIsModalOpen(true);
  };

  const openEditModal = (plan: Plan) => {
    setEditingPlan({ ...plan });
    setIsModalOpen(true);
  };

  const savePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setLocalPlans(prev => {
       if (prev.find(p => p.id === editingPlan.id)) {
          return prev.map(p => p.id === editingPlan.id ? editingPlan : p);
       }
       return [...prev, editingPlan];
    });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 max-w-7xl mx-auto relative">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 mb-1">
             <span className="px-2 py-0.5 bg-[#00A3FF]/10 text-[#00A3FF] text-[9px] font-bold uppercase rounded border border-[#00A3FF]/20 tracking-widest">
                {isAdmin ? 'Maestro de Recursos' : 'Distribución de Recursos'}
             </span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">
            {isAdmin ? 'Paquetes y ' : 'Mis '} <span className="text-[#00A3FF]">Planes</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium tracking-tight mt-2">
            {isAdmin 
              ? 'Configure las asignaciones de recursos y los niveles de facturación del sistema.'
              : 'Gestione los planes personalizados que ofrece a sus propios clientes.'}
          </p>
        </div>
        <button 
          onClick={openCreateModal}
          className="bg-[#00A3FF] px-8 py-4 rounded-2xl text-white font-bold tracking-widest active:scale-95 transition-all shadow-xl shadow-[#00A3FF]/20 uppercase text-xs"
        >
          + Crear Nuevo Plan
        </button>
      </header>

      {plansQuery.isLoading && plans.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {[1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-slate-200 rounded-[2.5rem] h-96 p-8 animate-pulse flex flex-col justify-between shadow-sm">
                 <div className="space-y-4">
                    <div className="h-4 w-1/3 bg-slate-100 rounded"></div>
                    <div className="h-8 w-2/3 bg-slate-100 rounded"></div>
                 </div>
                 <div className="h-32 w-full bg-slate-100 rounded"></div>
              </div>
           ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-10 group hover:translate-y-[-8px] hover:border-[#00A3FF]/30 transition-all duration-500 relative overflow-hidden flex flex-col shadow-sm hover:shadow-lg">
              <div className="flex justify-between items-start mb-12 relative z-10">
                <div>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-2">Alias Técnico: {plan.id.split('-')[0]}</span>
                   <h3 className="text-3xl font-black text-slate-900 tracking-tighter group-hover:text-[#00A3FF] transition-colors uppercase">{plan.name}</h3>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-[#00A3FF] group-hover:text-white transition-all shadow-sm">
                   <span className="material-symbols-outlined">settings_suggest</span>
                </div>
              </div>

              <div className="space-y-4 flex-1 relative z-10">
                 <ResourceItem label="Cuota de Disco" value={`${plan.disk_quota_mb / 1024} GB`} detail="Almacenamiento NVMe" />
                 <ResourceItem label="Ancho de Banda" value={plan.bandwidth_mb === -1 ? 'Ilimitado' : `${plan.bandwidth_mb / 1024} GB`} detail="CDN Global Edge" />
                 <ResourceItem label="Nodos Permitidos" value="Instancia Única" detail="Contenedor Aislado" />
              </div>

              <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between items-center relative z-10">
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nodos activos: 0</span>
                 <button 
                  onClick={() => openEditModal(plan)}
                  className="text-[#00A3FF] text-[10px] font-bold uppercase tracking-widest hover:underline"
                 >
                   Editar Plan
                 </button>
              </div>

              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#00A3FF]/5 blur-[100px] rounded-full pointer-events-none group-hover:bg-[#00A3FF]/10 transition-all duration-700"></div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && editingPlan && (
        <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
           <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
              <header className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Configuración del Paquete</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Defina los límites de alojamiento</p>
                 </div>
                 <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-all">
                    <span className="material-symbols-outlined">close</span>
                 </button>
              </header>

              <form onSubmit={savePlan} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                 <div className="space-y-6">
                    <div className="space-y-3">
                       <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Paquete</label>
                       <input 
                        required
                        value={editingPlan.name}
                        onChange={(e) => setEditingPlan({...editingPlan, name: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 text-sm font-bold text-slate-900 focus:border-[#00A3FF]/50 outline-none transition-all shadow-inner" 
                        placeholder="Ej: Starter Plan"
                       />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-3">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Espacio Disco (MB)</label>
                          <input 
                            type="number"
                            value={editingPlan.disk_quota_mb}
                            onChange={(e) => setEditingPlan({...editingPlan, disk_quota_mb: parseInt(e.target.value)})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 text-sm font-bold text-slate-900 focus:border-[#00A3FF]/50 outline-none transition-all shadow-inner" 
                          />
                       </div>
                       <div className="space-y-3">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Ancho de Banda (MB)</label>
                          <input 
                            type="number"
                            value={editingPlan.bandwidth_mb}
                            onChange={(e) => setEditingPlan({...editingPlan, bandwidth_mb: parseInt(e.target.value)})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 text-sm font-bold text-slate-900 focus:border-[#00A3FF]/50 outline-none transition-all shadow-inner" 
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
                  className="flex-[2] px-6 py-4 rounded-xl bg-[#00A3FF] text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-[#00A3FF]/20 active:scale-95 transition-all"
                 >
                   Guardar Paquete
                 </button>
              </footer>
           </div>
        </div>
      )}
    </div>
  );
}

function ResourceItem({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="flex justify-between items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all">
       <div>
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">{label}</span>
          <span className="text-slate-900 font-bold text-lg leading-tight">{value}</span>
       </div>
       <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter self-end mb-1">{detail}</span>
    </div>
  );
}
