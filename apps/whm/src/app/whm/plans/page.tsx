"use client";

import React from "react";
import Link from "next/link";
import { useWhmPlans } from "../../../lib/hooks/use-whm-accounts";

export default function WhmPlansPage() {
  const { data: plans = [], isLoading, isError } = useWhmPlans();

  return (
    <div className="space-y-12 animate-in fade-in duration-700 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 mb-1">
             <span className="px-2 py-0.5 bg-[#00A3FF]/10 text-[#00A3FF] text-[9px] font-bold uppercase rounded border border-[#00A3FF]/20 tracking-widest">
                Niveles de Servicio
             </span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">
            Paquetes y <span className="text-[#00A3FF]">Planes</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium tracking-tight mt-2">
            Configure las asignaciones de recursos y los niveles de facturación del sistema.
          </p>
        </div>
        <button className="bg-[#00A3FF] px-8 py-4 rounded-2xl text-white font-bold tracking-widest active:scale-95 transition-all shadow-xl shadow-[#00A3FF]/20 uppercase text-xs">
          + Crear Nuevo Plan
        </button>
      </header>

      {isLoading ? (
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
      ) : isError ? (
        <div className="p-20 bg-white border border-slate-200 rounded-[2.5rem] text-center shadow-sm">
           <span className="material-symbols-outlined text-4xl text-red-500 mb-4">warning</span>
           <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Fallo al sincronizar los clústeres de planes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-10 group hover:translate-y-[-8px] hover:border-[#00A3FF]/30 transition-all duration-500 relative overflow-hidden flex flex-col shadow-sm hover:shadow-lg">
              <div className="flex justify-between items-start mb-12 relative z-10">
                <div>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-2">Alias Técnico: {plan.id.split('-')[0]}</span>
                   <h3 className="text-3xl font-black text-slate-900 tracking-tighter group-hover:text-[#00A3FF] transition-colors">{plan.name}</h3>
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
                 <button className="text-[#00A3FF] text-[10px] font-bold uppercase tracking-widest hover:underline">Editar Plan</button>
              </div>

              {/* Decorative Glow */}
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#00A3FF]/5 blur-[100px] rounded-full pointer-events-none group-hover:bg-[#00A3FF]/10 transition-all duration-700"></div>
            </div>
          ))}
          
          <div className="bg-slate-50 border-dashed border-2 border-slate-200 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center group cursor-pointer hover:border-[#00A3FF]/50 transition-all">
             <div className="w-16 h-16 rounded-full bg-white border border-slate-100 flex items-center justify-center mb-6 group-hover:bg-[#00A3FF]/10 group-hover:border-[#00A3FF]/20 transition-all shadow-sm">
                <span className="material-symbols-outlined text-slate-400 group-hover:text-[#00A3FF]">add</span>
             </div>
             <h3 className="text-sm font-bold text-slate-600 uppercase tracking-widest">Nuevo Paquete</h3>
             <p className="text-[10px] text-slate-400 mt-2 uppercase font-medium">Defina límites personalizados para nuevos usuarios</p>
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
