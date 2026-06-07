"use client";
import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createDatabase } from "../../../../lib/api";
import { useRouter } from "next/navigation";

export default function DatabaseWizardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [dbName, setDbName] = useState("");
  const [dbPassword, setDbPassword] = useState("");

  const createMutation = useMutation({
    mutationFn: () => createDatabase(dbName, dbPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["odin", "databases"] });
      alert("Base de datos y usuario creados exitosamente mediante el asistente.");
      router.push("/databases");
    },
    onError: (err: any) => alert("Error al crear base de datos: " + err.message)
  });

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1 && dbName) {
      setStep(2);
    } else if (step === 2 && dbPassword) {
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    setStep(Math.max(1, step - 1));
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-10">
         <div className="space-y-1.5">
           <div className="flex items-center gap-3 mb-1">
              <span className="px-2.5 py-1 bg-[#00A3FF]/10 text-[#00A3FF] text-[10px] font-bold uppercase rounded-full tracking-wider">
                 Asistentes
              </span>
           </div>
           <h1 className="text-5xl font-black text-slate-900 uppercase">
             Asistente de <span className="text-[#00A3FF]">Base de Datos</span>
           </h1>
           <p className="text-slate-500 text-sm font-medium mt-2">
             Crea bases de datos y configura accesos de usuario paso a paso de forma guiada y segura.
           </p>
         </div>
      </header>

      {/* Progress Wizard Bar */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden">
         <div className="relative z-10 flex justify-between items-center max-w-2xl mx-auto mb-12">
            <div className="flex flex-col items-center">
               <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-black text-sm transition-all ${step >= 1 ? 'bg-[#00A3FF] border-[#00A3FF] text-white' : 'bg-white border-slate-200 text-slate-400'}`}>1</div>
               <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider mt-2.5">Crear Base</span>
            </div>
            <div className={`flex-1 h-0.5 mx-4 transition-all ${step >= 2 ? 'bg-[#00A3FF]' : 'bg-slate-100'}`}></div>
            <div className="flex flex-col items-center">
               <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-black text-sm transition-all ${step >= 2 ? 'bg-[#00A3FF] border-[#00A3FF] text-white' : 'bg-white border-slate-200 text-slate-400'}`}>2</div>
               <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider mt-2.5">Configurar Usuario</span>
            </div>
            <div className={`flex-1 h-0.5 mx-4 transition-all ${step >= 3 ? 'bg-[#00A3FF]' : 'bg-slate-100'}`}></div>
            <div className="flex flex-col items-center">
               <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-black text-sm transition-all ${step >= 3 ? 'bg-[#00A3FF] border-[#00A3FF] text-white' : 'bg-white border-slate-200 text-slate-400'}`}>3</div>
               <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider mt-2.5">Asociar Permisos</span>
            </div>
         </div>

         {/* Wizard steps content */}
         <div className="max-w-md mx-auto py-6">
            {step === 1 && (
              <form onSubmit={handleNextStep} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre de la Base de Datos</label>
                    <input 
                      type="text" 
                      placeholder="ej: catalog_prod"
                      value={dbName}
                      onChange={(e) => setDbName(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold text-sm outline-none focus:border-[#00A3FF] focus:bg-white transition-all shadow-inner"
                    />
                    <p className="text-[10px] text-slate-400 ml-2 font-medium">
                       El sistema antepondrá tu nombre de usuario para garantizar nombres únicos en el servidor.
                    </p>
                 </div>
                 
                 <button 
                   disabled={!dbName}
                   className="w-full bg-[#00A3FF] py-4 rounded-2xl text-white font-black uppercase tracking-widest text-[11px] hover:bg-[#008EE0] transition-colors disabled:opacity-40"
                 >
                    Siguiente Paso
                 </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleNextStep} className="space-y-6">
                 <div className="space-y-4">
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Base de Datos configurada</span>
                       <span className="text-sm font-bold text-slate-700 font-mono">[usuario]_{dbName}</span>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Contraseña del Usuario SQL</label>
                       <input 
                         type="password" 
                         placeholder="Ingresa una clave segura"
                         value={dbPassword}
                         onChange={(e) => setDbPassword(e.target.value)}
                         required
                         className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold text-sm outline-none focus:border-[#00A3FF] focus:bg-white transition-all shadow-inner"
                       />
                       <p className="text-[10px] text-slate-400 ml-2 font-medium">
                          El usuario administrador para esta base se creará automáticamente.
                       </p>
                    </div>
                 </div>

                 <div className="flex gap-4">
                    <button 
                      type="button" 
                      onClick={handlePrevStep}
                      className="flex-1 bg-slate-100 py-4 rounded-2xl text-slate-700 font-black uppercase tracking-widest text-[11px] hover:bg-slate-200 transition-colors"
                    >
                       Atrás
                    </button>
                    <button 
                      disabled={!dbPassword}
                      className="flex-1 bg-[#00A3FF] py-4 rounded-2xl text-white font-black uppercase tracking-widest text-[11px] hover:bg-[#008EE0] transition-colors disabled:opacity-40"
                    >
                       Siguiente
                    </button>
                 </div>
              </form>
            )}

            {step === 3 && (
              <div className="space-y-8">
                 <h3 className="text-base font-black text-slate-900 uppercase">Resumen y Confirmación de Privilegios</h3>
                 
                 <div className="space-y-4 border-y border-slate-100 py-6">
                    <div className="flex justify-between items-center">
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Base de Datos</span>
                       <span className="text-xs font-bold text-slate-800 font-mono">[usuario]_{dbName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Usuario MySQL</span>
                       <span className="text-xs font-bold text-slate-800 font-mono">[usuario]_usr[id]</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Privilegios</span>
                       <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">ALL PRIVILEGES</span>
                    </div>
                 </div>

                 <div className="flex gap-4">
                    <button 
                      type="button" 
                      onClick={handlePrevStep}
                      disabled={createMutation.isPending}
                      className="flex-1 bg-slate-100 py-4 rounded-2xl text-slate-700 font-black uppercase tracking-widest text-[11px] hover:bg-slate-200 transition-colors"
                    >
                       Atrás
                    </button>
                    <button 
                      onClick={() => createMutation.mutate()}
                      disabled={createMutation.isPending}
                      className="flex-1 bg-[#00A3FF] py-4 rounded-2xl text-white font-black uppercase tracking-widest text-[11px] shadow-xl shadow-[#00A3FF]/20 hover:bg-[#008EE0] active:scale-[0.98] transition-all"
                    >
                       {createMutation.isPending ? "Configurando..." : "Finalizar y Crear"}
                    </button>
                 </div>
              </div>
            )}
         </div>
      </div>
    </div>
  );
}
