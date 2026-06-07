"use client";
import React, { useState } from "react";

interface CronJob {
  id: string;
  interval: string;
  expression: string;
  command: string;
  status: "active" | "inactive";
}

export default function CronJobsPage() {
  const [cronJobs, setCronJobs] = useState<CronJob[]>([
    {
      id: "1",
      interval: "Cada Hora",
      expression: "0 * * * *",
      command: "php /home/user_starter/public_html/cron.php",
      status: "active"
    },
    {
      id: "2",
      interval: "Diario (Medianoche)",
      expression: "0 0 * * *",
      command: "python3 /home/user_starter/scripts/backup_db.py",
      status: "active"
    }
  ]);

  const [intervalName, setIntervalName] = useState("Cada Hora");
  const [cronExpression, setCronExpression] = useState("0 * * * *");
  const [command, setCommand] = useState("");

  const handleAddCron = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command || !cronExpression) return;
    setCronJobs([
      ...cronJobs,
      {
        id: Date.now().toString(),
        interval: intervalName,
        expression: cronExpression,
        command,
        status: "active"
      }
    ]);
    setCommand("");
    alert("Tarea programada añadida con éxito (Simulado).");
  };

  const handleDeleteCron = (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este cron job?")) {
      setCronJobs(cronJobs.filter((job) => job.id !== id));
    }
  };

  const handleIntervalSelect = (val: string) => {
    setIntervalName(val);
    switch (val) {
      case "Cada Minuto":
        setCronExpression("* * * * *");
        break;
      case "Cada 5 Minutos":
        setCronExpression("*/5 * * * *");
        break;
      case "Cada Hora":
        setCronExpression("0 * * * *");
        break;
      case "Cada Día (Medianoche)":
        setCronExpression("0 0 * * *");
        break;
      case "Cada Semana (Domingo)":
        setCronExpression("0 0 * * 0");
        break;
      case "Cada Mes":
        setCronExpression("0 0 1 * *");
        break;
      default:
        break;
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-10">
         <div className="space-y-1.5">
           <div className="flex items-center gap-3 mb-1">
              <span className="px-2.5 py-1 bg-[#00A3FF]/10 text-[#00A3FF] text-[10px] font-bold uppercase rounded-full tracking-wider">
                 Avanzado
              </span>
           </div>
           <h1 className="text-5xl font-black text-slate-900 uppercase">
             Tareas <span className="text-[#00A3FF]">Programadas</span>
           </h1>
           <p className="text-slate-500 text-sm font-medium mt-2">
             Automatiza la ejecución de scripts (Cron Jobs) a intervalos específicos en tu servidor.
           </p>
         </div>
      </header>

      {/* Add Cron Form */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden group">
         <form onSubmit={handleAddCron} className="relative z-10 space-y-6">
            <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-3">
              <span className="material-symbols-outlined text-[#00A3FF]">schedule</span>
              Añadir Nuevo Cron Job
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
               <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Frecuencia Común</label>
                  <select 
                    value={intervalName}
                    onChange={(e) => handleIntervalSelect(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold outline-none focus:border-[#00A3FF] focus:bg-white transition-all appearance-none"
                  >
                     <option value="Cada Minuto">Cada Minuto (* * * * *)</option>
                     <option value="Cada 5 Minutos">Cada 5 Minutos (*/5 * * * *)</option>
                     <option value="Cada Hora">Cada Hora (0 * * * *)</option>
                     <option value="Cada Día (Medianoche)">Cada Día (Medianoche) (0 0 * * *)</option>
                     <option value="Cada Semana (Domingo)">Cada Semana (Medianoche Domingo) (0 0 * * 0)</option>
                     <option value="Cada Mes">Cada Mes (1ro del mes a medianoche) (0 0 1 * *)</option>
                     <option value="Custom">Configuración Personalizada</option>
                  </select>
               </div>

               <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Expresión Cron</label>
                  <input 
                    type="text" 
                    placeholder="* * * * *"
                    value={cronExpression}
                    onChange={(e) => setCronExpression(e.target.value)}
                    disabled={intervalName !== "Custom"}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold outline-none focus:border-[#00A3FF] focus:bg-white transition-all shadow-inner font-mono text-sm"
                  />
               </div>

               <div className="space-y-3 md:col-span-3">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Comando a Ejecutar</label>
                  <div className="flex gap-4">
                     <input 
                       type="text" 
                       placeholder="ej: php /home/user_starter/public_html/cron.php"
                       value={command}
                       onChange={(e) => setCommand(e.target.value)}
                       required
                       className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold outline-none focus:border-[#00A3FF] focus:bg-white transition-all shadow-inner"
                     />
                     <button className="bg-[#00A3FF] px-10 rounded-2xl text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-[#00A3FF]/20 hover:bg-[#008EE0] active:scale-[0.98] transition-all">
                       Agregar Cron
                     </button>
                  </div>
               </div>
            </div>
         </form>
         <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-[#00A3FF]/5 blur-[100px] rounded-full"></div>
      </div>

      {/* Cron Jobs List */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm">
         <h3 className="text-sm font-black text-slate-900 uppercase mb-8 flex items-center gap-3 border-b border-slate-100 pb-6">
            <span className="material-symbols-outlined text-[#00A3FF]">list</span>
            Cron Jobs Configurados
         </h3>

         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400 font-black border-b border-slate-100">
                     <th className="p-5 pl-8">Frecuencia</th>
                     <th className="p-5">Expresión</th>
                     <th className="p-5">Comando</th>
                     <th className="p-5">Estado</th>
                     <th className="p-5 w-20 text-right pr-8">Acción</th>
                  </tr>
               </thead>
               <tbody>
                  {cronJobs.map((job) => (
                     <tr key={job.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td className="p-5 pl-8 font-black text-slate-900 text-sm">{job.interval}</td>
                        <td className="p-5 text-slate-500 font-bold font-mono text-xs">{job.expression}</td>
                        <td className="p-5 text-slate-700 font-mono text-xs">{job.command}</td>
                        <td className="p-5">
                           <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-200 text-emerald-600 bg-emerald-50">
                             {job.status === 'active' ? 'Activo' : 'Inactivo'}
                           </span>
                        </td>
                        <td className="p-5 text-right pr-8">
                           <button 
                             onClick={() => handleDeleteCron(job.id)}
                             className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm ml-auto"
                           >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                           </button>
                        </td>
                     </tr>
                  ))}
                  {cronJobs.length === 0 && (
                     <tr>
                        <td colSpan={5} className="p-10 text-center text-slate-400 font-bold uppercase text-[11px] tracking-widest">
                           No hay tareas programadas actualmente.
                        </td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
