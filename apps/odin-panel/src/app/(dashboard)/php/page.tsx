"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOdinAccessToken } from "../../../lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

const authHeaders = (): Record<string, string> => {
  const t = getOdinAccessToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

interface PhpConfig {
  currentVersion: string;
  domain: string;
  availableVersions: string[];
  activeExtensions: string[];
  phpIni: Record<string, string>;
}

export default function PhpManagerPage() {
  const queryClient = useQueryClient();
  const [iniEditor, setIniEditor] = useState<Record<string, string>>({});
  const [isEditingIni, setIsEditingIni] = useState(false);

  const { data: config, isLoading, error } = useQuery<PhpConfig>({
    queryKey: ["phpConfig"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/odin-panel/php/current`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.error?.message ?? "Error fetching PHP");
      return data.data;
    },
  });

  const changeVersionMutation = useMutation({
    mutationFn: async (version: string) => {
      const res = await fetch(`${API_BASE}/odin-panel/php/version`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ version }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.error?.message ?? "Error al cambiar versión");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phpConfig"] });
    },
  });

  const updateIniMutation = useMutation({
    mutationFn: async (iniData: Record<string, string>) => {
      const res = await fetch(`${API_BASE}/odin-panel/php/ini`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(iniData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.error?.message ?? "Error al actualizar ini");
      return data;
    },
    onSuccess: () => {
      setIsEditingIni(false);
      queryClient.invalidateQueries({ queryKey: ["phpConfig"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 bg-white border border-slate-200 rounded-[3rem] animate-pulse">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-[#00A3FF] rounded-full animate-spin mb-4"></div>
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Sincronizando Motor PHP...</p>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="p-12 border border-red-200 bg-red-50 rounded-[2.5rem] flex items-center gap-6">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-red-500 shadow-sm">
           <span className="material-symbols-outlined text-3xl">error</span>
        </div>
        <div>
           <h2 className="text-red-600 font-black uppercase tracking-tight">Fallo de Comunicación</h2>
           <p className="text-red-500/80 text-sm font-medium">{(error as Error)?.message || "No se pudo cargar la configuración de PHP."}</p>
        </div>
      </div>
    );
  }

  const handleStartEditing = () => {
    setIniEditor({
      memory_limit: config.phpIni.memory_limit ?? "256M",
      upload_max_filesize: config.phpIni.upload_max_filesize ?? "100M",
      post_max_size: config.phpIni.post_max_size ?? "100M",
      max_execution_time: config.phpIni.max_execution_time ?? "300",
      max_input_time: config.phpIni.max_input_time ?? "300",
      max_input_vars: config.phpIni.max_input_vars ?? "1000",
      display_errors: config.phpIni.display_errors ?? "Off",
      "date.timezone": config.phpIni["date.timezone"] ?? "UTC",
    });
    setIsEditingIni(true);
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 mb-1">
             <span className="px-2.5 py-1 bg-[#00A3FF]/10 text-[#00A3FF] text-[10px] font-bold uppercase rounded-full tracking-wider">
                Motor de Ejecución
             </span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 uppercase">
            Multi<span className="text-[#00A3FF]">PHP</span> Manager
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-2">
            Gestiona versiones de motor y directivas de configuración FPM por dominio.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm flex flex-col">
          <div className="border-b border-slate-100 bg-slate-50/50 px-10 py-6">
            <h2 className="font-black text-slate-900 uppercase tracking-widest text-[11px] flex items-center gap-3">
              <span className="material-symbols-outlined text-[#00A3FF] text-[20px]">developer_board</span>
              Entorno de Ejecución
            </h2>
          </div>
          <div className="p-10 space-y-8 flex-1">
            <div className="p-6 rounded-2xl border border-[#00A3FF]/10 bg-[#00A3FF]/5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Dominio Seleccionado</p>
                <p className="text-slate-900 font-black text-lg">{config.domain}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Versión PHP</p>
                <p className="text-[#00A3FF] font-black text-3xl tracking-tighter">
                  {config.currentVersion}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">
                Seleccionar Versión Alternativa
              </label>
              <div className="grid grid-cols-2 gap-4">
                {config.availableVersions.map((v) => {
                  const isActive = v === config.currentVersion;
                  return (
                    <button
                      key={v}
                      disabled={isActive || changeVersionMutation.isPending}
                      onClick={() => {
                        if (confirm(`¿Cambiar a PHP ${v}? Tus sitios podrían experimentar un micro-corte.`)) {
                          changeVersionMutation.mutate(v);
                        }
                      }}
                      className={`relative overflow-hidden p-6 rounded-2xl border flex flex-col items-start gap-1 transition-all ${
                        isActive
                          ? "border-[#00A3FF] bg-[#00A3FF]/5 cursor-default shadow-sm shadow-[#00A3FF]/10"
                          : "border-slate-100 bg-slate-50 hover:border-[#00A3FF]/30 hover:bg-white transition-all shadow-inner"
                      }`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className={`font-black text-xl ${isActive ? "text-[#00A3FF]" : "text-slate-900"}`}>
                          PHP {v}
                        </span>
                        {isActive && <span className="material-symbols-outlined text-[#00A3FF] text-[20px]">check_circle</span>}
                      </div>
                      <span className="text-[9px] uppercase font-black tracking-widest text-slate-400">
                        {v === "8.1" ? "Legacy LTS" : v === "8.4" ? "High Performance 🔥" : "Stable Engine"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm flex flex-col">
          <div className="border-b border-slate-100 bg-slate-50/50 px-10 py-6 flex items-center justify-between">
            <h2 className="font-black text-slate-900 uppercase tracking-widest text-[11px] flex items-center gap-3">
              <span className="material-symbols-outlined text-[#00A3FF] text-[20px]">settings</span>
              Configuración php.ini
            </h2>
            {!isEditingIni && (
              <button
                onClick={handleStartEditing}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:text-[#00A3FF] hover:border-[#00A3FF]/30 transition-all shadow-sm flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                Personalizar
              </button>
            )}
          </div>

          <div className="p-10 flex-1">
            {!isEditingIni ? (
              <div className="space-y-4">
                {Object.entries({
                  memory_limit: config.phpIni.memory_limit ?? "256M",
                  upload_max_filesize: config.phpIni.upload_max_filesize ?? "100M",
                  post_max_size: config.phpIni.post_max_size ?? "100M",
                  max_execution_time: config.phpIni.max_execution_time ?? "300",
                  max_input_time: config.phpIni.max_input_time ?? "300",
                  max_input_vars: config.phpIni.max_input_vars ?? "1000",
                  display_errors: config.phpIni.display_errors ?? "Off",
                  "date.timezone": config.phpIni["date.timezone"] ?? "UTC",
                }).map(([key, val]) => (
                  <div key={key} className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100 transition-colors hover:bg-[#00A3FF]/5 hover:border-[#00A3FF]/20">
                    <span className="text-slate-400 font-bold text-[11px] uppercase tracking-widest">{key}</span>
                    <span className="text-slate-900 font-black text-xs font-mono">{String(val)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {Object.keys(iniEditor).map((key) => (
                  <div key={key} className="flex justify-between items-center bg-slate-50 rounded-2xl p-3 border border-slate-200 shadow-inner">
                    <label className="text-slate-400 font-bold text-[10px] uppercase tracking-widest ml-3">{key}</label>
                    <input
                      type="text"
                      value={iniEditor[key]}
                      onChange={(e) => setIniEditor({ ...iniEditor, [key]: e.target.value })}
                      className="bg-transparent text-[#00A3FF] font-black text-sm text-right focus:outline-none w-1/2 pr-3"
                    />
                  </div>
                ))}
                
                <div className="flex gap-3 pt-6 justify-end">
                  <button
                    onClick={() => setIsEditingIni(false)}
                    className="px-6 py-3 rounded-xl bg-slate-50 text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => updateIniMutation.mutate(iniEditor)}
                    disabled={updateIniMutation.isPending}
                    className="px-8 py-3 rounded-xl bg-[#00A3FF] text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#00A3FF]/20 hover:bg-[#008EE0] transition-all disabled:opacity-40 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    {updateIniMutation.isPending ? "Guardando..." : "Guardar Directivas"}
                  </button>
                </div>
              </div>
            )}
            
            <div className="mt-10 pt-10 border-t border-slate-100">
              <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-widest mb-6 px-2 flex items-center gap-2">
                 <span className="material-symbols-outlined text-[18px]">extension</span>
                 Extensiones Compiladas ({config.activeExtensions.length})
              </h3>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-3 custom-scrollbar">
                {config.activeExtensions.map(ext => (
                  <span key={ext} className="px-3 py-1.5 bg-slate-50 border border-slate-100 text-slate-500 text-[9px] font-bold rounded-lg break-all font-mono hover:bg-[#00A3FF]/5 hover:text-[#00A3FF] hover:border-[#00A3FF]/20 transition-all cursor-default">
                    {ext}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
